/**
 * MarketMind — OpenRouter Simulation Engine
 * js/simulation.js
 */

const SimEngine = (() => {

    const OPENROUTER_MODEL   = 'google/gemini-2.0-flash-001';
    const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    
    let _lastResult = null; // Store for Sakha context

    // ── Prompts ────────────────────────────────────────────────────────────────

    const SIMULATE_IMPACT_PROMPT = (newsEvent, userRole) => `
You are MarketMind's Consequence Engine — the world's first Consequence-as-a-Service AI.
Your job is NOT to summarize news. Your job is to simulate multi-level ripple effects.

EVENT: "${newsEvent}"
USER ROLE: ${userRole}

Rules:
- matched_schemes must be REAL government/institutional programs (PLI, SIDBI, Startup India, SBA, UKRI, etc.)
- All market magnitude numbers must be realistic estimates based on the event
- role_specific output must change completely based on the user role
- action_now must be ONE specific, immediately actionable thing
- watch_next must be 3 real indicators or events to monitor
- chart arrays must show realistic movement based on event sentiment
- If the input is nonsense, a joke, random text, or unrelated to global news/events, set "is_valid": false and provide a professional "warning".

Respond ONLY in this exact JSON format. No markdown. No code fences. No explanation outside JSON:

{
  "is_valid": true,
  "warning": null,
  "event_summary": "One crisp line: what actually happened and why it matters",
  "signal_type": "Policy | Market | Macro | Geopolitical | Regulatory | Sector",
  "ripple_chain": [
    {
      "level": 1,
      "timeframe": "0–7 days",
      "effect": "Specific immediate consequence in plain English",
      "affected_sectors": ["sector1", "sector2"],
      "severity": "Critical | High | Medium | Low"
    },
    {
      "level": 2,
      "timeframe": "1–3 months",
      "effect": "Short-term ripple consequence — what changes structurally",
      "affected_sectors": ["sector1", "sector2"],
      "severity": "Critical | High | Medium | Low"
    },
    {
      "level": 3,
      "timeframe": "3–12 months",
      "effect": "Strategic long-term consequence — what permanently shifts",
      "affected_sectors": ["sector1", "sector2"],
      "severity": "Critical | High | Medium | Low"
    }
  ],
  "market_impact": {
    "stocks": { "direction": "up | down | stable", "magnitude": "+2.4%" },
    "crypto": { "direction": "up | down | stable", "magnitude": "-1.2%" },
    "forex": { "direction": "up | down | stable", "magnitude": "INR weakens 0.8%" },
    "bonds": { "direction": "up | down | stable", "magnitude": "Yields rise 15bps" }
  },
  "role_specific": {
    "role": "${userRole}",
    "direct_impact": "Exactly how this event affects a ${userRole} — 2-3 specific sentences, not generic",
    "opportunity": "One concrete opportunity this creates for ${userRole} right now",
    "risk": "The single biggest risk for ${userRole} from this event",
    "action_now": "The ONE most important thing a ${userRole} should do in the next 7 days"
  },
  "matched_schemes": [
    {
      "name": "Real scheme or program name",
      "why_relevant": "Why this scheme is relevant given the event",
      "action": "Exactly how to access or apply"
    },
    {
      "name": "Second real scheme or program",
      "why_relevant": "Why relevant",
      "action": "How to access"
    }
  ],
  "global_effect": "2 sentences on how this ripples globally across countries and industries",
  "outlook": {
    "short_term": "Volatile | Bearish | Bullish | Neutral | Stable",
    "long_term": "Volatile | Bearish | Bullish | Neutral | Stable",
    "confidence": 78
  },
  "chart_optimistic":  [100, 103, 107, 112, 118, 125],
  "chart_baseline":    [100, 101, 103, 106, 109, 112],
  "chart_pessimistic": [100, 98,  94,  89,  84,  80],
  "watch_next": [
    "Specific indicator or event to monitor — why it matters",
    "Second indicator to watch",
    "Third signal to track"
  ]
}`;

    const GENERATE_STRATEGY_PROMPT = (idea, userRole) => `
You are MarketMind's Strategic Intelligence Engine.
A ${userRole} has an idea or business concept. Stress-test it against real market conditions and generate a consequence-aware roadmap.

IDEA: "${idea}"
ROLE: ${userRole}

Rules:
- viability_score must be realistic (40-90 range). Do not inflate it.
- phases must be practical and sequential for THIS specific idea — not generic startup advice
- risks must be specific to THIS idea, not generic startup risks
- relevant_policies must be REAL programs — PLI, Startup India, DPIIT, SEBI, RBI, SBA, UKRI, etc.
- verdict must be brutally honest — if the idea has serious problems, say so clearly
- growth_revenue numbers must be realistic for the idea's market, in the currency specified
- competitor_watch must name real companies or categories, not generic placeholders
- suggested_actions must be specific and immediately actionable
- If the idea is nonsense, a joke, random text, or not a business concept, set "is_valid": false and provide a professional "warning".

Respond ONLY in this exact JSON format. No markdown. No code fences. No explanation outside JSON:

{
  "is_valid": true,
  "warning": null,
  "idea_summary": "One line summary of what the idea actually is",
  "viability_score": 74,
  "market_fit": "Strong | Moderate | Weak | Niche",
  "risk_level": "Low | Medium | Medium-High | High | Very High",
  "phases": [
    {
      "phase": 1,
      "title": "Specific phase name for this idea",
      "duration": "0-3 months",
      "actions": ["Specific action 1", "Specific action 2", "Specific action 3"],
      "milestone": "What success looks like at end of this phase",
      "urgency": "urgent"
    },
    {
      "phase": 2,
      "title": "Specific phase name",
      "duration": "3-6 months",
      "actions": ["Action 1", "Action 2", "Action 3"],
      "milestone": "Milestone",
      "urgency": "warning"
    },
    {
      "phase": 3,
      "title": "Specific phase name",
      "duration": "6-18 months",
      "actions": ["Action 1", "Action 2", "Action 3"],
      "milestone": "Milestone",
      "urgency": "upcoming"
    }
  ],
  "risks": [
    { "risk": "Specific risk for this idea", "probability": "High | Medium | Low", "mitigation": "Concrete mitigation" },
    { "risk": "Second specific risk", "probability": "High | Medium | Low", "mitigation": "Mitigation" },
    { "risk": "Third specific risk", "probability": "High | Medium | Low", "mitigation": "Mitigation" }
  ],
  "growth_revenue": [1000, 2500, 5000, 12000, 25000, 60000],
  "revenue_currency": "₹",
  "suggested_actions": [
    "Specific action 1 — do this week",
    "Specific action 2 — do this month",
    "Specific action 3 — do this quarter",
    "Specific action 4 — ongoing"
  ],
  "relevant_policies": [
    { "name": "Real policy or scheme name", "benefit": "Exactly how it helps this idea", "org": "Ministry or body name" },
    { "name": "Second real policy", "benefit": "Benefit", "org": "Org" }
  ],
  "competitor_watch": ["Real competitor or category 1", "Real competitor 2", "Real competitor 3"],
  "verdict": "2-3 sentence brutally honest assessment. Is this worth pursuing right now? What is the single biggest thing that will make or break it?"
}`;

    // ── API Caller ─────────────────────────────────────────────────────────────

    async function _callOpenRouter(prompt) {
        const key = window.OPENROUTER_API_KEY;
        if (!key) throw new Error('OPENROUTER_API_KEY not configured');

        const res = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'HTTP-Referer': 'https://marketmind.ai',
                'X-Title': 'MarketMind Simulator'
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: 'You are a financial consequence engine. Respond ONLY in valid JSON. No markdown. No explanation outside JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            // Fallback to next available model if rate limited
            if (res.status === 429) throw new Error('Rate limit hit. Try again in 30 seconds.');
            throw new Error(`OpenRouter Error ${res.status}: ${err.error?.message || res.statusText}`);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty AI response');

        const parsed = JSON.parse(text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim());
        
        if (parsed.is_valid === false) {
            return { _is_invalid: true, warning: parsed.warning };
        }
        
        return parsed;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    async function runIdea(idea, btn) {
        const role = document.getElementById('roleSelect').value;
        if (!idea?.trim()) { alert('Please describe your idea first.'); return; }
        _setBtnLoading(btn, 'Forging Strategy…');
        try {
            const result = await _callOpenRouter(GENERATE_STRATEGY_PROMPT(idea, role));
            _renderStrategy(result);
            _setBtnReady(btn, 'fa-wand-magic-sparkles', 'Regenerate Strategy');
        } catch (err) {
            _showError('myselfResults', err.message);
            _setBtnReady(btn, 'fa-wand-magic-sparkles', 'Generate Strategy');
        }
    }

    async function runNews(input, btn) {
        const role = document.getElementById('roleSelect').value;
        if (!input?.trim()) { alert('Please enter a news event first.'); return; }
        _setBtnLoading(btn, 'Simulating Ripple…');
        try {
            const result = await _callOpenRouter(SIMULATE_IMPACT_PROMPT(input, role));
            _renderSimulation(result);
            _setBtnReady(btn, 'fa-bolt', 'Resimulate Impact');
        } catch (err) {
            _showError('newsResults', err.message);
            _setBtnReady(btn, 'fa-bolt', 'Simulate Impact');
        }
    }

    // ── Renderers ──────────────────────────────────────────────────────────────

    function _renderStrategy(d) {
        if (d._is_invalid) {
            _showError('myselfResults', `<b>🚨 NOT A JOKE:</b> ${d.warning || 'Please enter a valid business idea.'}`);
            return;
        }
        const res = document.getElementById('myselfResults');
        res.style.display = 'block';
        res.classList.add('animate-in');

        // Verdict
        const verdictEl = document.getElementById('verdict-text');
        if (verdictEl) verdictEl.textContent = d.verdict || '—';

        // Viability
        const score = d.viability_score || 0;
        const scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
        const numEl = document.getElementById('viability-num');
        const barEl = document.getElementById('viability-bar');
        if (numEl) { numEl.textContent = score; numEl.style.color = scoreColor; }
        if (barEl) { barEl.style.width = score + '%'; barEl.style.background = scoreColor; }

        // Metrics
        const riskEl = document.getElementById('risk-level');
        const fitEl  = document.getElementById('market-fit');
        if (riskEl) { riskEl.textContent = d.risk_level || '—'; riskEl.style.color = d.risk_level?.includes('High') ? '#ef4444' : d.risk_level === 'Medium' ? '#f59e0b' : '#10b981'; }
        if (fitEl)  { fitEl.textContent  = d.market_fit  || '—'; fitEl.style.color  = d.market_fit === 'Strong' ? '#10b981' : d.market_fit === 'Moderate' ? '#f59e0b' : '#ef4444'; }

        // Phases
        const phasesEl = document.getElementById('phases-list');
        if (phasesEl) phasesEl.innerHTML = (d.phases || []).map(p => `
            <div class="phase-card ${p.urgency || 'upcoming'}">
                <div class="phase-header">
                    <span class="phase-title">${p.phase}. ${p.title}</span>
                    <span class="phase-dur">${p.duration}</span>
                </div>
                <div class="phase-milestone">${p.milestone}</div>
                <div class="phase-actions">${(p.actions || []).map(a => `<span class="phase-action-tag">${a}</span>`).join('')}</div>
            </div>`).join('');

        // Competitors
        const compEl = document.getElementById('comp-tags');
        if (compEl) compEl.innerHTML = (d.competitor_watch || []).map(c => `<span class="comp-tag">${c}</span>`).join('');

        // Actions
        const actEl = document.getElementById('actions-list');
        if (actEl) actEl.innerHTML = (d.suggested_actions || []).map(a => `
            <div class="action-item">
                <i class="fa-solid fa-circle-check action-icon"></i>
                <span class="action-text">${a}</span>
            </div>`).join('');

        // Policies
        const polEl = document.getElementById('policies-list');
        if (polEl) polEl.innerHTML = (d.relevant_policies || []).map(p => `
            <div class="policy-item">
                <div class="policy-name">${p.name}</div>
                <div class="policy-org">${p.org}</div>
                <div class="policy-benefit">${p.benefit}</div>
            </div>`).join('');

        // Risks
        const riskListEl = document.getElementById('risks-list');
        if (riskListEl) riskListEl.innerHTML = (d.risks || []).map(r => `
            <div class="risk-item">
                <div class="risk-row">
                    <span class="risk-name">${r.risk}</span>
                    <span class="risk-prob prob-${(r.probability||'').toLowerCase()}">${r.probability}</span>
                </div>
                <div class="risk-mit">↳ ${r.mitigation}</div>
            </div>`).join('');

        initGrowthChart(d.growth_revenue, `Rev (${d.revenue_currency || '₹'})`);
        const badgeEl = document.getElementById('strategy-ai-badge');
        if (badgeEl) badgeEl.textContent = 'Gemini 2.0';

        _lastResult = { type: 'strategy', data: d };
        _showSakhaBtn();
    }

    function _renderSimulation(d) {
        if (d._is_invalid) {
            _showError('newsResults', `<b>🚨 NOT A JOKE:</b> ${d.warning || 'Please enter a valid news event.'}`);
            return;
        }
        const res = document.getElementById('newsResults');
        res.style.display = 'block';
        res.classList.add('animate-in');

        // Event banner
        const bannerEl = document.getElementById('event-summary-banner');
        if (bannerEl) bannerEl.innerHTML = `
            <div class="event-tag"><i class="fa-solid fa-circle-dot" style="margin-right:4px;"></i> ${d.signal_type || 'Signal'} · AI Confidence ${d.outlook?.confidence || 0}%</div>
            <div class="event-text">${d.event_summary || ''}</div>`;

        // Market badges
        const mi = d.market_impact || {};
        const setBadge = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            const item = mi[key] || { direction: 'stable', magnitude: '—' };
            el.textContent = item.magnitude;
            el.className = `mkt-badge ${item.direction === 'up' ? 'mkt-up' : item.direction === 'down' ? 'mkt-down' : 'mkt-flat'}`;
        };
        setBadge('stocks-badge', 'stocks');
        setBadge('crypto-badge', 'crypto');
        setBadge('forex-badge',  'forex');
        setBadge('bonds-badge',  'bonds');

        // Outlook
        const setOutlook = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = val || '—';
            el.className = `outlook-val ${val === 'Bullish' ? 'col-green' : val === 'Bearish' ? 'col-red' : val === 'Volatile' ? 'col-amber' : 'col-blue'}`;
        };
        setOutlook('outlook-short', d.outlook?.short_term);
        setOutlook('outlook-long',  d.outlook?.long_term);

        // Global effect
        const gEl = document.getElementById('global-effect');
        if (gEl) gEl.textContent = d.global_effect || '';

        // Role impact
        const rs = d.role_specific || {};
        const roleHeader = document.querySelector('#role-impact-card .role-impact-header');
        if (roleHeader) roleHeader.innerHTML = `<i class="fa-solid fa-user-circle"></i> ${rs.role} Impact`;
        const rdEl = document.getElementById('role-direct');
        if (rdEl) rdEl.textContent = rs.direct_impact || '';
        const roEl = document.getElementById('role-opp');
        if (roEl) roEl.textContent = rs.opportunity || '';
        const rrEl = document.getElementById('role-risk');
        if (rrEl) rrEl.textContent = rs.risk || '';
        const raEl = document.getElementById('role-action');
        if (raEl) raEl.textContent = rs.action_now || '';

        // Ripple chain
        const rippleEl = document.getElementById('ripple-chain-list');
        if (rippleEl) rippleEl.innerHTML = (d.ripple_chain || []).map(r => {
            const dotClass = r.severity === 'Critical' ? 'dot-critical' : r.severity === 'High' ? 'dot-high' : r.severity === 'Medium' ? 'dot-medium' : 'dot-low';
            return `<div class="ripple-item">
                <div class="ripple-dot ${dotClass}">${r.level}</div>
                <div style="flex:1;">
                    <div class="ripple-meta">${r.timeframe} · ${r.severity}</div>
                    <div class="ripple-effect">${r.effect}</div>
                    <div class="ripple-sectors">${(r.affected_sectors || []).map(s => `<span class="sector-pill">${s}</span>`).join('')}</div>
                </div>
            </div>`;
        }).join('');

        // Schemes
        const schemesEl = document.getElementById('schemes-list');
        if (schemesEl) schemesEl.innerHTML = (d.matched_schemes || []).map(s => `
            <div class="scheme-item">
                <div class="scheme-name">${s.name}</div>
                <div class="scheme-why">${s.why_relevant}</div>
                <div class="scheme-action"><i class="fa-solid fa-arrow-right"></i> ${s.action}</div>
            </div>`).join('');

        // Watch next
        const watchEl = document.getElementById('watch-next-list');
        if (watchEl) watchEl.innerHTML = (d.watch_next || []).map((w, i) => `
            <div class="watch-item">
                <span class="watch-num">${i + 1}</span>
                <span class="watch-text">${w}</span>
            </div>`).join('');

        initNewsImpactChart(d.chart_optimistic, d.chart_baseline, d.chart_pessimistic);
        const newsBadge = document.getElementById('news-ai-badge');
        if (newsBadge) newsBadge.textContent = 'Gemini 2.0';

        _lastResult = { type: 'news', data: d };
        _showSakhaBtn();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    function _showSakhaBtn() {
        const btn = document.getElementById('sakha-trigger');
        if (btn) btn.classList.add('show');
    }

    function openSakha() {
        if (!_lastResult) return;
        const d = _lastResult.data;
        const fakeArticle = {
            headline: _lastResult.type === 'strategy' ? d.idea_summary : d.event_summary,
            source: 'Analytic Simulation',
            signal_type: _lastResult.type === 'strategy' ? 'Business Strategy' : d.signal_type,
            role_impact: _lastResult.type === 'strategy' ? d.verdict : d.global_effect,
            action: _lastResult.type === 'strategy' ? d.suggested_actions?.[0] : d.role_specific?.action_now,
            consequence_chain: _lastResult.type === 'strategy' 
                ? (d.phases || []).map(p => p.milestone)
                : (d.ripple_chain || []).map(r => r.effect),
            link: '#'
        };
        if (window.Sakha) window.Sakha.open(fakeArticle);
    }

    function _setBtnLoading(btn, label) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> ${label}`;
        btn.disabled = true;
    }
    function _setBtnReady(btn, icon, label) {
        btn.innerHTML = `<i class="fa-solid ${icon} mr-2"></i> ${label}`;
        btn.disabled = false;
    }
    function _showError(id, msg) {
        const el = document.getElementById(id);
        el.style.display = 'block';
        el.innerHTML = `<div style="padding:1rem;color:#f87171;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:12px;font-size:0.875rem;"><i class="fa-solid fa-triangle-exclamation mr-2"></i>${msg}</div>`;
    }
    function _injectAIBadge(id, model) {
        const c = document.getElementById(id);
        let b = c.querySelector('.mm-ai-badge');
        if (!b) { b = document.createElement('div'); b.className = 'mm-ai-badge'; c.prepend(b); }
        b.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;font-size:0.6rem;color:var(--text-muted);margin:0.25rem 0 0.75rem;';
        b.innerHTML = `<span style="padding:0.1rem 0.5rem;border-radius:99px;background:rgba(99,102,241,0.1);color:#818cf8;border:1px solid rgba(99,102,241,0.2);">${model}</span> via OpenRouter`;
    }

    return { runIdea, runNews, openSakha };
})();

// ── Chart Initializers ─────────────────────────────────────────────────────────
let growthChartInstance = null;
let newsChartInstance   = null;

function initGrowthChart(d, l) {
    const ctx = document.getElementById('growthChart')?.getContext('2d');
    if (!ctx) return;
    if (growthChartInstance) growthChartInstance.destroy();
    growthChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['M1', 'M3', 'M6', 'M12', 'M18', 'M24'],
            datasets: [{ label: l, data: d, backgroundColor: 'rgba(99,102,241,0.4)', borderColor: '#6366f1', borderWidth: 2, borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } }
    });
}

function initNewsImpactChart(o, b, p) {
    const ctx = document.getElementById('newsImpactChart')?.getContext('2d');
    if (!ctx) return;
    if (newsChartInstance) newsChartInstance.destroy();
    newsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['T-1h', 'Now', 'T+1d', 'T+3d', 'T+1w', 'T+1m'],
            datasets: [
                { label: 'Opt',  data: o, borderColor: '#10b981', tension: 0.3, fill: false, pointRadius: 4 },
                { label: 'Base', data: b, borderColor: '#3b82f6', tension: 0.3, fill: false, pointRadius: 4 },
                { label: 'Pess', data: p, borderColor: '#ef4444', tension: 0.3, fill: false, borderDash: [5, 5], pointRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } }
    });
}