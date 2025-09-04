import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Email/Password Authentication functions
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    return { success: false, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return { success: false, error: error.message };
  }
};

// Google Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error.message };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message };
  }
};

// Password Reset function with database sync
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/firebase-reset?email=${encodeURIComponent(email)}`
    });
    
    // Store email for password sync after reset
    localStorage.setItem('pendingPasswordReset', email);
    
    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

// Update Password function with database sync
export const updateUserPassword = async (newPassword: string) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    await updatePassword(user, newPassword);
    
    // Sync with database
    await syncPasswordWithDatabase(user.email, newPassword);
    
    return { success: true, message: 'Password updated successfully in both systems' };
  } catch (error: any) {
    console.error('Password update error:', error);
    return { success: false, error: error.message };
  }
};

// Sync password with database
export const syncPasswordWithDatabase = async (email: string, password: string) => {
  try {
    console.log('🔄 [SYNC] Starting password sync for:', email);
    console.log('🔄 [SYNC] Password length:', password.length);
    
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api'}/authentication/sync-password`;
    console.log('📡 [SYNC] API URL:', apiUrl);
    
    const requestBody = {
      email: email,
      newPassword: password
    };
    console.log('📤 [SYNC] Request body:', JSON.stringify(requestBody, null, 2));
    
    console.log('📡 [SYNC] Making API call...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📊 [SYNC] Response status:', response.status);
    console.log('📊 [SYNC] Response status text:', response.statusText);
    console.log('📊 [SYNC] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SYNC] HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('📥 [SYNC] Response data:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ [SYNC] Password synced with database successfully!');
      return { success: true };
    } else {
      console.error('❌ [SYNC] Database sync failed:', result.message);
      console.error('❌ [SYNC] Full error result:', JSON.stringify(result, null, 2));
      return { success: false, error: result.message };
    }
  } catch (error: any) {
    console.error('❌ [SYNC] Database sync exception!');
    console.error('❌ [SYNC] Error type:', typeof error);
    console.error('❌ [SYNC] Error message:', error.message);
    console.error('❌ [SYNC] Error stack:', error.stack);
    console.error('❌ [SYNC] Full error object:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
};

// Update User Profile function
export const updateUserProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    await updateProfile(user, profileData);
    return { success: true, message: 'Profile updated successfully' };
  } catch (error: any) {
    console.error('Profile update error:', error);
    return { success: false, error: error.message };
  }
};

// Password sync is now handled by dedicated reset pages
// No need for global monitoring since we have specific reset flows

// Send Email Verification function
export const sendEmailVerificationToUser = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    if (user.emailVerified) {
      return { success: false, error: 'Email is already verified' };
    }
    
    await sendEmailVerification(user);
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error: any) {
    console.error('Email verification error:', error);
    return { success: false, error: error.message };
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

export default app;
