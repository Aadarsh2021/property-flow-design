import { useState, useEffect, useRef, useCallback } from 'react';
import { userSettingsAPI } from '@/lib/api';

export const useCompanyName = (userId?: string) => {
  const [companyName, setCompanyName] = useState<string>('Company');
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const lastEventTimeRef = useRef<number>(0); // Track when event was last received
  
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

  const loadCompanyName = useCallback(async (force = false) => {
    try {
      if (userId) {
        // Check if user has changed
        if (lastUserIdRef.current !== userId) {
          // User changed, reloading company name
          lastUserIdRef.current = userId;
        }
        
        // Check if event was received recently (within last 2 seconds)
        const timeSinceEvent = Date.now() - lastEventTimeRef.current;
        const recentEvent = timeSinceEvent < 2000;
        
        // Always fetch fresh data from API instead of using stale settings state
        const response = await userSettingsAPI.getSettings(userId);
        if (response.success && response.data?.company_account) {
          const freshCompanyName = response.data.company_account;
          // Use setState with function to access current value
          setCompanyName(currentName => {
            // Only update if force is true, or if no recent event, or if current is default
            if (force || !recentEvent || currentName === 'Company') {
              console.log('✅ Company name refreshed from API:', freshCompanyName);
              return freshCompanyName;
            } else {
              console.log('⏭️ Skipping API refresh - recent event was received, keeping event value:', currentName);
              return currentName; // Keep current value
            }
          });
          // Always update settings state for consistency
          setSettings(response.data);
        } else {
          // If no settings found, use default
          setCompanyName(currentName => {
            if (force || !recentEvent || currentName === 'Company') {
              console.log('⚠️ No company settings found, using default');
              return 'Company';
            }
            return currentName; // Keep current value
          });
        }
      } else {
        // No user logged in, reset to default
        setCompanyName('Company');
        lastUserIdRef.current = null;
        // No user logged in, using default company name
      }
    } catch (error) {
      console.error('Error loading company name:', error);
      // Error loading company name - keep current name (don't reset)
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  // Listen for company name change events from other components
  useEffect(() => {
    const handleCompanyNameChange = (event: CustomEvent) => {
      const newCompanyName = event.detail?.companyName;
      if (newCompanyName && userId) {
        // Track event time to prevent overwriting with stale API data
        lastEventTimeRef.current = Date.now();
        
        // Clear API cache for settings to ensure fresh data
        import('@/lib/apiCache').then(({ clearCacheByPattern }) => {
          clearCacheByPattern('settings');
          console.log('🗑️ Cleared settings cache on event');
        });
        
        // Immediately update from event (instant UI update)
        setCompanyName(newCompanyName);
        // Also update settings state to keep it in sync
        setSettings(prev => ({ ...prev, company_account: newCompanyName }));
        console.log('🔄 Company name updated via event:', newCompanyName);
        
        // Refresh from API after a delay to verify (but event value takes priority)
        setTimeout(() => {
          loadCompanyName(true); // Force refresh to get latest from database
        }, 2000); // 2 second delay to ensure database update is complete and cache is cleared
      }
    };

    window.addEventListener('companyNameChanged', handleCompanyNameChange as EventListener);
    
    return () => {
      window.removeEventListener('companyNameChanged', handleCompanyNameChange as EventListener);
    };
  }, [userId, loadCompanyName]);

  return {
    companyName,
    loading,
    updateCompanyName,
    refreshCompanyName: loadCompanyName
  };
};
