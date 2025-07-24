
import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, Transaction } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const AccountLedger = () => {
  const { partyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [closingBalance, setClosingBalance] = useState(0);
  
  const [newEntry, setNewEntry] = useState({
    partyName: '',
    amount: '',
    remarks: ''
  });

  const [editForm, setEditForm] = useState({
    amount: '',
    remarks: ''
  });

  // Fetch transactions for the party
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPartyLedger(encodeURIComponent(partyName || ''));
      
      const sortedTransactions = response.transactions.sort((a: Transaction, b: Transaction) => 
        new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
      );
      
      setTransactions(sortedTransactions);
      
      // Calculate closing balance
      const balance = sortedTransactions.reduce((acc: number, transaction: Transaction) => {
        return acc + (transaction.credit - transaction.debit);
      }, 0);
      setClosingBalance(balance);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [partyName]);

  // Add new transaction
  const handleAddEntry = async () => {
    if (!newEntry.partyName || !newEntry.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(newEntry.amount);
      await apiClient.createTransaction({
        partyId: newEntry.partyName,
        remarks: newEntry.remarks || newEntry.partyName,
        transactionType: amount > 0 ? 'CR' : 'DR',
        credit: amount > 0 ? amount : 0,
        debit: amount < 0 ? Math.abs(amount) : 0,
        balance: 0
      });

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      setNewEntry({ partyName: '', amount: '', remarks: '' });
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  // Edit transaction
  const handleEditTransaction = async (transactionId: string) => {
    if (!editForm.amount) {
      toast({
        title: "Validation Error",
        description: "Please enter amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(editForm.amount);
      await apiClient.updateTransaction(transactionId, {
        remarks: editForm.remarks,
        transactionType: amount > 0 ? 'CR' : 'DR',
        credit: amount > 0 ? amount : 0,
        debit: amount < 0 ? Math.abs(amount) : 0
      });

      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      setEditingTransaction(null);
      setEditForm({ amount: '', remarks: '' });
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
        variant: "destructive",
      });
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await apiClient.deleteTransaction(transactionId);
      
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  // Bulk delete selected transactions
  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select transactions to delete",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedTransactions.length} transactions?`)) return;

    try {
      const response = await apiClient.bulkDeleteTransactions(selectedTransactions);

      toast({
        title: "Success",
        description: response.message,
      });
      setSelectedTransactions([]);
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transactions",
        variant: "destructive",
      });
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (transactionId: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactions(prev => [...prev, transactionId]);
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));
    }
  };

  // Handle check all
  const handleCheckAll = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(t => t._id || ''));
    }
  };

  // Start editing
  const startEditing = (transaction: Transaction) => {
    setEditingTransaction(transaction._id || '');
    setEditForm({
      amount: Math.abs(transaction.credit - transaction.debit).toString(),
      remarks: transaction.remarks
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingTransaction(null);
    setEditForm({ amount: '', remarks: '' });
  };

  // Generate remarks based on party name and remarks input
  const generateRemarks = () => {
    if (!newEntry.partyName) return newEntry.remarks;
    
    if (newEntry.remarks) {
      return `${newEntry.partyName} (${newEntry.remarks})`;
    }
    
    return newEntry.partyName;
  };

  const handleRefreshAll = () => {
    fetchTransactions();
    toast({
      title: "Refreshed",
      description: "Data refreshed successfully",
    });
  };

  const handleExit = () => {
    navigate('/party-ledger');
  };

  // Monday Final
  const handleMondayFinal = async () => {
    try {
      await apiClient.createMondayFinal({
        partyId: partyName || '',
        remarks: 'Monday Final'
      });
      
      toast({
        title: "Success",
        description: "Monday Final processed successfully",
      });
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process Monday Final",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <h2 className="text-xl font-semibold">Account Ledger</h2>
            <button
              onClick={handleRefreshAll}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
            >
              Refresh All
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
                    ₹{closingBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto mb-6">
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
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction._id} className={selectedTransactions.includes(transaction._id || '') ? 'bg-blue-100' : ''}>
                        <TableCell>{new Date(transaction.createdAt || '').toLocaleDateString('en-GB')}</TableCell>
                        <TableCell className={transaction.remarks === 'AQC' ? 'bg-blue-200 font-semibold' : ''}>
                          {editingTransaction === transaction._id ? (
                            <input
                              type="text"
                              value={editForm.remarks}
                              onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            transaction.remarks
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-sm ${
                            transaction.transactionType === 'CR' ? 'bg-green-100 text-green-800' : 
                            transaction.transactionType === 'DR' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.transactionType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingTransaction === transaction._id ? (
                            <input
                              type="number"
                              value={editForm.amount}
                              onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            />
                          ) : (
                            transaction.credit > 0 ? `₹${transaction.credit.toLocaleString()}` : ''
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.debit > 0 ? `₹${transaction.debit.toLocaleString()}` : ''}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${transaction.balance < 0 ? 'text-red-600' : ''}`}>
                          ₹{transaction.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedTransactions.includes(transaction._id || '')}
                            onCheckedChange={(checked) => handleCheckboxChange(transaction._id || '', checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          {editingTransaction === transaction._id ? (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEditTransaction(transaction._id || '')}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => startEditing(transaction)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction._id || '')}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              >
                                Del
                              </button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Entry Form */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                    <input
                      type="text"
                      value={newEntry.partyName}
                      onChange={(e) => setNewEntry({...newEntry, partyName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter party name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={newEntry.amount}
                      onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
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
                  <div>
                    <button
                      onClick={handleAddEntry}
                      className="w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Action Buttons */}
            <div className="w-48 bg-gray-50 border-l border-gray-200 p-4">
              <div className="flex flex-col space-y-2">
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm">
                  DC Report
                </button>
                <button 
                  onClick={handleMondayFinal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm"
                >
                  Monday Final
                </button>
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm">
                  Old Record
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm">
                  Modify
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={selectedTransactions.length === 0}
                  className={`px-4 py-2 rounded-md transition-colors font-medium text-sm ${
                    selectedTransactions.length === 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Delete ({selectedTransactions.length})
                </button>
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm">
                  Print
                </button>
                <button
                  onClick={handleCheckAll}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  {selectedTransactions.length === transactions.length ? 'Uncheck All' : 'Check All'}
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
    </div>
  );
};

export default AccountLedger;
