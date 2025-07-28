import React, { useState, useCallback } from 'react';
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

  // Debounced validation
  const validateField = useCallback((name: string, value: string) => {
    const errors: {[key: string]: string} = {};
    
    switch (name) {
      case 'fullname':
        if (!value.trim()) {
          errors.fullname = 'Full name is required';
        } else if (value.trim().length < 2) {
          errors.fullname = 'Full name must be at least 2 characters';
        }
        break;
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          errors.phone = 'Phone number is required';
        } else {
          // Remove all non-digit characters and check if it's a valid Indian phone number
          const cleanPhone = value.replace(/\D/g, '');
          if (cleanPhone.length === 10) {
            // Valid 10-digit number
          } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
            // Valid 12-digit number with country code
          } else if (cleanPhone.length === 13 && cleanPhone.startsWith('919')) {
            // Valid 13-digit number with country code
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
        }
        console.log('Password validation:', { value, length: value.length, hasError: Object.keys(errors).length > 0 });
        break;
      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        }
        console.log('Confirm password validation:', { value, password: formData.password, matches: value === formData.password });
        break;
    }
    
    return errors;
  }, [formData.password]);

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
    
    // Special handling for confirm password
    if (name === 'confirmPassword') {
      if (value && value === formData.password) {
        // Clear confirm password error if passwords match
        setValidationErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      } else {
        setValidationErrors(prev => ({
          ...prev,
          ...fieldErrors
        }));
      }
    } else if (name === 'password') {
      // When password changes, also validate confirm password
      const confirmPasswordErrors = validateField('confirmPassword', formData.confirmPassword);
      setValidationErrors(prev => ({
        ...prev,
        ...fieldErrors,
        ...confirmPasswordErrors
      }));
    } else {
      setValidationErrors(prev => ({
        ...prev,
        ...fieldErrors
      }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
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

  const hasErrors = Object.keys(validationErrors).length > 0 || Boolean(error);

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
                disabled={loading || Boolean(hasErrors)}
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