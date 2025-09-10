
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

import React, { useState, useEffect, useContext } from 'react';
import { ChevronDown, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import TopNavigation from '../components/TopNavigation';
import { userSettingsAPI } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { AuthContext } from '../contexts/AuthContext';
import { useCompanyName } from '../hooks/useCompanyName';

const UserSettings = () => {
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const { refreshCompanyName } = useCompanyName();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settings, setSettings] = useState({
    companyAccount: '',
    password: ''
  });

  // Load user settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      if (!user?.id) {
        console.error('No user ID available');
        return;
      }
      
      const response = await userSettingsAPI.getSettings(user.id);
      if (response.success) {
        // Map backend fields to frontend fields
        setSettings({
          companyAccount: response.data.company_account || '',
          password: response.data.password || ''
        });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      // Keep default settings if API fails
    }
  };

  const handleSaveClick = () => {
    // First verification step - show confirmation dialog
    setShowConfirmation(true);
    setVerificationStep(1);
    setConfirmPassword('');
  };

  const handleConfirmSettings = () => {
    // Second verification step - password confirmation
    setVerificationStep(2);
  };

  const handleFinalSave = async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleFinalSave started...');
    console.log('📊 JOURNEY: Step 3 - Company Setup in User Settings');
    console.log('📊 SETTINGS: Starting user settings save...');
    
    // Validate password confirmation
    if (settings.password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`❌ ACTION: handleFinalSave failed in ${duration.toFixed(2)}ms - Password mismatch`);
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
      
      // Clean settings data - only send required fields
      const cleanSettings = {
        company_account: settings.companyAccount,
        password: settings.password
      };
      
      const response = await userSettingsAPI.updateSettings(user.id, cleanSettings);
      if (response.success) {
        // Refresh company name globally after successful update
        await refreshCompanyName();
        
        // Dispatch event to refresh parties list (for company party creation)
        window.dispatchEvent(new CustomEvent('partiesRefreshed', { 
          detail: { reason: 'company_settings_updated', companyName: settings.companyAccount } 
        }));
        console.log('🔄 Parties refresh event dispatched after company settings update');
        
        toast({
          title: "Success",
          description: "Settings saved successfully! Company party created automatically.",
        });
        
        // Auto-close modal after successful save
        setShowConfirmation(false);
        setVerificationStep(1);
        setConfirmPassword('');
        
        // Auto-close the entire settings page and go to dashboard
        setTimeout(() => {
          window.history.back();
        }, 1500); // Wait 1.5 seconds for user to see success message
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to save settings",
          variant: "destructive"
        });
      }
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
    setVerificationStep(1);
    setConfirmPassword('');
  };

  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-md">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-lg font-semibold">User Settings</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 w-32">Company Account</label>
                <div className="flex-1 ml-4">
                  <input
                    type="text"
                    value={settings.companyAccount}
                    onChange={(e) => setSettings({...settings, companyAccount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 w-32">Password</label>
                <div className="flex-1 ml-4">
                  <input
                    type="password"
                    value={settings.password}
                    onChange={(e) => setSettings({...settings, password: e.target.value})}
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
                <span>{loading ? 'Saving...' : 'Save with Verification'}</span>
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
                  <span>Double Verification Required</span>
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                {verificationStep === 1 ? (
                  <>
                    <div className="flex items-center space-x-3 text-blue-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Step 1: Confirm Settings</span>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Company Account:</span>
                        <span className="text-sm font-medium">{settings.companyAccount || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Password:</span>
                        <span className="text-sm font-medium">{settings.password ? '••••••••' : 'Not set'}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Please review your settings above. Click "Confirm" to proceed to password verification.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-3 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Step 2: Password Verification</span>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {confirmPassword && settings.password !== confirmPassword && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>Passwords do not match</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Please re-enter your password to confirm the changes.
                    </div>
                  </>
                )}
                
                <div className="flex space-x-3 pt-4">
                  {verificationStep === 1 ? (
                    <button
                      onClick={handleConfirmSettings}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium flex-1"
                    >
                      Confirm Settings
                    </button>
                  ) : (
                    <button
                      onClick={handleFinalSave}
                      disabled={loading || settings.password !== confirmPassword}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex-1 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                  )}
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
