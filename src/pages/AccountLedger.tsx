import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { ledgerSlice } from '../store/slices/ledgerSlice';
import { partiesSlice } from '../store/slices/partiesSlice';
import { uiSlice } from '../store/slices/uiSlice';
import { partyLedgerAPI, unsettleTransactions } from '../lib/api';
import { 
  fetchPartyLedger, 
  addLedgerEntry, 
  deleteLedgerEntries, 
  refreshLedgerData,
  applyOptimisticAdd,
  applyOptimisticDelete
} from '../store/services/ledgerService';
import { fetchAllParties, filterParties } from '../store/services/partiesService';
import { hasCommission, getCommissionRate, calculateCommissionAmount } from '../utils/partyUtils';
import { useToast } from '@/hooks/use-toast';
import TopNavigation from '@/components/TopNavigation';
import LedgerTable from '@/components/LedgerTable';
import TransactionForm from '@/components/TransactionForm';
import ActionButtons from '@/components/ActionButtons';
import PartySelector from '@/components/PartySelector';
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
import { Loader2 } from 'lucide-react';



const AccountLedgerComponent = () => {
  const navigate = useNavigate();
  const { partyName: initialPartyName } = useParams<{ partyName: string }>();
  const { toast } = useToast();

  // Redux dispatch
  const dispatch = useAppDispatch();

  // Redux state - actually connected now!
  const authState = useAppSelector(state => state.auth) as any;
  const ledgerState = useAppSelector(state => state.ledger) as any;
  const partiesState = useAppSelector(state => state.parties) as any;
  const uiState = useAppSelector(state => state.ui) as any;

  // Fallback values for Redux state
  const { user, companyName } = authState || {};
  const {
    data: ledgerData,
    isLoading: loading = false,
    selectedPartyName = initialPartyName || '',
    filters = { showOldRecords: false }
  } = ledgerState || {};
  
  const {
    availableParties = [],
    filteredTopParties = [],
    isLoading: partiesLoading = false
  } = partiesState || {};
  const {
    isActionLoading: actionLoading = false,
    selectedEntries = [],
    showTopPartyDropdown = false,
    typingPartyName = initialPartyName || '',
    topAutoCompleteText = '',
    showTopInlineSuggestion = false,
    topHighlightedIndex = -1,
    // Transaction form states
    newEntryPartyName = '',
    newEntryAmount = '',
    newEntryRemarks = '',
    showTransactionPartyDropdown = false,
    transactionFilteredParties = [],
    transactionHighlightedIndex = -1,
    transactionAutoCompleteText = '',
    showTransactionInlineSuggestion = false,
    isAddingEntry = false
  } = uiState || {};

  // Show loading if Redux state is not properly initialized - temporarily disabled
  // if (!ledgerState || !partiesState || !uiState) {
  //   return (
  //     <div className="min-h-screen bg-gray-50">
  //       <div className="bg-blue-800 text-white p-2">
  //         <h1 className="text-lg font-bold">Account Ledger</h1>
  //       </div>
  //       <div className="text-center py-8">
  //         <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
  //         <p className="text-gray-600">Initializing application...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Local state for delete functionality
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Extract showOldRecords with default
  const showOldRecords = filters?.showOldRecords || false;




  // Load available parties on component mount using Redux Thunk
  const loadAvailableParties = useCallback(async () => {
    if (!companyName) return;

    try {
      const result = await dispatch(fetchAllParties());
      if (fetchAllParties.fulfilled.match(result)) {
      } else {
        console.error('❌ Failed to load parties via Redux:', result.payload);
      }
    } catch (error) {
      console.error('❌ Error loading parties via Redux:', error);
    }
  }, [companyName, dispatch]);


  // Initialize data on component mount
  useEffect(() => {
    if (initialPartyName) {
      const decodedPartyName = decodeURIComponent(initialPartyName);
      dispatch(ledgerSlice.actions.setSelectedPartyName(decodedPartyName));
      dispatch(uiSlice.actions.setTypingPartyName(decodedPartyName));
    }

    if (companyName) {
      loadAvailableParties();
    }
  }, [initialPartyName, companyName, loadAvailableParties]);

  // Update Redux typing state when selected party changes (only if not currently typing)
  useEffect(() => {
    // Only update if we're not currently in typing mode and the selected party changed
    if (selectedPartyName && selectedPartyName !== typingPartyName && !showTopPartyDropdown) {
      dispatch(uiSlice.actions.setTypingPartyName(selectedPartyName));
    }
  }, [selectedPartyName, typingPartyName, showTopPartyDropdown]);

  // Load ledger data when selected party changes using Redux Thunk
  useEffect(() => {
    if (selectedPartyName) {
      // Load ledger data for the selected party using Redux Thunk
      const loadLedgerData = async () => {
        try {
          const result = await dispatch(fetchPartyLedger(selectedPartyName));
          if (fetchPartyLedger.fulfilled.match(result)) {
            setRefreshKey(prev => prev + 1); // Force table re-render
          } else {
            console.error('❌ Failed to load ledger data via Redux:', result.payload);
          }
        } catch (error) {
          console.error('❌ Error loading ledger data via Redux:', error);
        }
      };
      
      loadLedgerData();
    }
  }, [selectedPartyName, dispatch]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Add small delay to ensure focus events happen first
      setTimeout(() => {
        // Handle top section dropdown
        if (!target.closest('.top-party-dropdown-container')) {
          dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
          dispatch(uiSlice.actions.setTopAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
          
          // If input is empty, restore selected party name
          if (!typingPartyName && selectedPartyName) {
            dispatch(uiSlice.actions.setTypingPartyName(selectedPartyName));
          }
        }
        
        // Handle transaction form dropdown
        if (!target.closest('.transaction-party-dropdown-container')) {
          dispatch(uiSlice.actions.setShowTransactionPartyDropdown(false));
          dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
        }
      }, 10); // Small delay to let focus events complete
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [typingPartyName, selectedPartyName]);

  // Redux handlers - now with actual functionality
  const handleEntrySelect = (id: string | number, checked: boolean) => {
    if (checked) {
      dispatch(uiSlice.actions.addSelectedEntry(String(id)));
      } else {
      dispatch(uiSlice.actions.removeSelectedEntry(String(id)));
    }
  };

  // Party Selection Functions using Redux with Auto-complete
  const handlePartyNameChange = (value: string) => {
    // Update Redux typing state for immediate UI feedback
    dispatch(uiSlice.actions.setTypingPartyName(value));

    // Update Redux search term for filtering
    dispatch(partiesSlice.actions.setTopSearchTerm(value));

    // Reset highlighted index when typing
    dispatch(uiSlice.actions.setTopHighlightedIndex(-1));

    // Filter parties based on input
    if (value.trim()) {
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();
        
        // Exclude current party
        if (partyName === selectedPartyName) return false;
        
        // Check if party name starts with search term
        return partyLower.startsWith(searchLower);
      });

      // Sort by relevance (exact matches first, then alphabetical)
      const sortedFiltered = filtered.sort((a, b) => {
        const aName = (a.party_name || a.name).toLowerCase();
        const bName = (b.party_name || b.name).toLowerCase();
        const searchLower = value.toLowerCase();
        
        // Exact match gets highest priority
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        // Then alphabetical order
        return aName.localeCompare(bName);
      });

      dispatch(partiesSlice.actions.setFilteredTopParties(sortedFiltered));

      // Auto-complete suggestion logic - find the best match
      if (sortedFiltered.length > 0) {
        const bestMatch = sortedFiltered[0];
        const partyName = bestMatch.party_name || bestMatch.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();
        
        // Only show suggestion if it's a meaningful completion
        if (partyLower.startsWith(searchLower) && 
            partyLower !== searchLower && 
            partyName.length > value.length) {
          const autoCompleteText = partyName.substring(value.length);
          dispatch(uiSlice.actions.setTopAutoCompleteText(autoCompleteText));
          dispatch(uiSlice.actions.setShowTopInlineSuggestion(true));
      } else {
          dispatch(uiSlice.actions.setTopAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      }
    } else {
        dispatch(uiSlice.actions.setTopAutoCompleteText(''));
        dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      }

      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
    } else {
      // Show all available parties when input is empty
      const availablePartiesExcludingCurrent = availableParties.filter(party =>
        (party.party_name || party.name) !== selectedPartyName
      );
      dispatch(partiesSlice.actions.setFilteredTopParties(availablePartiesExcludingCurrent));
      dispatch(uiSlice.actions.setTopAutoCompleteText(''));
      dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
    }
  };

  // Show dropdown when input is focused
  const handleInputFocus = () => {
    // Show dropdown when input is focused (don't clear the name)
    if (availableParties.length > 0) {
      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
      // Filter and show all available parties
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        return partyName.toLowerCase().includes(typingPartyName.toLowerCase());
      });
      dispatch(partiesSlice.actions.setFilteredTopParties(filtered));
    }
  };

  // Calculate text width for proper auto-complete positioning
  const calculateTextWidth = (text: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 16; // Default padding
    
    // Use the same font as the input field
    context.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    return context.measureText(text).width + 16; // 16px for padding
  };

  const handlePartySelect = (partyName: string) => {
    // Navigate to the new party URL
    navigate(`/account-ledger/${encodeURIComponent(partyName)}`);
    
    // Update Redux state for selected party
    dispatch(ledgerSlice.actions.setSelectedPartyName(partyName));

    // Update Redux typing state
    dispatch(uiSlice.actions.setTypingPartyName(partyName));

    // Close dropdown and clear search
    dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
    dispatch(partiesSlice.actions.setTopSearchTerm(''));

    // Clear autocomplete
    dispatch(uiSlice.actions.setTopAutoCompleteText(''));
    dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
    dispatch(uiSlice.actions.setTopHighlightedIndex(-1));

    // Show success toast
      toast({
      title: "Party Selected",
      description: `Loading ledger for ${partyName}`,
      duration: 2000,
    });

    // Load ledger data for the selected party will be handled by useEffect
  };

  // Auto-complete functionality - Tab key to accept suggestion
  const handleAutoComplete = () => {
    if (filteredTopParties.length > 0) {
      const selectedParty = filteredTopParties[0];
      const partyName = selectedParty.party_name || selectedParty.name;
      handlePartySelect(partyName);
    }
  };

  // Tab completion functionality - Tab key to accept suggestion
  const handleTabComplete = () => {
    if (showTopInlineSuggestion && topAutoCompleteText) {
      const currentValue = typingPartyName;
      const completedValue = currentValue + topAutoCompleteText;
      
      // Find the party that matches this completed value
      const matchingParty = filteredTopParties.find(party => {
        const partyName = party.party_name || party.name;
        return partyName.toLowerCase() === completedValue.toLowerCase();
      });
      
      if (matchingParty) {
        handlePartySelect(matchingParty.party_name || matchingParty.name);
          } else {
        // Fallback: just update the input without navigation
        dispatch(uiSlice.actions.setTypingPartyName(completedValue));
        dispatch(uiSlice.actions.setTopAutoCompleteText(''));
        dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
        dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
      }
    }
  };

  // Transaction Form Party Selection Functions
  const handleTransactionPartyNameChange = (value: string) => {
    // Update Redux state for transaction form
    dispatch(uiSlice.actions.setNewEntryPartyName(value));
    
    // Reset highlighted index when typing
    dispatch(uiSlice.actions.setTransactionHighlightedIndex(-1));

    // Filter parties based on input (exclude current party)
    if (value.trim()) {
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();
        
        // Exclude current party from transaction form
        if (partyName === selectedPartyName) {
          return false;
        }
        
        // Check if party name starts with search term
        return partyLower.startsWith(searchLower);
      });

      // Sort by relevance (exact matches first, then alphabetical)
      const sortedFiltered = filtered.sort((a, b) => {
        const aName = (a.party_name || a.name).toLowerCase();
        const bName = (b.party_name || b.name).toLowerCase();
        const searchLower = value.toLowerCase();
        
        // Exact match gets highest priority
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        // Then alphabetical order
        return aName.localeCompare(bName);
      });

      dispatch(uiSlice.actions.setTransactionFilteredParties(sortedFiltered));

      // Auto-complete suggestion logic
      if (sortedFiltered.length > 0) {
        const bestMatch = sortedFiltered[0];
        const partyName = bestMatch.party_name || bestMatch.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();
        
        if (partyLower.startsWith(searchLower) && 
            partyLower !== searchLower && 
            partyName.length > value.length) {
          const autoCompleteText = partyName.substring(value.length);
          dispatch(uiSlice.actions.setTransactionAutoCompleteText(autoCompleteText));
          dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(true));
      } else {
          dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
      }
    } else {
        dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
        dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
      }

      dispatch(uiSlice.actions.setShowTransactionPartyDropdown(true));
    } else {
      // Show all available parties when input is empty
      dispatch(uiSlice.actions.setTransactionFilteredParties(availableParties));
      dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
      dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
      dispatch(uiSlice.actions.setShowTransactionPartyDropdown(true));
    }
  };

  const handleTransactionPartySelect = (partyName: string) => {
    // Update Redux state for transaction form
    dispatch(uiSlice.actions.setNewEntryPartyName(partyName));

    // Close dropdown and clear search
    dispatch(uiSlice.actions.setShowTransactionPartyDropdown(false));

    // Clear autocomplete
    dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
    dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
    dispatch(uiSlice.actions.setTransactionHighlightedIndex(-1));

    // Focus on amount input
    const amountInput = document.querySelector('input[placeholder*="Credit"], input[placeholder*="Debit"]') as HTMLInputElement;
    if (amountInput) {
      amountInput.focus();
    }
  };

  // Helper function to calculate cumulative commission amount for same party
  const calculateCumulativeCommission = (partyName: string, currentAmount: number): number => {
    if (!ledgerData || !Array.isArray(ledgerData)) return 0;
    
    // Filter entries for the same party and same day, excluding commission entries
    const today = new Date().toISOString().split('T')[0];
    const samePartyEntries = ledgerData.filter((entry: any) => 
      entry.partyName === partyName && 
      entry.date === today &&
      !entry.remarks?.toLowerCase().includes('commission')
    );
    
    // Calculate total amount for the same party today
    const totalAmount = samePartyEntries.reduce((sum: number, entry: any) => {
      return sum + Math.abs(entry.amount || 0);
    }, 0) + Math.abs(currentAmount);
    
    return totalAmount;
  };

  const handleAddEntry = async () => {
    // Set loading state
    dispatch(uiSlice.actions.setIsAddingEntry(true));
    
    // Validate required fields
    if (!newEntryPartyName.trim()) {
      dispatch(uiSlice.actions.setIsAddingEntry(false));
      toast({
        title: "Party Name Required",
        description: "Please select a party for the transaction.",
        variant: "destructive",
      });
      return;
    }

    // Validate that transaction party is different from current party
    if (newEntryPartyName.trim() === selectedPartyName) {
      dispatch(uiSlice.actions.setIsAddingEntry(false));
      toast({
        title: "Invalid Transaction",
        description: "A party cannot make transactions with itself. Please select a different party.",
        variant: "destructive",
      });
            return;
    }

    if (!newEntryAmount.trim()) {
      dispatch(uiSlice.actions.setIsAddingEntry(false));
      toast({
        title: "Amount Required",
        description: "Please enter an amount for the transaction.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newEntryAmount);
    if (isNaN(amount) || amount === 0) {
      dispatch(uiSlice.actions.setIsAddingEntry(false));
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid non-zero amount.",
        variant: "destructive",
      });
      return;
    }
    
    // Find the selected party to check commission
    const selectedParty = availableParties.find(party => 
      (party.party_name || party.name) === newEntryPartyName.trim()
    );

    // 🚀 OPTIMISTIC UPDATE: Create temporary entries for immediate UI feedback
    
    const today = new Date().toISOString().split('T')[0];
    const tempId = `temp_${Date.now()}`;
    
    // Create optimistic main transaction entry
    const optimisticMainEntry = {
      _id: tempId,
      id: tempId,
      ti: tempId,
      date: today,
      partyName: newEntryPartyName.trim(), // Show the party we're transacting with
      remarks: newEntryRemarks.trim() || '',
      amount: Math.abs(amount),
      credit: amount > 0 ? Math.abs(amount) : 0,
      debit: amount < 0 ? Math.abs(amount) : 0,
      balance: 0, // Will be calculated properly after API response
      tnsType: amount > 0 ? 'CR' : 'DR',
      type: amount > 0 ? 'Credit' : 'Debit',
      isOptimistic: true, // Flag for UI styling
      involvedParty: newEntryPartyName.trim()
    };

    // Calculate commission if party has commission enabled
    let optimisticCommissionEntry = null;
    if (selectedParty && hasCommission(selectedParty) && amount > 0) {
      const commissionRate = getCommissionRate(selectedParty);
      const cumulativeAmount = calculateCumulativeCommission(newEntryPartyName.trim(), amount);
      const totalCommissionAmount = calculateCommissionAmount(cumulativeAmount, selectedParty);
      
      if (totalCommissionAmount > 0) {
        const commissionType = selectedParty.commiSystem;
        const commissionAmountValue = commissionType === 'Take' ? -totalCommissionAmount : totalCommissionAmount;
        const commissionTypeLabel = commissionType === 'Take' ? 'DR' : 'CR';
        
        optimisticCommissionEntry = {
          _id: `temp_${Date.now() + 1}`,
          id: `temp_${Date.now() + 1}`,
          ti: `temp_${Date.now() + 1}`,
          date: today,
          partyName: selectedPartyName,
          remarks: `Commission (${commissionRate}%) - ${commissionType} - Total: ₹${cumulativeAmount.toLocaleString()}`,
          amount: Math.abs(commissionAmountValue),
          credit: commissionTypeLabel === 'CR' ? Math.abs(commissionAmountValue) : 0,
          debit: commissionTypeLabel === 'DR' ? Math.abs(commissionAmountValue) : 0,
          balance: 0,
          tnsType: commissionTypeLabel,
          type: commissionTypeLabel === 'CR' ? 'Credit' : 'Debit',
          isOptimistic: true,
          involvedParty: 'Commission'
        };
      }
    }

    // Update UI immediately with optimistic entries
    const currentEntries = ledgerData?.ledgerEntries || [];
    const newEntries = [optimisticMainEntry];
    if (optimisticCommissionEntry) {
      newEntries.push(optimisticCommissionEntry);
    }
    
    // Create optimistic involved entry for dual-party transactions
    const optimisticInvolvedEntry = {
      _id: `temp_involved_${Date.now()}`,
      id: `temp_involved_${Date.now()}`,
      ti: `temp_involved_${Date.now()}`,
      date: today,
      partyName: selectedPartyName,
      remarks: '',
      amount: Math.abs(amount),
      credit: amount < 0 ? Math.abs(amount) : 0,
      debit: amount > 0 ? Math.abs(amount) : 0,
      balance: amount < 0 ? Math.abs(amount) : -Math.abs(amount),
      tnsType: amount < 0 ? 'CR' : 'DR',
      type: amount < 0 ? 'Credit' : 'Debit',
      isOptimistic: true,
      involvedParty: selectedPartyName,
      temp: true
    };
    
    // Don't add involved entry to current table - it belongs to different party
    if (newEntryPartyName.trim() !== selectedPartyName) {
      console.log('🔍 Dual-party transaction detected - involved entry will be created in separate party table:', optimisticInvolvedEntry);
      console.log('🔍 Main Party:', selectedPartyName, 'will show main entry');
      console.log('🔍 Involved Party:', newEntryPartyName.trim(), 'will show involved entry in their own table');
    }
    
    const updatedEntries = [...currentEntries, ...newEntries];
    
    // Calculate new balance (simple calculation for optimistic update)
    const currentBalance = ledgerData?.totalBalance || 0;
    let newBalance = currentBalance + amount;
    
    if (optimisticCommissionEntry) {
      newBalance += optimisticCommissionEntry.amount * (optimisticCommissionEntry.tnsType === 'DR' ? -1 : 1);
    }
    
    // For dual-party transactions, don't double-count the involved entry balance
    // (it's already accounted for in the main transaction)
    
    const updatedLedgerData = {
      ...ledgerData,
      ledgerEntries: updatedEntries,
      totalBalance: newBalance,
      totalCredit: (ledgerData?.totalCredit || 0) + (amount > 0 ? amount : 0) + (optimisticCommissionEntry?.tnsType === 'CR' ? optimisticCommissionEntry.amount : 0),
      totalDebit: (ledgerData?.totalDebit || 0) + (amount < 0 ? Math.abs(amount) : 0) + (optimisticCommissionEntry?.tnsType === 'DR' ? optimisticCommissionEntry.amount : 0),
    };

    // Update Redux state immediately
    dispatch(ledgerSlice.actions.setLedgerData(updatedLedgerData));
    setRefreshKey(prev => prev + 1);
    

    // Create main transaction entry for API
    const newEntry = {
      _id: tempId,
      date: today,
      partyName: newEntryPartyName.trim(),
      remarks: newEntryRemarks.trim(),
      amount: amount,
      type: amount > 0 ? 'Credit' : 'Debit',
      balance: 0,
    };

    // Calculate commission if party has commission enabled
    let commissionEntry = null;
    if (selectedParty && hasCommission(selectedParty) && amount > 0) {
      const commissionRate = getCommissionRate(selectedParty);
      
      // Calculate cumulative amount for commission calculation
      const cumulativeAmount = calculateCumulativeCommission(newEntryPartyName.trim(), amount);
      const totalCommissionAmount = calculateCommissionAmount(cumulativeAmount, selectedParty);
      
      // Check if commission entry already exists for today
      const today = new Date().toISOString().split('T')[0];
      const existingCommissionEntry = ledgerData && Array.isArray(ledgerData) 
        ? ledgerData.find((entry: any) => 
            entry.partyName === newEntryPartyName.trim() && 
            entry.date === today &&
            entry.remarks?.toLowerCase().includes('commission')
          )
        : null;
      
      if (totalCommissionAmount > 0) {
        const commissionType = selectedParty.commiSystem; // 'Take' or 'Give'
        
        // Commission amount based on party's commission type
        let commissionAmountValue;
        let commissionTypeLabel;
        
        if (commissionType === 'Take') {
          // Take commission = negative amount (debit)
          commissionAmountValue = -totalCommissionAmount;
          commissionTypeLabel = 'Debit';
      } else {
          // Give commission = positive amount (credit)
          commissionAmountValue = totalCommissionAmount;
          commissionTypeLabel = 'Credit';
        }
        
        // Create or update commission entry
        if (existingCommissionEntry) {
          // Update existing commission entry with new total
          commissionEntry = {
            ...existingCommissionEntry,
            remarks: `Commission (${commissionRate}%) - ${commissionType} - Total: ₹${cumulativeAmount.toLocaleString()}`,
            amount: commissionAmountValue,
            type: commissionTypeLabel,
          };
    } else {
          // Create new commission entry
          commissionEntry = {
            _id: `temp_${Date.now() + 1}`, // Temporary ID
            date: today,
            partyName: newEntryPartyName.trim(),
            remarks: `Commission (${commissionRate}%) - ${commissionType} - Total: ₹${cumulativeAmount.toLocaleString()}`,
            amount: commissionAmountValue,
            type: commissionTypeLabel,
            balance: 0, // Will be calculated by backend
          };
        }
      }
    }

    // Now perform actual API calls
    const transactionsCreated = [];
    
    try {
      const mainEntryData = {
        partyName: newEntryPartyName.trim(), // Show the party we're transacting with
        amount: Math.abs(amount),
        remarks: newEntryRemarks.trim() || '',
        tnsType: (amount > 0 ? 'CR' : 'DR') as 'CR' | 'DR',
        credit: amount > 0 ? Math.abs(amount) : 0,
        debit: amount < 0 ? Math.abs(amount) : 0,
        date: today,
        ti: `GROUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        involvedParty: newEntryPartyName.trim()
      };

      // Use Redux Thunk action for adding entry
      const result = await dispatch(addLedgerEntry({
        entryData: mainEntryData,
        optimisticEntry: optimisticMainEntry,
        commissionEntry: optimisticCommissionEntry,
        involvedEntry: newEntryPartyName.trim() !== selectedPartyName ? optimisticInvolvedEntry : null,
        selectedPartyName: selectedPartyName // Pass selected party name for involved entry correction
      }));
      
      if (addLedgerEntry.fulfilled.match(result)) {
        console.log('✅ Entry added successfully via Redux:', result.payload);
        console.log('🔍 Real Entry IDs from Backend:', {
          mainId: result.payload.mainEntry._id,
          commissionId: result.payload.commissionEntry?._id,
          involvedId: result.payload.involvedEntry?._id
        });
        
        if (result.payload.involvedEntry) {
          console.log('🔍 Dual-party transaction detected!');
          console.log('🔍 Main Party:', selectedPartyName, 'Entry ID:', result.payload.mainEntry._id);
          console.log('🔍 Main Entry Party Name:', result.payload.mainEntry.partyName);
          console.log('🔍 Involved Party:', result.payload.involvedEntry.party_name || result.payload.involvedEntry.partyName, 'Entry ID:', result.payload.involvedEntry._id);
          console.log('🔍 Involved Entry Party Name:', result.payload.involvedEntry.party_name || result.payload.involvedEntry.partyName);
          console.log('✅ Both entries created successfully - each will appear in their respective party tables');
        } else {
          console.log('⚠️ No involved entry found - single party transaction only');
        }
        transactionsCreated.push(`📤 ${selectedPartyName} ↔ ${newEntryPartyName.trim()}: ${amount > 0 ? 'Credit' : 'Debit'} ₹${Math.abs(amount).toLocaleString()}`);
        
        // Add commission transaction message if exists
        if (optimisticCommissionEntry && result.payload.commissionEntry) {
          transactionsCreated.push(`💰 Commission: ${optimisticCommissionEntry.type} ₹${optimisticCommissionEntry.amount.toLocaleString()}`);
        }

        // Auto-refresh after successful addition to ensure data consistency
        // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
        // setTimeout(async () => {
        //   console.log('🔄 Auto-refreshing after addition to ensure data consistency');
        //   await handleRefresh(true);
        // }, 2000); // Wait 2 seconds before refresh to allow backend transaction to commit

        // Show success message
        let successMessage = `Transaction added: ${selectedPartyName} ↔ ${newEntryPartyName.trim()}`;
        if (optimisticCommissionEntry) {
          successMessage += ` + Commission`;
        }
        
        toast({
          title: "Transaction Added Successfully",
          description: successMessage,
          duration: 2000,
        });

        // Clear form
        dispatch(uiSlice.actions.setNewEntryPartyName(''));
        dispatch(uiSlice.actions.setNewEntryAmount(''));
        dispatch(uiSlice.actions.setNewEntryRemarks(''));
        dispatch(uiSlice.actions.setIsAddingEntry(false));

        // Focus back to party name input for next entry
        setTimeout(() => {
          const partyInput = document.querySelector('input[placeholder*="Search party name"]') as HTMLInputElement;
          if (partyInput) {
            partyInput.focus();
          }
        }, 100);
        
      } else {
        console.error('❌ Failed to add entry via Redux:', result.payload);
        
        // Revert optimistic update on API failure with auto-refresh
        // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
        // setTimeout(async () => {
        //   console.log('🔄 Auto-refreshing after add failure to ensure data consistency');
        //   await handleRefresh(true);
        // }, 1000); // Wait 1 second before refresh
        
        dispatch(uiSlice.actions.setIsAddingEntry(false));
        toast({
          title: "Error",
          description: result.payload as string || "Failed to add transaction",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('❌ Error adding entry:', error);
      
      // Revert optimistic update on error with auto-refresh
      // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
      // setTimeout(async () => {
      //   console.log('🔄 Auto-refreshing after add error to ensure data consistency');
      //   await handleRefresh(true);
      // }, 1000); // Wait 1 second before refresh
      
      dispatch(uiSlice.actions.setIsAddingEntry(false));
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Delete selected entries handler with real-time updates
  const handleDeleteSelected = async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to delete.",
        variant: "destructive",
      });
      return;
    }

    // Check if any selected entries are old records AND Monday Final exists
    const entriesToDisplay = ledgerData ? (showOldRecords ? (ledgerData.oldRecords || []) : (ledgerData.ledgerEntries || [])) : [];
    const selectedOldRecords = selectedEntries.filter(entryId => {
      const entry = entriesToDisplay.find((e: any) => (e.id || e._id || e.ti) === entryId);
      return entry?.is_old_record === true;
    });

    // Only prevent deletion if Monday Final exists AND old records are selected
    if (selectedOldRecords.length > 0 && ledgerData?.mondayFinalData?.id) {
      toast({
        title: "Cannot Delete Old Records",
        description: `${selectedOldRecords.length} selected entries are old records that were settled in Monday Final. Delete the Monday Final entry first to unsettle these transactions.`,
        variant: "destructive",
      });
      setShowDeleteDialog(false);
      return;
    }

    setIsDeleting(true);

    try {
      // Use Redux Thunk action for deleting entries with optimistic updates
      
      // Apply optimistic delete immediately
      await dispatch(applyOptimisticDelete({
        deletedIds: selectedEntries,
        showOldRecords
      }));
      
      
      // Clear selected entries immediately
      dispatch(uiSlice.actions.clearSelectedEntries());
      

      // Call API to delete entries via Redux Thunk
      const result = await dispatch(deleteLedgerEntries({
        entryIds: selectedEntries,
        showOldRecords
      }));
      
      if (deleteLedgerEntries.fulfilled.match(result)) {
        console.log('✅ Entries deleted successfully via Redux:', result.payload);
        
          // Auto-refresh after successful deletion to ensure data consistency
          // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
          // setTimeout(async () => {
          //   console.log('🔄 Auto-refreshing after deletion to ensure data consistency');
          //   await handleRefresh(true);
          // }, 2000); // Wait 2 seconds before refresh to allow backend transaction to commit
        
        toast({
          title: "Entries Deleted",
          description: `Successfully deleted ${result.payload.successfulCount} entries.`,
          duration: 2000,
        });
      } else {
        console.error('❌ Failed to delete entries via Redux:', result.payload);
        
        // Revert optimistic update if deletion failed with auto-refresh
        // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
        // setTimeout(async () => {
        //   console.log('🔄 Auto-refreshing after delete failure to ensure data consistency');
        //   await handleRefresh(true);
        // }, 1000); // Wait 1 second before refresh
        
        toast({
          title: "Deletion Failed",
          description: result.payload as string || "Failed to delete entries. They might be old records or have other restrictions.",
          variant: "destructive",
          duration: 3000,
        });
      }

    } catch (error: any) {
      console.error('❌ Error deleting entries:', error);
      
      // Revert optimistic update on error with auto-refresh
      // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
      // setTimeout(async () => {
      //   console.log('🔄 Auto-refreshing after delete error to ensure data consistency');
      //   await handleRefresh(true);
      // }, 1000); // Wait 1 second before refresh
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete entries",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to delete.",
        variant: "destructive",
      });
      return;
    }
    setShowDeleteDialog(true);
  };

  // Handle check all button click
  const handleCheckAll = () => {
    // Determine which entries to display (same logic as displayEntries)
    const entriesToDisplay = ledgerData ? (showOldRecords ? (ledgerData.oldRecords || []) : (ledgerData.ledgerEntries || [])) : [];
    
    if (entriesToDisplay.length === 0) {
      toast({
        title: "No Entries",
        description: "No entries available to select.",
        variant: "destructive",
      });
      return;
    }

    // Get all entry IDs from display entries
    const allEntryIds = entriesToDisplay.map((entry: any, index: number) => {
      const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
      return typeof entryId === 'string' ? entryId : String(entryId);
    });

    // Select all entries
    dispatch(uiSlice.actions.setSelectedEntries(allEntryIds));
    
    toast({
      title: "All Entries Selected",
      description: `${allEntryIds.length} entries selected.`,
    });
  };

  // Handle Monday Final button click
  const handleMondayFinal = async () => {
    if (!selectedPartyName) {
      toast({
        title: "No Party Selected",
        description: "Please select a party first.",
        variant: "destructive",
      });
      return;
    }


    try {
      // Check if Monday Final already exists
      if (ledgerData?.mondayFinalData?.id) {
        // Delete existing Monday Final to unsettle transactions
        const response = await partyLedgerAPI.deleteMondayFinalEntry(ledgerData.mondayFinalData.id);
        
        if (response.success) {
          toast({
            title: "Monday Final Deleted",
            description: `Monday Final entry deleted. ${response.data.unsettledTransactions} transactions unsettled and moved to current records.`,
          });
          
          // Auto-refresh after successful Monday Final deletion to ensure data consistency
          // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
          // setTimeout(async () => {
          //   console.log('🔄 Auto-refreshing after Monday Final deletion to ensure data consistency');
          //   await handleRefresh(true);
          // }, 2000); // Wait 2 seconds before refresh to allow backend transaction to commit
      } else {
        toast({
          title: "Error",
            description: response.message || "Failed to delete Monday Final entry",
            variant: "destructive",
          });
        }
      } else {
        // Create new Monday Final
        const currentEntries = ledgerData?.ledgerEntries || [];
        
        if (currentEntries.length === 0) {
      toast({
            title: "No Current Entries",
            description: "No current transactions to settle. Add some transactions first.",
            variant: "destructive",
          });
          return;
        }

        const response = await unsettleTransactions([selectedPartyName]);
      
        if (response.success) {
          toast({
            title: "Monday Final Created",
            description: `${currentEntries.length} transactions settled and moved to old records.`,
          });
          
          // Auto-refresh after successful Monday Final creation to ensure data consistency
          // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
          // setTimeout(async () => {
          //   console.log('🔄 Auto-refreshing after Monday Final creation to ensure data consistency');
          //   await handleRefresh(true);
          // }, 2000); // Wait 2 seconds before refresh to allow backend transaction to commit
      } else {
        toast({
          title: "Error",
            description: response.message || "Failed to create Monday Final",
            variant: "destructive",
        });
      }
      }
    } catch (error: any) {
      console.error('❌ Error with Monday Final:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process Monday Final",
        variant: "destructive",
      });
    }
  };


  const handleRefresh = async (forceRefresh = false) => {
    if (selectedPartyName) {
      try {
        const result = await dispatch(refreshLedgerData(selectedPartyName));
        
              if (refreshLedgerData.fulfilled.match(result)) {
                console.log('✅ Ledger data refreshed successfully via Redux');
          setRefreshKey(prev => {
            const newKey = prev + 1;
            return newKey;
          });
        } else {
          console.error('❌ Failed to refresh ledger data via Redux:', result.payload);
          
          // Show user-friendly error message
          toast({
            title: "Error",
            description: result.payload as string || "Failed to refresh ledger data. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('❌ Error refreshing ledger data via Redux:', error);
        
        // Show user-friendly error message
        toast({
          title: "Error",
          description: "Failed to refresh ledger data. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.log('⚠️ No party selected, cannot refresh ledger data');
      toast({
        title: "No Party Selected",
        description: "Please select a party first to refresh ledger data.",
        variant: "destructive",
      });
    }

    // Also refresh parties
    if (companyName) {
      loadAvailableParties();
    }
  };


  const handleShowOldRecords = (checked: boolean) => {
    dispatch(ledgerSlice.actions.setFilters({ showOldRecords: checked }));
  };

  const handleExit = () => {
    navigate('/');
  };

  // Loading state - temporarily disabled for debugging
  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-gray-100">
  //       <TopNavigation />
  //       <div className="bg-blue-800 text-white p-2">
  //         <h1 className="text-lg font-bold">Account Ledger</h1>
  //         </div>
  //       <div className="text-center py-8">
  //         <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
  //         <p className="text-gray-600">Loading ledger data...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Determine which entries to display
  const displayEntries = ledgerData ? (showOldRecords ? (ledgerData.oldRecords || []) : (ledgerData.ledgerEntries || [])) : [];
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <TopNavigation />
      
      {/* Main Content Area */}
      <div className="flex flex-col h-screen">
          {/* Top Section - Party Information */}
        <div className="bg-white shadow-lg border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Party Name:</label>
                <div className="relative top-party-dropdown-container">
                  <div className="relative">
                    <input
                      type="text"
                      value={typingPartyName}
                      onChange={(e) => handlePartyNameChange(e.target.value)}
                      onFocus={handleInputFocus}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (topHighlightedIndex >= 0 && topHighlightedIndex < filteredTopParties.length) {
                            // Select highlighted party
                            const selectedParty = filteredTopParties[topHighlightedIndex];
                            handlePartySelect(selectedParty.party_name || selectedParty.name);
                          } else if (showTopInlineSuggestion && topAutoCompleteText) {
                            handleTabComplete();
                          } else if (filteredTopParties.length > 0) {
                            handleAutoComplete();
                          }
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          if (showTopInlineSuggestion && topAutoCompleteText) {
                            handleTabComplete();
                          }
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          dispatch(uiSlice.actions.setTopHighlightedIndex(
                            Math.min(topHighlightedIndex + 1, Math.min(filteredTopParties.length - 1, 9))
                          ));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          dispatch(uiSlice.actions.setTopHighlightedIndex(
                            Math.max(topHighlightedIndex - 1, -1)
                          ));
                        } else if (e.key === 'Escape') {
                          dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
                          dispatch(uiSlice.actions.setTopAutoCompleteText(''));
                          dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
                          dispatch(uiSlice.actions.setTopHighlightedIndex(-1));
                          // Clear input on Escape
                          dispatch(uiSlice.actions.setTypingPartyName(''));
                        }
                      }}
                      placeholder="Search party..."
                      className="w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent relative"
                      autoComplete="off"
                    />
                    {/* VS Code style inline suggestion */}
                    {showTopInlineSuggestion && topAutoCompleteText && (
                      <div className="absolute inset-y-0 left-0 text-gray-400 pointer-events-none z-0 flex items-center">
                        <span 
                          style={{ 
                            marginLeft: `${calculateTextWidth(typingPartyName)}px`,
                            color: '#9CA3AF',
                            fontSize: '14px',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            whiteSpace: 'nowrap'
                          }}
                      >
                        {topAutoCompleteText}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {showTopPartyDropdown && filteredTopParties.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredTopParties.slice(0, 10).map((party, index) => {
                        const partyName = party.party_name || party.name;
                        const searchTerm = typingPartyName.toLowerCase();
                        const partyNameLower = partyName.toLowerCase();
                        const isHighlighted = index === topHighlightedIndex;
                        
                        // Highlight matching text
                        const matchIndex = partyNameLower.indexOf(searchTerm);
                        const beforeMatch = partyName.substring(0, matchIndex);
                        const matchText = partyName.substring(matchIndex, matchIndex + searchTerm.length);
                        const afterMatch = partyName.substring(matchIndex + searchTerm.length);
                        
                        return (
                          <div
                            key={party._id}
                            className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                              isHighlighted 
                                ? 'bg-blue-100 border-blue-200' 
                                : 'hover:bg-blue-50'
                            }`}
                            onClick={() => handlePartySelect(partyName)}
                            onMouseEnter={() => dispatch(uiSlice.actions.setTopHighlightedIndex(index))}
                          >
                            <div className="font-medium text-gray-900">
                              {searchTerm && matchIndex !== -1 ? (
                                <>
                                  {beforeMatch}
                                  <span className="bg-yellow-200 font-bold">{matchText}</span>
                                  {afterMatch}
                                </>
                              ) : (
                                partyName
                              )}
                        </div>
                            <div className="text-sm text-gray-500">{party.companyName}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Company:</label>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {companyName}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Closing Balance:</label>
                <span className={`text-lg font-bold px-3 py-1 rounded-lg ${
                  (ledgerData?.totalBalance || 0) > 0 
                    ? 'text-green-600 bg-green-50' 
                    : (ledgerData?.totalBalance || 0) < 0 
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-50'
                }`}>
                  ₹{(ledgerData?.totalBalance || 0).toLocaleString()}
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
                <div className="overflow-auto p-4" style={{ height: 'calc(100% - 60px)' }}>
                  <LedgerTable
                    key={`${selectedPartyName}-${refreshKey}`}
                    ledgerData={ledgerData}
                    showOldRecords={showOldRecords}
                    selectedEntries={selectedEntries}
                    onEntrySelect={handleEntrySelect}
                    loading={loading}
                  />
                  {/* Debug info */}
                  <div className="text-xs text-gray-400 mt-2">
                    Debug: refreshKey={refreshKey}, party={selectedPartyName}
                  </div>
                </div>
              </div>
              
              {/* Transaction Form - Right after table */}
                <TransactionForm
                  selectedPartyName={selectedPartyName}
                onAddEntry={handleAddEntry}
              />
          </div>
        </div>

          {/* Right Side Action Buttons */}
          <div className="w-64 bg-white shadow-lg border-l border-gray-200 p-6 flex flex-col h-full">
            <ActionButtons
              onRefresh={() => handleRefresh(true)}
              onDCReport={() => {}}
              onMondayFinal={handleMondayFinal}
              onOldRecord={() => {}}
              onModify={() => {}}
              onDelete={handleDeleteClick}
              onPrint={() => {}}
              onCheckAll={handleCheckAll}
              onExit={() => {}}
            />
            </div>
          </div>
          
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEntries.length} selected entries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700" 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </div>
  );
};

export default AccountLedgerComponent;
