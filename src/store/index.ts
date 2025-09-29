import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { authSlice } from './slices/authSlice';
import { ledgerSlice } from './slices/ledgerSlice';
import { partiesSlice } from './slices/partiesSlice';
import { uiSlice } from './slices/uiSlice';
import { listenerMiddleware } from './middleware/apiMiddleware';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    ledger: ledgerSlice.reducer,
    parties: partiesSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }).prepend(listenerMiddleware.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
