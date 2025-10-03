// supabase-init.js - FAIL-SAFE VERSION
console.log('supabase-init.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking for Supabase...');
    
    const supabaseUrl = 'https://qleubfvmydnitmsylqxo.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA';

    // Check if Supabase library loaded
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        try {
            const { createClient } = window.supabase;
            window.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('✓ Supabase initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            window.supabase = null;
        }
    } else {
        console.warn('⚠ Supabase library not loaded - authentication will be disabled');
        window.supabase = null;
    }
    
    // Always dispatch ready event so page loads
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('supabaseReady'));
    }, 100);
});