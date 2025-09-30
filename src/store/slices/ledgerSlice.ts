import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  fetchPartyLedger, 
  addLedgerEntry, 
  deleteLedgerEntries, 
  refreshLedgerData,
  createMondayFinal,
  deleteMondayFinal,
  applyOptimisticAdd,
  applyOptimisticDelete
} from '../services/ledgerService';

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
      state.pagination.totalItems = (action.payload.ledgerEntries?.length || 0) + (action.payload.oldRecords?.length || 0);
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
      if (state.data && state.data.ledgerEntries) {
        state.data.ledgerEntries.unshift(action.payload);
        state.data.totalBalance += action.payload.amount * (action.payload.type === 'debit' ? 1 : -1);
        state.data.totalDebit += action.payload.type === 'debit' ? action.payload.amount : 0;
        state.data.totalCredit += action.payload.type === 'credit' ? action.payload.amount : 0;
        state.pagination.totalItems += 1;
      }
    },
    updateEntry: (state, action: PayloadAction<{ id: string; updates: Partial<LedgerEntry> }>) => {
      if (state.data && state.data.ledgerEntries) {
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
      if (state.data && state.data.ledgerEntries) {
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
  extraReducers: (builder) => {
    // Fetch Party Ledger
    builder
      .addCase(fetchPartyLedger.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPartyLedger.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        state.pagination.totalItems = (action.payload.ledgerEntries?.length || 0) + (action.payload.oldRecords?.length || 0);
        state.error = null;
      })
      .addCase(fetchPartyLedger.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Add Ledger Entry
    builder
      .addCase(addLedgerEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addLedgerEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.data && action.payload.mainEntry) {
          // Update with real API data - match by party name, amount, and optimistic flag
          console.log('🔍 Looking for optimistic entry to replace with real data');
          console.log('🔍 Real entry data:', {
            partyName: action.payload.mainEntry.partyName,
            amount: action.payload.mainEntry.amount,
            credit: action.payload.mainEntry.credit,
            debit: action.payload.mainEntry.debit
          });
          
          const existingIndex = state.data.ledgerEntries.findIndex(
            entry => 
              entry.isOptimistic === true &&
              entry.partyName === action.payload.mainEntry.partyName &&
              entry.amount === action.payload.mainEntry.amount &&
              entry.credit === action.payload.mainEntry.credit &&
              entry.debit === action.payload.mainEntry.debit
          );
          
          console.log('🔍 Found optimistic entry at index:', existingIndex);
          
          if (existingIndex !== -1) {
            // Replace optimistic entry with real data
            state.data.ledgerEntries[existingIndex] = action.payload.mainEntry;
          } else {
            // Only add new entry if no optimistic entry was found
            // This prevents duplicate entries
            state.data.ledgerEntries.unshift(action.payload.mainEntry);
          }
          
          // Add commission entry if exists
          if (action.payload.commissionEntry) {
            // Check if optimistic commission entry exists to replace
            const commissionIndex = state.data.ledgerEntries.findIndex(
              entry => 
                entry.isOptimistic === true &&
                entry.involvedParty === 'Commission' &&
                entry.partyName === action.payload.commissionEntry.partyName
            );
            
            if (commissionIndex !== -1) {
              // Replace optimistic commission entry with real data
              state.data.ledgerEntries[commissionIndex] = action.payload.commissionEntry;
            } else {
              // Add new commission entry if no optimistic entry found
              state.data.ledgerEntries.push(action.payload.commissionEntry);
            }
          }
          
          // Don't add involved entry to current table - it belongs to different party
          // The involved entry will be handled separately when that party's data is loaded
          
          // Replace optimistic involved entry with real data if exists
          if (action.payload.optimisticInvolvedEntry && action.payload.involvedEntry) {
            const optimisticIndex = state.data.ledgerEntries.findIndex(
              entry => entry._id === action.payload.optimisticInvolvedEntry._id
            );
            if (optimisticIndex !== -1) {
              state.data.ledgerEntries[optimisticIndex] = action.payload.involvedEntry;
            }
          }
          
          // Recalculate totals
          state.data.totalBalance = state.data.ledgerEntries.reduce(
            (sum, entry) => sum + (entry.balance || 0), 0
          );
          state.data.totalCredit = state.data.ledgerEntries.reduce(
            (sum, entry) => sum + (entry.credit || 0), 0
          );
          state.data.totalDebit = state.data.ledgerEntries.reduce(
            (sum, entry) => sum + (entry.debit || 0), 0
          );
          
          state.pagination.totalItems = (state.data.ledgerEntries?.length || 0) + (state.data.oldRecords?.length || 0);
        }
        state.error = null;
      })
      .addCase(addLedgerEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Ledger Entries
    builder
      .addCase(deleteLedgerEntries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteLedgerEntries.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.data) {
          // Entries are already removed via optimistic update
          // Just confirm the deletion
          state.pagination.totalItems = state.data.ledgerEntries.length + state.data.oldRecords.length;
        }
        state.error = null;
      })
      .addCase(deleteLedgerEntries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh Ledger Data
    builder
      .addCase(refreshLedgerData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshLedgerData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        state.pagination.totalItems = (action.payload.ledgerEntries?.length || 0) + (action.payload.oldRecords?.length || 0);
        state.error = null;
      })
      .addCase(refreshLedgerData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Optimistic Add
    builder
      .addCase(applyOptimisticAdd.fulfilled, (state, action) => {
        if (state.data && state.data.ledgerEntries) {
          const { optimisticEntry, commissionEntry, involvedEntry, optimisticInvolvedEntry } = action.payload;
          
          // Add optimistic entries
          state.data.ledgerEntries.unshift(optimisticEntry);
          if (commissionEntry) {
            state.data.ledgerEntries.push(commissionEntry);
          }
          // Don't add involved entries to current table - they belong to different party
          
          // Update totals
          state.data.totalBalance += optimisticEntry.balance || 0;
          if (commissionEntry) {
            state.data.totalBalance += commissionEntry.balance || 0;
          }
          // Don't include involved entry totals in current party's balance
          
          state.pagination.totalItems = state.data.ledgerEntries.length + (state.data.oldRecords?.length || 0);
        }
      });

    // Optimistic Delete
    builder
      .addCase(applyOptimisticDelete.fulfilled, (state, action) => {
        if (state.data) {
          const { deletedIds, showOldRecords } = action.payload;
          const entriesArray = showOldRecords ? (state.data.oldRecords || []) : (state.data.ledgerEntries || []);
          
          // Remove entries
          deletedIds.forEach(id => {
            const index = entriesArray.findIndex(entry => 
              entry._id === id || entry.id === id || entry.ti === id
            );
            if (index !== -1) {
              entriesArray.splice(index, 1);
            }
          });
          
          state.pagination.totalItems = (state.data.ledgerEntries?.length || 0) + (state.data.oldRecords?.length || 0);
        }
      });
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
