/**
 * API Client Library
 * 
 * This module provides a comprehensive API client for the Account Ledger Software.
 * It includes authentication, error handling, retry logic, and type-safe API calls.
 * 
 * Features:
 * - Centralized API configuration
 * - Automatic token management
 * - Retry mechanism for failed requests
 * - Type-safe API responses
 * - Health check functionality
 * - Performance monitoring
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { ApiResponse, NewPartyData, NewParty, Party, LedgerEntry, LedgerEntryInput, UserSettings, TrialBalanceEntry } from '../types';

/**
 * API Configuration
 * 
 * Base URL for all API endpoints.
 * Points to the deployed backend server on Render.
 */
const API_BASE_URL = 'https://account-ledger-software-9sys.onrender.com/api';

/**
 * Performance Monitoring
 * 
 * Tracks API call performance for debugging and optimization.
 */
const performanceMonitor = {
  startTime: 0,
  endTime: 0,
  
  start: () => {
    performanceMonitor.startTime = Date.now();
  },
  
  end: (endpoint: string) => {
    performanceMonitor.endTime = Date.now();
    const duration = performanceMonitor.endTime - performanceMonitor.startTime;
    
    // Log performance for slow requests (>5 seconds)
    if (duration > 5000) {
      console.warn(`🐌 Slow API call: ${endpoint} took ${duration}ms`);
    } else if (duration > 2000) {
      console.log(`⏱️ API call: ${endpoint} took ${duration}ms`);
    }
    
    return duration;
  }
};

/**
 * Authentication Token Management
 * 
 * Retrieves the authentication token from browser's localStorage.
 * Used for API requests that require authentication.
 * 
 * @returns {string|null} - JWT token or null if not found
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Retry Mechanism for Failed Requests
 * 
 * Implements exponential backoff retry logic for failed API requests.
 * Handles network errors, timeouts, and temporary server issues.
 * 
 * @param {string} url - API endpoint URL
 * @param {RequestInit} config - Fetch configuration
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} delay - Base delay between retries in milliseconds (default: 2000)
 * @returns {Promise<T>} - API response data
 */
const retryRequest = async <T>(
  url: string, 
  config: RequestInit, 
  maxRetries: number = 3,
  delay: number = 2000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for Render

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        break;
      }
      
      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        continue;
      }
    }
  }
  
  throw lastError!;
};

/**
 * Generic API Call Function
 * 
 * Centralized function for making API calls with authentication,
 * error handling, and retry logic.
 * 
 * @param {string} endpoint - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<ApiResponse<T>>} - API response
 */
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  // Start performance monitoring
  performanceMonitor.start();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };
  
  try {
    const data = await retryRequest<ApiResponse<T>>(url, config);
    
    // End performance monitoring
    const duration = performanceMonitor.end(endpoint);
    
    return data;
  } catch (error: any) {
    // End performance monitoring even on error
    performanceMonitor.end(endpoint);
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    
    throw error;
  }
};

/**
 * Backend Health Check
 * 
 * Checks if the backend server is responding.
 * Used for connection testing and server status monitoring.
 * 
 * @returns {Promise<boolean>} - True if server is healthy
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch('https://account-ledger-software-9sys.onrender.com/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend health check passed:', data);
      return true;
    } else {
      console.error('❌ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Backend health check error:', error);
    return false;
  }
};

/**
 * New Party API Client
 * 
 * Provides type-safe API calls for party management operations.
 * Handles CRUD operations for party entities.
 * 
 * Endpoints:
 * - GET /new-party - Retrieve all parties
 * - GET /new-party/:id - Get specific party
 * - POST /new-party - Create new party
 * - PUT /new-party/:id - Update party
 * - DELETE /new-party/:id - Delete party
 * - GET /new-party/next-sr-no - Get next SR number
 */
