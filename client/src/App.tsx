import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/components/wallet-provider";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-deep-space">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-gradient-to-br from-dark-purple/20 to-deep-space pointer-events-none"></div>
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,255,255,0.1)_0%,transparent_50%)] pointer-events-none"></div>
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,140,0,0.1)_0%,transparent_50%)] pointer-events-none"></div>
            
            <div className="relative z-10">
              <Toaster />
              <Router />
            </div>
          </div>
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
