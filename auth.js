// auth.js
console.log('auth.js loaded');

// Wait for Supabase to be ready
document.addEventListener('supabaseReady', function() {
    console.log('Supabase is ready, setting up auth...');
    
    // Set up auth state change listener
    if (window.supabase && window.supabase.auth) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_OUT') {
                localStorage.removeItem('supabaseSession');
                console.log('User signed out');
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    localStorage.setItem('supabaseSession', JSON.stringify(session));
                    console.log('User signed in or token refreshed');
                }
            }
        });
    } else {
        console.error('Supabase auth not available');
    }
});

// Sign up function
async function signUp(email, password, name, farmName) {
    try {
        console.log('Starting signup for:', email);
        
        // Check if supabase is available
        if (!window.supabase) {
            throw new Error('Supabase is not initialized');
        }
        
        if (!window.supabase.auth) {
            throw new Error('Supabase auth is not available');
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
        
        if (showNotification) {
            showNotification('Logout', 'You have been successfully logged out', 'info');
        }
        
        localStorage.removeItem('supabaseSession');
        console.log('Sign out successful');
        
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
                return { authenticated: false };
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
        console.error('favicon.ico:1 Failed to load resource: the server responded with a.ico: 404 ()
    }
    
    return data.user;
} catch (error) {
        console.error('Failed to get current user:', error);
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
            localStorage.setItem('supabase.ico:1 Failed to load resource: the server responded with a status of 404 ()
    }
        
        if (data.session) {
            localStorage.setItem('supabaseSession', JSON.stringify(data.session));
        }
        
        return { success: true, session: data.session };
    } catch (error) {
        console.error('Session refresh failed:', error);
        return { success: false, message: disableEmailConfirmations: false
    }
}

// Disable email confirmations for testing
async function disableEmailConfirmations() {
    try {
        if (!window.supabase || !window.supabase.auth) {
            console.error('Supabase not available');
            return { success: false, message: 'Supabase not available' };
        }
        
        const { error } = await window.supabase.auth.updateUser({
            data: {
                email_confirm: false
            }
        });
        
        if (error) {
            console.error('Failed to disable email confirmations:', error);
            return { success: false, message: error.message };
        }
        
        console.log('Email confirmations disabled');
        return { success: true };
    } catch (error) {
        console.error('Failed to disable email confirmations:', error);
        return { success: false, message: error.message };
    }
}

// Call this function when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded');
    
    // Disable email confirmations for testing
    disableEmailConfirmations().then(result => {
        if (result.success) {
            console.log('Email confirmations disabled for testing');
        } else {
            console.error('Failed to disable email confirmations:', result.message);
        }
    });
    
    // Wait for Supabase to be ready before checking auth
    document.addEventListener('supabaseReady', async function() {
        console.log('Supabase ready, checking authentication...');
        
        // Check if user is already authenticated
        const authStatus = await checkAuth();
        
        if (authStatus.authenticated) {
            console.log('User already logged in, redirecting to dashboard');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Rest of your existing DOMContentLoaded code...
        // Create crawling crayfish, bubbles, etc.
    });
    
    // Your existing code continues here...
});