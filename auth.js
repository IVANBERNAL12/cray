// auth.js
console.log('auth.js loaded');

// Helper function to handle auth state changes
function handleAuthStateChange(event, session) {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_OUT') {
        localStorage.removeItem('supabaseSession');
        localStorage.removeItem('userId');
        console.log('User signed out');
        
        // Dispatch custom event for dashboard
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: false, user: null }
        }));
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
            localStorage.setItem('supabaseSession', JSON.stringify(session));
            localStorage.setItem('userId', session.user.id);
            console.log('User signed in or token refreshed');
            console.log('User ID stored:', session.user.id);
            
            // Dispatch custom event for dashboard
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { authenticated: true, user: session.user }
            }));
        }
    }
}

// Wait for Supabase to be ready
document.addEventListener('supabaseReady', function() {
    console.log('Supabase is ready, setting up auth...');
    
    // Set up auth state change listener
    if (window.supabase && window.supabase.auth) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            handleAuthStateChange(event, session);
        });
    } else {
        console.error('Supabase auth not available');
    }
});

// Sign up function
async function signUp(email, password, name, farmName) {
    try {
        console.log('Starting signup for:', email);
        
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase is not initialized');
        }
        
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    farm_name: farmName || ''
                }
            }
        });
        
        if (error) {
            console.error('Signup error:', error);
            throw error;
        }
        
        console.log('Signup successful:', data);
        
        // Insert into users table
        if (data.user) {
            const { error: insertError } = await window.supabase
                .from('users')
                .insert([
                    { 
                        id: data.user.id,
                        email: email,
                        name: name,
                        farm_name: farmName || ''
                    }
                ]);
                
            if (insertError) {
                console.error('Error inserting user record:', insertError);
            } else {
                console.log('User record inserted successfully');
            }
        }
        
        return { success: true, message: 'Sign up successful! Please check your email to verify your account.' };
    } catch (error) {
        console.error('Signup failed:', error);
        return { success: false, message: error.message };
    }
}

// Sign in function
async function signIn(email, password) {
    try {
        console.log('Attempting sign in for:', email);
        
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase is not properly initialized');
        }
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Sign in error:', error);
            throw error;
        }
        
        console.log('Sign in successful:', data);
        
        if (data.session) {
            localStorage.setItem('supabaseSession', JSON.stringify(data.session));
            localStorage.setItem('userId', data.user.id);
            console.log('User ID stored:', data.user.id);
            
            // Dispatch custom event for dashboard
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { authenticated: true, user: data.user }
            }));
        }
        
        return { success: true, data: data };
    } catch (error) {
        console.error('Sign in failed:', error);
        return { success: false, message: error.message };
    }
}

// Sign out function
async function signOut() {
    try {
        console.log('Signing out...');
        
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase is not properly initialized');
        }
        
        const { error } = await window.supabase.auth.signOut();
        
        if (error) {
            console.error('Sign out error:', error);
            throw error;
        }
        
        localStorage.removeItem('supabaseSession');
        localStorage.removeItem('userId');
        console.log('Sign out successful');
        
        // Dispatch custom event for dashboard
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: false, user: null }
        }));
        
        return { success: true };
    } catch (error) {
        console.error('Sign out failed:', error);
        return { success: false, message: error.message };
    }
}

// Check if user is logged in
async function checkAuth() {
    try {
        console.log('Checking authentication status...');
        
        if (!window.supabase || !window.supabase.auth) {
            console.log('Supabase not available, user not authenticated');
            return { authenticated: false };
        }
        
        const storedSession = localStorage.getItem('supabaseSession');
        
        if (storedSession) {
            const session = JSON.parse(storedSession);
            window.supabase.auth.setSession(session);
            
            const { data, error } = await window.supabase.auth.getUser();
            
            if (error || !data.user) {
                console.log('Invalid session, removing it');
                localStorage.removeItem('supabaseSession');
                localStorage.removeItem('userId');
                return { authenticated: false };
            }
            
            // Store user ID if not already stored
            if (!localStorage.getItem('userId')) {
                localStorage.setItem('userId', data.user.id);
            }
            
            console.log('User is authenticated:', data.user);
            return { authenticated: true, user: data.user };
        }
        
        console.log('No session found');
        return { authenticated: false };
    } catch (error) {
        console.error('Auth check failed:', error);
        return { authenticated: false };
    }
}

// Get current user
async function getCurrentUser() {
    try {
        if (!window.supabase || !window.supabase.auth) {
            return null;
        }
        
        const { data, error } = await window.supabase.auth.getUser();
        
        if (error) {
            console.error('Get user error:', error);
            return null;
        }
        
        return data.user;
    } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
    }
}

