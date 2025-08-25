/**
 * 🚀 Lightweight API Client - Account Ledger Software
 * 
 * Optimized for performance and minimal bundle size
 * Uses native fetch() API with smart error handling
 * 
 * @author Account Ledger Team
 * @version 2.0.0 - Lightweight Edition
 */

import { ApiResponse, NewPartyData, NewParty, Party, LedgerEntry, LedgerEntryInput, UserSettings, TrialBalanceEntry, GoogleUserData, GoogleAuthResponse } from '../types';

/**
 * 🌐 API Configuration
 * 
 * Smart environment detection for optimal performance
 * Development: localhost:5000
 * Production: Render deployment
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://account-ledger-software-9sys.onrender.com/api');

/**
 * 🔐 Lightweight Authentication
 * 
 * Minimal token management with localStorage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * 🚀 Ultra-Light API Call Function
 * 
 * Optimized for speed and minimal overhead
 * No complex retry logic - just fast, reliable requests
 */
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    // Smart error handling without heavy logging
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};

/**
 * 🏥 Health Check - Minimal Version
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://account-ledger-software-9sys.onrender.com/health');
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * 👥 New Party API - Lightweight
 */
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

/**
 * 📊 Party Ledger API - Lightweight
 */
export const partyLedgerAPI = {
  getAllParties: () => apiCall<Party[]>('/party-ledger/parties'),
  getPartyLedger: (partyName: string) => apiCall<LedgerEntry[]>(`/party-ledger/${encodeURIComponent(partyName)}`),
  addEntry: (entryData: LedgerEntryInput) => apiCall<LedgerEntry>('/party-ledger/entry', {
    method: 'POST',
    body: JSON.stringify(entryData),
  }),
  updateEntry: (id: string, entryData: Partial<LedgerEntryInput>) => apiCall<LedgerEntry>(`/party-ledger/entry/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entryData),
  }),
  deleteEntry: (id: string) => apiCall<{ message: string }>(`/party-ledger/entry/${id}`, {
    method: 'DELETE',
  }),
  deleteParties: (partyNames: string[]) => apiCall<{ deleted: number }>('/party-ledger/parties', {
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

/**
 * ⚙️ User Settings API - Lightweight
 */
export const userSettingsAPI = {
  getSettings: (userId: string) => apiCall<UserSettings>(`/user-settings/${userId}`),
  updateSettings: (userId: string, settings: Partial<UserSettings>) => apiCall<UserSettings>(`/user-settings/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};

/**
 * 📈 Final Trial Balance API - Lightweight
 */
export const finalTrialBalanceAPI = {
  generateReport: (reportData: { startDate: string; endDate: string; partyName?: string }) => apiCall<TrialBalanceEntry[]>('/final-trial-balance', {
    method: 'POST',
    body: JSON.stringify(reportData),
  }),
};

/**
 * 🔐 Authentication API - Lightweight
 */
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
  updateProfile: (userData: Partial<{ fullname: string; email: string; phone: string }>) => apiCall<any>('/authentication/profile', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => apiCall<{ message: string }>('/authentication/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  }),
  logout: () => apiCall<{ message: string }>('/authentication/logout', {
    method: 'POST',
  }),
};

/**
 * 📊 Dashboard API - Lightweight
 */
export const dashboardAPI = {
  getStats: () => apiCall<any>('/dashboard/stats'),
  getRecentActivity: () => apiCall<any>('/dashboard/recent-activity'),
  getSummary: () => apiCall<any>('/dashboard/summary'),
};

/**
 * 💰 Commission Transaction API - Lightweight
 */
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