import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  EyeOff
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminApi, type DashboardStats, type User, type SystemHealth } from '@/lib/adminApi';
import { clearCacheByPattern } from '@/lib/apiCache';
import UserManagement from '@/components/UserManagement';

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
    health: false,
    users: false
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);
  const [disapprovingUser, setDisapprovingUser] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { isLoggedIn, logout, checkSession } = useAdminAuth();

  // Handle tab change with better UX
  const handleTabChange = (newTab: string) => {
    console.log(`📊 ADMIN: Tab changed from ${activeTab} to ${newTab}`);
    setActiveTab(newTab);
  };

  useEffect(() => {
    // Check if admin is logged in
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!adminLoggedIn) {
      navigate('/admin');
      return;
    }

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
        setUsers(dashboardData.users.users);
        setPendingUsers(dashboardData.pendingUsers);
        
        // Clear all loading states
        setLoadingStates({
          stats: false,
          pendingUsers: false,
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
        
        const [statsResult, healthResult, usersResult, pendingUsersResult] = await Promise.allSettled([
          adminApi.getDashboardStats(),
          adminApi.getSystemHealth(),
          adminApi.getAllUsers(1, 10),
          adminApi.getPendingUsers()
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
    <div className="min-h-screen bg-gray-50">
       {/* Header */}
       <header className="bg-white shadow-sm border-b">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center h-16">
             <div className="flex items-center">
               {/* Logo and Company Name - Clickable to Home */}
               <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                 <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                   <span className="text-white font-bold text-lg">EL</span>
                 </div>
                 <div>
                   <h1 className="text-xl font-semibold text-gray-900">Escrow Ledger</h1>
                   <p className="text-sm text-gray-500">Admin Dashboard</p>
                 </div>
               </Link>
             </div>
             <div className="flex items-center space-x-4">
               <div className="text-right">
                 <p className="text-sm text-gray-500">
                   Last updated: {lastRefresh.toLocaleTimeString()}
                 </p>
                 <div className="text-xs text-gray-400">
                   Auto-refresh every 30s | {loadingStates.stats ? 'Loading...' : 'Ready'}
                 </div>
               </div>
             </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                    +12% from last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Parties</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStates.stats ? (
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalParties}</div>
                  <p className="text-xs text-muted-foreground">
                    +8% from last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStates.stats ? (
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +23% from last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStates.stats ? (
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    +15% from last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStates.stats ? (
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently online
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStates.stats ? (
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.pendingTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    Require attention
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval ({pendingUsers.length})</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            {/* Transactions tab removed - not implemented */}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity feature removed */}

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
          </TabsContent>

          <TabsContent value="pending">
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
                          <div className="flex space-x-2">
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
          </TabsContent>

          <TabsContent value="users">
            <UserManagement onRefresh={handleRefresh} />
          </TabsContent>

          {/* Transaction Management tab removed - not implemented */}

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">System settings will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
    </div>
  );
};

export default AdminDashboard;