// Get current user ID
function getCurrentUserId() {
    // Try to get from localStorage first
    let userId = localStorage.getItem('userId');
    
    // If not in localStorage, try to get from current session
    if (!userId && window.supabase && window.supabase.auth) {
        const { data } = window.supabase.auth.getSession();
        if (data.session) {
            userId = data.session.user.id;
            localStorage.setItem('userId', userId);
        }
    }
    
    console.log('Current user ID:', userId);
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
        console.log('Copy this UUID and replace YOUR_USER_ID in the ESP8266 code');
        return userId;
    } else {
        console.log('User not logged in. Please log in first.');
        return null;
    }
}

// Refresh session
async function refreshSession() {
    try {
        console.log('Refreshing session...');
        
        if (!window.supabase || !window.supabase.auth) {
            return { success: false, message: 'Supabase not available' };
        }
        
        const { data, error } = await window.supabase.auth.refreshSession();
        
        if (error) {
            console.error('Session refresh error:', error);
            return { success: false, message: error.message };
        }
        
        if (data.session) {
            localStorage.setItem('supabaseSession', JSON.stringify(data.session));
            localStorage.setItem('userId', data.session.user.id);
        }
        
        return { success: true, session: data.session };
    } catch (error) {
        console.error('Session refresh failed:', error);
        return { success: false, message: error.message };
    }
}

// Show notification function (renamed to avoid conflicts)
function showAuthNotification(title, message, type = 'info') {
    // Only show notifications when there's a proper notification toast element
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createAndShowNotification(title, message, type);
        });
    } else {
        createAndShowNotification(title, message, type);
    }
}

function createAndShowNotification(title, message, type) {
    let notificationToast = document.getElementById('notificationToast');
    
    if (!notificationToast) {
        // Don't create notification for configuration errors during load
        if (title === 'Configuration Error') return;
        
        notificationToast = document.createElement('div');
        notificationToast.className = 'notification-toast';
        notificationToast.id = 'notificationToast';
        notificationToast.setAttribute('role', 'alert');
        notificationToast.setAttribute('aria-live', 'polite');
        
        notificationToast.innerHTML = `
            <button class="notification-close" id="notificationClose" aria-label="Close notification">&times;</button>
            <div class="notification-title" id="notificationTitle">Notification</div>
            <div class="notification-message" id="notificationMessage">Message</div>
        `;
        
        document.body.appendChild(notificationToast);
        
        document.getElementById('notificationClose').addEventListener('click', () => {
            notificationToast.classList.remove('show');
        });
    }
    
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationMessage').textContent = message;
    
    notificationToast.classList.add('show');
    
    setTimeout(() => {
        notificationToast.classList.remove('show');
    }, 5000);
}

// Add this to your dashboard.js to display the user ID
document.addEventListener('DOMContentLoaded', function() {
    // Add a button to display user ID for ESP8266 configuration
    const settingsSection = document.getElementById('settings');
    if (settingsSection) {
        const userIdSection = document.createElement('div');
        userIdSection.className = 'form-group';
        userIdSection.innerHTML = `
            <label for="user-id-display" class="form-label">User ID for ESP8266</label>
            <div class="user-id-container">
                <input type="text" id="user-id-display" class="form-control" readonly value="${getCurrentUserId() || 'Not logged in'}">
                <button type="button" class="btn btn-secondary" id="copy-user-id">Copy</button>
                <button type="button" class="btn btn-info" id="show-user-id">Show in Console</button>
            </div>
            <small class="form-text">Use this ID in your ESP8266 code to connect to your account</small>
        `;
        
        // Find a good place to insert it (after farm name)
        const farmNameGroup = document.querySelector('label[for="farm-name"]')?.parentElement;
        if (farmNameGroup) {
            farmNameGroup.parentNode.insertBefore(userIdSection, farmNameGroup.nextSibling);
        } else {
            settingsSection.appendChild(userIdSection);
        }
        
        // Add event listeners
        document.getElementById('copy-user-id').addEventListener('click', function() {
            const userIdInput = document.getElementById('user-id-display');
            userIdInput.select();
            document.execCommand('copy');
            showAuthNotification('Copied', 'User ID copied to clipboard', 'success');
        });
        
        document.getElementById('show-user-id').addEventListener('click', function() {
            displayUserIdForESP();
            showAuthNotification('User ID', 'Check console for your user ID', 'info');
        });
    }
});

// Export functions globally
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;
window.getCurrentUserId = getCurrentUserId;
window.displayUserIdForESP = displayUserIdForESP;
window.refreshSession = refreshSession;
window.showAuthNotification = showAuthNotification;

console.log('[Auth] Auth module loaded and functions exported');