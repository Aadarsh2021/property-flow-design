
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import UserSettings from "./pages/UserSettings";
import NewParty from "./pages/NewParty";
import PartyLedger from "./pages/PartyLedger";
import AccountLedger from "./pages/AccountLedger";
import FinalTrialBalance from "./pages/FinalTrialBalance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/user-settings" element={<UserSettings />} />
          <Route path="/new-party" element={<NewParty />} />
          <Route path="/party-ledger" element={<PartyLedger />} />
          <Route path="/account-ledger/:partyName" element={<AccountLedger />} />
          <Route path="/final-trial-balance" element={<FinalTrialBalance />} />
          <Route path="/profit-loss-report" element={<div>Profit Loss Report - Coming Soon</div>} />
          <Route path="/transaction-report" element={<div>Transaction Report - Coming Soon</div>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
