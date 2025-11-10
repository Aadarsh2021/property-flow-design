/**
 * Ledger Service - Redux Thunk Actions
 * 
 * Handles all ledger-related API operations using Redux Thunk
 * for better state management and error handling.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { partyLedgerAPI } from '../../lib/api';
import { AppDispatch, RootState } from '../index';

// Types
export interface LedgerEntryInput {
  partyName: string;
  amount: number;
  remarks: string;
  tnsType: 'CR' | 'DR';
  credit: number;
  debit: number;
  date: string;
  ti: string;
  involvedParty: string;
}

export interface AddEntryParams {
  entryData: LedgerEntryInput;
  optimisticEntry?: any;
  commissionEntry?: any;
  involvedEntry?: any;
  selectedPartyName?: string; // Add selected party name for involved entry correction
}

export interface DeleteEntryParams {
  entryIds: (string | number)[];
  showOldRecords: boolean;
}

// 1. Fetch Party Ledger Data
export const fetchPartyLedger = createAsyncThunk(
  'ledger/fetchPartyLedger',
  async (partyName: string, { rejectWithValue }) => {
    try {
      
      // Force refresh to bypass cache and get fresh data with transactionPartyName
      // Add cache busting as separate query parameter (not in party name)
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const sessionId = Math.random().toString(36).substr(2, 15);
      
      // Pass cache busting parameters separately to avoid URL encoding issues
      // Use _force to bypass cache completely
      const cacheBustParams = {
        _t: timestamp,
        _r: random,
        _cb: `${timestamp}_${random}`,
        _s: sessionId,
        _v: `${timestamp}_${random}`,
        _force: 'true' // Force refresh to get fresh data with transactionPartyName
      };
      
      const response = await partyLedgerAPI.getPartyLedger(partyName, cacheBustParams);
      
      if (response.success && response.data) {
        const data = response.data as any;
        const ledgerEntries = Array.isArray(data) ? data : (data?.ledgerEntries || []);
        const oldRecords = data?.oldRecords || [];

        const allEntries = [...ledgerEntries, ...oldRecords];
        const computedTotals = allEntries.reduce(
          (acc: { credit: number; debit: number; entries: number }, entry: any) => {
            const credit = Number(entry?.credit || 0);
            const debit = Number(entry?.debit || 0);
            acc.credit += Number.isFinite(credit) ? credit : 0;
            acc.debit += Number.isFinite(debit) ? debit : 0;
            acc.entries += 1;
            return acc;
          },
          { credit: 0, debit: 0, entries: 0 }
        );

        const summary = {
          totalCredit: data?.summary?.totalCredit ?? computedTotals.credit,
          totalDebit: data?.summary?.totalDebit ?? computedTotals.debit,
          calculatedBalance:
            data?.summary?.calculatedBalance ?? computedTotals.credit - computedTotals.debit,
          totalEntries: data?.summary?.totalEntries ?? computedTotals.entries,
        };

        const mondayFinalData = data?.mondayFinalData || {
          transactionCount: 0,
          totalCredit: 0,
          totalDebit: 0,
          startingBalance: 0,
          finalBalance: 0,
        };

        const ledgerData = {
          ledgerEntries,
          oldRecords,
          totalBalance: data?.closingBalance ?? summary.calculatedBalance ?? 0,
          totalDebit: summary.totalDebit,
          totalCredit: summary.totalCredit,
          summary,
          mondayFinalData,
        };

        return ledgerData;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch ledger data');
      }
    } catch (error: any) {
      console.error('❌ Error fetching party ledger:', error);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// 2. Add New Entry with Optimistic Updates
export const addLedgerEntry = createAsyncThunk(
  'ledger/addEntry',
  async (params: AddEntryParams, { rejectWithValue, dispatch, getState }) => {
    try {
      
      // Add main entry
      const mainResponse = await partyLedgerAPI.addEntry(params.entryData);
      console.log('🛰️ addEntry response:', mainResponse);
      
      if (!mainResponse.success) {
        return rejectWithValue(mainResponse.message || 'Failed to add main entry');
      }
      
      
      // IMPORTANT: Commission entry is NOT automatically created
      // Commission calculation is enabled for preview only
      // User must manually add commission entry if needed
      // No commission entry auto-creation logic here
      
      // Construct main entry from backend response
      const backendMainEntry = (mainResponse.data as any)?.mainEntry || mainResponse.data;
      console.log('🛰️ backendMainEntry:', backendMainEntry);
      const mainEntry = {
        _id: backendMainEntry._id || backendMainEntry.id || backendMainEntry.ti,
        id: backendMainEntry.id || backendMainEntry._id || backendMainEntry.ti,
        ti: backendMainEntry.ti || backendMainEntry.id || backendMainEntry._id,
        date: backendMainEntry.date || params.entryData.date,
        // Use backend party_name as partyName (this is the ledger owner party - Rahul)
        partyName: backendMainEntry.party_name || backendMainEntry.partyName || params.entryData.partyName,
        // Use transactionPartyName for display (user-selected transaction party - Commission/Give)
        transactionPartyName: backendMainEntry.transactionPartyName || params.entryData.involvedParty,
        remarks: backendMainEntry.remarks || params.entryData.remarks,
        amount: params.entryData.amount,
        credit: backendMainEntry.credit || params.entryData.credit,
        debit: backendMainEntry.debit || params.entryData.debit,
        balance: backendMainEntry.balance || (params.entryData.credit - params.entryData.debit),
        tnsType: backendMainEntry.tns_type || backendMainEntry.tnsType || params.entryData.tnsType,
        type: (backendMainEntry.tns_type || backendMainEntry.tnsType || params.entryData.tnsType) === 'CR' ? 'Credit' : 'Debit',
        ...backendMainEntry
      };

      // Commission entry is NOT automatically created - user must add manually
      // Commission calculation is for preview only
      const commissionEntry = null;

      // Also create involvedEntry if it exists
      // IMPORTANT: Don't override partyName - use what backend sends
      // Involved entry belongs to involved party's ledger (Give), not selected party's ledger (Rahul)
      const backendInvolvedEntry = (mainResponse.data as any)?.involvedEntry;
      console.log('🛰️ backendInvolvedEntry:', backendInvolvedEntry);
      const involvedEntry = backendInvolvedEntry ? {
        _id: backendInvolvedEntry._id || backendInvolvedEntry.id || backendInvolvedEntry.ti,
        id: backendInvolvedEntry.id || backendInvolvedEntry._id || backendInvolvedEntry.ti,
        ti: backendInvolvedEntry.ti || backendInvolvedEntry.id || backendInvolvedEntry._id,
        date: backendInvolvedEntry.date,
        // Use backend party_name - this is the ledger owner party (Commission/Give), not selected party (Rahul)
        partyName: backendInvolvedEntry.party_name || backendInvolvedEntry.partyName,
        party_name: backendInvolvedEntry.party_name || backendInvolvedEntry.partyName,
        // Use transactionPartyName for display (user-selected transaction party - opposite party, Rahul)
        transactionPartyName: backendInvolvedEntry.transactionPartyName || params.entryData.partyName,
        remarks: backendInvolvedEntry.remarks,
        amount: Math.abs(backendInvolvedEntry.credit || backendInvolvedEntry.debit || 0),
        credit: backendInvolvedEntry.credit || 0,
        debit: backendInvolvedEntry.debit || 0,
        balance: backendInvolvedEntry.balance || 0,
        tnsType: backendInvolvedEntry.tns_type || backendInvolvedEntry.tnsType,
        type: (backendInvolvedEntry.tns_type || backendInvolvedEntry.tnsType) === 'CR' ? 'Credit' : 'Debit',
        ...backendInvolvedEntry
      } : null;
      
      
      return {
        mainEntry,
        commissionEntry,
        involvedEntry,
        optimisticEntry: params.optimisticEntry,
        commissionOptimisticEntry: params.commissionEntry,
        optimisticInvolvedEntry: params.involvedEntry
      };
      
    } catch (error: any) {
      console.error('❌ Error adding ledger entry:', error);
      return rejectWithValue(error.message || 'Failed to add entry');
    }
  }
);

// 3. Delete Entries with Optimistic Updates
export const deleteLedgerEntries = createAsyncThunk(
  'ledger/deleteEntries',
  async (params: DeleteEntryParams, { rejectWithValue, dispatch, getState }) => {
    try {
      
      console.log('🔍 Attempting to delete entries with IDs:', params.entryIds);
      
      const deletePromises = params.entryIds.map(async (entryId) => {
        console.log('🔍 Deleting entry with ID:', entryId);
        try {
          const result = await partyLedgerAPI.deleteEntry(String(entryId));
          return { success: true, result, entryId };
        } catch (error: any) {
          // Handle 404 Not Found gracefully - entry might already be deleted
          if (error.message?.includes('404') || error.message?.includes('Not Found')) {
            console.log('⚠️ Entry already deleted or not found:', entryId);
            return { success: true, result: { success: true, message: 'Already deleted' }, entryId };
          }
          // For other errors, mark as failed
          console.error('❌ Failed to delete entry:', entryId, error.message);
          return { success: false, error: error.message, entryId };
        }
      });
      
      const results = await Promise.all(deletePromises);
      
      // Check results
      const successfulDeletions = results.filter(result => result.success);
      const failedDeletions = results.filter(result => !result.success);
      
      
      // Consider it successful if at least some deletions worked or all were already deleted
      if (successfulDeletions.length === 0 && failedDeletions.length > 0) {
        return rejectWithValue('All deletions failed');
      }
      
      
      return {
        deletedIds: params.entryIds,
        successfulCount: successfulDeletions.length,
        failedCount: failedDeletions.length,
        showOldRecords: params.showOldRecords
      };
      
    } catch (error: any) {
      console.error('❌ Error deleting entries:', error);
      return rejectWithValue(error.message || 'Failed to delete entries');
    }
  }
);

// 4. Refresh Ledger Data
export const refreshLedgerData = createAsyncThunk(
  'ledger/refreshData',
  async (partyName: string, { rejectWithValue }) => {
    try {
      
              // Add cache busting as separate query parameter (not in party name)
              const timestamp = Date.now();
              const random = Math.random().toString(36).substr(2, 9);
              const sessionId = Math.random().toString(36).substr(2, 15);
              
              // Pass cache busting parameters separately to avoid URL encoding issues
              const cacheBustParams = {
                _t: timestamp,
                _r: random,
                _cb: `${timestamp}_${random}`,
                _s: sessionId,
                _v: `${timestamp}_${random}`,
                _fresh: true,
                _force: true
              };
              
              const response = await partyLedgerAPI.getPartyLedger(partyName, cacheBustParams);
      
      if (response.success && response.data) {
        const data = response.data as any;
        const ledgerEntries = Array.isArray(data) ? data : (data?.ledgerEntries || []);
        const oldRecords = data?.oldRecords || [];

        const allEntries = [...ledgerEntries, ...oldRecords];
        const computedTotals = allEntries.reduce(
          (acc: { credit: number; debit: number; entries: number }, entry: any) => {
            const credit = Number(entry?.credit || 0);
            const debit = Number(entry?.debit || 0);
            acc.credit += Number.isFinite(credit) ? credit : 0;
            acc.debit += Number.isFinite(debit) ? debit : 0;
            acc.entries += 1;
            return acc;
          },
          { credit: 0, debit: 0, entries: 0 }
        );

        const summary = {
          totalCredit: data?.summary?.totalCredit ?? computedTotals.credit,
          totalDebit: data?.summary?.totalDebit ?? computedTotals.debit,
          calculatedBalance:
            data?.summary?.calculatedBalance ?? computedTotals.credit - computedTotals.debit,
          totalEntries: data?.summary?.totalEntries ?? computedTotals.entries,
        };

        const mondayFinalData = data?.mondayFinalData || {
          transactionCount: 0,
          totalCredit: 0,
          totalDebit: 0,
          startingBalance: 0,
          finalBalance: 0,
        };

        const ledgerData = {
          ledgerEntries,
          oldRecords,
          totalBalance: data?.closingBalance ?? summary.calculatedBalance ?? 0,
          totalDebit: summary.totalDebit,
          totalCredit: summary.totalCredit,
          summary,
          mondayFinalData,
        };

        return ledgerData;
      } else {
        return rejectWithValue(response.message || 'Failed to refresh data');
      }
    } catch (error: any) {
      console.error('❌ Error refreshing ledger data:', error);
      return rejectWithValue(error.message || 'Failed to refresh data');
    }
  }
);

// 5. Monday Final Operations
export const createMondayFinal = createAsyncThunk(
  'ledger/createMondayFinal',
  async (partyNames: string[], { rejectWithValue }) => {
    try {
      console.log('📅 Creating Monday Final for parties:', partyNames);
      
      const response = await partyLedgerAPI.updateMondayFinal(partyNames);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to create Monday Final');
      }
    } catch (error: any) {
      console.error('❌ Error creating Monday Final:', error);
      return rejectWithValue(error.message || 'Failed to create Monday Final');
    }
  }
);

export const deleteMondayFinal = createAsyncThunk(
  'ledger/deleteMondayFinal',
  async (entryId: string, { rejectWithValue }) => {
    try {
      
      const response = await partyLedgerAPI.deleteMondayFinalEntry(entryId);
      
      if (response.success) {
        return response.data;
      } else {
        return rejectWithValue(response.message || 'Failed to delete Monday Final');
      }
    } catch (error: any) {
      console.error('❌ Error deleting Monday Final:', error);
      return rejectWithValue(error.message || 'Failed to delete Monday Final');
    }
  }
);

// 6. Optimistic Update Helpers
export const applyOptimisticAdd = createAsyncThunk(
  'ledger/applyOptimisticAdd',
  async (optimisticData: any, { getState }) => {
    // This thunk just returns the optimistic data
    // The actual API call is handled by addLedgerEntry
    return optimisticData;
  }
);

export const applyOptimisticDelete = createAsyncThunk(
  'ledger/applyOptimisticDelete',
  async (deleteData: any, { getState }) => {
    // This thunk just returns the delete data
    // The actual API call is handled by deleteLedgerEntries
    return deleteData;
  }
);
