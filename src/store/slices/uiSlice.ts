import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface UIState {
  // Loading states
  isLoading: boolean;
  isActionLoading: boolean;
  isPartiesLoading: boolean;
  
  // Modal states
  isTransactionModalOpen: boolean;
  isPartyModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isMondayFinalModalOpen: boolean;
  
  // Dropdown states
  showPartyDropdown: boolean;
  showTopPartyDropdown: boolean;
  
  // Form states
  isTyping: boolean;
  showInlineSuggestion: boolean;
  showTopInlineSuggestion: boolean;
  autoCompleteText: string;
  topAutoCompleteText: string;
  highlightedIndex: number;
  topHighlightedIndex: number;
  typingPartyName: string;
  
  // Transaction form states
  newEntryPartyName: string;
  newEntryAmount: string;
  newEntryRemarks: string;
  showTransactionPartyDropdown: boolean;
  transactionFilteredParties: any[];
  transactionHighlightedIndex: number;
  transactionAutoCompleteText: string;
  showTransactionInlineSuggestion: boolean;
  isAddingEntry: boolean;
  skipNextCommissionAutofill: boolean;
  
  // Toast notifications
  toasts: ToastMessage[];
  
  // Selected entries for bulk operations
  selectedEntries: (string | number)[];
  
  // Theme and display
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  
  // Performance tracking
  lastActionTime: number;
  
  // Error states
  globalError: string | null;
}

const initialState: UIState = {
  // Loading states
  isLoading: false,
  isActionLoading: false,
  isPartiesLoading: false,
  
  // Modal states
  isTransactionModalOpen: false,
  isPartyModalOpen: false,
  isDeleteModalOpen: false,
  isMondayFinalModalOpen: false,
  
  // Dropdown states
  showPartyDropdown: false,
  showTopPartyDropdown: false,
  
  // Form states
  isTyping: false,
  showInlineSuggestion: false,
  showTopInlineSuggestion: false,
  autoCompleteText: '',
  topAutoCompleteText: '',
  highlightedIndex: -1,
  topHighlightedIndex: -1,
  typingPartyName: '',
  
  // Transaction form states
  newEntryPartyName: '',
  newEntryAmount: '',
  newEntryRemarks: '',
  showTransactionPartyDropdown: false,
  transactionFilteredParties: [],
  transactionHighlightedIndex: -1,
  transactionAutoCompleteText: '',
  showTransactionInlineSuggestion: false,
  isAddingEntry: false,
  skipNextCommissionAutofill: false,
  
  // Toast notifications
  toasts: [],
  
  // Selected entries for bulk operations
  selectedEntries: [],
  
  // Theme and display
  theme: 'system',
  sidebarCollapsed: false,
  
  // Performance tracking
  lastActionTime: 0,
  
  // Error states
  globalError: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setActionLoading: (state, action: PayloadAction<boolean>) => {
      state.isActionLoading = action.payload;
    },
    setPartiesLoading: (state, action: PayloadAction<boolean>) => {
      state.isPartiesLoading = action.payload;
    },
    
    // Modal states
    setTransactionModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isTransactionModalOpen = action.payload;
    },
    setPartyModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPartyModalOpen = action.payload;
    },
    setDeleteModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDeleteModalOpen = action.payload;
    },
    setMondayFinalModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isMondayFinalModalOpen = action.payload;
    },
    closeAllModals: (state) => {
      state.isTransactionModalOpen = false;
      state.isPartyModalOpen = false;
      state.isDeleteModalOpen = false;
      state.isMondayFinalModalOpen = false;
    },
    
    // Dropdown states
    setShowPartyDropdown: (state, action: PayloadAction<boolean>) => {
      state.showPartyDropdown = action.payload;
    },
    setShowTopPartyDropdown: (state, action: PayloadAction<boolean>) => {
      state.showTopPartyDropdown = action.payload;
    },
    closeAllDropdowns: (state) => {
      state.showPartyDropdown = false;
      state.showTopPartyDropdown = false;
    },
    
    // Form states
    setIsTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setShowInlineSuggestion: (state, action: PayloadAction<boolean>) => {
      state.showInlineSuggestion = action.payload;
    },
    setShowTopInlineSuggestion: (state, action: PayloadAction<boolean>) => {
      state.showTopInlineSuggestion = action.payload;
    },
    setAutoCompleteText: (state, action: PayloadAction<string>) => {
      state.autoCompleteText = action.payload;
    },
    setTopAutoCompleteText: (state, action: PayloadAction<string>) => {
      state.topAutoCompleteText = action.payload;
    },
    setTypingPartyName: (state, action: PayloadAction<string>) => {
      state.typingPartyName = action.payload;
    },
    
    // Selected entries management
    addSelectedEntry: (state, action: PayloadAction<string>) => {
      if (!state.selectedEntries) {
        state.selectedEntries = [];
      }
      if (!state.selectedEntries.includes(action.payload)) {
        state.selectedEntries.push(action.payload);
      }
    },
    removeSelectedEntry: (state, action: PayloadAction<string>) => {
      if (!state.selectedEntries) {
        state.selectedEntries = [];
      }
      state.selectedEntries = state.selectedEntries.filter(id => id !== action.payload);
    },
    clearSelectedEntries: (state) => {
      state.selectedEntries = [];
    },
    setSelectedEntries: (state, action: PayloadAction<string[]>) => {
      state.selectedEntries = action.payload;
    },
    setHighlightedIndex: (state, action: PayloadAction<number>) => {
      state.highlightedIndex = action.payload;
    },
    setTopHighlightedIndex: (state, action: PayloadAction<number>) => {
      state.topHighlightedIndex = action.payload;
    },
    
    // Transaction form actions
    setNewEntryPartyName: (state, action: PayloadAction<string>) => {
      state.newEntryPartyName = action.payload;
    },
    setNewEntryAmount: (state, action: PayloadAction<string>) => {
      state.newEntryAmount = action.payload;
    },
    setNewEntryRemarks: (state, action: PayloadAction<string>) => {
      state.newEntryRemarks = action.payload;
    },
    setSkipNextCommissionAutofill: (state, action: PayloadAction<boolean>) => {
      state.skipNextCommissionAutofill = action.payload;
    },
    setShowTransactionPartyDropdown: (state, action: PayloadAction<boolean>) => {
      state.showTransactionPartyDropdown = action.payload;
    },
    setTransactionFilteredParties: (state, action: PayloadAction<any[]>) => {
      state.transactionFilteredParties = action.payload;
    },
    setTransactionHighlightedIndex: (state, action: PayloadAction<number>) => {
      state.transactionHighlightedIndex = action.payload;
    },
    setTransactionAutoCompleteText: (state, action: PayloadAction<string>) => {
      state.transactionAutoCompleteText = action.payload;
    },
    setShowTransactionInlineSuggestion: (state, action: PayloadAction<boolean>) => {
      state.showTransactionInlineSuggestion = action.payload;
    },
    setIsAddingEntry: (state, action: PayloadAction<boolean>) => {
      state.isAddingEntry = action.payload;
    },
    clearAutoComplete: (state) => {
      state.autoCompleteText = '';
      state.topAutoCompleteText = '';
      state.showInlineSuggestion = false;
      state.showTopInlineSuggestion = false;
      state.highlightedIndex = -1;
    },
    
    // Toast notifications
    addToast: (state, action: PayloadAction<Omit<ToastMessage, 'id'>>) => {
      const toast: ToastMessage = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.toasts = [];
    },
    
    // Theme and display
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    // Performance tracking
    setLastActionTime: (state, action: PayloadAction<number>) => {
      state.lastActionTime = action.payload;
    },
    
    // Error states
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },
    clearGlobalError: (state) => {
      state.globalError = null;
    },
    
    // Utility actions
    resetUIState: (state) => {
      return { ...initialState, theme: state.theme };
    },
  },
});

