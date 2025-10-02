// auth.js
// Sign up function
async function signUp(email, password, name, farmName) {
    try {
        // Create user in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    farm_name: farmName
                }
            }
        });
        
        if (error) throw error;
        
        // Create user record in our custom users table
        if (data.user) {
            const { error: insertError } = await supabase
                .from('users')
                .insert([
                    { 
                        id: data.user.id,
                        email: email,
                        name: name,
                        farm_name: farmName
                    }
                ]);
                
            if (insertError) throw insertError;
        }
        
        return { success: true, message: 'Sign up successful! Please check your email to verify your account.' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Sign in function
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Store session in localStorage
        if (data.session) {
            localStorage.setItem('supabaseSession', JSON.stringify(data.session));
        }
        
        return { success: true, data: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Sign out function
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // Remove session from localStorage
        localStorage.removeItem('supabaseSession');
        
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}
// Add this to auth.js
// Refresh session
async function refreshSession() {
    try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) throw error;
        
        if (data.session) {
            localStorage.setItem('supabaseSession', JSON.stringify(data.session));
        }
        
        return { success: true, session: data.session };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        // User signed out, clear localStorage
        localStorage.removeItem('supabaseSession');
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // User signed in or token refreshed, update localStorage
        if (session) {
            localStorage.setItem('supabaseSession', JSON.stringify(session));
        }
    }
});
// Check if user is logged in
async function checkAuth() {
    try {
        // Try to get session from localStorage
        const storedSession = localStorage.getItem('supabaseSession');
        
        if (storedSession) {
            const session = JSON.parse(storedSession);
            
            // Set the session in Supabase client
            supabase.auth.setSession(session);
            
            // Verify the session is still valid
            const { data, error } = await supabase.auth.getUser();
            
            if (error || !data.user) {
                localStorage.removeItem('supabaseSession');
                return { authenticated: false };
            }
            
            return { authenticated: true, user: data.user };
        }
        
        return { authenticated: false };
    } catch (error) {
        return { authenticated: false };
    }
}

// Get current user
async function getCurrentUser() {
    try {
        const { data, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        return data.user;
    } catch (error) {
        return null;
    }
}