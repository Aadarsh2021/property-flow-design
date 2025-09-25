/**
 * Authentication Context
 * 
 * Provides authentication state management for the Property Flow Design application.
 * Handles user login, logout, and authentication status across the application.
 * 
 * Features:
 * - User authentication state management
 * - Token storage and validation
 * - Automatic login persistence
 * - Logout functionality
 * - Authentication status checking
 * - User profile management
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import AuthService from '@/lib/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  needsInitialSetup: (user: User | null) => boolean;
  isApproved: boolean;
  requiresApproval: boolean;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Initialize auth state from localStorage and check for redirect results
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check for Google redirect result
        const { checkRedirectResult } = await import('@/lib/firebase');
        const redirectResult = await checkRedirectResult();
        
        if (redirectResult.success && redirectResult.user) {
          // User just completed Google login via redirect
          // We need to handle this in the login component
          console.log('Google redirect result found:', redirectResult.user);
          // Don't set loading to false yet, let the login component handle this
          return;
        }
        
        // Check localStorage for existing auth
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          // Quick token validation (check if not expired)
          try {
            const tokenParts = storedToken.split('.');
            if (tokenParts.length !== 3) {
              throw new Error('Invalid token format');
            }
            
            const tokenData = JSON.parse(atob(tokenParts[1]));
            const currentTime = Date.now() / 1000;
            
            if (tokenData.exp && tokenData.exp > currentTime) {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
            } else {
              // Token expired, clear storage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          } catch (tokenError) {
            // Invalid token format, clear storage
            console.warn('Invalid token format, clearing auth data:', tokenError);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    try {
      // Ensure user has an id field (map from _id if needed)
      const userWithId = {
        ...newUser,
        id: newUser.id || newUser._id || ''
      };
      
      setToken(newToken);
      setUser(userWithId);
      setIsApproved(userWithId.is_approved || true); // Use Supabase field name
      setRequiresApproval(userWithId.is_approved === false); // Only true if explicitly false
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userWithId));
      
      // Dispatch user change event for company name reload
      window.dispatchEvent(new CustomEvent('userChanged', { 
        detail: { userId: userWithId.id, email: userWithId.email } 
      }));
      console.log('🔄 User change event dispatched for company name reload');
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  // Check if user needs to complete initial setup
  const needsInitialSetup = (user: User | null): boolean => {
    if (!user) return false;
    
    // User needs setup if: no company account OR created very recently (within 5 minutes)
    const hasCompanyAccount = user.company_account && user.company_account.trim() !== '';
    const isRecentlyCreated = user.created_at && new Date(user.created_at) > new Date(Date.now() - 5 * 60 * 1000);
    
    return !hasCompanyAccount || isRecentlyCreated;
  };

  const logout = () => {
    try {
      setToken(null);
      setUser(null);
      setIsApproved(false);
      setRequiresApproval(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Dispatch user change event for company name reset
      window.dispatchEvent(new CustomEvent('userChanged', { 
        detail: { userId: null, email: null } 
      }));
      console.log('🔄 User logout event dispatched for company name reset');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  // Check current authentication status
  const checkAuthStatus = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken || !storedUser) {
        setUser(null);
        setToken(null);
        setIsApproved(false);
        setRequiresApproval(false);
        return;
      }

      // Parse stored user data
      const userData = JSON.parse(storedUser);
      
      // If user is not approved, try to fetch latest status from API
      if (userData.is_approved === false) {
        try {
          // Make API call to check current user status
          const { authAPI } = await import('@/lib/api');
          const response = await authAPI.getProfile();
          
          if (response.success && response.data) {
            const updatedUser = {
              ...userData,
              is_approved: response.data.is_approved || true,
              requiresApproval: response.data.is_approved === false
            };
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Update state
            setUser(updatedUser);
            setIsApproved(updatedUser.is_approved);
            setRequiresApproval(updatedUser.requiresApproval);
            return;
          } else {
            // User not found or unauthorized - likely disapproved
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
            setIsApproved(false);
            setRequiresApproval(false);
            return;
          }
        } catch (apiError) {
          console.warn('API call failed, using cached data:', apiError.message);
        }
      }
      
      // Update approval status from cached data
      setIsApproved(userData.is_approved || true);
      setRequiresApproval(userData.is_approved === false);
      
      // Update user state
      setUser(userData);
      setToken(storedToken);
      
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Clear corrupted data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      setIsApproved(false);
      setRequiresApproval(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    loading,
    needsInitialSetup,
    isApproved,
    requiresApproval,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 