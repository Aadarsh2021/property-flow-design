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
    // Creating Supabase user...
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

          // Supabase user created successfully
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
    // Authenticating with Supabase...
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

          // Supabase authentication successful
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

// Create Supabase session for Firebase authenticated user
export const createSupabaseSession = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    });

    if (error) {
      console.error('❌ Supabase session creation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Supabase session created for:', email);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Supabase session creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Supabase session'
    };
  }
};

// Image upload functions - Using backend API approach
export const uploadProfileImage = async (file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Convert file to base64 for backend upload
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    console.log('🔄 Uploading image via backend API:', {
      fileName,
      userId,
      fileSize: file.size
    });

    // Upload via backend API
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api'}/upload/profile-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        fileName,
        base64Data: base64,
        userId
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ Backend upload error:', result.message);
      return {
        success: false,
        error: result.message || 'Upload failed'
      };
    }

    console.log('✅ Upload successful:', result.url);

    return {
      success: true,
      url: result.url
    };
  } catch (error: any) {
    console.error('❌ Image upload error:', error);
    return {
      success: false,
      error: error.message || 'Image upload failed'
    };
  }
};

export const deleteProfileImage = async (imageUrl: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-2).join('/'); // Get 'profile-images/filename'

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath]);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Image delete error:', error);
    return {
      success: false,
      error: error.message || 'Image delete failed'
    };
  }
};

export default supabase;

