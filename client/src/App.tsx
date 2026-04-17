import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProviders } from "@/components/providers";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Creator from "@/pages/creator";
import CreatorNew from "@/pages/creator-new";
import CreatorDetail from "@/pages/creator-detail";
import PlayCampaign from "@/pages/play-campaign";
import Pool from "@/pages/pool";
import HowItWorks from "@/pages/how-it-works";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/creator" component={Creator} />
      <Route path="/creator/new" component={CreatorNew} />
      <Route path="/creator/:campaignId" component={CreatorDetail} />
      <Route path="/play/:campaignId" component={PlayCampaign} />
      <Route path="/pool" component={Pool} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AppProviders>
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
    </AppProviders>
  );
}

export default App;