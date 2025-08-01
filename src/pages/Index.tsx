
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

import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Link } from 'react-router-dom';
import { Settings, FileText, BarChart3, Users, TrendingUp, DollarSign, LogIn, UserPlus, ArrowRight, Plus, ChartBar, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalParties: { count: number; growth: number };
  totalTransactions: { count: number; growth: number; recent: number };
  totalBalance: { amount: number; growth: number };
  settlements: { count: number };
}

interface RecentActivity {
  type: 'transaction' | 'settlement' | 'party';
  title: string;
  amount: string;
  time: string;
  color: 'green' | 'blue' | 'purple';
}

const Index = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentActivity()
      ]);
      
      if (statsResponse.success) {
        setStats(statsResponse.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics",
          variant: "destructive"
        });
      }
      
      if (activityResponse.success) {
        setRecentActivity(activityResponse.data);
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load stats when component mounts
  useEffect(() => {
    fetchDashboardStats();
  }, [isAuthenticated]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format growth percentage
  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    const color = growth >= 0 ? 'text-green-600' : 'text-red-600';
    return { text: `${sign}${growth}%`, color };
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

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
            {/* Quick Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Parties</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats?.totalParties.count || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {stats && (
                    <span className={`text-sm font-medium ${formatGrowth(stats.totalParties.growth).color}`}>
                      {formatGrowth(stats.totalParties.growth).text}
                    </span>
                  )}
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats?.totalTransactions.count || 0}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {stats && (
                    <span className={`text-sm font-medium ${formatGrowth(stats.totalTransactions.growth).color}`}>
                      {formatGrowth(stats.totalTransactions.growth).text}
                    </span>
                  )}
                  <span className="text-sm text-gray-500 ml-2">from last week</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats ? formatCurrency(stats.totalBalance.amount) : '₹0'}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  {stats && (
                    <span className={`text-sm font-medium ${formatGrowth(stats.totalBalance.growth).color}`}>
                      {formatGrowth(stats.totalBalance.growth).text}
                    </span>
                  )}
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Settlements</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats?.settlements.count || 0}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Calculator className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">Monday Final entries</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4 animate-pulse">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-4 bg-gray-300 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500">{formatTimeAgo(activity.time)}</p>
                        </div>
                        <span className={`text-sm text-${activity.color}-600 font-medium`}>{activity.amount}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No recent activity</p>
                    <p className="text-gray-400 text-xs mt-1">Start by creating a party or adding transactions</p>
                  </div>
                )}
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
                    <ChartBar className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
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
                    <ChartBar className="w-4 h-4 mr-2" />
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
