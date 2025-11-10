# Redux API Services

This directory contains Redux Thunk actions for API operations, providing a centralized way to handle all API calls with proper state management, error handling, and optimistic updates.

## 📁 File Structure

```
src/store/services/
├── ledgerService.ts      # Ledger-related API operations
├── partiesService.ts     # Parties-related API operations
├── uiService.ts          # UI state management operations
└── README.md            # This documentation
```

## 🚀 Features

### ✅ Centralized API Management
- All API calls are handled through Redux Thunk actions
- Consistent error handling across the application
- Automatic loading state management

### ✅ Optimistic Updates
- Instant UI feedback for better user experience
- Automatic rollback on API failures
- Seamless integration with Redux state

### ✅ Type Safety
- Full TypeScript support
- Proper typing for all API responses
- IntelliSense support for better development experience

## 📋 Available Services

### 1. Ledger Service (`ledgerService.ts`)

#### Actions:
- `fetchPartyLedger(partyName)` - Fetch ledger data for a party
- `addLedgerEntry(params)` - Add new entry with optimistic updates
- `deleteLedgerEntries(params)` - Delete entries with optimistic updates
- `refreshLedgerData(partyName)` - Force refresh ledger data
- `createMondayFinal(partyNames)` - Create Monday Final settlement
- `deleteMondayFinal(entryId)` - Delete Monday Final entry
- `applyOptimisticAdd(data)` - Apply optimistic add update
- `applyOptimisticDelete(data)` - Apply optimistic delete update

#### Usage Example:
```typescript
import { useAppDispatch } from '../hooks/redux';
import { fetchPartyLedger, addLedgerEntry } from '../store/services/ledgerService';

const MyComponent = () => {
  const dispatch = useAppDispatch();

  // Fetch ledger data
  const loadLedger = () => {
    dispatch(fetchPartyLedger('Party Name'));
  };

  // Add entry with optimistic updates
  const addEntry = async () => {
    const result = await dispatch(addLedgerEntry({
      entryData: {
        partyName: 'Test Party',
        amount: 1000,
        remarks: 'Test transaction',
        tnsType: 'CR',
        credit: 1000,
        debit: 0,
        date: '2024-01-01',
        ti: 'GROUP_123',
        involvedParty: 'Test Party'
      },
      optimisticEntry: optimisticData,
      commissionEntry: null
    }));

    if (addLedgerEntry.fulfilled.match(result)) {
      console.log('Entry added successfully');
    }
  };
};
```

### 2. Parties Service (`partiesService.ts`)

#### Actions:
- `fetchAllParties()` - Fetch all available parties
- `filterParties(params)` - Filter parties by search term
- `getPartySuggestions(params)` - Get party suggestions for auto-complete
- `refreshParties()` - Refresh parties data
- `clearPartiesSearch(params)` - Clear parties search

#### Usage Example:
```typescript
import { fetchAllParties, filterParties } from '../store/services/partiesService';

const MyComponent = () => {
  const dispatch = useAppDispatch();

  // Load parties on mount
  useEffect(() => {
    dispatch(fetchAllParties());
  }, [dispatch]);

  // Filter parties
  const handleSearch = (searchTerm: string) => {
    dispatch(filterParties({
      searchTerm,
      availableParties,
      excludeCurrentParty: selectedParty,
      isTopSection: true
    }));
  };
};
```

### 3. UI Service (`uiService.ts`)

#### Actions:
- `updateTransactionForm(data)` - Update transaction form data
- `clearTransactionForm()` - Clear transaction form
- `updatePartySelection(params)` - Update party selection
- `updateDropdownState(params)` - Update dropdown state
- `updateEntrySelection(params)` - Update entry selection
- `clearAllSelections()` - Clear all selections
- `updateHighlightedIndex(params)` - Update highlighted index
- `updateLoadingState(params)` - Update loading state
- `updateFilters(params)` - Update filters
- `resetUIState()` - Reset UI state

