import React, { useState, useCallback, useEffect, useMemo, memo, Profiler } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import TopNavigation from '@/components/TopNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { partyLedgerAPI } from '@/lib/api';
import { LedgerEntry } from '@/types';
import { useCompanyName } from '@/hooks/useCompanyName';
import { 
  isCompanyParty, 
  isCommissionParty,
  isMondayFinalAllowed, 
  isPartyEditingAllowed, 
  isPartyDeletionAllowed, 
  isTransactionAdditionAllowed,
  getCompanyPartyRestrictionMessage,
  getCommissionPartyRestrictionMessage
} from '@/lib/companyPartyUtils';

// Import our new hooks and components
import { useLedgerData } from '@/hooks/useLedgerData';
import { usePartyManagement } from '@/hooks/usePartyManagement';
import { useTransactionForm } from '@/hooks/useTransactionForm';
import { useAutoComplete } from '@/hooks/useAutoComplete';
import { useActionButtons } from '@/hooks/useActionButtons';
import { usePerformance } from '@/hooks/usePerformance';
import { PartySelector } from '@/components/PartySelector';
import { LedgerTable } from '@/components/LedgerTable';
import { TransactionForm } from '@/components/TransactionForm';
import { MondayFinalModal } from '@/components/MondayFinalModal';
import { formatCurrency, calculateSummary } from '@/utils/ledgerUtils';
import { formatPartyDisplayName, extractPartyNameFromDisplay } from '@/utils/partyUtils';

import { 
  RefreshCw, 
  Printer, 
  Download, 
  Filter, 
  Loader2,
  ArrowLeft,
  Search
} from 'lucide-react';