export const newPartyAPI = {
  // Get all parties
  getAll: () => apiCall<NewParty[]>('/new-party'),
  
  // Get party by ID
  getById: (id: string) => apiCall<NewParty>(`/new-party/${id}`),
  
  // Create new party
  create: (partyData: NewPartyData) => apiCall<NewParty>('/new-party', {
      method: 'POST',
      body: JSON.stringify(partyData),
  }),
  
  // Update party
  update: (id: string, partyData: Partial<NewPartyData>) => apiCall<NewParty>(`/new-party/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partyData),
  }),

  // Delete party
  delete: (id: string) => apiCall<{ id: string; partyName: string }>(`/new-party/${id}`, {
      method: 'DELETE',
  }),
  
  // Get next SR number
  getNextSrNo: () => apiCall<{ nextSrNo: string }>('/new-party/next-sr-no'),
};

/**
 * Party Ledger API Client
 * 
 * Provides type-safe API calls for ledger management operations.
 * Handles ledger entries, transactions, and Monday Final settlements.
 * 
 * Endpoints:
 * - GET /party-ledger/parties - Get all parties for ledger
 * - GET /party-ledger/:partyName - Get ledger for specific party
 * - POST /party-ledger/entry - Add new ledger entry
 * - PUT /party-ledger/entry/:id - Update ledger entry
 * - DELETE /party-ledger/entry/:id - Delete ledger entry
 * - PUT /party-ledger/monday-final - Process Monday Final settlement
 * - DELETE /party-ledger/parties - Delete multiple parties
 */
export const partyLedgerAPI = {
  // Get all parties for ledger
  getAllParties: () => apiCall<Party[]>('/party-ledger/parties'),
  
  // Get ledger for specific party
  getPartyLedger: (partyName: string) => apiCall<LedgerEntry[]>(`/party-ledger/${encodeURIComponent(partyName)}`),
  
  // Add new ledger entry
  addEntry: (entryData: LedgerEntryInput) => apiCall<LedgerEntry>('/party-ledger/entry', {
    method: 'POST',
    body: JSON.stringify(entryData),
  }),
  
  // Update Monday Final status
  updateMondayFinal: (partyNames: string[]) => apiCall<{ updated: number }>('/party-ledger/monday-final', {
      method: 'PUT',
    body: JSON.stringify({ partyNames }),
  }),

  // Delete multiple parties
  deleteParties: (partyNames: string[]) => apiCall<{ deleted: number }>('/party-ledger/parties', {
      method: 'DELETE',
    body: JSON.stringify({ partyNames }),
  }),
  
  // Update ledger entry
  updateEntry: (id: string, entryData: Partial<LedgerEntry>) => apiCall<LedgerEntry>(`/party-ledger/entry/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entryData),
  }),
  
  // Delete ledger entry
  deleteEntry: (id: string) => apiCall<{ deleted: boolean }>(`/party-ledger/entry/${id}`, {
    method: 'DELETE',
  }),
};

// User Settings API
export const userSettingsAPI = {
  // Get user settings
  get: (userId: string) => apiCall<UserSettings>(`/settings/${userId}`),
  
  // Update user settings
  update: (userId: string, settingsData: Partial<UserSettings>) => apiCall<UserSettings>(`/settings/${userId}`, {
      method: 'PUT',
    body: JSON.stringify(settingsData),
  }),
  
  // Create user settings
  create: (settingsData: UserSettings) => apiCall<UserSettings>('/settings', {
    method: 'POST',
    body: JSON.stringify(settingsData),
  }),
  
  // Delete user settings
  delete: (userId: string) => apiCall<{ deleted: boolean }>(`/settings/${userId}`, {
      method: 'DELETE',
  }),
};

// Final Trial Balance API
export const finalTrialBalanceAPI = {
  // Get final trial balance
  get: () => apiCall<TrialBalanceEntry[]>('/final-trial-balance'),
  
  // Get trial balance for specific party
  getPartyBalance: (partyName: string) => apiCall<TrialBalanceEntry[]>(`/final-trial-balance/party/${encodeURIComponent(partyName)}`),
  
  // Generate trial balance report
  generateReport: (reportData: { startDate: string; endDate: string; partyName?: string }) => apiCall<TrialBalanceEntry[]>('/final-trial-balance/report', {
      method: 'POST',
    body: JSON.stringify(reportData),
  }),
};

