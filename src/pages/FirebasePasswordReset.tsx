/**
 * Firebase Password Reset Page
 * 
 * Handles Firebase password reset directly and syncs with database
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth, syncPasswordWithDatabase } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FirebasePasswordReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [oobCode, setOobCode] = useState('');

  useEffect(() => {
    const verifyResetCode = async () => {
      try {
        const oobCodeParam = searchParams.get('oobCode');
        const mode = searchParams.get('mode');
        
        if (mode !== 'resetPassword' || !oobCodeParam) {
          setError('Invalid or missing reset code');
          setVerifying(false);
          return;
        }

        // Verify the password reset code
        const emailFromCode = await verifyPasswordResetCode(auth, oobCodeParam);
        
        if (emailFromCode) {
          setEmail(emailFromCode);
          setOobCode(oobCodeParam);
          setVerifying(false);
        } else {
          setError('Invalid or expired reset code');
          setVerifying(false);
        }
      } catch (error: any) {
        console.error('Reset code verification error:', error);
        setError('Invalid or expired reset code');
        setVerifying(false);
      }
    };

    verifyResetCode();
  }, [searchParams]);

  const validateForm = () => {
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // First, confirm the password reset with Firebase
      await confirmPasswordReset(auth, oobCode, password);
      console.log('✅ Firebase password reset confirmed');
      
      // Then sync password with database
      console.log('🔄 Syncing password with database...');
      const syncResult = await syncPasswordWithDatabase(email, password);
      
      if (syncResult.success) {
        console.log('✅ Database sync successful');
        toast({
          title: "✅ Password Reset Complete",
          description: "Your password has been reset and synced with both Firebase and database. You can now login.",
        });
        
        // Redirect to login
        navigate('/login');
      } else {
        console.error('❌ Database sync failed:', syncResult.error);
        
        // Try alternative sync method
        console.log('🔄 Trying alternative sync method...');
        try {
          const altSyncResult = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api'}/authentication/sync-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              newPassword: password
            })
          });
          
          const altResult = await altSyncResult.json();
          
          if (altResult.success) {
            console.log('✅ Alternative sync successful');
            toast({
              title: "✅ Password Reset Complete",
              description: "Your password has been reset and synced with both Firebase and database. You can now login.",
            });
            navigate('/login');
            return;
          }
        } catch (altError) {
          console.error('❌ Alternative sync also failed:', altError);
        }
        
        // Show warning but still allow user to proceed since Firebase reset was successful
        toast({
          title: "⚠️ Partial Success",
          description: "Password reset in Firebase successful, but database sync failed. You can still login with your new password.",
          variant: "destructive"
        });
        
        // Still redirect to login since Firebase reset was successful
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError('An error occurred while resetting your password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Verifying reset code...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Reset Failed
            </CardTitle>
            <CardDescription>
              There was an issue with your password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Reset Password
          </CardTitle>
          <CardDescription>
            Enter your new password to complete the reset process
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {email && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Resetting password for: <strong>{email}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resetting Password...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              className="text-sm"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirebasePasswordReset;
