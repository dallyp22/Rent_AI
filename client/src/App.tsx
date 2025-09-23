import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import PropertyInput from "@/pages/property-input";
import PropertyProfiles from "@/pages/property-profiles";
import PropertySelectionMatrix from "@/pages/property-selection-matrix";
import Summarize from "@/pages/summarize";
import Analyze from "@/pages/analyze";
import Optimize from "@/pages/optimize";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PropertyInput} />
      <Route path="/property-profiles" component={PropertyProfiles} />
      <Route path="/property-selection-matrix" component={PropertySelectionMatrix} />
      <Route path="/summarize/:id" component={Summarize} />
      <Route path="/analyze/:id" component={Analyze} />
      <Route path="/optimize/:id" component={Optimize} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
