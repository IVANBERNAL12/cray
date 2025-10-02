// supabase-init.js
console.log('supabase-init.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Supabase...');
    
    // Your actual Supabase credentials
    const supabaseUrl = 'https://your-project-id.supabase.co'; // Replace with your actual URL
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with your actual anon key
    
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.error('ERROR: Supabase library not loaded. Check the script tag in HTML');
        return;
    }
    
    console.log('Supabase library found:', supabase);
    
    // Create Supabase client
    const { createClient } = supabase;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Make supabase available globally
    window.supabase = supabase;
    
    console.log('Supabase initialized successfully:', supababase);
    
    // Dispatch an event to let other scripts know Supabase is ready
    window.dispatchEvent(new CustomEvent('supabaseReady'));
});