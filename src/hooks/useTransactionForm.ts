import { useState, useCallback } from 'react';
import { partyLedgerAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useCompanyName } from '@/hooks/useCompanyName';
import { Party } from '@/types';
import { clearCacheByPattern } from '@/lib/apiCache';

interface UseTransactionFormProps {
  selectedPartyName: string;
  allPartiesForTransaction: Party[];
  onTransactionAdded: () => void;
  setNewEntryIds?: (ids: Set<string>) => void;
}

export const useTransactionForm = ({
  selectedPartyName,
  allPartiesForTransaction,
  onTransactionAdded,
  setNewEntryIds
}: UseTransactionFormProps) => {
  const { toast } = useToast();
  const { companyName } = useCompanyName();
  const [loading, setLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    amount: '',
    partyName: '',
    remarks: ''
  });
  const [isManualCommissionAmount, setIsManualCommissionAmount] = useState(false);

  // Calculate commission amount
  const calculateCommissionAmount = useCallback((partyNameValue: string) => {
    if (!selectedPartyName || !allPartiesForTransaction.length) return;

    const selectedParty = allPartiesForTransaction.find(party => 
      (party.party_name || party.name) === selectedPartyName
    );

    if (selectedParty && selectedParty.mCommission === 'With Commission' && selectedParty.rate) {
      const rate = parseFloat(selectedParty.rate) || 0;
      if (rate > 0) {
        // Smart Commission Calculation based on Previous Transactions
        // This would need to be implemented based on your business logic
        console.log('Commission calculation for party:', selectedParty, 'Rate:', rate);
      }
    }
  }, [selectedPartyName, allPartiesForTransaction]);

  // Handle party name change
  const handlePartyNameChange = useCallback((value: string) => {
    setNewEntry(prev => ({ ...prev, partyName: value }));
    setIsManualCommissionAmount(false);
    
    // Auto-calculate commission when typing "commission"
    if (value.toLowerCase().trim() === 'commission') {
      calculateCommissionAmount(value);
      setNewEntry(prev => ({ ...prev, amount: '' }));
    }
  }, [calculateCommissionAmount]);

  // Handle amount change
  const handleAmountChange = useCallback((value: string) => {
    setNewEntry(prev => ({ ...prev, amount: value }));
    setIsManualCommissionAmount(true);
  }, []);

  // Handle remarks change
  const handleRemarksChange = useCallback((value: string) => {
    setNewEntry(prev => ({ ...prev, remarks: value }));
  }, []);

  // Add new transaction
  const handleAddEntry = useCallback(async () => {
    if (!selectedPartyName) {
      toast({
        title: "Error",
        description: "Please select a party first",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(newEntry.amount);
    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Determine transaction type based on amount
      const tnsType = amount > 0 ? 'CR' : 'DR';

      // Format: Party Name(Remarks) - combine party name and remarks
      let finalRemarks = '';
      const partyName = newEntry.partyName && newEntry.partyName.trim() ? newEntry.partyName.trim() : '';
      const remarks = newEntry.remarks && newEntry.remarks.trim() ? newEntry.remarks.trim() : '';
      
      if (partyName && remarks) {
        // Both party name and remarks provided: Party Name(Remarks)
        finalRemarks = `${partyName}(${remarks})`;
      } else if (partyName) {
        // Only party name provided: Party Name
        finalRemarks = partyName;
      } else if (remarks) {
        // Only remarks provided: Remarks
        finalRemarks = remarks;
      } else {
        // Neither provided: default
        finalRemarks = 'Transaction';
      }

      // Check if this is a commission transaction
      const isCommissionTransaction = newEntry.partyName && 
        newEntry.partyName.toLowerCase().trim() === 'commission';

      // Business Logic Validation
      const selectedParty = allPartiesForTransaction.find(party => 
        party.name === selectedPartyName || party.party_name === selectedPartyName
      );

      if (selectedParty) {
        // 1. Balance Limit Check
        if (selectedParty.balanceLimit && selectedParty.balanceLimit !== '0' && selectedParty.balanceLimit !== 'Unlimited') {
          // This would need ledger data to check current balance
          console.log('Balance limit check would go here');
        }

        // 2. Party Status Check
        if (selectedParty.status === 'I') {
          toast({
            title: "Party Inactive",
            description: "Cannot create transactions for inactive parties",
            variant: "destructive"
          });
          return;
        }
      }

      // Check if this is a party-to-party transaction
      const isPartyToParty = newEntry.partyName && 
        newEntry.partyName.trim() !== '' && 
        newEntry.partyName.trim() !== selectedPartyName &&
        allPartiesForTransaction.some(party => party.name === newEntry.partyName.trim()) &&
        !newEntry.remarks && // Only trigger if remarks is empty
        newEntry.partyName.trim().toLowerCase() !== 'commission' && // Don't trigger for commission
        newEntry.partyName.trim().toLowerCase() !== companyName.toLowerCase() && // Don't trigger for Company
        newEntry.partyName.trim().toLowerCase() !== 'company' && // Don't trigger for company
        newEntry.partyName.trim().toLowerCase() !== 'settlement'; // Don't trigger for settlement

      if (isPartyToParty) {
        // Dual-party transaction logic - Simple 2 entries only
        const otherPartyName = newEntry.partyName ? newEntry.partyName.trim() : '';
        const otherParty = allPartiesForTransaction.find(party => party.name === otherPartyName);
        
        if (!otherParty) {
          toast({
            title: "Error",
            description: `Party "${otherPartyName}" not found`,
            variant: "destructive"
          });
          return;
        }

        // Create only 2 entries for dual-party transaction
        const entries = [];

        // 1. Entry for current party
        entries.push({
          partyName: selectedPartyName,
          amount: Math.abs(amount),
          remarks: otherPartyName, // Simple - just the other party name
          tnsType,
          credit: tnsType === 'CR' ? Math.abs(amount) : 0,
          debit: tnsType === 'DR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0], // Add current date
          ti: `${Date.now()}::`
        });

        // 2. Entry for other party (opposite transaction)
        entries.push({
          partyName: otherPartyName,
          amount: Math.abs(amount),
          remarks: selectedPartyName, // Simple - just the current party name
          tnsType: tnsType === 'CR' ? 'DR' : 'CR', // Opposite transaction type
          credit: tnsType === 'CR' ? 0 : Math.abs(amount),
          debit: tnsType === 'CR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0], // Add current date
          ti: `${Date.now() + 1}::`
        });

        // Add both entries
        let successCount = 0;
        for (const entryData of entries) {
          try {
            const response = await partyLedgerAPI.addEntry(entryData);
            if (response.success) {
              successCount++;
            }
          } catch (error) {
            console.error('Failed to add entry:', entryData, error);
          }
        }

        if (successCount === entries.length) {
          toast({
            title: "Success",
            description: `Dual-party transaction completed: ${selectedPartyName} ↔ ${otherPartyName}`
          });
          
          // Immediate UI updates
          setLoading(false); // Clear loading immediately
          setNewEntry({
            amount: '',
            partyName: '',
            remarks: ''
          });
          
          // Background refresh
          clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
          clearCacheByPattern(`.*all-parties.*`);
          
          // Background refresh for data updates
          setTimeout(async () => {
            onTransactionAdded();
          }, 50);
        } else {
          toast({
            title: "Partial Success",
            description: `${successCount}/${entries.length} entries added successfully`,
            variant: "destructive"
          });
        }

      } else if (isCommissionTransaction) {
        // Commission transaction logic
        const selectedParty = allPartiesForTransaction.find(party => 
          party.name === selectedPartyName || party.party_name === selectedPartyName
        );
        
        if (!selectedParty) {
          toast({
            title: "Error",
            description: "Selected party not found",
            variant: "destructive"
          });
          return;
        }

        // Smart Commission Waterfall Calculation
        let commissionAmount = 0;
        let commissionType = 'Manual';
        
        // Auto-calculate commission if party has commission structure
        if (selectedParty.mCommission === 'With Commission' && selectedParty.rate) {
          const rate = parseFloat(selectedParty.rate) || 0;
          if (rate > 0) {
            // Calculate commission based on the transaction amount
            commissionAmount = (Math.abs(amount) * rate) / 100;
            commissionType = 'Auto-calculated';
          }
        } else {
          // Default 3% commission if no commission structure
          commissionAmount = (Math.abs(amount) * 3) / 100;
          commissionType = 'Auto-calculated (3%)';
        }

        // Create multiple entries for Commission transaction
        const entries = [];
        
        // 1. Give entry (opposite transaction)
        entries.push({
          partyName: selectedPartyName,
          amount: Math.abs(amount),
          remarks: 'Give',
          tnsType: tnsType,
          credit: tnsType === 'CR' ? Math.abs(amount) : 0,
          debit: tnsType === 'DR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0],
          ti: `${Date.now()}::`
        });
        
        // 2. Commission entry
        entries.push({
          partyName: selectedPartyName,
          amount: commissionAmount,
          remarks: 'Commission',
          tnsType: 'DR',
          credit: 0,
          debit: commissionAmount,
          date: new Date().toISOString().split('T')[0],
          ti: `${Date.now() + 1}::`
        });
        
        // 3. Company entry (remaining amount)
        const companyAmount = Math.abs(amount) - commissionAmount;
        entries.push({
          partyName: selectedPartyName,
          amount: companyAmount,
          remarks: companyName,
          tnsType: 'DR',
          credit: 0,
          debit: companyAmount,
          date: new Date().toISOString().split('T')[0],
          ti: `${Date.now() + 2}::`
        });

        // Add all entries for Commission transaction
        let successCount = 0;
        for (const entryData of entries) {
          try {
            const response = await partyLedgerAPI.addEntry(entryData);
            if (response.success) {
              successCount++;
            }
          } catch (error) {
            console.error('❌ Error adding entry:', error);
          }
        }
        
        if (successCount === entries.length) {
          toast({
            title: "Success",
            description: `Commission transaction of ₹${Math.abs(amount).toLocaleString()} added successfully for ${selectedPartyName}`
          });
          
          // Immediate UI updates
          setLoading(false); // Clear loading immediately
          setNewEntry({
            amount: '',
            partyName: '',
            remarks: ''
          });
          
          // Background refresh
          clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
          clearCacheByPattern(`.*all-parties.*`);
          
          // Background refresh for data updates
          setTimeout(async () => {
            onTransactionAdded();
          }, 50);
        } else {
          setLoading(false); // Clear loading on error
          toast({
            title: "Error",
            description: "Failed to add commission entry",
            variant: "destructive"
          });
        }

      } else {
        // Regular transaction logic
        const entryData = {
          partyName: selectedPartyName,
          amount: Math.abs(amount),
          remarks: finalRemarks,
          tnsType,
          credit: tnsType === 'CR' ? Math.abs(amount) : 0,
          debit: tnsType === 'DR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0], // Add current date
          ti: `${Date.now()}::`
        };

        // Add immediate UI entry for instant feedback
        const tempId = `temp_${Date.now()}`;
        if (setNewEntryIds) {
          setNewEntryIds(prev => new Set([...prev, tempId]));
        }

        const response = await partyLedgerAPI.addEntry(entryData);

        if (response.success) {
          // Business Workflow Automation
          const transactionAmount = Math.abs(amount);
          
          // 1. High Value Transaction Alert
          if (transactionAmount >= 100000) {
            toast({
              title: "High Value Transaction",
              description: `Large transaction of ₹${transactionAmount.toLocaleString()} recorded. Consider review.`,
              variant: "default"
            });
          }
          
          // 2. Success Message
          toast({
            title: "Success",
            description: `Transaction of ₹${transactionAmount.toLocaleString()} added successfully`
          });
          
          // 3. Immediate UI updates
          setLoading(false); // Clear loading immediately
          setNewEntry({
            amount: '',
            partyName: '',
            remarks: ''
          });
          
          // Clear temp entry after successful add
          if (setNewEntryIds) {
            setNewEntryIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(tempId);
              return newSet;
            });
          }
          
          // 4. Background refresh
          clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
          clearCacheByPattern(`.*all-parties.*`);
          
          // Background refresh for data updates
          setTimeout(async () => {
            onTransactionAdded();
          }, 50);
        } else {
          setLoading(false); // Clear loading on error
          toast({
            title: "Error",
            description: response.message || "Failed to add entry",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Add entry error:', error);
      setLoading(false); // Clear loading on error
      toast({
        title: "Error",
        description: error.message || "Failed to add entry",
        variant: "destructive"
      });
    }
  }, [selectedPartyName, newEntry, allPartiesForTransaction, companyName, toast, onTransactionAdded]);

  // Reset form
  const resetForm = useCallback(() => {
    setNewEntry({
      amount: '',
      partyName: '',
      remarks: ''
    });
    setIsManualCommissionAmount(false);
  }, []);

  return {
    newEntry,
    loading,
    handlePartyNameChange,
    handleAmountChange,
    handleRemarksChange,
    handleAddEntry,
    resetForm
  };
};
