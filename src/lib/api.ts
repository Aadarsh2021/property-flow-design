const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface Party {
  _id?: string;
  srNo?: number;
  partyName: string;
  status: 'active' | 'inactive';
  comiSuite?: string;
  balanceLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSettings {
  _id?: string;
  userId: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id?: string;
  fullname: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  _id?: string;
  partyId: string | Party;
  date: string;
  remarks: string;
  transactionType: 'CR' | 'DR' | 'Monday Final' | 'Commission' | 'Settlement';
  credit: number;
  debit: number;
  balance: number;
  timeIndicator?: string;
  isChecked?: boolean;
  commissionAmount?: number;
  settlementType?: string;
  referenceNumber?: string;
  weekNumber?: number;
  isMondayFinal?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
    
    return response.json();
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<any> {
    return this.request('/authentication/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async registerUser(userData: Partial<User> & { password: string }): Promise<User> {
    return this.request('/authentication/register/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async registerDoctor(doctorData: any): Promise<any> {
    return this.request('/authentication/register/doctor', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  }

  // Party management endpoints
  async createParty(partyData: Partial<Party>): Promise<Party> {
    return this.request('/new-party', {
      method: 'POST',
      body: JSON.stringify(partyData),
    });
  }

  async getAllParties(): Promise<Party[]> {
    return this.request('/new-party');
  }

  async getPartyById(id: string): Promise<Party> {
    return this.request(`/new-party/${id}`);
  }

  async updateParty(id: string, partyData: Partial<Party>): Promise<Party> {
    return this.request(`/new-party/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partyData),
    });
  }

  async deleteParty(id: string): Promise<void> {
    return this.request(`/new-party/${id}`, {
      method: 'DELETE',
    });
  }

  // User settings endpoints
  async getUserSettings(userId: string): Promise<UserSettings> {
    return this.request(`/settings/${userId}`);
  }

  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.request(`/settings/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async deleteUserSettings(userId: string): Promise<void> {
    return this.request(`/settings/${userId}`, {
      method: 'DELETE',
    });
  }



  // Self ID endpoints
  async getAllSelfIds(): Promise<any[]> {
    return this.request('/self-id');
  }

  async createSelfId(data: any): Promise<any> {
    return this.request('/self-id', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Transaction endpoints
  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPartyLedger(partyId: string, params: { limit?: number; skip?: number; startDate?: string; endDate?: string } = {}): Promise<{ party: Party; transactions: Transaction[]; currentBalance: number; totalTransactions: number }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/transactions/party/${partyId}${query ? `?${query}` : ''}`);
  }

  async getTransactionById(id: string): Promise<Transaction> {
    return this.request(`/transactions/${id}`);
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteTransactions(transactionIds: string[]): Promise<{ message: string; deletedCount: number }> {
    return this.request('/transactions/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ transactionIds }),
    });
  }

  async getPartyBalance(partyId: string): Promise<{ partyId: string; partyName: string; currentBalance: number; balanceLimit: number }> {
    return this.request(`/transactions/party/${partyId}/balance`);
  }

  async createMondayFinal(data: { partyId: string; date?: string; remarks?: string }): Promise<any> {
    return this.request('/transactions/monday-final', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async bulkMondayFinal(data: { partyIds: string[]; date?: string; remarks?: string }): Promise<any> {
    return this.request('/transactions/monday-final/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransactionStats(partyId?: string, params: { startDate?: string; endDate?: string } = {}): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/transactions/stats/${partyId || ''}${query ? `?${query}` : ''}`);
  }

  async searchTransactions(params: { partyId?: string; searchTerm?: string; transactionType?: string; startDate?: string; endDate?: string; limit?: number; skip?: number }): Promise<{ transactions: Transaction[]; total: number; hasMore: boolean }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/transactions/search${query ? `?${query}` : ''}`);
  }

  // Final Trial Balance endpoints
  async getFinalTrialBalances(params: { date?: string; type?: string; partyId?: string; limit?: number; skip?: number; startDate?: string; endDate?: string } = {}): Promise<{ entries: any[]; total: number; hasMore: boolean }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/final-trial-balance${query ? `?${query}` : ''}`);
  }

  async createFinalTrialBalance(data: any): Promise<any> {
    return this.request('/final-trial-balance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFinalTrialBalance(id: string, data: any): Promise<any> {
    return this.request(`/final-trial-balance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFinalTrialBalance(id: string): Promise<void> {
    return this.request(`/final-trial-balance/${id}`, {
      method: 'DELETE',
    });
  }

  async calculateTrialBalance(date?: string): Promise<any> {
    const query = date ? `?date=${date}` : '';
    return this.request(`/final-trial-balance/calculate${query}`);
  }

  async generateTrialBalance(data: { date?: string; includeCommission?: boolean }): Promise<any> {
    return this.request('/final-trial-balance/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTrialBalanceSummary(params: { startDate?: string; endDate?: string } = {}): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/final-trial-balance/summary${query ? `?${query}` : ''}`);
  }

  async bulkDeleteTrialBalance(entryIds: string[]): Promise<{ message: string; deletedCount: number }> {
    return this.request('/final-trial-balance/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ entryIds }),
    });
  }

  // Commission endpoints
  async calculateCommission(data: { partyId: string; amount: number; transactionType?: string }): Promise<any> {
    return this.request('/commission/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async calculateBulkCommission(transactions: any[]): Promise<any> {
    return this.request('/commission/calculate-bulk', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
  }

  async getPartyCommission(partyId: string, params: { startDate?: string; endDate?: string } = {}): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/commission/party/${partyId}${query ? `?${query}` : ''}`);
  }

  async getOverallCommission(params: { startDate?: string; endDate?: string } = {}): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/commission/overall${query ? `?${query}` : ''}`);
  }

  async getCommissionReport(params: { startDate?: string; endDate?: string; partyId?: string; format?: string } = {}): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/commission/report${query ? `?${query}` : ''}`);
  }

  async getCommissionStats(period: string = 'month'): Promise<any> {
    return this.request(`/commission/stats?period=${period}`);
  }

  async settleCommission(partyId: string, data: { settlementAmount: number; settlementType?: string }): Promise<any> {
    return this.request(`/commission/settle/${partyId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(); 