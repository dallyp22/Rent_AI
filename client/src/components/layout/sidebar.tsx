import { Link, useLocation } from "wouter";
import { Home, BarChart3, TrendingUp, DollarSign, Building2, Grid3X3, PieChart, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import WorkflowProgress from "@/components/workflow-progress";

export default function Sidebar() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Extract property ID from current URL
  const extractPropertyId = (path: string): string | null => {
    const match = path.match(/\/(summarize|analyze|optimize)\/([^\/]+)/);
    return match ? match[2] : null;
  };
  
  const propertyId = extractPropertyId(location);
  
  // Generate navigation with dynamic property IDs and auth requirements
  const navigation = [
    { 
      name: "Property Input", 
      href: "/", 
      icon: Home,
      enabled: true,
      requiresAuth: false
    },
    { 
      name: "Property Profiles", 
      href: "/property-profiles", 
      icon: Building2,
      enabled: true,
      requiresAuth: true
    },
    { 
      name: "Portfolio Dashboard", 
      href: "/portfolio-dashboard", 
      icon: PieChart,
      enabled: true,
      requiresAuth: true
    },
    { 
      name: "Selection Matrix", 
      href: "/property-selection-matrix", 
      icon: Grid3X3,
      enabled: true,
      requiresAuth: true
    },
    { 
      name: "Summarize", 
      href: propertyId ? `/summarize/${propertyId}` : null, 
      icon: BarChart3,
      enabled: !!propertyId,
      requiresAuth: true
    },
    { 
      name: "Analyze", 
      href: propertyId ? `/analyze/${propertyId}` : null, 
      icon: TrendingUp,
      enabled: !!propertyId,
      requiresAuth: true
    },
    { 
      name: "Optimize", 
      href: propertyId ? `/optimize/${propertyId}` : null, 
      icon: DollarSign,
      enabled: !!propertyId,
      requiresAuth: true
    },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary" data-testid="app-title">
          PropertyAnalytics Pro
        </h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="app-subtitle">
          Real Estate Analysis Platform
        </p>
      </div>
      
      <nav className="flex-1 p-4" data-testid="main-navigation">
        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = item.href ? (
              location === item.href || 
              (item.href !== "/" && location.startsWith(item.href.split('/')[1] ? `/${item.href.split('/')[1]}` : item.href))
            ) : false;
            
            // Handle auth loading state for protected routes
            if (isLoading && item.requiresAuth) {
              return (
                <div
                  key={item.name}
                  className="flex items-center px-3 py-2 rounded-md font-medium"
                  data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}-loading`}
                >
                  <Skeleton className="w-5 h-5 mr-3" />
                  <Skeleton className="h-4 w-20" />
                </div>
              );
            }
            
            // If navigation requires auth but user is not authenticated
            if (item.requiresAuth && !isAuthenticated) {
              const handleAuthRequired = () => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('auth_redirect_path', item.href!);
                  window.location.href = '/api/login';
                }
              };
              
              return (
                <div
                  key={item.name}
                  onClick={item.href ? handleAuthRequired : undefined}
                  className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    item.href
                      ? "hover:bg-accent text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30"
                      : "text-muted-foreground/50 cursor-not-allowed"
                  }`}
                  data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}-protected`}
                >
                  <Lock className="w-4 h-4 mr-2 text-muted-foreground" />
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
              );
            }
            
            // If navigation is disabled (no property ID), render as disabled span
            if (!item.enabled || !item.href) {
              return (
                <div
                  key={item.name}
                  className="flex items-center px-3 py-2 rounded-md font-medium text-muted-foreground/50 cursor-not-allowed"
                  data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
              );
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
        
        {/* Auth Status Indicator */}
        {!isLoading && !isAuthenticated && (
          <div className="p-4 border-t border-border mt-4">
            <Alert>
              <LogIn className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Sign in to access portfolio management features
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              data-testid="sidebar-login-button"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </div>
        )}
        
        <WorkflowProgress />
      </nav>
    </div>
  );
}
