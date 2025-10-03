// supabase-init.js
console.log('supabase-init.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Supabase...');
    
    // Your actual Supabase credentials
    const supabaseUrl = 'https://qleubfvmydnitmsylqxo.supabase.co'; // Replace with your actual URL
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA'; // Replace with your actual anon key
    
    // Check if Supabase library is loaded (not the variable)
    if (typeof window.supabase === 'undefined') {
        console.error('ERROR: Supabase library not loaded. Check the script tag in HTML');
        if (typeof showNotification === 'function') {
            showNotification('Configuration Error', 'Please check your internet connection and refresh the page.', 'error');
        }
        return;
    }
    
    console.log('Supabase library found:', window.supabase);
    
    // Create Supabase client
    const { createClient } = window.supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Make supabase available globally
    window.supabase = supabaseClient;
    
    console.log('Supabase initialized successfully:', supabaseClient);
    
    // Dispatch an event to let other scripts know Supabase is ready
    window.dispatchEvent(new CustomEvent('supabaseReady'));
});