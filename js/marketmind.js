/**
 * MarketMind — News Intelligence Engine
 * js/marketmind.js
 *
 * Architecture:
 *   JS layer  → fetch RSS feeds, deduplication, localStorage cache,
 *               infinite scroll pagination, timestamp formatting, rendering
 *   Gemini    → ONLY consequence mapping & role-specific insight generation
 *
 * Public API:
 *   MarketMind.init(containerId, role)  — boot on page load
 *   MarketMind.refresh()               — manual re-fetch all feeds
 *   MarketMind.setRole(role)           — re-run Gemini for new role (reuses buffered articles)
 *   MarketMind.clearCache()            — clear seen-article localStorage
 */

const MarketMind = (() => {

    // ── RSS Feed Sources ──────────────────────────────────────────────────────
    const RSS_FEEDS = [
        'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
        'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms',
        'https://www.moneycontrol.com/rss/marketreports.xml',
        'https://www.moneycontrol.com/rss/economy.xml',
        'https://www.business-standard.com/rss/markets-106.rss',
        'https://www.livemint.com/rss/economy',
        'https://www.financialexpress.com/market/feed/',
        'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3',
        'https://www.rbi.org.in/Scripts/RSSFeed.aspx',
        'https://feeds.reuters.com/reuters/businessNews',
        'https://feeds.bloomberg.com/markets/news.rss',
        'https://www.ft.com/rss/home',
        'https://yourstory.com/feed',
        'https://inc42.com/feed/',
        'https://www.vccircle.com/feed'
    ];

    const PROXY   = 'https://api.rss2json.com/v1/api.json?rss_url=';
    const LS_KEY  = 'mm_seen_v3';
    const MAX_SEEN      = 500;
    const PAGE_SIZE     = 8;   // articles per Gemini batch
    const AUTO_ADVANCE  = 60;  // seconds between auto-append cycles

    // ── State ─────────────────────────────────────────────────────────────────
    let _containerId  = 'mm-feed';
    let _currentRole  = 'Founder';
    let _buffer       = [];      // all fetched articles (source of infinite scroll)
    let _bufferIdx    = 0;       // pointer into _buffer for next batch
    let _totalShown   = 0;       // total card index (for unique IDs)
    let _isFetching   = false;   // prevents concurrent Gemini calls
    let _observer     = null;    // IntersectionObserver for sentinel
    let _autoTimer    = null;    // setInterval for auto-advance
    let _feedCycle    = 0;       // which half of RSS_FEEDS to use next refresh

    let _seenSet = new Set(
        JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    );

    // ── Deduplication (JS only) ───────────────────────────────────────────────
    function _isDuplicate(article) {
        const key = article.link || article.title;
        if (_seenSet.has(key)) return true;
        for (const seen of _seenSet) {
            if (_titleSimilarity(seen, article.title) > 0.75) return true;
        }
        return false;
    }

    function _markSeen(article) {
        const key = article.link || article.title;
        _seenSet.add(key);
        const arr = [..._seenSet].slice(-MAX_SEEN);
        _seenSet = new Set(arr);
        try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch (_) {}
    }

    function _titleSimilarity(a, b) {
        if (!a || !b) return 0;
        const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3));
        const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3));
        if (!wordsA.size || !wordsB.size) return 0;
        const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
        return intersection / Math.max(wordsA.size, wordsB.size);
    }

    // ── Timestamp formatting ──────────────────────────────────────────────────
    function _formatTimestamp(pubDate) {
        if (!pubDate) return _nowStamp();
        try {
            const d = new Date(pubDate);
            if (isNaN(d.getTime())) return _nowStamp();
            const now = new Date();
            const diffMs  = now - d;
            const diffMin = Math.floor(diffMs / 60000);
            const diffHr  = Math.floor(diffMs / 3600000);

            if (diffMin < 2)   return 'Just now';
            if (diffMin < 60)  return `${diffMin}m ago`;
            if (diffHr  < 24)  return `${diffHr}h ago`;

            // Format: 26 Mar, 11:30 PM
            const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            return `${dateStr} · ${timeStr}`;
        } catch (_) {
            return _nowStamp();
        }
    }

    function _nowStamp() {
        const now = new Date();
        return now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            + ' · '
            + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    // ── RSS Fetching ───────────────────────────────────────────────────────────
    async function _fetchFeed(url) {
        try {
            const res  = await fetch(PROXY + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
            if (!res.ok) return [];
            const data = await res.json();
            return (data.items || []).map(item => ({
                title:       item.title       || '',
                link:        item.link        || '',
                description: _stripHtml(item.description || item.content || '').slice(0, 300),
                pubDate:     item.pubDate     || item.published || '',
                source:      _extractDomain(item.link || url)
            }));
        } catch (_) { return []; }
    }

    async function _fetchAllFeeds() {
        // Alternate which half of feeds we use each cycle to vary content
        const start = (_feedCycle % 2 === 0) ? 0 : 7;
        const feeds = RSS_FEEDS.slice(start, start + 8);
        _feedCycle++;
        const results = await Promise.allSettled(feeds.map(_fetchFeed));
        return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    }

    // ── Gemini — consequence mapping only ─────────────────────────────────────
    const GEMINI_ENDPOINT = () =>
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${window.GEMINI_API_KEY}`;

    function _buildPrompt(articles, userRole) {
        const lang = (typeof I18n !== 'undefined') ? I18n.geminiLang() : 'English';
        return `You are MarketMind — an economic foresight engine for Indian markets.
Your job is to simulate second-order consequences of news events, NOT summarize them.

RESPONSE LANGUAGE: ${lang}
(Write ALL text fields — headline, consequence_chain, role_impact, action — in ${lang}. Keep JSON keys in English.)

USER ROLE: ${userRole}

Today's economic signals:
${articles.map((a, i) => `${i + 1}. [${a.source}] ${a.title} — ${a.description}`).join('\n')}

Respond ONLY in valid JSON with no markdown fences:
{
  "analyses": [
    {
      "headline": "headline (shortened if needed, max 100 chars)",
      "signal_type": "Policy | Market | Macro | Scheme | Risk | Opportunity",
      "consequence_chain": [
        "Immediate effect (0–7 days)",
        "Short-term ripple (1–3 months)",
        "Strategic impact (3–12 months)"
      ],
      "role_impact": "1–2 lines specific to ${userRole}",
      "action": "One concrete, specific action for ${userRole} to take NOW",
      "severity": "High | Medium | Low",
      "opportunity": true or false,
      "source": "domain string"
    }
  ]
}

Rules:
- Maximum ${PAGE_SIZE} analyses — pick the most consequential articles
- Skip sports, entertainment, celebrity news entirely
- Consequence chain must be causal (A→B→C), not merely descriptive
- Action must be event-specific, not generic advice`;
    }

    async function _callGemini(articles, role) {
        const key = window.GEMINI_API_KEY;
        if (!key || key === 'YOUR_GEMINI_KEY_HERE') throw new Error('No key');

        const res = await fetch(GEMINI_ENDPOINT(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: _buildPrompt(articles, role) }] }],
                generationConfig: {
                    temperature: 0.65,
                    topP: 0.9,
                    maxOutputTokens: 3000,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Gemini ${res.status}: ${err.error?.message || res.statusText}`);
        }

        const data    = await res.json();
        const text    = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
        return JSON.parse(cleaned);
    }

    // ── Card Rendering ─────────────────────────────────────────────────────────
    const SIGNAL_ICONS  = { Policy:'fa-building-columns', Market:'fa-chart-line', Macro:'fa-earth-asia', Scheme:'fa-hand-holding-dollar', Risk:'fa-triangle-exclamation', Opportunity:'fa-rocket' };
    const SIGNAL_BADGE  = { Policy:'badge-red', Market:'badge-blue', Macro:'badge-cyan', Scheme:'badge-green', Risk:'badge-yellow', Opportunity:'badge-green' };
    const SEV_CONFIG    = {
        High:   { label:'High Impact',   color:'#f87171' },
        Medium: { label:'Watch Closely', color:'#fbbf24' },
        Low:    { label:'Low Signal',    color:'#94a3b8' }
    };
    const CHAIN_COLORS  = ['#60a5fa', '#a5b4fc', '#22d3ee'];
    const CHAIN_LABELS  = ['NOW–7D', '1–3 MO', '3–12 MO'];

    // Global article registry — used by Sakha.open()
    window.MM_ARTICLES = window.MM_ARTICLES || {};

    function _buildCard(a, globalIdx, pubDate) {
        const sev     = SEV_CONFIG[a.severity] || SEV_CONFIG.Medium;
        const sigBdg  = SIGNAL_BADGE[a.signal_type] || 'badge-muted';
        const icon    = SIGNAL_ICONS[a.signal_type]  || 'fa-bolt';
        const ts      = _formatTimestamp(pubDate);
        const oppBadge = a.opportunity
            ? `<span class="badge badge-green" style="margin-left:0.3rem;">💡 Opp</span>`
            : '';

        // Store article for Sakha — deep clone with full context
        const regKey = `mm_art_${globalIdx}`;
        window.MM_ARTICLES[regKey] = {
            headline:         a.headline,
            source:           a.source || '',
            signal_type:      a.signal_type || 'Market',
            role_impact:      a.role_impact || '',
            action:           a.action || '',
            consequence_chain: a.consequence_chain || [],
            description:      a.description || '',
            link:             a.link || '#',
            severity:         a.severity || 'Medium'
        };

        const chain = (a.consequence_chain || []).map((step, i) => `
            <div style="display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.4rem;">
                <span style="font-size:0.62rem;font-weight:800;min-width:56px;color:${CHAIN_COLORS[i]};white-space:nowrap;flex-shrink:0;">${CHAIN_LABELS[i] || ''}</span>
                <span class="text-sm" style="color:var(--text-secondary);line-height:1.5;">${step}</span>
            </div>`).join('');

        // Short description snippet (from original RSS article or role_impact first sentence)
        const shortDesc = a.description
            ? (a.description.length > 160 ? a.description.slice(0, 157) + '…' : a.description)
            : '';

        return `
        <article class="insight-card mm-live-card" id="mm-card-${globalIdx}" style="flex-direction:column;gap:0;padding:0;overflow:hidden;">

            <!-- Header -->
            <div style="display:flex;align-items:flex-start;gap:1rem;padding:1.2rem 1.2rem 0.75rem;">
                <div class="insight-thumb" style="flex-shrink:0;">
                    <i class="fa-solid ${icon} thumb-icon"></i>
                </div>
                <div style="flex:1;min-width:0;">

                    <!-- Badge row -->
                    <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.5rem;">
                        <span class="badge ${sigBdg}">${a.signal_type}</span>
                        ${oppBadge}
                        <span class="text-xs" style="color:var(--text-muted);margin-left:auto;display:flex;align-items:center;gap:0.35rem;white-space:nowrap;">
                            <i class="fa-regular fa-clock" style="font-size:0.6rem;"></i>${ts}
                        </span>
                    </div>

                    <!-- Headline + Sakha in one row -->
                    <div style="display:flex;align-items:flex-start;gap:0.5rem;margin-bottom:0.45rem;">
                        <h3 class="font-bold" style="font-size:0.97rem;line-height:1.4;flex:1;min-width:0;cursor:pointer;"
                            onmouseover="this.style.color='#60a5fa'" onmouseout="this.style.color=''"
                            onclick="window.open('${a.link || '#'}','_blank')">
                            ${a.headline}
                            <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.6rem;opacity:0.4;margin-left:0.3rem;vertical-align:middle;"></i>
                        </h3>
                        <button class="sakha-btn" onclick="Sakha && Sakha.open(window.MM_ARTICLES['${regKey}'])" title="Ask Sakha AI about this news">
                            <i class="fa-solid fa-atom"></i> Sakha
                        </button>
                        <button class="voice-btn" id="voice-${globalIdx}" onclick="MMAudio.speak('${a.headline.replace(/'/g,"\\'")}. ${a.role_impact.replace(/'/g,"\\'")}', '${I18n.lang}', 'voice-${globalIdx}')" title="Listen to summary">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
                    </div>

                    ${shortDesc ? `
                    <!-- Source description snippet -->
                    <p class="text-sm" style="color:var(--text-muted);line-height:1.55;margin-bottom:0.35rem;font-style:italic;border-left:2px solid rgba(255,255,255,0.08);padding-left:0.55rem;">${shortDesc}</p>
                    ` : ''}

                    <!-- AI Role Impact summary -->
                    <p class="text-sm" style="color:var(--text-secondary);line-height:1.55;">${a.role_impact}</p>

                    <div style="margin-top:0.3rem;font-size:0.68rem;color:var(--text-muted);">
                        <i class="fa-solid fa-signal" style="font-size:0.55rem;margin-right:0.2rem;"></i>${a.source || ''}
                    </div>
                </div>
            </div>

            <!-- Consequence chain -->
            <div style="padding:0.7rem 1.2rem;background:rgba(255,255,255,0.022);border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
                <div style="font-size:0.6rem;font-weight:800;letter-spacing:0.1em;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.45rem;">🔗 Consequence Map</div>
                ${chain}
            </div>

            <!-- Action row -->
            <div style="padding:0.7rem 1.2rem;display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
                <div style="display:flex;align-items:flex-start;gap:0.45rem;flex:1;min-width:0;">
                    <i class="fa-solid fa-bolt" style="color:${sev.color};font-size:0.7rem;flex-shrink:0;margin-top:0.15rem;"></i>
                    <span>
                        <span class="text-xs font-bold" style="color:${sev.color};">${sev.label} · </span>
                        <span class="text-xs" style="color:var(--text-muted);">
                            <i class="fa-solid fa-crosshairs" style="color:var(--accent-cyan);margin-right:0.25rem;"></i>${a.action}
                        </span>
                    </span>
                </div>
                <div style="display:flex;gap:0.35rem;flex-shrink:0;">
                    <button class="btn btn-icon btn-ghost" title="Bookmark" onclick="MM_bookmark(${globalIdx})"><i class="fa-regular fa-bookmark"></i></button>
                    <button class="btn btn-icon btn-ghost" title="Share"><i class="fa-solid fa-share-nodes"></i></button>
                </div>
            </div>

        </article>`;
    }

    // Append new cards to feed (non-destructive — adds to existing)
    function _appendCards(analyses, articles) {
        const container = document.getElementById(_containerId);
        if (!container) return;

        // Remove sentinel temporarily
        const sentinel = document.getElementById('mm-sentinel');
        if (sentinel) sentinel.remove();

        // Append date separator if first of a new batch
        const batchDate = _nowStamp();
        const sep = document.createElement('div');
        sep.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin:0.5rem 0;';
        sep.innerHTML = `
            <div style="flex:1;height:1px;background:var(--border);"></div>
            <span style="font-size:0.65rem;font-weight:700;color:var(--text-muted);letter-spacing:0.08em;white-space:nowrap;">
                <i class="fa-regular fa-clock" style="margin-right:0.3rem;"></i>${batchDate}
            </span>
            <div style="flex:1;height:1px;background:var(--border);"></div>`;
        container.appendChild(sep);

        // Append each card
        analyses.forEach((a, i) => {
            const globalIdx = _totalShown++;
            const pubDate   = articles[i]?.pubDate  || '';
            const div       = document.createElement('div');
            div.innerHTML   = _buildCard(a, globalIdx, pubDate);
            container.appendChild(div.firstElementChild);
        });

        // Re-attach sentinel at bottom
        _attachSentinel(container);
    }

    function _attachSentinel(container) {
        const sentinel = document.createElement('div');
        sentinel.id = 'mm-sentinel';
        sentinel.style.cssText = 'height:60px;display:flex;align-items:center;justify-content:center;';
        sentinel.innerHTML = `
            <div id="mm-loader" style="display:none;text-align:center;">
                <div style="width:28px;height:28px;border:2px solid var(--border);border-top-color:var(--accent-indigo);border-radius:50%;animation:mm-spin 0.7s linear infinite;margin:0 auto 0.4rem;"></div>
                <div class="text-xs text-muted">Loading more…</div>
            </div>`;
        container.appendChild(sentinel);

        // Observe sentinel
        if (_observer) _observer.disconnect();
        _observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !_isFetching) {
                _loadNextBatch();
            }
        }, { rootMargin: '200px' }); // trigger 200px before hitting bottom
        _observer.observe(sentinel);
    }

    function _showLoader(visible) {
        const el = document.getElementById('mm-loader');
        if (el) el.style.display = visible ? 'block' : 'none';
    }

    // ── Batch Loading (called by IntersectionObserver + auto-timer) ───────────
    async function _loadNextBatch() {
        if (_isFetching) return;
        _isFetching = true;
        _showLoader(true);

        // Take next slice from buffer
        let batch = _buffer.slice(_bufferIdx, _bufferIdx + PAGE_SIZE);
        _bufferIdx += PAGE_SIZE;

        // If buffer exhausted, re-fetch to keep the feed going
        if (batch.length < PAGE_SIZE) {
            const fresh = await _fetchAllFeeds();
            // For infinite scroll, relax dedup — accept articles if not exact match
            const wider = fresh.filter(a => a.title && !_seenSet.has(a.link || a.title));
            wider.forEach(_markSeen);
            _buffer = [..._buffer, ...wider];
            batch   = _buffer.slice(_bufferIdx - PAGE_SIZE, _bufferIdx);
            if (batch.length === 0) batch = fresh.slice(0, PAGE_SIZE); // worst case: cycle raw
        }

        // Deduplicate this specific batch
        const deduped = batch.filter((a, i, arr) =>
            arr.findIndex(b => b.title === a.title) === i
        );

        // Send to Gemini
        let analyses = [];
        let source   = 'local';
        try {
            const result = await _callGemini(deduped, _currentRole);
            analyses     = result.analyses || [];
            analyses.forEach((a, i) => {
                a.link        = deduped[i]?.link        || '#';
                a.description = deduped[i]?.description || '';
            });
            source = 'gemini';
        } catch (err) {
            console.warn('[MarketMind] Gemini fallback:', err.message);
            analyses = deduped.map(a => ({
                headline: a.title,
                signal_type: 'Market',
                consequence_chain: ['Live article fetched', 'Gemini analysis unavailable', 'Check API key in config.js'],
                role_impact: a.description || '',
                action: 'Open article for manual analysis.',
                severity: 'Low',
                opportunity: false,
                source: a.source,
                link: a.link
            }));
        }

        _appendCards(analyses, deduped);
        _updateStatusBar(_totalShown, _currentRole, source);

        _isFetching  = false;
        _showLoader(false);
    }

    // ── Status Bar ────────────────────────────────────────────────────────────
    function _updateStatusBar(count, role, source) {
        const bar = document.getElementById('mm-status-bar');
        if (!bar) return;
        const badge = source === 'gemini'
            ? `<span style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34d399;padding:0.1rem 0.5rem;border-radius:999px;font-size:0.65rem;font-weight:700;">⚡ GEMINI 2.0</span>`
            : `<span style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:#fbbf24;padding:0.1rem 0.5rem;border-radius:999px;font-size:0.65rem;font-weight:700;">⚠️ OFFLINE</span>`;
        const shortRole = role.length > 18 ? 'All' : role;
        bar.innerHTML = `<i class="fa-solid fa-circle-dot text-cyan" style="font-size:0.55rem;"></i> ${count} insights · ${shortRole} ${badge} · ${_nowStamp()}`;
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    async function _boot() {
        const container = document.getElementById(_containerId);
        if (!container) return;

        // Show initial loading state
        container.innerHTML = `
        <div style="padding:2.5rem;text-align:center;" id="mm-init-loader">
            <div style="width:44px;height:44px;border:2px solid var(--border);border-top-color:var(--accent-indigo);border-radius:50%;animation:mm-spin 0.7s linear infinite;margin:0 auto 1rem;"></div>
            <div class="font-bold mb-1">Pulling live feeds…</div>
            <div class="text-sm text-muted">Fetching 15 sources → deduplicating → Gemini 2.0 Flash ⚡</div>
        </div>
        <style>@keyframes mm-spin{to{transform:rotate(360deg)}}</style>`;

        // Fetch and buffer all articles
        try {
            const raw = await _fetchAllFeeds();
            // Sort by pubDate descending (newest first)
            _buffer = raw
                .filter(a => a.title)
                .sort((a, b) => {
                    const da = a.pubDate ? new Date(a.pubDate) : 0;
                    const db = b.pubDate ? new Date(b.pubDate) : 0;
                    return db - da;
                });
            _bufferIdx = 0;
        } catch (_) {
            container.innerHTML = `<div style="padding:2rem;text-align:center;"><span style="color:#f87171;font-weight:700;">⚠️ Could not reach RSS proxy.</span></div>`;
            return;
        }

        // Clear loader, set up sentinel
        container.innerHTML = '';
        _totalShown = 0;
        _attachSentinel(container);

        // Load first batch immediately
        await _loadNextBatch();

        // Auto-load new batch every AUTO_ADVANCE seconds (keeps feed alive)
        if (_autoTimer) clearInterval(_autoTimer);
        _autoTimer = setInterval(() => {
            if (!_isFetching) _loadNextBatch();
        }, AUTO_ADVANCE * 1000);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function _stripHtml(html) {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function _extractDomain(url) {
        try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
    }

    // ── Public API ─────────────────────────────────────────────────────────────
    return {
        init(containerId, role) {
            _containerId = containerId || 'mm-feed';
            _currentRole = role || 'Founder';
            _boot();
        },

        refresh() {
            // Full re-fetch: clear buffer & restart
            _buffer    = [];
            _bufferIdx = 0;
            _totalShown = 0;
            if (_observer) _observer.disconnect();
            if (_autoTimer) clearInterval(_autoTimer);
            _boot();
        },

        setRole(role) {
            // Role change: keep current buffer, reload feed with new role framing
            _currentRole = role;
            _buffer    = [];
            _bufferIdx = 0;
            _totalShown = 0;
            if (_observer) _observer.disconnect();
            if (_autoTimer) clearInterval(_autoTimer);
            _boot();
        },

        clearCache() {
            _seenSet.clear();
            localStorage.removeItem(LS_KEY);
            this.refresh();
        }
    };
})();

// Global bookmark helper
function MM_bookmark(idx) {
    const btn = document.querySelector(`#mm-card-${idx} .fa-bookmark`);
    if (btn) btn.className = btn.className.includes('fa-regular')
        ? btn.className.replace('fa-regular', 'fa-solid')
        : btn.className.replace('fa-solid', 'fa-regular');
}