#### Usage Example:
```typescript
import { updateTransactionForm, clearTransactionForm } from '../store/services/uiService';

const MyComponent = () => {
  const dispatch = useAppDispatch();

  // Update form field
  const handleFieldChange = (field: string, value: string) => {
    dispatch(updateTransactionForm({ [field]: value }));
  };

  // Clear form
  const handleClearForm = () => {
    dispatch(clearTransactionForm());
  };
};
```

## 🔄 Migration from Direct API Calls

### Before (Direct API Calls):
```typescript
// ❌ Old way - Direct API calls in component
const handleAddEntry = async () => {
  try {
    const response = await partyLedgerAPI.addEntry(data);
    if (response.success) {
      // Manual state update
      dispatch(ledgerSlice.actions.setLedgerData(newData));
    }
  } catch (error) {
    // Manual error handling
    console.error(error);
  }
};
```

### After (Redux Thunk Actions):
```typescript
// ✅ New way - Redux Thunk actions
const handleAddEntry = async () => {
  const result = await dispatch(addLedgerEntry({
    entryData: data,
    optimisticEntry: optimisticData,
    commissionEntry: commissionData
  }));

  if (addLedgerEntry.fulfilled.match(result)) {
    console.log('Entry added successfully');
  }
  // Error handling is automatic via Redux
};
```

## 🎯 Benefits

### 1. **Better State Management**
- Centralized state updates
- Consistent loading and error states
- Automatic state synchronization

### 2. **Improved Error Handling**
- Standardized error handling across the app
- Automatic error state management
- Better error reporting and debugging

### 3. **Optimistic Updates**
- Instant UI feedback
- Better user experience
- Automatic rollback on failures

### 4. **Code Reusability**
- API logic can be reused across components
- Consistent API calling patterns
- Easier testing and maintenance

### 5. **Type Safety**
- Full TypeScript support
- Compile-time error checking
- Better IntelliSense support

## 🧪 Testing

### Testing Redux Thunk Actions:
```typescript
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { fetchPartyLedger } from '../store/services/ledgerService';

test('should fetch party ledger', async () => {
  const { result } = renderHook(() => useAppDispatch(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
  });

  await act(async () => {
    const result = await result.current(fetchPartyLedger('Test Party'));
    expect(fetchPartyLedger.fulfilled.match(result)).toBe(true);
  });
});
```

## 📚 Best Practices

### 1. **Always Use Redux Thunk Actions**
- Don't make direct API calls in components
- Use the appropriate service action for each operation
- Leverage Redux state management

### 2. **Handle Loading States**
- Use the loading state from Redux
- Show appropriate loading indicators
- Disable buttons during API calls

### 3. **Error Handling**
- Check for fulfilled/rejected action types
- Display user-friendly error messages
- Log errors for debugging

### 4. **Optimistic Updates**
- Use optimistic updates for better UX
- Always handle rollback scenarios
- Validate data before applying optimistic updates

### 5. **Type Safety**
- Use proper TypeScript types
- Define interfaces for API responses
- Use type guards for runtime validation

## 🔧 Configuration

### Redux Store Setup:
```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { ledgerSlice } from './slices/ledgerSlice';
import { partiesSlice } from './slices/partiesSlice';
import { uiSlice } from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    ledger: ledgerSlice.reducer,
    parties: partiesSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});
```

## 🚀 Getting Started

1. **Import the service actions** in your component:
```typescript
import { fetchPartyLedger, addLedgerEntry } from '../store/services/ledgerService';
```

2. **Use useAppDispatch hook**:
```typescript
import { useAppDispatch } from '../hooks/redux';
const dispatch = useAppDispatch();
```

3. **Dispatch the action**:
```typescript
const result = await dispatch(fetchPartyLedger('Party Name'));
```

4. **Handle the result**:
```typescript
if (fetchPartyLedger.fulfilled.match(result)) {
  console.log('Success:', result.payload);
} else {
  console.error('Error:', result.payload);
}
```

## 📞 Support

For questions or issues with Redux API services, please refer to:
- Redux Toolkit documentation
- Redux Thunk documentation
- TypeScript documentation
- Project README

---

**Happy Coding! 🎉**
