import { useState, useEffect } from 'react';

interface AdminAuthState {
  isLoggedIn: boolean;
  loginTime: string | null;
  isLoading: boolean;
}

export const useAdminAuth = () => {
  const [adminState, setAdminState] = useState<AdminAuthState>({
    isLoggedIn: false,
    loginTime: null,
    isLoading: true
  });

  useEffect(() => {
    // Check if admin is logged in on mount
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    setAdminState({
      isLoggedIn: !!adminLoggedIn,
      loginTime,
      isLoading: false
    });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api';
      
      const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.data.token) {
        const now = new Date().toISOString();
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminLoginTime', now);
        localStorage.setItem('adminToken', data.data.token);
        
        setAdminState(prevState => ({
          ...prevState,
          isLoggedIn: true,
          loginTime: now,
          isLoading: false
        }));
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    localStorage.removeItem('adminToken');
    
    setAdminState({
      isLoggedIn: false,
      loginTime: null,
      isLoading: false
    });
  };

  const checkSession = () => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (adminLoggedIn && loginTime) {
      // Check if session is still valid (24 hours)
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Session expired
        logout();
        return false;
      }
      
      return true;
    }
    
    return false;
  };

  return {
    ...adminState,
    login,
    logout,
    checkSession
  };
};
