import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LedgerEntry {
  _id: string;
  date: string;
  partyName: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance: number;
  commission?: number;
  mondayFinal?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LedgerData {
  ledgerEntries: LedgerEntry[];
  oldRecords: LedgerEntry[];
  totalBalance: number;
  totalDebit: number;
  totalCredit: number;
}

interface LedgerState {
  data: LedgerData | null;
  isLoading: boolean;
  error: string | null;
  selectedPartyName: string;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    showOldRecords: boolean;
    searchTerm?: string;
  };
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
  };
}

const initialState: LedgerState = {
  data: null,
  isLoading: false,
  error: null,
  selectedPartyName: '',
  filters: {
    showOldRecords: false,
  },
  pagination: {
    currentPage: 1,
    itemsPerPage: 50,
    totalItems: 0,
  },
};

export const ledgerSlice = createSlice({
  name: 'ledger',
  initialState,
  reducers: {
    // Data actions
    setLedgerData: (state, action: PayloadAction<LedgerData>) => {
      state.data = action.payload;
      state.pagination.totalItems = action.payload.ledgerEntries.length + action.payload.oldRecords.length;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Party selection
    setSelectedPartyName: (state, action: PayloadAction<string>) => {
      state.selectedPartyName = action.payload;
      // Reset data when party changes
      state.data = null;
      state.pagination.currentPage = 1;
    },
    
    // Entry management
    addEntry: (state, action: PayloadAction<LedgerEntry>) => {
      if (state.data) {
        state.data.ledgerEntries.unshift(action.payload);
        state.data.totalBalance += action.payload.amount * (action.payload.type === 'debit' ? 1 : -1);
        state.data.totalDebit += action.payload.type === 'debit' ? action.payload.amount : 0;
        state.data.totalCredit += action.payload.type === 'credit' ? action.payload.amount : 0;
        state.pagination.totalItems += 1;
      }
    },
    updateEntry: (state, action: PayloadAction<{ id: string; updates: Partial<LedgerEntry> }>) => {
      if (state.data) {
        const entryIndex = state.data.ledgerEntries.findIndex(entry => entry._id === action.payload.id);
        if (entryIndex !== -1) {
          const oldEntry = state.data.ledgerEntries[entryIndex];
          const newEntry = { ...oldEntry, ...action.payload.updates };
          
          // Update totals
          state.data.totalBalance -= oldEntry.amount * (oldEntry.type === 'debit' ? 1 : -1);
          state.data.totalDebit -= oldEntry.type === 'debit' ? oldEntry.amount : 0;
          state.data.totalCredit -= oldEntry.type === 'credit' ? oldEntry.amount : 0;
          
          state.data.totalBalance += newEntry.amount * (newEntry.type === 'debit' ? 1 : -1);
          state.data.totalDebit += newEntry.type === 'debit' ? newEntry.amount : 0;
          state.data.totalCredit += newEntry.type === 'credit' ? newEntry.amount : 0;
          
          state.data.ledgerEntries[entryIndex] = newEntry;
        }
      }
    },
    deleteEntry: (state, action: PayloadAction<string>) => {
      if (state.data) {
        const entryIndex = state.data.ledgerEntries.findIndex(entry => entry._id === action.payload);
        if (entryIndex !== -1) {
          const entry = state.data.ledgerEntries[entryIndex];
          state.data.totalBalance -= entry.amount * (entry.type === 'debit' ? 1 : -1);
          state.data.totalDebit -= entry.type === 'debit' ? entry.amount : 0;
          state.data.totalCredit -= entry.type === 'credit' ? entry.amount : 0;
          state.data.ledgerEntries.splice(entryIndex, 1);
          state.pagination.totalItems -= 1;
        }
      }
    },
    
    // Filter actions
    setFilters: (state, action: PayloadAction<Partial<LedgerState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.currentPage = 1;
    },
    clearFilters: (state) => {
      state.filters = { showOldRecords: false };
      state.pagination.currentPage = 1;
    },
    
    // Pagination actions
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.pagination.currentPage = action.payload;
    },
    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.pagination.itemsPerPage = action.payload;
      state.pagination.currentPage = 1;
    },
    
    // Clear state
    clearLedgerData: (state) => {
      state.data = null;
      state.error = null;
      state.pagination.currentPage = 1;
      state.pagination.totalItems = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLedgerData,
  setLoading,
  setError,
  setSelectedPartyName,
  addEntry,
  updateEntry,
  deleteEntry,
  setFilters,
  clearFilters,
  setCurrentPage,
  setItemsPerPage,
  clearLedgerData,
  clearError,
} = ledgerSlice.actions;

export default ledgerSlice.reducer;
