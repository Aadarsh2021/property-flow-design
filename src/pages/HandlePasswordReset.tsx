/**
 * Handle Password Reset Page
 * 
 * This page handles the Firebase password reset flow and redirects to our custom page
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const HandlePasswordReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔄 HandlePasswordReset component mounted');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Search params:', Object.fromEntries(searchParams.entries()));
    
    const handlePasswordReset = async () => {
      try {
        const oobCode = searchParams.get('oobCode');
        const mode = searchParams.get('mode');
        
        console.log('🔍 Password reset handler - OOB Code:', oobCode);
        console.log('🔍 Password reset handler - Mode:', mode);
        console.log('🔍 All search params:', Object.fromEntries(searchParams.entries()));
        
        if (mode === 'resetPassword' && oobCode) {
          console.log('✅ Valid reset parameters found, verifying code...');
          try {
            // Verify the password reset code
            const email = await verifyPasswordResetCode(auth, oobCode);
            console.log('✅ Password reset code verified for email:', email);
            
            if (email) {
              console.log('🔄 Redirecting to firebase-reset page...');
              // Redirect to our custom reset page with the email and OOB code
              navigate(`/firebase-reset?mode=resetPassword&oobCode=${oobCode}&email=${encodeURIComponent(email)}`);
            } else {
              console.error('❌ No email returned from verification');
              navigate('/login?error=invalid-reset-code');
            }
          } catch (verifyError) {
            console.error('❌ Password reset code verification failed:', verifyError);
            console.error('❌ Verification error details:', verifyError.message);
            navigate('/login?error=invalid-reset-code');
          }
        } else {
          console.log('❌ Invalid parameters - Mode:', mode, 'OOB Code:', oobCode);
          console.log('🔄 Redirecting to login page...');
          // No valid reset parameters, redirect to login
          navigate('/login');
        }
      } catch (error) {
        console.error('❌ Password reset handling error:', error);
        console.error('❌ Error details:', error.message);
        navigate('/login?error=reset-failed');
      }
    };

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.error('❌ Password reset handler timeout after 10 seconds');
      navigate('/login?error=timeout');
    }, 10000); // 10 second timeout

    console.log('🔄 Starting password reset handler...');
    handlePasswordReset();

    return () => {
      console.log('🔄 Cleaning up password reset handler');
      clearTimeout(timeout);
    };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Processing password reset...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HandlePasswordReset;
