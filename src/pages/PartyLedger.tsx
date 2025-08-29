
/**
 * Party Ledger Page
 * 
 * Displays a list of all parties with their Monday Final status
 * in the Property Flow Design application.
 * 
 * Features:
 * - Party list with search functionality
 * - Monday Final status tracking (automatically detected from ledger data)
 * - Party selection for ledger view
 * - Desktop application UI design
 * - Responsive table layout
 * - Navigation to individual ledgers
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { partyLedgerAPI } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { Party } from '../types';

interface PartyWithMondayFinalStatus extends Party {
  mondayFinalStatus: 'Yes' | 'No';
  isSettled: boolean;
}

const PartyLedger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<PartyWithMondayFinalStatus[]>([]);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Helper function to format party display name
  const formatPartyDisplayName = (party: PartyWithMondayFinalStatus) => {
    return party.name || party.party_name || (party as any).partyName || 'Unknown Party';
  };

  // Helper function to extract party name from display format
  const extractPartyNameFromDisplay = (displayName: string) => {
    return displayName;
  };

  // Helper function to find party by display name
  const findPartyByDisplayName = (displayName: string) => {
    return parties.find(party => (party.name || party.party_name || (party as any).partyName) === displayName);
  };

  // Check Monday Final status for a party by checking their ledger data
  const checkMondayFinalStatus = async (partyName: string): Promise<'Yes' | 'No'> => {
    try {
      const response = await partyLedgerAPI.getPartyLedger(partyName);
      
      if (response.success && response.data) {
        // response.data is an object with ledgerEntries and oldRecords properties
        // Type assertion to handle the actual API response structure
        const data = response.data as any;
        const ledgerEntries = data.ledgerEntries || [];
        const oldRecords = data.oldRecords || [];
        
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

  // Enhanced fetch parties with Monday Final status
  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      
      if (response.success) {
        const partiesData = response.data || [];
        
        // Check Monday Final status for each party
        const partiesWithStatus = await Promise.all(
          partiesData.map(async (party: Party, index: number) => {
            // Try multiple possible property names for party name
            const partyName = party.name || party.party_name || (party as any).partyName || '';
            
            if (!partyName) {
              return {
                ...party,
                mondayFinalStatus: 'No' as const,
                isSettled: false,
                mondayFinal: 'No' as const
              };
            }
            
            const mondayFinalStatus = await checkMondayFinalStatus(partyName);
            const isSettled = mondayFinalStatus === 'Yes';
            
            return {
              ...party,
              mondayFinalStatus,
              isSettled,
              // Override the static mondayFinal field with dynamic status
              mondayFinal: mondayFinalStatus as 'Yes' | 'No'
            };
          })
        );
        
        setParties(partiesWithStatus);
        
      } else {
        console.error('❌ API returned error:', response.message);
        toast({
          title: 'Error',
          description: response.message || 'Failed to fetch parties.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('💥 Exception occurred while fetching parties:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch parties.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, isAuthenticated, user]);

  // Filter parties based on search term (optimized with useMemo)
  const filteredParties = useMemo(() => {
    if (!searchTerm.trim()) {
      return parties;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return parties.filter(party => {
      const partyName = party.name || party.party_name || (party as any).partyName || '';
      
      // Check if party name contains search term
      return partyName.toLowerCase().includes(searchLower);
    });
  }, [parties, searchTerm]);

  // Handle checkbox change for individual party
  const handleCheckboxChange = (partyName: string, checked: boolean) => {
    if (checked) {
      setSelectedParties(prev => [...prev, partyName]);
    } else {
      setSelectedParties(prev => prev.filter(name => name !== partyName));
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    if (checked) {
      setSelectedParties(filteredParties.map(party => (party as any).partyName || party.name || party.party_name || ''));
    } else {
      setSelectedParties([]);
    }
  };

  // Handle Monday Final button click
  const handleMondayFinalClick = () => {
    if (selectedParties.length === 0) {
      toast({
        title: 'No Parties Selected',
        description: 'Please select at least one party for Monday Final settlement.',
        variant: 'destructive',
      });
      return;
    }
    
    // Filter only unsettled parties
    const unsettledParties = selectedParties.filter(partyName => {
      
      const party = parties.find(p => {
        const pName = p.name || p.party_name || (p as any).partyName || '';
        return pName === partyName;
      });
      
      return party && !party.isSettled;
    });
    
    if (unsettledParties.length === 0) {
      toast({
        title: 'All Selected Parties Already Settled',
        description: 'All selected parties have already been settled in Monday Final.',
        variant: 'default',
      });
      return;
    }
    
    setShowMondayFinalModal(true);
  };

  // Handle Monday Final confirmation
  const handleMondayFinalConfirm = async () => {
    setActionLoading(true);
    try {
      // Filter only unsettled parties
      const unsettledParties = selectedParties.filter(partyName => {
        const party = parties.find(p => {
          const pName = p.name || p.party_name || (p as any).partyName || '';
          return pName === partyName;
        });
        return party && !party.isSettled;
      });
      
      if (unsettledParties.length === 0) {
        toast({
          title: 'No Unsettled Parties',
          description: 'All selected parties are already settled.',
          variant: 'default',
        });
        setShowMondayFinalModal(false);
        return;
      }
      
      const response = await partyLedgerAPI.updateMondayFinal(unsettledParties);
      
      if (response.success) {
        // Update local state to reflect settlement IMMEDIATELY
        setParties(prevParties =>
          prevParties.map(party => {
            const partyName = party.name || party.party_name || '';
            if (unsettledParties.includes(partyName)) {
              return {
                ...party,
                mondayFinalStatus: 'Yes' as const,
                isSettled: true,
                mondayFinal: 'Yes' as const
              };
            }
            return party;
          })
        );
        
        setSelectedParties([]);
        setShowMondayFinalModal(false);
        
        toast({
          title: 'Success',
          description: `Monday Final settlement completed for ${unsettledParties.length} parties`,
        });
        
        // Refresh parties after a longer delay to ensure database update
        setTimeout(() => {
          fetchParties();
        }, 2000); // Increased delay to 2 seconds
        
        // Force immediate UI update for better user experience
        setTimeout(() => {
          setParties(prevParties => [...prevParties]); // Force re-render
        }, 500);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to process Monday Final settlement',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Monday Final error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process Monday Final settlement for unsettled parties',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExit = () => {
    navigate('/');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access Party Ledger.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
  }, [isAuthenticated, user, navigate, toast]);

  // Initial load - only once
  useEffect(() => {
    fetchParties();
  }, []); // Empty dependency array - only run once

  return (
    <div className="min-h-screen bg-gray-100">
      <TopNavigation />
          {/* Header Section */}
      <div className="flex items-center justify-between bg-gray-200 border-b border-gray-300 px-4 py-2">
                  <div className="flex items-center space-x-2">
                  <span className="font-semibold text-lg">Party A/C. Ledger</span>
                  <div className="relative ml-4">
                    <input
                      type="text"
                      placeholder="Search by Party Name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-2 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
                      style={{ width: 280 }}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {searchTerm && (
                    <span className="text-sm text-gray-600">
                      {filteredParties.length} of {parties.length} parties
                    </span>
                  )}
                </div>
        <div className="flex items-center space-x-2">
                <Button
                  onClick={handleMondayFinalClick}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm"
                >
                  {actionLoading ? 'Processing...' : 'Monday Final (Unsettled Parties)'}
                </Button>
                <Button
                  onClick={() => {
                    fetchParties();
                    toast({
                      title: "Refreshing",
                      description: "Updating Monday Final status for all parties...",
                    });
                  }}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-sm"
                >
                  {loading ? 'Refreshing...' : '🔄 Refresh Status'}
                </Button>
                <Button
                  onClick={handleExit}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1 text-sm"
                >
                  Exit
                </Button>
        </div>
              </div>
              
      {/* Table Section */}
      <div className="p-4">
        <div className="border border-gray-300 rounded overflow-auto" style={{ maxHeight: 600 }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
                              <tr>
                  <th className="border border-gray-300 px-2 py-1 text-center">Party Name</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">Company</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">Commission</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">Monday Final</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={selectedParties.length === filteredParties.length && filteredParties.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">Loading parties...</td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <div className="text-gray-500">
                      {searchTerm ? (
                        <>
                          <div className="font-medium mb-2">No parties found for "{searchTerm}"</div>
                          <div className="text-sm">
                            Try a different search term or clear the search to see all parties
                          </div>
                          <div className="text-xs mt-2 text-gray-400">
                            Total parties available: {parties.length}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium mb-2">No parties found</div>
                          <div className="text-sm">
                            There are no parties in the system yet
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParties.map((party, index) => (
                  <tr key={`${party.name || party.party_name || 'unknown'}-${index}`} className="hover:bg-blue-50 cursor-pointer">
                    <td className="border border-gray-300 px-2 py-1 font-medium" onClick={() => {
                      const partyName = party.name || party.party_name || (party as any).partyName || '';
                      if (partyName) {
                        navigate(`/account-ledger/${encodeURIComponent(partyName)}`);
                      }
                    }}>{formatPartyDisplayName(party)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center text-sm">
                      {party.name || party.party_name || (party as any).partyName || 'N/A'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {party.mCommission || 'No Commission'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      <span
                        className={`px-3 py-1 rounded font-semibold text-xs ${party.mondayFinalStatus === 'Yes' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}
                        title={party.mondayFinalStatus === 'Yes' ? 'Party is settled in Monday Final' : 'Party is not settled yet'}
                      >
                        {party.mondayFinalStatus}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedParties.includes((party as any).partyName || party.name || party.party_name || '')}
                        onChange={(e) => handleCheckboxChange((party as any).partyName || party.name || party.party_name || '', e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monday Final Confirmation Modal */}
      <AlertDialog open={showMondayFinalModal} onOpenChange={setShowMondayFinalModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monday Final Settlement - Unsettled Parties</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to process Monday Final settlement for unsettled parties only? 
              Parties that are already settled will be skipped. This will settle all unsettled transactions 
              for selected parties and move them to old records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinalConfirm}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? 'Processing Unsettled Parties...' : 'Confirm Settlement for Unsettled Parties'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartyLedger;
