/**
 * Top Navigation Component
 * 
 * Provides the main navigation header for the Property Flow Design application.
 * Includes user authentication status, navigation links, and responsive design.
 * 
 * Features:
 * - User authentication display
 * - Navigation menu with dropdown
 * - Responsive mobile design
 * - Logout functionality
 * - User profile management
 * - Search functionality
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { ChevronDown, Settings, FileText, BarChart3, Database, Home, LogOut, User, LogIn, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const TopNavigation = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg shadow-md">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900 leading-tight">
                  Account Ledger
                </span>
                <span className="text-xs text-gray-500 leading-tight">
                  Financial Management System
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Menu - Only show if authenticated */}
          {isAuthenticated && (
          <div className="flex items-center space-x-8">
              {/* Reports Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('reports')}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Reports</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {activeDropdown === 'reports' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/final-trial-balance"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Final Trial Balance
                      </Link>
                      <Link
                        to="/profit-loss-report"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Profit & Loss Report
                      </Link>
                      <Link
                        to="/transaction-report"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Transaction Report
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Management Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('data')}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                >
                  <Database className="w-4 h-4" />
                  <span>Data Management</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {activeDropdown === 'data' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/new-party"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveDropdown(null)}
                      >
                        New Party
                      </Link>
                      <Link
                        to="/party-ledger"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Party Ledger
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Dropdown */}
            <div className="relative">
              <button
                  onClick={() => toggleDropdown('settings')}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
              >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                  <ChevronDown className="w-3 h-3" />
              </button>
                {activeDropdown === 'settings' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <Link
                      to="/user-settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      onClick={() => setActiveDropdown(null)}
                    >
                      User Settings
                    </Link>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {/* User Profile & Authentication */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              // Logged In User
              <>
                <div className="bg-gray-100 rounded-full p-2 flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                    <Settings className="w-4 h-4 text-gray-600" />
              </button>
                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                    </button>
            </div>

                {/* User Profile Dropdown */}
            <div className="relative">
              <button
                    onClick={() => toggleDropdown('user')}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden md:block">{user?.fullname || 'User'}</span>
                    <ChevronDown className="w-3 h-3" />
              </button>
                  {activeDropdown === 'user' && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                          <div className="font-medium">{user?.fullname}</div>
                          <div className="text-xs">{user?.email}</div>
                        </div>
                        <Link
                          to="/user-settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                          onClick={() => setActiveDropdown(null)}
                        >
                          Profile Settings
                        </Link>
                    <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <LogOut className="w-4 h-4 inline mr-2" />
                          Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
              </>
            ) : (
              // Not Logged In - Show Auth Buttons
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </Link>
          </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigation;
