
import React from 'react';
import TopNavigation from '../components/TopNavigation';
import { Link } from 'react-router-dom';
import { Settings, FileText, BarChart3, Users, TrendingUp, DollarSign } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Business Management System</h1>
          <p className="text-xl text-gray-600">Manage parties, commissions, and financial records with ease</p>
        </div>

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

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Reports</h3>
            </div>
            <p className="text-gray-600">Generate financial reports, commission statements, and analytics</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Data Entry</h3>
            </div>
            <p className="text-gray-600">Record transactions, update accounts, and manage financial data</p>
          </div>

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

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to Your Business Dashboard</h2>
            <p className="text-blue-100 mb-6">Access all your business management tools from one centralized location. Manage parties, track commissions, and generate comprehensive reports.</p>
            <div className="flex justify-center space-x-4">
              <Link to="/new-party" className="bg-white text-blue-600 px-6 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">
                Create New Party
              </Link>
              <Link to="/user-settings" className="border border-white text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors font-medium">
                Configure Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