const AccountLedgerComponent = () => {
  // Performance monitoring - only log significant renders
  const { measureRender } = usePerformance('AccountLedger');
  
  // React Profiler callback for performance tracking
  const onRenderCallback = useCallback((id: string, phase: string, actualDuration: number, baseDuration: number, startTime: number, commitTime: number) => {
    // Only log significant renders (> 5ms)
    if (actualDuration > 5) {
      console.log(`🔍 Profiler [${id}]: ${phase} phase took ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`);
    }
  }, []);
  
  // Router hooks
  const { partyName: initialPartyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyName } = useCompanyName();

  // State management
  const [selectedPartyName, setSelectedPartyName] = useState(initialPartyName || 'Test Company 1');
  const [typingPartyName, setTypingPartyName] = useState(initialPartyName || 'Test Company 1');
  const [showOldRecords, setShowOldRecords] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);
  const [deletedEntryIds, setDeletedEntryIds] = useState<Set<string>>(new Set());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Custom hooks
  const { availableParties, allPartiesForTransaction, partiesLoading } = usePartyManagement(selectedPartyName);
  
  const { ledgerData, loading, loadLedgerData, refreshBalanceColumn, recalculateBalances, forceUpdate } = useLedgerData({
    selectedPartyName,
    showOldRecords,
    setShowOldRecords
  });

  // INSTANT refresh - no debounce for immediate updates
  const instantRefresh = useMemo(() => {
    return () => {
      loadLedgerData(false, true);
    };
  }, [loadLedgerData]);

  const {
    newEntry,
    loading: formLoading,
    validationErrors,
    validationWarnings,
    handlePartyNameChange,
    handlePartyNameChangeEnhanced,
    handleAmountChange,
    handleRemarksChange,
    handleAddEntry,
    resetForm,
    validateTransaction,
    effectiveBusinessRules,
    calculateCommissionAmount
  } = useTransactionForm({
    selectedPartyName,
    allPartiesForTransaction,
    ledgerData,
    onTransactionAdded: useCallback(async () => {
      console.log('🔄 TRANSACTION ADDED: Refreshing data...');
      // Force refresh data from backend immediately
      try {
        await loadLedgerData(true, true); // Show loading and force refresh
        console.log('✅ TRANSACTION ADDED: Data refreshed successfully');
      } catch (error) {
        console.error('❌ TRANSACTION ADDED: Error refreshing data:', error);
      }
    }, [loadLedgerData]),
    businessRules: {
      maxTransactionAmount: 10000000,
      minTransactionAmount: 1,
      maxDailyTransactions: 50,
      requireRemarksForHighValue: true,
      highValueThreshold: 50000
    }
  });

  // Handle party change - optimized like old system
  const handlePartyChange = useCallback(async (newPartyName: string) => {
    const actualPartyName = extractPartyNameFromDisplay(newPartyName.trim());
    
    // Immediate UI updates - no waiting
    setSelectedPartyName(actualPartyName);
    setTypingPartyName(newPartyName.trim());
    resetForm();
    setSelectedEntries([]);
    setDeletedEntryIds(new Set());
    navigate(`/account-ledger/${encodeURIComponent(actualPartyName)}`);
    
    // Load data immediately - like old system
    try {
      await loadLedgerData(true, true);
    } catch (error) {
      console.error('Error loading party data:', error);
    }
  }, [navigate, resetForm, loadLedgerData]);

  // Top party selector auto-complete - Enhanced like old version
  const topPartyAutoComplete = useAutoComplete({
    parties: availableParties,
    onPartySelect: handlePartyChange,
    excludeCurrentParty: true,
    currentPartyName: selectedPartyName
  });

  // Party selection handlers - Like old version
  const handlePartySelect = useCallback((partyName: string) => {
    handlePartyChange(partyName);
  }, [handlePartyChange]);

  const handleTopPartySelect = useCallback((partyName: string) => {
    handlePartyChange(partyName);
  }, [handlePartyChange]);

  // Handle URL parameter changes and initial load
  useEffect(() => {
    if (initialPartyName && initialPartyName !== selectedPartyName) {
      const decodedPartyName = decodeURIComponent(initialPartyName);
      setSelectedPartyName(decodedPartyName);
      setTypingPartyName(decodedPartyName);
    }
    
    // Mark initial load as complete after a short delay to show UI immediately
    if (!initialLoadComplete) {
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialPartyName, selectedPartyName, initialLoadComplete]);

  // Get current entries for display - simplified version
  const currentEntries = useMemo(() => {
    if (!ledgerData) return [];
    
    const entries = showOldRecords 
      ? [...(ledgerData.oldRecords || []), ...(ledgerData.ledgerEntries?.filter(entry => entry.remarks?.includes('Monday Final Settlement')) || [])]
      : ledgerData.ledgerEntries || [];
    
    // Filter out deleted entries
    const filteredEntries = entries.filter(entry => {
      const entryId = (entry.id || entry._id || entry.ti || '').toString();
      const entryPartyName = entry.partyName || entry.party_name || '';
      const compositeKey = `${entryPartyName}:${entryId}`;
      return !deletedEntryIds.has(compositeKey);
    });
    
    return filteredEntries;
  }, [ledgerData, showOldRecords, deletedEntryIds, forceUpdate]);

  // Action buttons hook
  const {
    handleSelectAll: hookHandleSelectAll,
    handleCheckAll: hookHandleCheckAll,
    handleModifyEntry: hookHandleModifyEntry,
    handleDeleteEntry: hookHandleDeleteEntry,
    handleBulkDelete: hookHandleBulkDelete,
    handleMondayFinal: hookHandleMondayFinal,
    handleRefresh: hookHandleRefresh,
    handlePrint: hookHandlePrint,
    handleExit: hookHandleExit,
    handleDCReport: hookHandleDCReport,
    handleCommissionAutoFill: hookHandleCommissionAutoFill,
    actionLoading: hookActionLoading
  } = useActionButtons({
    selectedEntries,
    currentEntries,
    selectedPartyName,
    showOldRecords,
    ledgerData,
    setSelectedEntries,
    setShowMondayFinalModal,
    setEditingEntry,
    setEntryToDelete,
    loadLedgerData,
    refreshBalanceColumn,
    setDeletedEntryIds
  });

  // Handle entry selection
  const handleEntrySelect = useCallback((id: string | number, checked: boolean) => {
    setSelectedEntries(prev => 
      checked 
        ? [...prev, id.toString()]
        : prev.filter(entryId => entryId !== id.toString())
    );
  }, []);

  // Use hook functions
  const handleSelectAll = hookHandleSelectAll;
  const handleCheckAll = hookHandleCheckAll;

  // Use hook functions
  const handleModifyEntry = hookHandleModifyEntry;
  const handleDeleteEntry = hookHandleDeleteEntry;

  // Use hook functions
  const handleMondayFinal = hookHandleMondayFinal;
  const handleRefresh = hookHandleRefresh;
  const handlePrint = hookHandlePrint;
  const handleExit = hookHandleExit;
  const handleDCReport = hookHandleDCReport;

  // Use hook function
  const handleCommissionAutoFill = () => hookHandleCommissionAutoFill(allPartiesForTransaction);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.party-dropdown-container') && !target.closest('.top-party-dropdown-container')) {
        // Close any open dropdowns
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle parties refresh event
  useEffect(() => {
    const handlePartiesRefresh = (event: CustomEvent) => {
      // console.log('🔄 Parties refresh event received:', event.detail);
      // Refresh parties data
    };

    window.addEventListener('partiesRefreshed', handlePartiesRefresh as EventListener);
    
    return () => {
      window.removeEventListener('partiesRefreshed', handlePartiesRefresh as EventListener);
    };
  }, []);

  // Calculate closing balance - use real data only
  const closingBalance = useMemo(() => {
    return ledgerData?.closingBalance || 0;
  }, [ledgerData?.closingBalance, forceUpdate]);

  // Performance optimization: Memoized party filtering
  const availablePartiesExcludingCurrent = useMemo(() => {
    if (!availableParties || !selectedPartyName) return [];
    
    return availableParties.filter(party => 
      (party.party_name || party.name) !== selectedPartyName &&
      party.status === 'A'
    );
  }, [availableParties, selectedPartyName]);

  // Check if party is already settled for Monday Final
  const isPartySettled = useMemo(() => {
    // TEMPORARILY DISABLED: All parties should show tables
    return false;
    
    // Original logic (commented out for now):
    /*
    if (!ledgerData || !selectedPartyName) return false;
    
    // Skip settlement check for virtual parties (Commission, Give, Company, etc.)
    const virtualParties = ['commission', 'give', 'company', 'settlement'];
    if (virtualParties.includes(selectedPartyName.toLowerCase())) {
      return false;
    }
    
    // Check if there are any Monday Final Settlement entries for the CURRENT party
    const mondayFinalEntries = ledgerData.oldRecords.filter(entry => 
      entry.remarks?.includes('Monday Final Settlement') &&
      entry.partyName === selectedPartyName
    );
    
    // Also check current ledger entries for Monday Final Settlement
    const currentMondayFinalEntries = ledgerData.ledgerEntries.filter(entry => 
      entry.remarks?.includes('Monday Final Settlement') &&
      entry.partyName === selectedPartyName
    );
    
    // Party is settled if there are Monday Final entries for this specific party
    return mondayFinalEntries.length > 0 || currentMondayFinalEntries.length > 0;
    */
  }, [ledgerData, selectedPartyName]);

  // Performance optimization: Debounced search (if lodash is available)
  const debouncedSearch = useMemo(() => {
    // Simple debounce implementation if lodash is not available
    let timeoutId: NodeJS.Timeout;
    return (searchTerm: string, callback: (term: string) => void) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(searchTerm);
      }, 300);
    };
  }, []);

  // Calculate summary
  const summary = ledgerData ? calculateSummary(currentEntries) : null;

  if (loading && !ledgerData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading ledger data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Profiler id="AccountLedger" onRender={onRenderCallback}>
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <TopNavigation />
      
      {/* Main Layout - Split from top navigation */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Top Section + Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Section - Party Information */}
          <div className="bg-white shadow-lg border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Party Name:</label>
                <div className="relative top-party-dropdown-container">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      ref={topPartyAutoComplete.inputRef}
                      placeholder="Search party name"
                      value={topPartyAutoComplete.searchTerm}
                      onChange={(e) => topPartyAutoComplete.handleInputChange(e.target.value)}
                      onKeyDown={topPartyAutoComplete.handleKeyDown}
                      onFocus={topPartyAutoComplete.handleFocus}
                      onBlur={topPartyAutoComplete.handleBlur}
                      className="pl-10 pr-10 w-64"
                    />
                    
                    {/* Auto-complete hint */}
                    {topPartyAutoComplete.searchTerm && topPartyAutoComplete.showInlineSuggestion && topPartyAutoComplete.autoCompleteText && (
                      <div 
                        className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 text-sm opacity-60"
                        style={{ 
                          left: `${Math.max(topPartyAutoComplete.textWidth + 40, 40)}px`,
                          zIndex: 1,
                          maxWidth: '200px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {topPartyAutoComplete.autoCompleteText}
                      </div>
                    )}
                    
                    {/* Tab hint */}
                    {topPartyAutoComplete.searchTerm && topPartyAutoComplete.showInlineSuggestion && topPartyAutoComplete.autoCompleteText && (
                      <div className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs bg-white px-1">
                        Tab
                      </div>
                    )}
                  </div>
                  
                  {/* Auto-suggestion dropdown */}
                  {topPartyAutoComplete.showSuggestions && topPartyAutoComplete.filteredParties.length > 0 && (
                    <div className="absolute z-50 w-64 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-party-dropdown-container">
                      {topPartyAutoComplete.filteredParties.slice(0, 10).map((party, index) => (
                        <div
                          key={party._id}
                          className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            index === topPartyAutoComplete.highlightedIndex 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => topPartyAutoComplete.handleSuggestionClick(party)}
                        >
                          <div className="font-medium text-gray-900">
                            {party.party_name || party.name}
                          </div>
                          {party.status && (
                            <div className="text-xs text-gray-500">
                              Status: {party.status}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Closing Balance:</label>
                <span className={`text-lg font-bold px-3 py-1 rounded-lg ${
                  closingBalance > 0 
                    ? 'text-green-600 bg-green-50' 
                    : closingBalance < 0 
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-50'
                }`}>
                  {formatCurrency(closingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-semibold text-lg">Account Ledger Entries</h2>
                  </div>
                </div>
                <div className="overflow-auto" style={{ height: '400px' }}>
                  {!initialLoadComplete ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading Account Ledger...</p>
                    </div>
                  ) : (
                    <LedgerTable
                      entries={currentEntries}
                      showOldRecords={showOldRecords}
                      onToggleOldRecords={() => setShowOldRecords(!showOldRecords)}
                      onEntrySelect={handleEntrySelect}
                      onModifyEntry={hookHandleModifyEntry}
                      onDeleteEntry={hookHandleDeleteEntry}
                      selectedEntries={selectedEntries}
                      onSelectAll={hookHandleSelectAll}
                    />
                  )}
                </div>
              </div>
              
              {/* Form Section - Below table */}
              <div className="bg-white shadow-lg border border-gray-200 rounded-xl px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Add New Entry for <span className="text-blue-600">{selectedPartyName}</span>
                  </h3>
                  <div className="text-xs text-gray-500">
                    <strong>Format:</strong> Party Name or Party Name(Remarks) | <strong>Amount:</strong> + for Credit, - for Debit | <strong>Commission:</strong> Type "commission" in party name
                  </div>
                </div>
                <TransactionForm
                  newEntry={newEntry}
                  loading={formLoading}
                  allPartiesForTransaction={allPartiesForTransaction}
                  selectedPartyName={selectedPartyName}
                  onPartyNameChange={handlePartyNameChange}
                  onAmountChange={handleAmountChange}
                  onRemarksChange={handleRemarksChange}
                  onAddEntry={handleAddEntry}
                  onReset={resetForm}
                  validationErrors={validationErrors}
                  validationWarnings={validationWarnings}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Action Buttons - Full height from top navigation */}
        <div className="w-64 bg-white shadow-lg border-l border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
            <div className="text-sm text-gray-600 mb-4">
              Selected: {selectedEntries.length} entries
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={hookHandleRefresh}
              disabled={hookActionLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh All</span>
            </button>
            
              <button
                onClick={hookHandleDCReport}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>DC Report</span>
            </button>
            
            <button
              onClick={() => setShowMondayFinalModal(true)}
              disabled={selectedEntries.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Monday Final</span>
            </button>
            
            <button
              onClick={async () => {
                const newShowOldRecords = !showOldRecords;
                setShowOldRecords(newShowOldRecords);
                console.log('🔄 OLD RECORDS: Toggling to:', newShowOldRecords);
                // Refresh data after toggle
                await loadLedgerData(false, true);
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{showOldRecords ? 'Current Records' : 'Old Record'}</span>
            </button>
            
            <button
              onClick={() => {
                if (selectedEntries.length === 1) {
                  const selectedEntry = currentEntries.find(entry => 
                    (entry.id || entry._id || entry.ti || '').toString() === selectedEntries[0]
                  );
                  if (selectedEntry) {
                    hookHandleModifyEntry(selectedEntry);
                  }
                }
              }}
              disabled={selectedEntries.length !== 1}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Modify</span>
            </button>
            
            <button
              onClick={() => {
                if (selectedEntries.length > 0) {
                  if (selectedEntries.length === 1) {
                    // Single entry delete
                    const selectedEntry = currentEntries.find(entry => 
                      (entry.id || entry._id || entry.ti || '').toString() === selectedEntries[0]
                    );
                    if (selectedEntry) {
                      hookHandleDeleteEntry(selectedEntry);
                    }
                  } else {
                    // Bulk delete
                    const selectedEntriesData = currentEntries.filter(entry => 
                      selectedEntries.includes((entry.id || entry._id || entry.ti || '').toString())
                    );
                    if (selectedEntriesData.length > 0) {
                      hookHandleBulkDelete(selectedEntriesData);
                    }
                  }
                }
              }}
              disabled={selectedEntries.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{selectedEntries.length === 1 ? 'Delete' : `Delete ${selectedEntries.length}`}</span>
            </button>
            
            <button
              onClick={hookHandlePrint}
              className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>
            
            <button
              onClick={hookHandleCheckAll}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Check All</span>
            </button>
            
            <button
              onClick={hookHandleExit}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monday Final Modal */}
      <MondayFinalModal
        isOpen={showMondayFinalModal}
        onClose={() => setShowMondayFinalModal(false)}
        onConfirm={hookHandleMondayFinal}
        selectedCount={selectedEntries.length}
        loading={hookActionLoading}
      />
      </div>
    </Profiler>
  );
};

// Memoize the component to prevent unnecessary re-renders
const AccountLedger = memo(AccountLedgerComponent);

export default AccountLedger;
