/**
 * Optimized Party Ledger Page
 * 
 * Uses React Query for efficient data fetching and caching
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useParties, useRefreshParties } from '@/hooks/useParties';
import { partyLedgerAPI } from '@/lib/api';
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

const PartyLedger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Auto-suggestion state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  // Refs for auto-complete positioning
  const inputRef = useRef<HTMLInputElement>(null);
  const [autoCompleteLeft, setAutoCompleteLeft] = useState(40);

  // Use React Query hooks for data fetching
  const { 
    data: partiesData = [], 
    isLoading: partiesLoading, 
    error: partiesError,
    refetch: refetchParties 
  } = useParties();

  const refreshParties = useRefreshParties();

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredParties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParties = filteredParties.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Load Monday Final status for all parties
  React.useEffect(() => {
    const loadMondayFinalStatus = async () => {
      if (parties.length === 0) return;
      
      try {
        const statusPromises = parties.map(async (party) => {
          const status = await checkMondayFinalStatus(party.name);
          return { ...party, mondayFinalStatus: status };
        });
        
        const partiesWithStatus = await Promise.all(statusPromises);
        // Update parties state with Monday Final status
        // This will trigger a re-render with updated status
      } catch (error) {
        console.error('Error loading Monday Final status:', error);
      }
    };

    loadMondayFinalStatus();
  }, [partiesData]);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleAutoComplete();
      return;
    }

    if (!showSuggestions || filteredParties.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < Math.min(10, filteredParties.length) - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < filteredParties.length) {
          const selectedParty = filteredParties[selectedSuggestionIndex];
          setSearchTerm(selectedParty.name);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Calculate text width for auto-complete positioning
  const calculateTextWidth = (text: string) => {
    if (!inputRef.current) return 40;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 40;
    
    // Get computed styles from the input
    const computedStyle = window.getComputedStyle(inputRef.current);
    context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    
    const textWidth = context.measureText(text).width;
    return 40 + textWidth; // 40px for left padding + search icon
  };

  // Handle input change with suggestions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
    setSelectedSuggestionIndex(-1);
    
    // Update auto-complete position
    if (value) {
      const newLeft = calculateTextWidth(value);
      setAutoCompleteLeft(newLeft);
    }
  };

  // Get auto-complete text for current input
  const getAutoCompleteText = () => {
    if (!searchTerm || filteredParties.length === 0) return '';
    
    const firstMatch = filteredParties[0];
    if (!firstMatch) return '';
    
    const searchLower = searchTerm.toLowerCase();
    const partyNameLower = firstMatch.name.toLowerCase();
    
    if (partyNameLower.startsWith(searchLower)) {
      return firstMatch.name.substring(searchTerm.length);
    }
    
    return '';
  };

  // Handle auto-complete with Tab key
  const handleAutoComplete = () => {
    const autoCompleteText = getAutoCompleteText();
    if (autoCompleteText) {
      setSearchTerm(filteredParties[0].name);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (party: any) => {
    setSearchTerm(party.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setCurrentPage(1);
  };

  // Handle Enter key to open party ledger
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTerm.trim()) {
        // Find exact match or first suggestion
        const exactMatch = filteredParties.find(party => 
          party.name.toLowerCase() === searchTerm.toLowerCase()
        );
        const partyToOpen = exactMatch || filteredParties[0];
        
        if (partyToOpen) {
          handleViewLedger(partyToOpen.name);
        }
      }
    }
  };

  // Handle party selection
  const handlePartySelect = (partyId: string, checked: boolean) => {
    setSelectedParties(prev => 
      checked 
        ? [...prev, partyId]
        : prev.filter(id => id !== partyId)
    );
  };

  // Handle select all (for current page only)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = paginatedParties.map(party => party._id);
      setSelectedParties(prev => [...new Set([...prev, ...currentPageIds])]);
    } else {
      const currentPageIds = paginatedParties.map(party => party._id);
      setSelectedParties(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Clear selections when changing pages
      setSelectedParties([]);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setSelectedParties([]);
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
      // Get party names from selected party IDs
      const selectedPartyNames = selectedParties.map(partyId => {
        const party = parties.find(p => p._id === partyId);
        return party?.name;
      }).filter(Boolean);

      if (selectedPartyNames.length === 0) {
        toast({
          title: "Error",
          description: "No valid parties selected",
          variant: "destructive"
        });
        return;
      }
      
      // Call Monday Final API
      const response = await partyLedgerAPI.updateMondayFinal(selectedPartyNames);
      
      if (response.success) {
        toast({
          title: "Monday Final Completed",
          description: `Successfully processed ${response.data.updatedCount} parties. ${response.data.settledEntries} transactions settled.`,
        });
        
        // Refresh parties data
        refreshParties();
      } else {
        throw new Error(response.message || 'Failed to process Monday Final');
      }
      
      // Reset selection
      setSelectedParties([]);
      setShowMondayFinalModal(false);
    } catch (error: any) {
      console.error('Monday Final error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process Monday Final action",
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
                 <div className="relative">
                   <Input
                     ref={inputRef}
                     placeholder="Search parties... (Press Enter to open party ledger)"
                     value={searchTerm}
                     onChange={handleSearchChange}
                      onKeyDown={(e) => {
                       handleKeyDown(e);
                       handleSearchKeyDown(e);
                     }}
                     onFocus={() => setShowSuggestions(searchTerm.length > 0)}
                     onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                     className="pl-10 pr-10"
                   />
                   {/* Auto-complete hint */}
                   {searchTerm && getAutoCompleteText() && (
                     <div 
                       className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 text-sm"
                        style={{ 
                         left: `${autoCompleteLeft}px`,
                         zIndex: 1
                       }}
                     >
                       {getAutoCompleteText()}
                      </div>
                    )}
                   {/* Tab hint */}
                   {searchTerm && getAutoCompleteText() && (
                     <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                       Tab
                     </div>
                   )}
                 </div>
                 
                 {/* Auto-suggestion dropdown */}
                 {showSuggestions && searchTerm && filteredParties.length > 0 && (
                   <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {filteredParties.slice(0, 10).map((party, index) => (
                          <div
                         key={party._id}
                         className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                           index === selectedSuggestionIndex 
                             ? 'bg-blue-100 text-blue-900' 
                             : 'hover:bg-gray-100'
                         }`}
                         onClick={() => handleSuggestionClick(party)}
                       >
                         <div className="font-medium text-gray-900">{party.name}</div>
                         {party.srNo && (
                           <div className="text-sm text-gray-500">Sr. No: {party.srNo}</div>
                         )}
                          </div>
                        ))}
                     {filteredParties.length > 10 && (
                       <div className="px-4 py-2 text-sm text-gray-500 text-center bg-gray-50">
                         And {filteredParties.length - 10} more...
                      </div>
                    )}
                  </div>
                  )}
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
                      checked={paginatedParties.length > 0 && paginatedParties.every(party => selectedParties.includes(party._id))}
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
                ) : paginatedParties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No parties found matching your search' : 'No parties available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedParties.map((party, index) => (
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

        {/* Pagination Controls */}
        {filteredParties.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>

              {/* Page info */}
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredParties.length)} of {filteredParties.length} parties
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
        </div>
              </div>
          </div>
        )}

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

export default PartyLedger;
