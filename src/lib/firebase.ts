import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

// Google Auth Provider (lazy loaded)
export const getGoogleProvider = async () => {
  const { GoogleAuthProvider } = await import('firebase/auth');
  return new GoogleAuthProvider();
};

// Email/Password Authentication functions
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    return { success: false, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
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
    const { signInWithRedirect, getRedirectResult } = await import('firebase/auth');
    const googleProvider = await getGoogleProvider();
    
    // First check if we're returning from a redirect
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult) {
      return { success: true, user: redirectResult.user };
    }
    
    // If no redirect result, start the redirect flow
    await signInWithRedirect(auth, googleProvider);
    return { success: true, user: null }; // Will be handled by redirect
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error.message };
  }
};

// Check for redirect result on page load
export const checkRedirectResult = async () => {
  try {
    const { getRedirectResult } = await import('firebase/auth');
    const result = await getRedirectResult(auth);
    if (result) {
      return { success: true, user: result.user };
    }
    return { success: false, user: null };
  } catch (error: any) {
    console.error('Redirect result check error:', error);
    return { success: false, error: error.message };
  }
};

export const signOutUser = async () => {
  try {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message };
  }
};


// Update Password function
export const updateUserPassword = async (newPassword: string) => {
  try {
    const { updatePassword } = await import('firebase/auth');
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    await updatePassword(user, newPassword);
    
    return { success: true, message: 'Password updated successfully' };
  } catch (error: any) {
    console.error('Password update error:', error);
    return { success: false, error: error.message };
  }
};


// Update User Profile function
export const updateUserProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
  try {
    const { updateProfile } = await import('firebase/auth');
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


// Send Email Verification function
export const sendEmailVerificationToUser = async () => {
  try {
    const { sendEmailVerification } = await import('firebase/auth');
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
export const onAuthStateChange = async (callback: (user: any) => void) => {
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = (): any => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

export default app;
