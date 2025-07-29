
import React, { useState, useEffect, useCallback } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertTriangle, Calculator, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { partyLedgerAPI, mockData } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { LedgerEntry, LedgerEntryInput } from '../types';

const AccountLedger = () => {
  const { partyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [oldRecords, setOldRecords] = useState<LedgerEntry[]>([]);
  const [showOldRecords, setShowOldRecords] = useState(false);
  const [newEntry, setNewEntry] = useState({
    partyName: '',
    amount: '',
    remarks: '',
    transactionType: 'CR' as 'CR' | 'DR'
  });
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [selectedEntryForModify, setSelectedEntryForModify] = useState<LedgerEntry | null>(null);
  const [modifyFormData, setModifyFormData] = useState({
    remarks: '',
    amount: '',
    tnsType: 'CR' as 'CR' | 'DR'
  });
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [mondayFinalData, setMondayFinalData] = useState({
    transactionCount: 0,
    totalCredit: 0,
    totalDebit: 0,
    startingBalance: 0,
    finalBalance: 0
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load ledger data on component mount
  useEffect(() => {
    if (partyName) {
      loadLedgerData();
    }
  }, [partyName]);

  // Ensure proper ordering whenever ledger entries change
  useEffect(() => {
    if (ledgerEntries.length > 0) {
      const sortedEntries = [...ledgerEntries].sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        
        // If dates are same, sort by creation time (older entries first)
        if (dateA.getTime() === dateB.getTime()) {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB; // Older first
        }
        
        return dateA.getTime() - dateB.getTime(); // Oldest first
      });
      
      // Only update if order actually changed
      const currentOrder = ledgerEntries.map(e => e.id).join(',');
      const newOrder = sortedEntries.map(e => e.id).join(',');
      
      if (currentOrder !== newOrder) {
        const recalculatedEntries = recalculateBalances(sortedEntries);
        setLedgerEntries(recalculatedEntries);
        
        // Update closing balance
        if (recalculatedEntries.length > 0) {
          setClosingBalance(recalculatedEntries[recalculatedEntries.length - 1].balance);
        }
      }
    }
  }, [ledgerEntries.length]); // Only run when number of entries changes

  const loadLedgerData = async () => {
    if (!partyName) return;
    
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getPartyLedger(partyName);
      
      // Check if response is valid and has data
      if (response && response.success && response.data && Array.isArray(response.data)) {
        // Ensure all entries have proper ID fields
        const processedEntries = response.data.map((entry: any, index: number) => ({
          ...entry,
          id: entry._id || entry.id || `entry-${index}`,
          chk: entry.chk || false
        }));
        
        // Sort entries by date and time (oldest first) to maintain consistent order
        const sortedEntries = processedEntries.sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          
          // If dates are same, sort by creation time (older entries first)
          if (dateA.getTime() === dateB.getTime()) {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB; // Older first
          }
          
          return dateA.getTime() - dateB.getTime(); // Oldest first
        });
        
        // Recalculate balances to ensure accuracy
        const recalculatedEntries = recalculateBalances(sortedEntries);
        setLedgerEntries(recalculatedEntries);
        
        // Update closing balance
        if (recalculatedEntries.length > 0) {
          setClosingBalance(recalculatedEntries[recalculatedEntries.length - 1].balance);
        }
      } else {
        // Fallback to mock data if API response is invalid
        console.warn('Invalid API response format, using mock data');
        const mockEntries = mockData.getMockLedgerEntries();
        const recalculatedMockEntries = recalculateBalances(mockEntries);
        setLedgerEntries(recalculatedMockEntries);
        
        toast({
          title: "Warning",
          description: "Using offline data. Some features may be limited.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading ledger data:', error);
      // Use mock data as fallback
      const mockEntries = mockData.getMockLedgerEntries();
      const recalculatedMockEntries = recalculateBalances(mockEntries);
      setLedgerEntries(recalculatedMockEntries);
      
      toast({
        title: "Warning",
        description: "Using offline data. Some features may be limited.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = async (id: string | number, checked: boolean) => {
    try {
      // Ensure id is valid
      if (id === undefined || id === null) {
        console.error('Invalid entry ID:', id);
        return;
      }

      // Update local state immediately for better UX
      if (showOldRecords) {
        // Update old records
        setOldRecords(prevRecords => {
          const updatedRecords = prevRecords.map(entry =>
            entry.id === id ? { ...entry, chk: checked } : entry
          );
          
          // Find the entry for backend update
          const entry = updatedRecords.find(e => e.id === id);
          if (entry && entry.id && !entry.id.toString().startsWith('entry-')) {
            // Update backend asynchronously
            const idString = typeof id === 'string' ? id : id.toString();
            partyLedgerAPI.updateEntry(idString, { chk: checked }).catch(error => {
              console.error('Error updating old record in backend:', error);
              // Revert local state if backend update fails
              setOldRecords(prevRecords =>
                prevRecords.map(entry =>
                  entry.id === id ? { ...entry, chk: !checked } : entry
                )
              );
              toast({
                title: "Error",
                description: "Failed to update old record",
                variant: "destructive"
              });
            });
          }
          
          return updatedRecords;
        });
      } else {
        // Update current ledger entries
        setLedgerEntries(prevEntries => {
          const updatedEntries = prevEntries.map(entry =>
            entry.id === id ? { ...entry, chk: checked } : entry
          );
          
          // Find the entry for backend update
          const entry = updatedEntries.find(e => e.id === id);
          if (entry && entry.id && !entry.id.toString().startsWith('entry-')) {
            // Update backend asynchronously
            const idString = typeof id === 'string' ? id : id.toString();
            partyLedgerAPI.updateEntry(idString, { chk: checked }).catch(error => {
              console.error('Error updating entry in backend:', error);
              // Revert local state if backend update fails
              setLedgerEntries(prevEntries =>
                prevEntries.map(entry =>
                  entry.id === id ? { ...entry, chk: !checked } : entry
                )
              );
              toast({
                title: "Error",
                description: "Failed to update entry",
                variant: "destructive"
              });
            });
          }
          
          return updatedEntries;
        });
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive"
      });
    }
  };

  const handleCheckAll = async () => {
    if (showOldRecords) {
      // Handle check all for old records
      setOldRecords(prevRecords => {
        const allChecked = (prevRecords || []).every(entry => entry.chk);
        const newCheckedState = !allChecked;
        
        const updatedRecords = (prevRecords || []).map(entry => ({ ...entry, chk: newCheckedState }));
        
        // Update all old records in backend
        const realRecords = updatedRecords.filter(entry => 
          entry.id && entry.id.toString && !entry.id.toString().startsWith('entry-')
        );
        
        if (realRecords.length > 0) {
          const updatePromises = realRecords.map(entry => {
            const idString = typeof entry.id === 'string' ? entry.id : entry.id.toString();
            return partyLedgerAPI.updateEntry(idString, { chk: newCheckedState });
          });
          
          Promise.all(updatePromises).catch(error => {
            console.error('Error updating all old records:', error);
            toast({
              title: "Error",
              description: "Failed to update old records",
              variant: "destructive"
            });
          });
        }
        
        return updatedRecords;
      });
    } else {
      // Handle check all for current entries
      setLedgerEntries(prevEntries => {
        const allChecked = (prevEntries || []).every(entry => entry.chk);
        const newCheckedState = !allChecked;
        
        const updatedEntries = (prevEntries || []).map(entry => ({ ...entry, chk: newCheckedState }));
        
        // Update all entries in backend - only real entries, not mock data
        const realEntries = updatedEntries.filter(entry => 
          entry.id && entry.id.toString && !entry.id.toString().startsWith('entry-')
        );
        
        if (realEntries.length > 0) {
          const updatePromises = realEntries.map(entry => {
            const idString = typeof entry.id === 'string' ? entry.id : entry.id.toString();
            return partyLedgerAPI.updateEntry(idString, { chk: newCheckedState });
          });
          
          Promise.all(updatePromises).catch(error => {
            console.error('Error updating all entries:', error);
            toast({
              title: "Error",
              description: "Failed to update entries",
              variant: "destructive"
            });
          });
        }
        
        return updatedEntries;
      });
    }
  };

  // Generate remarks based on party name and remarks input
  const generateRemarks = () => {
    if (!newEntry.partyName) return newEntry.remarks;
    
    if (newEntry.remarks) {
      return `${newEntry.partyName} (${newEntry.remarks})`;
    }
    
    return newEntry.partyName;
  };

  const handleAddEntry = async () => {
    // Enhanced validation
    if (!newEntry.partyName || !newEntry.partyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter party name",
        variant: "destructive"
      });
      return;
    }

    if (!newEntry.amount || isNaN(parseFloat(newEntry.amount)) || parseFloat(newEntry.amount) === 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount (non-zero)",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Calculate the new entry with current closing balance
      const currentClosingBalance = closingBalance;
      const newAmount = parseFloat(newEntry.amount);
      
      // Determine if it's credit or debit based on transaction type
      const isCredit = newEntry.transactionType === 'CR';
      const finalAmount = isCredit ? Math.abs(newAmount) : -Math.abs(newAmount);
      
      // Calculate new balance starting from the last Monday Final Final settlement
      let startingBalance = currentClosingBalance;
      
      // First check if there's a Monday Final Final settlement in current entries
      const mondayFinalSettlement = ledgerEntries.find(entry => 
        entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement'))
      );
      
      if (mondayFinalSettlement) {
        // Start from Monday Final Final settlement balance
        startingBalance = mondayFinalSettlement.balance || currentClosingBalance;
      } else {
        // Check old records for the last settlement
        if (oldRecords.length > 0) {
          const lastSettlement = oldRecords
            .filter(entry => entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement')))
            .sort((a, b) => {
              const dateA = new Date(a.date.split('/').reverse().join('-'));
              const dateB = new Date(b.date.split('/').reverse().join('-'));
              return dateB.getTime() - dateA.getTime(); // Newest first
            })[0];
          
          if (lastSettlement) {
            startingBalance = lastSettlement.balance || currentClosingBalance;
          }
        }
      }
      
      const newBalance = parseFloat((startingBalance + finalAmount).toFixed(2));
      
      const newEntryData = {
        partyName: decodeURIComponent(partyName || ''),
        date: new Date().toLocaleDateString('en-GB'),
        remarks: generateRemarks(),
        tnsType: newEntry.transactionType,
        credit: isCredit ? Math.abs(newAmount) : 0,
        debit: isCredit ? 0 : -Math.abs(newAmount),
        balance: newBalance,
        chk: false,
        ti: '3:',
        createdAt: new Date().toISOString() // Add creation timestamp for proper ordering
      };

      const response = await partyLedgerAPI.addEntry({
        partyName: decodeURIComponent(partyName || ''),
        amount: finalAmount,
        remarks: newEntryData.remarks,
        tnsType: newEntryData.tnsType,
        credit: newEntryData.credit,
        debit: newEntryData.debit,
        ti: newEntryData.ti
      });

      if (response.success) {
        // Add new entry to current list and recalculate all balances properly
        setLedgerEntries(prevEntries => {
          // Keep Monday Final Final settlement and add new entry
          const mondayFinalEntry = prevEntries.find(entry => 
            entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement'))
          );
          
          const otherEntries = prevEntries.filter(entry => 
            !(entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement')))
          );
          
          // Add new entry and recalculate all balances from scratch
          const allEntries = mondayFinalEntry ? [mondayFinalEntry, ...otherEntries, newEntryData] : [...otherEntries, newEntryData];
          return recalculateBalances(allEntries);
        });
        
        // Clear form and show success message
        setNewEntry({ partyName: '', amount: '', remarks: '', transactionType: 'CR' });
        toast({
          title: "✅ Transaction Added Successfully",
          description: `${isCredit ? 'Credit' : 'Debit'} entry of ${Math.abs(newAmount).toLocaleString()} added. New balance: ${newBalance.toLocaleString()}`,
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add entry",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      toast({
        title: "Error",
        description: "Failed to add entry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill party name when component loads
  useEffect(() => {
    if (partyName && !newEntry.partyName) {
      setNewEntry(prev => ({
        ...prev,
        partyName: decodeURIComponent(partyName)
      }));
    }
  }, [partyName]);

  // Handle form submission on Enter key
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddEntry();
  };

  // Handle amount input with validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setNewEntry(prev => ({ ...prev, amount: value }));
    }
  };

  // Clear form function
  const handleClearForm = () => {
    setNewEntry({ partyName: '', amount: '', remarks: '', transactionType: 'CR' });
    // Re-fill party name
    if (partyName) {
      setNewEntry(prev => ({
        ...prev,
        partyName: decodeURIComponent(partyName)
      }));
    }
  };

  // Handle refresh functionality
  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      await loadLedgerData();
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle exit functionality
  const handleExit = () => {
    navigate('/party-ledger');
  };

  // DC Report functionality
  const handleDCReport = () => {
    const currentEntries = showOldRecords ? (oldRecords || []) : (ledgerEntries || []);
    const selectedEntries = currentEntries.filter(entry => entry.chk);
    
    if (selectedEntries.length === 0) {
      toast({
        title: "Warning",
        description: "Please select entries to generate DC Report",
        variant: "destructive"
      });
      return;
    }
    
    // Generate DC Report data
    const reportData = {
      partyName: decodeURIComponent(partyName || ''),
      selectedEntries,
      totalCredit: selectedEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0),
      totalDebit: selectedEntries.reduce((sum, entry) => sum + Math.abs(entry.debit || 0), 0),
      generatedAt: new Date().toLocaleString()
    };
    
    // For now, just show a toast with report summary
    toast({
      title: "DC Report Generated",
      description: `${selectedEntries.length} entries selected. Total Credit: ${reportData.totalCredit.toLocaleString()}, Total Debit: ${reportData.totalDebit.toLocaleString()}`,
    });
  };

  // Monday Final functionality - Consolidate all entries into one settlement
  const handleMondayFinalClick = () => {
    if (ledgerEntries.length === 0) {
      toast({
        title: "Warning",
        description: "No entries to settle",
        variant: "destructive"
      });
      return;
    }

    // Check if there are any non-settlement entries to process
    const currentEntries = (ledgerEntries || []).filter(entry => 
      !(entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement')))
    );

    if (currentEntries.length === 0) {
      toast({
        title: "Warning",
        description: "No new transactions to settle. All entries are already settled.",
        variant: "destructive"
      });
      return;
    }

    // Calculate totals for confirmation
    const totalCredit = parseFloat(currentEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0).toFixed(2));
    const totalDebit = parseFloat(currentEntries.reduce((sum, entry) => sum + Math.abs(entry.debit || 0), 0).toFixed(2));
    
    // Get starting balance from the last settlement (including today's settlements)
    let startingBalance = 0;
    
    // First check current entries for any existing settlements
    const currentSettlements = (ledgerEntries || []).filter(entry => 
      entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement'))
    );
    
    if (currentSettlements.length > 0) {
      // Use the latest settlement balance
      const latestSettlement = currentSettlements.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA; // Newest first
      })[0];
      startingBalance = latestSettlement.balance || 0;
    } else if (oldRecords.length > 0) {
      // Check old records for the last settlement
      const lastMondayFinal = oldRecords
        .filter(entry => entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement')))
        .sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        })[0];
      
      if (lastMondayFinal) {
        startingBalance = lastMondayFinal.balance || 0;
      }
    }
    
    const netBalance = parseFloat((startingBalance + totalCredit - totalDebit).toFixed(2));

    // Set modal data
    setMondayFinalData({
      transactionCount: currentEntries.length,
      totalCredit,
      totalDebit,
      startingBalance,
      finalBalance: netBalance
    });

    setShowMondayFinalModal(true);
  };

  const handleMondayFinalConfirm = async () => {
    setActionLoading(true);
    try {
      // Calculate totals for confirmation
      const currentEntries = (ledgerEntries || []).filter(entry => 
        !(entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement')))
      );
      
      const totalCredit = parseFloat(currentEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0).toFixed(2));
      const totalDebit = parseFloat(currentEntries.reduce((sum, entry) => sum + Math.abs(entry.debit || 0), 0).toFixed(2));

      // Get starting balance from the last settlement
      let startingBalance = 0;
      
      // First check current entries for any existing settlements
      const currentSettlements = (ledgerEntries || []).filter(entry => 
        entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement'))
      );
      
      if (currentSettlements.length > 0) {
        // Use the latest settlement balance
        const latestSettlement = currentSettlements.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA; // Newest first
        })[0];
        startingBalance = latestSettlement.balance || 0;
      } else if (oldRecords.length > 0) {
        // Check old records for the last settlement
        const lastMondayFinal = oldRecords
          .filter(entry => entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement')))
          .sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateB.getTime() - dateA.getTime();
          })[0];
        
        if (lastMondayFinal) {
          startingBalance = lastMondayFinal.balance || 0;
        }
      }
      
      const netBalance = parseFloat((startingBalance + totalCredit - totalDebit).toFixed(2));

      // Create Monday Final settlement entry with timestamp
      const today = new Date().toLocaleDateString('en-GB');
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      const settlementEntry = {
        id: Date.now(),
        date: today,
        remarks: `Monday Final Settlement ${today} at ${timeString}`,
        tnsType: 'Monday S...',
        credit: netBalance > 0 ? netBalance : 0,
        debit: netBalance < 0 ? Math.abs(netBalance) : 0,
        balance: netBalance,
        chk: false,
        ti: '12',
        createdAt: now.toISOString() // Add creation timestamp for proper ordering
      };

      // Move current entries to old records
      setOldRecords(prevOldRecords => [...prevOldRecords, ...currentEntries]);

      // Add settlement to current entries (keep existing settlements)
      const existingSettlements = ledgerEntries.filter(entry => 
        entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement'))
      );
      setLedgerEntries([...existingSettlements, settlementEntry]);
      
      // Update closing balance
      setClosingBalance(netBalance);

      setShowMondayFinalModal(false);
      toast({
        title: "Success",
        description: `Monday Final settlement created successfully at ${timeString}`,
      });
    } catch (error) {
      console.error('Error creating Monday Final settlement:', error);
      toast({
        title: "Error",
        description: "Failed to create Monday Final settlement",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Monday Final settlement
  const handleUndoMondayFinal = async (settlementEntry: any, originalEntries: any[]) => {
    try {
      // Delete the settlement entry from backend
      if (settlementEntry.id && !settlementEntry.id.toString().startsWith('entry-')) {
        const idString = typeof settlementEntry.id === 'string' ? settlementEntry.id : settlementEntry.id.toString();
        await partyLedgerAPI.deleteEntry(idString);
      }

      // Restore original entries
      const restoredEntries = (originalEntries || []).filter(entry => 
        !(entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement')))
      );

      // Update entries back to normal status
      const updatePromises = restoredEntries
        .filter(entry => entry.id && !entry.id.toString().startsWith('entry-'))
        .map(entry => {
          const idString = typeof entry.id === 'string' ? entry.id : entry.id.toString();
          return partyLedgerAPI.updateEntry(idString, { mondayFinal: 'No' });
        });

      await Promise.all(updatePromises);

      // Restore to current entries
      const recalculatedEntries = recalculateBalances(restoredEntries);
      setLedgerEntries(recalculatedEntries);
      
      // Remove from old records
      setOldRecords(prevOldRecords => 
        (prevOldRecords || []).filter(entry => 
          !originalEntries.some(original => original.id === entry.id)
        )
      );

      // Update closing balance
      if (recalculatedEntries.length > 0) {
        setClosingBalance(recalculatedEntries[recalculatedEntries.length - 1].balance);
      }

      toast({
        title: "✅ Monday Final Settlement Undone",
        description: `${restoredEntries.length} entries restored. Settlement deleted.`,
      });

    } catch (error) {
      console.error('Error undoing Monday Final settlement:', error);
      toast({
        title: "Error",
        description: "Failed to undo Monday Final settlement",
        variant: "destructive"
      });
    }
  };

  // Old Record functionality - Toggle between current and old records
  const handleOldRecord = () => {
    if ((oldRecords || []).length === 0) {
      toast({
        title: "No Old Records",
        description: "No archived records found. Complete a Monday Final settlement first.",
      });
      return;
    }

    setShowOldRecords(!showOldRecords);
    
    if (!showOldRecords) {
      // Show old records in proper chronological order (oldest first for display)
      const sortedOldRecords = [...(oldRecords || [])].sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime(); // Oldest first for display
      });
      
      toast({
        title: "📋 Old Records View",
        description: `Showing ${sortedOldRecords.length} archived transactions in chronological order`,
      });
    } else {
      toast({
        title: "📊 Current View",
        description: "Back to current ledger entries",
      });
    }
  };

  // Modify functionality
  const handleModify = () => {
    const currentEntries = showOldRecords ? (oldRecords || []) : (ledgerEntries || []);
    const selectedEntries = currentEntries.filter(entry => entry.chk);
    
    if (selectedEntries.length === 0) {
      toast({
        title: "Warning",
        description: "Please select an entry to modify",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedEntries.length > 1) {
      toast({
        title: "Warning",
        description: "Please select only one entry to modify",
        variant: "destructive"
      });
      return;
    }
    
    const entry = selectedEntries[0];
    setSelectedEntryForModify(entry);
    setModifyFormData({
      remarks: entry.remarks || '',
      amount: entry.credit ? entry.credit.toString() : Math.abs(entry.debit || 0).toString(),
      tnsType: (entry.tnsType as 'CR' | 'DR') || 'CR'
    });
    setIsModifyModalOpen(true);
  };

  // Helper function to recalculate all balances
  const recalculateBalances = (entries: any[]) => {
    if (!entries || entries.length === 0) {
      setClosingBalance(0);
      return [];
    }

    // Sort entries by date AND creation time (oldest first) for proper balance calculation
    const sortedEntries = [...entries].sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      
      // If dates are same, sort by creation time (older entries first for balance calculation)
      if (dateA.getTime() === dateB.getTime()) {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB; // Older first for balance calculation
      }
      
      return dateA.getTime() - dateB.getTime(); // Oldest first for balance calculation
    });
    
    // Find Monday Final settlement to get starting balance
    let startingBalance = 0;
    const mondayFinalSettlement = sortedEntries.find(entry => 
      entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement'))
    );
    
    if (mondayFinalSettlement) {
      startingBalance = mondayFinalSettlement.balance || 0;
    }
    
    // Recalculate balances for all entries starting from Monday Final balance
    let runningBalance = startingBalance;
    const recalculatedEntries = sortedEntries.map(entry => {
      // Skip balance calculation for Monday Final settlement (keep its original balance)
      if (entry.tnsType === 'Monday S...' || (entry.remarks && entry.remarks.includes('Monday Final Settlement'))) {
        return {
          ...entry,
          balance: entry.balance || runningBalance
        };
      }
      
      // Credit increases balance, Debit decreases balance
      const creditAmount = parseFloat((entry.credit || 0).toFixed(2));
      const debitAmount = parseFloat(Math.abs(entry.debit || 0).toFixed(2)); // Make sure debit is positive for calculation
      
      // Calculate net effect of this entry
      const netEffect = creditAmount - debitAmount;
      runningBalance = parseFloat((runningBalance + netEffect).toFixed(2));
      
      return {
        ...entry,
        credit: creditAmount,
        debit: entry.debit ? -debitAmount : 0, // Keep debit negative
        balance: runningBalance
      };
    });
    
    // Update closing balance
    setClosingBalance(parseFloat(runningBalance.toFixed(2)));
    
    // Return entries in display order (oldest first - new transactions at bottom)
    return recalculatedEntries.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      
      // If dates are same, sort by creation time (older entries first for display)
      if (dateA.getTime() === dateB.getTime()) {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB; // Older first for display
      }
      
      return dateA.getTime() - dateB.getTime(); // Oldest first for display
    });
  };

  // Handle modify form submission
  const handleModifySubmit = async () => {
    if (!selectedEntryForModify) return;
    
    // Validate amount
    if (!modifyFormData.amount || parseFloat(modifyFormData.amount) === 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const updateData: any = {
        remarks: modifyFormData.remarks,
        tnsType: modifyFormData.tnsType
      };
      
      // Update credit/debit based on transaction type
      if (modifyFormData.tnsType === 'CR') {
        updateData.credit = parseFloat(modifyFormData.amount);
        updateData.debit = 0;
      } else {
        updateData.credit = 0;
        updateData.debit = -parseFloat(modifyFormData.amount);
      }
      
      // Only update if it's a real entry (not mock data)
      if (selectedEntryForModify.id && !selectedEntryForModify.id.toString().startsWith('entry-')) {
        const idString = typeof selectedEntryForModify.id === 'string' 
          ? selectedEntryForModify.id 
          : selectedEntryForModify.id.toString();
        
        await partyLedgerAPI.updateEntry(idString, updateData);
      }
      
      // Update local state and recalculate all balances
      if (showOldRecords) {
        setOldRecords(prevRecords => {
          const updatedRecords = prevRecords.map(entry =>
            entry.id === selectedEntryForModify.id
              ? { ...entry, ...updateData }
              : entry
          );
          return recalculateBalances(updatedRecords);
        });
      } else {
        setLedgerEntries(prevEntries => {
          const updatedEntries = prevEntries.map(entry =>
            entry.id === selectedEntryForModify.id
              ? { ...entry, ...updateData }
              : entry
          );
          return recalculateBalances(updatedEntries);
        });
      }
      
      setIsModifyModalOpen(false);
      setSelectedEntryForModify(null);
      setModifyFormData({ remarks: '', amount: '', tnsType: 'CR' });
      
      toast({
        title: "Success",
        description: "Entry modified successfully",
      });
    } catch (error) {
      console.error('Error modifying entry:', error);
      toast({
        title: "Error",
        description: "Failed to modify entry",
        variant: "destructive"
      });
    }
  };

  // Handle modify form cancellation
  const handleModifyCancel = () => {
    setIsModifyModalOpen(false);
    setSelectedEntryForModify(null);
    setModifyFormData({ remarks: '', amount: '', tnsType: 'CR' });
  };

  // Delete functionality
  const handleDelete = async () => {
    const currentEntries = showOldRecords ? (oldRecords || []) : (ledgerEntries || []);
    const selectedEntries = currentEntries.filter(entry => entry.chk);
    
    if (selectedEntries.length === 0) {
      toast({
        title: "Warning",
        description: "Please select entries to delete",
        variant: "destructive"
      });
      return;
    }

    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    const currentEntries = showOldRecords ? (oldRecords || []) : (ledgerEntries || []);
    const selectedEntries = currentEntries.filter(entry => entry.chk);
    
    setActionLoading(true);
    try {
      // Delete entries from backend
      const deletePromises = selectedEntries
        .filter(entry => entry.id && !entry.id.toString().startsWith('entry-'))
        .map(entry => {
          const idString = typeof entry.id === 'string' ? entry.id : entry.id.toString();
          return partyLedgerAPI.deleteEntry(idString);
        });

      await Promise.all(deletePromises);

      // Update local state
      if (showOldRecords) {
        setOldRecords(prevRecords => {
          const updatedRecords = prevRecords.filter(entry => !entry.chk);
          return recalculateBalances(updatedRecords);
        });
      } else {
        setLedgerEntries(prevEntries => {
          const updatedEntries = prevEntries.filter(entry => !entry.chk);
          return recalculateBalances(updatedEntries);
        });
      }

      setShowDeleteModal(false);
      toast({
        title: "Success",
        description: `${selectedEntries.length} entry(ies) deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast({
        title: "Error",
        description: "Failed to delete entries",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Print functionality
  const handlePrint = () => {
    // Calculate totals for summary
    const totalCredit = ledgerEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const totalDebit = ledgerEntries.reduce((sum, entry) => sum + Math.abs(entry.debit || 0), 0);
    
    const printContent = `
      <html>
        <head>
          <title>Account Ledger - ${decodeURIComponent(partyName || '')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { margin-top: 20px; display: flex; justify-content: space-between; }
            .summary-item { flex: 1; text-align: center; padding: 10px; border: 1px solid #ddd; margin: 0 5px; }
            .credit { color: #28a745; font-weight: bold; }
            .debit { color: #dc3545; font-weight: bold; }
            .balance { color: #007bff; font-weight: bold; }
            .company-info { margin-bottom: 20px; text-align: center; }
            .date-time { font-size: 12px; color: #666; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1 style="margin: 0; color: #333;">Account Ledger Report</h1>
              <h2 style="margin: 10px 0; color: #666;">Party: ${decodeURIComponent(partyName || '')}</h2>
            </div>
            <div class="date-time">
              Generated on: ${new Date().toLocaleString('en-GB')}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Remarks</th>
                <th>Type</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerEntries.map(entry => `
                <tr>
                  <td>${entry.date}</td>
                  <td>${entry.remarks || ''}</td>
                  <td>${entry.tnsType}</td>
                  <td class="credit">${entry.credit ? entry.credit.toLocaleString() : ''}</td>
                  <td class="debit">${entry.debit ? Math.abs(entry.debit).toLocaleString() : ''}</td>
                  <td class="balance">${entry.balance ? entry.balance.toLocaleString() : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-item">
              <strong>Total Credit:</strong><br>
              <span class="credit">${totalCredit.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <strong>Total Debit:</strong><br>
              <span class="debit">${totalDebit.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <strong>Closing Balance:</strong><br>
              <span class="balance">${closingBalance.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <strong>Total Entries:</strong><br>
              <span>${ledgerEntries.length}</span>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <h2 className="text-xl font-semibold">Account Ledger</h2>
            <button
              onClick={handleRefreshAll}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh All'}
            </button>
          </div>
          
          <div className="flex">
            {/* Left Container - Main Data */}
            <div className="flex-1 p-6">
              {/* Party Info Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Party Name</span>
                  <span className="font-semibold text-lg">{decodeURIComponent(partyName || '001-AR RTGS')}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Closing Balance :</span>
                  <span className={`font-bold text-lg ${closingBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {closingBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-700">Total Credit</div>
                  <div className="text-2xl font-bold text-green-600">
                    {parseFloat((showOldRecords ? oldRecords : ledgerEntries).reduce((sum, entry) => sum + (entry.credit || 0), 0).toFixed(2)).toLocaleString()}
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-700">Total Debit</div>
                  <div className="text-2xl font-bold text-red-600">
                    {parseFloat((showOldRecords ? oldRecords : ledgerEntries).reduce((sum, entry) => sum + Math.abs(entry.debit || 0), 0).toFixed(2)).toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-700">Calculated Balance</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {parseFloat(((showOldRecords ? oldRecords : ledgerEntries).reduce((sum, entry) => sum + (entry.credit || 0), 0) - 
                      (showOldRecords ? oldRecords : ledgerEntries).reduce((sum, entry) => sum + Math.abs(entry.debit || 0), 0)).toFixed(2)).toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-700">Total Entries</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {showOldRecords ? oldRecords.length : ledgerEntries.length}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700">Selected</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {showOldRecords 
                      ? oldRecords.filter(entry => entry.chk).length
                      : ledgerEntries.filter(entry => entry.chk).length
                    }
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto mb-6">
                {loading ? (
                  <div className="space-y-4">
                    <div className="animate-pulse">
                      <div className="h-10 bg-gray-200 rounded mb-4"></div>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
                      ))}
                    </div>
                    <div className="text-center text-gray-500">Loading ledger data...</div>
                  </div>
                ) : showOldRecords ? (
                  // Show Old Records
                  oldRecords.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">📋</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No archived records found</h3>
                      <p className="text-gray-500">Complete a Monday Final settlement to archive transactions.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-yellow-600">📋</span>
                            <span className="text-sm font-medium text-yellow-800">
                              Viewing Archived Records ({oldRecords.length} entries)
                            </span>
                          </div>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Remarks</TableHead>
                            <TableHead>Tns Type</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Chk</TableHead>
                            <TableHead>Ti</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {oldRecords
                            .sort((a, b) => {
                              const dateA = new Date(a.date.split('/').reverse().join('-'));
                              const dateB = new Date(b.date.split('/').reverse().join('-'));
                              return dateA.getTime() - dateB.getTime(); // Oldest first for display
                            })
                            .map((entry, index) => (
                            <TableRow key={`old-${index}`} className={`bg-gray-50 ${entry.chk ? 'bg-blue-100' : ''}`}>
                              <TableCell className="text-gray-600">{entry.date}</TableCell>
                              <TableCell className="text-gray-600">{entry.remarks}</TableCell>
                              <TableCell className="text-gray-600">{entry.tnsType}</TableCell>
                              <TableCell className="text-green-600 font-medium">
                                {entry.credit ? entry.credit.toLocaleString() : ''}
                              </TableCell>
                              <TableCell className="text-red-600 font-medium">
                                {entry.debit ? Math.abs(entry.debit).toLocaleString() : ''}
                              </TableCell>
                              <TableCell className="text-blue-600 font-medium">
                                {entry.balance ? entry.balance.toLocaleString() : ''}
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={entry.chk}
                                  onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="text-gray-600">{entry.ti}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                ) : (
                  // Show Current Entries
                  ledgerEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No ledger entries found</h3>
                      <p className="text-gray-500">Start by adding a new entry using the form on the right.</p>
                    </div>
                  ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Remarks</TableHead>
                      <TableHead className="font-semibold">Tns Type</TableHead>
                      <TableHead className="font-semibold text-right">Credit</TableHead>
                      <TableHead className="font-semibold text-right">Debit</TableHead>
                      <TableHead className="font-semibold text-right">Balance</TableHead>
                      <TableHead className="font-semibold text-center">Chk</TableHead>
                      <TableHead className="font-semibold">Ti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry, index) => (
                      <TableRow key={entry.id || `entry-${index}`} className={entry.chk ? 'bg-blue-100' : ''}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className={entry.remarks === 'AQC' ? 'bg-blue-200 font-semibold' : ''}>
                          {entry.remarks}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-sm ${
                            entry.tnsType === 'CR' ? 'bg-green-100 text-green-800' : 
                            entry.tnsType === 'DR' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.tnsType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{entry.credit || ''}</TableCell>
                        <TableCell className="text-right">{entry.debit || ''}</TableCell>
                        <TableCell className={`text-right font-semibold ${entry.balance < 0 ? 'text-red-600' : ''}`}>
                          {entry.balance}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={entry.chk}
                            onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>{entry.ti}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  )
                )}
              </div>

              {/* Entry Form */}
              {!showOldRecords && (
              <div className="border-t pt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Add New Transaction</h3>
                    <p className="text-sm text-gray-600">Enter transaction details below</p>
                  </div>
                  
                  <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                    <input
                      type="text"
                      value={newEntry.partyName}
                      onChange={(e) => setNewEntry({...newEntry, partyName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter party name"
                        required
                    />
                  </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                      <select
                        value={newEntry.transactionType}
                        onChange={(e) => setNewEntry({...newEntry, transactionType: e.target.value as 'CR' | 'DR'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="CR">Credit (+)</option>
                        <option value="DR">Debit (-)</option>
                      </select>
                    </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                        value={newEntry.amount}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string, numbers, and decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewEntry({...newEntry, amount: value});
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleFormSubmit(e as React.FormEvent);
                          }
                        }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <input
                      type="text"
                      value={newEntry.remarks}
                      onChange={(e) => setNewEntry({...newEntry, remarks: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter remarks (optional)"
                    />
                    {newEntry.partyName && (
                      <div className="text-xs text-gray-500 mt-1">
                        Preview: {generateRemarks()}
                      </div>
                    )}
                  </div>
                    <div className="flex flex-col space-y-2">
                    <button
                        type="submit"
                        disabled={loading || !newEntry.partyName || !newEntry.amount || parseFloat(newEntry.amount) === 0}
                        className="w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Adding...' : 'Add Transaction'}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearForm}
                        className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                      >
                        Clear Form
                    </button>
                  </div>
                  </form>
                  
                  {/* Transaction Preview */}
                  {newEntry.amount && parseFloat(newEntry.amount) !== 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 mb-1">Transaction Preview:</div>
                      <div className="text-sm text-blue-700">
                        <span className="font-medium">Type:</span> {newEntry.transactionType === 'CR' ? 'Credit' : 'Debit'} | 
                        <span className="font-medium"> Amount:</span> {Math.abs(parseFloat(newEntry.amount)).toLocaleString()} | 
                        <span className="font-medium"> Remarks:</span> {generateRemarks()} | 
                        <span className="font-medium"> New Balance:</span> {(closingBalance + (newEntry.transactionType === 'CR' ? Math.abs(parseFloat(newEntry.amount)) : -Math.abs(parseFloat(newEntry.amount)))).toLocaleString()}
                </div>
              </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar - Action Buttons */}
            <div className="w-48 bg-gray-50 border-l border-gray-200 p-4">
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={handleDCReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  DC Report
                </button>
                {!showOldRecords && (
                  <Button 
                    onClick={handleMondayFinalClick}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                  Monday Final
                  </Button>
                )}
                <button 
                  onClick={handleOldRecord}
                  className={`px-4 py-2 rounded-md transition-colors font-medium text-sm ${
                    showOldRecords 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                >
                  {showOldRecords ? 'Current' : 'Old Record'}
                </button>
                <button 
                  onClick={handleModify}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Modify
                </button>
                <button 
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Delete
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm"
                >
                  Print
                </button>
                <button
                  onClick={handleCheckAll}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  Check All
                </button>
                <button
                  onClick={handleExit}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium text-sm"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modify Modal */}
      {isModifyModalOpen && selectedEntryForModify && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
            <div className="text-center">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">Modify Entry</h3>
              <div className="mt-2 px-7 py-3">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <input
                      type="text"
                      value={modifyFormData.remarks}
                      onChange={(e) => setModifyFormData({...modifyFormData, remarks: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={modifyFormData.amount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, numbers, and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setModifyFormData({...modifyFormData, amount: value});
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tns Type</label>
                    <select
                      value={modifyFormData.tnsType}
                      onChange={(e) => setModifyFormData({...modifyFormData, tnsType: e.target.value as 'CR' | 'DR'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CR">Credit</option>
                      <option value="DR">Debit</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleModifySubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleModifyCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monday Final Confirmation Modal */}
      <AlertDialog open={showMondayFinalModal} onOpenChange={setShowMondayFinalModal}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <AlertDialogHeader className="flex-shrink-0 pb-4">
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Monday Final Settlement Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Monday Final settlement confirmation dialog with transaction summary and warnings
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Settlement Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transactions:</span>
                  <span className="font-medium">{mondayFinalData.transactionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Credit:</span>
                  <span className="font-medium text-green-600">₹{mondayFinalData.totalCredit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Debit:</span>
                  <span className="font-medium text-red-600">₹{mondayFinalData.totalDebit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Starting Balance:</span>
                  <span className="font-medium">₹{mondayFinalData.startingBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between col-span-2 border-t pt-2">
                  <span className="text-gray-800 font-semibold">Final Balance:</span>
                  <span className={`font-bold text-lg ${mondayFinalData.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{mondayFinalData.finalBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-2">⚠️ WARNING: This action cannot be easily undone!</p>
                  <p className="mb-3">This will:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Consolidate all current entries into one settlement</li>
                    <li>Move all current entries to Old Records</li>
                    <li>Start fresh with the settlement balance</li>
                    <li>Create a permanent financial record</li>
                    <li>Add timestamp to settlement for tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Benefits:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Clean ledger with consolidated balance</li>
                    <li>Historical records preserved in Old Records</li>
                    <li>Multiple settlements per day allowed</li>
                    <li>Timestamp tracking for each settlement</li>
                    <li>Accurate balance continuity</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Multiple Settlements:</p>
                  <p>You can create multiple Monday Final settlements per day. Each settlement will be timestamped for proper tracking and balance calculation.</p>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="flex-shrink-0 border-t pt-4 mt-4 bg-white">
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinalConfirm}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating Settlement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Settlement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-700">
              Are you sure you want to delete {showOldRecords ? oldRecords.filter(entry => entry.chk).length : ledgerEntries.filter(entry => entry.chk).length} selected entry(ies)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteModal(false)} disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountLedger;
