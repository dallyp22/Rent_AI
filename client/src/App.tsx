import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PropertyInput from "@/pages/property-input";
import PropertyProfiles from "@/pages/property-profiles";
import PropertyDetail from "@/pages/property-detail";
import PortfolioDashboard from "@/pages/portfolio-dashboard";
import PropertySelectionMatrix from "@/pages/property-selection-matrix";
import Summarize from "@/pages/summarize";
import Analyze from "@/pages/analyze";
import Optimize from "@/pages/optimize";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={PropertyInput} />
      
      {/* Protected routes - Portfolio management */}
      <Route path="/property-profiles">
        <ProtectedRoute>
          <PropertyProfiles />
        </ProtectedRoute>
      </Route>
      
      <Route path="/property-profile/:id">
        {(params) => (
          <ProtectedRoute>
            <PropertyDetail params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/portfolio-dashboard">
        <ProtectedRoute>
          <PortfolioDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/property-selection-matrix">
        <ProtectedRoute>
          <PropertySelectionMatrix />
        </ProtectedRoute>
      </Route>
      
      {/* Protected routes - Session-based multi-property workflow */}
      <Route path="/session/summarize/:sessionId">
        {(params) => (
          <ProtectedRoute>
            <Summarize params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/session/analyze/:sessionId">
        {(params) => (
          <ProtectedRoute>
            <Analyze params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/session/optimize/:sessionId">
        {(params) => (
          <ProtectedRoute>
            <Optimize params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Protected routes - Legacy single-property workflow (backward compatibility) */}
      <Route path="/summarize/:id">
        {(params) => (
          <ProtectedRoute>
            <Summarize params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/analyze/:id">
        {(params) => (
          <ProtectedRoute>
            <Analyze params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/optimize/:id">
        {(params) => (
          <ProtectedRoute>
            <Optimize params={params} />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          {/* Full-page login layout */}
          <Route path="/login">
            <LoginPage />
          </Route>
          
          {/* Main application layout */}
          <Route>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 p-6 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </Route>
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
