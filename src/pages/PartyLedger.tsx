
/**
 * Party Ledger Page
 * 
 * Displays a list of all parties with their Monday Final status
 * in the Property Flow Design application.
 * 
 * Features:
 * - Party list with search functionality
 * - Monday Final status tracking
 * - Party selection for ledger view
 * - Desktop application UI design
 * - Responsive table layout
 * - Navigation to individual ledgers
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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

const PartyLedger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Helper function to format party display name
  const formatPartyDisplayName = (party: Party) => {
    return party.party_name || party.name || 'Unknown Party';
  };

  // Helper function to extract party name from display format
  const extractPartyNameFromDisplay = (displayName: string) => {
    return displayName;
  };

  // Helper function to find party by display name
  const findPartyByDisplayName = (displayName: string) => {
    return parties.find(party => (party.party_name || party.name) === displayName);
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

  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        setParties(response.data || []);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to fetch parties.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch parties.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  const filteredParties = (parties || []).filter((party) =>
    formatPartyDisplayName(party).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckboxChange = (partyName: string, checked: boolean) => {
    if (checked) {
      setSelectedParties((prev) => [...prev, partyName]);
    } else {
      setSelectedParties((prev) => prev.filter((name) => name !== partyName));
    }
  };

  const handleSelectAll = () => {
    if (selectedParties.length === filteredParties.length) {
      setSelectedParties([]);
    } else {
      setSelectedParties(filteredParties.map((party) => party.party_name || party.name));
    }
  };

  const handleMondayFinalClick = () => {
    // Allow Monday Final for all parties without selection
    setShowMondayFinalModal(true);
  };

  const handleMondayFinalConfirm = async () => {
    setActionLoading(true);
    try {
      // Only process parties that haven't been settled yet
      const unsettledParties = parties.filter(party => party.mondayFinal !== 'Yes');
      const unsettledPartyNames = unsettledParties.map(party => party.party_name || party.name);
      
      if (unsettledParties.length === 0) {
        toast({
          title: 'Info',
          description: 'All parties have already been settled for Monday Final',
        });
        setShowMondayFinalModal(false);
        return;
      }
      
      const response = await partyLedgerAPI.updateMondayFinal(unsettledPartyNames);
      
      if (response.success) {
        // Update only unsettled parties to show Monday Final as 'Yes'
        setParties((prevParties) =>
          prevParties.map((party) => 
            unsettledPartyNames.includes(party.party_name || party.name)
              ? { ...party, mondayFinal: 'Yes' }
              : party
          )
        );
        
        setSelectedParties([]);
        setShowMondayFinalModal(false);
        
        toast({
          title: 'Success',
          description: `Monday Final settlement completed for ${unsettledParties.length} parties`,
        });
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

  return (
    <div className="min-h-screen bg-gray-100">
      <TopNavigation />
          {/* Header Section */}
      <div className="flex items-center justify-between bg-gray-200 border-b border-gray-300 px-4 py-2">
                  <div className="flex items-center space-x-2">
          <span className="font-semibold text-lg">Party A/C. Ledger</span>
                <input
                  type="text"
                  placeholder="Search by Party Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ml-4 px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ width: 250 }}
                />
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
                  <td colSpan={5} className="text-center py-8 text-gray-500">No parties found</td>
                </tr>
              ) : (
                filteredParties.map((party) => (
                  <tr key={party.party_name || party.name} className="hover:bg-blue-50 cursor-pointer">
                    <td className="border border-gray-300 px-2 py-1 font-medium" onClick={() => navigate(`/account-ledger/${encodeURIComponent(party.party_name || party.name)}`)}>{formatPartyDisplayName(party)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center text-sm">
                      {party.companyName || party.party_name || party.name || 'N/A'}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {party.mCommission || 'No Commission'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      <span
                        className={`px-3 py-1 rounded font-semibold text-xs ${party.mondayFinal === 'Yes' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}
                      >
                        {party.mondayFinal}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedParties.includes(party.party_name || party.name)}
                        onChange={(e) => handleCheckboxChange(party.party_name || party.name, e.target.checked)}
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
