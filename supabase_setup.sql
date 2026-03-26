-- ═══════════════════════════════════════════════════════════════════════════════
-- MarketMind — Supabase Schema + Seed Data
-- Run this ENTIRE file in the Supabase SQL Editor (one shot)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. GOVERNMENT_SCHEMES TABLE ──────────────────────────────────────────────
-- Drop existing empty table and recreate with proper columns
DROP TABLE IF EXISTS government_schemes CASCADE;
CREATE TABLE government_schemes (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  org         TEXT NOT NULL,
  icon        TEXT DEFAULT 'fa-lightbulb',
  amount      TEXT NOT NULL,
  amount_usd  INTEGER DEFAULT 0,
  probability TEXT DEFAULT 'Medium',
  stage       TEXT[] DEFAULT '{}',
  industry    TEXT[] DEFAULT '{}',
  market      TEXT DEFAULT 'global',
  category    TEXT DEFAULT 'General',
  days_left   INTEGER,
  description TEXT,
  tags        TEXT[] DEFAULT '{}',
  eligibility TEXT,
  url         TEXT DEFAULT '#',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. POLICIES TABLE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id          SERIAL PRIMARY KEY,
  region      TEXT NOT NULL,
  flag        TEXT DEFAULT '🌐',
  category    TEXT NOT NULL,
  type        TEXT DEFAULT 'watch',
  title       TEXT NOT NULL,
  summary     TEXT,
  impact      TEXT DEFAULT 'Medium',
  effective   TEXT,
  url         TEXT DEFAULT '#',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 3. NEWS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id           SERIAL PRIMARY KEY,
  category     TEXT NOT NULL,
  badge        TEXT DEFAULT 'new',
  badge_label  TEXT DEFAULT '⚡ Breaking',
  title        TEXT NOT NULL,
  summary      TEXT,
  source       TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  read_time    TEXT DEFAULT '3 min',
  url          TEXT DEFAULT '#',
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 4. PROFILES TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          SERIAL PRIMARY KEY,
  name        TEXT DEFAULT 'Grey Matter',
  age         INTEGER DEFAULT 28,
  profession  TEXT DEFAULT 'Founder',
  gender      TEXT DEFAULT 'Prefer not to say',
  market      TEXT DEFAULT 'india',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 5. PITCHES TABLE (VC Forge history) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pitches (
  id          SERIAL PRIMARY KEY,
  persona     TEXT,
  budget      TEXT,
  market      TEXT,
  idea        TEXT,
  tags        TEXT[] DEFAULT '{}',
  viability   INTEGER,
  verdict     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — allow public reads, restrict writes
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE news               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitches            ENABLE ROW LEVEL SECURITY;

-- Public read for all tables
CREATE POLICY "Public read schemes"  ON government_schemes FOR SELECT USING (true);
CREATE POLICY "Public read policies" ON policies           FOR SELECT USING (true);
CREATE POLICY "Public read news"     ON news               FOR SELECT USING (true);
CREATE POLICY "Public read profiles" ON profiles           FOR SELECT USING (true);
CREATE POLICY "Public read pitches"  ON pitches            FOR SELECT USING (true);

-- Public insert for pitches and profiles (for demo/hackathon — no auth needed)
CREATE POLICY "Public insert pitches"  ON pitches  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON profiles FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Government Schemes (11 real-world schemes)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO government_schemes (name, org, icon, amount, amount_usd, probability, stage, industry, market, category, days_left, description, tags, eligibility, url) VALUES
('Startup India Seed Fund', 'DPIIT / Govt of India', 'fa-seedling', '₹20 Lakh', 24000, 'High', '{idea,seed}', '{all}', 'india', 'Startups & Innovation', 90, 'Non-dilutive seed funding for early-stage startups recognized under the Startup India programme. No equity taken.', '{Non-dilutive,India,Early-stage}', 'DPIIT-recognized startup, incorporated < 2 years, revenue < ₹10Cr', 'https://startupindia.gov.in/content/sih/en/seed-fund-scheme.html'),
('Smart Grant 2026', 'Innovate UK', 'fa-lightbulb', '£100k – £500k', 250000, 'High', '{seed,growth}', '{technology,ai}', 'global', 'Technology & SaaS', 12, 'Funding for game-changing, commercially viable R&D innovations involving AI and Machine Learning.', '{R&D,AI/ML,UK,Closing Soon}', 'UK-registered SME with fewer than 250 employees', 'https://www.ukri.org/opportunity/innovate-uk-smart-grants/'),
('Green Tech Fund', 'US Department of Energy', 'fa-leaf', '$500k – $2M', 1000000, 'Medium', '{growth,series-a}', '{cleantech,energy}', 'us', 'Green Energy', 45, 'Supports startups developing clean energy solutions. Priority given to carbon capture and storage technologies.', '{CleanTech,US,Impact}', 'US-based company, technology readiness level 4+', 'https://www.energy.gov/'),
('Y Combinator W26', 'Y Combinator', 'fa-rocket', '$500k (for 7% equity)', 500000, 'High', '{idea,seed}', '{all}', 'global', 'Startups & Innovation', NULL, 'The world''s most prestigious startup accelerator. $500k standard deal for 7% equity + the YC network.', '{Accelerator,Equity,Global,Rolling}', 'Any stage, any market, any team size. Strong preference for technical co-founders.', 'https://www.ycombinator.com/'),
('Atal Innovation Mission', 'NITI Aayog', 'fa-atom', '₹10 Lakh', 12000, 'High', '{idea,seed}', '{all}', 'india', 'Startups & Innovation', 60, 'Promotes innovation and entrepreneurship across the country via the Atal Incubation Centre network.', '{India,Non-dilutive,Student-friendly}', 'Indian citizen, idea-stage or prototype, no prior VC funding', 'https://aim.gov.in/'),
('TIDE 2.0 (MeitY)', 'Ministry of Electronics & IT', 'fa-microchip', '₹75 Lakh', 90000, 'Medium', '{seed,growth}', '{technology,ai}', 'india', 'Technology & SaaS', 30, 'Technology Incubation and Development of Entrepreneurs — for ICT-sector startups through MeitY-approved incubators.', '{India,ICT,MeitY}', 'Must apply through a MeitY-recognised Technology Business Incubator', 'https://www.meity.gov.in/tide'),
('EU Horizon Europe', 'European Commission', 'fa-globe-europe', 'Up to €2M', 2200000, 'Medium', '{growth,series-a}', '{cleantech,ai,health}', 'eu', 'Agriculture & Citizens', 120, 'EU''s key funding programme for research and innovation. Covers breakthrough tech, health, digital and green transition.', '{EU,R&D,Non-dilutive,Consortium}', 'EU-based entity OR international partners as part of a consortium', 'https://research-and-innovation.ec.europa.eu/'),
('Small Business Boost', 'Regional Growth Fund', 'fa-store', '$25k – $50k', 37500, 'Medium', '{idea,seed}', '{ecommerce,d2c}', 'us', 'Manufacturing', 90, 'Non-dilutive capital for small businesses looking to upgrade digital infrastructure and ecommerce capabilities.', '{US,E-commerce,Non-dilutive}', 'US small business with < 50 employees and < $5M annual revenue', '#'),
('Future Leaders Fellowship', 'Research Council UK', 'fa-flask', 'Up to $1.5M', 1500000, 'Low', '{growth,series-a}', '{deeptech,health,ai}', 'global', 'Healthcare', 2, 'Long-term support for early-career researchers and innovators with outstanding potential. Closing very soon.', '{Closing Soon,Research,Fellowship}', 'Researchers within 8 years of PhD completion', 'https://www.ukri.org/'),
('PM KUSUM Solar Scheme', 'Ministry of New & Renewable Energy', 'fa-sun', '₹30 Lakh subsidy', 36000, 'High', '{seed,growth}', '{cleantech,agritech}', 'india', 'Green Energy', 180, 'Supports installation of solar pumps and grid-connected solar plants for farmers and agri-tech companies.', '{India,Solar,AgriTech,Subsidy}', 'Farmers, FPOs, cooperatives, and agri-tech startups serving farmers', 'https://mnre.gov.in/solar/schemes/'),
('Academic Partnership Grant', 'University Alliance UK', 'fa-graduation-cap', 'Matched funding', 100000, 'Low', '{idea,seed}', '{deeptech,ai}', 'global', 'Technology & SaaS', 365, 'Collaborative funding for businesses working directly with university research labs on deep-tech projects.', '{Academic,Deep Tech,Matched Funding}', 'Partnership with a UK university; matched investment required', '#');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Policies
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO policies (region, flag, category, type, title, summary, impact, effective, url) VALUES
('india', '🇮🇳', 'Data Privacy', 'risk', 'Digital Personal Data Protection Act (DPDP) 2023', 'Mandates consent-based data collection, data localisation for sensitive personal data, and appointing a Data Protection Officer.', 'High', '2024 (rules pending)', 'https://meity.gov.in/content/digital-personal-data-protection-act-2023'),
('india', '🇮🇳', 'Startup Policy', 'opportunity', 'Startup India Action Plan', 'DPIIT recognition unlocks 10,000+ days of tax exemptions, fast-track patent processing, and access to ₹10,000 Cr Fund of Funds.', 'High', 'Active', 'https://startupindia.gov.in/'),
('india', '🇮🇳', 'FinTech', 'risk', 'RBI Payment Aggregator Guidelines', 'All payment aggregators must hold an RBI licence. Foreign FinTechs entering India face 12-18 month approval timelines.', 'High', 'Active', 'https://rbi.org.in/'),
('india', '🇮🇳', 'Manufacturing', 'opportunity', 'Production Linked Incentive (PLI) Schemes', '14 PLI schemes across sectors like electronics, pharma, textiles, food, drones offering 4–6% incentive on incremental sales.', 'Medium', 'Active', 'https://www.investindia.gov.in/pli'),
('us', '🇺🇸', 'AI Regulation', 'watch', 'White House Executive Order on AI Safety', 'Requires developers of foundation models to disclose safety test results to the government before public release.', 'High', 'Active', 'https://www.whitehouse.gov/briefing-room/presidential-actions/'),
('us', '🇺🇸', 'Data Privacy', 'risk', 'State-Level Privacy Laws (CCPA, VCDPA, etc.)', '15+ US states now have privacy laws. CCPA in California is the strictest — fines up to $7,500 per intentional violation.', 'Medium', 'Active', 'https://oag.ca.gov/privacy/ccpa'),
('us', '🇺🇸', 'Funding', 'opportunity', 'SBIR / STTR Government Grants', 'Non-dilutive federal R&D grants for small businesses. Phase I up to $275k, Phase II up to $1.83M across 11 agencies.', 'High', 'Active', 'https://www.sbir.gov/'),
('eu', '🇪🇺', 'AI Regulation', 'risk', 'EU AI Act (2024)', 'World''s first comprehensive AI law. Prohibits unacceptable-risk AI. High-risk AI requires conformity assessment from Aug 2026.', 'High', 'Aug 2024 (phased to 2026)', 'https://artificialintelligenceact.eu/'),
('eu', '🇪🇺', 'Data Privacy', 'risk', 'GDPR', 'Applies to any company processing EU residents'' data. Fines up to 4% of global annual revenue. Requires explicit consent and right to deletion.', 'High', 'Active since 2018', 'https://gdpr.eu/'),
('eu', '🇪🇺', 'Funding', 'opportunity', 'Horizon Europe (2021–2027)', '€95.5 billion programme for R&D and innovation. Open to global partners in consortiums. Priority areas: climate, health, digital.', 'High', 'Active', 'https://research-and-innovation.ec.europa.eu/');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — News
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO news (category, badge, badge_label, title, summary, source, published_at, read_time, url, tags) VALUES
('VC & Funding', 'hot', '🔥 Trending', 'Indian Startups Raised $10.7B in 2024 Despite Global VC Slowdown', 'Despite a 20% global dip in VC funding, India bucked the trend — FinTech and SaaS led deal activity, with 8 new unicorns minted.', 'Economic Times', '2026-02-19T08:00:00Z', '4 min', '#', '{India,VC,Unicorn}'),
('AI & Tech', 'new', '⚡ Breaking', 'Google Gemini 2.0 Flash Now Supports Real-Time Multimodal Reasoning', 'Gemini 2.0 Flash API is now GA with a 1-million-token context window, audio generation, and live streaming support for developers.', 'Google Blog', '2026-02-20T10:30:00Z', '3 min', 'https://blog.google/products/gemini/', '{AI,Google,API}'),
('Policy', 'alert', '⚠️ Policy Alert', 'India''s DPDP Rules Finalised — Data Fiduciary Compliance by Oct 2025', 'MeitY finalised the DPDP rules requiring all significant data fiduciaries to appoint a DPO and conduct annual data audits.', 'Ministry of Electronics & IT', '2026-02-18T12:00:00Z', '5 min', 'https://meity.gov.in/', '{India,Data Privacy,Compliance}'),
('Market', 'analysis', '📊 Analysis', 'India''s SaaS Sector on Track for $35B Revenue by 2027', 'NASSCOM report: Indian SaaS companies serve 60% of Fortune 500 firms. Key growth drivers — AI-native tools and SME digitalisation.', 'NASSCOM', '2026-02-17T09:00:00Z', '6 min', '#', '{SaaS,India,Market Research}'),
('VC & Funding', 'new', '💰 Funding', 'Sequoia India Launches $2B Fund Targeting 30 New Bets in FY26', 'Peak XV Partners announced a $2B fund focusing on seed to Series B investments in AI, health tech, and D2C sectors.', 'TechCrunch', '2026-02-15T14:00:00Z', '3 min', '#', '{VC,India,AI,HealthTech}');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Default Profile
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO profiles (name, age, profession, gender, market) VALUES
('Grey Matter', 28, 'Founder', 'Prefer not to say', 'india');
