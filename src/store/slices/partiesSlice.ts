import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Party {
  _id: string;
  name: string;
  party_name: string;
  srNo: string;
  status: 'A' | 'I'; // Active or Inactive
  mCommission: string;
  rate: string;
  commiSystem: 'Take' | 'Give';
  mondayFinal: 'Yes' | 'No';
  companyName: string;
}

interface PartiesState {
  availableParties: Party[];
  allPartiesForTransaction: Party[];
  filteredParties: Party[];
  filteredTopParties: Party[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  topSearchTerm: string;
  selectedParty: Party | null;
  filters: {
    status?: 'A' | 'I';
    companyName?: string;
    mondayFinal?: 'Yes' | 'No';
  };
}

const initialState: PartiesState = {
  availableParties: [],
  allPartiesForTransaction: [],
  filteredParties: [],
  filteredTopParties: [],
  isLoading: false,
  error: null,
  searchTerm: '',
  topSearchTerm: '',
  selectedParty: null,
  filters: {},
};

export const partiesSlice = createSlice({
  name: 'parties',
  initialState,
  reducers: {
    // Data actions
    setParties: (state, action: PayloadAction<Party[]>) => {
      state.availableParties = action.payload;
      state.allPartiesForTransaction = action.payload;
      state.filteredParties = action.payload;
      state.filteredTopParties = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setPartiesLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPartiesError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setAvailableParties: (state, action: PayloadAction<Party[]>) => {
      state.availableParties = action.payload;
    },
    setAllPartiesForTransaction: (state, action: PayloadAction<Party[]>) => {
      state.allPartiesForTransaction = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    
    // Party management
    addParty: (state, action: PayloadAction<Party>) => {
      state.availableParties.unshift(action.payload);
      state.allPartiesForTransaction.unshift(action.payload);
      state.filteredParties.unshift(action.payload);
      state.filteredTopParties.unshift(action.payload);
    },
    updateParty: (state, action: PayloadAction<{ id: string; updates: Partial<Party> }>) => {
      const updatePartyInArray = (parties: Party[]) => {
        const index = parties.findIndex(party => party._id === action.payload.id);
        if (index !== -1) {
          parties[index] = { ...parties[index], ...action.payload.updates };
        }
      };
      
      updatePartyInArray(state.availableParties);
      updatePartyInArray(state.allPartiesForTransaction);
      updatePartyInArray(state.filteredParties);
      updatePartyInArray(state.filteredTopParties);
    },
    deleteParty: (state, action: PayloadAction<string>) => {
      state.availableParties = state.availableParties.filter(party => party._id !== action.payload);
      state.allPartiesForTransaction = state.allPartiesForTransaction.filter(party => party._id !== action.payload);
      state.filteredParties = state.filteredParties.filter(party => party._id !== action.payload);
      state.filteredTopParties = state.filteredTopParties.filter(party => party._id !== action.payload);
    },
    
    // Search and filtering
    setTopSearchTerm: (state, action: PayloadAction<string>) => {
      state.topSearchTerm = action.payload;
    },
    setFilteredParties: (state, action: PayloadAction<Party[]>) => {
      state.filteredParties = action.payload;
    },
    setFilteredTopParties: (state, action: PayloadAction<Party[]>) => {
      state.filteredTopParties = action.payload;
    },
    
    // Filters
    setFilters: (state, action: PayloadAction<Partial<PartiesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // Selection
    setSelectedParty: (state, action: PayloadAction<Party | null>) => {
      state.selectedParty = action.payload;
    },
    
    // Utility actions
    filterParties: (state, action: PayloadAction<{ searchTerm: string; excludeCurrent?: boolean; currentPartyName?: string }>) => {
      const { searchTerm, excludeCurrent, currentPartyName } = action.payload;
      let parties = state.availableParties;
      
      // Exclude current party if specified
      if (excludeCurrent && currentPartyName) {
        parties = parties.filter(party => 
          (party.party_name || party.name) !== currentPartyName
        );
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        parties = parties.filter(party => {
          const partyName = (party.party_name || party.name || '').toLowerCase();
          const companyName = (party.companyName || '').toLowerCase();
          return partyName.startsWith(searchLower) || 
                 partyName.includes(searchLower) ||
                 companyName.startsWith(searchLower) || 
                 companyName.includes(searchLower);
        });
        
        // Sort by relevance (starts with first, then alphabetically)
        parties.sort((a, b) => {
          const aName = (a.party_name || a.name || '').toLowerCase();
          const bName = (b.party_name || b.name || '').toLowerCase();
          const aStartsWith = aName.startsWith(searchLower);
          const bStartsWith = bName.startsWith(searchLower);
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          return aName.localeCompare(bName);
        });
      }
      
      state.filteredParties = parties;
    },
    
    // Clear state
    clearPartiesData: (state) => {
      state.availableParties = [];
      state.allPartiesForTransaction = [];
      state.filteredParties = [];
      state.filteredTopParties = [];
      state.selectedParty = null;
      state.searchTerm = '';
      state.topSearchTerm = '';
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setParties,
  setLoading,
  setPartiesLoading,
  setError,
  setPartiesError,
  setAvailableParties,
  setAllPartiesForTransaction,
  addParty,
  updateParty,
  deleteParty,
  setSearchTerm,
  setTopSearchTerm,
  setFilteredParties,
  setFilteredTopParties,
  setFilters,
  clearFilters,
  setSelectedParty,
  filterParties,
  clearPartiesData,
  clearError,
} = partiesSlice.actions;

export default partiesSlice.reducer;
