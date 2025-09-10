/**
 * Login Page
 * 
 * User authentication page for the Property Flow Design application.
 * Handles user login with email and password validation.
 * 
 * Features:
 * - Email and password authentication
 * - Google OAuth authentication
 * - Form validation and error handling
 * - Remember me functionality
 * - Registration link
 * - Responsive design
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Lock, User, Building2, Home, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [loadingMessage, setLoadingMessage] = useState('Signing In...');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get the page user was trying to access
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (login && typeof login === 'function') {
      // Check if user is already authenticated
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        // User is already authenticated, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [login, navigate]);

  // Validation function
  const validateField = useCallback((name: string, value: string) => {
    const errors: {[key: string]: string} = {};
    
    switch (name) {
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (value.trim().length > 100) {
          errors.email = 'Email cannot be more than 100 characters';
        } else if (value.includes(' ')) {
          errors.email = 'Email cannot contain spaces';
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 1) {
          errors.password = 'Password cannot be empty';
        } else if (value.length > 50) {
          errors.password = 'Password cannot be more than 50 characters';
        } else if (value.includes(' ')) {
          errors.password = 'Password cannot contain spaces';
        }
        break;
    }
    
    return errors;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear general error when user types
    setError('');
    
    // Validate field immediately
    const fieldErrors = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      ...fieldErrors
    }));
  };

  // Handle autofill events
  const handleAutofill = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors
    setError('');
    
    // Validate the field
    const fieldErrors = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      ...fieldErrors
    }));
  };

  // Handle input events (including autofill)
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear general error when user types
    setError('');
    
    // Validate field immediately
    const fieldErrors = validateField(name, value);
    
    // Clear validation errors for this field if no errors found
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (Object.keys(fieldErrors).length === 0) {
        delete newErrors[name];
      } else {
        newErrors[name] = fieldErrors[name];
      }
      return newErrors;
    });
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isFormValid && !loading && !googleLoading) {
        handleSubmit(e as any);
      }
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    Object.keys(formData).forEach(key => {
      const fieldErrors = validateField(key, formData[key as keyof typeof formData]);
      Object.assign(errors, fieldErrors);
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    
    try {
      // Starting Google authentication...
      
      // Step 1: Authenticate with Google via Firebase
      const googleResult = await signInWithGoogle();
      
      if (!googleResult.success) {
        console.error('❌ Google authentication failed:', googleResult.error);
        setError(googleResult.error || 'Google authentication failed');
        return;
      }

              // Google authentication successful
      
      // Step 2: Check if user exists in PostgreSQL backend
      const userEmail = googleResult.user.email;
      if (!userEmail) {
        setError('Google account email not found');
        return;
      }

      // Step 3: Try to authenticate with backend (user might already exist)
      try {
        const response = await authAPI.googleLogin({
          email: userEmail,
          googleId: googleResult.user.uid,
          fullname: googleResult.user.displayName || '',
          profilePicture: googleResult.user.photoURL || ''
        });
        
        if (response.success) {
          // Backend authentication successful
          
          // Use AuthContext to handle login
          login(response.data.token, response.data.user);
          
          // Check if user needs initial setup
          // User needs setup if: no company account OR created very recently (within 5 minutes)
          const userNeedsSetup = !response.data.user.company_account || 
            (response.data.user.created_at && new Date(response.data.user.created_at) > new Date(Date.now() - 5 * 60 * 1000));
          
          if (userNeedsSetup) {
            toast({
              title: "🎉 Google Login Successful!",
              description: "Please complete your initial setup to get started.",
            });
            navigate('/user-settings', { replace: true });
          } else {
            toast({
              title: "🎉 Google Login Successful!",
              description: "Welcome back!",
            });
            // Navigate to the page user was trying to access or home
            navigate(from, { replace: true });
          }
        } else if (response.message && response.message.includes('pending admin approval')) {
          // Show approval pending message
          toast({
            title: "⏳ Account Pending Approval",
            description: "Your account is pending admin approval. Please wait for approval before logging in.",
            variant: "destructive"
          });
          return;
        } else {
          // Check if it's an approval error
          if (response.message && response.message.includes('pending admin approval')) {
            toast({
              title: "⏳ Account Pending Approval",
              description: "Your account is pending admin approval. Please wait for approval before logging in.",
              variant: "destructive"
            });
            return;
          }
          
          // User doesn't exist in backend, create account
          // Creating new user account for Google user...
          
          const createResponse = await authAPI.register({
            fullname: googleResult.user.displayName || 'Google User',
            email: userEmail,
            phone: googleResult.user.phoneNumber || '',
            password: '', // No password for Google users
            googleId: googleResult.user.uid,
            profilePicture: googleResult.user.photoURL || ''
          });
          
          if (createResponse.success) {
            // New user account created successfully
            
            // Login with newly created account
            login(createResponse.data.token, createResponse.data.user);
            
            toast({
              title: "🎉 Account Created & Login Successful!",
              description: "Please complete your initial setup to get started.",
            });
            
            // New users should always go to settings first
            navigate('/user-settings', { replace: true });
          } else {
            setError(createResponse.message || 'Failed to create account');
          }
        }
      } catch (backendError: any) {
        console.error('❌ Backend authentication error:', backendError);
        
        // If backend is not available, create a temporary session
        if (backendError.message.includes('Network error') || backendError.message.includes('Failed to fetch')) {
          // Backend unavailable, creating temporary session...
          
          // Create temporary user object from Google data
          const tempUser = {
            _id: googleResult.user.uid,
            fullname: googleResult.user.displayName || 'Google User',
            email: userEmail,
            phone: googleResult.user.phoneNumber || '',
            role: 'user',
            status: 'active'
          };
          
          // Create temporary token (you might want to implement proper JWT generation)
          const tempToken = btoa(JSON.stringify(tempUser));
          
          login(tempToken, tempUser);
          
          toast({
            title: "⚠️ Temporary Login",
            description: "Backend unavailable. Some features may be limited.",
            variant: "destructive"
          });
          
          navigate(from, { replace: true });
        } else {
          setError(backendError.message || 'Backend authentication failed');
        }
      }
    } catch (error: any) {
      console.error('❌ Google login error:', error);
      
      if (error.message.includes('popup-closed-by-user')) {
        setError('Google login was cancelled');
      } else if (error.message.includes('popup-blocked')) {
        setError('Google login popup was blocked. Please allow popups for this site.');
      } else if (error.message.includes('account-exists-with-different-credential')) {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError(error.message || 'Google login failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleSubmit started...');
    console.log('📊 JOURNEY: Step 2 - User Login Form Submission');
    console.log('📊 LOGIN: Starting login form submission...');
    
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting.",
        variant: "destructive"
      });
      return;
    }

    // Additional validation before API call
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (email.length > 100) {
      setError('Email is too long');
      return;
    }

    if (password.length > 50) {
      setError('Password is too long');
      return;
    }
    
    setLoading(true);
    setError('');
    setLoadingMessage('Signing In...');

    try {
      // Step 1: Try Firebase authentication first (optional)
      // Authenticating with Firebase...
      const firebaseResult = await signInWithEmail(email, password);
      
      if (!firebaseResult.success) {
        console.warn('⚠️ Firebase authentication failed:', firebaseResult.error);
        console.log('ℹ️ Continuing with backend-only authentication...');
        // Continue with backend authentication even if Firebase fails
      } else {
        console.log('✅ Firebase authentication successful');
      }

      // Step 2: Skip Supabase session creation
      // We use backend API for image uploads, so no direct Supabase session needed
      console.log('ℹ️ Skipping Supabase session creation - using backend API for storage');

      // Step 3: Authenticate with PostgreSQL (Business Data)
              // Authenticating with PostgreSQL...
      const response = await authAPI.login({
        email: email,
        password: password
      });
      
      if (response.success) {
        // PostgreSQL authentication successful
        
        // Use AuthContext to handle login
        login(response.data.token, response.data.user);
        
        // Check if user needs initial setup
        // User needs setup if: no company account OR created very recently (within 5 minutes)
        const userNeedsSetup = !response.data.user.company_account || 
          (response.data.user.created_at && new Date(response.data.user.created_at) > new Date(Date.now() - 5 * 60 * 1000));
        
        if (userNeedsSetup) {
          toast({
            title: "🎉 Login Successful!",
            description: "Please complete your initial setup to get started.",
          });
          navigate('/user-settings', { replace: true });
        } else {
          toast({
            title: "🎉 Login Successful!",
            description: "Welcome back!",
          });
          // Navigate to the page user was trying to access or home
          navigate(from, { replace: true });
        }
      } else {
        // PostgreSQL authentication failed
        if (response.message === 'Invalid email or password') {
          // Just show error message - no prompts
          toast({
            title: "❌ Login Failed",
            description: "Invalid email or password. Please check your credentials.",
            variant: "destructive"
          });
        } else if (response.message && response.message.includes('pending admin approval')) {
          // Show approval pending message
          toast({
            title: "⏳ Account Pending Approval",
            description: "Your account is pending admin approval. Please wait for approval before logging in.",
            variant: "destructive"
          });
        }
        
        console.error('❌ PostgreSQL authentication failed:', response.message);
        setError(response.message || 'Business data authentication failed');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Provide specific error messages
      if (error.message.includes('user-not-found')) {
        setError('User not found. Please check your email or register first.');
      } else if (error.message.includes('wrong-password')) {
        setError('Incorrect password. Please check your password.');
      } else if (error.message.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (error.message.includes('too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else if (error.message.includes('timeout')) {
        setError('Server is taking too long to respond. Please try again.');
      } else if (error.message.includes('Network error')) {
        setError('Please check your internet connection and try again.');
      } else if (error.message.includes('Backend server is not responding')) {
        setError('Server is currently unavailable. Please try again later.');
      } else if (error.message.includes('User is not registered')) {
        setError('User is not registered. Please create an account first.');
      } else if (error.message.includes('Invalid password')) {
        setError('Invalid password. Please check your password.');
      } else if (error.message.includes('Account is deactivated')) {
        setError('Account is deactivated. Please contact administrator.');
      } else if (error.message.includes('Invalid credentials') || error.message.includes('User not found')) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(error.message || 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMessage('Signing In...');
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`✅ ACTION: handleSubmit completed in ${duration.toFixed(2)}ms`);
      console.log('📊 LOGIN: Login form submission finished');
    }
  };

  // Handle forgot password - direct reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { email, newPassword, confirmPassword } = resetPasswordData;
    
    // Validation
    if (!email.trim()) {
      setForgotPasswordError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setForgotPasswordError('Please enter a valid email address');
      return;
    }

    if (!newPassword.trim()) {
      setForgotPasswordError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setForgotPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotPasswordError('Passwords do not match');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError('');

    try {
      // Step 1: Reset password in Firebase
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      await sendPasswordResetEmail(auth, email.trim());
      
      // Step 2: Update password in database
      const response = await authAPI.syncPassword(email.trim(), newPassword);
      
      if (response.success) {
        setForgotPasswordSuccess(true);
        setForgotPasswordError('');
        setResetPasswordData({ email: '', newPassword: '', confirmPassword: '' });
      } else {
        setForgotPasswordError(response.message || 'Failed to update password');
      }
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      setForgotPasswordError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const hasErrors = Object.keys(validationErrors).length > 0 || Boolean(error);
  const isFormValid = formData.email.trim() && formData.password && !hasErrors;
  const isButtonDisabled = loading || !isFormValid;

  // Handle autofill on component mount
  useEffect(() => {
    const checkAutofill = () => {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      
      if (emailInput && emailInput.value) {
        setFormData(prev => ({ ...prev, email: emailInput.value }));
        const fieldErrors = validateField('email', emailInput.value);
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          if (Object.keys(fieldErrors).length === 0) {
            delete newErrors.email;
          } else {
            newErrors.email = fieldErrors.email;
          }
          return newErrors;
        });
      }
      
      if (passwordInput && passwordInput.value) {
        setFormData(prev => ({ ...prev, password: passwordInput.value }));
        const fieldErrors = validateField('password', passwordInput.value);
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          if (Object.keys(fieldErrors).length === 0) {
            delete newErrors.password;
          } else {
            newErrors.password = fieldErrors.password;
          }
          return newErrors;
        });
      }
    };

    // Check after a short delay to allow autofill to complete
    const timer = setTimeout(checkAutofill, 100);
    return () => clearTimeout(timer);
  }, [validateField]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with Home Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/image.png" 
                alt="Escrow Ledger Logo" 
                className="w-8 h-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">
                  Escrow Ledger
                </span>
                <span className="text-xs text-gray-500 leading-tight">
                  Back to Home
                </span>
              </div>
            </Link>
            <div className="text-sm text-gray-500">
              Sign in to your account
            </div>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex items-center justify-center p-4 flex-1">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg border-2 border-blue-100">
                <img 
                  src="/image.png" 
                  alt="Escrow Ledger Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600">
                Sign in to your Escrow Ledger
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Google Login Button */}
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:bg-gray-50"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <div className="flex items-center space-x-2">
                    <WifiOff className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </div>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInput}
                    onKeyPress={handleKeyPress}
                    className={`pl-10 ${validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoComplete="email"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-red-500">{validationErrors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInput}
                    onKeyPress={handleKeyPress}
                    className={`pl-10 pr-10 ${validationErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoComplete="current-password"
                    required
                    disabled={loading || googleLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading || googleLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-red-500">{validationErrors.password}</p>
                )}
              </div>
              
              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={loading || googleLoading}
                >
                  Forgot Password?
                </button>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isButtonDisabled || googleLoading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {loadingMessage}
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={loading || googleLoading}
                >
                  Create Account
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Reset Password</DialogTitle>
            <DialogDescription className="text-center">
              {forgotPasswordSuccess 
                ? "Password reset successfully! You can now login with your new password."
                : "Enter your email and new password to reset your account"
              }
            </DialogDescription>
          </DialogHeader>
          
          {!forgotPasswordSuccess ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetPasswordData.email}
                  onChange={(e) => {
                    setResetPasswordData(prev => ({ ...prev, email: e.target.value }));
                    setForgotPasswordError('');
                  }}
                  className={forgotPasswordError ? 'border-red-500 focus:border-red-500' : ''}
                  required
                  disabled={forgotPasswordLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reset-password" className="text-sm font-medium text-gray-700">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={resetPasswordData.newPassword}
                    onChange={(e) => {
                      setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                      setForgotPasswordError('');
                    }}
                    className={`pr-10 ${forgotPasswordError ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                    disabled={forgotPasswordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={forgotPasswordLoading}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={resetPasswordData.confirmPassword}
                    onChange={(e) => {
                      setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      setForgotPasswordError('');
                    }}
                    className={`pr-10 ${forgotPasswordError ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                    disabled={forgotPasswordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={forgotPasswordLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {forgotPasswordError && (
                <p className="text-sm text-red-500">{forgotPasswordError}</p>
              )}
              
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetPasswordData({ email: '', newPassword: '', confirmPassword: '' });
                    setForgotPasswordError('');
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  disabled={forgotPasswordLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={forgotPasswordLoading || !resetPasswordData.email.trim() || !resetPasswordData.newPassword.trim() || !resetPasswordData.confirmPassword.trim()}
                >
                  {forgotPasswordLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  Password reset successfully!
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  You can now login with your new password.
                </p>
              </div>
              
              <Button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetPasswordData({ email: '', newPassword: '', confirmPassword: '' });
                  setForgotPasswordError('');
                  setForgotPasswordSuccess(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Login; 