// supabase-init.js - CORRECTED VERSION
console.log('supabase-init.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Supabase...');
    
    // Your actual Supabase credentials
    const supabaseUrl = 'https://qleubfvmydnitmsylqxo.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA';

    // The Supabase CDN script creates a global object named 'supabase'
    // We check if this object exists.
    if (typeof window.supabase === 'undefined') {
        console.error('ERROR: Supabase library not loaded. Check the script tag in HTML');
        // Still dispatch the event so the page can load
        window.dispatchEvent(new CustomEvent('supabaseReady'));
        return;
    }
    
    console.log('Supabase library found:', window.supabase);
    
    // The createClient function is a property of the global 'supabase' object
    const { createClient } = window.supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // We overwrite the global 'supabase' object with our specific client instance.
    window.supabase = supabaseClient;
    
    console.log('Supabase client initialized successfully:', supabaseClient);
    
    // Dispatch an event to let other scripts know Supabase is ready
    window.dispatchEvent(new CustomEvent('supabaseReady'));
});