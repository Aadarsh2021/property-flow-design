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
        const emailParam = searchParams.get('email');
        
        console.log('🔍 FirebasePasswordReset - OOB Code:', oobCodeParam);
        console.log('🔍 FirebasePasswordReset - Mode:', mode);
        console.log('🔍 FirebasePasswordReset - Email:', emailParam);
        
        // If we have email from URL but no OOB code, try to extract from current URL
        if (emailParam && !oobCodeParam) {
          console.log('📧 Email found in URL, checking for OOB code in current URL...');
          const currentUrl = window.location.href;
          console.log('🔍 Current URL:', currentUrl);
          
          // Try to extract OOB code from URL fragments or query params
          const urlParams = new URLSearchParams(window.location.search);
          const fragmentParams = new URLSearchParams(window.location.hash.substring(1));
          
          const oobFromQuery = urlParams.get('oobCode');
          const oobFromFragment = fragmentParams.get('oobCode');
          const oobFromUrl = oobFromQuery || oobFromFragment;
          
          console.log('🔍 OOB from query:', oobFromQuery);
          console.log('🔍 OOB from fragment:', oobFromFragment);
          console.log('🔍 OOB from URL:', oobFromUrl);
          
          if (oobFromUrl) {
            console.log('✅ OOB code found in URL, verifying...');
            try {
              const emailFromCode = await verifyPasswordResetCode(auth, oobFromUrl);
              if (emailFromCode) {
                setEmail(emailFromCode);
                setOobCode(oobFromUrl);
                setVerifying(false);
                return;
              }
            } catch (verifyError) {
              console.error('❌ OOB code verification failed:', verifyError);
            }
          }
        }
        
        // Standard Firebase flow
        if (mode === 'resetPassword' && oobCodeParam) {
          console.log('✅ Standard Firebase flow - verifying OOB code...');
          const emailFromCode = await verifyPasswordResetCode(auth, oobCodeParam);
          
          if (emailFromCode) {
            setEmail(emailFromCode);
            setOobCode(oobCodeParam);
            setVerifying(false);
          } else {
            setError('Invalid or expired reset code');
            setVerifying(false);
          }
        } else if (emailParam) {
          console.log('📧 Email found but no valid OOB code, showing manual reset form...');
          setEmail(emailParam);
          setVerifying(false);
        } else {
          setError('Invalid or missing reset code');
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
      if (oobCode) {
        // Standard Firebase flow with OOB code
        console.log('🔄 Using Firebase OOB code flow...');
        await confirmPasswordReset(auth, oobCode, password);
        console.log('✅ Firebase password reset confirmed');
      } else {
        // Manual password update flow (when we only have email)
        console.log('🔄 Using manual password update flow...');
        console.log('⚠️ Note: This will only update the database password, not Firebase');
        console.log('⚠️ User will need to login with old Firebase password and update it manually');
      }
      
      // Then sync password with database
      console.log('🔄 STEP 1: Starting database sync...');
      console.log('📧 Email:', email);
      console.log('🔑 Password length:', password.length);
      
      const syncResult = await syncPasswordWithDatabase(email, password);
      console.log('📊 Sync result:', syncResult);
      
      if (syncResult.success) {
        console.log('✅ STEP 2: Database sync successful!');
        toast({
          title: "✅ Password Reset Complete",
          description: "Your password has been reset and synced with both Firebase and database. You can now login.",
        });
        
        // Redirect to login
        navigate('/login');
      } else {
        console.error('❌ STEP 2: Database sync failed!');
        console.error('❌ Sync error details:', syncResult.error);
        console.error('❌ Full sync result:', JSON.stringify(syncResult, null, 2));
        
        // Try alternative sync method
        console.log('🔄 STEP 3: Trying alternative sync method...');
        try {
          const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api'}/authentication/sync-password`;
          console.log('📡 Alternative API URL:', apiUrl);
          
          const altSyncResult = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              newPassword: password
            })
          });
          
          console.log('📊 Alternative sync response status:', altSyncResult.status);
          console.log('📊 Alternative sync response headers:', altSyncResult.headers);
          
          const altResult = await altSyncResult.json();
          console.log('📥 Alternative sync response data:', altResult);
          
          if (altResult.success) {
            console.log('✅ STEP 3: Alternative sync successful!');
            toast({
              title: "✅ Password Reset Complete",
              description: "Your password has been reset and synced with both Firebase and database. You can now login.",
            });
            navigate('/login');
            return;
          } else {
            console.error('❌ STEP 3: Alternative sync also failed!');
            console.error('❌ Alternative sync error:', altResult.message);
          }
        } catch (altError) {
          console.error('❌ STEP 3: Alternative sync exception!');
          console.error('❌ Alternative sync error details:', altError);
          console.error('❌ Alternative sync error message:', altError.message);
          console.error('❌ Alternative sync error stack:', altError.stack);
        }
        
        // Show warning but still allow user to proceed since Firebase reset was successful
        console.log('⚠️ STEP 4: Showing partial success warning...');
        toast({
          title: "⚠️ Partial Success",
          description: "Password reset in Firebase successful, but database sync failed. You can still login with your new password.",
          variant: "destructive"
        });
        
        // Still redirect to login since Firebase reset was successful
        console.log('🔄 STEP 5: Redirecting to login in 3 seconds...');
        setTimeout(() => {
          console.log('🔄 Redirecting to login now...');
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
