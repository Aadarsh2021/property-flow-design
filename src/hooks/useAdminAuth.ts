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

  const login = (username: string, password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Simulate API call
      setTimeout(() => {
        if (username === 'admin' && password === 'admin') {
          const now = new Date().toISOString();
          localStorage.setItem('adminLoggedIn', 'true');
          localStorage.setItem('adminLoginTime', now);
          
          setAdminState(prevState => ({
            ...prevState,
            isLoggedIn: true,
            loginTime: now,
            isLoading: false
          }));
          
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    });
  };

  const logout = () => {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminLoginTime');
    
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
