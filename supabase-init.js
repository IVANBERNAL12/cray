// supabase-init.js - COMPLETE CORRECTED VERSION
console.log('supabase-init.js loading...');

// Supabase Configuration
const SUPABASE_URL = 'https://qleubfvmydnitmsylqxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA';

// Initialize immediately (don't wait for DOMContentLoaded)
if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    try {
        window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: window.localStorage
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
        
        console.log('[Supabase] ✓ Client initialized successfully');
        console.log('[Supabase] URL:', SUPABASE_URL);
        
        // Test connection immediately
        window.supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.warn('[Supabase] Session check warning:', error.message);
            } else {
                console.log('[Supabase] ✓ Connection verified');
                if (data.session) {
                    console.log('[Supabase] ✓ Active session found for:', data.session.user.email);
                }
            }
        });
        
        // Dispatch ready event
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.dispatchEvent(new CustomEvent('supabaseReady'));
            });
        } else {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('supabaseReady'));
            }, 10);
        }
        
    } catch (error) {
        console.error('[Supabase] Initialization error:', error);
        window.supabase = null;
    }
} else {
    console.error('[Supabase] Library not loaded! Check script tag in HTML.');
    window.supabase = null;
}