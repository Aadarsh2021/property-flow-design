import { useState, useCallback, useMemo, useEffect } from 'react';
import { SupabaseService } from '@/lib/supabaseService';
import { useToast } from '@/hooks/use-toast';
import { useCompanyName } from '@/hooks/useCompanyName';
import { Party, LedgerEntry } from '@/types';
import { clearCacheByPattern } from '@/lib/apiCache';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface BusinessRules {
  maxTransactionAmount: number;
  minTransactionAmount: number;
  maxDailyTransactions: number;
  requireRemarksForHighValue: boolean;
  highValueThreshold: number;
}

interface UseTransactionFormProps {
  selectedPartyName: string;
  allPartiesForTransaction: Party[];
  onTransactionAdded: () => void;
  ledgerData?: LedgerEntry[] | {
    ledgerEntries: LedgerEntry[];
    oldRecords: LedgerEntry[];
    closingBalance: number;
  } | null;
  businessRules?: Partial<BusinessRules>;
}

export const useTransactionForm = ({
  selectedPartyName,
  allPartiesForTransaction,
  onTransactionAdded,
  ledgerData,
  businessRules
}: UseTransactionFormProps) => {
  const { toast } = useToast();
  const { companyName } = useCompanyName(user?.id);
  const [loading, setLoading] = useState(false);

  // Get last non-commission transaction amount for commission calculation
  const getLastTransactionAmount = useCallback((partyName: string): number => {
    if (!ledgerData) return 0;
    
    // Supabase returns entries directly as array, not nested in ledgerEntries
    const allEntries = Array.isArray(ledgerData) ? ledgerData : (ledgerData.ledgerEntries || []);
    
    // Filter out commission transactions to find the last regular transaction
    const nonCommissionEntries = allEntries.filter(entry => 
      !entry.remarks?.toLowerCase().includes('commission') &&
      entry.tnsType !== 'Monday Settlement' &&
      entry.type !== 'Monday Settlement'
    );
    
    if (nonCommissionEntries.length === 0) return 0;
    
    // Sort by date and creation time to get the most recent non-commission entry
    const sortedEntries = nonCommissionEntries.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      // Use id for secondary sorting since ti might not exist in Supabase
      return (a.id || a.ti || '').localeCompare(b.id || b.ti || '');
    });
    
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    return Math.abs(lastEntry.credit || lastEntry.debit || 0);
  }, [ledgerData]);
  const [newEntry, setNewEntry] = useState({
    amount: '',
    partyName: '',
    remarks: ''
  });
  const [isManualCommissionAmount, setIsManualCommissionAmount] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Default business rules
  const defaultBusinessRules: BusinessRules = {
    maxTransactionAmount: 10000000, // 1 crore
    minTransactionAmount: 1,
    maxDailyTransactions: 100,
    requireRemarksForHighValue: true,
    highValueThreshold: 100000 // 1 lakh
  };

  const effectiveBusinessRules = useMemo(() => ({
    ...defaultBusinessRules,
    ...businessRules
  }), [businessRules]);

  // Comprehensive validation function
  const validateTransaction = useCallback((entry: typeof newEntry, amount: number): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Basic validation
    if (!selectedPartyName) {
      errors.push("Please select a party first");
    }

    if (isNaN(amount) || amount === 0) {
      errors.push("Please enter a valid amount");
    }

    if (amount < effectiveBusinessRules.minTransactionAmount) {
      errors.push(`Amount must be at least ₹${effectiveBusinessRules.minTransactionAmount.toLocaleString()}`);
    }

    if (amount > effectiveBusinessRules.maxTransactionAmount) {
      errors.push(`Amount cannot exceed ₹${effectiveBusinessRules.maxTransactionAmount.toLocaleString()}`);
    }

    // 2. Party validation
    const selectedParty = allPartiesForTransaction.find(party => 
      (party.party_name || party.name) === selectedPartyName
    );

    if (selectedParty) {
      // Party status check
      if (selectedParty.status === 'I') {
        errors.push("Cannot create transactions for inactive parties");
      }

      // Balance limit check
      if (selectedParty.balanceLimit && selectedParty.balanceLimit !== '0' && selectedParty.balanceLimit !== 'Unlimited') {
        // Calculate current balance from entries
        const allEntries = Array.isArray(ledgerData) ? ledgerData : (ledgerData?.ledgerEntries || []);
        const currentBalance = allEntries.length > 0 ? (allEntries[0]?.balance || 0) : 0;
        
        const balanceLimit = typeof selectedParty.balanceLimit === 'string' 
          ? parseFloat(selectedParty.balanceLimit) || 0
          : selectedParty.balanceLimit || 0;
        
        if (balanceLimit > 0 && amount < 0 && (currentBalance + Math.abs(amount)) > balanceLimit) {
          errors.push(`Transaction would exceed balance limit of ₹${balanceLimit.toLocaleString()}. Current balance: ₹${currentBalance.toLocaleString()}`);
        }
      }

      // Monday Final check
      if (selectedParty.mondayFinal === 'Yes') {
        warnings.push("This party is marked for Monday Final settlement. Consider if this transaction is necessary.");
      }
    }

    // 3. High value transaction validation
    if (Math.abs(amount) >= effectiveBusinessRules.highValueThreshold) {
      if (effectiveBusinessRules.requireRemarksForHighValue && !entry.remarks.trim()) {
        errors.push(`Remarks are required for transactions above ₹${effectiveBusinessRules.highValueThreshold.toLocaleString()}`);
      }
      
      warnings.push(`High value transaction detected: ₹${Math.abs(amount).toLocaleString()}. Please verify all details.`);
    }

    // 4. Daily transaction limit check
    if (ledgerData) {
      const today = new Date().toISOString().split('T')[0];
      const allEntries = Array.isArray(ledgerData) ? ledgerData : (ledgerData.ledgerEntries || []);
      const todayTransactions = allEntries.filter(entry => entry.date === today).length;

      if (todayTransactions >= effectiveBusinessRules.maxDailyTransactions) {
        warnings.push(`Daily transaction limit reached (${todayTransactions}/${effectiveBusinessRules.maxDailyTransactions}). Consider if this transaction is necessary.`);
      }
    }

    // 5. Commission transaction validation
    if (entry.partyName?.toLowerCase().trim() === 'commission') {
      if (!selectedParty || selectedParty.mCommission !== 'With Commission') {
        warnings.push("Commission transaction without proper party commission settings. Using default 3% rate.");
      }
    }

    // 6. Party-to-party transaction validation
    const isPartyToParty = entry.partyName && 
      entry.partyName.trim() !== '' && 
      entry.partyName.trim() !== selectedPartyName &&
      allPartiesForTransaction.some(party => party.name === entry.partyName.trim()) &&
      !entry.remarks &&
      entry.partyName.trim().toLowerCase() !== 'commission' &&
      entry.partyName.trim().toLowerCase() !== companyName.toLowerCase() &&
      entry.partyName.trim().toLowerCase() !== 'company' &&
      entry.partyName.trim().toLowerCase() !== 'settlement';

    if (isPartyToParty) {
      const otherParty = allPartiesForTransaction.find(party => party.name === entry.partyName.trim());
      if (otherParty && otherParty.status === 'I') {
        errors.push(`Cannot create party-to-party transaction with inactive party: ${entry.partyName}`);
      }
    }

    // 7. Duplicate transaction check
    if (ledgerData) {
      const allEntries = Array.isArray(ledgerData) ? ledgerData : (ledgerData.ledgerEntries || []);
      const recentTransactions = allEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        const now = new Date();
        const diffInMinutes = (now.getTime() - entryDate.getTime()) / (1000 * 60);
        return diffInMinutes <= 5; // Check last 5 minutes
      });

      const duplicateTransaction = recentTransactions.find(transaction => 
        Math.abs(transaction.credit - transaction.debit) === Math.abs(amount) &&
        transaction.remarks === (entry.partyName + (entry.remarks ? `(${entry.remarks})` : ''))
      );

      if (duplicateTransaction) {
        warnings.push("Similar transaction found in the last 5 minutes. Please verify this is not a duplicate.");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [selectedPartyName, allPartiesForTransaction, ledgerData, companyName, effectiveBusinessRules]);

  // Minimal real-time validation to reduce performance overhead
  const validateInRealTime = useCallback((entry: typeof newEntry) => {
    // Skip validation if form is empty to reduce overhead
    if (!entry.amount && !entry.partyName && !entry.remarks) {
      setValidationErrors([]);
      setValidationWarnings([]);
      return { isValid: true, errors: [], warnings: [] };
    }
    
    const amount = parseFloat(entry.amount);
    
    // Only basic validation for real-time feedback
    const quickErrors: string[] = [];
    const quickWarnings: string[] = [];
    
    if (entry.amount && (isNaN(amount) || amount === 0)) {
      quickErrors.push("Please enter a valid amount");
    }
    
    if (entry.amount && Math.abs(amount) >= 100000) {
      quickWarnings.push("High value transaction detected");
    }
    
    setValidationErrors(quickErrors);
    setValidationWarnings(quickWarnings);
    
    return {
      isValid: quickErrors.length === 0,
      errors: quickErrors,
      warnings: quickWarnings
    };
  }, []);

  // Calculate commission amount - Enhanced like old version
  const calculateCommissionAmount = useCallback((partyNameValue: string, amount: number) => {
    if (!selectedPartyName || !allPartiesForTransaction.length) return 0;

    const selectedParty = allPartiesForTransaction.find(party => 
      (party.party_name || party.name) === selectedPartyName
    );

    if (selectedParty && selectedParty.mCommission === 'With Commission' && selectedParty.rate) {
      const rate = parseFloat(selectedParty.rate) || 0;
      if (rate > 0) {
        return (Math.abs(amount) * rate) / 100;
      }
    }
    
    // Default 3% commission if no commission structure
    return (Math.abs(amount) * 3) / 100;
  }, [selectedPartyName, allPartiesForTransaction]);

  // Enhanced party name change handler - Like old version
  const handlePartyNameChangeEnhanced = useCallback((value: string) => {
    setNewEntry(prevEntry => {
      const updatedEntry = { ...prevEntry, partyName: value };
      setIsManualCommissionAmount(false);
      
      // Real-time validation
      validateInRealTime(updatedEntry);
      
      // Auto-calculate commission when typing "commission"
      if (value.toLowerCase().trim() === 'commission') {
        const allEntries = Array.isArray(ledgerData) ? ledgerData : (ledgerData?.ledgerEntries || []);
        if (allEntries.length > 0) {
          // Calculate sum of all transactions for the selected party
          let totalAmount = 0;
          let transactionCount = 0;
          
          // Sum all transactions for the selected party
          allEntries.forEach(entry => {
            const entryPartyName = entry.partyName || entry.party_name || '';
            if (entryPartyName === selectedPartyName) {
              const entryAmount = entry.credit || entry.debit || 0;
              totalAmount += entryAmount;
              transactionCount++;
            }
          });
          
          // Calculate commission based on total amount
          const commissionAmount = calculateCommissionAmount(selectedPartyName, totalAmount);
          
          if (commissionAmount > 0) {
            setNewEntry(prev => ({
              ...prev,
              amount: commissionAmount.toString(),
              remarks: `Commission for ${transactionCount} transactions (Total: ₹${totalAmount.toLocaleString()})`
            }));
          }
        }
      }
      
      return updatedEntry;
    });
  }, [selectedPartyName, ledgerData, calculateCommissionAmount, validateInRealTime]);

  // Handle party name change with real-time validation
  const handlePartyNameChange = useCallback((value: string) => {
    setNewEntry(prevEntry => {
      const updatedEntry = { ...prevEntry, partyName: value };
      setIsManualCommissionAmount(false);
      
      // Real-time validation
      validateInRealTime(updatedEntry);
      
      // Auto-calculate commission when typing "commission"
      if (value.toLowerCase().trim() === 'commission') {
        const allEntries = Array.isArray(ledgerData) ? ledgerData : (ledgerData?.ledgerEntries || []);
        if (allEntries.length > 0) {
          // Calculate sum of all transactions for the selected party
          let totalAmount = 0;
          let transactionCount = 0;
          
          // Sum all transactions for the selected party
          allEntries.forEach(entry => {
            const entryPartyName = entry.partyName || entry.party_name || '';
            if (entryPartyName === selectedPartyName) {
              const entryAmount = entry.credit || entry.debit || 0;
              totalAmount += entryAmount;
              transactionCount++;
            }
          });
          
          if (totalAmount > 0) {
            const commissionAmount = calculateCommissionAmount(selectedPartyName, totalAmount);
            const commissionEntry = { ...updatedEntry, amount: commissionAmount.toString() };
            validateInRealTime(commissionEntry);
            
            // Show info toast with sum details
            if (transactionCount === 1) {
              toast({
                title: "Commission Calculated (Single Transaction)",
                description: `Commission calculated from last transaction: ₹${totalAmount.toLocaleString()} × 3% = ₹${commissionAmount.toLocaleString()}`,
                variant: "default"
              });
            } else {
              toast({
                title: "Commission Calculated (Multiple Transactions)",
                description: `Commission calculated from ${transactionCount} transactions: ₹${totalAmount.toLocaleString()} × 3% = ₹${commissionAmount.toLocaleString()}`,
                variant: "default"
              });
            }
            
            return commissionEntry;
          } else {
            toast({
              title: "No Transactions Found",
              description: `No transactions found for ${selectedPartyName} to calculate commission from`,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "No Transaction Data",
            description: "No transaction data available to calculate commission from",
            variant: "destructive"
          });
        }
      }
      
      return updatedEntry;
    });
  }, [calculateCommissionAmount, validateInRealTime, ledgerData, selectedPartyName, toast]);

  // Handle amount change with real-time validation
  const handleAmountChange = useCallback((value: string) => {
    setNewEntry(prevEntry => {
      const updatedEntry = { ...prevEntry, amount: value };
      setIsManualCommissionAmount(true);
      
      // Real-time validation
      validateInRealTime(updatedEntry);
      
      return updatedEntry;
    });
  }, [validateInRealTime]);

  // Handle remarks change with real-time validation
  const handleRemarksChange = useCallback((value: string) => {
    setNewEntry(prevEntry => {
      const updatedEntry = { ...prevEntry, remarks: value };
      
      // Real-time validation
      validateInRealTime(updatedEntry);
      
      return updatedEntry;
    });
  }, [validateInRealTime]);


  // Add new transaction - COMPLEX BUSINESS LOGIC like old system
  const handleAddEntry = useCallback(async () => {
    if (loading) return;
    
    const amount = parseFloat(newEntry.amount);
    
    // Basic validation
    if (!selectedPartyName || isNaN(amount) || amount === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a party and enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    // Party name validation
    if (!newEntry.partyName || newEntry.partyName.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Please enter a party name for the transaction",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Determine transaction type based on amount
      const tnsType = amount > 0 ? 'CR' : 'DR';
      const absoluteAmount = Math.abs(amount);
      
      // COMPLEX BUSINESS LOGIC - Commission Calculation
      let commissionAmount = 0;
      let commissionRate = 0;
      
      // Find current party for commission calculation
      const currentParty = allPartiesForTransaction.find(party => 
        (party.party_name || party.name) === selectedPartyName
      );
      
      // Calculate commission if party name is "commission"
      if (newEntry.partyName && newEntry.partyName.toLowerCase().trim() === 'commission') {
        // Use the transaction amount as commission amount (same amount)
        commissionAmount = absoluteAmount;
        commissionRate = 100; // 100% of transaction amount
      }

      // COMPLEX BUSINESS LOGIC - Party-to-Party Transaction Detection
      const isPartyToParty = newEntry.partyName && 
        newEntry.partyName.trim() !== '' && 
        newEntry.partyName.trim() !== selectedPartyName &&
        allPartiesForTransaction.some(party => party.name === newEntry.partyName.trim()) &&
        !newEntry.remarks; // Only trigger if remarks is empty

      // COMPLEX BUSINESS LOGIC - Company Name Detection
      const isCompanyParty = newEntry.partyName.toLowerCase().includes(companyName.toLowerCase());

      // Create main entry data - Party name should be current party, remarks should contain other party name
      const remarksText = newEntry.remarks?.trim();
      const displayRemarks = newEntry.partyName 
        ? (remarksText ? `${newEntry.partyName}(${remarksText})` : newEntry.partyName)
        : (remarksText || 'Transaction');
      
      const entryData = {
          partyName: selectedPartyName, // Current party (Take) - so it appears in Take's ledger
        amount: absoluteAmount,
        remarks: displayRemarks, // Other party name + remarks (Give(0))
          tnsType,
        credit: tnsType === 'CR' ? absoluteAmount : 0,
        debit: tnsType === 'DR' ? absoluteAmount : 0,
          date: new Date().toISOString().split('T')[0],
          ti: `${Date.now()}::`
      };

      // Add main entry using direct Supabase
      const newEntry = await SupabaseService.createLedgerEntry(userId, entryData);
      
      if (newEntry) {
        let successMessage = `Transaction added successfully`;
        let successCount = 1;

        // COMPLEX BUSINESS LOGIC - Always create related entries
        // 1. Party-to-Party Transaction (if party name provided and not company/commission)
        if (newEntry.partyName && newEntry.partyName.trim() !== '' && newEntry.partyName.trim() !== companyName && newEntry.partyName.trim().toLowerCase() !== 'commission') {
          // Create entry for the other party
          const otherPartyEntry = {
            partyName: newEntry.partyName.trim(),
            amount: absoluteAmount,
            remarks: selectedPartyName,
            tnsType: tnsType === 'CR' ? 'DR' : 'CR', // Opposite type
            credit: tnsType === 'CR' ? 0 : absoluteAmount,
            debit: tnsType === 'CR' ? absoluteAmount : 0,
            date: new Date().toISOString().split('T')[0],
            ti: `${Date.now() + 1}::`
          };

          try {
            await SupabaseService.createLedgerEntry(userId, otherPartyEntry);
            successMessage += `\n📤 ${newEntry.partyName.trim()} party entry saved`;
            successCount++;
          } catch (error) {
            console.error('Failed to add other party entry:', error);
          }
        }


        // COMPLEX BUSINESS LOGIC - Commission Entry
        if (commissionAmount > 0) {
          const commissionEntry = {
            partyName: 'Commission',
            amount: commissionAmount,
            remarks: `Commission for ${selectedPartyName} (${commissionRate}%)`,
            tnsType: tnsType, // Same transaction type as main entry
            credit: tnsType === 'CR' ? commissionAmount : 0,
            debit: tnsType === 'DR' ? commissionAmount : 0,
            date: new Date().toISOString().split('T')[0],
            ti: `${Date.now() + 2}::`
          };

          try {
            await SupabaseService.createLedgerEntry(userId, commissionEntry);
            successMessage += `\n💰 Commission entry saved (${commissionRate}%)`;
          } catch (error) {
            console.error('Failed to add commission entry:', error);
          }
        }

        // COMPLEX BUSINESS LOGIC - Company Entry (Only if company is involved)
        if (newEntry.partyName && newEntry.partyName === companyName) {
          const companyEntry = {
            partyName: companyName,
            amount: absoluteAmount,
            remarks: `Transaction with ${selectedPartyName}`,
            tnsType: tnsType, // Same transaction type as main entry
            credit: tnsType === 'CR' ? absoluteAmount : 0,
            debit: tnsType === 'DR' ? absoluteAmount : 0,
            date: new Date().toISOString().split('T')[0],
            ti: `${Date.now() + 3}::`
          };

          try {
            await SupabaseService.createLedgerEntry(userId, companyEntry);
            successMessage += `\n🏢 ${companyName} party entry saved`;
          } catch (error) {
            console.error('Failed to add company entry:', error);
          }
        }


        // Reset form immediately
          setNewEntry({
            amount: '',
            partyName: '',
            remarks: ''
          });
          setValidationErrors([]);
          setValidationWarnings([]);
          
        // Show success message with all details
          toast({
          title: "Success",
            description: successMessage
          });
          
        // Refresh data after all entries are added
        await onTransactionAdded();
        } else {
          toast({
            title: "Error",
          description: response.message || "Failed to add transaction",
            variant: "destructive"
          });
      }
    } catch (error: any) {
      console.error('❌ Error adding transaction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedPartyName, newEntry, toast, onTransactionAdded, loading, allPartiesForTransaction, companyName]);

  // Auto-fill commission amount when party changes
  useEffect(() => {
    if (newEntry.partyName?.toLowerCase().trim() === 'commission' && selectedPartyName) {
      // Find the current party for commission calculation
      const currentParty = allPartiesForTransaction.find(party => 
        party.name === selectedPartyName || party.party_name === selectedPartyName
      );
      
      // Always calculate commission when "commission" is typed, regardless of party settings
      const previousAmount = getLastTransactionAmount(selectedPartyName);
      let commissionAmount = 0;
      let commissionRate = 0;
      
      if (currentParty?.mCommission === 'With Commission' && currentParty.rate) {
        commissionRate = parseFloat(currentParty.rate) || 0;
        const rawCommission = (previousAmount * commissionRate) / 100;
        commissionAmount = Math.round(rawCommission);
        
        if (commissionAmount < 1 && rawCommission > 0) {
          commissionAmount = 1;
        }
      } else {
        // Default to 3% if no commission settings
        const rawCommission = previousAmount * 0.03;
        commissionAmount = Math.round(rawCommission);
        
        if (commissionAmount < 1 && rawCommission > 0) {
          commissionAmount = 1;
        }
        commissionRate = 3;
      }
      
      // Set commission amount based on current party's commission system
      let finalAmount = 0;
      
      if (currentParty?.commiSystem === 'Take') {
        finalAmount = -commissionAmount;
      } else if (currentParty?.commiSystem === 'Give') {
        finalAmount = commissionAmount;
      } else {
        // Default: Use opposite of last transaction type
        finalAmount = previousAmount > 0 ? -commissionAmount : commissionAmount;
      }
      
      // Auto-fill the amount field with calculated commission (including negative sign)
      setNewEntry(prev => ({
        ...prev,
        amount: finalAmount !== 0 ? finalAmount.toString() : ''
      }));
      
      // Show calculation details
      toast({
        title: "Commission Auto-Calculated",
        description: `Commission amount: ₹${commissionAmount} (${commissionRate}% of ₹${previousAmount.toLocaleString()}) - Rounded using standard rounding: >= 0.5 = round up, < 0.5 = round down`,
      });
    }
  }, [newEntry.partyName, selectedPartyName, allPartiesForTransaction, getLastTransactionAmount, toast]);

  // Reset form
  const resetForm = useCallback(() => {
    setNewEntry({
      amount: '',
      partyName: '',
      remarks: ''
    });
    setIsManualCommissionAmount(false);
    setValidationErrors([]);
    setValidationWarnings([]);
  }, []);

  return {
    newEntry,
    loading,
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
  };
};
