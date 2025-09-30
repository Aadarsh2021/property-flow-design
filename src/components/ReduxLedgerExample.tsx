/**
 * Redux Ledger Example Component
 * 
 * Demonstrates how to use Redux Thunk actions for API operations
 * instead of direct API calls in components.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { 
  fetchPartyLedger, 
  addLedgerEntry, 
  deleteLedgerEntries, 
  refreshLedgerData,
  applyOptimisticAdd,
  applyOptimisticDelete
} from '../store/services/ledgerService';
import { fetchAllParties, filterParties } from '../store/services/partiesService';
import { updateTransactionForm, clearTransactionForm } from '../store/services/uiService';

const ReduxLedgerExample: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const { data: ledgerData, isLoading, error } = useAppSelector(state => state.ledger);
  const { availableParties, filteredParties } = useAppSelector(state => state.parties);
  const { selectedPartyName } = useAppSelector(state => state.ledger);
  const { selectedEntries } = useAppSelector(state => state.ui);

  // Example: Load parties on component mount
  useEffect(() => {
    dispatch(fetchAllParties());
  }, [dispatch]);

  // Example: Load ledger data when party changes
  useEffect(() => {
    if (selectedPartyName) {
      dispatch(fetchPartyLedger(selectedPartyName));
    }
  }, [selectedPartyName, dispatch]);

  // Example: Add entry with optimistic updates
  const handleAddEntry = async () => {
    const formData = {
      partyName: 'Test Party',
      amount: 1000,
      remarks: 'Test transaction',
      tnsType: 'CR' as const,
      credit: 1000,
      debit: 0,
      date: new Date().toISOString().split('T')[0],
      ti: `GROUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      involvedParty: 'Test Party'
    };

    // Create optimistic entry
    const optimisticEntry = {
      _id: `temp_${Date.now()}`,
      id: `temp_${Date.now()}`,
      ti: `temp_${Date.now()}`,
      date: formData.date,
      partyName: selectedPartyName,
      remarks: `${formData.partyName}: ${formData.remarks}`,
      amount: formData.amount,
      credit: formData.credit,
      debit: formData.debit,
      balance: 0,
      tnsType: formData.tnsType,
      type: 'Credit',
      isOptimistic: true
    };

    try {
      // 1. Apply optimistic update immediately
      await dispatch(applyOptimisticAdd({
        optimisticEntry,
        commissionEntry: null
      }));

      // 2. Call API to add entry
      const result = await dispatch(addLedgerEntry({
        entryData: formData,
        optimisticEntry,
        commissionEntry: null
      }));

      if (addLedgerEntry.fulfilled.match(result)) {
        console.log('✅ Entry added successfully:', result.payload);
      } else {
        console.error('❌ Failed to add entry:', result.payload);
      }
    } catch (error) {
      console.error('❌ Error adding entry:', error);
    }
  };

  // Example: Delete entries with optimistic updates
  const handleDeleteEntries = async () => {
    if (selectedEntries.length === 0) return;

    try {
      // 1. Apply optimistic delete immediately
      await dispatch(applyOptimisticDelete({
        deletedIds: selectedEntries,
        showOldRecords: false
      }));

      // 2. Call API to delete entries
      const result = await dispatch(deleteLedgerEntries({
        entryIds: selectedEntries,
        showOldRecords: false
      }));

      if (deleteLedgerEntries.fulfilled.match(result)) {
        console.log('✅ Entries deleted successfully:', result.payload);
      } else {
        console.error('❌ Failed to delete entries:', result.payload);
      }
    } catch (error) {
      console.error('❌ Error deleting entries:', error);
    }
  };

  // Example: Filter parties
  const handleFilterParties = (searchTerm: string) => {
    dispatch(filterParties({
      searchTerm,
      availableParties,
      excludeCurrentParty: selectedPartyName,
      isTopSection: true
    }));
  };

  // Example: Refresh data
  const handleRefresh = () => {
    if (selectedPartyName) {
      dispatch(refreshLedgerData(selectedPartyName));
    }
  };

  // Example: Update transaction form
  const handleUpdateForm = (field: string, value: string) => {
    dispatch(updateTransactionForm({ [field]: value }));
  };

  // Example: Clear form
  const handleClearForm = () => {
    dispatch(clearTransactionForm());
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Redux API Integration Example</h2>
      
      {/* Loading State */}
      {isLoading && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-600">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Party Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Party Selection
        </label>
        <input
          type="text"
          placeholder="Search parties..."
          onChange={(e) => handleFilterParties(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            Available parties: {availableParties.length} | 
            Filtered: {filteredParties.length}
          </p>
        </div>
      </div>

      {/* Ledger Data */}
      {ledgerData && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Ledger Data</h3>
          <p>Total Balance: ₹{ledgerData.totalBalance?.toLocaleString()}</p>
          <p>Total Credit: ₹{ledgerData.totalCredit?.toLocaleString()}</p>
          <p>Total Debit: ₹{ledgerData.totalDebit?.toLocaleString()}</p>
          <p>Current Entries: {ledgerData.ledgerEntries?.length || 0}</p>
          <p>Old Records: {ledgerData.oldRecords?.length || 0}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-x-4">
        <button
          onClick={handleAddEntry}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Add Entry (Redux)
        </button>
        
        <button
          onClick={handleDeleteEntries}
          disabled={isLoading || selectedEntries.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          Delete Selected ({selectedEntries.length})
        </button>
        
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh Data
        </button>
        
        <button
          onClick={handleClearForm}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Clear Form
        </button>
      </div>

      {/* Form Fields */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Party Name
          </label>
          <input
            type="text"
            placeholder="Enter party name"
            onChange={(e) => handleUpdateForm('partyName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            placeholder="Enter amount"
            onChange={(e) => handleUpdateForm('amount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks
          </label>
          <input
            type="text"
            placeholder="Enter remarks"
            onChange={(e) => handleUpdateForm('remarks', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">How to Use Redux API Integration:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Use <code>dispatch(thunkAction())</code> instead of direct API calls</li>
          <li>• Redux handles loading states, errors, and optimistic updates</li>
          <li>• All API operations are centralized in service files</li>
          <li>• Better error handling and state management</li>
          <li>• Optimistic updates for better UX</li>
        </ul>
      </div>
    </div>
  );
};

export default ReduxLedgerExample;
