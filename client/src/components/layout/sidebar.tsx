import { Link, useLocation } from "wouter";
import { Home, BarChart3, TrendingUp, DollarSign, Building2, Grid3X3 } from "lucide-react";
import WorkflowProgress from "@/components/workflow-progress";

export default function Sidebar() {
  const [location] = useLocation();
  
  // Extract property ID from current URL
  const extractPropertyId = (path: string): string | null => {
    const match = path.match(/\/(summarize|analyze|optimize)\/([^\/]+)/);
    return match ? match[2] : null;
  };
  
  const propertyId = extractPropertyId(location);
  
  // Generate navigation with dynamic property IDs
  const navigation = [
    { 
      name: "Property Input", 
      href: "/", 
      icon: Home,
      enabled: true 
    },
    { 
      name: "Property Profiles", 
      href: "/property-profiles", 
      icon: Building2,
      enabled: true 
    },
    { 
      name: "Selection Matrix", 
      href: "/property-selection-matrix", 
      icon: Grid3X3,
      enabled: true 
    },
    { 
      name: "Summarize", 
      href: propertyId ? `/summarize/${propertyId}` : null, 
      icon: BarChart3,
      enabled: !!propertyId
    },
    { 
      name: "Analyze", 
      href: propertyId ? `/analyze/${propertyId}` : null, 
      icon: TrendingUp,
      enabled: !!propertyId
    },
    { 
      name: "Optimize", 
      href: propertyId ? `/optimize/${propertyId}` : null, 
      icon: DollarSign,
      enabled: !!propertyId
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
        
        <WorkflowProgress />
      </nav>
    </div>
  );
}
