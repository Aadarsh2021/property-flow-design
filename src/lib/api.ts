const API_BASE_URL = 'http://localhost:5000/api';

// Generic API helper
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// New Party API
export const newPartyAPI = {
  // Get all parties
  getAll: () => apiCall('/new-party'),
  
  // Get party by ID
  getById: (id: string) => apiCall(`/new-party/${id}`),
  
  // Create new party
  create: (partyData: any) => apiCall('/new-party', {
      method: 'POST',
      body: JSON.stringify(partyData),
  }),
  
  // Update party
  update: (id: string, partyData: any) => apiCall(`/new-party/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partyData),
  }),

  // Delete party
  delete: (id: string) => apiCall(`/new-party/${id}`, {
      method: 'DELETE',
  }),
  
  // Get next SR number
  getNextSrNo: () => apiCall('/new-party/next-sr-no'),
};

// Party Ledger API
export const partyLedgerAPI = {
  // Get all parties for ledger
  getAllParties: () => apiCall('/party-ledger/parties'),
  
  // Get ledger for specific party
  getPartyLedger: (partyName: string) => apiCall(`/party-ledger/${encodeURIComponent(partyName)}`),
  
  // Add new ledger entry
  addEntry: (entryData: any) => apiCall('/party-ledger/entry', {
    method: 'POST',
    body: JSON.stringify(entryData),
  }),
  
  // Update Monday Final status
  updateMondayFinal: (partyNames: string[]) => apiCall('/party-ledger/monday-final', {
      method: 'PUT',
    body: JSON.stringify({ partyNames }),
  }),

  // Delete multiple parties
  deleteParties: (partyNames: string[]) => apiCall('/party-ledger/parties', {
      method: 'DELETE',
    body: JSON.stringify({ partyNames }),
  }),
  
  // Update ledger entry
  updateEntry: (id: string, entryData: any) => apiCall(`/party-ledger/entry/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entryData),
  }),
  
  // Delete ledger entry
  deleteEntry: (id: string) => apiCall(`/party-ledger/entry/${id}`, {
    method: 'DELETE',
  }),
};

// User Settings API
export const userSettingsAPI = {
  // Get user settings
  get: (userId: string) => apiCall(`/settings/${userId}`),
  
  // Update user settings
  update: (userId: string, settingsData: any) => apiCall(`/settings/${userId}`, {
      method: 'PUT',
    body: JSON.stringify(settingsData),
  }),
  
  // Create user settings
  create: (settingsData: any) => apiCall('/settings', {
    method: 'POST',
    body: JSON.stringify(settingsData),
  }),
  
  // Delete user settings
  delete: (userId: string) => apiCall(`/settings/${userId}`, {
      method: 'DELETE',
  }),
};

// Final Trial Balance API
export const finalTrialBalanceAPI = {
  // Get final trial balance
  get: () => apiCall('/final-trial-balance'),
  
  // Get trial balance for specific party
  getPartyBalance: (partyName: string) => apiCall(`/final-trial-balance/party/${encodeURIComponent(partyName)}`),
  
  // Generate trial balance report
  generateReport: (reportData: any) => apiCall('/final-trial-balance/report', {
      method: 'POST',
    body: JSON.stringify(reportData),
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