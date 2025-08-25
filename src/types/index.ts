/**
 * TypeScript Type Definitions
 * 
 * Defines all TypeScript interfaces and types used throughout
 * the Property Flow Design application.
 * 
 * Features:
 * - API response type definitions
 * - Component prop interfaces
 * - Form data types
 * - State management types
 * - Utility type definitions
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

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

// User Types
export interface User {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  googleId?: string;
  profilePicture?: string;
}

// Google Authentication Types
export interface GoogleUserData {
  email: string;
  googleId: string;
  fullname: string;
  profilePicture?: string;
  phone?: string;
}

export interface GoogleAuthResponse {
  token: string;
  user: User;
}

// Ledger Data Types
export interface LedgerSummary {
  totalCredit: number;
  totalDebit: number;
  calculatedBalance: number;
  totalEntries: number;
}

export interface MondayFinalData {
  transactionCount: number;
  totalCredit: number;
  totalDebit: number;
  startingBalance: number;
  finalBalance: number;
}

export interface CommissionDetails {
  transactionAmount: number;
  commissionAmount: number;
  partyCommission: number;
  companyCommission: number;
  settlementAmount: number;
}

export interface LedgerData {
  ledgerEntries: LedgerEntry[];
  oldRecords: LedgerEntry[];
  closingBalance: number;
  summary: LedgerSummary;
  mondayFinalData: MondayFinalData;
  commissionDetails?: CommissionDetails;
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
  mondayFinal: 'Yes' | 'No';
  selfLD: SelfLD;
  agentLD: AgentLD;
  thirdPartyLD: ThirdPartyLD;
  selfCommission: Commission;
  agentCommission: Commission;
  thirdPartyCommission: Commission;
}

export interface NewParty extends NewPartyData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Party Ledger Types
export interface Party {
  id?: string;
  _id?: string; // Backend compatibility
  name: string;
  party_name?: string; // Backend field
  srNo?: string | number; // Accept both string and number
  status?: string;
  mondayFinal: 'Yes' | 'No';
  balanceLimit?: number | string; // Accept both number and string
  mCommission?: string;
  rate?: string;
  commiSystem?: string;
  companyName?: string; // Backend field
  selfLD?: number;
  selfMCommi?: number;
  agentParty?: string;
  agentLD?: number;
  agentMCommi?: number;
  thirdParty?: string;
  thirdPartyLD?: number;
  thirdPartyMCommi?: number;
}

export interface LedgerEntry {
  id: string;
  _id?: string; // Backend compatibility
  date: string;
  remarks: string;
  tnsType: 'CR' | 'DR' | 'Monday S...' | 'Monday Settlement' | string;
  credit: number;
  debit: number;
  balance: number;
  chk: boolean;
  ti: string;
  createdAt?: string;
  partyName?: string; // Frontend field
  party_name?: string; // Backend field
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