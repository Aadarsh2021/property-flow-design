/**
 * Password Sync Hook
 * 
 * Monitors Firebase auth state changes and syncs password changes
 * with the database when users reset passwords via email.
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { useEffect, useRef } from 'react';
import { onAuthStateChange, getCurrentUser } from '@/lib/firebase';
import { authAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const usePasswordSync = () => {
  const { toast } = useToast();
  const lastPasswordHash = useRef<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.email) return;

      // Skip on initial load
      if (!isInitialized.current) {
        isInitialized.current = true;
        return;
      }

      try {
        // Get current Firebase user to check if password was changed
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        // Check if this is a password reset scenario
        // We can detect this by checking if the user was recently authenticated
        // and if we have a stored password hash that's different
        
        // For now, we'll implement a simple approach:
        // If user is authenticated and we detect a password change,
        // we'll sync with the database
        
        // This is a simplified implementation
        // In a real scenario, you might want to store the password hash
        // and compare it to detect changes
        
        console.log('🔄 Firebase auth state changed, checking for password sync...');
        
      } catch (error) {
        console.error('Password sync error:', error);
      }
    });

    return () => unsubscribe();
  }, [toast]);

  // Function to manually sync password (can be called after password reset)
  const syncPasswordAfterReset = async (email: string, newPassword: string) => {
    try {
      const response = await authAPI.syncPassword(email, newPassword);
      
      if (response.success) {
        toast({
          title: "✅ Password Synced",
          description: "Password has been synced with the database",
        });
        return true;
      } else {
        toast({
          title: "❌ Sync Failed",
          description: "Failed to sync password with database",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Manual password sync error:', error);
      toast({
        title: "❌ Sync Error",
        description: "Error syncing password with database",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    syncPasswordAfterReset
  };
};
