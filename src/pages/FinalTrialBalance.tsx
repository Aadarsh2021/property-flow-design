
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
import { useToast } from '../hooks/use-toast';
import { finalTrialBalanceAPI } from '@/lib/api';

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
  party_name: string;
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [autoCompleteText, setAutoCompleteText] = useState('');
  const [showInlineSuggestion, setShowInlineSuggestion] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const [textWidth, setTextWidth] = useState(0);

  // Use API calls instead of direct Supabase hooks
  const [parties, setParties] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);

  // Load parties via API
  const loadParties = useCallback(async () => {
    if (!user?.id) return;
    
    setPartiesLoading(true);
    try {
      const response = await finalTrialBalanceAPI.getAll();
      if (response.success && response.data) {
        // Extract parties from trial balance data
        const partiesFromData = response.data.map((entry: any) => ({
          id: entry.id,
          party_name: entry.party_name,
          sr_no: entry.sr_no || 0,
          address: entry.address || '',
          phone: entry.phone || '',
          email: entry.email || ''
        }));
        setParties(partiesFromData);
      }
    } catch (error) {
      console.error('Error loading parties:', error);
      toast({
        title: "Error",
        description: "Failed to load parties data",
        variant: "destructive"
      });
    } finally {
      setPartiesLoading(false);
    }
  }, [user?.id, toast]);

  // Additional API functions for compatibility with old system
  const loadTrialBalanceAPI = async () => {
    try {
      const response = await finalTrialBalanceAPI.getAll();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to load trial balance');
    } catch (error) {
      console.error('Error loading trial balance via API:', error);
      throw error;
    }
  };

  const forceRefreshTrialBalanceAPI = async () => {
    try {
      const response = await finalTrialBalanceAPI.forceRefresh();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to force refresh trial balance');
    } catch (error) {
      console.error('Error force refreshing trial balance via API:', error);
      throw error;
    }
  };

  const getBatchBalancesAPI = async (partyNames: string[]) => {
    try {
      const response = await finalTrialBalanceAPI.getBatchBalances(partyNames);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to get batch balances');
    } catch (error) {
      console.error('Error getting batch balances via API:', error);
      throw error;
    }
  };

  const generateReportAPI = async (reportData: { startDate: string; endDate: string; partyName?: string }) => {
    try {
      const response = await finalTrialBalanceAPI.generateReport(reportData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to generate report');
    } catch (error) {
      console.error('Error generating report via API:', error);
      throw error;
    }
  };

  // Load parties when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadParties();
    }
  }, [user?.id, loadParties]);

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
      party_name: name,
      email: '',
      phone: ''
    }));
    
    setParties(extractedParties);
    setFilteredParties(extractedParties);
  }, [trialBalanceData]);



  // Filter parties based on search input with auto-suggestion
  useEffect(() => {
    if (partyName.trim() === '') {
      setFilteredParties(parties);
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
    } else {
      const searchLower = partyName.toLowerCase();
      const filtered = parties.filter(party => {
        const partyLower = party.party_name.toLowerCase();
        return partyLower.startsWith(searchLower) || partyLower.includes(searchLower);
      }).sort((a, b) => {
        const aName = a.party_name.toLowerCase();
        const bName = b.party_name.toLowerCase();
        
        // Sort by: starts with first, then alphabetically
        const aStartsWith = aName.startsWith(searchLower);
        const bStartsWith = bName.startsWith(searchLower);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return aName.localeCompare(bName);
      });
      
      setFilteredParties(filtered);
      
      // VS Code style auto-complete: Find best match for inline suggestion (case insensitive)
      if (filtered.length > 0) {
        const bestMatch = filtered[0];
        const partyNameLower = bestMatch.party_name.toLowerCase();
        
        if (partyNameLower.startsWith(searchLower) && partyNameLower !== searchLower) {
          // Find the actual position where the match starts (case insensitive)
          const matchIndex = bestMatch.party_name.toLowerCase().indexOf(searchLower);
          if (matchIndex === 0) {
            setAutoCompleteText(bestMatch.party_name.substring(partyName.length));
            setShowInlineSuggestion(true);
          } else {
            setAutoCompleteText('');
            setShowInlineSuggestion(false);
          }
        } else {
          setAutoCompleteText('');
          setShowInlineSuggestion(false);
        }
      } else {
        setAutoCompleteText('');
        setShowInlineSuggestion(false);
      }
    }
  }, [partyName, parties]);

  // Load trial balance data using direct Supabase
  const loadTrialBalance = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    // Loading trial balance
    const startTime = performance.now();
    try {
      // Get all parties from Supabase
      const allParties = supabaseParties || [];
      console.log(`📊 Loaded ${allParties.length} parties for trial balance`);
      
      // Limit to first 50 parties for better performance
      const limitedParties = allParties.slice(0, 50);
      
      // Get balances for all parties using direct Supabase
      const partyBalances = await Promise.all(
        limitedParties.map(async (party) => {
          try {
            // Use API call instead of direct Supabase
            const balanceResponse = await finalTrialBalanceAPI.getPartyBalance(party.party_name);
            const balance = balanceResponse.success ? balanceResponse.data : 0;
            return {
              name: party.party_name,
              closingBalance: balance
            };
          } catch (error) {
            console.error(`Error getting balance for ${party.party_name}:`, error);
            return null;
          }
        })
      );

      // Commission party is now automatically created for all users
      // It will be included in allParties and processed normally
      
      // Filter out null results and parties with zero balance
      const validBalances = partyBalances.filter(balance => 
        balance && balance.closingBalance !== 0
      );
      
      // Valid party balances processed
      
      // Separate credit and debit entries
      const creditEntries: TrialBalanceEntry[] = [];
      const debitEntries: TrialBalanceEntry[] = [];
      
      validBalances.forEach((balance, index) => {
        if (balance.closingBalance > 0) {
          creditEntries.push({
            id: `credit-${balance.name}-${index}`,
            name: balance.name,
            amount: balance.closingBalance,
            type: 'credit',
            remarks: `Closing Balance for ${balance.name}`,
            date: new Date().toISOString()
          });
        } else if (balance.closingBalance < 0) {
          debitEntries.push({
            id: `debit-${balance.name}-${index}`,
            name: balance.name,
            amount: Math.abs(balance.closingBalance),
            type: 'debit',
            remarks: `Closing Balance for ${balance.name}`,
            date: new Date().toISOString()
          });
        }
      });
      
      // Sort by amount (largest first)
      creditEntries.sort((a, b) => b.amount - a.amount);
      debitEntries.sort((a, b) => b.amount - a.amount);
      
      // Calculate totals
      const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const debitTotal = debitEntries.reduce((sum, entry) => sum + entry.amount, 0);
      const balanceDifference = creditTotal - debitTotal;
      
      const transformedData: TrialBalanceData = {
        creditEntries,
        debitEntries,
        creditTotal,
        debitTotal,
        balanceDifference
      };
      
      setTrialBalanceData(transformedData);
      const endTime = performance.now();
      // Trial balance loaded successfully
      
    } catch (error) {
      // Error loading trial balance
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

  // Auto-refresh trial balance every 30 seconds for real-time updates (only in development)
  useEffect(() => {
    if (import.meta.env.DEV) {
      const autoRefreshInterval = setInterval(() => {
        // Auto-refreshing trial balance
        loadTrialBalance(true); // Force refresh
      }, 30000); // 30 seconds

      return () => clearInterval(autoRefreshInterval);
    }
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
    const startTime = performance.now();
    // Starting trial balance refresh
    
    setPartyName('');
    setSelectedEntries([]);
    await loadTrialBalance(true); // Force refresh for real-time updates
    toast({
      title: "Success",
      description: "Trial balance force refreshed with latest data",
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    // Trial balance refresh completed
  };

  const handleForceRefresh = async () => {
    setPartyName('');
    setSelectedEntries([]);
    await loadTrialBalance(true); // Force refresh bypassing cache
    toast({
      title: "Real-time Update",
      description: "Trial balance updated with latest ledger changes",
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
                    <div className="relative">
                      <input
                        ref={setInputRef}
                        type="text"
                        id="partyName"
                        value={partyName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPartyName(value);
                          
                          // Calculate text width for proper positioning
                          if (inputRef) {
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            if (context) {
                              context.font = window.getComputedStyle(inputRef).font;
                              const width = context.measureText(value).width;
                              setTextWidth(width);
                            }
                          }
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            // Enter key: Accept suggestion first, then select party
                            if (showInlineSuggestion && autoCompleteText) {
                              const completedValue = partyName + autoCompleteText;
                              handlePartySelect(completedValue);
                            } else if (filteredParties.length > 0) {
                              handlePartySelect(filteredParties[0].party_name);
                            } else {
                              setShowDropdown(false);
                            }
                          } else if (e.key === 'Tab') {
                            e.preventDefault();
                            // Tab key: Accept suggestion
                            if (showInlineSuggestion && autoCompleteText) {
                              const completedValue = partyName + autoCompleteText;
                              setPartyName(completedValue);
                              setAutoCompleteText('');
                              setShowInlineSuggestion(false);
                            }
                          } else if (e.key === 'Escape') {
                            setShowDropdown(false);
                            setAutoCompleteText('');
                            setShowInlineSuggestion(false);
                          } else if (e.key === 'ArrowRight' && showInlineSuggestion) {
                            e.preventDefault();
                            // Arrow Right: Accept suggestion
                            const completedValue = partyName + autoCompleteText;
                            setPartyName(completedValue);
                            setAutoCompleteText('');
                            setShowInlineSuggestion(false);
                          }
                        }}
                        placeholder="Search party name..."
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 bg-transparent relative z-10"
                      />
                      {/* VS Code style inline suggestion */}
                      {showInlineSuggestion && autoCompleteText && (
                        <div 
                          className="absolute top-0 left-0 text-gray-400 pointer-events-none z-0"
                          style={{ 
                            left: `${textWidth + 12}px`, // 12px for padding
                            top: '8px',
                            fontSize: '14px',
                            lineHeight: '20px',
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                            color: '#9CA3AF'
                          }}
                        >
                          {autoCompleteText}
                        </div>
                      )}
                    </div>
                    
                    {/* Searchable Dropdown */}
                    {showDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredParties.length > 0 ? (
                          filteredParties.map((party) => (
                            <div
                              key={party._id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => handlePartySelect(party.party_name)}
                            >
                              {party.party_name}
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
                  onClick={handleForceRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Force Refresh
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

          {/* Table Section */}
          <div className="p-4">
            {/* Party Closing Balance Info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Party Closing Balance Trial Balance:</strong> Shows each party's closing balance (Credit - Debit).
                <br />
                <span className="font-semibold text-green-700">Credit Side:</span> Parties with positive closing balance (Jama/Dena)
                <br />
                <span className="font-semibold text-red-700">Debit Side:</span> Parties with negative closing balance (Name/Lena)
                <br />
                <span className="text-xs text-gray-600 mt-1 block">
                  Only parties with non-zero closing balance are shown. Data updates automatically when transactions are added/deleted.
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Credit Entries Table */}
              <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                <div className="bg-green-600 text-white px-4 py-3">
                  <h3 className="text-lg font-semibold">Credit Side - Positive Closing Balances</h3>
                </div>
                <div className="overflow-auto" style={{ maxHeight: 500 }}>
                  <table className="w-full text-sm">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Party Name</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Closing Balance</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8">Loading credit entries...</td>
                        </tr>
                      ) : trialBalanceData?.creditEntries.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-gray-500">No parties with positive closing balance</td>
                        </tr>
                      ) : (
                        trialBalanceData?.creditEntries.map((entry, index) => (
                          <tr key={`credit-${entry.id}-${index}`} className="hover:bg-green-50 transition-colors">
                            <td className="border border-gray-300 px-3 py-2 font-medium text-gray-800">
                              {entry.name}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-green-600">
                              ₹{entry.amount.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                Credit
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-green-100">
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-bold text-gray-800">Total Credit</td>
                        <td className="border border-gray-300 px-3 py-2 text-center font-bold text-green-600">
                          ₹{trialBalanceData?.creditTotal.toLocaleString() || '0'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Debit Entries Table */}
              <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                <div className="bg-red-600 text-white px-4 py-3">
                  <h3 className="text-lg font-semibold">Debit Side - Negative Closing Balances</h3>
                </div>
                <div className="overflow-auto" style={{ maxHeight: 500 }}>
                  <table className="w-full text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Party Name</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Closing Balance</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8">Loading debit entries...</td>
                        </tr>
                      ) : trialBalanceData?.debitEntries.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-gray-500">No parties with negative closing balance</td>
                        </tr>
                      ) : (
                        trialBalanceData?.debitEntries.map((entry, index) => (
                          <tr key={`debit-${entry.id}-${index}`} className="hover:bg-red-50 transition-colors">
                            <td className="border border-gray-300 px-3 py-2 font-medium text-gray-800">
                              {entry.name}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-red-600">
                              ₹{entry.amount.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                Debit
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-red-100">
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-bold text-gray-800">Total Debit</td>
                        <td className="border border-gray-300 px-3 py-2 text-center font-bold text-red-600">
                          ₹{trialBalanceData?.debitTotal.toLocaleString() || '0'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Balance Summary */}
            {trialBalanceData && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Total Credit</div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{trialBalanceData.creditTotal.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">All positive closing balances</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Total Debit</div>
                    <div className="text-2xl font-bold text-red-600">
                      ₹{trialBalanceData.debitTotal.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">All negative closing balances</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Balance Difference</div>
                    <div className={`text-2xl font-bold ${
                      trialBalanceData.balanceDifference === 0 ? 'text-green-600' : 
                      trialBalanceData.balanceDifference > 0 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      ₹{trialBalanceData.balanceDifference.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {trialBalanceData.balanceDifference === 0 ? 'Perfect Balance ✓' : 
                       trialBalanceData.balanceDifference > 0 ? 'Credit Higher' : 'Debit Higher'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalTrialBalance;
