// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// New Party Types
export interface SelfLD {
  M: string;
  S: string;
  A: string;
  T: string;
  C: string;
}

export interface AgentLD {
  name: string;
  M: string;
  S: string;
  A: string;
  T: string;
  C: string;
}

export interface ThirdPartyLD {
  name: string;
  M: string;
  S: string;
  A: string;
  T: string;
  C: string;
}

export interface Commission {
  M: string;
  S: string;
}

export interface NewPartyData {
  srNo: string;
  partyName: string;
  status: 'R' | 'A';
  commiSystem: 'Take' | 'Give';
  balanceLimit: string;
  mCommission: 'No Commission' | 'With Commission';
  rate: string;
  selfLD: SelfLD;
  agentLD: AgentLD;
  thirdPartyLD: ThirdPartyLD;
  selfCommission: Commission;
  agentCommission: Commission;
  thirdPartyCommission: Commission;
}

export interface NewParty extends NewPartyData {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// Party Ledger Types
export interface Party {
  name: string;
  mondayFinal: 'Yes' | 'No';
}

export interface LedgerEntry {
  id: number;
  _id?: string;
  date: string;
  remarks: string;
  tnsType: 'CR' | 'DR' | 'Monday S...' | string;
  credit: number;
  debit: number;
  balance: number;
  chk: boolean;
  ti: string;
  createdAt?: string;
  partyName?: string;
  mondayFinal?: string;
}

export interface LedgerEntryInput {
  partyName: string;
  amount?: number;
  remarks: string;
  tnsType: 'CR' | 'DR' | 'Monday S...' | string;
  credit: number;
  debit: number;
  ti: string;
}

// User Settings Types
export interface UserSettings {
  decimalFormat: 'FULL AMOUNT' | 'DECIMAL' | 'CURRENCY';
  companyAccount: string;
  password: string;
  entryOrder: 'FIRST AMOUNT' | 'LAST AMOUNT' | 'CUSTOM ORDER';
  ntPosition: 'BOTTOM' | 'TOP' | 'MIDDLE';
  agentReport: 'THREE' | 'FIVE' | 'TEN';
  color: 'Blue' | 'Green' | 'Red' | 'Purple';
  isLocked: boolean;
}

// Final Trial Balance Types
export interface TrialBalanceEntry {
  id: string;
  name: string;
  amount: number;
  type: 'credit' | 'debit';
}

// Form Data Types
export interface FormData {
  [key: string]: string | number | boolean | object;
}

// API Function Types
export type ApiFunction<T = unknown> = (data?: T) => Promise<ApiResponse<T>>; 