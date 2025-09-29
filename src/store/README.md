# Redux Store Documentation

This document explains the Redux store setup for the Account Ledger application.

## Overview

The Redux store is organized into four main slices:
- **Auth**: User authentication and company information
- **Ledger**: Ledger data, entries, and party selection
- **Parties**: Party management and filtering
- **UI**: User interface state, modals, and notifications

## Store Structure

```
store/
├── index.ts                 # Store configuration and typed hooks
├── slices/
│   ├── authSlice.ts         # Authentication state
│   ├── ledgerSlice.ts       # Ledger data and entries
│   ├── partiesSlice.ts      # Party management
│   └── uiSlice.ts           # UI state and notifications
├── middleware/
│   └── apiMiddleware.ts     # API integration middleware
└── README.md               # This documentation
```

## Usage Examples

### Basic Usage

```typescript
import { useAppDispatch, useAppSelector } from '../hooks/redux';

function MyComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const isLoading = useAppSelector(state => state.ui.isLoading);

  const handleLogin = () => {
    dispatch(authSlice.actions.setUser(userData));
  };

  return (
    <div>
      {user && <p>Welcome, {user.displayName}!</p>}
      {isLoading && <p>Loading...</p>}
    </div>
  );
}
```

### Using Convenience Hooks

```typescript
import { useAuth, useLedger, useParties, useUI } from '../hooks/redux';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  const { data: ledgerData, isLoading } = useLedger();
  const { availableParties } = useParties();
  const { toasts } = useUI();

  // Component logic...
}
```

## Slice Details

### Auth Slice (`authSlice.ts`)

**State:**
- `user`: Current user object
- `isAuthenticated`: Authentication status
- `isLoading`: Loading state for auth operations
- `error`: Error messages
- `companyName`: Selected company name

**Key Actions:**
- `setUser(user)`: Set current user
- `logout()`: Clear user and reset state
- `setCompanyName(name)`: Update company name
- `setError(message)`: Set error message

### Ledger Slice (`ledgerSlice.ts`)

**State:**
- `data`: Ledger data with entries and totals
- `isLoading`: Loading state
- `selectedPartyName`: Currently selected party
- `filters`: Date and search filters
- `pagination`: Pagination settings

**Key Actions:**
- `setLedgerData(data)`: Set ledger data
- `setSelectedPartyName(name)`: Select party
- `addEntry(entry)`: Add new entry
- `updateEntry(id, updates)`: Update existing entry
- `deleteEntry(id)`: Remove entry
- `setFilters(filters)`: Apply filters

### Parties Slice (`partiesSlice.ts`)

**State:**
- `availableParties`: All available parties
- `filteredParties`: Filtered party list
- `isLoading`: Loading state
- `searchTerm`: Current search term
- `selectedParty`: Currently selected party

**Key Actions:**
- `setParties(parties)`: Set party list
- `addParty(party)`: Add new party
- `updateParty(id, updates)`: Update party
- `deleteParty(id)`: Remove party
- `filterParties(options)`: Filter parties
- `setSearchTerm(term)`: Set search term

### UI Slice (`uiSlice.ts`)

**State:**
- `isLoading`: Global loading state
- `isActionLoading`: Action-specific loading
- Modal states (`isTransactionModalOpen`, etc.)
- Dropdown states (`showPartyDropdown`, etc.)
- Toast notifications
- Theme settings

**Key Actions:**
- `setLoading(boolean)`: Set loading state
- `setTransactionModalOpen(boolean)`: Control modals
- `addToast(toast)`: Add notification
- `setTheme(theme)`: Change theme
- `closeAllModals()`: Close all modals

## Middleware

### API Middleware (`apiMiddleware.ts`)

The middleware automatically handles:
- Loading ledger data when party selection changes
- Loading parties when company changes
- Showing success toasts for CRUD operations
- Auto-removing toasts after timeout

## Best Practices

### 1. Use Typed Hooks

Always use the typed hooks from `hooks/redux.ts`:

