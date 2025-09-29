import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Shield, LogOut, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isLoggedIn, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    navigate('/admin');
    toast({
      title: "Admin logged out",
      description: "You have been logged out of the admin panel"
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center animate-fade-in">
          <div className="mb-6">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              You need admin privileges to access this area.
            </p>
          </div>
          <Link to="/admin">
            <Button>
              <Shield className="w-4 h-4 mr-2" />
              Admin Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-8">
              <Link to="/admin/dashboard" className="flex items-center gap-2">
                <img 
                  src="/image.png" 
                  alt="Escrow Ledger Logo" 
                  className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                />
                <span className="text-base sm:text-xl font-bold">Escrow Ledger Admin</span>
              </Link>

            </div>

            <div className="flex items-center gap-1 sm:gap-4">

              <div className="hidden md:flex items-center space-x-2">
                <Badge variant="destructive" className="bg-gradient-to-r from-orange-500 to-red-600">
                  Admin
                </Badge>
                <Badge variant="outline">Admin User</Badge>
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm" className="px-2 sm:px-3 min-w-0">
                <LogOut className="w-4 h-4" />
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
};
