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

  // Final Trial Balance endpoints
  async getFinalTrialBalance(): Promise<any[]> {
    return this.request('/final-trial-balance');
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
}

export const apiClient = new ApiClient(); 