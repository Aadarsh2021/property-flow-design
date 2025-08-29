
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import UserSettings from "./pages/UserSettings";
import NewParty from "./pages/NewParty";
import PartyLedger from "./pages/PartyLedger";
import AccountLedger from "./pages/AccountLedger";
import FinalTrialBalance from "./pages/FinalTrialBalance";
import PartyReport from "./pages/PartyReport";
import FirebaseTest from "./pages/FirebaseTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <div className="min-h-screen bg-gray-50">
                <Routes>
                    {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/firebase-test" element={<FirebaseTest />} />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } />
                    <Route path="/home" element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } />
                    <Route path="/user-settings" element={
                      <ProtectedRoute>
                        <UserSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/new-party" element={
                      <ProtectedRoute>
                        <NewParty />
                      </ProtectedRoute>
                    } />
                    <Route path="/party-ledger" element={
                      <ProtectedRoute>
                        <PartyLedger />
                      </ProtectedRoute>
                    } />
                    <Route path="/party-report" element={
                      <ProtectedRoute>
                        <PartyReport />
                      </ProtectedRoute>
                    } />
                    <Route path="/account-ledger/:partyName" element={
                      <ProtectedRoute>
                        <AccountLedger />
                      </ProtectedRoute>
                    } />
                    <Route path="/final-trial-balance" element={
                      <ProtectedRoute>
                        <FinalTrialBalance />
                      </ProtectedRoute>
                    } />
                    <Route path="/profit-loss-report" element={
                      <ProtectedRoute>
                        <div>Profit Loss Report - Coming Soon</div>
                      </ProtectedRoute>
                    } />
                    <Route path="/transaction-report" element={
                      <ProtectedRoute>
                        <div>Transaction Report - Coming Soon</div>
                      </ProtectedRoute>
                    } />
                    
                    {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
