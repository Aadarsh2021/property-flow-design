import { useState, useEffect } from 'react';
import { userSettingsAPI } from '@/lib/api';

export const useCompanyName = () => {
  const [companyName, setCompanyName] = useState<string>('Company');
  const [loading, setLoading] = useState(true);

  const loadCompanyName = async () => {
    try {
      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        const settingsResponse = await userSettingsAPI.getSettings(user.id);
        if (settingsResponse.success && settingsResponse.data?.company_account) {
          setCompanyName(settingsResponse.data.company_account);
        }
      }
    } catch (error) {
      console.error('Error loading company name:', error);
      // Keep default company name
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyName = (newName: string) => {
    setCompanyName(newName);
  };

  useEffect(() => {
    loadCompanyName();
  }, []);

  return {
    companyName,
    loading,
    updateCompanyName,
    refreshCompanyName: loadCompanyName
  };
};
