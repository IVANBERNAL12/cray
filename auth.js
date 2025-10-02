// auth.js
// Wait for Supabase to be available
document.addEventListener('DOMContentLoaded', function() {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase not initialized. Check supabase-config.js');
        return;
    }
    
    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
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
});

// Sign up function
async function signUp(email, password, name, farmName) {
    try {
        console.log('Starting signup for:', email);
        
        const { data, error } = await supabase.auth.signUp({
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
            const { error: insertError } = await supabase
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
        
        const { data, error } = await supabase.auth.signInWithPassword({
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
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Sign out error:', error);
            throw error;
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
        
        const storedSession = localStorage.getItem('supabaseSession');
        
        if (storedSession) {
            const session = JSON.parse(storedSession);
            supabase.auth.setSession(session);
            
            const { data, error } = await supabase.auth.getUser();
            
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
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Get user error:', error);
            throw error;
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
        
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
            console.error('Session refresh error:', error);
            throw error;
        }
        
        if (data.session) {
            localStorage.setItem('supabaseSession', JSON.stringify(data.session));
        }
        
        return { success: true, session: data.session };
    } catch (error) {
        console.error('Session refresh failed:', error);
        return { success: false, message: error.message };
    }
}