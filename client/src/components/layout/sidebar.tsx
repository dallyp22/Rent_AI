import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, BarChart3, TrendingUp, DollarSign, Building2, Grid3X3, PieChart, Lock, LogIn, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import WorkflowProgress from "@/components/workflow-progress";

interface NavigationItem {
  name: string;
  href: string | null;
  icon: any;
  enabled: boolean;
  requiresAuth: boolean;
  children?: NavigationItem[];
}

export default function Sidebar() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["Select Properties"]));
  
  // Extract property ID from current URL
  const extractPropertyId = (path: string): string | null => {
    const match = path.match(/\/(summarize|analyze|optimize)\/([^\/]+)/);
    return match ? match[2] : null;
  };
  
  const propertyId = extractPropertyId(location);
  
  // Generate navigation with dynamic property IDs and auth requirements
  const navigation: NavigationItem[] = [
    { 
      name: "Select Properties", 
      href: "/", 
      icon: Home,
      enabled: true,
      requiresAuth: false,
      children: [
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
      ]
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
  
  const toggleExpanded = (name: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary" data-testid="app-title">
          Rent AI Optimization
        </h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="app-subtitle">
          Real Estate Analysis Platform
        </p>
      </div>
      
      <nav className="flex-1 p-4" data-testid="main-navigation">
        <div className="space-y-1">
          {navigation.map((item) => {
            const renderNavigationItem = (navItem: NavigationItem, isChild = false) => {
              const Icon = navItem.icon;
              const isExpanded = expandedItems.has(navItem.name);
              const isActive = navItem.href ? (
                location === navItem.href || 
                (navItem.href !== "/" && location.startsWith(navItem.href.split('/')[1] ? `/${navItem.href.split('/')[1]}` : navItem.href))
              ) : false;
              
              // Check if any child is active
              const hasActiveChild = navItem.children?.some(child => 
                child.href && (location === child.href || 
                (child.href !== "/" && location.startsWith(child.href.split('/')[1] ? `/${child.href.split('/')[1]}` : child.href)))
              );
              
              // Handle auth loading state for protected routes
              if (isLoading && navItem.requiresAuth) {
                return (
                  <div
                    key={navItem.name}
                    className={`flex items-center px-3 py-2 rounded-md font-medium ${isChild ? 'ml-6' : ''}`}
                    data-testid={`nav-link-${navItem.name.toLowerCase().replace(/\s+/g, '-')}-loading`}
                  >
                    <Skeleton className="w-5 h-5 mr-3" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                );
              }
              
              // If navigation requires auth but user is not authenticated
              if (navItem.requiresAuth && !isAuthenticated) {
                const handleAuthRequired = () => {
                  if (typeof window !== 'undefined' && navItem.href) {
                    sessionStorage.setItem('auth_redirect_path', navItem.href);
                    window.location.href = '/api/login';
                  }
                };
                
                return (
                  <div
                    key={navItem.name}
                    onClick={navItem.href ? handleAuthRequired : undefined}
                    className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                      navItem.href
                        ? "hover:bg-accent text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30"
                        : "text-muted-foreground/50 cursor-not-allowed"
                    } ${isChild ? 'ml-6' : ''}`}
                    data-testid={`nav-link-${navItem.name.toLowerCase().replace(/\s+/g, '-')}-protected`}
                  >
                    <Lock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Icon className="w-5 h-5 mr-3" />
                    {navItem.name}
                  </div>
                );
              }
              
              // If navigation is disabled (no property ID), render as disabled
              if (!navItem.enabled || (!navItem.href && !navItem.children)) {
                return (
                  <div
                    key={navItem.name}
                    className={`flex items-center px-3 py-2 rounded-md font-medium text-muted-foreground/50 cursor-not-allowed ${isChild ? 'ml-6' : ''}`}
                    data-testid={`nav-link-${navItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {navItem.name}
                  </div>
                );
              }
              
              // If item has children, render as expandable
              if (navItem.children && navItem.children.length > 0) {
                return (
                  <div key={navItem.name}>
                    <div
                      className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ${
                        (isActive || hasActiveChild)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`nav-link-${navItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <ChevronRight 
                        className={`w-4 h-4 mr-1 transition-transform cursor-pointer ${isExpanded ? 'rotate-90' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(navItem.name);
                        }}
                        data-testid={`chevron-${navItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                      {navItem.href ? (
                        <Link
                          href={navItem.href}
                          className="flex items-center flex-1"
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          {navItem.name}
                        </Link>
                      ) : (
                        <div 
                          className="flex items-center flex-1 cursor-pointer"
                          onClick={() => toggleExpanded(navItem.name)}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          {navItem.name}
                        </div>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="mt-1 space-y-1">
                        {navItem.children.map(child => renderNavigationItem(child, true))}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Regular navigation item
              if (!navItem.href) return null;
              
              if (isChild) {
                return (
                  <Link
                    key={navItem.name}
                    href={navItem.href}
                    className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ml-10 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`nav-link-${navItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {navItem.name}
                  </Link>
                );
              }
              
              return (
                <Link
                  key={navItem.name}
                  href={navItem.href}
                  className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-link-${navItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {navItem.name}
                </Link>
              );
            };
            
            return renderNavigationItem(item);
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
