// supabase-config.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Supabase...');
    
const supabaseUrl = 'https://qleubfvmydnitmsylqxo.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA'; // Replace with your Supabase anon key

const { createClient } = supabase;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Make supabase available globally
    window.supabase = supabase;
    
    console.log('Supabase initialized successfully:', supabase);
    
    // Dispatch an event to let other scripts know Supabase is ready
    window.dispatchEvent(new CustomEvent('supabaseReady'));
})