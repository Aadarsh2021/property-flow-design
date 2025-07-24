
import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface TrialBalanceEntry {
  _id: string;
  partyName: string;
  partyId: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  date: string;
  commissionAmount: number;
  remarks: string;
}

const FinalTrialBalance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    totalEntries: 0,
    creditTotal: 0,
    debitTotal: 0,
    balance: 0,
    commissionTotal: 0,
    partyCount: 0
  });
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    type: '',
    partyId: ''
  });

  // Fetch trial balance entries
  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getFinalTrialBalances({
        startDate: filters.startDate,
        endDate: filters.endDate,
        type: filters.type || undefined,
        partyId: filters.partyId || undefined
      });

      setEntries(response.entries);
      
      // Calculate summary
      const creditTotal = response.entries
        .filter((entry: TrialBalanceEntry) => entry.type === 'credit')
        .reduce((sum: number, entry: TrialBalanceEntry) => sum + entry.amount, 0);

      const debitTotal = response.entries
        .filter((entry: TrialBalanceEntry) => entry.type === 'debit')
        .reduce((sum: number, entry: TrialBalanceEntry) => sum + entry.amount, 0);

      const commissionTotal = response.entries
        .reduce((sum: number, entry: TrialBalanceEntry) => sum + (entry.commissionAmount || 0), 0);

      setSummary({
        totalEntries: response.entries.length,
        creditTotal,
        debitTotal,
        balance: creditTotal - debitTotal,
        commissionTotal,
        partyCount: new Set(response.entries.map((entry: TrialBalanceEntry) => entry.partyId)).size
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch trial balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchTrialBalance();
    const interval = setInterval(fetchTrialBalance, 10000);
    return () => clearInterval(interval);
  }, [filters]);

  // Handle checkbox selection
  const handleCheckboxChange = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedEntries.length === entries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(entries.map(entry => entry._id));
    }
  };

  // Generate trial balance from current transactions
  const handleGenerateTrialBalance = async () => {
    try {
      const response = await apiClient.generateTrialBalance({
        date: new Date().toISOString(),
        includeCommission: true
      });

      toast({
        title: "Success",
        description: `Generated ${response.totalEntries} trial balance entries`,
      });
      fetchTrialBalance();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate trial balance",
        variant: "destructive",
      });
    }
  };

  // Calculate trial balance for current date
  const handleCalculateTrialBalance = async () => {
    try {
      const response = await apiClient.calculateTrialBalance();
      
      toast({
        title: "Success",
        description: `Calculated trial balance: Credit ₹${response.creditTotal.toLocaleString()}, Debit ₹${response.debitTotal.toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate trial balance",
        variant: "destructive",
      });
    }
  };

  // Bulk delete selected entries
  const handleBulkDelete = async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to delete",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedEntries.length} entries?`)) return;

    try {
      const response = await apiClient.bulkDeleteTrialBalance(selectedEntries);
      
      toast({
        title: "Success",
        description: response.message,
      });
      setSelectedEntries([]);
      fetchTrialBalance();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entries",
        variant: "destructive",
      });
    }
  };

  // Export to Excel (placeholder)
  const handleExportExcel = () => {
    toast({
      title: "Export",
      description: "Excel export functionality coming soon!",
    });
  };

  // Print trial balance
  const handlePrint = () => {
    window.print();
  };

  const handleExit = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trial balance...</p>
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
            <h2 className="text-xl font-semibold">Final Trial Balance</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleCalculateTrialBalance}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
              >
                Calculate
              </button>
              <button
                onClick={handleGenerateTrialBalance}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm"
              >
                Generate
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchTrialBalance}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600">Total Entries</h3>
                <p className="text-2xl font-bold text-blue-900">{summary.totalEntries}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600">Credit Total</h3>
                <p className="text-2xl font-bold text-green-900">₹{summary.creditTotal.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-600">Debit Total</h3>
                <p className="text-2xl font-bold text-red-900">₹{summary.debitTotal.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600">Balance</h3>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-purple-900' : 'text-red-600'}`}>
                  ₹{summary.balance.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-orange-600">Commission</h3>
                <p className="text-2xl font-bold text-orange-900">₹{summary.commissionTotal.toLocaleString()}</p>
              </div>
            </div>

            {/* Trial Balance Table */}
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <Checkbox
                        checked={selectedEntries.length === entries.length && entries.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry._id} className={selectedEntries.includes(entry._id) ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedEntries.includes(entry._id)}
                          onCheckedChange={(checked) => handleCheckboxChange(entry._id, checked as boolean)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.partyName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        ₹{entry.amount.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{entry.balance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        ₹{(entry.commissionAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(entry.date).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedEntries.length === 0}
                  className={`px-4 py-2 rounded-md transition-colors font-medium text-sm ${
                    selectedEntries.length === 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Delete ({selectedEntries.length})
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Export Excel
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Print
                </button>
              </div>
              <button
                onClick={handleExit}
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalTrialBalance;
