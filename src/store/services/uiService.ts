/**
 * UI Service - Redux Thunk Actions
 * 
 * Handles UI state management operations using Redux Thunk
 * for better state management and user experience.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit';

// Types
export interface TransactionFormData {
  partyName: string;
  amount: string;
  remarks: string;
}

// 1. Update Transaction Form
export const updateTransactionForm = createAsyncThunk(
  'ui/updateTransactionForm',
  async (formData: Partial<TransactionFormData>) => {
    console.log('📝 Updating transaction form:', formData);
    
    return {
      ...formData,
      timestamp: Date.now()
    };
  }
);

// 2. Clear Transaction Form
export const clearTransactionForm = createAsyncThunk(
  'ui/clearTransactionForm',
  async () => {
    console.log('🧹 Clearing transaction form');
    
    return {
      partyName: '',
      amount: '',
      remarks: '',
      timestamp: Date.now()
    };
  }
);

// 3. Update Party Selection
export const updatePartySelection = createAsyncThunk(
  'ui/updatePartySelection',
  async (params: {
    partyName: string;
    isTopSection?: boolean;
  }) => {
    const { partyName, isTopSection } = params;
    
    console.log('👤 Updating party selection:', partyName, isTopSection ? '(top)' : '(transaction)');
    
    return {
      partyName,
      isTopSection: isTopSection || false,
      timestamp: Date.now()
    };
  }
);

// 4. Update Dropdown State
export const updateDropdownState = createAsyncThunk(
  'ui/updateDropdownState',
  async (params: {
    showDropdown: boolean;
    dropdownType: 'top' | 'transaction';
    autoCompleteText?: string;
    showInlineSuggestion?: boolean;
  }) => {
    const { showDropdown, dropdownType, autoCompleteText, showInlineSuggestion } = params;
    
    console.log('📋 Updating dropdown state:', {
      dropdownType,
      showDropdown,
      autoCompleteText,
      showInlineSuggestion
    });
    
    return {
      dropdownType,
      showDropdown,
      autoCompleteText: autoCompleteText || '',
      showInlineSuggestion: showInlineSuggestion || false,
      timestamp: Date.now()
    };
  }
);

// 5. Update Entry Selection
export const updateEntrySelection = createAsyncThunk(
  'ui/updateEntrySelection',
  async (params: {
    entryId: string | number;
    selected: boolean;
    isCheckAll?: boolean;
  }) => {
    const { entryId, selected, isCheckAll } = params;
    
    console.log('✅ Updating entry selection:', {
      entryId,
      selected,
      isCheckAll
    });
    
    return {
      entryId: String(entryId),
      selected,
      isCheckAll: isCheckAll || false,
      timestamp: Date.now()
    };
  }
);

// 6. Clear All Selections
export const clearAllSelections = createAsyncThunk(
  'ui/clearAllSelections',
  async () => {
    console.log('🧹 Clearing all selections');
    
    return {
      timestamp: Date.now()
    };
  }
);

// 7. Update Highlighted Index
export const updateHighlightedIndex = createAsyncThunk(
  'ui/updateHighlightedIndex',
  async (params: {
    index: number;
    dropdownType: 'top' | 'transaction';
  }) => {
    const { index, dropdownType } = params;
    
    console.log('🎯 Updating highlighted index:', {
      index,
      dropdownType
    });
    
    return {
      index,
      dropdownType,
      timestamp: Date.now()
    };
  }
);

// 8. Update Loading State
export const updateLoadingState = createAsyncThunk(
  'ui/updateLoadingState',
  async (params: {
    isLoading: boolean;
    loadingType: 'action' | 'adding' | 'deleting' | 'refreshing';
  }) => {
    const { isLoading, loadingType } = params;
    
    console.log('⏳ Updating loading state:', {
      isLoading,
      loadingType
    });
    
    return {
      isLoading,
      loadingType,
      timestamp: Date.now()
    };
  }
);

// 9. Update Filters
export const updateFilters = createAsyncThunk(
  'ui/updateFilters',
  async (params: {
    filters: {
      showOldRecords?: boolean;
      dateFrom?: string;
      dateTo?: string;
      searchTerm?: string;
    };
  }) => {
    const { filters } = params;
    
    console.log('🔍 Updating filters:', filters);
    
    return {
      ...filters,
      timestamp: Date.now()
    };
  }
);

// 10. Reset UI State
export const resetUIState = createAsyncThunk(
  'ui/resetState',
  async () => {
    console.log('🔄 Resetting UI state');
    
    return {
      timestamp: Date.now()
    };
  }
);
