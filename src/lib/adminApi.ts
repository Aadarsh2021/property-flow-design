/**
 * Admin API Service
 * 
 * Handles all admin-related API calls to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software-quag8azl0-aadarsh2021s-projects.vercel.app/api';

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
  role?: string;
  status?: string;
  is_approved?: boolean;
  auth_provider?: string;
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
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
   * Create a new user
   */
  async createUser(userData: {
    name: string;
    email: string;
    phone?: string;
    city?: string;
    state?: string;
    role?: string;
    password: string;
  }): Promise<User> {
    return this.makeRequest<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, userData: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    role?: string;
    status?: string;
  }): Promise<User> {
    return this.makeRequest<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Toggle user status
   */
  async toggleUserStatus(userId: string): Promise<User> {
    return this.makeRequest<User>(`/admin/users/${userId}/toggle-status`, {
      method: 'PUT',
    });
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string): Promise<User> {
    return this.makeRequest<User>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, limit?: number): Promise<any[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.makeRequest<any[]>(`/admin/users/${userId}/activity${params}`);
  }

  /**
   * Bulk user actions
   */
  async bulkUserActions(action: string, userIds: string[], data?: any): Promise<{
    results: Array<{ userId: string; status: string; error?: string }>;
    totalProcessed: number;
  }> {
    return this.makeRequest<{
      results: Array<{ userId: string; status: string; error?: string }>;
      totalProcessed: number;
    }>('/admin/users/bulk-actions', {
      method: 'POST',
      body: JSON.stringify({ action, userIds, data }),
    });
  }

  /**
   * Export users data
   */
  async exportUsers(format: 'json' | 'csv' = 'json'): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/export?format=${format}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }

    if (format === 'csv') {
      return response.text();
    } else {
      return response.json();
    }
  }
}

export const adminApi = new AdminApiService();
export type { DashboardStats, User, UsersResponse, SystemHealth };
