import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Chrome } from 'lucide-react';

const FirebaseLogin = () => {
  const { login, logout, user, loading, error, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    try {
      await login();
      toast({
        title: "Login Successful",
        description: "Welcome to Account Ledger Software!",
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Welcome!</CardTitle>
          <CardDescription className="text-center">
            You are logged in as {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <span className="text-2xl">{user.email?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="font-medium">{user.displayName || user.email}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              'Logout'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Account Ledger Software</CardTitle>
        <CardDescription className="text-center">
          Sign in to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <Button 
          onClick={handleLogin} 
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <Chrome className="mr-2 h-4 w-4" />
              Sign in with Google
            </>
          )}
        </Button>
        
        <div className="text-center text-sm text-gray-500">
          <p>Secure authentication powered by Firebase</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FirebaseLogin;
