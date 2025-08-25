
/**
 * Final Trial Balance Page
 * 
 * Displays comprehensive trial balance reports in the Property Flow Design application.
 * Shows credit and debit entries with calculated balances in SHUBH LABH 1011 format.
 * 
 * Features:
 * - Complete trial balance display with 2 tables (Credit + Debit)
 * - Credit and debit categorization
 * - Balance calculations
 * - Searchable dropdown for party selection
 * - Export capabilities
 * - Responsive design
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TopNavigation from '../components/TopNavigation';
import { useNavigate } from 'react-router-dom';
import { finalTrialBalanceAPI } from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface TrialBalanceEntry {
  id: string;
  name: string;
  amount: number;
  type: 'credit' | 'debit';
  remarks?: string;
  date?: string;
}

interface TrialBalanceData {
  creditEntries: TrialBalanceEntry[];
  debitEntries: TrialBalanceEntry[];
  creditTotal: number;
  debitTotal: number;
  balanceDifference: number;
}

interface Party {
  _id: string;
  partyName: string;
  email?: string;
  phone?: string;
}

const FinalTrialBalance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceData | null>(null);
  const [partyName, setPartyName] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Extract parties from trial balance data
  const extractPartiesFromTrialBalance = useCallback(() => {
    if (!trialBalanceData) return;
    
    const partyNames = new Set<string>();
    
    // Extract party names from credit entries
    trialBalanceData.creditEntries.forEach(entry => {
      partyNames.add(entry.name);
    });
    
    // Extract party names from debit entries
    trialBalanceData.debitEntries.forEach(entry => {
      partyNames.add(entry.name);
    });
    
    // Convert to party objects
    const extractedParties = Array.from(partyNames).map(name => ({
      _id: name.toLowerCase().replace(/\s+/g, '-'),
      partyName: name,
      email: '',
      phone: ''
    }));
    
    setParties(extractedParties);
    setFilteredParties(extractedParties);
  }, [trialBalanceData]);



  // Filter parties based on search input
  useEffect(() => {
    if (partyName.trim() === '') {
      setFilteredParties(parties);
    } else {
      const filtered = parties.filter(party =>
        party.partyName.toLowerCase().includes(partyName.toLowerCase())
      );
      setFilteredParties(filtered);
    }
  }, [partyName, parties]);

  // Load trial balance data
  const loadTrialBalance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await finalTrialBalanceAPI.getAll();
      if (response.success) {
        console.log('📊 Trial balance data received:', response.data);
        
        // Transform backend data to frontend format
        const backendData = response.data;
        const parties = backendData.parties || [];
        
        // Separate credit and debit entries based on party balances
        const creditEntries: TrialBalanceEntry[] = [];
        const debitEntries: TrialBalanceEntry[] = [];
        
        parties.forEach((party) => {
          if (party.creditTotal > 0) {
            creditEntries.push({
              id: party.name,
              name: party.name,
              amount: party.creditTotal,
              type: 'credit'
            });
          }
          
          if (party.debitTotal > 0) {
            debitEntries.push({
              id: party.name,
              name: party.name,
              amount: party.debitTotal,
              type: 'debit'
            });
          }
        });
        
        const transformedData: TrialBalanceData = {
          creditEntries,
          debitEntries,
          creditTotal: backendData.totals?.totalCredit || 0,
          debitTotal: backendData.totals?.totalDebit || 0,
          balanceDifference: backendData.totals?.totalBalance || 0
        };
        
        setTrialBalanceData(transformedData);
      } else {
        console.error('❌ Failed to load trial balance:', response.message);
        toast({
          title: "Error",
          description: response.message || "Failed to load trial balance",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error loading trial balance:', error);
      toast({
        title: "Error",
        description: "Failed to load trial balance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load trial balance data on component mount
  useEffect(() => {
    loadTrialBalance();
  }, [loadTrialBalance]);

  // Extract parties from trial balance when data is loaded
  useEffect(() => {
    extractPartiesFromTrialBalance();
  }, [extractPartiesFromTrialBalance]);

  // Safely extract arrays from the data structure
  const allCreditEntries = trialBalanceData?.creditEntries || [];
  const allDebitEntries = trialBalanceData?.debitEntries || [];

  // Filter entries based on selected party
  const creditEntries = partyName.trim() 
    ? allCreditEntries.filter(entry => 
        entry.name.toLowerCase().includes(partyName.toLowerCase())
      )
    : allCreditEntries;

  const debitEntries = partyName.trim()
    ? allDebitEntries.filter(entry => 
        entry.name.toLowerCase().includes(partyName.toLowerCase())
      )
    : allDebitEntries;

  // Calculate totals based on filtered entries
  const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const debitTotal = debitEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const balanceDifference = creditTotal - debitTotal;

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
    
    if (selectedEntries.length === entryIds.length) {
      setSelectedEntries(prev => prev.filter(id => !entryIds.includes(id)));
    } else {
      setSelectedEntries(prev => [...new Set([...prev, ...entryIds])]);
    }
  };

  const handleShow = () => {
    if (!partyName.trim()) {
      toast({
        title: "Info",
        description: "Showing all parties. Enter a party name to filter.",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Filtered results for: ${partyName}`,
    });
  };

  const handlePartySelect = (selectedParty: string) => {
    setPartyName(selectedParty);
    setShowDropdown(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = async () => {
    setPartyName('');
    setSelectedEntries([]);
    await loadTrialBalance();
    toast({
      title: "Success",
      description: "Trial balance refreshed and showing all parties",
    });
  };

  const handleExit = () => {
    navigate('/');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Final Trial Balance</h1>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="partyName" className="text-sm font-medium text-gray-700">
                    Party Name:
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      id="partyName"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search party name..."
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                    />
                    
                    {/* Searchable Dropdown */}
                    {showDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredParties.length > 0 ? (
                          filteredParties.map((party) => (
                            <div
                              key={party._id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => handlePartySelect(party.partyName)}
                            >
                              {party.partyName}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No parties found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleShow}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Show
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={handleExit}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading trial balance...</span>
            </div>
          )}

          {/* Trial Balance Data - SHUBH LABH 1011 Format */}
          {!loading && trialBalanceData && (
            <div className="p-6">
              {/* Two Tables Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Credit Table - Left Side */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="bg-green-50 border-b border-green-200 px-4 py-2 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-green-800">Credit / Jama / Dena</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount (Cr)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {creditEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              <input
                                type="checkbox"
                                checked={selectedEntries.includes(entry.id)}
                                onChange={(e) => handleCheckboxChange(entry.id, e.target.checked)}
                                className="mr-2 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              {entry.name}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 font-semibold">
                              {entry.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Debit Table - Right Side */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="bg-red-50 border-b border-red-200 px-4 py-2 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-red-800">Debit / Name / Lena</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount (Dr)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {debitEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              <input
                                type="checkbox"
                                checked={selectedEntries.includes(entry.id)}
                                onChange={(e) => handleCheckboxChange(entry.id, e.target.checked)}
                                className="mr-2 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              {entry.name}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 font-semibold">
                              -{entry.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer with Totals */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-blue-800">
                    Credit / Jama / Dena Total: {creditTotal.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-blue-800">
                    Debit / Name / Lena Total: -{debitTotal.toLocaleString()}
                  </div>
                </div>
                {balanceDifference !== 0 && (
                  <div className="mt-2 text-sm font-medium text-red-600">
                    Balance Difference: ₹{balanceDifference.toLocaleString()}
                  </div>
                )}
              </div>

              {/* No Data Message */}
              {creditEntries.length === 0 && debitEntries.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No trial balance data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalTrialBalance;
