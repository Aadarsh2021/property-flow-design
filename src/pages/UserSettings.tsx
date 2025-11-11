
/**
 * User Settings Page
 * 
 * Manages user preferences and account settings in the Property Flow Design application.
 * Allows users to update their profile and application preferences.
 * 
 * Features:
 * - Profile information management
 * - Password change functionality
 * - Application preferences
 * - Theme and display settings
 * - Notification preferences
 * - Account security settings
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import TopNavigation from '../components/TopNavigation';
import type { UserSettings } from '../types';
import { useToast } from '../hooks/use-toast';
import { AuthContext } from '../contexts/AuthContext';
import { useCompanyName } from '../hooks/useCompanyName';

const UserSettings = () => {
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const { refreshCompanyName } = useCompanyName(user?.id);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Use direct Supabase hook for user settings
  // Use API calls instead of direct Supabase hooks
  const [supabaseSettings, setSupabaseSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const updateSupabaseSettings = useCallback(async (newSettings: UserSettings) => {
    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('User ID is required to update settings');
      }
      
      // Use the existing userSettingsAPI with correct method name and userId
      const { userSettingsAPI } = await import('@/lib/api');
      const response = await userSettingsAPI.updateSettings(user.id, newSettings);
      
      if (response.success) {
        setSupabaseSettings(newSettings);
        return response.data;
      }
      throw new Error(response.message || 'Failed to update settings');
    } catch (error) {
      console.error('Error updating settings:', error);
      setSettingsError(error instanceof Error ? error.message : 'Failed to update settings');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  const [settings, setSettings] = useState({
    companyName: ''
  });

  // Load user settings from Supabase
  useEffect(() => {
    if (supabaseSettings) {
      setSettings({
        companyName: supabaseSettings.company_account || ''
      });
    }
  }, [supabaseSettings]);

  const handleSaveClick = () => {
    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmSettings = () => {
    // Direct save without password confirmation
    handleFinalSave();
  };

  const handleFinalSave = async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleFinalSave started...');
    console.log('📊 JOURNEY: Step 3 - Company Setup in User Settings');
    console.log('📊 SETTINGS: Starting user settings save...');
    
    // Validate company name
    if (!settings.companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required. Please enter a company name.",
        variant: "destructive"
      });
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`❌ ACTION: handleFinalSave failed in ${duration.toFixed(2)}ms - Company name required`);
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User not authenticated. Please login again.",
          variant: "destructive"
        });
        return;
      }

      if (!supabaseSettings) {
        toast({
          title: "Error",
          description: "Unable to load current settings. Please try again in a moment.",
          variant: "destructive"
        });
        return;
      }
      
      // Clean settings data - only send required fields
      
      const updatedSettings: UserSettings = {
        ...supabaseSettings,
        companyName: settings.companyName,
        company_name: settings.companyName,
        company_account: settings.companyName
      };

      const updateResponse = await updateSupabaseSettings(updatedSettings);
      
      // Get the updated company name from API response (most reliable)
      const updatedCompanyName = updateResponse?.company_account || settings.companyName;
      console.log('✅ Update response received:', { updatedCompanyName, responseData: updateResponse });
      
      // Clear API cache for settings to force fresh data on next fetch
      const { clearCacheByPattern } = await import('@/lib/apiCache');
      clearCacheByPattern('settings');
      console.log('🗑️ Cleared settings cache after update');
      
      // Set flag in localStorage to indicate recent company name update
      // This helps dashboard detect recent update even if event listener isn't ready yet
      localStorage.setItem('companyNameUpdateTimestamp', Date.now().toString());
      localStorage.setItem('companyNameUpdateValue', updatedCompanyName);
      console.log('📝 Set company name update flag in localStorage:', updatedCompanyName);
      
      // Dispatch event immediately with the new company name from API response
      window.dispatchEvent(new CustomEvent('companyNameChanged', { 
        detail: { companyName: updatedCompanyName } 
      }));
      console.log('🔄 Company name change event dispatched:', updatedCompanyName);
      
      // Refresh company name from API after a delay to ensure database is updated
      // Use setTimeout to avoid race conditions with database updates and cache
      setTimeout(async () => {
        await refreshCompanyName();
      }, 2000); // 2 second delay to ensure database update is complete and cache is cleared
      
      // Dispatch event to refresh parties list (for company party creation)
      window.dispatchEvent(new CustomEvent('partiesRefreshed', { 
        detail: { reason: 'company_settings_updated', companyName: updatedCompanyName } 
      }));
      console.log('🔄 Parties refresh event dispatched after company settings update');
      
      toast({
        title: "Success",
        description: "Settings saved successfully! Company party created automatically.",
      });
      
      // Auto-close modal after successful save
      setShowConfirmation(false);
      
      // Auto-close the entire settings page and go to dashboard
      setTimeout(() => {
        window.history.back();
      }, 1500); // Wait 1.5 seconds for user to see success message
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`✅ ACTION: handleFinalSave completed in ${duration.toFixed(2)}ms`);
      console.log('📊 SETTINGS: User settings save finished');
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-md w-full">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-lg font-semibold">User Settings</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 w-32">Company Name</label>
                <div className="flex-1 ml-4">
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    placeholder="Enter your company name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={handleSaveClick}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <Shield className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Company Name'}</span>
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Double Verification Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Confirm Company Name</span>
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3 text-blue-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Confirm Company Name</span>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Company Name:</span>
                    <span className="text-sm font-medium">{settings.companyName || 'Not set'}</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  Please review your company name above. Click "Confirm" to save the changes.
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleConfirmSettings}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex-1 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Confirm & Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettings;
