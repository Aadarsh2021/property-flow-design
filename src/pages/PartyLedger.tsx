
import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Dialog as UIDialog, DialogContent as UIDialogContent, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle, DialogTrigger as UIDialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { apiClient, Party, Transaction } from '../lib/api';
import { useToast } from '@/hooks/use-toast';

const PartyLedger = () => {
  const navigate = useNavigate();
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Transaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [txnForm, setTxnForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    transactionType: 'CR',
    credit: '',
    debit: '',
    remarks: '',
  });
  const [txnLoading, setTxnLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    remarks: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    const fetchParties = async () => {
      try {
        setLoading(true);
        const fetchedParties = await apiClient.getAllParties();
        setParties(fetchedParties);
      } catch (err) {
        setError('Failed to fetch parties.');
        toast({
          title: 'Error fetching parties',
          description: 'Failed to fetch parties. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
    const interval = setInterval(fetchParties, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [toast]);

  // Fetch ledger when party selected
  useEffect(() => {
    const fetchLedger = async () => {
      if (!selectedPartyId) return;
      setLedgerLoading(true);
      setLedgerError(null);
      try {
        const { transactions, currentBalance } = await apiClient.getPartyLedger(selectedPartyId);
        setLedger(transactions);
        setCurrentBalance(currentBalance);
      } catch (err) {
        setLedgerError('Failed to fetch ledger.');
        toast({
          title: 'Error fetching ledger',
          description: 'Failed to fetch party ledger. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLedgerLoading(false);
      }
    };
    fetchLedger();
  }, [selectedPartyId, toast]);

  const filteredParties = parties.filter(party =>
    party.partyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePartySelect = (partyName: string) => {
    setSelectedParty(partyName);
    setIsDialogOpen(false);
    const party = parties.find(p => p.partyName === partyName);
    if (party && party._id) {
      setSelectedPartyId(party._id);
    }
    // navigate(`/account-ledger/${encodeURIComponent(partyName)}`); // Optional: keep navigation if needed
  };

  const handleCheckboxChange = (partyName: string, checked: boolean) => {
    if (checked) {
      setSelectedParties(prev => [...prev, partyName]);
    } else {
      setSelectedParties(prev => prev.filter(name => name !== partyName));
    }
  };

  const handleSelectAll = () => {
    if (selectedParties.length === filteredParties.length) {
      setSelectedParties([]);
    } else {
      setSelectedParties(filteredParties.map(party => party.partyName));
    }
  };

  // Monday Final via Transaction API
  const handleMondayFinal = async () => {
    if (selectedParties.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select parties to do Monday Final.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get party IDs for selected parties
      const partyIds = selectedParties
        .map(partyName => {
          const party = parties.find(p => p.partyName === partyName);
          return party?._id;
        })
        .filter(id => id); // Remove undefined values

      if (partyIds.length === 0) {
        toast({
          title: 'Error',
          description: 'No valid parties found for Monday Final.',
          variant: 'destructive',
        });
        return;
      }

      // Bulk Monday Final
      const response = await apiClient.bulkMondayFinal({
        partyIds,
        remarks: `Bulk Monday Final - ${selectedParties.length} parties`
      });

      toast({
        title: 'Monday Final completed',
        description: `Settled ${response.summary.successful} parties successfully. ${response.summary.failed} failed.`,
      });

      // Show detailed results if there are errors
      if (response.errors && response.errors.length > 0) {
        console.log('Monday Final errors:', response.errors);
      }

      setSelectedParties([]);
      
      // Refresh parties and ledger
      const fetchedParties = await apiClient.getAllParties();
      setParties(fetchedParties);
      if (selectedPartyId) {
        const { transactions, currentBalance } = await apiClient.getPartyLedger(selectedPartyId);
        setLedger(transactions);
        setCurrentBalance(currentBalance);
      }
    } catch (err: any) {
      setError('Failed to do Monday Final.');
      toast({
        title: 'Error doing Monday Final',
        description: err.message || 'Failed to do Monday Final. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedParties.length > 0) {
      const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedParties.length} selected parties?`);
      if (confirmDelete) {
        try {
          // Delete selected parties
          for (const partyName of selectedParties) {
            const party = parties.find(p => p.partyName === partyName);
            if (party && party._id) {
              await apiClient.deleteParty(party._id);
            }
          }
          toast({
            title: 'Success',
            description: `Deleted ${selectedParties.length} parties.`,
          });
        setSelectedParties([]);
          // Refresh parties after deletion
          const fetchedParties = await apiClient.getAllParties();
          setParties(fetchedParties);
        } catch (err) {
          setError('Failed to delete parties.');
          toast({
            title: 'Error deleting parties',
            description: 'Failed to delete parties. Please try again later.',
            variant: 'destructive',
          });
        }
      }
    } else {
      alert('Please select parties to delete.');
    }
  };

  const handleExit = () => {
    navigate('/');
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
      
      // Refresh ledger
      const { transactions, currentBalance } = await apiClient.getPartyLedger(selectedPartyId);
      setLedger(transactions);
      setCurrentBalance(currentBalance);
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
      
      // Refresh ledger
      const { transactions, currentBalance } = await apiClient.getPartyLedger(selectedPartyId);
      setLedger(transactions);
      setCurrentBalance(currentBalance);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
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

  const handleAddTxnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTxnForm({ ...txnForm, [e.target.name]: e.target.value });
  };

  const handleAddTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) return;
    setTxnLoading(true);
    try {
      const data = {
        partyId: selectedPartyId,
        date: txnForm.date,
        transactionType: txnForm.transactionType as 'CR' | 'DR',
        credit: txnForm.transactionType === 'CR' ? parseFloat(txnForm.credit) || 0 : 0,
        debit: txnForm.transactionType === 'DR' ? parseFloat(txnForm.debit) || 0 : 0,
        remarks: txnForm.remarks,
      };
      await apiClient.createTransaction(data);
      toast({ title: 'Transaction added', description: 'Transaction successfully added.' });
      setIsAddTxnOpen(false);
      setTxnForm({ date: new Date().toISOString().slice(0, 10), transactionType: 'CR', credit: '', debit: '', remarks: '' });
      // Refresh ledger
      const { transactions, currentBalance } = await apiClient.getPartyLedger(selectedPartyId);
      setLedger(transactions);
      setCurrentBalance(currentBalance);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add transaction.', variant: 'destructive' });
    } finally {
      setTxnLoading(false);
    }
  };

  if (loading && parties.length === 0) {
    return <div className="text-center py-8">Loading parties...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (parties.length === 0) {
    return <div className="text-center py-8">No parties found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
            <h2 className="text-xl font-semibold">Party A/C. Ledger</h2>
            {selectedPartyId && (
              <UIDialog open={isAddTxnOpen} onOpenChange={setIsAddTxnOpen}>
                <UIDialogTrigger asChild>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">Add Transaction</button>
                </UIDialogTrigger>
                <UIDialogContent>
                  <UIDialogHeader>
                    <UIDialogTitle>Add Transaction for {selectedParty}</UIDialogTitle>
                  </UIDialogHeader>
                  <form onSubmit={handleAddTxnSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input type="date" name="date" value={txnForm.date} onChange={handleAddTxnChange} className="w-full px-3 py-2 border rounded" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select name="transactionType" value={txnForm.transactionType} onChange={handleAddTxnChange} className="w-full px-3 py-2 border rounded">
                        <option value="CR">Credit</option>
                        <option value="DR">Debit</option>
                      </select>
                    </div>
                    {txnForm.transactionType === 'CR' ? (
                      <div>
                        <label className="block text-sm font-medium mb-1">Credit Amount</label>
                        <input type="number" name="credit" value={txnForm.credit} onChange={handleAddTxnChange} className="w-full px-3 py-2 border rounded" min="0" required />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-1">Debit Amount</label>
                        <input type="number" name="debit" value={txnForm.debit} onChange={handleAddTxnChange} className="w-full px-3 py-2 border rounded" min="0" required />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Remarks</label>
                      <input type="text" name="remarks" value={txnForm.remarks} onChange={handleAddTxnChange} className="w-full px-3 py-2 border rounded" required />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={txnLoading}>{txnLoading ? 'Saving...' : 'Add Transaction'}</button>
                    </div>
                  </form>
                </UIDialogContent>
              </UIDialog>
            )}
          </div>
          
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <label className="text-sm font-medium text-gray-700">Party Name</label>
              <UIDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <UIDialogTrigger asChild>
                  <input
                    type="text"
                    value={selectedParty}
                    placeholder="001-AR RTGS"
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    onClick={() => setIsDialogOpen(true)}
                  />
                </UIDialogTrigger>
                <UIDialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <UIDialogHeader>
                    <UIDialogTitle>Select Party</UIDialogTitle>
                  </UIDialogHeader>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Search parties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="overflow-y-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Checkbox
                                checked={selectedParties.length === filteredParties.length && filteredParties.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Party Name</TableHead>
                            <TableHead>Monday Final</TableHead>
                            <TableHead>Select</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParties.map((party, index) => (
                            <TableRow 
                              key={index} 
                              className={party.status === 'active' ? 'bg-green-50' : 'bg-red-50'}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedParties.includes(party.partyName)}
                                  onCheckedChange={(checked) => handleCheckboxChange(party.partyName, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{party.partyName}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-sm ${
                                  party.status === 'active' 
                                    ? 'bg-green-200 text-green-800' 
                                    : 'bg-red-200 text-red-800'
                                }`}>
                                  {party.status}
                                </span>
                              </TableCell>
                              <TableCell>
                                <input
                                  type="radio"
                                  name="selectedParty"
                                  onChange={() => handlePartySelect(party.partyName)}
                                  className="cursor-pointer"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {selectedParties.length > 0 && (
                      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md">
                        <span className="text-sm font-medium text-blue-700">
                          {selectedParties.length} parties selected
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleMondayFinal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            Monday Final
                          </button>
                          <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            Delete Selected
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </UIDialogContent>
              </UIDialog>
              
              <button
                onClick={handleExit}
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
              >
                Exit
              </button>
            </div>
            {selectedPartyId && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Ledger for: <span className="text-blue-700">{selectedParty}</span></h3>
                <div className="mb-2 text-sm text-gray-600">Current Balance: <span className="font-bold text-green-700">₹{currentBalance.toLocaleString()}</span></div>
                {ledgerLoading ? (
                  <div>Loading ledger...</div>
                ) : ledgerError ? (
                  <div className="text-red-500">{ledgerError}</div>
                ) : ledger.length === 0 ? (
                  <div>No transactions found for this party.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Remarks</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.map((txn, idx) => (
                          <TableRow key={txn._id || idx}>
                            <TableCell>{new Date(txn.date).toLocaleDateString('en-GB')}</TableCell>
                            <TableCell>{txn.transactionType}</TableCell>
                            <TableCell>
                              {editingTransaction === txn._id ? (
                                <input
                                  type="text"
                                  value={editForm.remarks}
                                  onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              ) : (
                                txn.remarks
                              )}
                            </TableCell>
                            <TableCell className="text-green-700">
                              {editingTransaction === txn._id ? (
                                <input
                                  type="number"
                                  value={editForm.amount}
                                  onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                />
                              ) : (
                                txn.credit > 0 ? `₹${txn.credit}` : '-'
                              )}
                            </TableCell>
                            <TableCell className="text-red-700">{txn.debit > 0 ? `₹${txn.debit}` : '-'}</TableCell>
                            <TableCell className="font-bold">₹{txn.balance}</TableCell>
                            <TableCell>
                              {editingTransaction === txn._id ? (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleEditTransaction(txn._id || '')}
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
                                    onClick={() => startEditing(txn)}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(txn._id || '')}
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyLedger;
