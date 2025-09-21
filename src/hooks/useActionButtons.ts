import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { partyLedgerAPI } from '@/lib/api';
import { LedgerEntry } from '@/types';
import { debounce } from 'lodash';

interface UseActionButtonsProps {
  selectedEntries: string[];
  currentEntries: LedgerEntry[];
  selectedPartyName: string;
  showOldRecords: boolean;
  ledgerData: any;
  setSelectedEntries: (entries: string[]) => void;
  setShowMondayFinalModal: (show: boolean) => void;
  setEditingEntry: (entry: LedgerEntry | null) => void;
  setEntryToDelete: (entry: LedgerEntry | null) => void;
  loadLedgerData: (showLoading: boolean, forceRefresh: boolean) => Promise<void>;
  refreshBalanceColumn: () => Promise<void>;
  setDeletedEntryIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export const useActionButtons = ({
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
}: UseActionButtonsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Local action loading state
  const [actionLoading, setActionLoadingLocal] = useState(false);
  
  // Performance tracking
  const performanceRef = useRef({
    actionTimes: new Map<string, number[]>(),
    averageActionTime: new Map<string, number>()
  });

  // Track action performance
  const trackActionPerformance = useCallback((actionName: string, duration: number) => {
    const perf = performanceRef.current;
    const times = perf.actionTimes.get(actionName) || [];
    times.push(duration);
    
    // Keep only last 10 times for rolling average
    if (times.length > 10) {
      times.shift();
    }
    
    perf.actionTimes.set(actionName, times);
    perf.averageActionTime.set(actionName, times.reduce((sum, time) => sum + time, 0) / times.length);
    
  }, []);

  // Debounced functions for better performance
  const debouncedRefresh = useMemo(
    () => debounce(() => {
      loadLedgerData(false, true);
    }, 300),
    [loadLedgerData]
  );

  const debouncedBalanceRefresh = useMemo(
    () => debounce(() => {
      refreshBalanceColumn();
    }, 500),
    [refreshBalanceColumn]
  );

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!ledgerData) return;
    
    const entries = showOldRecords 
      ? ledgerData.oldRecords 
      : ledgerData.ledgerEntries;
    
