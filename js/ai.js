/**
 * MarketMind — AI Service Layer
 * js/ai.js
 *
 * Primary backbone: Google Gemini 2.0 Flash (via generativelanguage API)
 * Fallback: Local heuristic scoring (if API unavailable / key missing)
 *
 * Usage:
 *   const result = await AIService.analyseIdea({ persona, budget, market, idea, tags });
 */

const AIService = (() => {

    // ── Groq endpoint ────────────────────────────────────────────────────────
    const GROQ_MODEL = 'llama-3.3-70b-versatile';
    const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

    // ── Build the structured prompt for consequence mapping ────────────────────
    function buildPrompt({ persona, budget, market, idea, tags }) {
        const sectorList = tags.length ? tags.join(', ') : 'General Tech';
        const marketMap = {
            india: 'India', us: 'United States', eu: 'European Union',
            global: 'Global / Multi-market', sea: 'South-East Asia'
        };
        const marketLabel = marketMap[market] || market;

        return `You are a world-class senior venture capital partner at a top-tier firm (like Sequoia, Andreessen Horowitz, or Accel). 
A user has submitted a startup pitch. Your goal is to give a BRUTALLY HONEST, DEEP, and DATA-DRIVEN analysis. No fluff. No generic advice.

## INPUT CONTEXT
- Founder Profile: ${persona}
- Capital Available: ${budget || 'Zero / Not specified'}
- Market: ${marketLabel}
- Sector Focus: ${sectorList}

## THE PITCH
"""
${idea}
"""

## CRITICAL INSTRUCTIONS
1. Be Critical: Identify the "hidden traps" — regulatory landmines, unit economic failures, or market saturation risks that an amateur might miss.
2. Be Local: If the market is India, mention specific Indian laws (e.g. DPDP Act, RBI fintech guidelines, GST implications).
3. Be Current: Use facts and trends from late 2025 / early 2026.
4. Structural Integrity: Return ONLY a valid JSON object.
5. Nonsense Filtering: If the pitch is "nonsense", "a joke", "random text" (e.g. 'asdf', 'bla bla'), or completely unrelated to a business idea, set "is_valid": false and provide a "warning" explaining why.

## JSON STRUCTURE REQUIRED
{
  "is_valid": true,
  "warning": null,
  "viability": <integer 1–100>,
  "verdict": "<powerful 1-sentence decision with emoji>",
  "deep_review": "<a 250-word masterclass analysis. Break down the moat (or lack thereof), the GTM strategy, and the 3 biggest reasons this will either reach $1B or fail in 6 months.>",
  "causal_chain": ["<detailed step 1 of consequence mapping>", "<step 2>", "<step 3>"],
  "judges": [
    {
      "name": "<Real VC firm or Shark name>",
      "role": "<specific focus>",
      "emoji": "<emoji>",
      "verdict": "<IN/OUT/MAYBE>",
      "verdict_type": "<IN|OUT|MAYBE>",
      "score": <integer 0–100>,
      "quote": "<A 3-sentence critique that sounds like a real VC interrogation. Sharp, insightful, questioning the core assumptions.>"
    },
    { ... }, { ... }
  ],
  "schemes": [
    {
      "name": "<Specific govt scheme/accelerator>",
      "org": "<Dept/Org>",
      "match": <60–99>,
      "amount": "<Exact ₹/$ amount/range>",
      "deadline": "<Specific timeline for 2026>",
      "desc": "<Actionable reason why this fits this EXACT idea>"
    }
  ],
  "policies": [
    {
      "type": "<red|yellow|green>",
      "icon": "<emoji>",
      "title": "<Specific Law/Act name>",
      "body": "<Detailed explanation of how this policy creates a bottleneck or opportunity for this specific idea. Add one sentence of immediate legal/compliance advice.>"
    }
  ],
  "roadmap": [
    {
      "icon": "<emoji>",
      "week": "Periodname",
      "title": "Milestone",
      "body": "Highly specific technical/business task.",
      "color_theme": "blue|indigo|cyan|green|yellow|red"
    }
  ],
  "metrics": {
    "market_size": "<Specific SAM/TAM estimate>",
    "tam_capture": "<Realistic first-year penetration>",
    "break_even": "<Timeline with pivot-point indicators>"
  },
  "panel_summary": "<Condensed insight for the user dashboard>"
}

Rule: PROMPT ONLY JSON. Do not include markdown code blocks. Correctness of regulatory information is PARAMOUNT.`;
    }

    // ── Call Groq API ──────────────────────────────────────────────────────────
    async function callGroq(prompt) {
        const key = window.GROQ_API_KEY;
        if (!key) throw new Error('GROQ_API_KEY not configured');

        const response = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: 'You are a world-class senior venture capital partner analysis engine. Respond ONLY in valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Groq API error ${response.status}: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('No content in Groq response');

        return JSON.parse(text);
    }

    // ── Local fallback heuristic (no API needed) ───────────────────────────────
    function localFallback({ persona, budget, market, idea, tags }) {
        const text = idea.toLowerCase();
        const goodWords = ['ai', 'machine learning', 'saas', 'b2b', 'platform', 'subscription',
            'data', 'automation', 'api', 'marketplace', 'recurring', 'scalable', 'network effect'];
        const riskWords = ['competitor', 'saturated', 'expensive', 'complex', 'regulation', 'already exists'];

        let score = 55;
        goodWords.forEach(w => { if (text.includes(w)) score += 3; });
        riskWords.forEach(w => { if (text.includes(w)) score -= 2; });
        if (persona === 'founder') score += 5;
        if (persona === 'student') score -= 3;
        if (market === 'global') score += 4;
        if (market === 'india') score += 2;
        score += Math.min(idea.length / 20, 10);
        score = Math.min(Math.max(Math.round(score), 30), 98);

        const verdictLabel = score >= 80 ? '🚀 High Potential — Strong Buy Signal'
            : score >= 65 ? '⚡ Promising — Needs Refinement'
            : score >= 50 ? '⚠️ Moderate — Validate Further'
            : '🔴 Risky — Major Pivots Needed';

        return {
            viability: score,
            verdict: verdictLabel,
            causal_chain: [
                'Strong problem statement → clear demand signal → faster customer acquisition',
                'Limited differentiation → commoditisation risk → margin compression over time',
                'Early market entry → brand equity advantage → compounding defensibility'
            ],
            judges: [
                {
                    name: 'Priya Ventures', role: 'Growth Equity', emoji: '👩‍💼',
                    verdict: score >= 70 ? 'IN — Excited' : 'MAYBE — Conditions',
                    verdict_type: score >= 70 ? 'IN' : 'MAYBE',
                    score: Math.round(score * 0.95),
                    quote: score >= 70
                        ? '"The problem is real and large. I love the focus on an underserved segment. Interested at pre-seed — show me a working prototype in 90 days."'
                        : '"Interesting thesis but the go-to-market is fuzzy. Who is your exact first paying customer? Come back with 10 signed LOIs."'
                },
                {
                    name: 'Arjun Capital', role: 'Deep Tech VC', emoji: '👨‍💻',
                    verdict: score >= 60 ? 'IN — Conditionally' : 'OUT',
                    verdict_type: score >= 60 ? 'IN' : 'OUT',
                    score: Math.min(Math.round(score * 1.05), 100),
                    quote: score >= 60
                        ? '"Technology risk is manageable. My concern is the team — do you have a technical co-founder? That\'s table stakes for me. Solve that, I\'ll write the check."'
                        : '"I\'ve seen 20 pitches like this. The moat is missing. What stops a large incumbent from copying this in 6 months? I\'m out until that\'s answered."'
                },
                {
                    name: 'Maya Mehta', role: 'Consumer & D2C', emoji: '👩‍🎤',
                    verdict: score >= 75 ? 'IN — Lead Investor' : 'EXPLORING',
                    verdict_type: score >= 75 ? 'IN' : 'MAYBE',
                    score: Math.round(score * 0.98),
                    quote: score >= 75
                        ? '"This has breakout potential. Unit economics look healthy on paper. I can bring 3 strategic angels alongside. Let\'s talk term sheet this week."'
                        : '"Too early for me but the thesis is right. Nail price sensitivity testing and build a viral growth loop, then call me in 6 months."'
                }
            ],
            schemes: _getFallbackSchemes(market),
            policies: _getFallbackPolicies(market),
            roadmap: [
                { icon: '🔬', week: 'Week 1–2', title: 'Customer Discovery', body: 'Conduct 20+ structured customer interviews. Validate the problem, not your solution. Record willingness-to-pay signals explicitly.', color_theme: 'blue' },
                { icon: '🗺️', week: 'Week 3–4', title: 'Define MVP Scope', body: 'Strip to the single core workflow that solves Day-1 pain. No nice-to-haves. Build a clickable Figma prototype before writing any code.', color_theme: 'indigo' },
                { icon: '⚙️', week: 'Month 2', title: 'Build & Ship v0.1', body: 'Minimum Lovable Product. Get 10 real users using it. Observe, don\'t pitch. Fix the 3 biggest friction points.', color_theme: 'cyan' },
                { icon: '📈', week: 'Month 3', title: 'Metrics & Fundraise Prep', body: 'Track DAU, retention D7/D30, NPS. If metrics are green, prepare a 10-slide deck and approach 5 seed-stage VCs in your market.', color_theme: 'green' },
                { icon: '💰', week: 'Month 4–6', title: 'Raise Pre-seed Round', body: `Target $${persona === 'student' ? '100K–500K' : '500K–2M'}. Use matched schemes above for non-dilutive capital first.`, color_theme: 'yellow' }
            ],
            metrics: {
                market_size: ['$1.8B', '$3.2B', '$800M', '$6.4B'][Math.floor(Math.random() * 4)],
                tam_capture: ['0.3–1.2%', '0.1–0.5%', '0.8–2.1%'][Math.floor(Math.random() * 3)],
                break_even: ['12–18 Mo', '18–24 Mo', '24–36 Mo'][Math.floor(Math.random() * 3)]
            },
            deep_review: `Our preliminary analysis suggest that your idea focuses on a high-growth segment. However, the true "moat" remains unclear. To scale effectively, you must focus on deep tech integration (AI/ML) rather than just a wrapper. Regulatory compliance in ${market} will be your first hurdle. Focus on building a strong MVP with 10 core users before seeking venture capital. (⚠️ Full analysis requires live Gemini API connection)`,
            panel_summary: `Our AI panel analysed your idea against ${market} market conditions. The concept scores ${score}/100 on viability. Key risks: market timing, regulatory hurdles, and execution bandwidth. (⚠️ Running in offline mode — add your Gemini API key for live AI analysis)`,
            _source: 'local'
        };
    }

    // ── Fallback scheme/policy data ───────────────────────────────────────────
    function _getFallbackSchemes(market) {
        const data = {
            india: [
                { name: 'Startup India Seed Fund', org: 'DPIIT, Govt of India', match: 94, amount: '₹20L – ₹50L', deadline: 'Rolling', desc: 'Non-dilutive seed funding for DPIIT-recognised startups proving market viability.' },
                { name: 'TIDE 2.0 — MeitY Scheme', org: 'Ministry of Electronics & IT', match: 81, amount: '₹30L (tech-focused)', deadline: 'Dec 2026', desc: 'Support for IoT, AI/ML, blockchain and cybersecurity startups at pre-seed stage.' },
                { name: 'Atal Innovation Mission Grant', org: 'NITI Aayog', match: 77, amount: '₹10L – ₹1Cr', deadline: 'Jan 2027', desc: 'Supports innovation-driven enterprises with mentorship and infrastructure.' }
            ],
            us: [
                { name: 'SBIR Phase I Grant', org: 'NSF / SBA', match: 91, amount: '$150K – $275K', deadline: 'Rolling', desc: 'Non-dilutive R&D funding for small businesses doing high-risk, high-reward research.' },
                { name: 'Y Combinator', org: 'Y Combinator', match: 85, amount: '$125K for 7%', deadline: 'Rolling', desc: 'World\'s most recognised accelerator. 3-month program + Demo Day.' }
            ],
            eu: [
                { name: 'Horizon Europe EIC Accelerator', org: 'European Commission', match: 89, amount: '€2.5M (+ equity)', deadline: 'Mar 2027', desc: 'Europe\'s flagship deep-tech program for breakthrough innovation.' },
                { name: 'EIC Pathfinder', org: 'European Commission', match: 83, amount: '€3M – €4M', deadline: 'Feb 2027', desc: 'Funding for highly speculative, long-horizon research.' }
            ],
            global: [
                { name: 'Google for Startups Fund', org: 'Google', match: 86, amount: 'Up to $350K credits', deadline: 'Rolling', desc: 'AI-first startups. Includes cloud credits, go-to-market support, and network access.' },
                { name: 'Draper Startup House Seed', org: 'Draper VC', match: 80, amount: '$25K – $150K', deadline: 'Rolling', desc: 'Global accelerator. Agnostic to sector.' }
            ],
            sea: [
                { name: 'Enterprise Development Fund', org: 'Singapore EDB', match: 87, amount: 'SGD 500K', deadline: 'Rolling', desc: 'Singapore-based startups. Co-funded with private investors at 4:1 ratio.' }
            ]
        };
        return data[market] || data.india;
    }

    function _getFallbackPolicies(market) {
        const data = {
            india: [
                { type: 'red', icon: '⚠️', title: 'Digital Personal Data Protection Act 2023', body: 'DPDP Act mandates user data of Indian citizens must be processed/stored within India. Penalties up to ₹250Cr. Affects any app collecting personal data.' },
                { type: 'yellow', icon: '📦', title: 'Import Duty Alert — Electronics Hardware', body: 'Basic Customs Duty on electronics raised to 25% (Budget 2025). Startups manufacturing hardware with imported chips will face increased COGS.' },
                { type: 'green', icon: '🏷️', title: 'Startup Tax Holiday — Sec 80-IAC', body: '100% tax holiday for 3 consecutive years for DPIIT-recognised startups. Turnover must not exceed ₹100Cr during qualifying year.' }
            ],
            us: [
                { type: 'red', icon: '🏛️', title: 'SEC AI Financial Advice Regulation', body: 'AI-driven investment recommendations may require SEC registration as an Investment Adviser. $1M+ compliance cost if not structured correctly.' },
                { type: 'green', icon: '💡', title: 'R&D Tax Credit — Section 41', body: 'Up to 20% of qualifying research expenses as a federal tax credit. Startups with <$5M revenue can offset up to $250K in payroll taxes.' }
            ],
            eu: [
                { type: 'red', icon: '🤖', title: 'EU AI Act — High-Risk Classification', body: 'AI systems in healthcare, education, employment or credit are "high risk" under EU AI Act. Requires conformity assessment and CE marking by 2026.' },
                { type: 'yellow', icon: '🔐', title: 'GDPR Compliance Mandatory', body: 'Any product handling EU citizens\' data must be GDPR-compliant. Fines up to 4% of global annual revenue.' }
            ]
        };
        return data[market] || data.india;
    }

    // ── Public API ─────────────────────────────────────────────────────────────
    async function analyseIdea(params) {
        const key = window.GROQ_API_KEY;

        if (!key) {
            console.warn('[AIService] No Groq API key — using local heuristic fallback');
            return localFallback(params);
        }

        try {
            console.log('[AIService] Calling Groq (Llama-3.3-70B)...');
            const prompt = buildPrompt(params);
            const result = await callGroq(prompt);
            result._source = 'groq';
            
            // Safety check for joke/nonsense inputs
            if (result.is_valid === false) {
                console.warn('[AIService] Input flagged as invalid/joke:', result.warning);
                return { _is_invalid: true, warning: result.warning || 'Please enter a valid business idea.' };
            }

            console.log('[AIService] Groq response received:', result);
            return result;
        } catch (err) {
            console.warn('[AIService] Groq call failed, using fallback:', err.message);
            const fallback = localFallback(params);
            fallback._error = err.message;
            return fallback;
        }
    }

    return { analyseIdea };
})();
