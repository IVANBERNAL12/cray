// supabase-init.js - COMPLETE FIXED VERSION WITH BETTER CONNECTION HANDLING
console.log('supabase-init.js loading...');

// Supabase Configuration
const SUPABASE_URL = 'https://qleubfvmydnitmsylqxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA';

// Connection state tracking
window.supabaseConnectionState = {
    initialized: false,
    connected: false,
    authenticated: false,
    lastError: null,
    retryCount: 0,
    maxRetries: 3
};

// Initialize Supabase client
function initializeSupabase() {
    return new Promise((resolve, reject) => {
        console.log('[Supabase] Starting initialization...');
        
        // Check if Supabase library is loaded
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            const error = 'Supabase library not loaded! Check script tag in HTML.';
            console.error('[Supabase]', error);
            window.supabaseConnectionState.lastError = error;
            reject(new Error(error));
            return;
        }

        try {
            // Create Supabase client
            window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    storage: window.localStorage,
                    flowType: 'pkce'
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                },
                global: {
                    headers: {
                        'x-client-info': 'aquavision-pro-v1.0'
                    }
                }
            });
            
            window.supabaseConnectionState.initialized = true;
            console.log('[Supabase] ✓ Client initialized successfully');
            console.log('[Supabase] URL:', SUPABASE_URL);
            
            // Verify connection with timeout
            verifyConnection()
                .then(() => {
                    console.log('[Supabase] ✓ Connection verified and ready');
                    window.supabaseConnectionState.connected = true;
                    resolve(window.supabase);
                })
                .catch((error) => {
                    console.warn('[Supabase] Connection verification warning:', error.message);
                    window.supabaseConnectionState.lastError = error.message;
                    // Still resolve - connection issues might be temporary
                    resolve(window.supabase);
                });
            
        } catch (error) {
            console.error('[Supabase] Initialization error:', error);
            window.supabaseConnectionState.lastError = error.message;
            window.supabase = null;
            reject(error);
        }
    });
}

// Verify Supabase connection
async function verifyConnection() {
    if (!window.supabase) {
        throw new Error('Supabase client not initialized');
    }

    console.log('[Supabase] Verifying connection...');

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection verification timeout')), 5000)
    );

    try {
        // Try to get session with timeout
        const sessionPromise = window.supabase.auth.getSession();
        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) {
            throw error;
        }
        
        if (data.session) {
            console.log('[Supabase] ✓ Active session found:', data.session.user.email);
            console.log('[Supabase] ✓ User ID:', data.session.user.id);
            window.supabaseConnectionState.authenticated = true;
            
            // Store user ID for ESP8266 reference
            localStorage.setItem('userId', data.session.user.id);
            displayUserIdForESP(data.session.user.id);
        } else {
            console.log('[Supabase] No active session (user not logged in)');
            window.supabaseConnectionState.authenticated = false;
        }
        
        return true;
    } catch (error) {
        console.warn('[Supabase] Verification failed:', error.message);
        
        // Retry logic
        if (window.supabaseConnectionState.retryCount < window.supabaseConnectionState.maxRetries) {
            window.supabaseConnectionState.retryCount++;
            console.log(`[Supabase] Retrying... (${window.supabaseConnectionState.retryCount}/${window.supabaseConnectionState.maxRetries})`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            return verifyConnection();
        }
        
        throw error;
    }
}

// Display User ID for ESP8266 configuration
function displayUserIdForESP(userId) {
    if (!userId) {
        userId = localStorage.getItem('userId');
    }
    
    if (userId) {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║           ESP8266 CONFIGURATION REQUIRED              ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📋 YOUR USER ID FOR ESP8266:');
        console.log('');
        console.log(`   ${userId}`);
        console.log('');
        console.log('🔧 STEPS TO CONFIGURE ESP8266:');
        console.log('   1. Copy the UUID above');
        console.log('   2. Open your ESP8266 code');
        console.log('   3. Find the line: String USER_ID = "..."');
        console.log('   4. Replace with your UUID');
        console.log('   5. Upload to ESP8266');
        console.log('');
        console.log('════════════════════════════════════════════════════════');
        console.log('');
        
        return userId;
    } else {
        console.log('⚠ User not logged in. Please log in first to get your User ID.');
        return null;
    }
}

// Test database connection
async function testDatabaseConnection() {
    if (!window.supabase) {
        console.warn('[Supabase] Cannot test - client not initialized');
        return false;
    }

    try {
        console.log('[Supabase] Testing database connection...');
        
        // Simple query to verify database access
        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('count')
            .limit(1);

        if (error) {
            console.warn('[Supabase] Database test warning:', error.message);
            return false;
        }

        console.log('[Supabase] ✓ Database connection verified');
        return true;
    } catch (error) {
        console.error('[Supabase] Database test failed:', error);
        return false;
    }
}

// Set up auth state listener
function setupAuthListener() {
    if (!window.supabase || !window.supabase.auth) {
        console.warn('[Supabase] Cannot setup auth listener - client not ready');
        return;
    }

    console.log('[Supabase] Setting up auth state listener...');

    const { data: { subscription } } = window.supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Supabase] Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
                console.log('[Supabase] ✓ User authenticated:', session.user.email);
                localStorage.setItem('userId', session.user.id);
                window.supabaseConnectionState.authenticated = true;
                displayUserIdForESP(session.user.id);
                
                // Dispatch custom event
                window.dispatchEvent(new CustomEvent('authStateChanged', {
                    detail: { authenticated: true, user: session.user }
                }));
            }
        } else if (event === 'SIGNED_OUT') {
            console.log('[Supabase] User signed out');
            localStorage.removeItem('userId');
            window.supabaseConnectionState.authenticated = false;
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { authenticated: false, user: null }
            }));
        }
    });

    console.log('[Supabase] ✓ Auth listener configured');
    return subscription;
}

// Get connection status
function getConnectionStatus() {
    return {
        ...window.supabaseConnectionState,
        supabaseAvailable: !!window.supabase,
        timestamp: new Date().toISOString()
    };
}

// Export status function
window.getSupabaseStatus = getConnectionStatus;
window.displayUserIdForESP = displayUserIdForESP;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await initializeSupabase();
            setupAuthListener();
            await testDatabaseConnection();
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('supabaseReady'));
            console.log('[Supabase] ✓ Initialization complete - supabaseReady event dispatched');
        } catch (error) {
            console.error('[Supabase] Failed to initialize:', error);
        }
    });
} else {
    // DOM already loaded, initialize immediately
    initializeSupabase()
        .then(() => {
            setupAuthListener();
            return testDatabaseConnection();
        })
        .then(() => {
            // Dispatch ready event
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('supabaseReady'));
                console.log('[Supabase] ✓ Initialization complete - supabaseReady event dispatched');
            }, 100);
        })
        .catch((error) => {
            console.error('[Supabase] Failed to initialize:', error);
        });
}

console.log('[Supabase] ✓ Init script loaded successfully');