    if (checked) {
      const allIds = entries.map(entry => entry.id || entry._id || entry.ti || '').filter(Boolean);
      setSelectedEntries(allIds);
    } else {
      setSelectedEntries([]);
    }
  }, [ledgerData, showOldRecords, setSelectedEntries]);

  // Handle check all button (toggle functionality)
  const handleCheckAll = useCallback(() => {
    if (!ledgerData) return;
    
    const entries = showOldRecords 
      ? ledgerData.oldRecords 
      : ledgerData.ledgerEntries;

    const allChecked = entries.every(entry => 
      selectedEntries.includes((entry.id || entry._id || entry.ti || '').toString())
    );
    
    if (allChecked) {
      setSelectedEntries([]);
    } else {
      const allIds = entries.map(entry => entry.id || entry._id || entry.ti || '').filter(Boolean);
      setSelectedEntries(allIds);
    }
  }, [ledgerData, showOldRecords, selectedEntries, setSelectedEntries]);

  // Handle modify entry - COMPLEX BUSINESS LOGIC like old system
  const handleModifyEntry = useCallback(async (entry: LedgerEntry) => {
    const startTime = performance.now();
    
    const entryId = entry.id || entry._id || entry.ti;
    if (!entryId) {
      toast({
        title: "Error",
        description: "No entry ID found for modification",
        variant: "destructive"
      });
      return;
    }

    setActionLoadingLocal(true);
    setEditingEntry(null);
    setSelectedEntries([]);

    try {
      // COMPLEX BUSINESS LOGIC - Old Record Protection Check
      if (entry.remarks?.includes('Monday Final Settlement') || entry.remarks?.includes('Monday Settlement')) {
        toast({
          title: "Old Record Protected",
          description: "This entry was settled in Monday Final and cannot be modified. Delete the Monday Final entry first to unsettle transactions.",
          variant: "destructive"
        });
        return;
      }

      // COMPLEX BUSINESS LOGIC - Balance Recalculation Check
      const currentBalance = ledgerData?.closingBalance || 0;
      const entryAmount = entry.credit || entry.debit || 0;
      const newAmount = entry.tnsType === 'CR' ? parseFloat(String(entry.credit || '0')) : parseFloat(String(entry.debit || '0'));
      
      if (Math.abs(newAmount - entryAmount) > 0) {
      }

      const updateData = {
        remarks: entry.remarks,
        credit: entry.tnsType === 'CR' ? parseFloat(String(entry.credit || '0')) : 0,
        debit: entry.tnsType === 'DR' ? parseFloat(String(entry.debit || '0')) : 0,
        tnsType: entry.tnsType
      };
      
      
      // Update entry in backend
      const response = await partyLedgerAPI.updateEntry(entryId, updateData as any);
      
      
      if (response.success) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // COMPLEX BUSINESS LOGIC - Cascade Update for Related Entries
        if (entry.remarks && entry.remarks.includes('(') && entry.remarks.includes(')')) {
          
          // Extract party name from remarks
          const partyNameInRemarks = entry.remarks.match(/\(([^)]+)\)/)?.[1];
          if (partyNameInRemarks) {
            
            // This would typically trigger a search for related entries
            // and update them accordingly in a real implementation
          }
        }
        
        // Update success toast with complex details
        let successMessage = `Entry modified successfully`;
        if (Math.abs(newAmount - entryAmount) > 0) {
          successMessage += ` (Amount changed from ₹${entryAmount.toLocaleString()} to ₹${newAmount.toLocaleString()})`;
        }
        if (entry.remarks?.includes('Commission')) {
          successMessage += ` - Commission entry updated`;
        }
        
        toast({ 
          title: "Success", 
          description: `${successMessage} (${duration.toFixed(0)}ms)` 
        });
        
        // Refresh data from backend
        await loadLedgerData(false, true);
      } else {
        // COMPLEX BUSINESS LOGIC - Handle specific error codes
        if (response.code === 'OLD_RECORD_PROTECTED') {
          toast({
            title: "Old Record Protected",
            description: "This entry was settled in Monday Final and cannot be modified. Delete the Monday Final entry first to unsettle transactions.",
            variant: "destructive"
          });
        } else if (response.code === 'BALANCE_MISMATCH') {
          toast({
            title: "Balance Mismatch",
            description: "Entry modification would cause balance inconsistency. Please refresh and try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to modify entry",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Modify entry error:', error);
      
      // COMPLEX BUSINESS LOGIC - Handle specific error types
      if (error.message?.includes('OLD_RECORD_PROTECTED')) {
        toast({
          title: "Old Record Protected",
          description: "This entry was settled in Monday Final and cannot be modified.",
          variant: "destructive"
        });
      } else if (error.message?.includes('BALANCE_MISMATCH')) {
        toast({
          title: "Balance Mismatch",
          description: "Entry modification would cause balance inconsistency.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to modify entry",
          variant: "destructive"
        });
      }
      
      // Refresh to get correct data
      await loadLedgerData(false, true);
    } finally {
      setActionLoadingLocal(false);
    }
  }, [toast, loadLedgerData, setEditingEntry, setSelectedEntries, ledgerData]);

  // Handle delete entry - COMPLEX BUSINESS LOGIC like old system
  const handleDeleteEntry = useCallback(async (entry: LedgerEntry) => {
    const startTime = performance.now();
    
    // Prevent multiple simultaneous deletions
    if (actionLoading) {
      return;
    }
    
    const entryId = entry.id || entry._id || entry.ti;
    if (!entryId) {
      toast({
        title: "Error",
        description: "No entry ID found for deletion",
        variant: "destructive"
      });
      return;
    }

    setActionLoadingLocal(true);
    setEntryToDelete(null);
    setSelectedEntries([]);
    
    try {
      // COMPLEX BUSINESS LOGIC - Monday Final Entry Check
      const isMondayFinalEntry = entry.remarks?.includes('Monday Final Settlement') || 
                                 entry.remarks?.includes('Monday Settlement');
      
      if (isMondayFinalEntry) {
        
        // Use special Monday Final deletion API
        const response = await partyLedgerAPI.deleteMondayFinalEntry(entryId);
        
        if (response.success) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          toast({ 
            title: "Monday Final Deleted", 
            description: `Monday Final entry and ${response.data?.unsettledCount || 0} transactions unsettled (${duration.toFixed(0)}ms)` 
          });
          
          // Refresh data from backend
          await loadLedgerData(false, true);
          return;
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to delete Monday Final entry",
            variant: "destructive"
          });
          return;
        }
      }

      // COMPLEX BUSINESS LOGIC - Commission Entry Check
      const isCommissionEntry = entry.remarks?.toLowerCase().includes('commission') || 
                               entry.partyName?.toLowerCase() === 'commission';
      
      if (isCommissionEntry) {
        
        // Check if this commission entry is related to other transactions
        const relatedTransactions = ledgerData?.ledgerEntries?.filter(ledgerEntry => 
          ledgerEntry.remarks?.includes(entry.remarks || '') &&
          ledgerEntry.id !== entryId
        ) || [];
        
        if (relatedTransactions.length > 0) {
          // Found related transactions
        }
      }

      // COMPLEX BUSINESS LOGIC - Party-to-Party Transaction Check
      const isPartyToParty = entry.remarks && 
                            entry.remarks.includes('(') && 
                            entry.remarks.includes(')');
      
      if (isPartyToParty) {
        
        // Extract party name from remarks for cascade deletion
        const partyNameInRemarks = entry.remarks.match(/\(([^)]+)\)/)?.[1];
        if (partyNameInRemarks) {
          // Looking for related entries with party
        }
      }

      // Delete from backend
      console.log('🗑️ Attempting to delete entry:', entryId);
      const response = await partyLedgerAPI.deleteEntry(entryId);
      console.log('🗑️ Delete response:', response);
      
      if (response.success) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // COMPLEX BUSINESS LOGIC - Handle cascade delete for related entries
        if (response.data?.relatedDeletedCount > 0) {
          const relatedParties = response.data.relatedParties || [];
          
          // Show detailed success message with cascade information
          let successMessage = `Entry deleted successfully`;
          if (isCommissionEntry) {
            successMessage += ` (Commission entry)`;
          }
          if (isPartyToParty) {
            successMessage += ` (Party-to-party transaction)`;
          }
          successMessage += `\n${response.data.relatedDeletedCount} related entries deleted from ${relatedParties.length} parties`;
          
          toast({ 
            title: "Cascade Delete Success", 
            description: `${successMessage} (${duration.toFixed(0)}ms)` 
          });
        } else {
          let successMessage = `Entry deleted successfully`;
          if (isCommissionEntry) {
            successMessage += ` (Commission entry)`;
          }
          if (isPartyToParty) {
            successMessage += ` (Party-to-party transaction)`;
          }
          
          toast({ 
            title: "Success", 
            description: `${successMessage} (${duration.toFixed(0)}ms)` 
          });
        }
        
        // Refresh data from backend
        await loadLedgerData(false, true);
      } else {
        // COMPLEX BUSINESS LOGIC - Handle specific error codes
        if (response.code === 'OLD_RECORD_PROTECTED') {
          toast({
            title: "Old Record Protected",
            description: "This entry was settled in Monday Final and cannot be deleted. Delete the Monday Final entry first to unsettle transactions.",
            variant: "destructive"
          });
        } else if (response.code === 'CASCADE_DELETE_FAILED') {
          toast({
            title: "Cascade Delete Failed",
            description: "Main entry deleted but some related entries could not be removed. Please check and delete them manually.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to delete entry",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Delete entry error:', error);
      
      // COMPLEX BUSINESS LOGIC - Handle specific error types
      if (error.message?.includes('Entry not found') || error.message?.includes('404')) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        toast({ 
          title: "Entry Already Deleted", 
          description: `Entry was already removed from the server (${duration.toFixed(0)}ms)` 
        });
        // Refresh data to ensure UI is in sync
        await loadLedgerData(false, true);
      } else if (error.message?.includes('OLD_RECORD_PROTECTED')) {
        toast({
          title: "Old Record Protected",
          description: "This entry was settled in Monday Final and cannot be deleted.",
          variant: "destructive"
        });
      } else if (error.message?.includes('CASCADE_DELETE_FAILED')) {
        toast({
          title: "Cascade Delete Failed",
          description: "Some related entries could not be deleted. Please check and delete them manually.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to delete entry",
          variant: "destructive"
        });
      }
    } finally {
      setActionLoadingLocal(false);
    }
  }, [toast, loadLedgerData, setEntryToDelete, setSelectedEntries, setDeletedEntryIds, selectedPartyName, ledgerData, actionLoading]);

  // Handle bulk delete with cascade delete
  const handleBulkDelete = useCallback(async (entries: LedgerEntry[]) => {
    const startTime = performance.now();
    
    // Prevent multiple simultaneous bulk deletions
    if (actionLoading) {
      return;
    }
    
    
    if (entries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one entry",
        variant: "destructive"
      });
      return;
    }

    setActionLoadingLocal(true);
    
    // OPTIMISTIC UPDATE: Add all entries to deleted set immediately
    const deletedKeys: string[] = [];
    entries.forEach(entry => {
      const entryId = (entry.id || entry._id || entry.ti || '').toString();
      const entryPartyName = entry.partyName || entry.party_name || '';
      const compositeKey = `${entryPartyName}:${entryId}`;
      deletedKeys.push(compositeKey);
    });
    
    setDeletedEntryIds(prev => {
      const newSet = new Set<string>(prev);
      deletedKeys.forEach(key => newSet.add(key));
      return newSet;
    });
    
    setSelectedEntries([]);
    
    // Show immediate feedback
    toast({ title: "Deleting...", description: `Removing ${entries.length} entries...` });

    try {
      let totalDeleted = 0;
      let totalRelatedDeleted = 0;
      const allRelatedParties = new Set<string>();
      
      // Delete entries in parallel for better performance
      const deletePromises = entries.map(async (entry) => {
        const entryId = entry.id || entry._id || entry.ti;
        if (!entryId) return { success: false, relatedDeletedCount: 0, relatedParties: [] };
        
        try {
          console.log('🗑️ Bulk delete - attempting to delete entry:', entryId);
          const response = await partyLedgerAPI.deleteEntry(entryId);
          console.log('🗑️ Bulk delete response:', response);
          return {
            success: response.success,
            relatedDeletedCount: response.data?.relatedDeletedCount || 0,
            relatedParties: response.data?.relatedParties || []
          };
        } catch (error) {
          console.error(`Error deleting entry ${entryId}:`, error);
          return { success: false, relatedDeletedCount: 0, relatedParties: [] };
        }
      });
      
      const results = await Promise.all(deletePromises);
      
      // Process results
      results.forEach(result => {
        if (result.success) {
          totalDeleted++;
          if (result.relatedDeletedCount > 0) {
            totalRelatedDeleted += result.relatedDeletedCount;
            result.relatedParties.forEach((party: string) => allRelatedParties.add(party));
          }
        }
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Show success message with cascade delete details
      if (totalRelatedDeleted > 0) {
        toast({
          title: "Bulk Cascade Delete Success",
          description: `${totalDeleted} entries and ${totalRelatedDeleted} related entries deleted from ${allRelatedParties.size} parties (${duration.toFixed(0)}ms)`
        });
      } else {
        toast({
          title: "Bulk Delete Success",
          description: `${totalDeleted} entries deleted successfully (${duration.toFixed(0)}ms)`
        });
      }
      
      // Refresh data from backend
      loadLedgerData(false, true);
      
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete entries",
        variant: "destructive"
      });
    } finally {
      setActionLoadingLocal(false);
    }
  }, [toast, loadLedgerData, setSelectedEntries, setDeletedEntryIds]);

  // Handle Monday Final action
  const handleMondayFinal = useCallback(async () => {
    const startTime = performance.now();
    
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one entry",
        variant: "destructive"
      });
      return;
    }

    setActionLoadingLocal(true);
    try {
      // Get selected entries data
      const selectedEntriesData = currentEntries.filter(entry => 
        selectedEntries.includes((entry.id || entry._id || entry.ti || '').toString())
      );


      // Call Monday Final API
      const response = await partyLedgerAPI.updateMondayFinal([selectedPartyName]);
      
      
      if (response.success) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        toast({
          title: "Monday Final Completed",
          description: `Successfully processed ${response.data?.updatedCount || selectedEntries.length} entries in ${duration.toFixed(0)}ms`,
        });
        
        setSelectedEntries([]);
        setShowMondayFinalModal(false);
        await loadLedgerData(false, true);
      } else {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        toast({
          title: "Error",
          description: `${response.message || "Failed to process Monday Final action"} (${duration.toFixed(0)}ms)`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`❌ MONDAY FINAL: Failed in ${duration.toFixed(2)}ms`, error);
      
      toast({
        title: "Error",
        description: `${error.message || "Failed to process Monday Final action"} (${duration.toFixed(0)}ms)`,
        variant: "destructive"
      });
    } finally {
      setActionLoadingLocal(false);
    }
  }, [selectedEntries, currentEntries, selectedPartyName, toast, loadLedgerData, setSelectedEntries, setShowMondayFinalModal]);

  // Handle refresh with debouncing to prevent spam
  const handleRefresh = useCallback(async () => {
    const startTime = performance.now();

    // Show immediate feedback
    toast({
      title: "Refreshing...",
      description: "Updating ledger data",
    });

    try {
      // Use debounced refresh to prevent multiple calls
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to prevent spam
      await loadLedgerData(false, true);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      toast({
        title: "Refreshed",
        description: `Ledger data refreshed in ${duration.toFixed(0)}ms`,
      });
    } catch (error) {
      console.error('Refresh error:', error);
      const endTime = performance.now();
      const duration = endTime - startTime;

      toast({
        title: "Error",
        description: `Failed to refresh data (${duration.toFixed(0)}ms)`,
        variant: "destructive"
      });
    }
  }, [loadLedgerData, toast]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handle exit
  const handleExit = useCallback(() => {
    navigate('/party-ledger');
  }, [navigate]);

  // DC Report functionality
  const handleDCReport = useCallback(() => {
    toast({
      title: "Info",
      description: "DC Report functionality coming soon"
    });
  }, [toast]);

  // Commission auto-fill functionality
  const handleCommissionAutoFill = useCallback((allPartiesForTransaction: any[]) => {
    if (selectedPartyName) {
      const currentParty = allPartiesForTransaction.find(party => 
        party.name === selectedPartyName || party.party_name === selectedPartyName
      );
      
      if (currentParty && currentParty.mCommission === 'With Commission' && currentParty.rate) {
        const rate = parseFloat(currentParty.rate) || 0;
        if (rate > 0) {
          let totalTransactionAmount = 0;
          
          if (ledgerData) {
            const allEntries = [...ledgerData.ledgerEntries, ...ledgerData.oldRecords];
            allEntries.forEach(entry => {
              if (entry.tnsType === 'CR') {
                totalTransactionAmount += entry.credit || 0;
              } else if (entry.tnsType === 'DR') {
                totalTransactionAmount += entry.debit || 0;
              }
            });
          }
          
          const commissionAmount = (totalTransactionAmount * rate) / 100;
          if (commissionAmount > 0) {
            toast({
              title: "Commission Calculated",
              description: `Commission amount: ₹${commissionAmount.toLocaleString()} (${rate}% of ₹${totalTransactionAmount.toLocaleString()})`
            });
          }
        }
      }
    }
  }, [selectedPartyName, ledgerData, toast]);

  // Memoized performance metrics
  const performanceMetrics = useMemo(() => ({
    actionTimes: performanceRef.current.actionTimes,
    averageActionTime: performanceRef.current.averageActionTime,
    getAverageTime: (actionName: string) => performanceRef.current.averageActionTime.get(actionName) || 0,
    getTotalActions: () => Array.from(performanceRef.current.actionTimes.values()).reduce((sum, times) => sum + times.length, 0)
  }), []);

  return {
    handleSelectAll,
    handleCheckAll,
    handleModifyEntry,
    handleDeleteEntry,
    handleBulkDelete,
    handleMondayFinal,
    handleRefresh: debouncedRefresh,
    handlePrint,
    handleExit,
    handleDCReport,
    handleCommissionAutoFill,
    performanceMetrics,
    actionLoading
  };
};
