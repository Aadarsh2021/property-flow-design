
import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { partyLedgerAPI, mockData } from '../lib/api';
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
        const mockParties = mockData.getMockParties() as Party[];
        setParties(mockParties);
      }
    } catch (error) {
      const mockParties = mockData.getMockParties() as Party[];
      setParties(mockParties);
      toast({
        title: 'Warning',
        description: 'Using offline data. Some features may be limited.',
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
    party.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      setSelectedParties(filteredParties.map((party) => party.name));
    }
  };

  const handleMondayFinalClick = () => {
    if (selectedParties.length > 0) {
      setShowMondayFinalModal(true);
    } else {
      toast({
        title: 'Warning',
        description: 'Please select parties to update Monday Final status.',
        variant: 'destructive',
      });
    }
  };

  const handleMondayFinalConfirm = async () => {
    setActionLoading(true);
    try {
      const response = await partyLedgerAPI.updateMondayFinal(selectedParties);
      if (response.success) {
        setParties((prevParties) =>
          prevParties.map((party) =>
            selectedParties.includes(party.name)
              ? { ...party, mondayFinal: 'Yes' }
              : party
          )
        );
        setSelectedParties([]);
        setShowMondayFinalModal(false);
        toast({
          title: 'Success',
          description: 'Monday Final status updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to update Monday Final status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update Monday Final status',
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
      {/* Header Section */}
      <div className="flex items-center justify-between bg-gray-200 border-b border-gray-300 px-4 py-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-lg">Party A/C. Ledger</span>
          <input
            type="text"
            placeholder="Party Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ml-4 px-2 py-1 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ width: 200 }}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleMondayFinalClick}
            disabled={actionLoading || selectedParties.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm"
          >
            Monday Final
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
                <th className="border border-gray-300 px-2 py-1 text-left">Party Name</th>
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
                  <td colSpan={3} className="text-center py-8">Loading parties...</td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-500">No parties found</td>
                </tr>
              ) : (
                filteredParties.map((party) => (
                  <tr key={party.name} className="hover:bg-blue-50 cursor-pointer">
                    <td className="border border-gray-300 px-2 py-1 font-medium" onClick={() => navigate(`/account-ledger/${encodeURIComponent(party.name)}`)}>{party.name}</td>
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
                        checked={selectedParties.includes(party.name)}
                        onChange={(e) => handleCheckboxChange(party.name, e.target.checked)}
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
            <AlertDialogTitle>Monday Final Settlement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark selected parties as settled?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinalConfirm}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? 'Processing...' : 'Confirm Settlement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartyLedger;
