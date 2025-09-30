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
import { partyLedgerAPI, unsettleTransactions } from '../../lib/api';
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
        _v: `${timestamp}_${random}`
      };
      
      const response = await partyLedgerAPI.getPartyLedger(partyName, cacheBustParams);
      
      if (response.success && response.data) {
        const data = response.data as any;
        const ledgerEntries = Array.isArray(data) ? data : (data?.ledgerEntries || []);
        const oldRecords = data?.oldRecords || [];
        
        const ledgerData = {
          ledgerEntries,
          oldRecords,
          totalBalance: data?.closingBalance || 0,
          totalDebit: data?.summary?.totalDebit || 0,
          totalCredit: data?.summary?.totalCredit || 0,
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
      
      if (!mainResponse.success) {
        return rejectWithValue(mainResponse.message || 'Failed to add main entry');
      }
      
      
      // Add commission entry if exists
      let commissionResponse = null;
      if (params.commissionEntry) {
        const commissionEntryData = {
          partyName: params.entryData.partyName,
          amount: params.commissionEntry.amount,
          remarks: params.commissionEntry.remarks,
          tnsType: params.commissionEntry.tnsType,
          credit: params.commissionEntry.credit,
          debit: params.commissionEntry.debit,
          date: params.entryData.date,
          ti: `GROUP_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
          involvedParty: 'Commission'
        };
        
        commissionResponse = await partyLedgerAPI.addEntry(commissionEntryData);
        
        if (!commissionResponse.success) {
          console.warn('⚠️ Commission entry failed:', commissionResponse.message);
        } else {
        }
      }
      
      // Create proper entry data structure using REAL backend IDs
      console.log('🔍 Backend Response Data:', mainResponse.data);
      console.log('🔍 Main Entry from Backend:', (mainResponse.data as any)?.mainEntry);
      console.log('🔍 Main Entry Party Name:', (mainResponse.data as any)?.mainEntry?.party_name);
      console.log('🔍 Involved Entry from Backend:', (mainResponse.data as any)?.involvedEntry);
      console.log('🔍 Involved Entry Party Name (Backend):', (mainResponse.data as any)?.involvedEntry?.party_name);
      console.log('🔍 Transaction Group ID:', (mainResponse.data as any)?.transactionGroupId);
      console.log('🔍 Total Entries Created:', (mainResponse.data as any)?.totalEntries);
      
      const mainEntry = {
        _id: (mainResponse.data as any)?.mainEntry?._id || (mainResponse.data as any)?.mainEntry?.id || (mainResponse.data as any)?.mainEntry?.ti,
        id: (mainResponse.data as any)?.mainEntry?.id || (mainResponse.data as any)?.mainEntry?._id || (mainResponse.data as any)?.mainEntry?.ti,
        ti: (mainResponse.data as any)?.mainEntry?.ti || (mainResponse.data as any)?.mainEntry?.id || (mainResponse.data as any)?.mainEntry?._id,
        date: params.entryData.date,
        partyName: params.entryData.partyName,
        remarks: params.entryData.remarks,
        amount: params.entryData.amount,
        credit: params.entryData.credit,
        debit: params.entryData.debit,
        balance: params.entryData.credit - params.entryData.debit,
        tnsType: params.entryData.tnsType,
        type: params.entryData.tnsType === 'CR' ? 'Credit' : 'Debit',
        ...mainResponse.data
      };
      
      console.log('🔍 Constructed Main Entry with Real IDs:', mainEntry);

      const commissionEntry = commissionResponse?.data ? {
        _id: commissionResponse.data._id || commissionResponse.data.id || commissionResponse.data.ti,
        id: commissionResponse.data.id || commissionResponse.data._id || commissionResponse.data.ti,
        ti: commissionResponse.data.ti || commissionResponse.data.id || commissionResponse.data._id,
        date: params.entryData.date,
        partyName: params.entryData.partyName,
        remarks: params.commissionEntry?.remarks || 'Commission',
        amount: params.commissionEntry?.amount || 0,
        credit: params.commissionEntry?.credit || 0,
        debit: params.commissionEntry?.debit || 0,
        balance: (params.commissionEntry?.credit || 0) - (params.commissionEntry?.debit || 0),
        tnsType: params.commissionEntry?.tnsType || 'CR',
        type: params.commissionEntry?.tnsType === 'CR' ? 'Credit' : 'Debit',
        ...commissionResponse.data
      } : null;

      // Also create involvedEntry if it exists
      const involvedEntry = (mainResponse.data as any)?.involvedEntry ? {
        _id: (mainResponse.data as any).involvedEntry._id || (mainResponse.data as any).involvedEntry.id || (mainResponse.data as any).involvedEntry.ti,
        id: (mainResponse.data as any).involvedEntry.id || (mainResponse.data as any).involvedEntry._id || (mainResponse.data as any).involvedEntry.ti,
        ti: (mainResponse.data as any).involvedEntry.ti || (mainResponse.data as any).involvedEntry.id || (mainResponse.data as any).involvedEntry._id,
        ...(mainResponse.data as any).involvedEntry,
        // Override with correct party name - involved entry should show the selected party name
        // For dual-party transactions: involved entry should show the party who initiated the transaction
        partyName: params.selectedPartyName, // This will be "Rahul" - the selected party
        party_name: params.selectedPartyName
      } : null;
      
      console.log('🔍 Constructed Involved Entry:', involvedEntry);
      
      if (involvedEntry) {
        console.log('🔍 Involved Entry Party Name:', involvedEntry.partyName);
        console.log('🔍 Involved Entry Type:', involvedEntry.type);
        console.log('🔍 Involved Entry Amount:', involvedEntry.amount);
        console.log('🔍 Original Backend Party Name:', (mainResponse.data as any).involvedEntry.party_name);
        console.log('🔍 Selected Party Name:', params.selectedPartyName);
        console.log('🔍 Overridden Party Name:', involvedEntry.partyName);
        console.log('🔍 Expected: Involved entry should show selected party name (Rahul) in Give table');
      }
      
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
      
      console.log('🔍 Delete Results:', {
        total: results.length,
        successful: successfulDeletions.length,
        failed: failedDeletions.length
      });
      
      // Consider it successful if at least some deletions worked or all were already deleted
      if (successfulDeletions.length > 0 || failedDeletions.length === 0) {
        console.log('✅ Delete operation completed successfully');
      } else {
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
        
        const ledgerData = {
          ledgerEntries,
          oldRecords,
          totalBalance: data?.closingBalance || 0,
          totalDebit: data?.summary?.totalDebit || 0,
          totalCredit: data?.summary?.totalCredit || 0,
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
      
      const response = await unsettleTransactions(partyNames);
      
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
