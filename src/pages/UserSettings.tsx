
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

import React, { useState, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import TopNavigation from '../components/TopNavigation';
import { userSettingsAPI } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const UserSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    decimalFormat: 'FULL AMOUNT',
    companyAccount: 'AQC',
    password: '***',
    entryOrder: 'FIRST AMOUNT',
    ntPosition: 'BOTTOM',
    agentReport: 'THREE',
    color: 'Blue',
    isLocked: false
  });

  // Load user settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      // Using a default user ID - in real app, this would come from auth context
      const response = await userSettingsAPI.get('default-user');
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      // Keep default settings if API fails
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await userSettingsAPI.update('default-user', settings);
      if (response.success) {
        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
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
    }
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
                <label className="text-sm font-medium text-gray-700 w-32">Decimal Format</label>
                <div className="flex-1 ml-4">
                  <select 
                    value={settings.decimalFormat}
                    onChange={(e) => setSettings({...settings, decimalFormat: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-100 text-blue-900 font-medium"
                  >
                    <option>FULL AMOUNT</option>
                    <option>DECIMAL</option>
                    <option>CURRENCY</option>
                  </select>
                </div>
              </div>

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

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 w-32">Entry Order</label>
                <div className="flex-1 ml-4">
                  <select 
                    value={settings.entryOrder}
                    onChange={(e) => setSettings({...settings, entryOrder: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>FIRST AMOUNT</option>
                    <option>LAST AMOUNT</option>
                    <option>CUSTOM ORDER</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 w-32">NT Position</label>
                <div className="flex-1 ml-4">
                  <select 
                    value={settings.ntPosition}
                    onChange={(e) => setSettings({...settings, ntPosition: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>BOTTOM</option>
                    <option>TOP</option>
                    <option>MIDDLE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 w-32">Agent Report</label>
                <div className="flex-1 ml-4">
                  <select 
                    value={settings.agentReport}
                    onChange={(e) => setSettings({...settings, agentReport: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>THREE</option>
                    <option>FIVE</option>
                    <option>TEN</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 w-32">Color</label>
                <div className="flex-1 ml-4">
                  <select 
                    value={settings.color}
                    onChange={(e) => setSettings({...settings, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>Blue</option>
                    <option>Green</option>
                    <option>Red</option>
                    <option>Purple</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <input
                  type="checkbox"
                  id="lock"
                  checked={settings.isLocked}
                  onChange={(e) => setSettings({...settings, isLocked: e.target.checked})}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="lock" className="text-sm font-medium text-red-600 flex items-center">
                  <Lock className="w-4 h-4 mr-1" />
                  Lock
                </label>
              </div>
            </div>

            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
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
      </div>
    </div>
  );
};

export default UserSettings;
