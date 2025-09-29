import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { authSlice } from '../slices/authSlice';
import { ledgerSlice } from '../slices/ledgerSlice';
import { partiesSlice } from '../slices/partiesSlice';
import { uiSlice } from '../slices/uiSlice';
import { partyLedgerAPI } from '../../lib/api';

// Create the middleware instance
export const listenerMiddleware = createListenerMiddleware();

// Listen for auth state changes
listenerMiddleware.startListening({
  actionCreator: authSlice.actions.setUser,
  effect: async (action, listenerApi) => {
    if (action.payload) {
      // User logged in - you can trigger data loading here
      console.log('User logged in, triggering data refresh');
      // Example: dispatch actions to load initial data
    }
  },
});

// Listen for party selection changes
listenerMiddleware.startListening({
  actionCreator: ledgerSlice.actions.setSelectedPartyName,
  effect: async (action, listenerApi) => {
    if (action.payload) {
      const state = listenerApi.getState();
      listenerApi.dispatch(ledgerSlice.actions.setLoading(true));
      
      try {
        // Load ledger data for selected party
        const response = await partyLedgerAPI.getPartyLedger(action.payload);
        if (response.success) {
          listenerApi.dispatch(ledgerSlice.actions.setLedgerData(response.data));
        } else {
          listenerApi.dispatch(ledgerSlice.actions.setError(response.message || 'Failed to load ledger data'));
        }
      } catch (error) {
        listenerApi.dispatch(ledgerSlice.actions.setError('Failed to load ledger data'));
      } finally {
        listenerApi.dispatch(ledgerSlice.actions.setLoading(false));
      }
    }
  },
});

// Listen for company name changes
listenerMiddleware.startListening({
  actionCreator: authSlice.actions.setCompanyName,
  effect: async (action, listenerApi) => {
    if (action.payload && action.payload !== 'Company') {
      listenerApi.dispatch(partiesSlice.actions.setLoading(true));
      
      try {
        // Load parties for the company
        const response = await partyLedgerAPI.getAllParties();
        if (response.success) {
          listenerApi.dispatch(partiesSlice.actions.setParties(response.data || []));
        } else {
          listenerApi.dispatch(partiesSlice.actions.setError(response.message || 'Failed to load parties'));
        }
      } catch (error) {
        listenerApi.dispatch(partiesSlice.actions.setError('Failed to load parties'));
      } finally {
        listenerApi.dispatch(partiesSlice.actions.setLoading(false));
      }
    }
  },
});

// Listen for entry additions
listenerMiddleware.startListening({
  actionCreator: ledgerSlice.actions.addEntry,
  effect: async (action, listenerApi) => {
    // Show success toast
    listenerApi.dispatch(uiSlice.actions.addToast({
      title: 'Success',
      description: 'Entry added successfully',
      type: 'success',
    }));
  },
});

// Listen for entry updates
listenerMiddleware.startListening({
  actionCreator: ledgerSlice.actions.updateEntry,
  effect: async (action, listenerApi) => {
    // Show success toast
    listenerApi.dispatch(uiSlice.actions.addToast({
      title: 'Success',
      description: 'Entry updated successfully',
      type: 'success',
    }));
  },
});

// Listen for entry deletions
listenerMiddleware.startListening({
  actionCreator: ledgerSlice.actions.deleteEntry,
  effect: async (action, listenerApi) => {
    // Show success toast
    listenerApi.dispatch(uiSlice.actions.addToast({
      title: 'Success',
      description: 'Entry deleted successfully',
      type: 'success',
    }));
  },
});

// Auto-remove toasts after 3 seconds
listenerMiddleware.startListening({
  actionCreator: uiSlice.actions.addToast,
  effect: async (action, listenerApi) => {
    const toastId = action.payload.id;
    setTimeout(() => {
      listenerApi.dispatch(uiSlice.actions.removeToast(toastId));
    }, action.payload.duration || 3000);
  },
});
