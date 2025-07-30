
import { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertTriangle, Calculator, Clock, DollarSign, TrendingUp, Plus, RefreshCw, FileText, Printer, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { partyLedgerAPI } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { LedgerEntry } from '../types';

const AccountLedger = () => {
  const { partyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();
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
  const [showOldRecords, setShowOldRecords] = useState(false);
  const [newEntry, setNewEntry] = useState({
    amount: '',
    remarks: '',
    tnsType: 'CR' as 'CR' | 'DR'
  });
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);

  // Load ledger data
  const loadLedgerData = async () => {
    if (!partyName) return;
    
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getPartyLedger(partyName);
      console.log('Backend response:', response);
      console.log('Response data type:', typeof response.data);
      console.log('Response data:', response.data);
      console.log('Is response.data an array?', Array.isArray(response.data));
      
      if (response.success) {
        // Check if data is array or object
        let entries = [];
        let summary = null;
        let oldRecords = [];
        let closingBalance = 0;
        let mondayFinalData = null;
        
        if (Array.isArray(response.data)) {
          // Data is array format - extract the first element
          const dataObject = response.data[0] || {} as any;
          console.log('Extracted data object:', dataObject);
          
          entries = dataObject.ledgerEntries || [];
          summary = dataObject.summary || {
            totalCredit: entries.reduce((sum, entry) => sum + (entry.credit || 0), 0),
            totalDebit: entries.reduce((sum, entry) => sum + (entry.debit || 0), 0),
            calculatedBalance: entries.reduce((sum, entry) => sum + (entry.balance || 0), 0),
            totalEntries: entries.length
          };
          oldRecords = dataObject.oldRecords || [];
          closingBalance = dataObject.closingBalance || 0;
          mondayFinalData = dataObject.mondayFinalData;
        } else if (response.data && typeof response.data === 'object') {
          // Data is object format (new format)
          const dataObj = response.data as any;
          entries = dataObj.ledgerEntries || [];
          summary = dataObj.summary || {
            totalCredit: entries.reduce((sum, entry) => sum + (entry.credit || 0), 0),
            totalDebit: entries.reduce((sum, entry) => sum + (entry.debit || 0), 0),
            calculatedBalance: entries.reduce((sum, entry) => sum + (entry.balance || 0), 0),
            totalEntries: entries.length
          };
          oldRecords = dataObj.oldRecords || [];
          closingBalance = dataObj.closingBalance || 0;
          mondayFinalData = dataObj.mondayFinalData;
        }
        
        console.log('Final entries:', entries);
        console.log('Final summary:', summary);
        
        setLedgerData({
          ledgerEntries: entries,
          oldRecords: oldRecords,
          closingBalance: closingBalance,
          summary: summary,
          mondayFinalData: mondayFinalData || {
            transactionCount: entries.filter(entry => entry.tnsType === 'Monday S...').length,
            totalCredit: summary.totalCredit,
            totalDebit: summary.totalDebit,
            startingBalance: 0,
            finalBalance: summary.calculatedBalance
          }
        });
      } else {
        console.error('API Error:', response.message);
              toast({
                title: "Error",
          description: response.message || "Failed to load ledger data",
                variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Load data error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load ledger data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadLedgerData();
  }, [partyName]);

  // Handle checkbox change
  const handleCheckboxChange = async (id: string | number, checked: boolean) => {
    if (!ledgerData) return;

    const updatedEntries = ledgerData.ledgerEntries.map(entry => 
      entry.id === id ? { ...entry, chk: checked } : entry
    );

    setLedgerData({
      ...ledgerData,
      ledgerEntries: updatedEntries
    });
  };

  // Handle check all functionality
  const handleCheckAll = () => {
    if (!ledgerData) return;

    const allChecked = ledgerData.ledgerEntries.every(entry => entry.chk);
    const updatedEntries = ledgerData.ledgerEntries.map(entry => ({
      ...entry,
      chk: !allChecked
    }));

    setLedgerData({
      ...ledgerData,
      ledgerEntries: updatedEntries
    });
  };

  // Handle add new entry
  const handleAddEntry = async () => {
    if (!partyName || !newEntry.amount || !newEntry.remarks) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate amount is not zero
    const amount = parseFloat(newEntry.amount);
    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Validation Error",
        description: "Amount cannot be zero",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    try {
      // Determine transaction type based on amount sign
      const tnsType = amount > 0 ? 'CR' : 'DR';
      const absoluteAmount = Math.abs(amount);
      
      const entryData = {
        partyName,
        amount: absoluteAmount, // Send positive amount to backend
        remarks: newEntry.remarks,
        tnsType,
        credit: tnsType === 'CR' ? absoluteAmount : 0,
        debit: tnsType === 'DR' ? absoluteAmount : 0,
        ti: `${Date.now()}:`
      };

      console.log('Adding entry:', entryData);
      const response = await partyLedgerAPI.addEntry(entryData);
      console.log('Add entry response:', response);

      if (response.success) {
        console.log('Entry added successfully, reloading data...');
        // Reload ledger data to get updated state
        await loadLedgerData();

        // Clear form
        setNewEntry({
          amount: '',
          remarks: '',
          tnsType: 'CR'
        });

        toast({
          title: "Success",
          description: "Entry added successfully"
        });
      } else {
        console.error('Add entry failed:', response.message);
        toast({
          title: "Error",
          description: response.message || "Failed to add entry",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Add entry error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add entry",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

    // Handle modify entry
  const handleModifyEntry = async () => {
    if (!editingEntry || !editingEntry._id) {
      console.error('Modify entry error: No entry or _id found', editingEntry);
      toast({
        title: "Error",
        description: "No entry selected for modification",
        variant: "destructive"
      });
      return;
    }
    
    console.log('Modifying entry:', editingEntry);
    setActionLoading(true);
    try {
      const response = await partyLedgerAPI.updateEntry(editingEntry._id, {
        remarks: editingEntry.remarks,
        credit: editingEntry.tnsType === 'CR' ? (editingEntry.credit || editingEntry.debit || 0) : 0,
        debit: editingEntry.tnsType === 'DR' ? (editingEntry.credit || editingEntry.debit || 0) : 0,
        tnsType: editingEntry.tnsType
      } as any);

      console.log('Modify response:', response);
      if (response.success) {
        await loadLedgerData();
        setEditingEntry(null);
        setShowModifyModal(false);
      toast({
          title: "Success",
          description: "Entry modified successfully"
        });
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
  };

    // Handle delete entry
  const handleDeleteEntry = async () => {
    if (!entryToDelete || !entryToDelete._id) {
      console.error('Delete entry error: No entry or _id found', entryToDelete);
      toast({
        title: "Error",
        description: "No entry selected for deletion",
        variant: "destructive"
      });
      return;
    }

    console.log('Deleting entry:', entryToDelete);
    setActionLoading(true);
    try {
      const response = await partyLedgerAPI.deleteEntry(entryToDelete._id);
      console.log('Delete response:', response);

      if (response.success) {
        await loadLedgerData();
        setEntryToDelete(null);
        setShowDeleteModal(false);
      toast({
          title: "Success",
          description: "Entry deleted successfully"
      });
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
  };

  // Handle Monday Final settlement
  const handleMondayFinal = async () => {
    if (!ledgerData) return;

    const selectedEntries = ledgerData.ledgerEntries.filter(entry => entry.chk);
    if (selectedEntries.length === 0) {
      toast({
        title: "No Entries Selected",
        description: "Please select entries for Monday Final settlement",
        variant: "destructive"
      });
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await partyLedgerAPI.updateMondayFinal([partyName!]);
      
      if (response.success) {
        // Reload ledger data to get updated state
        await loadLedgerData();
        
      toast({
          title: "Monday Final Settlement",
          description: "Settlement completed successfully"
        });
        
        setShowMondayFinalModal(false);
    } else {
      toast({
        title: "Error",
          description: response.message || "Failed to process settlement",
        variant: "destructive"
      });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process settlement",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle refresh
  const handleRefresh = () => {
    loadLedgerData();
  };

  // Handle exit
  const handleExit = () => {
    navigate('/party-ledger');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <TopNavigation />
        <div className="bg-blue-800 text-white p-2">
          <h1 className="text-lg font-bold">Account Ledger</h1>
            </div>
        <div className="bg-gray-200 p-1">
          <div className="flex space-x-4 text-sm">
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Configure</span>
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Create</span>
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Data Entry</span>
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Report</span>
            </div>
          </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ledger data...</p>
            </div>
            </div>
            </div>
    );
  }

  if (!ledgerData) {
  return (
      <div className="min-h-screen bg-gray-100">
      <TopNavigation />
        <div className="bg-blue-800 text-white p-2">
          <h1 className="text-lg font-bold">Account Ledger</h1>
                  </div>
        <div className="bg-gray-200 p-1">
          <div className="flex space-x-4 text-sm">
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Configure</span>
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Create</span>
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Data Entry</span>
            <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Report</span>
                  </div>
                </div>
        <div className="text-center py-8">
          <p className="text-gray-600">No ledger data available</p>
              </div>
              </div>
    );
  }

  const currentEntries = showOldRecords ? ledgerData.oldRecords : ledgerData.ledgerEntries;

  return (
    <div className="min-h-screen bg-gray-100">
      <TopNavigation />
      {/* Desktop Application Header */}
      <div className="bg-blue-800 text-white p-2">
        <h1 className="text-lg font-bold">Account Ledger</h1>
                </div>
                
      {/* Menu Bar */}
      <div className="bg-gray-200 p-1">
        <div className="flex space-x-4 text-sm">
          <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Configure</span>
          <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Create</span>
          <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Data Entry</span>
          <span className="cursor-pointer hover:bg-blue-600 hover:text-white px-2 py-1">Report</span>
                  </div>
                </div>
                
      {/* Main Content Area */}
      <div className="flex h-screen">
        {/* Left Content Area */}
        <div className="flex-1 p-4">
          {/* Header Section */}
          <div className="bg-white border border-gray-300 p-4 mb-4">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <h2 className="text-xl font-bold text-gray-900">Account Ledger</h2>
              </div>
              <div className="flex items-center space-x-4">
                    <div>
                  <span className="text-sm font-medium">Party Name: </span>
                  <span className="text-sm">{partyName}</span>
                    </div>
                    <div>
                  <span className="text-sm font-medium">Closing Balance: </span>
                  <span className="text-sm font-bold">₹{(ledgerData.summary?.calculatedBalance || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
          <div className="bg-white border border-gray-300">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1 text-left">Date</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">Remarks</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">Tns Type</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Credit</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Debit</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Balance</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Chk</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">Ti</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEntries && currentEntries.length > 0 ? (
                    currentEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1">{entry.date}</td>
                        <td className="border border-gray-300 px-2 py-1">{entry.remarks}</td>
                        <td className="border border-gray-300 px-2 py-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            entry.tnsType === 'CR' ? 'bg-green-100 text-green-800' : 
                            entry.tnsType === 'DR' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.tnsType}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {(entry.credit || 0) > 0 ? `₹${(entry.credit || 0).toLocaleString()}` : '-'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {(entry.debit || 0) > 0 ? `₹${(entry.debit || 0).toLocaleString()}` : '-'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          <span className={(entry.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ₹{(entry.balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={entry.chk}
                            onChange={(e) => handleCheckboxChange(entry.id, e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                                                <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                          {entry.ti || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="border border-gray-300 px-2 py-4 text-center text-gray-500">
                        No entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
                  </div>
                </div>

          {/* New Entry Form */}
          <div className="bg-white border border-gray-300 p-4 mt-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Party Name</label>
                <input
                  type="text"
                  value={partyName || ''}
                  disabled
                  className="w-full px-2 py-1 border border-gray-300 text-sm bg-gray-100"
                />
                            </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={newEntry.amount}
                  onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 text-sm"
                  placeholder="Enter amount"
                />
                            </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={newEntry.remarks}
                  onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 text-sm"
                  placeholder="Enter remarks"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddEntry}
                  disabled={actionLoading || !newEntry.amount || !newEntry.remarks}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-sm"
                >
                  {actionLoading ? 'Saving...' : 'OK'}
                </Button>
              </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Action Buttons */}
        <div className="w-48 bg-gray-200 p-2 border-l border-gray-300">
          <div className="space-y-2">
                <Button
              onClick={handleRefresh}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm py-2"
                >
              Refresh All
                </Button>
                <Button
              onClick={() => setShowMondayFinalModal(true)}
              disabled={actionLoading || !currentEntries || currentEntries.filter(e => e.chk).length === 0}
              variant="outline"
              className="w-full bg-white hover:bg-gray-100 text-sm py-2"
            >
              Monday Final
                </Button>
                <Button
              onClick={() => setShowOldRecords(!showOldRecords)}
              variant="outline"
              className="w-full bg-white hover:bg-gray-100 text-sm py-2"
                >
                  Old Record
                </Button>
                <Button
              onClick={() => {
                const selectedEntry = currentEntries?.find(entry => entry.chk);
                console.log('Selected entry for modify:', selectedEntry);
                if (selectedEntry) {
                  setEditingEntry(selectedEntry);
                  setShowModifyModal(true);
                } else {
                  toast({
                    title: "No Entry Selected",
                    description: "Please select an entry to modify",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                >
                  Modify
                </Button>
                <Button
              onClick={() => {
                const selectedEntry = currentEntries?.find(entry => entry.chk);
                console.log('Selected entry for delete:', selectedEntry);
                if (selectedEntry) {
                  setEntryToDelete(selectedEntry);
                  setShowDeleteModal(true);
                } else {
                  toast({
                    title: "No Entry Selected",
                    description: "Please select an entry to delete",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2"
                >
                  Delete
                </Button>
                <Button
                  onClick={handlePrint}
              variant="outline"
              className="w-full bg-white hover:bg-gray-100 text-sm py-2"
                >
                  Print
                </Button>
                <Button
                  onClick={handleCheckAll}
              variant="outline"
              className="w-full bg-white hover:bg-gray-100 text-sm py-2"
                >
                  Check All
                </Button>
                <Button
                  onClick={handleExit}
              variant="outline"
              className="w-full bg-orange-700 hover:bg-orange-800 text-white text-sm py-2"
                >
                  Exit
                </Button>
              </div>
            </div>
          </div>

      {/* Monday Final Modal */}
      <AlertDialog open={showMondayFinalModal} onOpenChange={setShowMondayFinalModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monday Final Settlement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create a Monday Final settlement for the selected entries?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinal}
              disabled={actionLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading ? 'Processing...' : 'Confirm Settlement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modify Entry Modal */}
      <AlertDialog open={showModifyModal} onOpenChange={setShowModifyModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modify Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Modify the selected entry details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                value={editingEntry?.credit || editingEntry?.debit || ''}
                onChange={(e) => setEditingEntry(editingEntry ? {
                  ...editingEntry,
                  credit: editingEntry.tnsType === 'CR' ? parseFloat(e.target.value) || 0 : 0,
                  debit: editingEntry.tnsType === 'DR' ? parseFloat(e.target.value) || 0 : 0
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input
                type="text"
                value={editingEntry?.remarks || ''}
                onChange={(e) => setEditingEntry(editingEntry ? {
                  ...editingEntry,
                  remarks: e.target.value
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter remarks"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select
                value={editingEntry?.tnsType || 'CR'}
                onChange={(e) => setEditingEntry(editingEntry ? {
                  ...editingEntry,
                  tnsType: e.target.value as 'CR' | 'DR',
                  credit: e.target.value === 'CR' ? (editingEntry.credit || editingEntry.debit || 0) : 0,
                  debit: e.target.value === 'DR' ? (editingEntry.credit || editingEntry.debit || 0) : 0
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="CR">Credit (CR)</option>
                <option value="DR">Debit (DR)</option>
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleModifyEntry}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Entry Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Deleting...' : 'Delete Entry'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountLedger;
