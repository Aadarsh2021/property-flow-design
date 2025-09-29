import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Convenience hooks for specific slices
export const useAuth = () => useAppSelector(state => state.auth);
export const useLedger = () => useAppSelector(state => state.ledger);
export const useParties = () => useAppSelector(state => state.parties);
export const useUI = () => useAppSelector(state => state.ui);

// Specific selectors for common use cases
export const useAuthUser = () => useAppSelector(state => state.auth.user);
export const useIsAuthenticated = () => useAppSelector(state => state.auth.isAuthenticated);
export const useCompanyName = () => useAppSelector(state => state.auth.companyName);

export const useLedgerData = () => useAppSelector(state => state.ledger.data);
export const useSelectedPartyName = () => useAppSelector(state => state.ledger.selectedPartyName);
export const useLedgerLoading = () => useAppSelector(state => state.ledger.isLoading);

export const useAvailableParties = () => useAppSelector(state => state.parties.availableParties);
export const useFilteredParties = () => useAppSelector(state => state.parties.filteredParties);
export const usePartiesLoading = () => useAppSelector(state => state.parties.isLoading);

export const useIsLoading = () => useAppSelector(state => state.ui.isLoading);
export const useIsActionLoading = () => useAppSelector(state => state.ui.isActionLoading);
export const useToasts = () => useAppSelector(state => state.ui.toasts);
export const useTheme = () => useAppSelector(state => state.ui.theme);
