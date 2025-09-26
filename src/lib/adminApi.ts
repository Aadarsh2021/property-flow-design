/**
 * Admin API Service
 * 
 * Handles all admin-related API calls to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api';

interface DashboardStats {
  totalUsers: number;
  totalParties: number;
  totalTransactions: number;
  totalRevenue: number;
  activeUsers: number;
  pendingTransactions: number;
}

// ActivityItem interface removed - recent activity feature removed

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  created_at: string;
  updated_at: string;
  partyCount: number;
  transactionCount: number;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SystemHealth {
  database: string;
  api: string;
  authentication: string;
  fileStorage: string;
  cache?: string;
}

class AdminApiService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  // Clear all cache entries
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('💾 ADMIN API: Cleared all cache entries');
  }

  // Clear cache entries by pattern
  clearCacheByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    let clearedCount = 0;
    
    console.log(`💾 ADMIN API: Looking for pattern ${pattern}`);
    console.log(`💾 ADMIN API: Current cache keys:`, Array.from(this.cache.keys()));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        clearedCount++;
        console.log(`💾 ADMIN API: Cleared ${key} (pattern: ${pattern})`);
      }
    }
    
    console.log(`💾 ADMIN API: Cleared ${clearedCount} cache entries matching pattern: ${pattern}`);
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`🚀 Cache hit for ${endpoint}`);
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Request already pending for ${endpoint}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Make new request
    const requestPromise = this.executeRequest<T>(url, options, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(url: string, options: RequestInit, cacheKey: string): Promise<T> {
    const startTime = Date.now();
    
    // Get admin token from localStorage
    const adminToken = localStorage.getItem('adminToken');
    console.log('🔑 Admin API Request:', { url, hasToken: !!adminToken, tokenPreview: adminToken ? adminToken.substring(0, 20) + '...' : 'none' });
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken && { 'Authorization': `Bearer ${adminToken}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url,
        body: errorText
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    // Cache the result
    const ttl = this.getCacheTTL(url);
    this.cache.set(cacheKey, {
      data: data.data,
      timestamp: Date.now(),
      ttl: ttl
    });

    const loadTime = Date.now() - startTime;
    console.log(`⚡ ${url} loaded in ${loadTime}ms`);

    return data.data;
  }

  private getCacheTTL(url: string): number {
    if (url.includes('/stats')) return 300000; // 5 minutes
    if (url.includes('/activity')) return 180000; // 3 minutes
    if (url.includes('/users')) return 30000; // 30 seconds - reduced for better real-time updates
    if (url.includes('/pending-users')) return 10000; // 10 seconds - very short for pending users
    if (url.includes('/health')) return 120000; // 2 minutes
    return 60000; // 1 minute default
  }

  /**
   * Get all dashboard data in a single request (BATCH API)
   */
  async getDashboardData(limit: number = 10): Promise<{
    stats: DashboardStats;
    users: UsersResponse;
    health: SystemHealth;
    pendingUsers: User[];
  }> {
    return this.makeRequest<{
      stats: DashboardStats;
      users: UsersResponse;
      health: SystemHealth;
      pendingUsers: User[];
    }>(`/admin/dashboard-data?limit=${limit}`);
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return this.makeRequest<DashboardStats>('/admin/stats');
  }

  // Recent activity feature removed

  /**
   * Get all users with pagination
   */
  async getAllUsers(page: number = 1, limit: number = 20, search: string = ''): Promise<UsersResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    
    return this.makeRequest<UsersResponse>(`/admin/users?${params}`);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return this.makeRequest<SystemHealth>('/admin/health');
  }

  /**
   * Get user details by ID
   */
  async getUserById(userId: string): Promise<User> {
    return this.makeRequest<User>(`/admin/users/${userId}`);
  }

  /**
   * Delete a user by ID
   */
  async deleteUser(userId: string): Promise<{ deletedUserId: string }> {
    return this.makeRequest<{ deletedUserId: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<{ userId: string }> {
    return this.makeRequest<{ userId: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  }

  /**
   * Get pending users awaiting approval
   */
  async getPendingUsers(): Promise<User[]> {
    return this.makeRequest<User[]>('/admin/pending-users');
  }

  /**
   * Get rejected users
   */
  async getRejectedUsers(): Promise<User[]> {
    return this.makeRequest<User[]>('/admin/rejected-users');
  }

  /**
   * Approve a user
   */
  async approveUser(userId: string): Promise<{ approvedUserId: string; approvedUser: User }> {
    return this.makeRequest<{ approvedUserId: string; approvedUser: User }>(`/admin/users/${userId}/approve`, {
      method: 'PUT',
    });
  }

  /**
   * Disapprove a user
   */
  async disapproveUser(userId: string): Promise<{ disapprovedUserId: string }> {
    return this.makeRequest<{ disapprovedUserId: string }>(`/admin/users/${userId}/disapprove`, {
      method: 'DELETE',
    });
  }

  /**
   * Revoke a user (move to rejected users)
   */
  async revokeUser(userId: string): Promise<{ revokedUserId: string }> {
    return this.makeRequest<{ revokedUserId: string }>(`/admin/users/${userId}/revoke`, {
      method: 'PUT',
    });
  }

  /**
   * Get user password details (admin only)
   */
  async getUserPasswordDetails(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    authProvider: string;
    hasPassword: boolean;
    passwordText: string;
    passwordHash: string;
    passwordHashLength: number;
    isGoogleOnly: boolean;
    createdAt: string;
    updatedAt: string;
    securityInfo: {
      hashAlgorithm: string;
      saltRounds: string;
      lastPasswordUpdate: string;
    };
  }> {
    return this.makeRequest(`/admin/users/${userId}/password`);
  }
}

export const adminApi = new AdminApiService();
export type { DashboardStats, User, UsersResponse, SystemHealth };
