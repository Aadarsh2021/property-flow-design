/**
 * Revoked User Component
 * 
 * Displays a message when a user's account has been revoked by an admin.
 * Provides information about the revocation and next steps.
 * 
 * Features:
 * - Clear revocation message
 * - Contact support information
 * - Professional error page design
 * - Logout functionality
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, LogOut, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const RevokedUser: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center animate-fade-in">
        <CardHeader className="space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-red-900 mb-2">
              Account Revoked
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your account has been revoked by the administrator
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your access to the Escrow Ledger system has been suspended. 
              Please contact support for assistance with your account.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">If you believe this is an error, please contact our support team:</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">support@escrowledger.com</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            
            <Link to="/" className="block">
              <Button variant="ghost" className="w-full">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevokedUser;
