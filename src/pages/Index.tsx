
/**
 * Index/Dashboard Page
 * 
 * Main dashboard page for the Property Flow Design application.
 * Provides overview of system status, quick actions, and navigation.
 * 
 * Features:
 * - System overview and statistics
 * - Quick action buttons
 * - Recent activity display
 * - Navigation to main features
 * - User welcome and status
 * - Real-time data from database
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Link } from 'react-router-dom';
import { Settings, FileText, BarChart3, Users, TrendingUp, DollarSign, LogIn, UserPlus, ArrowRight, Plus, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyName } from '@/hooks/useCompanyName';
import { startPerfLog, logPageLoad } from '@/lib/performanceLogger';
import { partyLedgerAPI, finalTrialBalanceAPI } from '@/lib/api';

interface DashboardStats {
  overview: {
    totalParties: number;
    totalTransactions: number;
    totalCredit: number;
    totalDebit: number;
    totalBalance: number;
  };
  companyBalance?: {
    netBalance?: number;
    commissionCollected?: number;
    commissionPaid?: number;
    netCommissionProfit?: number;
    totalCredits?: number;
    totalDebits?: number;
    commissionTransactionCount?: number;
    businessActivity?: number;
    autoCalculated?: boolean;
  };
  // Recent activity feature removed - cleaned up
  parties: Array<{
    id: string;
    name: string;
    srNo: string;
    address: string;
    phone: string;
    email: string;
  }>;
}

// RecentActivity interface removed - recent activity feature removed

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  // Recent activity state removed - cleaned up
  const [loading, setLoading] = useState(false);
  
  // Use API calls instead of direct Supabase hooks
  const [parties, setParties] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Additional API functions for compatibility with old system
  const loadDashboardStatsAPI = async () => {
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to load dashboard stats');
    } catch (error) {
      console.error('Error loading dashboard stats via API:', error);
      throw error;
    }
  };

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

  const forceRefreshStatsAPI = async () => {
    try {
      const response = await finalTrialBalanceAPI.forceRefresh();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to force refresh stats');
    } catch (error) {
      console.error('Error force refreshing stats via API:', error);
      throw error;
    }
  };

  // Performance monitoring
  useEffect(() => {
    // Index page loaded
    const endPerfLog = startPerfLog('Index Page', 'page');
    
    return () => {
      // Index component unmounted
      endPerfLog();
    };
  }, []);

  // Load data when component mounts or user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadPartiesData();
    }
  }, [isAuthenticated, user?.id]); // Remove loadPartiesData from dependencies

  // Load entries when parties are loaded
  useEffect(() => {
    if (parties.length > 0) {
      loadEntriesData();
    }
  }, [parties]); // Remove loadEntriesData from dependencies to prevent circular dependency

  // Calculate stats when data changes
  useEffect(() => {
    if (parties.length > 0) {
      calculateDashboardStats();
    }
  }, [parties, allEntries]); // Remove calculateDashboardStats from dependencies
  // Pagination removed - recent activity feature removed - cleaned up
  const { companyName } = useCompanyName(user?.id);

  // Load parties and entries via API
  const loadPartiesData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    
    setPartiesLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        setParties(response.data || []);
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
  }, [isAuthenticated, user?.id, toast]);

  const loadEntriesData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    
    setEntriesLoading(true);
    try {
      // Load entries for all parties (filter out parties with undefined names)
      const validParties = parties.filter(party => party.party_name && party.party_name.trim() !== '');
      const entriesPromises = validParties.map(async (party) => {
        try {
          const response = await partyLedgerAPI.getPartyLedger(party.party_name);
          return response.success ? response.data || [] : [];
        } catch (error) {
          console.error(`Error loading entries for party ${party.party_name}:`, error);
          return [];
        }
      });
      
      const allEntriesArrays = await Promise.all(entriesPromises);
      const flatEntries = allEntriesArrays.flat();
      setAllEntries(flatEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: "Error",
        description: "Failed to load entries data",
        variant: "destructive"
      });
    } finally {
      setEntriesLoading(false);
    }
  }, [isAuthenticated, user?.id, parties, toast]);

  // Calculate dashboard statistics from API data
  const calculateDashboardStats = useCallback(() => {
    if (!isAuthenticated || !user?.id) {
      setStats(null);
      return;
    }
    
    setLoading(true);
    try {
      // Calculate statistics from parties and entries
      const totalParties = parties.length;
      const totalTransactions = allEntries.length;
      
      // Calculate totals
      const totalCredit = allEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
      const totalDebit = allEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
      const totalBalance = totalCredit - totalDebit;
      
      // Calculate commission data
      const commissionEntries = allEntries.filter(entry => 
        entry.remarks?.toLowerCase().includes('commission') || 
        entry.party_name?.toLowerCase().includes('commission')
      );
      
      const commissionCollected = commissionEntries
        .filter(entry => entry.credit > 0)
        .reduce((sum, entry) => sum + entry.credit, 0);
      
      const commissionPaid = commissionEntries
        .filter(entry => entry.debit > 0)
        .reduce((sum, entry) => sum + entry.debit, 0);
      
      const netCommissionProfit = commissionCollected - commissionPaid;
      
      const statsData: DashboardStats = {
        overview: {
          totalParties,
          totalTransactions,
          totalCredit,
          totalDebit,
          totalBalance
        },
        companyBalance: {
          netBalance: totalBalance,
          commissionCollected,
          commissionPaid,
          netCommissionProfit,
          totalCredits: totalCredit,
          totalDebits: totalDebit,
          commissionTransactionCount: commissionEntries.length,
          businessActivity: totalCredit + totalDebit,
          autoCalculated: true
        },
        parties: parties.map(party => ({
          id: party.id,
          name: party.name || party.party_name || party.partyName, // Use API name field first, fallback to party_name
          srNo: party.sr_no,
          address: party.address || '',
          phone: party.phone || '',
          email: party.email || ''
        }))
      };
      
      setStats(statsData);
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to calculate dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, parties, allEntries, toast]);

  // Calculate stats when data changes
  useEffect(() => {
    if (parties.length > 0) {
      calculateDashboardStats();
    }
  }, [parties, allEntries]); // Use direct dependencies instead of function reference

  // Format currency - simplified to prevent initialization issues
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0';
    }
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      // Fallback to simple formatting if Intl.NumberFormat fails
      return `₹${Math.round(amount).toLocaleString()}`;
    }
  };



  // Recent activity helper functions removed

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Account Ledger Software</h1>
          <p className="text-xl text-gray-600">Professional Financial Management System</p>
        </div>

        {!isAuthenticated ? (
          // Public Home Page - Not Logged In
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Party Management</h3>
                </div>
                <p className="text-gray-600 mb-4">Create and manage party records with commission structures and liability details</p>
                <div className="flex items-center text-blue-600 group-hover:text-blue-700 transition-colors">
                  <span className="text-sm font-medium">Learn More</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Ledger Management</h3>
                </div>
                <p className="text-gray-600 mb-4">Track financial transactions, balances, and generate comprehensive reports</p>
                <div className="flex items-center text-green-600 group-hover:text-green-700 transition-colors">
                  <span className="text-sm font-medium">Learn More</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Financial Reports</h3>
                </div>
                <p className="text-gray-600 mb-4">Generate trial balance, profit-loss reports, and transaction statements</p>
                <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
                  <span className="text-sm font-medium">Learn More</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
                <div className="flex items-center mb-4">
                  <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Analytics</h3>
                </div>
                <p className="text-gray-600 mb-4">Track performance metrics, commission trends, and business insights</p>
                <div className="flex items-center text-orange-600 group-hover:text-orange-700 transition-colors">
                  <span className="text-sm font-medium">Learn More</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
                <div className="flex items-center mb-4">
                  <div className="bg-red-100 p-3 rounded-lg group-hover:bg-red-200 transition-colors">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Financial Overview</h3>
                </div>
                <p className="text-gray-600 mb-4">Monitor balances, limits, and overall financial health</p>
                <div className="flex items-center text-red-600 group-hover:text-red-700 transition-colors">
                  <span className="text-sm font-medium">Learn More</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
                <div className="flex items-center mb-4">
                  <div className="bg-indigo-100 p-3 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <Settings className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">User Settings</h3>
                </div>
                <p className="text-gray-600 mb-4">Configure system preferences, decimal formats, and account settings</p>
                <div className="flex items-center text-indigo-600 group-hover:text-indigo-700 transition-colors">
                  <span className="text-sm font-medium">Learn More</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome to Account Ledger Software</h2>
                <p className="text-blue-100 mb-6">Professional financial management system for businesses. Manage parties, track transactions, and generate comprehensive reports with ease.</p>
                <div className="flex justify-center space-x-4">
                  <Link to="/login" className="bg-white text-blue-600 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors font-medium flex items-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                  <Link to="/register" className="border border-white text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors font-medium flex items-center">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Dashboard - Logged In User
          <>
            {/* Dashboard Statistics Section */}
            <div className="mb-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
                <p className="text-gray-600">Your business performance at a glance</p>
              </div>
            </div>

            {/* Balance Dashboard */}
                         <div className="mb-8">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold text-gray-900">{companyName} Balance</h2>
                 {stats?.companyBalance?.autoCalculated && (
                   <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                     <span className="text-xs font-medium text-blue-700">Auto Calculated</span>
                   </div>
                 )}
               </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-100">Company Net Balance</p>
                      <p className="text-2xl font-bold">
                        {(loading || partiesLoading || entriesLoading) ? '...' : formatCurrency(stats?.overview?.totalBalance)}
                      </p>
                    </div>
                    <div className="bg-blue-400 p-3 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-blue-100">Total Credits - Total Debits</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-100">Commission Collected</p>
                      <p className="text-2xl font-bold">
                        {(loading || partiesLoading || entriesLoading) ? '...' : formatCurrency(stats?.companyBalance?.commissionCollected || 0)}
                      </p>
                    </div>
                    <div className="bg-green-400 p-3 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-green-100">Total Commission Earned</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg text-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-100">Commission Paid</p>
                      <p className="text-2xl font-bold">
                        {(loading || partiesLoading || entriesLoading) ? '...' : formatCurrency(stats?.companyBalance?.commissionPaid || 0)}
                      </p>
                    </div>
                    <div className="bg-red-400 p-3 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-red-100">Total Commission Paid</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-100">Net Commission Profit</p>
                      <p className="text-2xl font-bold">
                        {(loading || partiesLoading || entriesLoading) ? '...' : formatCurrency(stats?.companyBalance?.netCommissionProfit || 0)}
                      </p>
                    </div>
                    <div className="bg-purple-400 p-3 rounded-lg">
                      <Calculator className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-purple-100">Collected - Paid</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Company Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Credits (Received)</p>
                    <p className="text-xl font-bold text-green-600">
                      {(loading || partiesLoading || entriesLoading) ? '...' : formatCurrency(stats?.overview?.totalCredit)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                                 <div className="mt-4">
                   <span className="text-sm text-gray-500">Money received by {companyName}</span>
                 </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Debits (Paid)</p>
                    <p className="text-xl font-bold text-red-600">
                      {(loading || partiesLoading || entriesLoading) ? '...' : formatCurrency(stats?.overview?.totalDebit)}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                                 <div className="mt-4">
                   <span className="text-sm text-gray-500">Money paid by {companyName}</span>
                 </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commission Transactions</p>
                    <p className="text-xl font-bold text-blue-600">
                      {(loading || partiesLoading || entriesLoading) ? '...' : stats?.companyBalance?.commissionTransactionCount || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Calculator className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">Completed commission deals</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Business Activity</p>
                    <p className="text-xl font-bold text-purple-600">
                      {(loading || partiesLoading || entriesLoading) ? '...' : formatCurrency(stats?.overview?.totalCredit + stats?.overview?.totalDebit || 0)}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">Total transaction volume</span>
                </div>
              </div>
            </div>

            {/* General Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Parties</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(loading || partiesLoading || entriesLoading) ? '...' : stats?.overview.totalParties || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">Total Parties</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(loading || partiesLoading || entriesLoading) ? '...' : stats?.overview.totalTransactions || 0}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">Total Transactions</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overall Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(loading || partiesLoading || entriesLoading) ? '...' : stats ? formatCurrency(stats.overview.totalBalance) : '₹0'}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {stats && (
                                      <span className="text-sm text-gray-500">
                    Current Balance
                  </span>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Settlements</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(loading || partiesLoading || entriesLoading) ? '...' : stats?.overview.totalTransactions || 0}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Calculator className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">Total Transactions</span>
                </div>
              </div>
            </div>

            {/* Recent Activity feature removed */}

            {/* Section Divider */}
            <div className="my-12">
              <div className="flex items-center">
                <div className="flex-1 border-t border-gray-200"></div>
                <div className="px-6">
                  <h2 className="text-lg font-semibold text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                    Quick Actions
                  </h2>
                </div>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Link to="/user-settings" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 group-hover:border-blue-300">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">User Settings</h3>
              </div>
              <p className="text-gray-600 mb-4">Configure system preferences, decimal formats, and account settings</p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700 transition-colors">
                <span className="text-sm font-medium">Manage Settings</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link to="/new-party" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 group-hover:border-green-300">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">New Party</h3>
              </div>
              <p className="text-gray-600 mb-4">Create new party records with commission structures and liability details</p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 transition-colors">
                <span className="text-sm font-medium">Add New Party</span>
                <Plus className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Link>

              <Link to="/party-ledger" className="group">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 group-hover:border-purple-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">Party Ledger</h3>
            </div>
                  <p className="text-gray-600 mb-4">Manage party ledgers, transactions, and financial records</p>
                  <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
                    <span className="text-sm font-medium">View Ledger</span>
                    <BarChart3 className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                  </div>
          </div>
              </Link>

              <Link to="/final-trial-balance" className="group">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 group-hover:border-orange-300">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-200 transition-colors">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">Final Trial Balance</h3>
            </div>
                  <p className="text-gray-600 mb-4">Generate and view final trial balance reports</p>
                  <div className="flex items-center text-orange-600 group-hover:text-orange-700 transition-colors">
                    <span className="text-sm font-medium">Generate Report</span>
                    <Calculator className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                  </div>
          </div>
              </Link>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-3 rounded-lg group-hover:bg-red-200 transition-colors">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Analytics</h3>
            </div>
            <p className="text-gray-600 mb-4">Track performance metrics, commission trends, and business insights</p>
            <div className="flex items-center text-red-600 group-hover:text-red-700 transition-colors">
              <span className="text-sm font-medium">Coming Soon</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer group">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 p-3 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Financial Overview</h3>
            </div>
            <p className="text-gray-600 mb-4">Monitor balances, limits, and overall financial health</p>
            <div className="flex items-center text-indigo-600 group-hover:text-indigo-700 transition-colors">
              <span className="text-sm font-medium">Coming Soon</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg text-white p-8">
          <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h2>
                <p className="text-green-100 mb-6">Access all your business management tools from one centralized location. Manage parties, track commissions, and generate comprehensive reports.</p>
            <div className="flex justify-center space-x-4">
                  <Link to="/new-party" className="bg-white text-green-600 px-6 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Create New Party
              </Link>
                  <Link to="/party-ledger" className="border border-white text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors font-medium flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Party Ledger
              </Link>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
