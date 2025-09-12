/**
 * Approval Pending Component
 * 
 * Shows a message to users whose accounts are pending admin approval
 * Automatically checks for approval status and navigates accordingly
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, Phone, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const ApprovalPending: React.FC = () => {
  const authContext = useAuth();
  const { user, checkAuthStatus } = authContext;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Check approval status
  const checkApprovalStatus = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      // Check if checkAuthStatus function exists
      if (!checkAuthStatus || typeof checkAuthStatus !== 'function') {
        console.error('checkAuthStatus function not available in auth context');
        // console.log('Available auth context methods:', Object.keys(authContext));
        setIsChecking(false);
        return;
      }

      await checkAuthStatus();
      
      // Check if user is now approved
      if (user && user.isApproved) {
        toast({
          title: "Account Approved! 🎉",
          description: "Your account has been approved. You can now access the application.",
          duration: 5000,
        });
        navigate('/login');
        return;
      }
      
      // Check if user was disapproved (user will be null)
      if (!user) {
        toast({
          title: "Account Disapproved",
          description: "Your account has been disapproved. Please register again.",
          variant: "destructive",
          duration: 5000,
        });
        navigate('/register');
        return;
      }
      
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking approval status:', error);
      // Don't show error to user, just log it
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check every 10 seconds
  useEffect(() => {
    const interval = setInterval(checkApprovalStatus, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Manual refresh button
  const handleManualRefresh = () => {
    checkApprovalStatus();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Account Pending Approval
          </CardTitle>
          <CardDescription className="text-gray-600">
            Your account is currently under review by our admin team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700 mb-4">
              Thank you for registering! Your account has been created successfully, 
              but it requires admin approval before you can access the application.
            </p>
            <p className="text-sm text-gray-500">
              We'll automatically check for updates every 10 seconds.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Admin will review your registration details</li>
              <li>• You'll be automatically redirected when approved</li>
              <li>• You can then login and use the application</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <Button 
              onClick={handleManualRefresh}
              disabled={isChecking}
              className="w-full"
              variant="outline"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Status Now
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                support@example.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalPending;
