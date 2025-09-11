import { useState, useEffect, useRef } from 'react';
import { userSettingsAPI } from '@/lib/api';

export const useCompanyName = () => {
  const [companyName, setCompanyName] = useState<string>('Company');
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  const loadCompanyName = async () => {
    try {
      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (user.id) {
        // Check if user has changed
        if (lastUserIdRef.current !== user.id) {
          // User changed, reloading company name
          lastUserIdRef.current = user.id;
        }
        
        const settingsResponse = await userSettingsAPI.getSettings(user.id);
        if (settingsResponse.success && settingsResponse.data?.company_account) {
          setCompanyName(settingsResponse.data.company_account);
          // Company name loaded
        } else {
          // If no settings found, use default
          setCompanyName('Company');
          // No company settings found, using default
        }
      } else {
        // No user logged in, reset to default
        setCompanyName('Company');
        lastUserIdRef.current = null;
        // No user logged in, using default company name
      }
    } catch (error) {
      // Error loading company name
      // Keep default company name
      setCompanyName('Company');
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyName = (newName: string) => {
    setCompanyName(newName);
  };

  // Load company name on mount and when user changes
  useEffect(() => {
    loadCompanyName();
    
    // Listen for storage changes (user login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        // User storage changed, reloading company name
        loadCompanyName();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (same tab user changes)
    const handleUserChange = () => {
      // User changed event received, reloading company name
      loadCompanyName();
    };
    
    window.addEventListener('userChanged', handleUserChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userChanged', handleUserChange);
    };
  }, []);

  return {
    companyName,
    loading,
    updateCompanyName,
    refreshCompanyName: loadCompanyName
  };
};
