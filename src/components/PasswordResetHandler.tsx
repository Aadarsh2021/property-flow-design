/**
 * Password Reset Handler Component
 * 
 * Handles password reset scenarios and ensures database sync
 * when users reset passwords via Firebase email links.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const PasswordResetHandler = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncCheck, setLastSyncCheck] = useState<number>(0);

  useEffect(() => {
    // Check if user recently reset password
    const checkPasswordReset = async () => {
      if (!user?.email) return;

      // Check if this is a recent login (within last 5 minutes)
      // and if user might have reset password
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      // Only check once per session
      if (lastSyncCheck > fiveMinutesAgo) return;
      
      setLastSyncCheck(now);

      // Check URL parameters for password reset indicators
      const urlParams = new URLSearchParams(window.location.search);
      const isPasswordReset = urlParams.get('mode') === 'resetPassword' || 
                             urlParams.get('oobCode') || 
                             localStorage.getItem('password_reset_detected');

      if (isPasswordReset) {
        setShowSyncPrompt(true);
        // Clear the flag
        localStorage.removeItem('password_reset_detected');
      }
    };

    checkPasswordReset();
  }, [user, lastSyncCheck]);

  const handlePasswordSync = async () => {
    if (!user?.email) return;

    setSyncing(true);
    
    try {
      // Prompt user to enter their new password for sync
      const newPassword = prompt(
        'Please enter your new password to sync with the database:'
      );
      
      if (!newPassword) {
        setSyncing(false);
        return;
      }

      const response = await authAPI.syncPassword(user.email, newPassword);
      
      if (response.success) {
        toast({
          title: "✅ Password Synced",
          description: "Your password has been synced with the database",
        });
        setShowSyncPrompt(false);
      } else {
        toast({
          title: "❌ Sync Failed",
          description: response.message || "Failed to sync password",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Password sync error:', error);
      toast({
        title: "❌ Sync Error",
        description: "Error syncing password with database",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const dismissPrompt = () => {
    setShowSyncPrompt(false);
  };

  if (!showSyncPrompt) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="space-y-3">
            <div>
              <p className="font-medium">Password Reset Detected</p>
              <p className="text-sm">
                It looks like you recently reset your password. To ensure you can login properly, 
                please sync your new password with the database.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handlePasswordSync}
                disabled={syncing}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sync Password
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={dismissPrompt}
                disabled={syncing}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PasswordResetHandler;
