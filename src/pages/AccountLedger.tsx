
import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertTriangle, Calculator, Clock, DollarSign, TrendingUp, Plus, RefreshCw, FileText, Printer } from 'lucide-react';
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

  // Load ledger data
  const loadLedgerData = async () => {
    if (!partyName) return;
    
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getPartyLedger(partyName);
      if (response.success) {
        setLedgerData(response.data);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } catch (error: any) {
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

    setActionLoading(true);
    try {
      const response = await partyLedgerAPI.addEntry({
        partyName,
        amount: parseFloat(newEntry.amount),
        remarks: newEntry.remarks,
        tnsType: newEntry.tnsType,
        credit: newEntry.tnsType === 'CR' ? parseFloat(newEntry.amount) : 0,
        debit: newEntry.tnsType === 'DR' ? parseFloat(newEntry.amount) : 0,
        ti: `${Date.now()}:`
      });

      if (response.success) {
        // Update ledger data with backend response
        setLedgerData({
          ...ledgerData!,
          ledgerEntries: response.data.updatedLedger,
          summary: response.data.summary
        });

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
        toast({
          title: "Error",
          description: response.message || "Failed to add entry",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add entry",
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
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading ledger data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ledgerData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600">No ledger data available</p>
          </div>
        </div>
      </div>
    );
  }

  const currentEntries = showOldRecords ? ledgerData.oldRecords : ledgerData.ledgerEntries;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Party Ledger</h1>
              <p className="text-gray-600">Party: {partyName}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleExit}
                variant="outline"
                size="sm"
              >
                Exit
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credit</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(ledgerData.summary?.totalCredit || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Debit</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{(ledgerData.summary?.totalDebit || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <Calculator className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className={`text-2xl font-bold ${(ledgerData.summary?.calculatedBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{(ledgerData.summary?.calculatedBalance || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ledgerData.summary?.totalEntries || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* New Entry Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <input
                type="text"
                value={newEntry.remarks}
                onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter remarks"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={newEntry.tnsType}
                onChange={(e) => setNewEntry({ ...newEntry, tnsType: e.target.value as 'CR' | 'DR' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CR">Credit (CR)</option>
                <option value="DR">Debit (DR)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddEntry}
                disabled={actionLoading || !newEntry.amount || !newEntry.remarks}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </div>
        </div>

        {/* Records Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowOldRecords(false)}
                variant={!showOldRecords ? "default" : "outline"}
                size="sm"
              >
                Current Records
              </Button>
              <Button
                onClick={() => setShowOldRecords(true)}
                variant={showOldRecords ? "default" : "outline"}
                size="sm"
              >
                Old Records
              </Button>
            </div>
            <Button
              onClick={() => setShowMondayFinalModal(true)}
              disabled={actionLoading || currentEntries.filter(e => e.chk).length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Monday Final
            </Button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      checked={entry.chk}
                      onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.remarks}</TableCell>
                  <TableCell>
                    <Badge variant={entry.tnsType === 'CR' ? 'default' : entry.tnsType === 'DR' ? 'secondary' : 'outline'}>
                      {entry.tnsType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₹{entry.balance.toLocaleString()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      </div>
    </div>
  );
};

export default AccountLedger;
