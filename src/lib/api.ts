/**
 * API Client - Account Ledger Software
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import { ApiResponse, NewPartyData, NewParty, Party, LedgerEntry, LedgerEntryInput, UserSettings, TrialBalanceEntry, GoogleUserData, GoogleAuthResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://account-ledger-software-oul4r93vr-aadarsh2021s-projects.vercel.app/api');

const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

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
      console.error('❌ HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        url,
        errorData
      });
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    return responseData;
  } catch (error: any) {
    console.error('💥 API Call Error:', {
      name: error.name,
      message: error.message,
      endpoint,
      url,
      stack: error.stack
    });
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
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
  getAllParties: () => apiCall<Party[]>('/parties'),
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
  getStats: () => apiCall<any>('/dashboard/stats'),
  getRecentActivity: () => apiCall<any>('/dashboard/recent-activity'),
  getSummary: () => apiCall<any>('/dashboard/summary'),
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