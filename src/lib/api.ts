/**
 * API Client - Account Ledger Software
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import { ApiResponse, NewPartyData, NewParty, Party, LedgerEntry, LedgerEntryInput, UserSettings, TrialBalanceEntry, GoogleUserData, GoogleAuthResponse } from '../types';
import { apiCall, cachedApiCall } from './apiCache';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api';

// Request queue to prevent concurrent API calls
const requestQueue = new Map<string, Promise<any>>();
const activeRequests = new Set<string>();
const MAX_CONCURRENT_REQUESTS = 3;
const REQUEST_THROTTLE_MS = 100; // 100ms between requests

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

const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  // Create a unique key for this request
  const requestKey = `${endpoint}-${JSON.stringify(options)}`;
  
  // Check if this exact request is already in progress
  if (requestQueue.has(requestKey)) {
    return requestQueue.get(requestKey);
  }
  
  // Check if we have too many concurrent requests
  if (activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
    // Wait for a slot to become available
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
  
  // Add timeout for better performance
  const timeoutMs = 15000; // Increased to 15 seconds for better reliability
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    signal: controller.signal,
    ...options,
  };
  
  // Create the request promise
  const requestPromise = (async () => {
    try {
      activeRequests.add(requestKey);
      
      // Add small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, REQUEST_THROTTLE_MS));
      
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs/1000} seconds`);
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    } finally {
      activeRequests.delete(requestKey);
      requestQueue.delete(requestKey);
    }
  })();
  
  // Store the request in the queue
  requestQueue.set(requestKey, requestPromise);
  
  return requestPromise;
};

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://account-ledger-software.vercel.app/health');
    return response.ok;
  } catch {
    return false;
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
  getAllParties: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    return cachedApiCall(
      `all-parties-${userId}`,
      () => apiCall<Party[]>('/parties'),
      10 * 60 * 1000 // 10 minutes cache
    );
  },
  getPartyLedger: (partyName: string) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    
    // Check if partyName contains cache busting parameter
    const isForceRefresh = partyName.includes('&_t=');
    const cleanPartyName = partyName.split('&_t=')[0];
    
    
    if (isForceRefresh) {
      // Force refresh - bypass cache completely
      return apiCall<LedgerEntry[]>(`/party-ledger/${encodeURIComponent(cleanPartyName)}`);
    } else {
      // Use longer cache for better resource management
      const cacheKey = `party-ledger-${userId}-${cleanPartyName}`;
      const cacheTime = 30 * 1000; // Increased to 30 seconds cache to reduce API calls
      
      return cachedApiCall(
        cacheKey,
        () => {
          return apiCall<LedgerEntry[]>(`/party-ledger/${encodeURIComponent(cleanPartyName)}`);
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
  }>('/party-ledger/update-monday-final', {
    method: 'POST',
    body: JSON.stringify({ partyNames }),
  }),
};

export const userSettingsAPI = {
  getSettings: (userId: string) => apiCall<UserSettings>(`/settings/${userId}`),
  updateSettings: (userId: string, settings: Partial<UserSettings>) => apiCall<UserSettings>(`/settings/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};

export const finalTrialBalanceAPI = {
  getAll: () => apiCall<{
    parties: Array<{
      name: string;
      creditTotal: number;
      debitTotal: number;
      balance: number;
    }>;
    totals: {
      totalCredit: number;
      totalDebit: number;
      totalBalance: number;
    };
  }>('/final-trial-balance', {
    method: 'GET',
  }),
  forceRefresh: () => apiCall<{
    parties: Array<{
      name: string;
      creditTotal: number;
      debitTotal: number;
      balance: number;
    }>;
    totals: {
      totalCredit: number;
      totalDebit: number;
      totalBalance: number;
    };
  }>('/final-trial-balance/refresh', {
    method: 'GET',
  }),
  // NEW: Batch API for getting multiple party balances at once
  getBatchBalances: (partyNames: string[]) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    return cachedApiCall(
      `batch-balances-${userId}-${partyNames.join(',')}`,
      () => apiCall<any[]>('/final-trial-balance/batch-balances', {
        method: 'POST',
        body: JSON.stringify({ partyNames }),
      }),
      2 * 60 * 1000 // 2 minutes cache
    );
  },
  generateReport: (reportData: { startDate: string; endDate: string; partyName?: string }) => apiCall<TrialBalanceEntry[]>('/final-trial-balance', {
    method: 'POST',
    body: JSON.stringify(reportData),
  }),
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
  updateProfile: (userData: Partial<{ fullname: string; email: string; phone: string; address: string; city: string; state: string; pincode: string }>) => apiCall<any>('/authentication/profile', {
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
      () => apiCall<any>('/dashboard/stats'),
      2 * 60 * 1000 // 2 minutes cache
    );
  },
  getSummary: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || 'anonymous';
    return cachedApiCall(
      `dashboard-summary-${userId}`,
      () => apiCall<any>('/dashboard/summary'),
      2 * 60 * 1000 // 2 minutes cache
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