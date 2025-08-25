import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Email/Password Authentication functions
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    console.log('🔥 Creating Supabase user...');
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
    });

    if (error) {
      console.error('❌ Supabase signup error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Supabase user created successfully');
    return {
      success: true,
      user: data.user
    };
  } catch (error: any) {
    console.error('❌ Supabase signup error:', error);
    return {
      success: false,
      error: error.message || 'Registration failed'
    };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log('🔥 Authenticating with Supabase...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    });

    if (error) {
      console.error('❌ Supabase login error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Supabase authentication successful');
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error: any) {
    console.error('❌ Supabase login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed'
    };
  }
};

export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Supabase logout error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
    return { success: true };
  } catch (error: any) {
    console.error('❌ Supabase logout error:', error);
    return {
      success: false,
      error: error.message || 'Logout failed'
    };
  }
};

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};

export const isAuthenticated = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
};

// Password reset
export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Password reset failed'
    };
  }
};

// Update password
export const updatePassword = async (password: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Password update failed'
    };
  }
};

export default supabase;

