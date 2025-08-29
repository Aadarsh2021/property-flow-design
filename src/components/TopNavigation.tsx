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
import { useCompanyName } from '@/hooks/useCompanyName';

const TopNavigation = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeMenuDropdown, setActiveMenuDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { companyName } = useCompanyName();

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const toggleMenuDropdown = (menu: string) => {
    setActiveMenuDropdown(activeMenuDropdown === menu ? null : menu);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/'); // Root path pe Index (Home) page render hoga
  };

  return (
    <>
      {/* Modern Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Database className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">{companyName}</span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {/* Configure Menu - Only User Settings */}
              <div className="relative">
                <button
                  onClick={() => toggleMenuDropdown('configure')}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                >
                  <span>Configure</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenuDropdown === 'configure' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/user-settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveMenuDropdown(null)}
                      >
                        User Settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Create Menu - Only Essential Items */}
              <div className="relative">
                <button
                  onClick={() => toggleMenuDropdown('create')}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                >
                  <span>Create</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenuDropdown === 'create' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/new-party"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveMenuDropdown(null)}
                      >
                        New Party
                      </Link>
                      <Link
                        to="/party-report"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveMenuDropdown(null)}
                      >
                        Party Report F1
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Entry Menu - Only Essential Items */}
              <div className="relative">
                <button
                  onClick={() => toggleMenuDropdown('dataEntry')}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                >
                  <span>Data Entry</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenuDropdown === 'dataEntry' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/party-ledger"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveMenuDropdown(null)}
                      >
                        Party A/C. Ledger F11
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Report Menu - Only Essential Items */}
              <div className="relative">
                <button
                  onClick={() => toggleMenuDropdown('report')}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors"
                >
                  <span>Report</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {activeMenuDropdown === 'report' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/final-trial-balance"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setActiveMenuDropdown(null)}
                      >
                        Final Trial Balance F12
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Profile & Authentication */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                // Logged In User
                <>
                  <div className="bg-gray-100 rounded-full p-2 flex items-center space-x-2">
                    <Link
                      to="/user-settings"
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-600" />
                    </Link>
                  </div>

                  {/* User Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown('user')}
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      {user?.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.fullname || 'User'} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
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
                            to="/"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            onClick={() => setActiveDropdown(null)}
                          >
                            Dashboard
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
    </>
  );
};

export default TopNavigation;
