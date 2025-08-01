
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

import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { useNavigate } from 'react-router-dom';
import { newPartyAPI } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { NewPartyData } from '../types';

const NewParty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NewPartyData>({
    srNo: '163',
    partyName: '',
    status: 'R',
    commiSystem: 'Take',
    balanceLimit: '',
    mCommission: 'No Commission',
    rate: '',
    selfLD: { M: '', S: '', A: '', T: '', C: '' },
    agentLD: { name: '', M: '', S: '', A: '', T: '', C: '' },
    thirdPartyLD: { name: '', M: '', S: '', A: '', T: '', C: '' },
    selfCommission: { M: '', S: '' },
    agentCommission: { M: '', S: '' },
    thirdPartyCommission: { M: '', S: '' }
  });

  // Get next SR number on component mount
  useEffect(() => {
    const getNextSrNo = async () => {
      try {
        const response = await newPartyAPI.getNextSrNo();
        if (response.success) {
          setFormData(prev => ({
            ...prev,
            srNo: response.data.nextSrNo
          }));
        }
      } catch (error) {
        console.error('Error fetching next SR number:', error);
        // Keep default SR number if API fails
      }
    };

    getNextSrNo();
  }, []);

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
    e.preventDefault();
    
    if (!formData.partyName.trim()) {
      toast({
        title: "Error",
        description: "Party name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await newPartyAPI.create(formData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Party created successfully",
        });
        navigate('/party-ledger');
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to create party",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating party:', error);
      toast({
        title: "Error",
        description: "Failed to create party. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header with Quick Actions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Party</h1>
              <p className="text-gray-600">Add a new party with complete details and commission structure</p>
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
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Balance Limit</label>
                    <input
                      type="text"
                      value={formData.balanceLimit}
                      onChange={(e) => handleInputChange('basic', 'balanceLimit', e.target.value)}
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      <option value="No Commission">No Commission</option>
                      <option value="Fixed Commission">Fixed Commission</option>
                      <option value="Percentage Commission">Percentage Commission</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Rate</label>
                    <input
                      type="text"
                      value={formData.rate}
                      onChange={(e) => handleInputChange('basic', 'rate', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Enter commission rate"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Self LD Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg mt-6">
              <div className="bg-yellow-100 px-4 py-3 border-b border-yellow-200 rounded-t-lg">
                <h3 className="text-sm font-semibold text-yellow-800 flex items-center">
                  <span className="w-5 h-5 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs mr-2">3</span>
                  Self LD
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {['M', 'S', 'A', 'T', 'C'].map((field) => (
                  <div key={field} className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                    <input
                      type="text"
                      value={formData.selfLD[field as keyof typeof formData.selfLD]}
                      onChange={(e) => handleInputChange('selfLD', field, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm mr-2"
                      placeholder={`Enter ${field} LD`}
                    />
                    <span className="text-red-500 text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent LD Section */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg mt-6">
              <div className="bg-purple-100 px-4 py-3 border-b border-purple-200 rounded-t-lg">
                <h3 className="text-sm font-semibold text-purple-800 flex items-center">
                  <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs mr-2">4</span>
                  Agent LD
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center">
                  <label className="w-8 text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.agentLD.name}
                    onChange={(e) => handleInputChange('agentLD', 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="Enter agent name"
                  />
                </div>
                {['M', 'S', 'A', 'T', 'C'].map((field) => (
                  <div key={field} className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                    <input
                      type="text"
                      value={formData.agentLD[field as keyof typeof formData.agentLD]}
                      onChange={(e) => handleInputChange('agentLD', field, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm mr-2"
                      placeholder={`Enter ${field} LD`}
                    />
                    <span className="text-red-500 text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ThirdParty LD Section */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg mt-6">
              <div className="bg-indigo-100 px-4 py-3 border-b border-indigo-200 rounded-t-lg">
                <h3 className="text-sm font-semibold text-indigo-800 flex items-center">
                  <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs mr-2">5</span>
                  ThirdParty LD
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center">
                  <label className="w-8 text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.thirdPartyLD.name}
                    onChange={(e) => handleInputChange('thirdPartyLD', 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Enter third party name"
                  />
                </div>
                {['M', 'S', 'A', 'T', 'C'].map((field) => (
                  <div key={field} className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                    <input
                      type="text"
                      value={formData.thirdPartyLD[field as keyof typeof formData.thirdPartyLD]}
                      onChange={(e) => handleInputChange('thirdPartyLD', field, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm mr-2"
                      placeholder={`Enter ${field} LD`}
                    />
                    <span className="text-red-500 text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Self Commission Section */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg mt-6">
              <div className="bg-teal-100 px-4 py-3 border-b border-teal-200 rounded-t-lg">
                <h3 className="text-sm font-semibold text-teal-800 flex items-center">
                  <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs mr-2">6</span>
                  Self Commission
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {['M', 'S'].map((field) => (
                  <div key={field} className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                    <input
                      type="text"
                      value={formData.selfCommission[field as keyof typeof formData.selfCommission]}
                      onChange={(e) => handleInputChange('selfCommission', field, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm mr-2"
                      placeholder={`Enter ${field} Commission`}
                    />
                    <span className="text-red-500 text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Commission Section */}
            <div className="bg-red-50 border border-red-200 rounded-lg mt-6">
              <div className="bg-red-100 px-4 py-3 border-b border-red-200 rounded-t-lg">
                <h3 className="text-sm font-semibold text-red-800 flex items-center">
                  <span className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs mr-2">7</span>
                  Agent Commission
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {['M', 'S'].map((field) => (
                  <div key={field} className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                    <input
                      type="text"
                      value={formData.agentCommission[field as keyof typeof formData.agentCommission]}
                      onChange={(e) => handleInputChange('agentCommission', field, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm mr-2"
                      placeholder={`Enter ${field} Commission`}
                    />
                    <span className="text-red-500 text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ThirdParty Commission Section */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg mt-6">
              <div className="bg-orange-100 px-4 py-3 border-b border-orange-200 rounded-t-lg">
                <h3 className="text-sm font-semibold text-orange-800 flex items-center">
                  <span className="w-5 h-5 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs mr-2">8</span>
                  ThirdParty Commission
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {['M', 'S'].map((field) => (
                  <div key={field} className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                    <input
                      type="text"
                      value={formData.thirdPartyCommission[field as keyof typeof formData.thirdPartyCommission]}
                      onChange={(e) => handleInputChange('thirdPartyCommission', field, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm mr-2"
                      placeholder={`Enter ${field} Commission`}
                    />
                    <span className="text-red-500 text-sm">%</span>
                  </div>
                ))}
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
                    Saving...
                  </>
                ) : (
                  'Save Party'
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
            <div>Ctrl+S: Save Party</div>
            <div>Ctrl+B: Back to Parties</div>
            <div>Esc: Exit</div>
            <div>Tab: Navigate Fields</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewParty;
