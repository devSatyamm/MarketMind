/**
 * MarketMind — Supabase Client
 * js/supabase.js
 *
 * This file initialises the Supabase JS client using the config from config.js.
 * Include AFTER config.js in your HTML pages:
 *   <script src="../js/config.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="../js/supabase.js"></script>
 *
 * Then use the global `db` object in your pages:
 *   const { data } = await db.from('schemes').select();
 */

const db = supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON
);

/**
 * Convenience helpers matching the old API pattern
 * so existing code can switch easily.
 */
const DB = {
    /** Fetch all schemes, optionally filtered */
    async getSchemes({ market, stage, industry, category, search, limit } = {}) {
        let q = db.from('government_schemes').select('*');
        if (category && category !== 'all') q = q.eq('category', category);
        if (market && market !== 'all') q = q.or(`market.eq.${market},market.eq.global`);
        if (stage) q = q.contains('stage', [stage]);
        if (industry && industry !== 'all') q = q.contains('industry', [industry]);
        if (search) q = q.ilike('name', `%${search}%`);
        if (limit) q = q.limit(limit);
        const { data, error } = await q;
        if (error) { console.error('[DB] schemes error:', error); return []; }
        return data;
    },

    /** Fetch all policies, optionally filtered by region */
    async getPolicies({ region, category, type } = {}) {
        let q = db.from('policies').select('*');
        if (region && region !== 'all') q = q.or(`region.eq.${region},region.eq.global`);
        if (category) q = q.ilike('category', `%${category}%`);
        if (type) q = q.eq('type', type);
        const { data, error } = await q;
        if (error) { console.error('[DB] policies error:', error); return []; }
        return data;
    },

    /** Fetch news articles */
    async getNews({ category, limit = 20 } = {}) {
        let q = db.from('news').select('*').order('published_at', { ascending: false }).limit(limit);
        if (category && category !== 'all') q = q.eq('category', category);
        const { data, error } = await q;
        if (error) { console.error('[DB] news error:', error); return []; }
        return data;
    },

    /** Get the default profile */
    async getProfile() {
        const { data, error } = await db.from('profiles').select('*').limit(1).single();
        if (error) { console.error('[DB] profile error:', error); return null; }
        return data;
    },

    /** Update profile */
    async updateProfile(id, updates) {
        const { data, error } = await db.from('profiles').update(updates).eq('id', id).select().single();
        if (error) { console.error('[DB] profile update error:', error); return null; }
        return data;
    },

    /** Save a pitch to history */
    async savePitch(pitch) {
        const { data, error } = await db.from('pitches').insert(pitch).select().single();
        if (error) { console.error('[DB] pitch save error:', error); return null; }
        return data;
    },

    /** Get pitch history */
    async getPitches(limit = 10) {
        const { data, error } = await db.from('pitches').select('*').order('created_at', { ascending: false }).limit(limit);
        if (error) { console.error('[DB] pitches error:', error); return []; }
        return data;
    },
};

// Connection status — log to console
(async () => {
    try {
        const { data, error } = await db.from('government_schemes').select('id').limit(1);
        if (error) throw error;
        console.log('[MarketMind] ✅ Supabase connected — data ready');
    } catch (e) {
        console.warn('[MarketMind] ⚠️ Supabase connection issue:', e.message);
    }
})();
