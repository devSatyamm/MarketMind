/**
 * Sakha — MarketMind's Personal News Intelligence Assistant
 * js/sakha.js
 *
 * Powered by Groq llama-3.3-70b-versatile
 * Grounded on: article headline + source + description + geographic context
 *
 * Public API:
 *   Sakha.open(article)   — open chat panel for a specific article
 *   Sakha.openFree(topic) — open chat panel for a free topic (for Analyse modal)
 *   Sakha.ask(text)       — send a message to Groq
 *   Sakha.close()         — close panel
 */

const Sakha = (() => {

    const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
    const MODEL         = 'llama-3.3-70b-versatile';

    let _article     = null;   // current article context
    let _history     = [];     // full [{role, content}] conversation
    let _isOpen      = false;
    let _isStreaming  = false;

    // ── Groq API ─────────────────────────────────────────────────────────────
    async function _callGroq(messages) {
        const key = window.GROQ_API_KEY;
        if (!key) throw new Error('GROQ_API_KEY not set');

        const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
                temperature: 0.65,
                max_tokens: 1200,
                stream: false
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`Groq ${res.status}: ${err.error?.message || res.statusText}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    }

    // ── System Prompt Builder ─────────────────────────────────────────────────
    function _buildSystemPrompt(article) {
        const lang = (typeof I18n !== 'undefined') ? I18n.geminiLang() : 'English';
        const isArticle = article && article.headline;

        if (!isArticle) {
            return `You are Sakha, MarketMind's personal economic intelligence assistant. 
You are an expert in Indian and global economics, markets, policy, and finance.
Respond in ${lang}. Be factual, concise, and insightful.
When asked about truthfulness of news, assess based on source reputation and cross-reference with known facts.`;
        }

        // Detect geographic mentions for local context grounding
        const geoPatterns = [
            /\b(mumbai|delhi|bangalore|bengaluru|chennai|hyderabad|kolkata|pune|ahmedabad|surat|jaipur|lucknow|kanpur|nagpur|visakhapatnam|indore|thane|bhopal|pimpri|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|kalyan|vasai|varanasi|srinagar|aurangabad|dhanbad|amritsar|navi mumbai|allahabad|ranchi|howrah|coimbatore|jabalpur|guwahati|chandigarh|thiruvananthapuram|solapur|hubli|mysore|tiruchirappalli|bareilly|aligarh|tiruppur|moradabad|gurgaon|jodhpur|kochi|raipur|kota|guwahati|bhubaneswar|dehradun|noida)\b/i,
            /\b(rajasthan|maharashtra|gujarat|karnataka|tamil Nadu|uttar pradesh|madhya pradesh|west bengal|andhra pradesh|telangana|kerala|bihar|punjab|haryana|odisha|jharkhand|chhattisgarh|assam|himachal pradesh|uttarakhand|goa|tripura|manipur|meghalaya|nagaland|arunachal pradesh|mizoram|sikkim)\b/i,
            /\b(india|china|usa|uk|europe|eu|japan|singapore|uae|dubai|abu dhabi|saudi arabia|brazil|germany|france)\b/i
        ];

        let detectedGeo = '';
        for (const pattern of geoPatterns) {
            const match = (article.headline + ' ' + (article.description || '') + ' ' + (article.role_impact || '')).match(pattern);
            if (match) { detectedGeo = match[0]; break; }
        }

        return `You are Sakha — MarketMind's personal news intelligence assistant.
You have deep expertise in Indian and global economics, policy, finance, and market dynamics.

CURRENT ARTICLE CONTEXT:
Title: ${article.headline}
Source: ${article.source || 'Unknown'}
Signal Type: ${article.signal_type || 'Market'}
Summary: ${article.role_impact || ''}
Key Action: ${article.action || ''}
Consequence Chain:
${(article.consequence_chain || []).map((c, i) => `  ${['NOW–7D', '1–3MO', '3–12MO'][i] || ''}: ${c}`).join('\n')}
${detectedGeo ? `\nGEOGRAPHIC FOCUS: ${detectedGeo} — When relevant, provide local/regional context specific to ${detectedGeo}: local economic conditions, state government policies, regional industry impact, similar past events in this region.` : ''}

YOUR CAPABILITIES:
1. Detailed article summary — expand on the economic implications
2. Truth/credibility assessment — rate source credibility, cross-reference with known facts, flag if this contradicts established data
3. Local impact analysis — specific to ${detectedGeo || 'India'}, explain how this affects local businesses, workers, investors
4. Follow-up questions — answer anything the user asks about this news
5. Comparison — compare to similar historical events

RESPONSE LANGUAGE: ${lang}
Be factual, cite reasoning. Never hallucinate facts. If uncertain, say so clearly.
Start every response with a short one-line insight, then elaborate.`;
    }

    // ── Render helpers ────────────────────────────────────────────────────────
    function _createPanel() {
        if (document.getElementById('sakha-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'sakha-panel';
        panel.innerHTML = `
        <div class="sakha-backdrop" onclick="Sakha.close()"></div>
        <div class="sakha-drawer">

            <!-- Header -->
            <div class="sakha-header">
                <div class="sakha-brand">
                    <div class="sakha-avatar">
                        <i class="fa-solid fa-atom" style="font-size:1.1rem;color:#a5b4fc;"></i>
                    </div>
                    <div>
                        <div style="font-size:1rem;font-weight:800;letter-spacing:-0.01em;">Sakha AI</div>
                        <div style="font-size:0.68rem;color:#64748b;display:flex;align-items:center;gap:0.3rem;">
                            <span style="width:6px;height:6px;border-radius:50%;background:#34d399;display:inline-block;"></span>
                            Powered by Groq · llama-3.3-70b
                        </div>
                    </div>
                </div>
                <button onclick="Sakha.close()" style="background:none;border:none;color:#64748b;font-size:1.25rem;cursor:pointer;padding:0.25rem;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- Article Context Card -->
            <div class="sakha-context" id="sakha-context"></div>

            <!-- Chat Messages -->
            <div class="sakha-messages" id="sakha-messages"></div>

            <!-- Quick chips -->
            <div class="sakha-chips" id="sakha-chips">
                <button class="sakha-chip" onclick="Sakha.ask('Give me a detailed summary of this news')">📋 Detailed Summary</button>
                <button class="sakha-chip" onclick="Sakha.ask('How accurate and credible is this news? Rate it.')">🔍 Truth Check</button>
                <button class="sakha-chip" onclick="Sakha.ask('What is the local and regional impact of this news?')">📍 Local Impact</button>
                <button class="sakha-chip" onclick="Sakha.ask('What should I do in response to this news?')">⚡ Action Plan</button>
            </div>

            <!-- Input -->
            <div class="sakha-input-row">
                <input type="text" id="sakha-input" class="sakha-input" 
                       placeholder="Ask anything about this news…"
                       onkeydown="if(event.key==='Enter' && !event.shiftKey){Sakha.sendFromInput();event.preventDefault();}">
                <button class="sakha-send" onclick="Sakha.sendFromInput()" id="sakha-send-btn">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>

        </div>
        `;
        document.body.appendChild(panel);
        _injectStyles();
    }

    function _injectStyles() {
        if (document.getElementById('sakha-styles')) return;
        const s = document.createElement('style');
        s.id = 'sakha-styles';
        s.textContent = `
            #sakha-panel {
                position: fixed;
                inset: 0;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.25s;
            }
            #sakha-panel.open {
                pointer-events: all;
                opacity: 1;
            }
            .sakha-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.55);
                backdrop-filter: blur(4px);
            }
            .sakha-drawer {
                position: absolute;
                top: 0;
                right: 0;
                width: 420px;
                max-width: 95vw;
                height: 100vh;
                background: #0b1120;
                border-left: 1px solid rgba(255,255,255,0.08);
                display: flex;
                flex-direction: column;
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
                box-shadow: -20px 0 60px rgba(0,0,0,0.5);
            }
            #sakha-panel.open .sakha-drawer {
                transform: translateX(0);
            }
            .sakha-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem 1.25rem;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                flex-shrink: 0;
            }
            .sakha-brand { display: flex; align-items: center; gap: 0.75rem; }
            .sakha-avatar {
                width: 40px; height: 40px;
                background: rgba(99,102,241,0.15);
                border: 1px solid rgba(99,102,241,0.35);
                border-radius: 10px;
                display: flex; align-items: center; justify-content: center;
            }
            .sakha-context {
                padding: 0.75rem 1rem;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                flex-shrink: 0;
            }
            .sakha-context-card {
                background: rgba(99,102,241,0.07);
                border: 1px solid rgba(99,102,241,0.2);
                border-radius: 10px;
                padding: 0.7rem 0.85rem;
                display: flex;
                gap: 0.6rem;
                align-items: flex-start;
            }
            .sakha-context-icon {
                width: 28px; height: 28px; border-radius: 7px;
                background: rgba(99,102,241,0.2);
                display: flex; align-items: center; justify-content: center;
                font-size: 0.75rem; color: #a5b4fc; flex-shrink: 0;
            }
            .sakha-context-title {
                font-size: 0.82rem; font-weight: 700; color: #e2e8f0;
                line-height: 1.35; cursor: pointer;
            }
            .sakha-context-title:hover { color: #a5b4fc; }
            .sakha-context-src { font-size: 0.65rem; color: #475569; margin-top: 0.2rem; }
            .sakha-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
                scroll-behavior: smooth;
            }
            .sakha-messages::-webkit-scrollbar { width: 3px; }
            .sakha-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
            .msg-row { display: flex; gap: 0.5rem; align-items: flex-start; }
            .msg-row.user { flex-direction: row-reverse; }
            .msg-avatar {
                width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
                display: flex; align-items: center; justify-content: center; font-size: 0.7rem;
            }
            .msg-avatar.ai { background: rgba(99,102,241,0.15); color: #a5b4fc; }
            .msg-avatar.user { background: rgba(16,185,129,0.15); color: #34d399; }
            .msg-bubble {
                max-width: 85%;
                padding: 0.6rem 0.85rem;
                border-radius: 12px;
                font-size: 0.83rem;
                line-height: 1.65;
            }
            .msg-bubble.ai {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.07);
                color: #cbd5e1;
                border-top-left-radius: 4px;
            }
            .msg-bubble.user {
                background: rgba(99,102,241,0.18);
                border: 1px solid rgba(99,102,241,0.3);
                color: #e2e8f0;
                border-top-right-radius: 4px;
            }
            .msg-bubble.loading {
                display: flex; gap: 4px; align-items: center; padding: 0.7rem 0.85rem;
            }
            .msg-bubble.loading span {
                width: 6px; height: 6px; border-radius: 50%;
                background: #6366f1; animation: sakha-dot 1.2s infinite;
            }
            .msg-bubble.loading span:nth-child(2) { animation-delay: 0.2s; }
            .msg-bubble.loading span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes sakha-dot {
                0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
                40% { opacity: 1; transform: scale(1.1); }
            }
            .sakha-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
                padding: 0.5rem 1rem 0.6rem;
                border-top: 1px solid rgba(255,255,255,0.05);
                flex-shrink: 0;
            }
            .sakha-chip {
                font-size: 0.71rem;
                font-weight: 600;
                padding: 0.28rem 0.7rem;
                border-radius: 999px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.09);
                color: #94a3b8;
                cursor: pointer;
                transition: all 0.15s;
                font-family: inherit;
            }
            .sakha-chip:hover {
                background: rgba(99,102,241,0.12);
                border-color: rgba(99,102,241,0.3);
                color: #a5b4fc;
            }
            .sakha-input-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                border-top: 1px solid rgba(255,255,255,0.07);
                flex-shrink: 0;
            }
            .sakha-input {
                flex: 1;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 0.6rem 0.85rem;
                color: #e2e8f0;
                font-size: 0.85rem;
                font-family: inherit;
                outline: none;
                transition: border-color 0.2s;
            }
            .sakha-input:focus { border-color: rgba(99,102,241,0.5); }
            .sakha-input::placeholder { color: #334155; }
            .sakha-send {
                width: 38px; height: 38px;
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                border: none; border-radius: 10px;
                color: white; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-size: 0.85rem;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            .sakha-send:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
            .sakha-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

            /* Sakha button on card */
            .sakha-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.3rem;
                padding: 0.22rem 0.6rem;
                border-radius: 999px;
                background: rgba(99,102,241,0.1);
                border: 1px solid rgba(99,102,241,0.25);
                color: #818cf8;
                font-size: 0.68rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.18s;
                white-space: nowrap;
                flex-shrink: 0;
                font-family: inherit;
                letter-spacing: 0.02em;
            }
            .sakha-btn:hover {
                background: rgba(99,102,241,0.2);
                border-color: rgba(99,102,241,0.5);
                color: #a5b4fc;
                box-shadow: 0 0 12px rgba(99,102,241,0.2);
            }
        `;
        document.head.appendChild(s);
    }

    function _renderContext(article) {
        const ctx = document.getElementById('sakha-context');
        if (!ctx) return;
        if (!article || !article.headline) {
            ctx.innerHTML = `
            <div class="sakha-context-card">
                <div class="sakha-context-icon"><i class="fa-solid fa-globe"></i></div>
                <div>
                    <div class="sakha-context-title">Free Economic Analysis</div>
                    <div class="sakha-context-src">Ask me about any market news or economic event</div>
                </div>
            </div>`;
            return;
        }
        ctx.innerHTML = `
        <div class="sakha-context-card">
            <div class="sakha-context-icon"><i class="fa-solid fa-newspaper"></i></div>
            <div style="min-width:0;">
                <div class="sakha-context-title" onclick="window.open('${article.link || '#'}','_blank')">
                    ${article.headline}
                    <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.6rem;margin-left:0.3rem;opacity:0.5;"></i>
                </div>
                <div class="sakha-context-src">
                    <i class="fa-solid fa-circle-dot" style="color:#34d399;font-size:0.5rem;margin-right:0.25rem;"></i>
                    ${article.source || 'Unknown Source'} · ${article.signal_type || 'Market'}
                </div>
            </div>
        </div>`;
    }

    function _addMessage(role, content, loading = false) {
        const msgs = document.getElementById('sakha-messages');
        if (!msgs) return;

        const id = 'msg-' + Date.now();
        const div = document.createElement('div');
        div.classList.add('msg-row', role);
        div.id = id;

        if (loading) {
            div.innerHTML = `
            <div class="msg-avatar ai"><i class="fa-solid fa-atom"></i></div>
            <div class="msg-bubble ai loading" id="loading-bubble">
                <span></span><span></span><span></span>
            </div>`;
        } else if (role === 'user') {
            div.innerHTML = `
            <div class="msg-avatar user"><i class="fa-solid fa-user"></i></div>
            <div class="msg-bubble user">${_escHtml(content)}</div>`;
        } else {
            // AI response — render markdown-lite
            const voiceId = 'sakha-voice-' + Date.now();
            div.innerHTML = `
            <div class="msg-avatar ai"><i class="fa-solid fa-atom"></i></div>
            <div class="msg-bubble ai" style="position:relative; padding-top: 1.8rem;">
                <button class="voice-btn sakha-v-btn" id="${voiceId}" 
                    onclick="MMAudio.speak(this.nextElementSibling.innerText, '${I18n.lang}', '${voiceId}')" 
                    title="Speak response">
                    <i class="fa-solid fa-volume-high"></i>
                </button>
                <div class="markdown-content">${_renderMarkdown(content)}</div>
            </div>`;
        }

        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        return id;
    }

    function _replaceLoading(content) {
        const loading = document.getElementById('loading-bubble');
        if (loading) {
            const voiceId = 'sakha-voice-' + Date.now();
            loading.classList.remove('loading');
            loading.style.paddingTop = '1.8rem';
            loading.style.position = 'relative';
            loading.innerHTML = `
                <button class="voice-btn sakha-v-btn" id="${voiceId}" 
                    onclick="MMAudio.speak(this.nextElementSibling.innerText, '${I18n.lang}', '${voiceId}')" 
                    title="Speak response">
                    <i class="fa-solid fa-volume-high"></i>
                </button>
                <div class="markdown-content">${_renderMarkdown(content)}</div>`;
            const msgs = document.getElementById('sakha-messages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
    }

    function _renderMarkdown(text) {
        return text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:0.1em 0.35em;border-radius:4px;font-size:0.85em;">$1</code>')
            .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-weight:800;color:#e2e8f0;margin-top:0.5rem;">$1</div>')
            .replace(/^[-•]\s+(.+)$/gm, '<div style="display:flex;gap:0.4rem;margin:0.2rem 0;"><span style="color:#6366f1;flex-shrink:0;">•</span><span>$1</span></div>')
            .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    }

    function _escHtml(t) {
        return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _setInputDisabled(disabled) {
        const input = document.getElementById('sakha-input');
        const btn   = document.getElementById('sakha-send-btn');
        if (input) input.disabled = disabled;
        if (btn)   btn.disabled   = disabled;
        document.querySelectorAll('.sakha-chip').forEach(c => c.disabled = disabled);
    }

    // ── Welcome message ───────────────────────────────────────────────────────
    function _welcomeMessage(article) {
        const msgs = document.getElementById('sakha-messages');
        if (msgs) msgs.innerHTML = '';
        _history = [];

        if (article && article.headline) {
            _addMessage('ai',
                `**नमस्ते! I'm Sakha** — your personal news analyst for this article.\n\n` +
                `I've read the full context of **"${article.headline}"** from ${article.source || 'this source'}.\n\n` +
                `Ask me anything — detailed summary, truth check, local impact, what to do next, or anything else about this news.`
            );
        } else {
            _addMessage('ai',
                `**नमस्ते! I'm Sakha** — MarketMind's AI news assistant.\n\n` +
                `Paste or describe any news article, market event, or economic topic and I'll analyse it for you — credibility check, summary, impact, and action plan.`
            );
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────
    return {

        open(article) {
            _article = article || null;
            _createPanel();
            _renderContext(_article);
            _welcomeMessage(_article);
            _history = [{ role: 'system', content: _buildSystemPrompt(_article) }];

            // Show chips only for article context
            const chips = document.getElementById('sakha-chips');
            if (chips) chips.style.display = (_article && _article.headline) ? 'flex' : 'none';

            document.getElementById('sakha-panel').classList.add('open');
            document.body.style.overflow = 'hidden';
            _isOpen = true;

            setTimeout(() => {
                document.getElementById('sakha-input')?.focus();
            }, 350);
        },

        // For the Analyse modal — free topic
        openFree(topic) {
            this.open(null);
            if (topic) {
                setTimeout(() => {
                    const input = document.getElementById('sakha-input');
                    if (input) { input.value = topic; this.sendFromInput(); }
                }, 400);
            }
        },

        // Analyse a pasted article/URL (for dashboard Analyse modal)
        analyseText(text) {
            const fakeArticle = {
                headline: text.slice(0, 120),
                source:   'User Input',
                signal_type: 'Analysis',
                role_impact: '',
                action: '',
                consequence_chain: [],
                link: '#'
            };
            this.open(fakeArticle);
            setTimeout(() => this.ask(`Analyse this news/event in detail: "${text}". Give me: 1) Summary 2) Truth/credibility assessment 3) Economic impact 4) What I should do`), 400);
        },

        close() {
            const panel = document.getElementById('sakha-panel');
            if (panel) panel.classList.remove('open');
            document.body.style.overflow = '';
            _isOpen = false;
        },

        async ask(text) {
            if (_isStreaming || !text.trim()) return;
            _isStreaming = true;
            _setInputDisabled(true);

            const input = document.getElementById('sakha-input');
            if (input) input.value = '';

            // Add user message to UI + history
            _addMessage('user', text);
            _history.push({ role: 'user', content: text });

            // Show loading indicator
            _addMessage('ai', '', true);

            try {
                const reply = await _callGroq(_history);
                _replaceLoading(reply);
                _history.push({ role: 'assistant', content: reply });
            } catch (err) {
                _replaceLoading(`**Error:** ${err.message}. Please check your Groq API key in config.js.`);
            }

            _isStreaming = false;
            _setInputDisabled(false);
            document.getElementById('sakha-input')?.focus();
        },

        sendFromInput() {
            const val = document.getElementById('sakha-input')?.value?.trim();
            if (val) this.ask(val);
        }
    };

})();
