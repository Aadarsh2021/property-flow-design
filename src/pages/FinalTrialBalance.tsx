
import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { finalTrialBalanceAPI, mockData } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const FinalTrialBalance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [partyName, setPartyName] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [trialBalanceData, setTrialBalanceData] = useState<any[]>([]);

  // Load trial balance data on component mount
  useEffect(() => {
    loadTrialBalance();
  }, []);

  const loadTrialBalance = async () => {
    setLoading(true);
    try {
      const response = await finalTrialBalanceAPI.get();
      if (response.success) {
        const { creditEntries, debitEntries } = response.data;
        setTrialBalanceData([...creditEntries, ...debitEntries]);
      } else {
        // Fallback to mock data if API fails
        setTrialBalanceData(mockData.getMockTrialBalance());
        console.warn('Using mock data due to API failure');
      }
    } catch (error) {
      console.error('Error loading trial balance:', error);
      // Use mock data as fallback
      setTrialBalanceData(mockData.getMockTrialBalance());
      toast({
        title: "Warning",
        description: "Using offline data. Some features may be limited.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const creditEntries = trialBalanceData.filter(entry => entry.type === 'credit');
  const debitEntries = trialBalanceData.filter(entry => entry.type === 'debit');

  const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const debitTotal = debitEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const handleCheckboxChange = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  const handleSelectAll = (type: 'credit' | 'debit') => {
    const entries = type === 'credit' ? creditEntries : debitEntries;
    const entryIds = entries.map(entry => entry.id);
    const allSelected = entryIds.every(id => selectedEntries.includes(id));

    if (allSelected) {
      setSelectedEntries(prev => prev.filter(id => !entryIds.includes(id)));
    } else {
      setSelectedEntries(prev => [...new Set([...prev, ...entryIds])]);
    }
  };

  const handleShow = async () => {
    if (partyName.trim()) {
      try {
        const response = await finalTrialBalanceAPI.getPartyBalance(partyName);
        if (response.success) {
          const partyEntry = response.data;
          setTrialBalanceData([partyEntry]);
          toast({
            title: "Success",
            description: `Showing data for ${partyName}`,
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Party not found",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching party balance:', error);
        toast({
          title: "Error",
          description: "Failed to fetch party data",
          variant: "destructive"
        });
      }
    } else {
      // Show all data
      loadTrialBalance();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = async () => {
    setSelectedEntries([]);
    await loadTrialBalance();
    toast({
      title: "Success",
      description: "Data refreshed successfully",
    });
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">Final Trial Balance</h2>
          </div>
          
          <div className="p-6">
            {/* Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Party Name</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter party name"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleShow}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Show
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  Print
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleExit}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Trial Balance Table */}
            {loading ? (
              <div className="text-center py-8">Loading trial balance data...</div>
            ) : (
            <div className="grid grid-cols-4 gap-4">
              {/* Credit Column 1 */}
              <div>
                <div className="bg-blue-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <Checkbox
                      checked={creditEntries.slice(0, Math.ceil(creditEntries.length/2)).every(entry => selectedEntries.includes(entry.id))}
                      onCheckedChange={() => handleSelectAll('credit')}
                    />
                    <span>Name</span>
                    <span className="ml-auto">Amount (Cr)</span>
                  </div>
                </div>
                {creditEntries.slice(0, Math.ceil(creditEntries.length/2)).map((entry, index) => (
                  <div key={entry.id || `credit-${index}`} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{entry.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Credit Column 2 */}
              <div>
                <div className="bg-blue-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <span>Name</span>
                    <span className="ml-auto">Amount (Cr)</span>
                  </div>
                </div>
                {creditEntries.slice(Math.ceil(creditEntries.length/2)).map((entry, index) => (
                  <div key={entry.id || `credit-2-${index}`} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{entry.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Debit Column 1 */}
              <div>
                <div className="bg-red-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <Checkbox
                      checked={debitEntries.slice(0, Math.ceil(debitEntries.length/2)).every(entry => selectedEntries.includes(entry.id))}
                      onCheckedChange={() => handleSelectAll('debit')}
                    />
                    <span>Name</span>
                    <span className="ml-auto">Amount (Dr)</span>
                  </div>
                </div>
                {debitEntries.slice(0, Math.ceil(debitEntries.length/2)).map((entry, index) => (
                  <div key={entry.id || `debit-${index}`} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{Math.abs(entry.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Debit Column 2 */}
              <div>
                <div className="bg-red-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <span>Name</span>
                    <span className="ml-auto">Amount (Dr)</span>
                  </div>
                </div>
                {debitEntries.slice(Math.ceil(debitEntries.length/2)).map((entry, index) => (
                  <div key={entry.id || `debit-2-${index}`} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{Math.abs(entry.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-blue-200 p-4 rounded-lg">
                <div className="text-center font-bold text-lg">
                  Credit / Jama / Dena Total: {creditTotal.toLocaleString()}
                </div>
              </div>
              <div className="bg-red-200 p-4 rounded-lg">
                <div className="text-center font-bold text-lg">
                  Debit / Name / Lena Total: -{debitTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {selectedEntries.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <span className="text-sm font-medium text-yellow-800">
                  {selectedEntries.length} entries selected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalTrialBalance;
