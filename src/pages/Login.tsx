import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, User, Building2, Home, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';

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
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [loadingMessage, setLoadingMessage] = useState('Signing In...');
  const [retryCount, setRetryCount] = useState(0);

  // Get the page user was trying to access
  const from = location.state?.from?.pathname || '/';

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
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          errors.email = 'Please enter a valid email format';
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
    setRetryCount(0);
    setLoadingMessage('Connecting to server...');

    try {
      const response = await authAPI.login({
        email: email,
        password: password
      });
      
      if (response.success) {
        // Use AuthContext to handle login
        login(response.data.token, response.data.user);
        
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        
        // Navigate to the page user was trying to access or home
        navigate(from, { replace: true });
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error types
      if (error.message.includes('timeout')) {
        setError('Server is taking too long to respond. Please try again.');
      } else if (error.message.includes('Network error')) {
        setError('Please check your internet connection and try again.');
      } else if (error.message.includes('Backend server is not responding')) {
        setError('Server is currently unavailable. Please try again later.');
      } else if (error.message.includes('Invalid credentials') || error.message.includes('User not found')) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(error.message || 'Network error. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMessage('Signing In...');
      setRetryCount(0);
    }
  };

  const hasErrors = Object.keys(validationErrors).length > 0 || Boolean(error);
  const isFormValid = formData.email.trim() && formData.password && !hasErrors;
  const isButtonDisabled = loading || !isFormValid;

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
              <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600">
                Sign in to your Account Ledger
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
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
                    onChange={handleInputChange}
                    className={`pl-10 pr-10 ${validationErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoComplete="current-password"
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
              
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isButtonDisabled}
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
                  disabled={loading}
                >
                  Create Account
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login; 