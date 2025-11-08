/**
 * API Client - Account Ledger Software
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import { ApiResponse, NewPartyData, NewParty, Party, LedgerEntry, LedgerEntryInput, UserSettings, TrialBalanceEntry, GoogleUserData, GoogleAuthResponse } from '../types';
import { cachedApiCall } from './apiCache';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '5000'); // Increased to 8s for backend stability
const API_RETRY_ATTEMPTS = parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '2'); // Increased to 3 for better reliability
const API_RETRY_DELAY = parseInt(import.meta.env.VITE_API_RETRY_DELAY || '500'); // Increased to 1s for stability

// Ultra-aggressive connection pooling
const activeRequests = new Set<string>();
const MAX_CONCURRENT_REQUESTS = 3; // Reduced from 3 to 2
const requestQueue = new Map<string, Promise<any>>();
const requestDeduplication = new Map<string, Promise<any>>(); // Prevent duplicate requests

// Validate API configuration
if (!API_BASE_URL) {
  console.error('API_BASE_URL is not configured. Please set VITE_API_BASE_URL environment variable.');
}

console.log('🔧 API Configuration:', {
  baseUrl: API_BASE_URL,
  timeout: API_TIMEOUT,
  retryAttempts: API_RETRY_ATTEMPTS,
  retryDelay: API_RETRY_DELAY
});

// Request throttling
const REQUEST_THROTTLE_MS = 50; // 100ms between requests

const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Throttle function to limit request frequency
const throttle = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: any[]) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// Enhanced API call with retry mechanism and better error handling
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  // Create a unique key for this request
  const requestKey = `${endpoint}-${JSON.stringify(options)}`;
  
  // ULTRA-AGGRESSIVE DEDUPLICATION: Check if identical request is already in progress
  if (requestDeduplication.has(requestKey)) {
    console.log('⚡ [DEDUP] Reusing identical request:', requestKey);
    return requestDeduplication.get(requestKey);
  }
  
  // Check if this exact request is already in progress
  if (requestQueue.has(requestKey)) {
    return requestQueue.get(requestKey);
  }
  
  // Check if we have too many concurrent requests
  if (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
    console.log('⏳ Waiting for available request slot...');
    await new Promise(resolve => {
      const checkSlot = () => {
        if (activeRequests.size < MAX_CONCURRENT_REQUESTS) {
          resolve(undefined);
        } else {
          setTimeout(checkSlot, 50);
        }
      };
      checkSlot();
    });
  }
  
  // Create the request promise with retry mechanism
  const requestPromise = (async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= API_RETRY_ATTEMPTS; attempt++) {
      try {
        activeRequests.add(requestKey);
        
        // Add small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, REQUEST_THROTTLE_MS));
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, API_TIMEOUT);
        
        const config: RequestInit = {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
          },
          signal: controller.signal,
          ...options,
        };
        
        console.log(`🚀 API Request (Attempt ${attempt}/${API_RETRY_ATTEMPTS}):`, {
          method: options.method || 'GET',
          url,
          requestId: config.headers?.['X-Request-ID']
        });
        
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // For 400 status codes, return the error data instead of throwing
          // This allows the calling code to handle business logic errors properly
          if (response.status === 400) {
            console.log('⚠️ Business logic error (400):', errorData);
            return errorData;
          }
          
          // For 401, clear token and redirect to login
          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            throw new Error('Authentication failed. Please login again.');
          }
          
          // For 403, check if user is revoked or pending approval
          if (response.status === 403) {
            console.log('🔍 403 Error Response:', errorData);
            // Check if this is a revoked user response
            if (errorData && errorData.isRevoked) {
              console.log('🚫 User is revoked, clearing auth and redirecting');
              // User is revoked, clear auth and redirect to login
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
              throw new Error('Your account has been revoked by the admin. Please contact support for assistance.');
            }
            // Check if this is a pending approval response
            if (errorData && errorData.requiresApproval) {
              console.log('⏳ User is pending approval');
              throw new Error('Your account is pending admin approval. Please wait for approval before logging in.');
            }
            console.log('❌ 403 Error - Access denied');
            throw new Error('Access denied. You do not have permission to perform this action.');
          }
          
          // For 429, implement exponential backoff
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
            const delay = retryAfter * 1000 * Math.pow(2, attempt - 1);
            console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // For 5xx errors, retry
          if (response.status >= 500 && attempt < API_RETRY_ATTEMPTS) {
            lastError = new Error(`Server error ${response.status}: ${errorData.message || response.statusText}`);
            await new Promise(resolve => setTimeout(resolve, API_RETRY_DELAY));
            continue;
          }
          
          // For 404 errors, don't throw - return success response for graceful handling
          if (response.status === 404) {
            console.log(`⚠️ 404 Not Found - treating as successful deletion:`, config.url);
            return {
              success: true,
              message: 'Entry not found - already deleted',
              deleted: true,
              deletedCount: 0,
              relatedDeletedCount: 0,
              relatedParties: []
            };
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log(`✅ API Success (Attempt ${attempt}):`, {
          status: response.status,
          dataSize: JSON.stringify(responseData).length,
          requestId: config.headers?.['X-Request-ID']
        });
        
        return responseData;
        
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          console.log(`⏰ Request timed out after ${API_TIMEOUT/1000} seconds (Attempt ${attempt})`);
          if (attempt < API_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, API_RETRY_DELAY));
            continue;
          }
          throw new Error(`Request timed out after ${API_TIMEOUT/1000} seconds`);
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.log(`🌐 Network error (Attempt ${attempt}):`, error.message);
          if (attempt < API_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, API_RETRY_DELAY));
            continue;
          }
          throw new Error('Network error. Please check your connection and try again.');
        }
        
        // For non-retryable errors, throw immediately
        if (error.message.includes('Authentication failed') || 
            error.message.includes('Access denied') ||
            error.message.includes('HTTP 400')) {
          throw error;
        }
        
        // For other errors, retry if attempts remain with exponential backoff
        if (attempt < API_RETRY_ATTEMPTS) {
          const backoffDelay = API_RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        throw error;
        
      } finally {
        activeRequests.delete(requestKey);
        if (requestQueue.has(requestKey)) {
          requestQueue.delete(requestKey);
        }
      }
    }
    
    // If we get here, all retry attempts failed
    throw lastError || new Error('All retry attempts failed');
  })();
  
  // Store the request in both queues for deduplication
  requestQueue.set(requestKey, requestPromise);
  requestDeduplication.set(requestKey, requestPromise);
  
  return requestPromise;
};

// Enhanced health monitoring with detailed status
export const checkBackendHealth = async (): Promise<{
  isHealthy: boolean;
  responseTime: number;
  status: string;
  details?: any;
}> => {
  const startTime = performance.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = performance.now() - startTime;
    
    if (response.ok) {
      const healthData = await response.json().catch(() => ({}));
      return {
        isHealthy: true,
        responseTime: Math.round(responseTime),
        status: 'healthy',
        details: healthData
      };
    } else {
      return {
        isHealthy: false,
        responseTime: Math.round(responseTime),
        status: `unhealthy_${response.status}`,
        details: { status: response.status, statusText: response.statusText }
      };
    }
  } catch (error: any) {
    const responseTime = performance.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        isHealthy: false,
        responseTime: Math.round(responseTime),
        status: 'timeout',
        details: { error: 'Health check timed out' }
      };
    }
    
    return {
      isHealthy: false,
      responseTime: Math.round(responseTime),
      status: 'error',
      details: { error: error.message }
    };
  }
};

// API fallback mechanism
export const withFallback = async <T>(
  primaryCall: () => Promise<T>,
  fallbackCall: () => Promise<T>,
  fallbackCondition?: (error: any) => boolean
): Promise<T> => {
  try {
    return await primaryCall();
  } catch (error) {
    console.warn('🔄 Primary API call failed, trying fallback...', error);
    
    // Check if we should use fallback
    if (fallbackCondition && !fallbackCondition(error)) {
      throw error;
    }
    
    try {
      return await fallbackCall();
    } catch (fallbackError) {
      console.error('❌ Both primary and fallback API calls failed');
      throw fallbackError;
    }
  }
};

// API rate limiting detection and handling
export const isRateLimited = (error: any): boolean => {
  return error.message?.includes('429') || 
         error.message?.includes('rate limit') ||
         error.message?.includes('too many requests');
};

// API connection status monitoring
let isOnline = navigator.onLine;
let lastHealthCheck = 0;
let healthCheckInterval: NodeJS.Timeout | null = null;

// Monitor online/offline status
window.addEventListener('online', () => {
  isOnline = true;
  console.log('🌐 Network connection restored');
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('🌐 Network connection lost');
});

// Periodic health checks
export const startHealthMonitoring = (intervalMs: number = 30000) => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  healthCheckInterval = setInterval(async () => {
    const health = await checkBackendHealth();
    console.log('💓 API Health Check:', health);
    
    if (!health.isHealthy) {
      console.warn('⚠️ API is not healthy:', health);
    }
  }, intervalMs);
};

export const stopHealthMonitoring = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
};

export const newPartyAPI = {
  getAll: () => apiCall<NewParty[]>('/new-party'),
  getById: (id: string) => apiCall<NewParty>(`/new-party/${id}`),
  create: (partyData: NewPartyData) => apiCall<NewParty>('/new-party', {
    method: 'POST',
    body: JSON.stringify(partyData),
  }),
  update: (id: string, partyData: Partial<NewPartyData>) => apiCall<NewParty>(`/new-party/${id}`, {
    method: 'PUT',
    body: JSON.stringify(partyData),
  }),
  delete: (id: string) => apiCall<{ id: string; partyName: string }>(`/new-party/${id}`, {
    method: 'DELETE',
  }),
  getNextSrNo: () => apiCall<{ nextSrNo: string }>('/new-party/next-sr-no'),
};

export const partyLedgerAPI = {
  getAllParties: (forceRefresh = false) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    
    // Add cache-busting parameter if force refresh is requested
    const cacheKey = forceRefresh ? `all-parties-${userId}-${Date.now()}` : `all-parties-${userId}`;
    
    return cachedApiCall(
      cacheKey,
      () => apiCall<Party[]>('/parties'),
      forceRefresh ? 0 : 5 * 60 * 1000 // No cache if force refresh, otherwise 5 minutes for better performance
    );
  },
  getPartyLedger: (partyName: string, queryParams?: Record<string, any>) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    
    // Check if we have query parameters that indicate force refresh
    const isForceRefresh = queryParams && (queryParams._force || queryParams._fresh);
    const cleanPartyName = partyName;
    
    if (isForceRefresh) {
      // Force refresh - bypass cache completely
      
      // Build URL with query parameters
      let url = `/party-ledger/${encodeURIComponent(cleanPartyName)}`;
      if (queryParams) {
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        if (searchParams.toString()) {
          url += `?${searchParams.toString()}`;
        }
      }
      
      return apiCall<LedgerEntry[]>(url);
    } else {
      // Use optimized cache strategy based on party type
      const cacheKey = `party-ledger-${userId}-${cleanPartyName}`;
      
      // Different cache times based on party type
      let cacheTime = 60 * 1000; // Default 1 minute
      
      // Commission and company parties change more frequently
      if (cleanPartyName.toLowerCase().includes('commission') || 
          cleanPartyName.toLowerCase().includes('company') ||
          cleanPartyName.toLowerCase().includes('give')) {
        cacheTime = 30 * 1000; // 30 seconds for system parties
      }
      
      return cachedApiCall(
        cacheKey,
        () => {
          
          // Build URL with query parameters if provided
          let url = `/party-ledger/${encodeURIComponent(cleanPartyName)}`;
          if (queryParams) {
            const searchParams = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
              }
            });
            if (searchParams.toString()) {
              url += `?${searchParams.toString()}`;
            }
          }
          
          return apiCall<LedgerEntry[]>(url);
        },
        cacheTime
      );
    }
  },
  addEntry: (entryData: LedgerEntryInput) => apiCall<LedgerEntry>('/party-ledger/entry', {
    method: 'POST',
    body: JSON.stringify(entryData),
  }),
  updateEntry: (id: string, entryData: Partial<LedgerEntryInput>) => apiCall<LedgerEntry>(`/party-ledger/entry/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entryData),
  }),
  deleteEntry: (id: string) => apiCall<{ 
    message: string;
    deleted: boolean;
    deletedCount: number;
    relatedDeletedCount: number;
    relatedParties: string[];
  }>(`/party-ledger/entry/${id}`, {
    method: 'DELETE',
  }),
  deleteParties: (partyNames: string[]) => apiCall<{ deleted: number }>('/parties', {
    method: 'DELETE',
    body: JSON.stringify({ partyNames }),
  }),
  deleteMondayFinalEntry: (entryId: string) => apiCall<{ 
    deletedEntryId: string; 
    unsettledTransactions: number; 
    partyName: string; 
    settlementDate: string; 
  }>(`/party-ledger/monday-final/${entryId}`, {
    method: 'DELETE',
  }),
  updateMondayFinal: (partyNames: string[]) => apiCall<{
    updatedCount: number;
    settledEntries: number;
    updatedParties: string[];
    settlementDetails: Array<{
      partyName: string;
      status: string;
      settlementDate: string;
    }>;
  }>(`/party-ledger/update-monday-final`, {
    method: 'POST',
    body: JSON.stringify({ partyNames }),
  }),
  unsettleTransactions: (partyName: string, settlementDate: string) => apiCall<{ unsettledCount: number }>(`/party-ledger/unsettle-transactions`, {
    method: 'POST',
    body: JSON.stringify({ partyName, settlementDate })
  }),
};

export const accountLedgerAPI = {
  getPageData: (
    partyName?: string,
    options?: {
      forceRefresh?: boolean;
      params?: Record<string, string | number | boolean | undefined>;
      signal?: AbortSignal;
    }
  ) => {
    const searchParams = new URLSearchParams();
    if (partyName) {
      searchParams.append('partyName', partyName);
    }
    if (options?.forceRefresh) {
      searchParams.append('_force', 'true');
    }
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const endpoint = searchParams.toString()
      ? `/account-ledger/page-data?${searchParams.toString()}`
      : `/account-ledger/page-data`;

    const requestOptions: RequestInit = {};
    if (options?.signal) {
      requestOptions.signal = options.signal;
    }

    return apiCall<{
      success: boolean;
      message?: string;
      data?: {
        parties?: any[];
        userSettings?: any;
        stats?: any;
        ledgerData?: any;
        selectedPartyName?: string;
        performance?: any;
      };
    }>(endpoint, requestOptions);
  }
};

export const userSettingsAPI = {
  getSettings: (userId: string) => apiCall<UserSettings>(`/settings/${userId}`),
  updateSettings: (userId: string, settings: Partial<UserSettings>) => apiCall<UserSettings>(`/settings/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};

export const finalTrialBalanceAPI = {
  getAll: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    return cachedApiCall(
      `trial-balance-${userId}`,
      () => apiCall<{
        trialBalance: Array<{
          partyName: string;
          totalCredit: number;
          totalDebit: number;
          balance: number;
          transactionCount: number;
          lastTransactionDate: string;
          status: string;
        }>;
        summary: {
          totalParties: number;
          totalCredit: number;
          totalDebit: number;
          totalTransactions: number;
          netBalance: number;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        performance: {
          totalTime: number;
          queryTime: number;
          cacheHit: boolean;
        };
      }>('/final-trial-balance', {
        method: 'GET',
      }),
      5 * 60 * 1000 // 5 minutes cache - trial balance is expensive to calculate
    );
  },
  forceRefresh: () => {
    return apiCall<{
      trialBalance: Array<{
        partyName: string;
        totalCredit: number;
        totalDebit: number;
        balance: number;
        transactionCount: number;
        lastTransactionDate: string;
        status: string;
      }>;
      summary: {
        totalParties: number;
        totalCredit: number;
        totalDebit: number;
        totalTransactions: number;
        netBalance: number;
      };
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      performance: {
        totalTime: number;
        queryTime: number;
        cacheHit: boolean;
      };
    }>('/final-trial-balance/refresh', {
      method: 'GET',
    });
  },
  // Get balance for a specific party
  getPartyBalance: (partyName: string) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    const cacheKey = `party-balance-${userId}-${partyName}`;
    
    return cachedApiCall(
      cacheKey,
      () => {
        return apiCall<{
          partyName: string;
          balance: number;
          creditTotal: number;
          debitTotal: number;
        }>(`/final-trial-balance/party/${encodeURIComponent(partyName)}`, {
          method: 'GET',
        });
      },
      2 * 60 * 1000 // 2 minutes cache - party balances change moderately
    );
  },
  // Optimized batch API for getting multiple party balances at once
  getBatchBalances: (partyNames: string[]) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    
    // Sort party names for consistent cache keys
    const sortedPartyNames = [...partyNames].sort();
    const cacheKey = `batch-balances-${userId}-${sortedPartyNames.join(',')}`;
    
    return cachedApiCall(
      cacheKey,
      () => {
        return apiCall<any[]>('/final-trial-balance/batch-balances', {
          method: 'POST',
          body: JSON.stringify({ partyNames: sortedPartyNames }),
        });
      },
      3 * 60 * 1000 // 3 minutes cache - batch operations are expensive
    );
  },
  generateReport: (reportData: { startDate: string; endDate: string; partyName?: string }) => {
    console.log('📋 Generating trial balance report:', reportData);
    return apiCall<TrialBalanceEntry[]>('/final-trial-balance', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },
};

export const authAPI = {
  login: (credentials: { email: string; password: string }) => apiCall<{ token: string; user: any }>('/authentication/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  googleLogin: (userData: GoogleUserData) => apiCall<GoogleAuthResponse>('/authentication/google-login', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  register: (userData: { fullname: string; email: string; phone: string; password: string; googleId?: string; profilePicture?: string }) => apiCall<{ user: any; token: string }>('/authentication/register/user', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  getProfile: () => apiCall<any>('/authentication/profile'),
  updateProfile: (userData: Partial<{ fullname: string; email: string; phone: string; address: string; city: string; state: string; pincode: string; profilePicture: string }>) => apiCall<any>('/authentication/profile', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => apiCall<{ message: string }>('/authentication/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  }),
  setupPassword: (passwordData: { password: string }) => apiCall<{ message: string }>('/authentication/setup-password', {
    method: 'POST',
    body: JSON.stringify(passwordData),
  }),
  deleteAccount: () => apiCall<{ message: string }>('/authentication/account', {
    method: 'DELETE',
  }),
  logout: () => apiCall<{ message: string }>('/authentication/logout', {
    method: 'POST',
  }),
  forgotPassword: (email: string) => apiCall<{ message: string }>('/authentication/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  resetPassword: (token: string, newPassword: string) => apiCall<{ message: string }>('/authentication/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  }),
  syncPassword: (email: string, newPassword: string) => apiCall<{ message: string }>('/authentication/sync-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  }),
};

export const dashboardAPI = {
  getStats: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    return cachedApiCall(
      `dashboard-stats-${userId}`,
      () => {
        return apiCall<any>('/dashboard/stats');
      },
      3 * 60 * 1000 // 3 minutes cache - stats change moderately
    );
  },
  getSummary: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    return cachedApiCall(
      `dashboard-summary-${userId}`,
      () => {
        console.log('📈 Fetching dashboard summary...');
        return apiCall<any>('/dashboard/summary');
      },
      3 * 60 * 1000 // 3 minutes cache - summary is calculated data
    );
  },
  // New: Get comprehensive dashboard data in one call
  getAllDashboardData: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    return cachedApiCall(
      `dashboard-all-${userId}`,
      () => {
        return apiCall<{
          stats: any;
          summary: any;
          recentActivity?: any[];
          health?: any;
        }>('/dashboard/all');
      },
      2 * 60 * 1000 // 2 minutes cache - comprehensive data
    );
  },
};

export const commissionTransactionAPI = {
  getAll: () => apiCall<any[]>('/commission-transactions'),
  getById: (id: string) => apiCall<any>(`/commission-transactions/${id}`),
  create: (data: any) => apiCall<any>('/commission-transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall<any>(`/commission-transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall<{ message: string }>(`/commission-transactions/${id}`, {
    method: 'DELETE',
  }),
};

// Add unsettleTransactions method