```typescript
// ✅ Good
import { useAppDispatch, useAppSelector } from '../hooks/redux';

// ❌ Avoid
import { useDispatch, useSelector } from 'react-redux';
```

### 2. Select Specific Data

Be specific with selectors to avoid unnecessary re-renders:

```typescript
// ✅ Good - specific selector
const user = useAppSelector(state => state.auth.user);

// ❌ Avoid - selecting entire slice
const auth = useAppSelector(state => state.auth);
```

### 3. Use Convenience Hooks

For commonly used data, use the convenience hooks:

```typescript
// ✅ Good
const user = useAuthUser();
const isAuthenticated = useIsAuthenticated();

// ❌ Verbose
const user = useAppSelector(state => state.auth.user);
const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
```

### 4. Handle Loading States

Always handle loading states in your components:

```typescript
const isLoading = useAppSelector(state => state.ledger.isLoading);

if (isLoading) {
  return <LoadingSpinner />;
}
```

### 5. Error Handling

Use the error states from the store:

```typescript
const error = useAppSelector(state => state.ledger.error);

if (error) {
  return <ErrorMessage message={error} />;
}
```

## Integration with Existing Code

### Replacing Local State

You can gradually replace local state with Redux:

```typescript
// Before (local state)
const [isLoading, setIsLoading] = useState(false);
const [parties, setParties] = useState([]);

// After (Redux)
const isLoading = useAppSelector(state => state.parties.isLoading);
const parties = useAppSelector(state => state.parties.availableParties);
```

### API Integration

The middleware automatically handles API calls, but you can also dispatch actions manually:

```typescript
const dispatch = useAppDispatch();

const loadParties = async () => {
  dispatch(partiesSlice.actions.setLoading(true));
  try {
    const response = await partyLedgerAPI.getAllParties();
    if (response.success) {
      dispatch(partiesSlice.actions.setParties(response.data));
    }
  } catch (error) {
    dispatch(partiesSlice.actions.setError('Failed to load parties'));
  } finally {
    dispatch(partiesSlice.actions.setLoading(false));
  }
};
```

## Development Tools

### Redux DevTools

The store is configured with Redux DevTools for development. Install the browser extension to:
- Inspect state changes
- Time-travel debug
- View action history
- Export/import state

### TypeScript Support

Full TypeScript support is provided:
- Typed actions and reducers
- Typed selectors
- Type-safe dispatch
- IntelliSense support

## Performance Considerations

### Memoization

For expensive selectors, consider using `createSelector`:

```typescript
import { createSelector } from '@reduxjs/toolkit';

const selectFilteredParties = createSelector(
  [state => state.parties.availableParties, state => state.parties.filters],
  (parties, filters) => {
    // Expensive filtering logic
    return parties.filter(/* ... */);
  }
);
```

### Avoiding Unnecessary Re-renders

Use specific selectors and consider memoizing components:

```typescript
import { memo } from 'react';

const PartyList = memo(({ parties }: { parties: Party[] }) => {
  // Component logic
});
```

## Troubleshooting

### Common Issues

1. **State not updating**: Check if actions are properly dispatched
2. **Unnecessary re-renders**: Use specific selectors
3. **TypeScript errors**: Ensure proper typing with `useAppSelector`
4. **Middleware not working**: Check if middleware is properly configured

### Debug Tips

1. Use Redux DevTools to inspect state changes
2. Add console.log statements in reducers
3. Check browser console for Redux-related errors
4. Verify action types and payloads

## Migration Guide

When migrating existing components to Redux:

1. Identify local state that should be global
2. Move state to appropriate slice
3. Replace `useState` with `useAppSelector`
4. Replace state setters with `dispatch` calls
5. Update component props and interfaces
6. Test thoroughly

## Future Enhancements

Potential improvements:
- Add Redux Persist for state persistence
- Implement RTK Query for API state management
- Add more sophisticated caching
- Implement optimistic updates
- Add state normalization for complex data
