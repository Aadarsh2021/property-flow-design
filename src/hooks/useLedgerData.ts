import { useState, useCallback, useEffect } from 'react';
import { partyLedgerAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LedgerEntry, LedgerData } from '@/types';

interface UseLedgerDataProps {
  selectedPartyName: string;
  showOldRecords: boolean;
  setShowOldRecords: (show: boolean) => void;
}

export const useLedgerData = ({
  selectedPartyName,
  showOldRecords,
  setShowOldRecords
}: UseLedgerDataProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<{
    ledgerEntries: LedgerEntry[];
    oldRecords: LedgerEntry[];
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
  const [forceUpdate, setForceUpdate] = useState(0);

  // Transform entry data
  const transformEntry = useCallback((entry: any): LedgerEntry => {
    return {
      id: entry.id || entry._id || entry.ti || `entry_${Date.now()}`,
      date: entry.date || new Date().toISOString().split('T')[0],
      remarks: entry.remarks || entry.remark || 'Transaction',
      tnsType: entry.tnsType || entry.transaction_type || 'DR',
      credit: parseFloat(entry.credit) || 0,
      debit: parseFloat(entry.debit) || 0,
      balance: parseFloat(entry.balance) || 0,
      partyName: entry.partyName || entry.party_name || selectedPartyName,
      is_old_record: entry.is_old_record || false,
      ti: entry.ti || entry.id || entry._id
    };
  }, [selectedPartyName]);

  // Load ledger data
  const loadLedgerData = useCallback(async (showLoading = true, forceRefresh = false) => {
    if (!selectedPartyName) return;
    
    if (loading && !forceRefresh) return;
    
    // Don't show loading for background refreshes
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      // Fast API call with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const response = await Promise.race([
        partyLedgerAPI.getPartyLedger(selectedPartyName),
        timeoutPromise
      ]);
      
      if (response.success && response.data) {
        const responseData = response.data;
        
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
        
        setLedgerData(transformedData);
        setForceUpdate(prev => prev + 1);
        
        // Auto-enable old records view if all transactions are settled
        if (transformedData.ledgerEntries.length === 0 && transformedData.oldRecords.length > 0) {
          setShowOldRecords(true);
        } else if (transformedData.ledgerEntries.length > 0) {
          setShowOldRecords(false);
        }
      } else {
        console.error('❌ Failed to load ledger data:', {
          message: response.message,
          success: response.success,
          data: response.data,
          partyName: selectedPartyName
        });
        toast({
          title: "Error",
          description: response.message || "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Error loading ledger data:', {
        error: error.message,
        partyName: selectedPartyName,
        stack: error.stack
      });
      
      // Don't show error toast for background refreshes
      if (showLoading) {
        toast({
          title: "Error",
          description: error.message === 'Request timeout' 
            ? "Request timed out. Please try again." 
            : "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } finally {
      if (showLoading || forceRefresh) {
        setLoading(false);
      }
    }
  }, [selectedPartyName, loading, transformEntry, toast, setShowOldRecords]);

  // Refresh balance column
  const refreshBalanceColumn = useCallback(async () => {
    try {
      await loadLedgerData(false, true);
    } catch (error) {
      console.error('❌ Balance refresh error:', error);
    }
  }, [loadLedgerData]);

  // Load data when party changes
  useEffect(() => {
    if (selectedPartyName) {
      // Load data immediately without waiting
      loadLedgerData();
      
      // Skip preloading for real-time data - data changes frequently
      // const preloadNextParties = async () => {
      //   try {
      //     const response = await fetch('/api/parties');
      //     if (response.ok) {
      //       const parties = await response.json();
      //       localStorage.setItem('cached-parties', JSON.stringify(parties));
      //     }
      //   } catch (error) {
      //     console.log('Preload failed:', error);
      //   }
      // };
      // preloadNextParties();
    }
  }, [selectedPartyName, loadLedgerData]);

  return {
    ledgerData,
    loading,
    forceUpdate,
    loadLedgerData,
    refreshBalanceColumn
  };
};
