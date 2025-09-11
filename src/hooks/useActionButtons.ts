import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { partyLedgerAPI } from '@/lib/api';
import { LedgerEntry } from '@/types';

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
  setActionLoading: (loading: boolean) => void;
  loadLedgerData: (showLoading: boolean, forceRefresh: boolean) => Promise<void>;
  refreshBalanceColumn: () => Promise<void>;
  setDeletedEntryIds: (ids: Set<string>) => void;
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
  setActionLoading,
  loadLedgerData,
  refreshBalanceColumn,
  setDeletedEntryIds
}: UseActionButtonsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // Handle modify entry
  const handleModifyEntry = useCallback(async (entry: LedgerEntry) => {
    setActionLoading(true);
    try {
      const entryId = entry.id || entry._id || entry.ti;
      if (!entryId) {
        toast({
          title: "Error",
          description: "No entry ID found for modification",
          variant: "destructive"
        });
        return;
      }

      const updateData = {
        remarks: entry.remarks,
        credit: entry.tnsType === 'CR' ? parseFloat(String(entry.credit || '0')) : 0,
        debit: entry.tnsType === 'DR' ? parseFloat(String(entry.debit || '0')) : 0,
        tnsType: entry.tnsType
      };
      
      const response = await partyLedgerAPI.updateEntry(entryId, updateData as any);
      
      if (response.success) {
        // Optimize: Immediate UI update without full reload
        setEditingEntry(null);
        setSelectedEntries([]);
        setActionLoading(false); // Clear loading immediately
        toast({ title: "Success", description: "Entry modified successfully" });
        
        // Background refresh for balance updates
        setTimeout(async () => {
          await refreshBalanceColumn();
        }, 100);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to modify entry",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Modify entry error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to modify entry",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  }, [toast, loadLedgerData, setEditingEntry, setSelectedEntries, setActionLoading]);

  // Handle delete entry
  const handleDeleteEntry = useCallback(async (entry: LedgerEntry) => {
    setActionLoading(true);
    try {
      const entryId = entry.id || entry._id || entry.ti;
      if (!entryId) {
        toast({
          title: "Error",
          description: "No entry ID found for deletion",
          variant: "destructive"
        });
        return;
      }
      
      const response = await partyLedgerAPI.deleteEntry(entryId);
      
      if (response.success) {
        // Optimize: Immediate UI update without full reload
        const entryId = (entry.id || entry._id || entry.ti || '').toString();
        setDeletedEntryIds(prev => new Set([...prev, entryId]));
        setEntryToDelete(null);
        setSelectedEntries([]);
        setActionLoading(false); // Clear loading immediately
        toast({ title: "Success", description: "Entry deleted successfully" });
        
        // Background refresh for balance updates
        setTimeout(async () => {
          await refreshBalanceColumn();
          // Don't clear deleted entries - keep them hidden permanently
        }, 100);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete entry",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Delete entry error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  }, [toast, loadLedgerData, setEntryToDelete, setSelectedEntries, setActionLoading]);

  // Handle Monday Final action
  const handleMondayFinal = useCallback(async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one entry",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    try {
      // Get selected entries data
      const selectedEntriesData = currentEntries.filter(entry => 
        selectedEntries.includes((entry.id || entry._id || entry.ti || '').toString())
      );

      // Call Monday Final API
      const response = await partyLedgerAPI.updateMondayFinal([selectedPartyName]);
      
      if (response.success) {
        toast({
          title: "Monday Final Completed",
          description: `Successfully processed ${response.data?.updatedCount || selectedEntries.length} entries`,
        });
        
        setSelectedEntries([]);
        setShowMondayFinalModal(false);
        await loadLedgerData(false, true);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to process Monday Final action",
          variant: "destructive"
        });
      }
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
  }, [selectedEntries, currentEntries, selectedPartyName, toast, loadLedgerData, setSelectedEntries, setShowMondayFinalModal, setActionLoading]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleRefresh started...');
    
    try {
      // Show immediate feedback
      toast({
        title: "Refreshing...",
        description: "Updating ledger data",
      });
      
      // Start refresh in background
      loadLedgerData(false, true).then(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`✅ ACTION: handleRefresh completed in ${duration.toFixed(2)}ms`);
        
        toast({
          title: "Refreshed",
          description: "Ledger data has been refreshed",
        });
      }).catch((error) => {
        console.error('Refresh error:', error);
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`❌ ACTION: handleRefresh failed in ${duration.toFixed(2)}ms`);
        
        toast({
          title: "Error",
          description: "Failed to refresh data",
          variant: "destructive"
        });
      });
      
    } catch (error) {
      console.error('Refresh error:', error);
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`❌ ACTION: handleRefresh failed in ${duration.toFixed(2)}ms`);
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

  return {
    handleSelectAll,
    handleCheckAll,
    handleModifyEntry,
    handleDeleteEntry,
    handleMondayFinal,
    handleRefresh,
    handlePrint,
    handleExit,
    handleDCReport,
    handleCommissionAutoFill
  };
};
