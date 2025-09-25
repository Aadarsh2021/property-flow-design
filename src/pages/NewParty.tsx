
/**
 * New Party Page
 * 
 * Handles party creation and management in the Property Flow Design application.
 * Provides form for adding new parties with validation and SR number generation.
 * 
 * Features:
 * - Party creation form with validation
 * - Automatic SR number generation
 * - Contact information management
 * - Status tracking (Active/Inactive)
 * - Search and filter functionality
 * - Responsive design
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import TopNavigation from '../components/TopNavigation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { NewPartyData } from '../types';
import { useCompanyName } from '../hooks/useCompanyName';
import { useAuth } from '../contexts/AuthContext';
import { isCompanyParty, isCommissionParty, getCompanyPartyRestrictionMessage, getCommissionPartyRestrictionMessage } from '../lib/companyPartyUtils';
import { newPartyAPI } from '@/lib/api';

const NewParty = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyName } = useCompanyName(user?.id);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPartyId, setEditPartyId] = useState<string | null>(null);
  
  // Use API calls instead of direct Supabase hooks
  const [parties, setParties] = useState<any[]>([]);

  const createParty = useCallback(async (partyData: any) => {
    try {
      const response = await newPartyAPI.create(partyData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create party');
    } catch (error) {
      console.error('Error creating party:', error);
      throw error;
    }
  }, []);

  const updateParty = useCallback(async (partyId: string, partyData: any) => {
    try {
      const response = await newPartyAPI.update(partyId, partyData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update party');
    } catch (error) {
      console.error('Error updating party:', error);
      throw error;
    }
  }, []);

  // Additional API functions for compatibility with old system
  const createPartyAPI = async (partyData: NewPartyData) => {
    try {
      const response = await newPartyAPI.create(partyData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create party');
    } catch (error) {
      console.error('Error creating party via API:', error);
      throw error;
    }
  };

  const updatePartyAPI = async (partyId: string, partyData: Partial<NewPartyData>) => {
    try {
      const response = await newPartyAPI.update(partyId, partyData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update party');
    } catch (error) {
      console.error('Error updating party via API:', error);
      throw error;
    }
  };

  const deletePartyAPI = async (partyId: string) => {
    try {
      const response = await newPartyAPI.delete(partyId);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to delete party');
    } catch (error) {
      console.error('Error deleting party via API:', error);
      throw error;
    }
  };

  const getNextSrNoAPI = async () => {
    try {
      const response = await newPartyAPI.getNextSrNo();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to get next SR number');
    } catch (error) {
      console.error('Error getting next SR number via API:', error);
      throw error;
    }
  };

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    console.log('🚀 PAGE: NewParty started loading...');
    console.log('📊 COMPONENT: NewParty component mounted');
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`✅ PAGE: NewParty loaded in ${duration.toFixed(2)}ms`);
      console.log('📊 COMPONENT: NewParty component unmounted');
    };
  }, []);
  const [formData, setFormData] = useState<NewPartyData>({
    srNo: '163',
    partyName: '',
    status: 'R',
    commiSystem: 'Take',
    balanceLimit: '',
    mCommission: 'No Commission',
    rate: '',
    mondayFinal: 'No', // Default to 'No' for new parties

  });

  // Check if we're in edit mode and load party data
  useEffect(() => {
    const edit = searchParams.get('edit');
    const id = searchParams.get('id');
    
    if (edit === 'true' && id) {
      setIsEditMode(true);
      setEditPartyId(id);
      loadPartyForEdit(id);
    } else {
      // Get next SR number for new party
      getNextSrNo();
      
      // Set default commission structure for new party (Take system)
      setFormData(prev => ({
        ...prev,
        mCommission: 'With Commission',
        rate: '3'
      }));
    }
  }, [searchParams]);

  const loadPartyForEdit = async (partyId: string) => {
    try {
      setLoading(true);
      
      // Find party in the parties array from Supabase hook
      const party = parties.find(p => p.id === partyId);
      
      if (party) {
        setFormData({
          srNo: party.sr_no || '',
          partyName: party.party_name || '',
          status: party.status || 'R',
          commiSystem: party.commi_system || 'Take',
          balanceLimit: party.balance_limit || '',
          mCommission: party.m_commission || 'No Commission',
          rate: party.rate || '',
          mondayFinal: party.monday_final || 'No', // Load existing monday_final
        });
        
        toast({
          title: "Edit Mode",
          description: `Editing party: ${party.party_name}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Party not found",
          variant: "destructive"
        });
        navigate('/party-ledger');
      }
    } catch (error) {
      console.error('Error loading party for edit:', error);
      toast({
        title: "Error",
        description: "Failed to load party for editing",
        variant: "destructive"
      });
      navigate('/party-ledger');
    } finally {
      setLoading(false);
    }
  };

  const getNextSrNo = async () => {
    try {
      // Calculate next SR number from existing parties
      const maxSrNo = parties.reduce((max, party) => {
        const srNo = parseInt(party.sr_no) || 0;
        return Math.max(max, srNo);
      }, 0);
      
      const nextSrNo = (maxSrNo + 1).toString();
      setFormData(prev => ({
        ...prev,
        srNo: nextSrNo
      }));
    } catch (error) {
      console.error('Error calculating next SR number:', error);
      // Keep default SR number if calculation fails
    }
  };

  // Handle Enter key press for form submission and Tab navigation
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!loading && formData.partyName.trim()) {
        handleSubmit(e as any);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab navigation between form fields
      const currentElement = e.target as HTMLElement;
      const formElements = Array.from(document.querySelectorAll('input, select, button[type="submit"]')) as HTMLElement[];
      const currentIndex = formElements.indexOf(currentElement);
      
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % formElements.length;
        formElements[nextIndex].focus();
      }
    }
  };

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        const form = document.querySelector('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
      
      // Ctrl/Cmd + B to go back
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        e.stopPropagation();
        navigate('/party-ledger');
      }
      
      // Escape to exit
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const handleInputChange = (section: string, field: string, value: string) => {
    if (section === 'basic') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Auto-set commission structure based on commission system
      if (field === 'commiSystem') {
        if (value === 'Take') {
          // Take System: Default "With Commission" + Rate "3"
          setFormData(prev => ({
            ...prev,
            [field]: value,
            mCommission: 'With Commission',
            rate: '3'
          }));
        } else if (value === 'Give') {
          // Give System: Default "With Commission" + Rate "1"
          setFormData(prev => ({
            ...prev,
            [field]: value,
            mCommission: 'With Commission',
            rate: '1'
          }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as unknown as Record<string, string>),
          [field]: value
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleSubmit started...');
    console.log('📊 JOURNEY: Step 4 - Creating New Party');
    console.log('📊 FORM: Starting party form submission...');
    
    e.preventDefault();
    
    if (!formData.partyName.trim()) {
      toast({
        title: "Error",
        description: "Party name is required",
        variant: "destructive"
      });
      return;
    }

        // Check if trying to create a company party
        if (isCompanyParty(formData.partyName.trim(), companyName)) {
          toast({
            title: "Company Party Restriction",
            description: getCompanyPartyRestrictionMessage(),
            variant: "destructive"
          });
          return;
        }

        // Check if trying to create a commission party
        if (isCommissionParty(formData.partyName.trim())) {
          toast({
            title: "Commission Party Restriction",
            description: getCommissionPartyRestrictionMessage(),
            variant: "destructive"
          });
          return;
        }

    setLoading(true);
    try {
      // Convert form data to Supabase format
      const partyData = {
        party_name: formData.partyName,
        sr_no: formData.srNo,
        status: formData.status,
        commi_system: formData.commiSystem,
        balance_limit: formData.balanceLimit,
        m_commission: formData.mCommission,
        rate: formData.rate,
        monday_final: formData.mondayFinal,
        address: '',
        phone: '',
        email: ''
      };

      if (isEditMode && editPartyId) {
        await updateParty(editPartyId, partyData);
        toast({
          title: "Success",
          description: "Party updated successfully",
        });
        navigate('/party-ledger');
      } else {
        await createParty(partyData);
        toast({
          title: "Success",
          description: "Party created successfully",
        });
        navigate('/party-ledger');
      }
    } catch (error: any) {
      console.error('Error creating/updating party:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create/update party. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`✅ ACTION: handleSubmit completed in ${duration.toFixed(2)}ms`);
      console.log('📊 FORM: Party form submission finished');
    }
  };

  const handleExit = () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleExit started...');
    console.log('🚪 NAVIGATION: Navigating to Dashboard...');
    
    navigate('/');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`✅ ACTION: handleExit completed in ${duration.toFixed(2)}ms`);
    console.log('🚪 NAVIGATION: Navigation completed');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header with Quick Actions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Edit Party' : 'Create New Party'}
              </h1>
              <p className="text-gray-600">
                {isEditMode 
                  ? 'Modify party details and commission structure' 
                  : 'Add a new party with complete details and commission structure'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/party-ledger');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium flex items-center"
              >
                <span className="mr-2">←</span>
                Back to Parties
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExit();
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
              >
                Exit
              </button>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Party Information</p>
                  <p className="text-xs text-gray-500">Basic details and commission structure</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                SR No: <span className="font-semibold text-blue-600">{formData.srNo}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">Party Details</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Party Information Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg">
                <div className="bg-blue-100 px-4 py-3 border-b border-blue-200 rounded-t-lg">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center">
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs mr-2">1</span>
                    Party Information
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Sr No</label>
                    <input
                      type="text"
                      value={formData.srNo}
                      onChange={(e) => handleInputChange('basic', 'srNo', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      readOnly
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Party Name</label>
                    <input
                      type="text"
                      value={formData.partyName}
                      onChange={(e) => handleInputChange('basic', 'partyName', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Enter party name"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('basic', 'status', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="R">R (Regular)</option>
                      <option value="A">A (Active)</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Commission</label>
                    <div className="flex-1 flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="commiSystem"
                          value="Take"
                          checked={formData.commiSystem === 'Take'}
                          onChange={(e) => handleInputChange('basic', 'commiSystem', e.target.value)}
                          className="mr-2 text-blue-600"
                        />
                        <span className="text-sm">Take (Lena)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="commiSystem"
                          value="Give"
                          checked={formData.commiSystem === 'Give'}
                          onChange={(e) => handleInputChange('basic', 'commiSystem', e.target.value)}
                          className="mr-2 text-blue-600"
                        />
                        <span className="text-sm">Give (Dena)</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Auto-default note */}
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    <strong>Auto-Default:</strong> Take system automatically sets "With Commission" + Rate "3", 
                    Give system sets "With Commission" + Rate "1". You can modify these values below.
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Balance Limit</label>
                    <input
                      type="text"
                      value={formData.balanceLimit}
                      onChange={(e) => handleInputChange('basic', 'balanceLimit', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Enter balance limit"
                    />
                  </div>
                </div>
              </div>

              {/* Commission Structure Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg">
                <div className="bg-green-100 px-4 py-3 border-b border-green-200 rounded-t-lg">
                  <h3 className="text-sm font-semibold text-green-800 flex items-center">
                    <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs mr-2">2</span>
                    Commission Structure
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Commission</label>
                    <select
                      value={formData.mCommission}
                      onChange={(e) => handleInputChange('basic', 'mCommission', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      <option value="No Commission">No Commission</option>
                      <option value="With Commission">With Commission</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Rate</label>
                    <input
                      type="text"
                      value={formData.rate}
                      onChange={(e) => handleInputChange('basic', 'rate', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Enter commission rate"
                    />
                  </div>
                </div>
              </div>
            </div>












            
            {/* Action Buttons - Centered at form end */}
            <div className="flex justify-center space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-2"></div>
                    {isEditMode ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  isEditMode ? 'Update Party' : 'Save Party'
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExit();
                }}
                className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
              >
                Exit
              </button>
            </div>
          </form>
        </div>
        
        {/* Keyboard Shortcuts Help */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm font-medium text-gray-800 mb-2">Keyboard Shortcuts:</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-600">
            <div>Ctrl+S: Save Party</div>
            <div>Ctrl+B: Back to Parties</div>
            <div>Enter: Submit Form</div>
            <div>Tab: Next Field</div>
            <div>Esc: Exit</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewParty;