export const {
  // Loading states
  setLoading,
  setActionLoading,
  setPartiesLoading,
  
  // Modal states
  setTransactionModalOpen,
  setPartyModalOpen,
  setDeleteModalOpen,
  setMondayFinalModalOpen,
  closeAllModals,
  
  // Dropdown states
  setShowPartyDropdown,
  setShowTopPartyDropdown,
  closeAllDropdowns,
  
  // Form states
  setIsTyping,
  setShowInlineSuggestion,
  setShowTopInlineSuggestion,
  setAutoCompleteText,
  setTopAutoCompleteText,
  setTypingPartyName,
  setHighlightedIndex,
  setTopHighlightedIndex,
  clearAutoComplete,
  
  // Transaction form actions
  setNewEntryPartyName,
  setNewEntryAmount,
  setNewEntryRemarks,
  setShowTransactionPartyDropdown,
  setTransactionFilteredParties,
  setTransactionHighlightedIndex,
  setTransactionAutoCompleteText,
  setShowTransactionInlineSuggestion,
  setIsAddingEntry,
  setSkipNextCommissionAutofill,
  
  // Selected entries management
  addSelectedEntry,
  removeSelectedEntry,
  clearSelectedEntries,
  setSelectedEntries,
  
  // Toast notifications
  addToast,
  removeToast,
  clearAllToasts,
  
  // Theme and display
  setTheme,
  setSidebarCollapsed,
  
  // Performance tracking
  setLastActionTime,
  
  // Error states
  setGlobalError,
  clearGlobalError,
  
  // Utility actions
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;