// Authentication API
export const authAPI = {
  // Login user
  login: (credentials: { email: string; password: string }) => apiCall<{ token: string; user: any }>('/authentication/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  // Register user
  register: (userData: { fullname: string; email: string; phone: string; password: string }) => apiCall<{ user: any; token: string }>('/authentication/register/user', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  // Get current user profile
  getProfile: () => apiCall<any>('/authentication/profile'),

  // Update user profile
  updateProfile: (userData: Partial<{ fullname: string; email: string; phone: string }>) => apiCall<any>('/authentication/profile', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),

  // Change password
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => apiCall<{ message: string }>('/authentication/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  }),

  // Logout user
  logout: () => apiCall<{ message: string }>('/authentication/logout', {
    method: 'POST',
  }),
};

// Mock data fallback functions
export const mockData = {
  // Mock parties for ledger
  getMockParties: () => [
    { name: '001-AR RTGS', mondayFinal: 'Yes' },
    { name: '01-KANHA RTGS', mondayFinal: 'Yes' },
    { name: '09-KHILADI RTGS', mondayFinal: 'Yes' },
    { name: '11AA RTGS', mondayFinal: 'Yes' },
    { name: '44WIN RTGS', mondayFinal: 'Yes' },
    { name: '626 SHIVAY RT', mondayFinal: 'Yes' },
    { name: '99-VISHAL RTGS', mondayFinal: 'Yes' },
    { name: 'AA RTGS', mondayFinal: 'Yes' },
    { name: 'AADI RTGS', mondayFinal: 'Yes' },
    { name: 'AB BAJRANG RTGS', mondayFinal: 'Yes' },
    { name: 'ABHI RTGS', mondayFinal: 'Yes' },
    { name: 'AED MANISH', mondayFinal: 'Yes' },
    { name: 'AJ RTGS', mondayFinal: 'Yes' },
    { name: 'AKKI RTGS', mondayFinal: 'Yes' },
    { name: 'ANISH RTGS', mondayFinal: 'Yes' },
    { name: 'ANTH RTGS', mondayFinal: 'Yes' },
    { name: 'AQC', mondayFinal: 'No' },
    { name: 'BABA RTGS', mondayFinal: 'Yes' },
    { name: 'BADSHA RTGS', mondayFinal: 'Yes' },
    { name: 'BB RTGS', mondayFinal: 'Yes' },
    { name: 'BERLIN', mondayFinal: 'Yes' },
    { name: 'BG RTGS', mondayFinal: 'Yes' },
    { name: 'BIG B RTGS', mondayFinal: 'Yes' }
  ],

  // Mock ledger entries
  getMockLedgerEntries: () => [
    {
      id: 1,
      date: '27/06/2025',
      remarks: 'Monday Final 27/06/2025',
      tnsType: 'Monday S...',
      credit: 0,
      debit: 0,
      balance: 0,
      chk: false,
      ti: '12'
    },
    {
      id: 2,
      date: '27/06/2025',
      remarks: 'VW-AM RTGS (5455)',
      tnsType: 'CR',
      credit: 100000,
      debit: 0,
      balance: 100000,
      chk: false,
      ti: '3:'
    },
    {
      id: 3,
      date: '27/06/2025',
      remarks: 'COMMISSION',
      tnsType: 'DR',
      credit: 0,
      debit: -3000,
      balance: 97000,
      chk: false,
      ti: '3:'
    },
    {
      id: 4,
      date: '27/06/2025',
      remarks: 'AQC',
      tnsType: 'DR',
      credit: 0,
      debit: -97000,
      balance: 0,
      chk: true,
      ti: '3:'
    }
  ],

  // Mock trial balance data
  getMockTrialBalance: () => [
    // Credit entries
    { id: 'anth', name: 'ANTH RTGS', amount: 237923, type: 'credit' },
    { id: 'commission', name: 'COMMISSION', amount: 43219733, type: 'credit' },
    { id: 'daniel', name: 'DANIEL PAYMENT', amount: 426529, type: 'credit' },
    { id: 'gk', name: 'GK RTGS', amount: 174216, type: 'credit' },
    { id: 'madhu', name: 'MADHU', amount: 1575000, type: 'credit' },
    { id: 'om', name: 'OM SAI RTGS', amount: 194000, type: 'credit' },
    { id: 'pawan', name: 'PAWAN PAYMENT', amount: 1984235, type: 'credit' },
    { id: 'pk', name: 'PK PAYMENT', amount: 229412, type: 'credit' },
    { id: 'r83', name: 'R83 RONY', amount: 48500, type: 'credit' },
    { id: 'raja', name: 'RAJA RTGS', amount: 68774, type: 'credit' },
    { id: 'rolex', name: 'ROLEX RTGS', amount: 392650, type: 'credit' },
    { id: 'shi', name: 'SHI RTGS', amount: 19400, type: 'credit' },
    { id: 'summit', name: 'SUMMIT', amount: 553312, type: 'credit' },
    { id: 'teja', name: 'TEJA RTGS', amount: 1920900, type: 'credit' },
    { id: 'xam', name: 'X AM RTGS', amount: 6537, type: 'credit' },
    { id: 'zextra', name: 'Z EXTRA', amount: 3480312, type: 'credit' },
    
    // Debit entries
    { id: 'aed', name: 'AED MANISH', amount: -271465, type: 'debit' },
    { id: 'aqc', name: 'AQC', amount: -12704412, type: 'debit' },
    { id: 'baba', name: 'BABA RTGS', amount: -194000, type: 'debit' },
    { id: 'dan', name: 'DAN RTGS', amount: -51500, type: 'debit' },
    { id: 'devil', name: 'DEVIL RTGS', amount: -321290, type: 'debit' },
    { id: 'draj', name: 'DRAJ INR', amount: -3110990, type: 'debit' },
    { id: 'dubai', name: 'DUBAI RTGS', amount: -1575315, type: 'debit' },
    { id: 'extra', name: 'EXTRA', amount: -716730, type: 'debit' },
    { id: 'honey', name: 'HONEY RTGS', amount: -1640484, type: 'debit' },
    { id: 'hritik', name: 'HRITIK-J RTGS', amount: -145300, type: 'debit' },
    { id: 'inr', name: 'INR PRASANT', amount: -2515629, type: 'debit' },
    { id: 'kanhaiya', name: 'KANHAIYA', amount: -314229, type: 'debit' },
    { id: 'l164', name: 'L164 RONY', amount: -340468, type: 'debit' },
    { id: 'l328', name: 'L328 RONY RTGS', amount: -173872, type: 'debit' },
    { id: 'l412', name: 'L412 HRITIK', amount: -388000, type: 'debit' },
    { id: 'melvin', name: 'MELVIN', amount: -1395352, type: 'debit' },
    { id: 'mumbai', name: 'MUMBAI', amount: -1606580, type: 'debit' },
    { id: 'qjnr', name: 'Q-JNR MAHESH', amount: -1639587, type: 'debit' },
    { id: 'r239', name: 'R239 JSHIK', amount: -267798, type: 'debit' },
    { id: 'rtgs', name: 'RTGS SSN PRN', amount: -97004, type: 'debit' },
    { id: 'rudra', name: 'RUDRA PAYMENT', amount: -2106189, type: 'debit' },
    { id: 'scanner', name: 'SCANNER', amount: -918704, type: 'debit' },
    { id: 'ss', name: 'SS INFO', amount: -6937615, type: 'debit' },
    { id: 'udaipur', name: 'UDAIPUR RJ', amount: -8707104, type: 'debit' },
    { id: 'vaibhav', name: 'VAIBHAV', amount: -210861, type: 'debit' },
    { id: 'vipul', name: 'VIPUL', amount: -4906763, type: 'debit' },
    { id: 'vishal', name: 'VISHAL INR', amount: -849457, type: 'debit' },
    { id: 'vw', name: 'VW-AM RTGS', amount: -180910, type: 'debit' },
    { id: 'withdrawal', name: 'WITHDRAWAL N', amount: -243825, type: 'debit' }
  ]
}; 