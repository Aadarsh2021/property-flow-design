import { useState, useCallback } from 'react';
import { partyLedgerAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Party } from '@/types';
import { clearCacheByPattern } from '@/lib/apiCache';

interface UseTransactionFormProps {
  selectedPartyName: string;
  availableParties: Party[];
  onRefreshLedger: () => Promise<void>;
  onImmediateTableUpdate?: (entry: any) => void;
}

export const useTransactionFormNew = ({
  selectedPartyName,
  availableParties,
  onRefreshLedger,
  onImmediateTableUpdate
}: UseTransactionFormProps) => {
  const { toast } = useToast();
  
  // Form state
  const [newEntry, setNewEntry] = useState({
    amount: '',
    partyName: '',
    remarks: '',
  });

  // Auto-suggestion state
  const [showTransactionPartyDropdown, setShowTransactionPartyDropdown] = useState(false);
  const [filteredTransactionParties, setFilteredTransactionParties] = useState<Party[]>([]);
  const [highlightedTransactionIndex, setHighlightedTransactionIndex] = useState(-1);
  const [transactionAutoCompleteText, setTransactionAutoCompleteText] = useState('');
  const [showTransactionInlineSuggestion, setShowTransactionInlineSuggestion] = useState(false);
  const [transactionTextWidth, setTransactionTextWidth] = useState(0);
  const [transactionInputRef, setTransactionInputRef] = useState<HTMLInputElement | null>(null);

  // Loading state
  const [actionLoading, setActionLoading] = useState(false);

  // Filter transaction parties function
  const filterTransactionParties = useCallback((searchTerm: string) => {
    console.log('🔍 [DROPDOWN] Filtering parties with search term:', searchTerm);
    console.log('🔍 [DROPDOWN] Available parties:', availableParties.length);
    
    if (!searchTerm.trim()) {
      // Show all parties when empty (for focus)
      setFilteredTransactionParties(availableParties.slice(0, 10)); // Limit to 10 for performance
      setShowTransactionPartyDropdown(availableParties.length > 0);
      setTransactionAutoCompleteText('');
      setShowTransactionInlineSuggestion(false);
      console.log('🔍 [DROPDOWN] Showing all parties, dropdown:', availableParties.length > 0);
      return;
    }
    
    const filtered = availableParties.filter((party: any) =>
      (party.party_name || party.name).toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTransactionParties(filtered);
    setShowTransactionPartyDropdown(filtered.length > 0);
    
    // Auto-complete logic
    const exactMatch = filtered.find((party: any) =>
      (party.party_name || party.name).toLowerCase() === searchTerm.toLowerCase()
    );
    
    if (filtered.length > 0 && !exactMatch) {
      const firstMatch = filtered[0];
      const matchName = firstMatch.party_name || firstMatch.name;
      if (matchName.toLowerCase().startsWith(searchTerm.toLowerCase())) {
        setTransactionAutoCompleteText(matchName.substring(searchTerm.length));
        setShowTransactionInlineSuggestion(true);
      } else {
        setTransactionAutoCompleteText('');
        setShowTransactionInlineSuggestion(false);
      }
    } else {
      setTransactionAutoCompleteText('');
      setShowTransactionInlineSuggestion(false);
    }
  }, [availableParties]);

  // Handle transaction party suggestion click
  const handleTransactionSuggestionClick = useCallback((party: Party) => {
    const partyName = (party as any).party_name || party.name;
    setNewEntry(prev => ({ ...prev, partyName }));
    setShowTransactionPartyDropdown(false);
    setTransactionAutoCompleteText('');
    setShowTransactionInlineSuggestion(false);
    setHighlightedTransactionIndex(-1);
  }, []);

  // Handle add entry
  const handleAddEntry = useCallback(async () => {
    if (!selectedPartyName || !newEntry.amount) return;
    
    const startTime = performance.now();
    console.log('🚀 [TRANSACTION] Starting add entry process...');
    
    setActionLoading(true);
    
    // OPTIMISTIC UPDATE: Clear form immediately for better UX
    const tempNewEntry = { ...newEntry };
    setNewEntry({ partyName: '', amount: '', remarks: '' });
    
    try {
      const amount = parseFloat(tempNewEntry.amount);
      const absoluteAmount = Math.abs(amount);
      const tnsType = amount > 0 ? 'CR' : 'DR';
      
      let finalRemarks = '';
      const partyName = tempNewEntry.partyName?.trim() || '';
      const remarks = tempNewEntry.remarks?.trim() || '';
      
      if (partyName && remarks) {
        finalRemarks = `${partyName}(${remarks})`;
      } else if (partyName) {
        finalRemarks = partyName;
      } else if (remarks) {
        finalRemarks = remarks;
      } else {
        finalRemarks = 'Transaction';
      }

      // Prepare entry data for API
      const entryData = {
        partyName: selectedPartyName,
        date: new Date().toISOString().split('T')[0],
        remarks: finalRemarks,
        tnsType: tnsType,
        credit: tnsType === 'CR' ? absoluteAmount : 0,
        debit: tnsType === 'DR' ? absoluteAmount : 0,
        ti: `TXN_${Date.now()}`
      };

      // GRACEFUL DEGRADATION: Try main API first, then dual party if needed
      const apiStartTime = performance.now();
      console.log('📡 [TRANSACTION] Calling main API first...');
      
      // Try main API first
      const response = await partyLedgerAPI.addEntry(entryData);
      const apiEndTime = performance.now();
      console.log(`✅ [TRANSACTION] Main API completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms`);
      
      // If main API succeeds and there's a dual party, try it separately
      if (response.success && partyName && partyName.trim() !== selectedPartyName) {
        const dualPartyData = {
          partyName: partyName,
          date: new Date().toISOString().split('T')[0],
          remarks: `Transaction with ${selectedPartyName}`,
          tnsType: tnsType === 'CR' ? 'DR' : 'CR',
          credit: tnsType === 'CR' ? 0 : absoluteAmount,
          debit: tnsType === 'CR' ? absoluteAmount : 0,
          ti: `TXN_${Date.now() + 1}`
        };
        
        try {
          const dualStartTime = performance.now();
          console.log('🔄 [TRANSACTION] Creating dual party transaction...');
          await partyLedgerAPI.addEntry(dualPartyData);
          const dualEndTime = performance.now();
          console.log(`✅ [TRANSACTION] Dual party API completed in ${(dualEndTime - dualStartTime).toFixed(2)}ms`);
        } catch (dualError) {
          console.error('⚠️ [TRANSACTION] Dual party transaction failed, but main transaction succeeded:', dualError);
          // Don't fail the main transaction if dual party fails
        }
      }
      
      if (response.success) {
        const successMessage = partyName && partyName.trim() !== selectedPartyName 
          ? `Dual party transaction added successfully (${selectedPartyName} ↔ ${partyName})`
          : "Transaction added successfully";
        
        toast({
          title: "Success",
          description: successMessage,
        });
        
        // IMMEDIATE TABLE UPDATE: Update table instantly with optimistic data
        console.log('⚡ [TRANSACTION] Updating table immediately...');
        const immediateUpdateStart = performance.now();
        
        // Create optimistic entry for immediate table update
        const optimisticEntry = {
          id: `temp_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          remarks: finalRemarks,
          credit: tnsType === 'CR' ? absoluteAmount : 0,
          debit: tnsType === 'DR' ? absoluteAmount : 0,
          balance: 0, // Will be calculated by backend
          isOptimistic: true // Flag for optimistic update
        };
        
        // Call immediate table update callback
        if (onImmediateTableUpdate) {
          onImmediateTableUpdate(optimisticEntry);
        }
        
        const immediateUpdateEnd = performance.now();
        console.log(`⚡ [TRANSACTION] Table updated immediately in ${(immediateUpdateEnd - immediateUpdateStart).toFixed(2)}ms`);
        
        // SMART CACHING: Clear cache and refresh in background
        const cacheStartTime = performance.now();
        console.log('🗑️ [TRANSACTION] Clearing cache...');
        clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
        if (partyName && partyName.trim() !== selectedPartyName) {
          clearCacheByPattern(`.*party-ledger.*${partyName}.*`);
        }
        clearCacheByPattern(`.*all-parties.*`);
        const cacheEndTime = performance.now();
        console.log(`✅ [TRANSACTION] Cache cleared in ${(cacheEndTime - cacheStartTime).toFixed(2)}ms`);
        
        // BACKGROUND REFRESH: Sync with backend in background
        console.log('🔄 [TRANSACTION] Starting background sync...');
        onRefreshLedger().then(() => {
          console.log('✅ [TRANSACTION] Background sync completed');
        }).catch((error) => {
          console.error('❌ [TRANSACTION] Background sync failed:', error);
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add transaction",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ [TRANSACTION] Error adding transaction:', error);
      
      // ERROR RECOVERY: Restore form data if transaction failed
      setNewEntry(tempNewEntry);
      
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive"
      });
    } finally {
      const totalEndTime = performance.now();
      const totalTime = totalEndTime - startTime;
      console.log(`🏁 [TRANSACTION] Total add entry process completed in ${totalTime.toFixed(2)}ms`);
      setActionLoading(false);
    }
  }, [selectedPartyName, newEntry, toast, onRefreshLedger]);

  // Form handlers
  const handlePartyNameChange = useCallback((value: string) => {
    console.log('🔍 [CHANGE] Party name changed to:', value);
    setNewEntry(prev => ({ ...prev, partyName: value }));
    
    // Calculate text width for proper positioning
    if (transactionInputRef) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        context.font = window.getComputedStyle(transactionInputRef).font;
        const width = context.measureText(value).width;
        setTransactionTextWidth(width);
      }
    }
    
    if (value.trim()) {
      console.log('🔍 [CHANGE] Filtering parties with value');
      filterTransactionParties(value);
    } else {
      console.log('🔍 [CHANGE] Clearing suggestions (empty value)');
      setFilteredTransactionParties([]);
      setTransactionAutoCompleteText('');
      setShowTransactionInlineSuggestion(false);
    }
    setShowTransactionPartyDropdown(true);
    console.log('🔍 [CHANGE] Dropdown set to true');
  }, [filterTransactionParties]);

  const handleAmountChange = useCallback((value: string) => {
    setNewEntry(prev => ({ ...prev, amount: value }));
  }, []);

  const handleRemarksChange = useCallback((value: string) => {
    setNewEntry(prev => ({ ...prev, remarks: value }));
  }, []);

  // Handle transaction form keyboard navigation
  const handleTransactionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showTransactionPartyDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedTransactionIndex(prev => 
          prev < filteredTransactionParties.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedTransactionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedTransactionIndex >= 0 && filteredTransactionParties[highlightedTransactionIndex]) {
          handleTransactionSuggestionClick(filteredTransactionParties[highlightedTransactionIndex]);
        } else if (filteredTransactionParties.length === 1) {
          handleTransactionSuggestionClick(filteredTransactionParties[0]);
        }
        break;
      case 'Escape':
        setShowTransactionPartyDropdown(false);
        setHighlightedTransactionIndex(-1);
        break;
      case 'Tab':
        if (highlightedTransactionIndex >= 0 && filteredTransactionParties[highlightedTransactionIndex]) {
          e.preventDefault();
          handleTransactionSuggestionClick(filteredTransactionParties[highlightedTransactionIndex]);
        }
        break;
    }
  }, [showTransactionPartyDropdown, filteredTransactionParties, highlightedTransactionIndex, handleTransactionSuggestionClick]);

  // Handle transaction form Enter key
  const handleTransactionFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showTransactionPartyDropdown) {
      e.preventDefault();
      if (newEntry.amount) {
        handleAddEntry();
      }
    }
  }, [showTransactionPartyDropdown, newEntry.amount, handleAddEntry]);

  return {
    // Form state
    newEntry,
    actionLoading,
    
    // Auto-suggestion state
    showTransactionPartyDropdown,
    filteredTransactionParties,
    highlightedTransactionIndex,
    transactionAutoCompleteText,
    showTransactionInlineSuggestion,
    transactionTextWidth,
    
    // Handlers
    handlePartyNameChange,
    handleAmountChange,
    handleRemarksChange,
    handleAddEntry,
    handleTransactionKeyDown,
    handleTransactionFormKeyDown,
    handleTransactionSuggestionClick,
    filterTransactionParties,
    setTransactionInputRef,
    
    // Setters for external control
    setShowTransactionPartyDropdown,
    setHighlightedTransactionIndex
  };
};
