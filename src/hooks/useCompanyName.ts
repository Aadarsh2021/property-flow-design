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
          console.log('🔄 User changed, reloading company name...', {
            previousUserId: lastUserIdRef.current,
            currentUserId: user.id
          });
          lastUserIdRef.current = user.id;
        }
        
        const settingsResponse = await userSettingsAPI.getSettings(user.id);
        if (settingsResponse.success && settingsResponse.data?.company_account) {
          setCompanyName(settingsResponse.data.company_account);
          console.log('✅ Company name loaded:', settingsResponse.data.company_account);
        } else {
          // If no settings found, use default
          setCompanyName('Company');
          console.log('⚠️ No company settings found, using default');
        }
      } else {
        // No user logged in, reset to default
        setCompanyName('Company');
        lastUserIdRef.current = null;
        console.log('👤 No user logged in, using default company name');
      }
    } catch (error) {
      console.error('Error loading company name:', error);
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
        console.log('🔄 User storage changed, reloading company name...');
        loadCompanyName();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (same tab user changes)
    const handleUserChange = () => {
      console.log('🔄 User changed event received, reloading company name...');
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
