/**
 * Admin API Service
 * 
 * Handles all admin-related API calls to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://account-ledger-software.vercel.app/api';

interface DashboardStats {
  totalUsers: number;
  totalParties: number;
  totalTransactions: number;
  totalRevenue: number;
  activeUsers: number;
  pendingTransactions: number;
}

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  details: string;
  user: string;
  userEmail: string;
  timestamp: string;
  status: 'success' | 'error' | 'info' | 'warning';
}

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
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
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

    return data.data;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return this.makeRequest<DashboardStats>('/admin/stats');
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
    return this.makeRequest<ActivityItem[]>(`/admin/activity?limit=${limit}`);
  }

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
}

export const adminApi = new AdminApiService();
export type { DashboardStats, ActivityItem, User, UsersResponse, SystemHealth };
