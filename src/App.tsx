
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Suspense, lazy } from "react";

// Lazy load all pages for better performance
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));
const ErrorBoundary = lazy(() => import("@/components/ErrorBoundary"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Index = lazy(() => import("./pages/Index"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const Profile = lazy(() => import("./pages/Profile"));
const NewParty = lazy(() => import("./pages/NewParty"));
const PartyLedger = lazy(() => import("./pages/PartyLedger"));
const AccountLedger = lazy(() => import("./pages/AccountLedger"));
const FinalTrialBalance = lazy(() => import("./pages/FinalTrialBalance"));
const PartyReport = lazy(() => import("./pages/PartyReport"));
const FirebaseTest = lazy(() => import("./pages/FirebaseTest"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  return (
    <Suspense fallback={<PageLoader />}>
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
                  <Suspense fallback={<PageLoader />}>
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
                        <Route path="/profile" element={
                          <ProtectedRoute>
                            <Profile />
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
                        <Route path="/account-ledger" element={
                          <ProtectedRoute>
                            <AccountLedger />
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
                  </Suspense>
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </Suspense>
  );
};

export default App;
