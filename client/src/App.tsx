import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletContextProvider } from "@/contexts/wallet-context";
import { GameModeProvider } from "@/contexts/game-mode-context";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Games from "@/pages/games";
import NoCryingEscape from "@/pages/games/nocrying-escape";
import TestPhaser from "@/pages/games/test-phaser";
import SimpleRunner from "@/pages/games/simple-runner";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      {/* Games section temporarily disabled - focusing on casino-style games */}
      {/* <Route path="/games" component={Games} /> */}
      {/* <Route path="/games/nocrying-escape" component={NoCryingEscape} /> */}
      {/* <Route path="/games/test-phaser" component={TestPhaser} /> */}
      {/* <Route path="/games/simple-runner" component={SimpleRunner} /> */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameModeProvider>
        <WalletContextProvider>
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
        </WalletContextProvider>
      </GameModeProvider>
    </QueryClientProvider>
  );
}

export default App;
