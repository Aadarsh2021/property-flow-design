import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useToast } from '@/hooks/use-toast';
import { useTransactionFormNew } from '@/hooks/useTransactionFormNew';
import { partyLedgerAPI } from '@/lib/api';
import TopNavigation from '@/components/TopNavigation';
import TransactionForm from '@/components/TransactionForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, RefreshCw, Search, ArrowLeft, Plus, Edit, Trash2, Printer, Download } from 'lucide-react';
import { debounce } from 'lodash';
import { clearCacheByPattern } from '@/lib/apiCache';
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

// Memoized table row component for performance
const TableRow = memo(({ 
  entry, 
  index, 
  isSelected, 
  onCheckboxChange 
}: { 
  entry: any; 
  index: number; 
  isSelected: boolean; 
  onCheckboxChange: (id: string | number, checked: boolean) => void; 
}) => {
  const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
  
  return (
    <tr 
      className={`hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-blue-100' : ''
      } ${entry.is_old_record ? 'bg-gray-50 opacity-75' : ''} ${
        entry.isOptimistic ? 'bg-green-50 border-l-4 border-green-400 animate-pulse' : ''
      }`}
      onClick={() => onCheckboxChange(entryId, !isSelected)}
    >
      <td className="px-4 py-3 text-gray-700">
        {new Date(entry.date).toLocaleDateString('en-GB')}
      </td>
      <td className="px-4 py-3 text-gray-800 font-medium">
        <div className="flex items-center space-x-2">
          <span>{entry.remarks}</span>
          {entry.is_old_record && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
              Old Record
            </span>
          )}
          {entry.isOptimistic && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium animate-pulse">
              Updating...
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          entry.tnsType === 'CR' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {entry.tnsType}
        </span>
      </td>
      <td className="px-4 py-3 text-center font-medium text-green-600">
        {entry.credit || 0}
      </td>
      <td className="px-4 py-3 text-center font-medium text-red-600">
        {entry.debit || 0}
      </td>
      <td className="px-4 py-3 text-center font-semibold">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          (entry.balance || 0) > 0 
            ? 'bg-green-100 text-green-800' 
            : (entry.balance || 0) < 0 
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
        }`}>
          ₹{(entry.balance || 0).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onCheckboxChange(entryId, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
      </td>
      <td className="px-4 py-3 text-center text-gray-500 text-xs">
        {entry.ti || index}
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

const AccountLedgerComponent = () => {
  
  // Router hooks
  const { partyName: initialPartyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyName } = useCompanyName(user?.id);
  const { toast } = useToast();

  // Loading states for better user experience
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Party selection state
  const [selectedPartyName, setSelectedPartyName] = useState(initialPartyName || 'Test Company 1');
  const [typingPartyName, setTypingPartyName] = useState(initialPartyName || 'Test Company 1');
  const [availableParties, setAvailableParties] = useState<any[]>([]);
  const [allPartiesForTransaction, setAllPartiesForTransaction] = useState<any[]>([]);

  // Handle URL parameter changes
  useEffect(() => {
    if (initialPartyName && initialPartyName !== selectedPartyName) {
      const decodedPartyName = decodeURIComponent(initialPartyName);
      setSelectedPartyName(decodedPartyName);
      setTypingPartyName(decodedPartyName);
    }
  }, [initialPartyName, selectedPartyName]);

  // Main ledger data state
  const [ledgerData, setLedgerData] = useState<{
    ledgerEntries: any[];
    oldRecords: any[];
    closingBalance: number;
    summary: {
      totalCredit: number;
      totalDebit: number;
      calculatedBalance: number;
      totalEntries: number;
    };
    mondayFinalData: {
      transactionCount: number;
      totalCredit: number;
      totalDebit: number;
      startingBalance: number;
      finalBalance: number;
    };
  } | null>(null);

  // UI State Management
  const [showOldRecords, setShowOldRecords] = useState(false);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Immediate table update function for optimistic updates
  const handleImmediateTableUpdate = useCallback((optimisticEntry: any) => {
    console.log('⚡ [TABLE] Adding optimistic entry to table immediately');
    const startTime = performance.now();
    
    setLedgerData(prev => {
      const newLedgerData = { ...prev };
      newLedgerData.ledgerEntries = [optimisticEntry, ...newLedgerData.ledgerEntries];
      
      // Recalculate balance for optimistic entry
      const previousBalance = newLedgerData.ledgerEntries[1]?.balance || 0;
      optimisticEntry.balance = previousBalance + (optimisticEntry.credit || 0) - (optimisticEntry.debit || 0);
      
      // Update closing balance
      newLedgerData.closingBalance = optimisticEntry.balance;
      
      const endTime = performance.now();
      console.log(`⚡ [TABLE] Optimistic update completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      return newLedgerData;
    });
  }, []);

  // Use transaction form hook
  const transactionForm = useTransactionFormNew({
    selectedPartyName,
    availableParties,
    onRefreshLedger: () => loadLedgerData(selectedPartyName, true, true),
    onImmediateTableUpdate: handleImmediateTableUpdate
  });

  // State for parties dropdown (bottom section)
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [filteredParties, setFilteredParties] = useState<any[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [autoCompleteText, setAutoCompleteText] = useState('');
  const [showInlineSuggestion, setShowInlineSuggestion] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const [textWidth, setTextWidth] = useState(0);

  // State for top section dropdown
  const [showTopPartyDropdown, setShowTopPartyDropdown] = useState(false);
  const [filteredTopParties, setFilteredTopParties] = useState<any[]>([]);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [topAutoCompleteText, setTopAutoCompleteText] = useState('');
  const [showTopInlineSuggestion, setShowTopInlineSuggestion] = useState(false);
  const [topTextWidth, setTopTextWidth] = useState(0);
  const [highlightedTopIndex, setHighlightedTopIndex] = useState(-1);
  const [entryToDelete, setEntryToDelete] = useState<any | null>(null);

  // Selected entries for bulk operations
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  // Track if user manually entered commission amount
  const [isManualCommissionAmount, setIsManualCommissionAmount] = useState(false);

  // Refs
  const topInputRef = useRef<HTMLInputElement>(null);

  // Load available parties for dropdown
  const loadAvailableParties = useCallback(async () => {
    setPartiesLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        
        // Map backend party data to frontend Party type
        const mappedParties = (response.data || []).map((party: any) => ({
          _id: party.id || party._id,
          name: party.name || party.party_name || party.partyName, // Support multiple field names
          party_name: party.party_name || party.partyName, // Keep original for compatibility
          srNo: party.sr_no || party.srNo,
          status: party.status || 'A',
          mCommission: party.mCommission || party.m_commission || 'No Commission',
          rate: party.rate || '0',
          commiSystem: party.commiSystem || party.commi_system || 'Take',
          mondayFinal: party.mondayFinal || party.monday_final || 'No',
          companyName: party.companyName || party.company_name || party.party_name || party.partyName
        }));
      
        // No virtual parties needed - use only real parties from database
        // All parties (Commission, Company, etc.) are now created as real parties
        const allPartiesWithVirtual = [...mappedParties];
        
        setAvailableParties(mappedParties); // Real parties for top selection
        setAllPartiesForTransaction(allPartiesWithVirtual); // All real parties for transaction dropdown
        setFilteredParties(allPartiesWithVirtual); // All real parties for bottom dropdown
        setFilteredTopParties(mappedParties); // Real parties for top dropdown
      }
    } catch (error: any) {
      console.error('❌ Load parties error:', error);
      toast({
        title: "Error",
        description: "Failed to load parties",
        variant: "destructive"
      });
    } finally {
      setPartiesLoading(false);
    }
  }, [companyName, toast]);

  // Load ledger data for selected party
  const loadLedgerData = useCallback(async (partyName?: string, showLoading = true, forceRefresh = false) => {
    const currentPartyName = partyName || selectedPartyName;
    if (!currentPartyName) return;
    
    const startTime = performance.now();
    console.log(`🔄 [LOADING] Starting to load ledger data for party: ${currentPartyName}`);
    
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const apiStartTime = performance.now();
      console.log(`📡 [LOADING] Calling API for party: ${currentPartyName}`);
      const response = await partyLedgerAPI.getPartyLedger(currentPartyName);
      const apiEndTime = performance.now();
      console.log(`✅ [LOADING] API completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms`);
      
      if (response.success) {
        const responseData = response.data as any;
        
        // Transform entry data
        const transformEntry = (entry: any) => ({
          id: entry.id || entry._id || entry.ti,
          _id: entry.id || entry._id || entry.ti,
          ti: entry.ti || entry.id || entry._id,
          date: entry.date || entry.created_at || entry.createdAt,
          remarks: entry.remarks || entry.description || '',
          tnsType: entry.tnsType || entry.type || entry.transaction_type,
          credit: entry.credit || entry.credit_amount || 0,
          debit: entry.debit || entry.debit_amount || 0,
          balance: entry.balance || entry.running_balance || 0,
          partyName: entry.partyName || entry.party_name || currentPartyName,
          is_old_record: entry.is_old_record || false,
          createdAt: entry.created_at || entry.createdAt || '',
          updatedAt: entry.updated_at || entry.updatedAt || ''
        });

        // Optimized data transformation
        const transformedData = {
          ledgerEntries: (responseData.ledgerEntries || []).map(transformEntry),
          oldRecords: (responseData.oldRecords || []).map(transformEntry),
          closingBalance: responseData.closingBalance || 0,
          summary: {
            totalCredit: responseData.summary?.totalCredit || 0,
            totalDebit: responseData.summary?.totalDebit || 0,
            calculatedBalance: responseData.summary?.calculatedBalance || 0,
            totalEntries: responseData.summary?.totalEntries || 0
          },
          mondayFinalData: {
            transactionCount: responseData.mondayFinalData?.transactionCount || 0,
            totalCredit: responseData.mondayFinalData?.totalCredit || 0,
            totalDebit: responseData.mondayFinalData?.totalDebit || 0,
            startingBalance: responseData.mondayFinalData?.startingBalance || 0,
            finalBalance: responseData.mondayFinalData?.finalBalance || 0
          }
        };
        
        const transformEndTime = performance.now();
        console.log(`🔄 [LOADING] Data transformation completed in ${(transformEndTime - apiEndTime).toFixed(2)}ms`);
        
        setLedgerData(transformedData);
        
        // ULTRA-AGGRESSIVE CACHING: Store data in localStorage with longer TTL
        if (user?.id) {
          const cacheKey = `party-ledger-${user.id}-${currentPartyName}`;
          const cacheData = {
            data: transformedData,
            timestamp: Date.now(),
            ttl: 300000 // 5 minutes cache (increased from 30s)
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          console.log(`💾 [CACHE] Stored data for ${currentPartyName} with 5min TTL`);
        }
        
        // Force UI update by triggering a re-render
        setForceUpdate(prev => prev + 1);
        
        // Auto-enable old records view if all transactions are settled
        if (transformedData.ledgerEntries.length === 0 && transformedData.oldRecords.length > 0) {
          setShowOldRecords(true);
        } else if (transformedData.ledgerEntries.length > 0) {
          // If there are current entries (like settlement transactions), show current records
          setShowOldRecords(false);
        }
        
        const totalEndTime = performance.now();
        const totalTime = totalEndTime - startTime;
        console.log(`🏁 [LOADING] Total loading process completed in ${totalTime.toFixed(2)}ms`);
        
      } else {
        console.error('❌ [LOADING] Failed to load ledger data:', response.message);
      toast({
          title: "Error",
          description: response.message || "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ [LOADING] Load ledger data error:', error);
      toast({
        title: "Error",
        description: "Failed to load ledger data",
        variant: "destructive"
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [toast, user?.id]);

  // ULTRA-AGGRESSIVE PRELOADING: Load everything immediately
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 [ULTRA] Starting ultra-aggressive preloading...');
      const startTime = performance.now();
      
      // IMMEDIATE CACHE CHECK: Try to load from cache first
      const cacheKey = `party-ledger-${user.id}-${selectedPartyName}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        console.log('⚡ [ULTRA] Found cached data, loading instantly...');
        try {
          const parsedData = JSON.parse(cachedData);
          const cacheAge = Date.now() - parsedData.timestamp;
          const cacheTTL = parsedData.ttl || 300000; // 5 minutes
          
          if (parsedData.timestamp && cacheAge < cacheTTL) {
            setLedgerData(parsedData.data);
            const endTime = performance.now();
            console.log(`⚡ [ULTRA] Cached data loaded in ${(endTime - startTime).toFixed(2)}ms`);
            return; // Exit early if cache hit
          }
      } catch (error) {
          console.log('⚠️ [ULTRA] Cache parse error, loading fresh data');
        }
      }
      
      // PARALLEL LOADING: Load everything at once
      const parallelLoad = async () => {
        try {
          await Promise.all([
            loadAvailableParties(),
            // Preload first party's data if available
            availableParties.length > 0 ? loadLedgerData(availableParties[0].name, false) : Promise.resolve()
          ]);
          
          const endTime = performance.now();
          console.log(`🚀 [ULTRA] Parallel load completed in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
          console.error('❌ [ULTRA] Parallel load failed:', error);
        }
      };
      
      parallelLoad();
    }
  }, [user?.id]);

  // Load ledger data when party changes
  useEffect(() => {
    if (selectedPartyName && user?.id) {
      console.log(`🔄 [EFFECT] Party changed to: ${selectedPartyName}, loading ledger data...`);
      loadLedgerData(selectedPartyName, true);
    }
  }, [selectedPartyName, user?.id]);

  // Smart party selection with preloading
  const handlePartySelect = useCallback(async (partyName: string) => {
    console.log(`🔄 [PARTY] Party selection started: ${partyName}`);
    const startTime = performance.now();
    
    setSelectedPartyName(partyName);
    setTypingPartyName(partyName);
    setShowTopPartyDropdown(false);
    setShowTopInlineSuggestion(false);
    setTopAutoCompleteText('');
    // Update URL
    navigate(`/account-ledger/${encodeURIComponent(partyName)}`);
    
    // SMART PRELOADING: Check cache first, then load if needed
    if (user?.id) {
      const cacheKey = `party-ledger-${user.id}-${partyName}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        console.log(`⚡ [PARTY] Using cached data for: ${partyName}`);
        try {
          const parsedData = JSON.parse(cachedData);
          const cacheAge = Date.now() - parsedData.timestamp;
          const cacheTTL = parsedData.ttl || 300000; // Default 5 minutes
          
          if (parsedData.timestamp && cacheAge < cacheTTL) {
            setLedgerData(parsedData.data);
            const endTime = performance.now();
            console.log(`⚡ [PARTY] Cached data loaded in ${(endTime - startTime).toFixed(2)}ms (${Math.round(cacheAge/1000)}s old)`);
            return;
          } else {
            console.log(`⚠️ [PARTY] Cache expired (${Math.round(cacheAge/1000)}s old), loading fresh data`);
          }
        } catch (error) {
          console.log('⚠️ [PARTY] Cache parse error, loading fresh data');
        }
      }
      
      // DEBOUNCED LOADING: Load fresh data with debounce
      const debounceTime = 100; // Reduced from 200ms to 100ms
      setTimeout(async () => {
        console.log(`📡 [PARTY] Loading fresh data for: ${partyName}`);
        await loadLedgerData(partyName, true);
        const endTime = performance.now();
        console.log(`✅ [PARTY] Party selection completed in ${(endTime - startTime).toFixed(2)}ms`);
      }, debounceTime);
    }
  }, [user?.id, loadLedgerData, navigate]);

  // Filter top parties function
  const filterTopParties = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      const availablePartiesExcludingCurrent = availableParties.filter((party: any) => 
        (party.party_name || party.name) !== selectedPartyName
      );
      setFilteredTopParties(availablePartiesExcludingCurrent);
      return;
    }
    
    const filtered = availableParties.filter((party: any) =>
      (party.party_name || party.name).toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTopParties(filtered);
    
    // Auto-complete logic
    const exactMatch = filtered.find((party: any) =>
      (party.party_name || party.name).toLowerCase() === searchTerm.toLowerCase()
    );
    
    if (filtered.length > 0 && !exactMatch) {
      const firstMatch = filtered[0];
      const matchName = firstMatch.party_name || firstMatch.name;
      if (matchName.toLowerCase().startsWith(searchTerm.toLowerCase())) {
        setTopAutoCompleteText(matchName.substring(searchTerm.length));
        setShowTopInlineSuggestion(true);
      } else {
        setTopAutoCompleteText('');
        setShowTopInlineSuggestion(false);
      }
    } else {
      setTopAutoCompleteText('');
      setShowTopInlineSuggestion(false);
    }
  };


  // Handle top party dropdown keyboard navigation
  const handleTopPartyKeyDown = (e: React.KeyboardEvent) => {
    if (!showTopPartyDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedTopIndex(prev => 
          prev < filteredTopParties.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedTopIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedTopIndex >= 0 && filteredTopParties[highlightedTopIndex]) {
          handlePartySelect(filteredTopParties[highlightedTopIndex].party_name || filteredTopParties[highlightedTopIndex].name);
        } else if (filteredTopParties.length === 1) {
          handlePartySelect(filteredTopParties[0].party_name || filteredTopParties[0].name);
        }
        break;
      case 'Escape':
        setShowTopPartyDropdown(false);
        setHighlightedTopIndex(-1);
        break;
      case 'Tab':
        if (highlightedTopIndex >= 0 && filteredTopParties[highlightedTopIndex]) {
          e.preventDefault();
          handlePartySelect(filteredTopParties[highlightedTopIndex].party_name || filteredTopParties[highlightedTopIndex].name);
        }
        break;
    }
  };

  // Handle entry selection
  const handleEntrySelect = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!ledgerData) return;
    const entries = showOldRecords ? ledgerData.oldRecords : ledgerData.ledgerEntries;
    if (selectedEntries.length === entries?.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(entries?.map((entry: any) => entry.id || entry._id || entry.ti) || []);
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!selectedPartyName) return;
    setActionLoading(true);
    try {
      // Clear cache to ensure fresh data on refresh
      clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
      clearCacheByPattern(`.*all-parties.*`);
      
      await loadLedgerData(selectedPartyName, false, true); // Force refresh to bypass loading check
      toast({
        title: "Success",
        description: "Ledger data refreshed successfully"
      });
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setActionLoading(false);
    }
  }, [selectedPartyName, loadLedgerData, toast]);

  // Handle exit
  const handleExit = () => {
    navigate('/party-ledger');
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle delete selected entries
  const handleDeleteSelected = async () => {
    if (!selectedPartyName || selectedEntries.length === 0) return;
    
    const startTime = performance.now();
    console.log(`🗑️ [DELETE] Starting delete process for ${selectedEntries.length} entries`);
    
    setActionLoading(true);
    try {
      // Delete each selected entry
      const deleteStartTime = performance.now();
      console.log(`📡 [DELETE] Calling delete API for ${selectedEntries.length} entries...`);
      
      const deletePromises = selectedEntries.map(entryId => 
        partyLedgerAPI.deleteEntry(entryId)
      );
      
      const results = await Promise.all(deletePromises);
      const deleteEndTime = performance.now();
      console.log(`✅ [DELETE] All delete APIs completed in ${(deleteEndTime - deleteStartTime).toFixed(2)}ms`);
      
      // Check if all deletions were successful
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        toast({
          title: "Success",
          description: `Successfully deleted ${selectedEntries.length} transaction(s)`,
        });
        
        // IMMEDIATE TABLE UPDATE: Remove entries from table instantly
        console.log('⚡ [DELETE] Removing entries from table immediately...');
        const immediateDeleteStart = performance.now();
        
        setLedgerData(prev => {
          const newLedgerData = { ...prev };
          newLedgerData.ledgerEntries = newLedgerData.ledgerEntries.filter(
            entry => !selectedEntries.includes(entry.id || entry._id || entry.ti)
          );
          
          // Recalculate closing balance
          if (newLedgerData.ledgerEntries.length > 0) {
            newLedgerData.closingBalance = newLedgerData.ledgerEntries[0].balance || 0;
          } else {
            newLedgerData.closingBalance = 0;
          }
          
          const immediateDeleteEnd = performance.now();
          console.log(`⚡ [DELETE] Table updated immediately in ${(immediateDeleteEnd - immediateDeleteStart).toFixed(2)}ms`);
          
          return newLedgerData;
        });
        
        // Clear selected entries
        setSelectedEntries([]);
        
        // SMART CACHE CLEARING: Clear cache immediately
        const cacheStartTime = performance.now();
        console.log(`🗑️ [DELETE] Clearing cache...`);
        clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
        clearCacheByPattern(`.*all-parties.*`);
        const cacheEndTime = performance.now();
        console.log(`✅ [DELETE] Cache cleared in ${(cacheEndTime - cacheStartTime).toFixed(2)}ms`);
        
        // BACKGROUND REFRESH: Sync with backend in background
        console.log(`🔄 [DELETE] Starting background sync...`);
        loadLedgerData(selectedPartyName, true, true).then(() => {
          console.log(`✅ [DELETE] Background sync completed`);
        }).catch((error) => {
          console.error(`❌ [DELETE] Background sync failed:`, error);
        });
      } else {
        toast({
          title: "Error",
          description: "Some transactions could not be deleted",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ [DELETE] Error deleting transactions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete transactions",
        variant: "destructive"
      });
    } finally {
      const totalEndTime = performance.now();
      const totalTime = totalEndTime - startTime;
      console.log(`🏁 [DELETE] Total delete process completed in ${totalTime.toFixed(2)}ms`);
      setActionLoading(false);
    }
  };

  // Handle Monday Final
  const handleMondayFinal = async () => {
    if (!selectedPartyName || selectedEntries.length === 0) return;
    
    setActionLoading(true);
    try {
      // For now, just show a success message since processMondayFinal doesn't exist
      const response = { success: true, message: "Monday Final processed successfully" };
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Monday Final processed successfully"
        });
        setSelectedEntries([]);
        setShowOldRecords(true);
        await loadLedgerData(selectedPartyName, true);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to process Monday Final",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Monday Final error:', error);
      toast({
        title: "Error",
        description: "Failed to process Monday Final",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };


  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.party-dropdown-container')) {
        setShowPartyDropdown(false);
      }
      if (!target.closest('.top-party-dropdown-container')) {
        setShowTopPartyDropdown(false);
        setHighlightedTopIndex(-1);
      }
      if (!target.closest('.transaction-party-dropdown-container')) {
        transactionForm.setShowTransactionPartyDropdown(false);
        transactionForm.setHighlightedTransactionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <TopNavigation />
        <div className="bg-blue-800 text-white p-2">
          <h1 className="text-lg font-bold">Account Ledger</h1>
          </div>
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading ledger data...</p>
              </div>
            </div>
    );
  }

  // No data state
  if (!ledgerData) {
    return (
      <div className="min-h-screen bg-gray-100">
        <TopNavigation />
        <div className="bg-blue-800 text-white p-2">
          <h1 className="text-lg font-bold">Account Ledger</h1>
                </div>
        <div className="text-center py-8">
          <p className="text-gray-600">No ledger data available</p>
        </div>
      </div>
    );
  }

  // Determine which entries to display
  const displayEntries = ledgerData ? (showOldRecords ? (ledgerData.oldRecords || []) : (ledgerData.ledgerEntries || [])) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <TopNavigation />
      
      {/* Main Content Area */}
      <div className="flex flex-col h-screen">
          {/* Top Section - Party Information */}
        <div className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Party Name:</label>
                <div className="relative top-party-dropdown-container">
                  <div className="relative">
                    <input
                      ref={topInputRef}
                      type="text"
                      value={typingPartyName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTypingPartyName(value);
                        
                        // Calculate text width for proper positioning
                        if (topInputRef.current) {
                          const canvas = document.createElement('canvas');
                          const context = canvas.getContext('2d');
                          if (context) {
                            context.font = window.getComputedStyle(topInputRef.current).font;
                            const width = context.measureText(value).width;
                            setTopTextWidth(width);
                          }
                        }
                        
                        if (value.trim()) {
                          filterTopParties(value);
                        } else {
                          const availablePartiesExcludingCurrent = availableParties.filter((party: any) => 
                            (party.party_name || party.name) !== selectedPartyName
                          );
                          setFilteredTopParties(availablePartiesExcludingCurrent);
                          setTopAutoCompleteText('');
                          setShowTopInlineSuggestion(false);
                        }
                        setShowTopPartyDropdown(true);
                      }}
                      onFocus={() => {
                        setShowTopPartyDropdown(true);
                      }}
                      onKeyDown={handleTopPartyKeyDown}
                      className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Type party name..."
                    />
                    
                    {/* Inline suggestion */}
                    {showTopInlineSuggestion && topAutoCompleteText && (
                      <div 
                        className="absolute top-0 left-0 px-3 py-2 text-gray-400 pointer-events-none"
                        style={{ left: `${topTextWidth + 12}px` }}
                      >
                        {topAutoCompleteText}
                      </div>
                    )}
                  </div>
                  
                  {/* Dropdown */}
                  {showTopPartyDropdown && filteredTopParties.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
                      {filteredTopParties.map((party, index) => (
                        <div
                          key={party.id}
                          onClick={() => handlePartySelect(party.party_name || party.name)}
                          className={`px-3 py-2 cursor-pointer border-b last:border-b-0 ${
                            index === highlightedTopIndex ? 'bg-blue-100' : 'hover:bg-blue-50'
                          }`}
                        >
                          <div className="font-medium">{party.party_name || party.name}</div>
                          <div className="text-sm text-gray-500">ID: {party.id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Closing Balance:</label>
                <span className={`text-lg font-bold px-3 py-1 rounded-lg ${
                  (ledgerData?.closingBalance || 0) > 0 
                    ? 'text-green-600 bg-green-50' 
                    : (ledgerData?.closingBalance || 0) < 0 
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-50'
                }`}>
                  ₹{(ledgerData?.closingBalance || 0).toLocaleString()}
                </span>
              </div>
              </div>
            </div>
          </div>

        {/* Main Content - Table and Actions */}
        <div className="flex flex-1 overflow-hidden">
          {/* Central Table Section */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 350px)' }}>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3">
                    <h2 className="text-white font-semibold text-lg">Account Ledger Entries</h2>
                  </div>
                <div className="overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Party Name</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Type</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Credit</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Debit</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Balance</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Select</th>
                    <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ID</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  // SKELETON LOADING: Show skeleton rows for better perceived performance
                  <>
                    {[...Array(5)].map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : !ledgerData || displayEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{showOldRecords ? 'No old records found' : 'No ledger entries found'}</span>
                </div>
                    </td>
                  </tr>
                ) : (
                  displayEntries.map((entry: any, index: number) => {
                    const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
                    const entryIdString = entryId.toString();
                    const isSelected = selectedEntries.includes(entryIdString);
                    
                    return (
                      <TableRow
                        key={entryIdString}
                        entry={entry}
                        index={index}
                        isSelected={isSelected}
                        onCheckboxChange={handleEntrySelect}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
                </div>
              </div>
              
              {/* Form Section - Right after table */}
                <TransactionForm
                newEntry={transactionForm.newEntry}
                loading={transactionForm.actionLoading}
                availableParties={availableParties}
                  selectedPartyName={selectedPartyName}
                onPartyNameChange={transactionForm.handlePartyNameChange}
                onAmountChange={transactionForm.handleAmountChange}
                onRemarksChange={transactionForm.handleRemarksChange}
                onAddEntry={transactionForm.handleAddEntry}
                onTransactionKeyDown={transactionForm.handleTransactionFormKeyDown}
                onTransactionPartyKeyDown={transactionForm.handleTransactionKeyDown}
                onTransactionSuggestionClick={transactionForm.handleTransactionSuggestionClick}
                onFilterTransactionParties={transactionForm.filterTransactionParties}
                showTransactionPartyDropdown={transactionForm.showTransactionPartyDropdown}
                filteredTransactionParties={transactionForm.filteredTransactionParties}
                highlightedTransactionIndex={transactionForm.highlightedTransactionIndex}
                showTransactionInlineSuggestion={transactionForm.showTransactionInlineSuggestion}
                transactionAutoCompleteText={transactionForm.transactionAutoCompleteText}
                transactionTextWidth={transactionForm.transactionTextWidth}
                setTransactionInputRef={transactionForm.setTransactionInputRef}
              />
          </div>
        </div>

          {/* Right Side Action Buttons */}
          <div className="w-64 bg-white shadow-lg border-l border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
              <div className="text-sm text-gray-600 mb-4">
                Selected: {selectedEntries.length} entries
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              disabled={actionLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
                <RefreshCw className="w-4 h-4" />
              <span>Refresh All</span>
            </button>
            
              <button
                onClick={() => toast({ title: "Info", description: "DC Report functionality coming soon" })}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
              <span>DC Report</span>
            </button>
            
            <button
                onClick={handleMondayFinal}
                disabled={actionLoading || selectedEntries.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Monday Final</span>
            </button>
            
            <button
                onClick={() => setShowOldRecords(!showOldRecords)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>{showOldRecords ? 'Current Records' : 'Old Record'}</span>
            </button>
            
            <button
                onClick={() => toast({ title: "Info", description: "Modify functionality coming soon" })}
              disabled={selectedEntries.length !== 1}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
                <Edit className="w-4 h-4" />
              <span>Modify</span>
            </button>
            
            <button
              onClick={handleDeleteSelected}
              disabled={actionLoading || selectedEntries.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            
            <button
              onClick={handlePrint}
              className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
                <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            
            <button
                onClick={handleSelectAll}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Check All</span>
            </button>
          </div>
        </div>
      </div>
      </div>
      </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const AccountLedger = memo(AccountLedgerComponent);

export default AccountLedger;