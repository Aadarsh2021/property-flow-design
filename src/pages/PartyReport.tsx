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
import { newPartyAPI, partyLedgerAPI } from '@/lib/api';
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
        (party.srNo && party.srNo.toString().toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredParties(filtered);
  }, [parties, searchTerm]);

  // Function to check Monday Final status dynamically
  const checkMondayFinalStatus = async (partyName: string): Promise<'Yes' | 'No'> => {
    try {
      const response = await partyLedgerAPI.getPartyLedger(partyName);
      
      if (response.success && response.data) {
        // response.data is an object with ledgerEntries and oldRecords properties
        const ledgerEntries = response.data.ledgerEntries || [];
        const oldRecords = response.data.oldRecords || [];
        
        // Check both arrays for Monday Final Settlement
        const hasMondayFinal = [...ledgerEntries, ...oldRecords].some((entry: any) => {
          const hasSettlement = entry.remarks?.includes('Monday Final Settlement');
          const partyMatch = entry.partyName === partyName || entry.party_name === partyName;
          
          return hasSettlement && partyMatch;
        });
        
        return hasMondayFinal ? 'Yes' : 'No';
      }
      
      return 'No';
    } catch (error) {
      console.error(`Error checking Monday Final status for ${partyName}:`, error);
      return 'No';
    }
  };

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        const partiesData = response.data || [];
        
        // Check Monday Final status for each party dynamically
        const mappedParties = await Promise.all(
          partiesData.map(async (party: any) => {
            const mondayFinalStatus = await checkMondayFinalStatus(party.partyName);
            
            return {
              _id: party.id,
              name: party.partyName,
              srNo: party.srNo,
              status: party.status,
              balanceLimit: parseFloat(party.balanceLimit) || 0,
              mCommission: party.mCommission || 'No Commission',
              commiSystem: party.commiSystem,
              rate: party.rate,
              mondayFinal: mondayFinalStatus, // Dynamic status instead of static field
            };
          })
        );
        
        setParties(mappedParties);
      } else {
        console.error('Failed to load parties:', response.message);
        toast({
          title: "Error",
          description: "Failed to load parties",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Load parties error:', error);
      toast({
        title: "Error",
        description: "Failed to load parties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Event-based Monday Final status updates
  useEffect(() => {
    // Refresh Monday Final status when page gains focus
    const handleFocus = () => {
      // Only refresh if not currently loading
      if (!loading) {
        loadParties();
      }
    };

    // Refresh when returning from other pages
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        loadParties();
      }
    };

    // Listen for page focus and visibility changes
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup listeners
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadParties, loading]);

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
        console.error('Modify party error:', error);
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
        `Are you sure you want to delete party "${selectedParty.name}"?\n\nThis action cannot be undone and will permanently delete the party from the database.`
      );
      
      if (confirmed) {
        try {
          console.log('🗑️ Deleting party:', selectedParty);
          const response = await newPartyAPI.delete(selectedParty._id!);
          console.log('🗑️ Delete response:', response);
          
          if (response.success) {
            toast({
              title: "✅ Success",
              description: `Party "${selectedParty.name}" deleted permanently from database`,
            });
            
            // Remove from local state immediately
            setParties(prev => prev.filter(p => p._id !== selectedParty._id));
            setFilteredParties(prev => prev.filter(p => p._id !== selectedParty._id));
            setSelectedParty(null);
            
            // Reload parties to refresh the list
            setTimeout(() => {
              loadParties();
            }, 1000);
          } else {
            console.error('❌ Delete failed:', response);
            toast({
              title: "❌ Error",
              description: response.message || "Failed to delete party",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('❌ Delete party error:', error);
          toast({
            title: "❌ Error",
            description: "Failed to delete party. Please try again.",
            variant: "destructive"
          });
        }
      }
    } else {
      toast({
        title: "⚠️ Select Party",
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
                onClick={() => {
                  loadParties();
                  toast({
                    title: "Refreshing",
                    description: "Updating Monday Final status for all parties...",
                  });
                }}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Refreshing...' : '🔄 Refresh Status'}</span>
              </button>
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
                    Commission System
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Monday Final
                  </th>

                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading parties...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatNumber(Number(party.balanceLimit) || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {party.mCommission}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {party.commiSystem || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {party.rate || '0'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          party.mondayFinal === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {party.mondayFinal || 'No'}
                        </span>
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