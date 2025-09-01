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
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userWithId));
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  const logout = () => {
    try {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 