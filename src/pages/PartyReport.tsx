/**
 * Party Report Page
 * 
 * Displays a comprehensive report of all parties with their details,
 * status, commission information, and summary statistics.
 * 
 * Features:
 * - Complete party listing with details
 * - Status filtering (Active/Regular)
 * - Commission system overview
 * - Export functionality
 * - Search and filter options
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import TopNavigation from '@/components/TopNavigation';
import { newPartyAPI } from '@/lib/api';
import { Party } from '@/types';
import { Search, Filter, Download, Printer, RefreshCw, Eye, Edit, Trash2, Plus, X } from 'lucide-react';

const PartyReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  // Load parties on component mount
  useEffect(() => {
    loadParties();
  }, []);

  // Filter parties when search changes
  useEffect(() => {
    let filtered = parties;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(party => 
        party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party.srNo && party.srNo.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredParties(filtered);
  }, [parties, searchTerm]);

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await newPartyAPI.getAll();
      if (response.success) {
        const mappedParties = (response.data || []).map((party: any) => ({
          _id: party._id,
          name: party.partyName,
          srNo: party.srNo,
          status: party.status,
          balanceLimit: parseFloat(party.balanceLimit) || 0,
          mCommission: party.mCommission || 'No Commission',
          selfLD: parseFloat(party.selfLD) || 0,
          selfMCommi: parseFloat(party.selfMCommi) || 0,
          agentParty: party.agentParty || '',
          agentLD: parseFloat(party.agentLD) || 0,
          agentMCommi: parseFloat(party.agentMCommi) || 0,
          thirdParty: party.thirdParty || '',
          thirdPartyLD: parseFloat(party.thirdPartyLD) || 0,
          thirdPartyMCommi: parseFloat(party.thirdPartyMCommi) || 0
        }));
        setParties(mappedParties);
        console.log('📋 Loaded parties for report:', mappedParties);
      } else {
        console.error('❌ Failed to load parties:', response.message);
        toast({
          title: "Error",
          description: "Failed to load parties",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Load parties error:', error);
      toast({
        title: "Error",
        description: "Failed to load parties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleModify = async () => {
    if (selectedParty) {
      try {
        // Navigate to modify party page with party data
        navigate(`/new-party?edit=true&id=${selectedParty._id}`);
        toast({
          title: "Modify Party",
          description: `Opening ${selectedParty.name} for editing`,
        });
      } catch (error) {
        console.error('❌ Modify party error:', error);
        toast({
          title: "Error",
          description: "Failed to open party for modification",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Select Party",
        description: "Please select a party to modify",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (selectedParty) {
      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to delete party "${selectedParty.name}"?\n\nThis action cannot be undone.`
      );
      
      if (confirmed) {
        try {
          const response = await newPartyAPI.delete(selectedParty._id!);
          
          if (response.success) {
            toast({
              title: "Success",
              description: `Party "${selectedParty.name}" deleted successfully`,
            });
            
            // Remove from local state
            setParties(prev => prev.filter(p => p._id !== selectedParty._id));
            setSelectedParty(null);
            
            // Reload parties to refresh the list
            loadParties();
          } else {
            toast({
              title: "Error",
              description: response.message || "Failed to delete party",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('❌ Delete party error:', error);
          toast({
            title: "Error",
            description: "Failed to delete party",
            variant: "destructive"
          });
        }
      }
    } else {
      toast({
        title: "Select Party",
        description: "Please select a party to delete",
        variant: "destructive"
      });
    }
  };

  const handleNewParty = () => {
    navigate('/new-party');
  };

  const handleExit = () => {
    navigate('/');
  };

  const handleRowClick = (party: Party) => {
    setSelectedParty(party);
  };

  const formatNumber = (num: number) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0.0000';
    }
    return num.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Party Report</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">PartyName:</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search party name..."
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">0</label>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleModify}
                disabled={!selectedParty}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="w-4 h-4" />
                <span>Modify</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={!selectedParty}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={handleNewParty}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Party</span>
              </button>
              <button
                onClick={handleExit}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Party Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Id
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    PartyName
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Balance Limit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    M Commission Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Self LD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Self M Commi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Agent Party
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Agent LD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Agent M Commi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    ThirdParty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    ThirdParty LD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    ThirdParty M Commi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading parties...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center text-gray-500">
                      No parties found
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((party, index) => (
                    <tr 
                      key={party._id || index} 
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedParty?._id === party._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleRowClick(party)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {party.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(party.balanceLimit)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {party.mCommission}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(party.selfLD)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(party.selfMCommi)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {party.agentParty || ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(party.agentLD)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(party.agentMCommi)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {party.thirdParty || ''}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(party.thirdPartyLD)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(party.thirdPartyMCommi)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyReport; 