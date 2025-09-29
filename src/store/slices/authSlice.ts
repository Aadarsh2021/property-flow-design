import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
  isApproved?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  companyName: string;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  companyName: 'Company',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Authentication actions
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.companyName = 'Company';
    },
    setCompanyName: (state, action: PayloadAction<string>) => {
      state.companyName = action.payload;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setUser,
  setError,
  logout,
  setCompanyName,
  updateUserProfile,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
