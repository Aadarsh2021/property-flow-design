import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, onAuthStateChange } from '@/lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setAuthState({
        user,
        loading: false,
        error: null
      });
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Login failed' 
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await signInWithEmail(email, password);
      if (!result.success) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Login failed' 
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await signUpWithEmail(email, password);
      if (!result.success) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Registration failed' 
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await signOutUser();
      if (!result.success) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: result.error || 'Logout failed' 
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    clearError,
    isAuthenticated: !!authState.user
  };
};
