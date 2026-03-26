/**
 * MarketMind — API Configuration
 * js/config.js
 *
 * Public / client-side API keys.
 * Loads actual keys from secrets.js if available.
 */

// Supabase (Safe to be public)
window.SUPABASE_URL  = 'https://jpmvfibidespvkawdewg.supabase.co';
window.SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbXZmaWJpZGVzcHZrYXdkZXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzM3MDYsImV4cCI6MjA4NzI0OTcwNn0.VG7R4EGLrT1p8deCEWDdDPXBwMRtM_sQMMR-NZ8p4JY';

// Load Secret Keys from secrets.js or use placeholders
const secrets = window.MARKETMIND_SECRETS || {};

// Groq — Primary AI Backbone (Llama-3.3-70B via Groq)
window.GROQ_API_KEY = secrets.GROQ_API_KEY || 'YOUR_GROQ_KEY_HERE';

// OpenRouter — Simulation Engine Only
window.OPENROUTER_API_KEY = secrets.OPENROUTER_API_KEY || 'YOUR_OPENROUTER_KEY_HERE';

// Mistral AI — Strategy engine
window.MISTRAL_API_KEY = secrets.MISTRAL_API_KEY || 'YOUR_MISTRAL_KEY_HERE';
