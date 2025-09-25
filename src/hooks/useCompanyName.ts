import { useState, useEffect, useRef } from 'react';
import { userSettingsAPI } from '@/lib/api';

export const useCompanyName = (userId?: string) => {
  const [companyName, setCompanyName] = useState<string>('Company');
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  
  // Use API calls instead of direct Supabase hook
  const [settings, setSettings] = useState<any>(null);

  // Load settings via API
  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) return;
      
      try {
        const response = await userSettingsAPI.getSettings(userId);
        if (response.success) {
          setSettings(response.data);
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    loadSettings();
  }, [userId]);

  const loadCompanyName = async () => {
    try {
      if (userId) {
        // Check if user has changed
        if (lastUserIdRef.current !== userId) {
          // User changed, reloading company name
          lastUserIdRef.current = userId;
        }
        
        if (settings?.company_account) {
          setCompanyName(settings.company_account);
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

  // Load company name when settings change
  useEffect(() => {
    if (settings?.company_account) {
      setCompanyName(settings.company_account);
    } else {
      setCompanyName('Company');
    }
    setLoading(false);
  }, [settings]);

  return {
    companyName,
    loading,
    updateCompanyName,
    refreshCompanyName: loadCompanyName
  };
};
