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
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Comprehensive validation system
  const validateField = useCallback((name: string, value: string) => {
    const errors: {[key: string]: string} = {};
    
    switch (name) {
      case 'fullname':
        if (!value.trim()) {
          errors.fullname = 'Full name is required';
        } else if (value.trim().length < 2) {
          errors.fullname = 'Full name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          errors.fullname = 'Full name must be less than 50 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
          errors.fullname = 'Full name should only contain letters and spaces';
        } else {
          // Split by spaces and filter out empty strings
          const nameParts = value.trim().split(' ').filter(part => part.length > 0);
          
          // Debug logging (commented out for production)
          // console.log('Name validation debug:', {
          //   originalValue: value,
          //   trimmedValue: value.trim(),
          //   nameParts: nameParts,
          //   namePartsLength: nameParts.length,
          //   hasShortWords: nameParts.some(word => word.length < 2)
          // });
          
          if (nameParts.length < 2) {
            errors.fullname = 'Please enter your full name (first and last name)';
          } else if (nameParts.some(word => word.length < 2)) {
            errors.fullname = 'Each name part must be at least 2 characters';
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
          
          // Check for minimum length first
          if (cleanPhone.length < 10) {
            errors.phone = 'Phone number must be at least 10 digits';
          } else if (cleanPhone.length > 13) {
            errors.phone = 'Phone number cannot be more than 13 digits';
          } else if (cleanPhone.length === 10) {
            // Valid 10-digit number
            if (!/^[6-9]/.test(cleanPhone)) {
              errors.phone = 'Phone number should start with 6, 7, 8, or 9';
            }
          } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
            // Valid 12-digit number with country code
            if (!/^91[6-9]/.test(cleanPhone)) {
              errors.phone = 'Phone number should start with 6, 7, 8, or 9';
            }
          } else if (cleanPhone.length === 13 && cleanPhone.startsWith('919')) {
            // Valid 13-digit number with country code
            if (!/^919[6-9]/.test(cleanPhone)) {
              errors.phone = 'Phone number should start with 6, 7, 8, or 9';
            }
          } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
            // Valid 11-digit number starting with 0
            if (!/^0[6-9]/.test(cleanPhone)) {
              errors.phone = 'Phone number should start with 6, 7, 8, or 9';
            }
          } else {
            errors.phone = 'Please enter a valid 10-digit phone number';
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
    
    // Check for common patterns in email
    if (formData.email) {
      const email = formData.email.toLowerCase();
      if (email.includes('admin') || email.includes('test') || email.includes('demo')) {
        errors.email = 'Please use a valid email address';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Additional security checks before submission
    const additionalChecks = [];
    
    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(formData.password.toLowerCase())) {
      additionalChecks.push('Please choose a stronger password');
    }
    
    // Check for common names
    const commonNames = ['test', 'demo', 'user', 'admin'];
    if (commonNames.includes(formData.fullname.toLowerCase())) {
      additionalChecks.push('Please use your real name');
    }
    
    // Check for disposable email domains
    const disposableDomains = ['tempmail.com', 'test.com', 'example.com'];
    const emailDomain = formData.email.split('@')[1];
    if (disposableDomains.includes(emailDomain)) {
      additionalChecks.push('Please use a valid email address');
    }
    
    if (additionalChecks.length > 0) {
      setError(additionalChecks.join('. '));
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Format phone number - remove all non-digits and ensure it's 10 digits
      const cleanPhone = formData.phone.replace(/\D/g, '');
      let formattedPhone = cleanPhone;
      
      // If it's 12 digits and starts with 91, remove the 91
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        formattedPhone = cleanPhone.substring(2);
      }
      // If it's 13 digits and starts with 919, remove the 91
      else if (cleanPhone.length === 13 && cleanPhone.startsWith('919')) {
        formattedPhone = cleanPhone.substring(2);
      }
      // If it's already 10 digits, use as is
      else if (cleanPhone.length === 10) {
        formattedPhone = cleanPhone;
      }
      // If it's 11 digits and starts with 0, remove the 0
      else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        formattedPhone = cleanPhone.substring(1);
      }
      
      const response = await authAPI.register({
        fullname: formData.fullname.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formattedPhone,
        password: formData.password
      });
      
      if (response.success) {
        // Auto-login after successful registration
        login(response.data.token, response.data.user);
        
        toast({
          title: "Registration Successful",
          description: "Account created successfully! Welcome to Account Ledger.",
        });
        
        // Navigate to dashboard
        navigate('/');
      } else {
        setError(response.message || 'Registration failed');
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = Object.keys(validationErrors).some(key => validationErrors[key] && validationErrors[key].trim() !== '') || Boolean(error);
  
  // Check if all required fields are filled
  const allFieldsFilled = formData.fullname.trim() && 
                          formData.email.trim() && 
                          formData.phone.trim() && 
                          formData.password && 
                          formData.confirmPassword;

  // Debug logging (commented out for production)
  // console.log('Form State:', { formData, validationErrors, hasErrors, allFieldsFilled, error });

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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
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
                disabled={loading || Boolean(hasErrors) || !allFieldsFilled}
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
                  disabled={loading}
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