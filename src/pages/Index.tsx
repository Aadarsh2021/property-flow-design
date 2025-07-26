
import React from 'react';
import TopNavigation from '../components/TopNavigation';
import { Link } from 'react-router-dom';
import { Settings, FileText, BarChart3, Users, TrendingUp, DollarSign, LogIn, UserPlus } from 'lucide-react';
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Party Management</h3>
                </div>
                <p className="text-gray-600">Create and manage party records with commission structures and liability details</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Ledger Management</h3>
                </div>
                <p className="text-gray-600">Track financial transactions, balances, and generate comprehensive reports</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Financial Reports</h3>
                </div>
                <p className="text-gray-600">Generate trial balance, profit-loss reports, and transaction statements</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Analytics</h3>
                </div>
                <p className="text-gray-600">Track performance metrics, commission trends, and business insights</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Financial Overview</h3>
                </div>
                <p className="text-gray-600">Monitor balances, limits, and overall financial health</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <Settings className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">User Settings</h3>
                </div>
                <p className="text-gray-600">Configure system preferences, decimal formats, and account settings</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Link to="/user-settings" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group-hover:border-blue-300">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">User Settings</h3>
              </div>
              <p className="text-gray-600">Configure system preferences, decimal formats, and account settings</p>
            </div>
          </Link>

          <Link to="/new-party" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group-hover:border-green-300">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 ml-3">New Party</h3>
              </div>
              <p className="text-gray-600">Create new party records with commission structures and liability details</p>
            </div>
          </Link>

              <Link to="/party-ledger" className="group">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group-hover:border-purple-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">Party Ledger</h3>
            </div>
                  <p className="text-gray-600">Manage party ledgers, transactions, and financial records</p>
          </div>
              </Link>

              <Link to="/final-trial-balance" className="group">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group-hover:border-orange-300">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-3">Final Trial Balance</h3>
            </div>
                  <p className="text-gray-600">Generate and view final trial balance reports</p>
          </div>
              </Link>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Analytics</h3>
            </div>
            <p className="text-gray-600">Track performance metrics, commission trends, and business insights</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Financial Overview</h3>
            </div>
            <p className="text-gray-600">Monitor balances, limits, and overall financial health</p>
          </div>
        </div>

            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg text-white p-8">
          <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h2>
                <p className="text-green-100 mb-6">Access all your business management tools from one centralized location. Manage parties, track commissions, and generate comprehensive reports.</p>
            <div className="flex justify-center space-x-4">
                  <Link to="/new-party" className="bg-white text-green-600 px-6 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
                Create New Party
              </Link>
                  <Link to="/party-ledger" className="border border-white text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors font-medium">
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
