/**
 * Optimized Party Report Page
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
 * - Pagination for large datasets
 * - Auto-suggestions and keyboard navigation
 * - React Query for efficient data fetching
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import TopNavigation from '@/components/TopNavigation';
import { newPartyAPI, partyLedgerAPI } from '@/lib/api';
import { Party } from '@/types';
import { useParties, useRefreshParties } from '@/hooks/useParties';
import { Search, Filter, Download, Printer, RefreshCw, Eye, Edit, Trash2, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PartyWithMondayFinalStatus extends Party {
  mondayFinal: 'Yes' | 'No';
}

// Loading skeleton component
const PartyRowSkeleton = () => (
  <tr>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></td>
    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></td>
  </tr>
);

const PartyReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  // Transform parties data with Monday Final status
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
      mondayFinal: 'No' as const, // Will be updated by status check
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

  // Handle suggestion click
  const handleSuggestionClick = (party: any) => {
    setSearchTerm(party.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

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

  // Handle refresh
  const handleRefresh = () => {
    refreshParties();
    toast({
      title: "Refreshing...",
      description: "Party data is being refreshed",
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleDeleteConfirm started...');
    console.log('📊 DELETE: Starting party deletion...');
    
    if (!selectedParty) return;
    
    setActionLoading(true);
    try {
      console.log('🗑️ Deleting party:', selectedParty);
      const response = await newPartyAPI.delete(selectedParty._id!);
      console.log('🗑️ Delete response:', response);
      
      if (response.success) {
        const deletedTransactions = response.data?.deletedTransactions || 0;
        toast({
          title: "✅ Success",
          description: `Party "${selectedParty.name}" and ${deletedTransactions} transactions deleted permanently from database`,
        });
        
        // Refresh parties data
        refreshParties();
        setSelectedParty(null);
        setShowDeleteModal(false);
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
    } finally {
      setActionLoading(false);
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`✅ ACTION: handleDeleteConfirm completed in ${duration.toFixed(2)}ms`);
      console.log('📊 DELETE: Party deletion finished');
    }
  };

  const handleModify = async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleModify started...');
    console.log('📊 MODIFY: Starting party modification...');
    
    if (selectedParty) {
      try {
        // Navigate to modify party page with party data
        navigate(`/new-party?edit=true&id=${selectedParty._id}`);
        toast({
          title: "Modify Party",
          description: `Opening ${selectedParty.name} for editing`,
        });
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`✅ ACTION: handleModify completed in ${duration.toFixed(2)}ms`);
        console.log('📊 MODIFY: Party modification navigation finished');
      } catch (error) {
        console.error('Modify party error:', error);
        toast({
          title: "Error",
          description: "Failed to open party for modification",
          variant: "destructive"
        });
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`❌ ACTION: handleModify failed in ${duration.toFixed(2)}ms`);
      }
    } else {
      toast({
        title: "Select Party",
        description: "Please select a party to modify",
        variant: "destructive"
      });
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`❌ ACTION: handleModify failed in ${duration.toFixed(2)}ms - No party selected`);
    }
  };

  const handleDelete = () => {
    if (selectedParty) {
      setShowDeleteModal(true);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Party Report</h1>
          <p className="text-gray-600">Comprehensive report of all parties with their details and status</p>
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
                    placeholder="Search parties... (Press Tab to auto-complete)"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
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
                onClick={handleModify}
                disabled={!selectedParty}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modify
              </Button>
              
              <Button
                onClick={handleDelete}
                disabled={!selectedParty}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              
              <Button
                onClick={handleNewParty}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Party
              </Button>
              
              <Button
                onClick={handleExit}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <X className="w-4 h-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>
        </div>

        {/* Party Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                {partiesLoading ? (
                  // Show skeleton loading
                  Array.from({ length: 5 }).map((_, index) => (
                    <PartyRowSkeleton key={index} />
                  ))
                ) : paginatedParties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? 'No parties found matching your search' : 'No parties available'}
                    </td>
                  </tr>
                ) : (
                  paginatedParties.map((party, index) => (
                    <tr 
                      key={party._id || index} 
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedParty?._id === party._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleRowClick(party)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {startIndex + index + 1}
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
                        <Badge variant={party.mondayFinal === 'Yes' ? 'default' : 'secondary'}>
                          {party.mondayFinal || 'No'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
            <p className="text-2xl font-bold text-gray-900">{selectedParty ? 1 : 0}</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete party "{selectedParty?.name}"?
              This action cannot be undone and will permanently delete:
              • The party from the database
              • ALL transactions for this party
              This is a permanent action!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartyReport; 