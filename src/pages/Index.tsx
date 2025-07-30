
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
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React from 'react';
import TopNavigation from '../components/TopNavigation';
import { Link } from 'react-router-dom';
import { Settings, FileText, BarChart3, Users, TrendingUp, DollarSign, LogIn, UserPlus, ArrowRight, Plus, ChartBar, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated } = useAuth();

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
                    <p className="text-2xl font-bold text-gray-900">24</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-green-600 font-medium">+12%</span>
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">1,234</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-green-600 font-medium">+8%</span>
                  <span className="text-sm text-gray-500 ml-2">from last week</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900">₹2,45,678</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-green-600 font-medium">+15%</span>
                  <span className="text-sm text-gray-500 ml-2">from last month</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Settlements</p>
                    <p className="text-2xl font-bold text-gray-900">18</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-green-600 font-medium">+5</span>
                  <span className="text-sm text-gray-500 ml-2">this week</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">New transaction added to ABC Company</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                    <span className="text-sm text-green-600 font-medium">+₹5,000</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Monday Final settlement completed</p>
                      <p className="text-xs text-gray-500">1 hour ago</p>
                    </div>
                    <span className="text-sm text-blue-600 font-medium">Settled</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">New party "XYZ Traders" created</p>
                      <p className="text-xs text-gray-500">3 hours ago</p>
                    </div>
                    <span className="text-sm text-purple-600 font-medium">New</span>
                  </div>
                </div>
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
