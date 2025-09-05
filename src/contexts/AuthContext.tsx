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

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
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
      setIsApproved(userWithId.isApproved || true); // Default to true if not set
      setRequiresApproval(userWithId.isApproved === false); // Only true if explicitly false
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userWithId));
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
      if (userData.isApproved === false) {
        try {
          // Check if API URL is available
          const apiUrl = import.meta.env.VITE_API_BASE_URL;
          if (!apiUrl) {
            console.warn('VITE_API_BASE_URL not configured, using cached data');
            return;
          }

          // Make API call to check current user status
          const response = await fetch(`${apiUrl}/authentication/profile`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });

          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('API returned non-JSON response, using cached data');
            return;
          }

          if (response.ok) {
            const profileData = await response.json();
            if (profileData.success && profileData.data) {
              const updatedUser = {
                ...userData,
                isApproved: profileData.data.isApproved || true,
                requiresApproval: profileData.data.isApproved === false
              };
              
              // Update localStorage with fresh data
              localStorage.setItem('user', JSON.stringify(updatedUser));
              
              // Update state
              setUser(updatedUser);
              setIsApproved(updatedUser.isApproved);
              setRequiresApproval(updatedUser.requiresApproval);
              return;
            }
          } else if (response.status === 401 || response.status === 403) {
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
      setIsApproved(userData.isApproved || true);
      setRequiresApproval(userData.isApproved === false);
      
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