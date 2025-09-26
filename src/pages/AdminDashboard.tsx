import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Shield,
  Database,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  Edit,
  Timer
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminApi, type DashboardStats, type User, type SystemHealth } from '@/lib/adminApi';
import { clearCacheByPattern } from '@/lib/apiCache';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalParties: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingTransactions: 0
  });
  // Recent activity feature removed
  const [users, setUsers] = useState<User[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'unknown',
    api: 'unknown',
    authentication: 'unknown',
    fileStorage: 'unknown'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    stats: false,
    pendingUsers: false,
    rejectedUsers: false,
    health: false,
    users: false
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordDetailsModal, setShowPasswordDetailsModal] = useState(false);
  const [passwordDetails, setPasswordDetails] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<User[]>([]);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);
  const [disapprovingUser, setDisapprovingUser] = useState<string | null>(null);
  const [revokingUser, setRevokingUser] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('pending');
  const navigate = useNavigate();
  const { isLoggedIn, logout, checkSession } = useAdminAuth();

  // Handle tab change with better UX
  const handleTabChange = (newTab: string) => {
    console.log(`📊 ADMIN: Tab changed from ${activeTab} to ${newTab}`);
    setActiveTab(newTab);
    if (newTab === 'user-management') {
      setActiveSubTab('pending'); // Default to pending sub-tab
    }
  };

  // Handle sub-tab change for user management
  const handleSubTabChange = (newTab: string) => {
    console.log(`📊 ADMIN: Sub-tab changed to ${newTab}`);
    // Keep the main tab as user-management but set the sub-tab
    if (newTab === 'pending' || newTab === 'users') {
      setActiveTab(newTab);
    }
  };

  useEffect(() => {
    // Check if admin is logged in and has valid token
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminLoggedIn || !adminToken) {
      console.log('❌ Admin not properly authenticated, redirecting to login');
      navigate('/admin');
      return;
    }

    console.log('✅ Admin authenticated, loading dashboard data');
    // Load initial data
    loadDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing admin dashboard...');
      loadDashboardData(false); // Silent refresh
      setLastRefresh(new Date());
    }, 30000); // 30 seconds

    setAutoRefreshInterval(interval);

    // Cleanup interval on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [navigate]);

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  const loadDashboardData = async (showLoading = true) => {
    const startTime = performance.now();
    console.log('🚀 FUNCTION: loadDashboardData started...');
    console.log('📊 JOURNEY: Step 8 - Admin Panel Access');
    console.log('📊 ADMIN: Starting admin dashboard load...');
    
    // Clear any expired cache entries before loading
    adminApi.clearCacheByPattern('.*expired.*');
    
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);
      
      // Set all loading states
      setLoadingStates({
        stats: true,
        pendingUsers: true,
        rejectedUsers: true,
        health: true,
        users: true
      });

      console.log('🚀 Loading all dashboard data in single batch request...');

      // Use batch API to get all data in single request
      try {
        const dashboardData = await adminApi.getDashboardData(10);
        
        // Set all data at once
        setStats(dashboardData.stats);
        setSystemHealth(dashboardData.health);
        
        // Debug: Log the users data structure
        console.log('📊 Full dashboard data:', dashboardData);
        console.log('📊 Users data structure:', dashboardData.users);
        console.log('📊 Users array:', dashboardData.users?.users || []);
        console.log('📊 Pending users:', dashboardData.pendingUsers);
        console.log('📊 Users length:', (dashboardData.users?.users || []).length);
        console.log('📊 Pending users length:', dashboardData.pendingUsers?.length || 0);
        
        // Handle both possible data structures
        const usersData = dashboardData.users;
        const usersArray = usersData?.users || usersData || [];
        console.log('📊 Final users array:', usersArray);
        setUsers(usersArray);
        setPendingUsers(dashboardData.pendingUsers);
        setRejectedUsers(dashboardData.rejectedUsers || []);
        
        // Clear all loading states
        setLoadingStates({
          stats: false,
          pendingUsers: false,
          rejectedUsers: false,
          health: false,
          users: false
        });

        console.log(`⚡ All dashboard data loaded in ${(performance.now() - startTime).toFixed(2)}ms`);
      } catch (err) {
        console.log('⚠️ Batch API not available, using individual requests (this is normal)');
        console.log('📊 ADMIN: Batch API error:', err.message);
        
        // Fallback to individual API calls if batch fails
        console.log('📊 ADMIN: Starting individual API calls...');
        const individualStartTime = performance.now();
        
        const [statsResult, healthResult, usersResult, pendingUsersResult, rejectedUsersResult] = await Promise.allSettled([
          adminApi.getDashboardStats(),
          adminApi.getSystemHealth(),
          adminApi.getAllUsers(1, 10),
          adminApi.getPendingUsers(),
          adminApi.getRejectedUsers()
        ]);
        
        const individualEndTime = performance.now();
        console.log(`⚡ Individual API calls completed in ${(individualEndTime - individualStartTime).toFixed(2)}ms`);

        // Process results with timing
        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value);
          setLoadingStates(prev => ({ ...prev, stats: false }));
          console.log('✅ ADMIN: Stats loaded successfully');
        } else {
          console.error('❌ ADMIN: Failed to load stats:', statsResult.reason);
        }

        // Recent activity feature removed

        if (healthResult.status === 'fulfilled') {
          setSystemHealth(healthResult.value);
          setLoadingStates(prev => ({ ...prev, health: false }));
          console.log('✅ ADMIN: Health check completed');
        } else {
          console.error('❌ ADMIN: Failed to load health:', healthResult.reason);
        }

        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value.users);
          setLoadingStates(prev => ({ ...prev, users: false }));
          console.log(`✅ ADMIN: Users loaded (${usersResult.value.users.length} users)`);
        } else {
          console.error('❌ ADMIN: Failed to load users:', usersResult.reason);
        }

        if (pendingUsersResult.status === 'fulfilled') {
          setPendingUsers(pendingUsersResult.value);
          setLoadingStates(prev => ({ ...prev, pendingUsers: false }));
          console.log(`✅ ADMIN: Pending users loaded (${pendingUsersResult.value.length} pending)`);
        } else {
          console.error('❌ ADMIN: Failed to load pending users:', pendingUsersResult.reason);
        }

        if (rejectedUsersResult.status === 'fulfilled') {
          setRejectedUsers(rejectedUsersResult.value);
          setLoadingStates(prev => ({ ...prev, rejectedUsers: false }));
          console.log(`✅ ADMIN: Rejected users loaded (${rejectedUsersResult.value.length} rejected)`);
        } else {
          console.error('❌ ADMIN: Failed to load rejected users:', rejectedUsersResult.reason);
        }

        console.log(`⚡ Fallback data loaded in ${(performance.now() - startTime).toFixed(2)}ms`);
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setLoadingStates({
        stats: false,
        pendingUsers: false,
        health: false,
        users: false
      });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      console.log(`⚡ Total dashboard load time: ${(performance.now() - startTime).toFixed(2)}ms`);
    }
  };

  const handleRefresh = async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleRefresh started...');
    console.log('🔄 REFRESH: Starting admin dashboard refresh...');
    
    // Clear all cache before refresh
    console.log('💾 CACHE: Clearing all cache for manual refresh');
    clearCacheByPattern('.*admin.*');
    
    setRefreshing(true);
    await loadDashboardData(false); // Silent refresh
    setLastRefresh(new Date());
    setRefreshing(false);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`✅ ACTION: handleRefresh completed in ${duration.toFixed(2)}ms`);
    console.log('🔄 REFRESH: Admin dashboard refresh finished');
  };

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone and will delete all their data including parties and transactions.`)) {
      return;
    }

    try {
      setDeletingUser(userId);
      await adminApi.deleteUser(userId);
      
      // Clear cache for users data to ensure fresh data
      console.log('💾 CACHE: Clearing users cache after deletion');
      clearCacheByPattern('.*admin.*');
      adminApi.clearCache(); // Also clear admin API internal cache
      
      // Refresh the users list but maintain current tab
      await loadDashboardData();
      
      // Keep the user on the users tab after deletion
      setActiveTab('users');
      
      alert('User deleted successfully');
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user. Please try again.');
    } finally {
      setDeletingUser(null);
    }
  };

  const handleResetPassword = async (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    try {
      setResettingPassword(selectedUser.id);
      await adminApi.resetUserPassword(selectedUser.id, newPassword);
      
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      alert('Password reset successfully');
    } catch (err) {
      console.error('Failed to reset password:', err);
      alert('Failed to reset password. Please try again.');
    } finally {
      setResettingPassword(null);
    }
  };

  const handleCancelResetPassword = () => {
    setShowPasswordModal(false);
    setSelectedUser(null);
    setNewPassword('');
  };

  const handleViewPasswordDetails = async (user: User) => {
    try {
      const details = await adminApi.getUserPasswordDetails(user.id);
      setPasswordDetails(details);
      setSelectedUser(user);
      setShowPasswordDetailsModal(true);
    } catch (err) {
      console.error('Failed to get password details:', err);
      alert('Failed to get password details. Please try again.');
    }
  };

  const handleClosePasswordDetails = () => {
    setShowPasswordDetailsModal(false);
    setPasswordDetails(null);
    setSelectedUser(null);
  };

  const handleApproveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to approve user "${userName}"?`)) {
      return;
    }

    try {
      setApprovingUser(userId);
      await adminApi.approveUser(userId);
      
      // Clear cache for users data to ensure fresh data
      console.log('💾 CACHE: Clearing users cache after approval');
      clearCacheByPattern('.*admin.*');
      adminApi.clearCache(); // Also clear admin API internal cache
      adminApi.clearCacheByPattern('.*pending.*'); // Specifically clear pending users cache
      
      // Refresh the data immediately but maintain current tab
      await loadDashboardData(false);
      setLastRefresh(new Date());
      
      // Keep the user on the pending tab after approval
      setActiveTab('pending');
      
      alert('User approved successfully');
    } catch (err) {
      console.error('Failed to approve user:', err);
      alert('Failed to approve user. Please try again.');
    } finally {
      setApprovingUser(null);
    }
  };

  const handleDisapproveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to disapprove user "${userName}"? This will permanently delete their account and all data.`)) {
      return;
    }

    try {
      setDisapprovingUser(userId);
      await adminApi.disapproveUser(userId);
      
      // Clear cache for users data to ensure fresh data
      console.log('💾 CACHE: Clearing users cache after disapproval');
      clearCacheByPattern('.*admin.*');
      adminApi.clearCache(); // Also clear admin API internal cache
      adminApi.clearCacheByPattern('.*pending.*'); // Specifically clear pending users cache
      
      // Refresh the data immediately but maintain current tab
      await loadDashboardData(false);
      setLastRefresh(new Date());
      
      // Keep the user on the pending tab after disapproval
      setActiveTab('pending');
      
      alert('User disapproved and deleted successfully');
    } catch (err) {
      console.error('Failed to disapprove user:', err);
      alert('Failed to disapprove user. Please try again.');
    } finally {
      setDisapprovingUser(null);
    }
  };

  const handleRevokeUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to revoke user "${userName}"? This will move them to rejected users.`)) {
      return;
    }

    try {
      setRevokingUser(userId);
      
      // Call the revoke user API
      await adminApi.revokeUser(userId);
      
      // Clear cache for users data to ensure fresh data
      console.log('💾 CACHE: Clearing users cache after revocation');
      clearCacheByPattern('.*admin.*');
      adminApi.clearCache();
      adminApi.clearCacheByPattern('.*rejected.*');
      
      // Refresh the data immediately but maintain current tab
      await loadDashboardData(false);
      setLastRefresh(new Date());
      
      // Switch to rejected users tab to show the revoked user
      setActiveTab('user-management');
      setActiveSubTab('rejected');
      
      alert('User revoked successfully and moved to rejected users');
    } catch (err) {
      console.error('Failed to revoke user:', err);
      alert('Failed to revoke user. Please try again.');
    } finally {
      setRevokingUser(null);
    }
  };

  const handleReapproveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to re-approve user "${userName}"? This will move them back to approved users.`)) {
      return;
    }

    try {
      setRevokingUser(userId); // Reuse the same loading state
      console.log('🔄 Re-approving user:', userId, userName);
      
      // Call the re-approve user API
      const result = await adminApi.reapproveUser(userId);
      console.log('✅ Re-approve API result:', result);
      
      // Clear cache for users data to ensure fresh data
      console.log('💾 CACHE: Clearing users cache after re-approval');
      clearCacheByPattern('.*admin.*');
      adminApi.clearCache();
      adminApi.clearCacheByPattern('.*rejected.*');
      
      // Refresh the data immediately but maintain current tab
      console.log('🔄 Refreshing dashboard data after re-approval');
      await loadDashboardData(false);
      setLastRefresh(new Date());
      
      // Switch to users tab to show the re-approved user
      console.log('🔄 Switching to users tab');
      setActiveTab('user-management');
      setActiveSubTab('users');
      
      console.log('✅ Re-approval completed, users count:', users.length);
      alert('User re-approved successfully and moved back to approved users');
    } catch (err) {
      console.error('❌ Failed to re-approve user:', err);
      alert('Failed to re-approve user. Please try again.');
    } finally {
      setRevokingUser(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // getActivityIcon function removed - recent activity feature removed

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminLayout>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-elegant">
              {activeTab === 'dashboard' ? (
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              ) : (
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {activeTab === 'dashboard' ? 'Admin Dashboard' : 'User Management'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {activeTab === 'dashboard' 
                  ? 'Overview and system statistics' 
                  : 'Manage users and their permissions'
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleRefresh} variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6" id="admin-main-tabs">
          <TabsList className="w-full max-w-md mx-auto mb-8 bg-muted p-1 rounded-lg">
            <TabsTrigger value="dashboard" className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="user-management" className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Overview - Only in Dashboard tab */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingStates.stats ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats.totalUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        Registered users in system
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Active Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  {loadingStates.stats ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        Currently active and online
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pending Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  {loadingStates.pendingUsers ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Awaiting admin approval
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Total Transactions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  {loadingStates.stats ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-blue-600">{stats.totalTransactions.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Ledger entries in system
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Total Parties */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
                  <FileText className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  {loadingStates.stats ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-purple-600">{stats.totalParties}</div>
                      <p className="text-xs text-muted-foreground">
                        Business parties registered
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Total Revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  {loadingStates.stats ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
                      <p className="text-xs text-muted-foreground">
                        Total system revenue
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pending Transactions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  {loadingStates.stats ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-red-600">{stats.pendingTransactions}</div>
                      <p className="text-xs text-muted-foreground">
                        Require attention
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions and Recent Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common administrative tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => {
                      setActiveTab('user-management');
                      setActiveSubTab('users');
                    }}
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users ({stats.totalUsers})
                  </Button>
                  
                  {pendingUsers.length > 0 && (
                    <Button 
                      onClick={() => {
                        setActiveTab('user-management');
                        setActiveSubTab('pending');
                      }}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Review Pending Users ({pendingUsers.length})
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleRefresh} 
                    className="w-full justify-start" 
                    variant="outline"
                    disabled={refreshing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Users
                  </CardTitle>
                  <CardDescription>
                    Latest user registrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStates.users ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                            <div className="space-y-1">
                              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                            </div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {users.slice(0, 5).map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-sm">{user.name || 'No Name'}</h4>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(user.created_at || '').toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              user.is_approved ? "default" : 
                              user.rejected_at ? "destructive" : 
                              "secondary"
                            } className="text-xs">
                              {user.is_approved ? 'Active' : 
                               user.rejected_at ? 'Rejected' : 
                               'Pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      
                      <Button 
                        onClick={() => setActiveTab('users')}
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                      >
                        View All Users
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* System Status - Only in Dashboard tab */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>
                    Current system health and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStates.health ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Database className={`h-4 w-4 ${
                            systemHealth.database === 'online' ? 'text-green-500' : 
                            systemHealth.database === 'error' ? 'text-red-500' : 'text-yellow-500'
                          }`} />
                          <span className="text-sm font-medium">Database</span>
                        </div>
                        <Badge variant="default" className={
                          systemHealth.database === 'online' ? 'bg-green-100 text-green-800' :
                          systemHealth.database === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {systemHealth.database}
                        </Badge>
                      </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className={`h-4 w-4 ${
                          systemHealth.api === 'healthy' ? 'text-green-500' : 
                          systemHealth.api === 'error' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <span className="text-sm font-medium">API Server</span>
                      </div>
                      <Badge variant="default" className={
                        systemHealth.api === 'healthy' ? 'bg-green-100 text-green-800' :
                        systemHealth.api === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {systemHealth.api}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className={`h-4 w-4 ${
                          systemHealth.authentication === 'active' ? 'text-green-500' : 
                          systemHealth.authentication === 'error' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <span className="text-sm font-medium">Authentication</span>
                      </div>
                      <Badge variant="default" className={
                        systemHealth.authentication === 'active' ? 'bg-green-100 text-green-800' :
                        systemHealth.authentication === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {systemHealth.authentication}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className={`h-4 w-4 ${
                          systemHealth.fileStorage === 'online' ? 'text-green-500' : 
                          systemHealth.fileStorage === 'error' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <span className="text-sm font-medium">File Storage</span>
                      </div>
                      <Badge variant="default" className={
                        systemHealth.fileStorage === 'online' ? 'bg-green-100 text-green-800' :
                        systemHealth.fileStorage === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {systemHealth.fileStorage}
                      </Badge>
                    </div>

                    {systemHealth.cache && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Database className={`h-4 w-4 ${
                            systemHealth.cache === 'online' ? 'text-green-500' : 
                            systemHealth.cache === 'offline' ? 'text-red-500' : 'text-yellow-500'
                          }`} />
                          <span className="text-sm font-medium">Cache</span>
                        </div>
                        <Badge variant="default" className={
                          systemHealth.cache === 'online' ? 'bg-green-100 text-green-800' :
                          systemHealth.cache === 'offline' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {systemHealth.cache}
                        </Badge>
                      </div>
                    )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Alerts & Notifications */}
            {(pendingUsers.length > 0 || stats.pendingTransactions > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    Attention Required
                  </CardTitle>
                  <CardDescription>
                    Items that need your immediate attention
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingUsers.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium">{pendingUsers.length} users awaiting approval</span>
                      </div>
                      <Button 
                        onClick={() => setActiveTab('pending')}
                        size="sm" 
                        variant="outline"
                      >
                        Review Now
                      </Button>
                    </div>
                  )}
                  
                  {stats.pendingTransactions > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium">{stats.pendingTransactions} transactions require attention</span>
                      </div>
                      <Button size="sm" variant="outline">
                        Review Transactions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="user-management" className="space-y-6">
            {/* User Management with sub-tabs */}
            <div className="space-y-6">
              <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                <button
                  onClick={() => setActiveSubTab('pending')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSubTab === 'pending' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending Approval ({pendingUsers.length})
                </button>
      <button
        onClick={() => setActiveSubTab('users')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          activeSubTab === 'users'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Approved Users ({users.length})
      </button>
                <button
                  onClick={() => setActiveSubTab('rejected')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSubTab === 'rejected' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Rejected Users ({rejectedUsers.length})
                </button>
              </div>

              {activeTab === 'user-management' && activeSubTab === 'pending' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending User Approvals</CardTitle>
                    <CardDescription>
                      Review and approve new user registrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingStates.pendingUsers ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-28 animate-pulse"></div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                              <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingUsers.length > 0 ? (
                          <div className="space-y-3">
                            {pendingUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                  <Clock className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{user.name || 'No Name'}</p>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                  <p className="text-xs text-gray-400">
                                    {user.city && user.state ? `${user.city}, ${user.state}` : 'Location not set'}
                                  </p>
                                  <p className="text-xs text-yellow-600">
                                    Registered: {new Date(user.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <Button
                                  onClick={() => handleApproveUser(user.id, user.name || user.email)}
                                  variant="outline"
                                  size="sm"
                                  disabled={approvingUser === user.id}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {approvingUser === user.id ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  onClick={() => handleDisapproveUser(user.id, user.name || user.email)}
                                  variant="outline"
                                  size="sm"
                                  disabled={disapprovingUser === user.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  {disapprovingUser === user.id ? 'Disapproving...' : 'Disapprove'}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <p className="text-gray-500">No pending user approvals</p>
                          <p className="text-sm text-gray-400">All users have been reviewed</p>
                        </div>
                      )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'user-management' && activeSubTab === 'users' && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage users and their permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingStates.users ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right space-y-2">
                                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                              </div>
                              <div className="flex space-x-2">
                                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {console.log('🔍 Users tab - users array:', users, 'length:', users.length)}
                        {users.length > 0 ? (
                          <div className="space-y-3">
                            {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{user.name || 'No Name'}</p>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                  <p className="text-xs text-gray-400">
                                    {user.city && user.state ? `${user.city}, ${user.state}` : 'Location not set'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <div className="flex space-x-4 text-sm text-gray-500">
                                    <span>{user.partyCount || 0} parties</span>
                                    <span>{user.transactionCount || 0} transactions</span>
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    Joined {new Date(user.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex flex-col space-y-2">
                                  <Button
                                    onClick={() => handleViewPasswordDetails(user)}
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Password
                                  </Button>
                                  <Button
                                    onClick={() => handleResetPassword(user)}
                                    variant="outline"
                                    size="sm"
                                    disabled={resettingPassword === user.id}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Key className="h-4 w-4 mr-1" />
                                    {resettingPassword === user.id ? 'Resetting...' : 'Reset Password'}
                                  </Button>
                                  <Button
                                    onClick={() => handleRevokeUser(user.id, user.name || user.email)}
                                    variant="outline"
                                    size="sm"
                                    disabled={revokingUser === user.id}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  >
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    {revokingUser === user.id ? 'Revoking...' : 'Revoke'}
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingUser === user.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {deletingUser === user.id ? 'Deleting...' : 'Delete'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        ) : (
                          <p className="text-gray-500 text-center py-8">No users found</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'user-management' && activeSubTab === 'rejected' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rejected Users</CardTitle>
                    <CardDescription>
                      Users who were disapproved by admin
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingStates.rejectedUsers ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-28 animate-pulse"></div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                              <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {rejectedUsers.length > 0 ? (
                          <div className="space-y-3">
                            {rejectedUsers.map((user) => (
                              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <Users className="h-5 w-5 text-red-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{user.name || 'No Name'}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                    <p className="text-xs text-gray-400">
                                      {user.city && user.state ? `${user.city}, ${user.state}` : 'Location not set'}
                                    </p>
                                    <p className="text-xs text-red-500">
                                      Rejected on {new Date(user.updated_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">Status</p>
                                    <Badge variant="destructive">Rejected</Badge>
                                  </div>
                                  <div className="flex flex-col space-y-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleReapproveUser(user.id, user.name || user.email)}
                                      disabled={revokingUser === user.id}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      {revokingUser === user.id ? 'Re-approving...' : 'Re-approve'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-lg font-semibold text-gray-700">No rejected users</p>
                            <p className="text-sm text-gray-500">All users have been approved</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>

    {/* Password Details Modal */}
      {showPasswordDetailsModal && passwordDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>User Password Details</span>
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">User Name</label>
                  <p className="text-sm text-gray-900">{passwordDetails.name || 'No Name'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{passwordDetails.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Auth Provider</label>
                  <p className="text-sm text-gray-900 capitalize">{passwordDetails.authProvider}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Has Password</label>
                  <p className="text-sm text-gray-900">
                    {passwordDetails.hasPassword ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-red-600 font-medium">No</span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Google Only User</label>
                  <p className="text-sm text-gray-900">
                    {passwordDetails.isGoogleOnly ? (
                      <span className="text-blue-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-600 font-medium">No</span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password Hash Length</label>
                  <p className="text-sm text-gray-900">{passwordDetails.passwordHashLength} characters</p>
                </div>
              </div>

              {passwordDetails.hasPassword && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Actual Password</label>
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <code className="text-sm text-green-800 font-mono">
                        {passwordDetails.passwordText || 'No password text stored'}
                      </code>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Password Hash</label>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <code className="text-xs text-gray-800 break-all">
                        {passwordDetails.passwordHash}
                      </code>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Security Information</label>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hash Algorithm:</span>
                    <span className="text-sm font-medium text-gray-900">{passwordDetails.securityInfo.hashAlgorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Salt Rounds:</span>
                    <span className="text-sm font-medium text-gray-900">{passwordDetails.securityInfo.saltRounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Password Update:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(passwordDetails.securityInfo.lastPasswordUpdate).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account Information</label>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(passwordDetails.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(passwordDetails.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleClosePasswordDetails}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleClosePasswordDetails();
                    handleResetPassword(selectedUser!);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Reset Password for {selectedUser.name || selectedUser.email}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password (min 8 characters)"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 8 characters long
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleConfirmResetPassword}
                  disabled={!newPassword || newPassword.length < 8 || resettingPassword === selectedUser.id}
                  className="flex-1"
                >
                  {resettingPassword === selectedUser.id ? 'Resetting...' : 'Reset Password'}
                </Button>
                <Button
                  onClick={handleCancelResetPassword}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
