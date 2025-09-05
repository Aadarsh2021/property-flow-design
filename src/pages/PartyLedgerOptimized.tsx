/**
 * Optimized Party Ledger Page
 * 
 * Uses React Query for efficient data fetching and caching
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import React, { useState, useMemo } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useParties, usePartyBalance, useRefreshParties } from '@/hooks/useParties';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { Party } from '../types';
import { Search, Plus, RefreshCw, Eye, Filter, Download, Printer, Loader2 } from 'lucide-react';

interface PartyWithMondayFinalStatus extends Party {
  mondayFinalStatus: 'Yes' | 'No';
  isSettled: boolean;
  balance?: number;
  creditTotal?: number;
  debitTotal?: number;
}

// Loading skeleton component
const PartyRowSkeleton = () => (
  <TableRow>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></TableCell>
    <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></TableCell>
  </TableRow>
);

const PartyLedgerOptimized = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Use React Query hooks for data fetching
  const { 
    data: partiesData = [], 
    isLoading: partiesLoading, 
    error: partiesError,
    refetch: refetchParties 
  } = useParties();

  const refreshParties = useRefreshParties();

  // Transform parties data with balance information
  const parties = useMemo(() => {
    return partiesData.map((party: any) => ({
      _id: party.id,
      name: party.partyName || party.name,
      srNo: party.srNo,
      status: party.status,
      balanceLimit: parseFloat(party.balanceLimit) || 0,
      mCommission: party.mCommission || 'No Commission',
      commiSystem: party.commiSystem,
      rate: party.rate,
      mondayFinalStatus: 'No' as const, // Will be updated by balance hook
      isSettled: false,
      balance: 0,
      creditTotal: 0,
      debitTotal: 0
    }));
  }, [partiesData]);

  // Filter parties based on search term
  const filteredParties = useMemo(() => {
    if (!searchTerm) return parties;
    
    return parties.filter(party => 
      party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.srNo && party.srNo.toString().includes(searchTerm))
    );
  }, [parties, searchTerm]);

  // Handle party selection
  const handlePartySelect = (partyId: string, checked: boolean) => {
    setSelectedParties(prev => 
      checked 
        ? [...prev, partyId]
        : prev.filter(id => id !== partyId)
    );
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParties(filteredParties.map(party => party._id));
    } else {
      setSelectedParties([]);
    }
  };

  // Handle view party ledger
  const handleViewLedger = (partyName: string) => {
    navigate(`/account-ledger/${encodeURIComponent(partyName)}`);
  };

  // Handle refresh
  const handleRefresh = () => {
    refreshParties();
    toast({
      title: "Refreshing...",
      description: "Party data is being refreshed",
    });
  };

  // Handle Monday Final action
  const handleMondayFinalAction = async () => {
    if (selectedParties.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one party",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    try {
      // Implementation for Monday Final action
      toast({
        title: "Monday Final",
        description: `Processing ${selectedParties.length} parties...`,
      });
      
      // Reset selection
      setSelectedParties([]);
      setShowMondayFinalModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process Monday Final action",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (partiesError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Parties</h2>
            <p className="text-gray-600 mb-4">Failed to load party data</p>
            <Button onClick={() => refetchParties()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Party Ledger</h1>
          <p className="text-gray-600">Manage and view all parties with their status and balances</p>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search parties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={partiesLoading}
              >
                {partiesLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
              
              <Button
                onClick={() => setShowMondayFinalModal(true)}
                disabled={selectedParties.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Filter className="w-4 h-4 mr-2" />
                Monday Final ({selectedParties.length})
              </Button>
              
              <Button
                onClick={() => navigate('/new-party')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Party
              </Button>
            </div>
          </div>
        </div>

        {/* Parties Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedParties.length === filteredParties.length && filteredParties.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Sr. No</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance Limit</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead>Monday Final</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partiesLoading ? (
                  // Show skeleton loading
                  Array.from({ length: 5 }).map((_, index) => (
                    <PartyRowSkeleton key={index} />
                  ))
                ) : filteredParties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No parties found matching your search' : 'No parties available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParties.map((party, index) => (
                    <TableRow key={party._id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedParties.includes(party._id)}
                          onCheckedChange={(checked) => handlePartySelect(party._id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{party.srNo || index + 1}</TableCell>
                      <TableCell className="font-medium">{party.name}</TableCell>
                      <TableCell>
                        <Badge variant={party.status === 'Active' ? 'default' : 'secondary'}>
                          {party.status}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{party.balanceLimit.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          (party.balance || 0) > 0 
                            ? 'bg-green-100 text-green-800' 
                            : (party.balance || 0) < 0 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          ₹{(party.balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={party.mondayFinalStatus === 'Yes' ? 'destructive' : 'secondary'}>
                          {party.mondayFinalStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLedger(party.name)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Total Parties</h3>
            <p className="text-2xl font-bold text-gray-900">{parties.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Filtered Results</h3>
            <p className="text-2xl font-bold text-gray-900">{filteredParties.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500">Selected</h3>
            <p className="text-2xl font-bold text-gray-900">{selectedParties.length}</p>
          </div>
        </div>
      </div>

      {/* Monday Final Modal */}
      <AlertDialog open={showMondayFinalModal} onOpenChange={setShowMondayFinalModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monday Final Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to perform Monday Final action on {selectedParties.length} selected parties?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinalAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartyLedgerOptimized;
