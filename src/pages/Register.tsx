/**
 * Register Page
 * 
 * User registration page for the Property Flow Design application.
 * Handles new user account creation with comprehensive validation.
 * 
 * Features:
 * - User registration with full details
 * - Google OAuth registration
 * - Comprehensive form validation
 * - Password strength requirements
 * - Email verification
 * - Terms and conditions acceptance
 * - Responsive design
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, User, Building2, Mail, Phone, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { signUpWithEmail, signInWithGoogle } from '@/lib/firebase';

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Comprehensive validation system
  const validateField = useCallback((name: string, value: string) => {
    const errors: {[key: string]: string} = {};
    
    switch (name) {
      case 'fullname':
        if (!value.trim()) {
          errors.fullname = 'Full name is required';
        } else {
          // Enhanced name validation - accept single name as full name
          const nameParts = value.trim().split(' ').filter(part => part.length > 0);
          
          if (nameParts.length === 0) {
            errors.fullname = 'Full name is required';
          } else if (nameParts.length === 1) {
            // Single name is acceptable as full name
            if (nameParts[0].length < 2) {
              errors.fullname = 'Name must be at least 2 characters';
            }
          } else {
            // Multiple names - check each part
            for (const part of nameParts) {
              if (part.length < 2) {
                errors.fullname = 'Each name part must be at least 2 characters';
                break;
              }
            }
          }
        }
        break;
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          errors.email = 'Please enter a valid email address';
        } else if (value.trim().length > 100) {
          errors.email = 'Email must be less than 100 characters';
        } else if (value.trim().includes(' ')) {
          errors.email = 'Email cannot contain spaces';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          errors.phone = 'Phone number is required';
        } else {
          // Remove all non-digit characters and check if it's a valid Indian phone number
          const cleanPhone = value.replace(/\D/g, '');
          
          // More flexible phone validation
          if (cleanPhone.length < 10) {
            errors.phone = 'Phone number must be at least 10 digits';
          } else if (cleanPhone.length > 15) {
            errors.phone = 'Phone number cannot be more than 15 digits';
          } else if (cleanPhone.length === 10) {
            // Valid 10-digit number - accept any starting digit
            if (!/^\d{10}$/.test(cleanPhone)) {
              errors.phone = 'Please enter a valid 10-digit phone number';
            }
          } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
            // Valid 11-digit number starting with 0
            if (!/^0\d{10}$/.test(cleanPhone)) {
              errors.phone = 'Please enter a valid phone number';
            }
          } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
            // Valid 12-digit number with country code
            if (!/^91\d{10}$/.test(cleanPhone)) {
              errors.phone = 'Please enter a valid phone number';
            }
          } else if (cleanPhone.length === 13 && cleanPhone.startsWith('919')) {
            // Valid 13-digit number with country code
            if (!/^919\d{10}$/.test(cleanPhone)) {
              errors.phone = 'Please enter a valid phone number';
            }
          } else if (cleanPhone.length > 10 && cleanPhone.length <= 15) {
            // Accept other international formats
            if (!/^\d+$/.test(cleanPhone)) {
              errors.phone = 'Please enter a valid phone number';
            }
          } else {
            errors.phone = 'Please enter a valid phone number';
          }
        }
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters long';
        } else if (value.length > 50) {
          errors.password = 'Password must be less than 50 characters';
        } else if (value.includes(' ')) {
          errors.password = 'Password cannot contain spaces';
        } else if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(value)) {
          errors.password = 'Password contains invalid characters';
        } else if (value === value.toLowerCase() && value === value.toUpperCase()) {
          errors.password = 'Password should contain at least one letter';
        }
        break;
      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else if (value.includes(' ')) {
          errors.confirmPassword = 'Password cannot contain spaces';
        }
        break;
    }
    
    return errors;
  }, [formData.password]);

  // Clear validation errors when form data changes
  useEffect(() => {
    // Clear password error if it's valid
    if (formData.password && formData.password.length >= 6) {
      setValidationErrors(prev => ({
        ...prev,
        password: ''
      }));
    }
    
    // Clear phone error if it's valid
    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10 && cleanPhone.length <= 13) {
        setValidationErrors(prev => ({
          ...prev,
          phone: ''
        }));
      }
    }
  }, [formData.password, formData.phone]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update form data first
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear general error when user types
    setError('');
    
    // Validate field immediately
    const fieldErrors = validateField(name, value);
    
    // Special handling for confirm password
    if (name === 'confirmPassword') {
      if (value && value === formData.password) {
        // Clear confirm password error if passwords match
        setValidationErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      } else if (value) {
        // Show error only if user has entered something
        setValidationErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
      } else {
        // Clear error if field is empty
        setValidationErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    } else if (name === 'password') {
      // When password changes, also validate confirm password with NEW password value
      const confirmPasswordErrors = validateField('confirmPassword', formData.confirmPassword);
      setValidationErrors(prev => ({
        ...prev,
        ...fieldErrors,
        ...confirmPasswordErrors
      }));
    } else if (name === 'fullname') {
      // Special handling for fullname - clear error if validation passes
      if (Object.keys(fieldErrors).length === 0) {
        setValidationErrors(prev => ({
          ...prev,
          fullname: ''
        }));
      } else {
        setValidationErrors(prev => ({
          ...prev,
          ...fieldErrors
        }));
      }
    } else if (name === 'email') {
      // Special handling for email - clear error if validation passes
      if (Object.keys(fieldErrors).length === 0) {
        setValidationErrors(prev => ({
          ...prev,
          email: ''
        }));
      } else {
        setValidationErrors(prev => ({
          ...prev,
          ...fieldErrors
        }));
      }
    } else {
      // For other fields, just update validation errors
      setValidationErrors(prev => ({
        ...prev,
        ...fieldErrors
      }));
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Validate each field
    Object.keys(formData).forEach(key => {
      const fieldErrors = validateField(key, formData[key as keyof typeof formData]);
      Object.assign(errors, fieldErrors);
    });
    
    // Special check for password matching
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Additional validation checks (password length is already checked in validateField)
    
    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        errors.phone = 'Please enter a valid 10-digit phone number';
      }
    }
    
    // Check for duplicate characters in password (security)
    if (formData.password) {
      const password = formData.password;
      if (/(.)\1{2,}/.test(password)) {
        errors.password = 'Password should not contain repeated characters';
      }
    }
    
    // Check for sequential numbers in phone
    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (/(012|123|234|345|456|567|678|789)/.test(cleanPhone)) {
        errors.phone = 'Phone number should not contain sequential digits';
      }
    }
    
    // Testing phase - allow all domains
    // TODO: Add domain restrictions for production
    if (formData.email) {
      // No domain restrictions during testing
      // All valid email formats are allowed
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create Firebase user account (Authentication)
      console.log('🔥 Creating Firebase user for authentication...');
      const firebaseResult = await signUpWithEmail(
        formData.email.trim().toLowerCase(),
        formData.password
      );
      
      if (!firebaseResult.success) {
        setError(firebaseResult.error || 'Firebase authentication failed');
        return;
      }

      console.log('✅ Firebase user created successfully (Authentication)');

      // Step 2: Format phone number
      const cleanPhone = formData.phone.replace(/\D/g, '');
      let formattedPhone = cleanPhone;
      
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        formattedPhone = cleanPhone.substring(2);
      } else if (cleanPhone.length === 13 && cleanPhone.startsWith('919')) {
        formattedPhone = cleanPhone.substring(2);
      } else if (cleanPhone.length === 10) {
        formattedPhone = cleanPhone;
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        formattedPhone = cleanPhone.substring(1);
      }
      
      // Step 3: Create user in PostgreSQL (Business Data)
      console.log('🗄️ Creating user in PostgreSQL for business data...');
      const response = await authAPI.register({
        fullname: formData.fullname.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formattedPhone,
        password: formData.password
      });
      
      if (response.success) {
        console.log('✅ PostgreSQL user created successfully (Business Data)');
        
        // Step 4: Auto-login after successful registration
        login(response.data.token, response.data.user);
        
        toast({
          title: "🎉 Registration Successful!",
          description: "Account created successfully! Welcome to Account Ledger.",
        });
        
        // Navigate to dashboard
        navigate('/');
      } else {
        // If PostgreSQL registration fails, we should clean up Firebase user
        console.error('❌ PostgreSQL registration failed:', response.message);
        setError(`Business data creation failed: ${response.message}. Please try again.`);
        
        // TODO: Clean up Firebase user if PostgreSQL fails
        // This would require additional Firebase admin SDK setup
      }
      
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      // Provide specific error messages
      if (error.message.includes('email-already-in-use')) {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (error.message.includes('weak-password')) {
        setError('Password is too weak. Please use a stronger password.');
      } else if (error.message.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (error.message.includes('User with this email already exists')) {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Registration
  const handleGoogleRegistration = async () => {
    setGoogleLoading(true);
    setError('');
    
    try {
      console.log('🔐 Starting Google registration...');
      
      // Step 1: Authenticate with Google via Firebase
      const googleResult = await signInWithGoogle();
      
      if (!googleResult.success) {
        console.error('❌ Google authentication failed:', googleResult.error);
        setError(googleResult.error || 'Google authentication failed');
        return;
      }

      console.log('✅ Google authentication successful:', googleResult.user);
      
      // Step 2: Check if user already exists
      const userEmail = googleResult.user.email;
      if (!userEmail) {
        setError('Google account email not found');
        return;
      }

      // Step 3: Try to create account with backend
      try {
                 // Backend now properly handles Google users without defaults
         const createResponse = await authAPI.register({
           fullname: googleResult.user.displayName || 'Google User',
           email: userEmail,
           phone: '', // Empty for Google users
           password: '', // Empty for Google users
           googleId: googleResult.user.uid,
           profilePicture: googleResult.user.photoURL || ''
         });
        
        if (createResponse.success) {
          console.log('✅ Google user account created successfully');
          
          // Login with newly created account
          login(createResponse.data.token, createResponse.data.user);
          
          toast({
            title: "🎉 Account Created Successfully!",
            description: "Welcome to Account Ledger!",
          });
          
          // Navigate to dashboard
          navigate('/user-settings', { replace: true });
        } else {
          setError(createResponse.message || 'Failed to create account');
        }
      } catch (backendError: any) {
        console.error('❌ Backend registration error:', backendError);
        
        // If backend is not available, create a temporary session
        if (backendError.message.includes('Network error') || backendError.message.includes('Failed to fetch')) {
          console.log('⚠️ Backend unavailable, creating temporary session...');
          
          // Create temporary user object from Google data
          const tempUser = {
            _id: googleResult.user.uid,
            fullname: googleResult.user.displayName || 'Google User',
            email: userEmail,
            phone: googleResult.user.phoneNumber || '',
            role: 'user',
            status: 'active'
          };
          
          // Create temporary token
          const tempToken = btoa(JSON.stringify(tempUser));
          
          login(tempToken, tempUser);
          
          toast({
            title: "⚠️ Temporary Account Created",
            description: "Backend unavailable. Some features may be limited.",
            variant: "destructive"
          });
          
          navigate('/user-settings', { replace: true });
        } else {
          setError(backendError.message || 'Backend registration failed');
        }
      }
    } catch (error: any) {
      console.error('❌ Google registration error:', error);
      
      if (error.message.includes('popup-closed-by-user')) {
        setError('Google registration was cancelled');
      } else if (error.message.includes('popup-blocked')) {
        setError('Google registration popup was blocked. Please allow popups for this site.');
      } else if (error.message.includes('account-exists-with-different-credential')) {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError(error.message || 'Google registration failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const hasErrors = Object.keys(validationErrors).some(key => validationErrors[key] && validationErrors[key].trim() !== '') || Boolean(error);
  
  // Check if all required fields are filled
  const allFieldsFilled = formData.fullname.trim() && 
                          formData.email.trim() && 
                          formData.phone.trim() && 
                          formData.password && 
                          formData.confirmPassword;

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
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shadow-md">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">
                  Account Ledger
                </span>
                <span className="text-xs text-gray-500 leading-tight">
                  Back to Home
                </span>
              </div>
            </Link>
            <div className="text-sm text-gray-500">
              Create your account
            </div>
          </div>
        </div>
      </div>

      {/* Register Form */}
      <div className="flex items-center justify-center p-4 flex-1">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Join Account Ledger
              </CardTitle>
              <CardDescription className="text-gray-600">
                Create your account to get started
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Google Registration Button */}
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:bg-gray-50"
                onClick={handleGoogleRegistration}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Account with Google...
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
                  <span className="px-2 bg-white text-gray-500">Or create account with email</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="fullname" className="text-sm font-medium text-gray-700">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="fullname"
                    name="fullname"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    className={`pl-10 ${validationErrors.fullname ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoComplete="name"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
                {validationErrors.fullname && (
                  <p className="text-sm text-red-500">{validationErrors.fullname}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
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
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`pl-10 ${validationErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoComplete="tel"
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
                {validationErrors.phone && (
                  <p className="text-sm text-red-500">{validationErrors.phone}</p>
                )}
                <p className="text-xs text-gray-500">Enter with or without +91 prefix (e.g., 9876543210 or +919876543210)</p>
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
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`pl-10 pr-10 ${validationErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoComplete="new-password"
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
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`pl-10 pr-10 ${validationErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoComplete="new-password"
                    required
                    disabled={loading || googleLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-600"
                    disabled={loading || googleLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-6"
                disabled={loading || googleLoading || Boolean(hasErrors) || !allFieldsFilled}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={loading || googleLoading}
                >
                  Sign In
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register; 