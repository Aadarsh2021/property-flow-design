/**
 * Parties Service - Redux Thunk Actions
 * 
 * Handles all parties-related API operations using Redux Thunk
 * for better state management and error handling.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { partyLedgerAPI } from '../../lib/api';

// Types
export interface Party {
  _id: string;
  name: string;
  party_name: string;
  srNo: string;
  status: 'A' | 'I';
  mCommission: string;
  rate: string;
  commiSystem: 'Take' | 'Give';
  mondayFinal: 'Yes' | 'No';
  companyName: string;
}

// 1. Fetch All Parties
export const fetchAllParties = createAsyncThunk(
  'parties/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      console.log('👥 Fetching all parties...');
      const response = await partyLedgerAPI.getAllParties();
      
      if (response.success) {
        // Convert API Party type to Redux Party type
        const convertedParties = (response.data || []).map((party: any) => ({
          _id: party._id || party.id || '',
          name: party.name || '',
          party_name: party.party_name || party.partyName || party.name || '',
          srNo: String(party.srNo || ''),
          status: (party.status as 'A' | 'I') || 'A',
          mCommission: party.mCommission || '',
          rate: party.rate || '',
          commiSystem: (party.commiSystem as 'Take' | 'Give') || 'Give',
          mondayFinal: (party.mondayFinal as 'Yes' | 'No') || 'No',
          companyName: party.companyName || '',
        }));
        
        return convertedParties;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch parties');
      }
    } catch (error: any) {
      console.error('❌ Error fetching parties:', error);
      return rejectWithValue(error.message || 'Failed to fetch parties');
    }
  }
);

// 2. Filter Parties by Search Term
export const filterParties = createAsyncThunk(
  'parties/filter',
  async (params: { 
    searchTerm: string; 
    availableParties: Party[]; 
    excludeCurrentParty?: string;
    isTopSection?: boolean;
  }, { getState }) => {
    const { searchTerm, availableParties, excludeCurrentParty, isTopSection } = params;
    
    
    if (!searchTerm.trim()) {
      // Show all available parties when input is empty
      const filteredParties = availableParties.filter(party => {
        if (excludeCurrentParty) {
          return (party.party_name || party.name) !== excludeCurrentParty;
        }
        return true;
      });
      
      return {
        filteredParties,
        isTopSection: isTopSection || false,
        searchTerm: ''
      };
    }
    
    // Filter parties based on input
    const filtered = availableParties.filter(party => {
      const partyName = party.party_name || party.name;
      const searchLower = searchTerm.toLowerCase();
      const partyLower = partyName.toLowerCase();
      
      // Exclude current party if specified
      if (excludeCurrentParty && partyName === excludeCurrentParty) {
        return false;
      }
      
      // Check if party name starts with search term
      return partyLower.startsWith(searchLower);
    });
    
    // Sort by relevance (exact matches first, then alphabetical)
    const sortedFiltered = filtered.sort((a, b) => {
      const aName = (a.party_name || a.name).toLowerCase();
      const bName = (b.party_name || b.name).toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Exact match gets highest priority
      if (aName === searchLower && bName !== searchLower) return -1;
      if (bName === searchLower && aName !== searchLower) return 1;
      
      // Then alphabetical order
      return aName.localeCompare(bName);
    });
    
    
    return {
      filteredParties: sortedFiltered,
      isTopSection: isTopSection || false,
      searchTerm
    };
  }
);

// 3. Get Party Suggestions for Auto-complete
export const getPartySuggestions = createAsyncThunk(
  'parties/getSuggestions',
  async (params: {
    currentValue: string;
    availableParties: Party[];
    excludeCurrentParty?: string;
  }, { getState }) => {
    const { currentValue, availableParties, excludeCurrentParty } = params;
    
    if (!currentValue.trim()) {
      return {
        suggestions: [],
        autoCompleteText: '',
        showSuggestion: false
      };
    }
    
    // Filter parties based on input
    const filtered = availableParties.filter(party => {
      const partyName = party.party_name || party.name;
      const searchLower = currentValue.toLowerCase();
      const partyLower = partyName.toLowerCase();
      
      // Exclude current party if specified
      if (excludeCurrentParty && partyName === excludeCurrentParty) {
        return false;
      }
      
      // Check if party name starts with search term
      return partyLower.startsWith(searchLower);
    });
    
    // Sort by relevance
    const sortedFiltered = filtered.sort((a, b) => {
      const aName = (a.party_name || a.name).toLowerCase();
      const bName = (b.party_name || b.name).toLowerCase();
      const searchLower = currentValue.toLowerCase();
      
      if (aName === searchLower && bName !== searchLower) return -1;
      if (bName === searchLower && aName !== searchLower) return 1;
      
      return aName.localeCompare(bName);
    });
    
    // Find the best match for auto-complete
    let autoCompleteText = '';
    let showSuggestion = false;
    
    if (sortedFiltered.length > 0) {
      const bestMatch = sortedFiltered[0];
      const partyName = bestMatch.party_name || bestMatch.name;
      const searchLower = currentValue.toLowerCase();
      const partyLower = partyName.toLowerCase();
      
      // Only show suggestion if it's a meaningful completion
      if (partyLower.startsWith(searchLower) && 
          partyLower !== searchLower && 
          partyName.length > currentValue.length) {
        autoCompleteText = partyName.substring(currentValue.length);
        showSuggestion = true;
      }
    }
    
    console.log('✅ Party suggestions generated:', {
      suggestions: sortedFiltered.length,
      autoCompleteText,
      showSuggestion
    });
    
    return {
      suggestions: sortedFiltered,
      autoCompleteText,
      showSuggestion
    };
  }
);

// 4. Refresh Parties Data
export const refreshParties = createAsyncThunk(
  'parties/refresh',
  async (_, { dispatch }) => {
    
    // Dispatch fetchAllParties to get fresh data
    const result = await dispatch(fetchAllParties());
    
    if (fetchAllParties.fulfilled.match(result)) {
      return result.payload;
    } else {
      console.error('❌ Failed to refresh parties data');
      throw new Error('Failed to refresh parties data');
    }
  }
);

// 5. Clear Parties Search
export const clearPartiesSearch = createAsyncThunk(
  'parties/clearSearch',
  async (params: { isTopSection?: boolean }, { getState }) => {
    const { isTopSection } = params;
    
    console.log('🧹 Clearing parties search');
    
    return {
      isTopSection: isTopSection || false,
      searchTerm: '',
      filteredParties: [],
      autoCompleteText: '',
      showSuggestion: false
    };
  }
);
