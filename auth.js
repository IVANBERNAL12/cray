// auth.js - COMPLETE CORRECTED VERSION
console.log('auth.js loading...');

// Helper function to handle auth state changes
function handleAuthStateChange(event, session) {
    console.log('[Auth] State changed:', event);
    
    if (event === 'SIGNED_OUT') {
        localStorage.removeItem('supabaseSession');
        localStorage.removeItem('userId');
        console.log('[Auth] User signed out');
        
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: false, user: null }
        }));
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session) {
            localStorage.setItem('supabaseSession', JSON.stringify(session));
            localStorage.setItem('userId', session.user.id);
            console.log('[Auth] User authenticated:', session.user.email);
            console.log('[Auth] User ID:', session.user.id);
            
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { authenticated: true, user: session.user }
            }));
        }
    }
}

// Wait for Supabase to be ready
document.addEventListener('supabaseReady', function() {
    console.log('[Auth] Supabase ready, setting up auth...');
    
    if (window.supabase && window.supabase.auth) {
        // Set up auth state change listener
        const { data: { subscription } } = window.supabase.auth.onAuthStateChange((event, session) => {
            handleAuthStateChange(event, session);
        });
        
        console.log('[Auth] ✓ Auth state listener configured');
    } else {
        console.error('[Auth] Supabase auth not available');
    }
});

// Sign up function
async function signUp(email, password, name, farmName) {
    try {
        console.log('[Auth] Starting signup for:', email);
        
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase is not initialized');
        }
        
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    farm_name: farmName || 'My Crayfish Farm'
                }
            }
        });
        
        if (error) throw error;
        
        console.log('[Auth] ✓ Signup successful:', data);
        return { success: true, message: 'Sign up successful! Please check your email to verify your account.' };
    } catch (error) {
        console.error('[Auth] Signup failed:', error);
        return { success: false, message: error.message };
    }
}

// Sign in function
async function signIn(email, password) {
    try {
        console.log('[Auth] Attempting sign in for:', email);
        
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase is not initialized');
        }
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('[Auth] ✓ Sign in successful');
        
        if (data.session) {
            localStorage.setItem('supabaseSession', JSON.stringify(data.session));
            localStorage.setItem('userId', data.user.id);
            console.log('[Auth] User ID stored:', data.user.id);
        }
        
        return { success: true, data: data };
    } catch (error) {
        console.error('[Auth] Sign in failed:', error);
        return { success: false, message: error.message };
    }
}

// Sign out function
async function signOut() {
    try {
        console.log('[Auth] Signing out...');
        
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase is not initialized');
        }
        
        const { error } = await window.supabase.auth.signOut();
        
        if (error) throw error;
        
        localStorage.removeItem('supabaseSession');
        localStorage.removeItem('userId');
        console.log('[Auth] ✓ Sign out successful');
        
        return { success: true };
    } catch (error) {
        console.error('[Auth] Sign out failed:', error);
        return { success: false, message: error.message };
    }
}

// Check if user is logged in
async function checkAuth() {
    try {
        console.log('[Auth] Checking authentication...');
        
        if (!window.supabase || !window.supabase.auth) {
            console.log('[Auth] Supabase not available');
            return { authenticated: false };
        }
        
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error('[Auth] Session check error:', error);
            return { authenticated: false };
        }
        
        if (session) {
            localStorage.setItem('userId', session.user.id);
            console.log('[Auth] ✓ User authenticated:', session.user.email);
            return { authenticated: true, user: session.user };
        }
        
        console.log('[Auth] No active session');
        return { authenticated: false };
    } catch (error) {
        console.error('[Auth] Check auth failed:', error);
        return { authenticated: false };
    }
}

// Get current user
async function getCurrentUser() {
    try {
        if (!window.supabase || !window.supabase.auth) {
            return null;
        }
        
        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error) {
            console.error('[Auth] Get user error:', error);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('[Auth] Failed to get current user:', error);
        return null;
    }
}

// Get current user ID (synchronous)
function getCurrentUserId() {
    const userId = localStorage.getItem('userId');
    console.log('[Auth] Current user ID:', userId);
    return userId;
}

// Display user ID for ESP8266 configuration
function displayUserIdForESP() {
    const userId = getCurrentUserId();
    if (userId) {
        console.log('========================================');
        console.log('YOUR USER ID FOR ESP8266:');
        console.log(userId);
        console.log('========================================');
        console.log('Copy this UUID and paste it in your ESP8266 code');
        return userId;
    } else {
        console.log('User not logged in. Please log in first.');
        return null;
    }
}

// Show notification
function showAuthNotification(title, message, type = 'info') {
    console.log(`[Auth] ${type.toUpperCase()}: ${title} - ${message}`);
    
    // Try to use dashboard notification if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(title, message, type);
    }
}

// Export functions globally
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;
window.getCurrentUserId = getCurrentUserId;
window.displayUserIdForESP = displayUserIdForESP;
window.showAuthNotification = showAuthNotification;

console.log('[Auth] ✓ Auth module loaded');