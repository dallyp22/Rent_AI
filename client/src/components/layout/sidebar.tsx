import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, BarChart3, TrendingUp, DollarSign, Building2, Grid3X3, PieChart, Lock, LogIn, ChevronRight, FileSpreadsheet, Check, Circle, Dot, Settings, ChevronDown, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface NavigationItem {
  name: string;
  href: string | null;
  icon: any;
  enabled: boolean;
  requiresAuth: boolean;
  children?: NavigationItem[];
}

interface WorkflowState {
  stage: 'select' | 'summarize' | 'analyze' | 'optimize';
  highestStage?: 'select' | 'summarize' | 'analyze' | 'optimize';
  filters?: any;
  selectedCompetitors?: string[];
  analysisParameters?: any;
  optimizationSettings?: any;
  timestamp: string;
}

export default function Sidebar() {
  const [location, setNavLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["Select Properties"]));
  
  // Extract session ID from current URL (handles both session and legacy modes)
  const extractSessionInfo = (path: string): { sessionId: string | null; isSessionMode: boolean } => {
    // Check for session mode URLs: /session/{phase}/{sessionId}
    const sessionMatch = path.match(/\/session\/(summarize|analyze|optimize)\/([^\/]+)/);
    if (sessionMatch) {
      return { sessionId: sessionMatch[2], isSessionMode: true };
    }
    
    // Check for legacy mode URLs: /{phase}/{id}
    const legacyMatch = path.match(/\/(summarize|analyze|optimize)\/([^\/]+)/);
    if (legacyMatch) {
      return { sessionId: legacyMatch[2], isSessionMode: false };
    }
    
    return { sessionId: null, isSessionMode: false };
  };
  
  const { sessionId, isSessionMode } = extractSessionInfo(location);
  
  // Query workflow state when we have a session ID
  // Include location in queryKey to force refetch when navigation changes
  const { data: workflowState, isLoading: workflowLoading, refetch } = useQuery<WorkflowState>({
    queryKey: ['workflow-state', sessionId, isSessionMode, location],
    queryFn: async () => {
      if (!sessionId) return null;
      const endpoint = isSessionMode 
        ? `/api/analysis-sessions/${sessionId}/workflow`
        : `/api/workflow/${sessionId}`;
      
      const response = await apiRequest('GET', endpoint);
      if (response.ok) {
        return response.json();
      }
      return null;
    },
    enabled: !!sessionId,
    staleTime: 0, // Always fetch fresh data to ensure navigation is up-to-date
    gcTime: 0, // Don't keep cache (was cacheTime in v4, now gcTime in v5)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    refetchInterval: false, // Disable automatic refetch interval
  });
  
  // Force refetch when location changes to ensure navigation is always up-to-date
  useEffect(() => {
    if (sessionId && refetch) {
      refetch();
    }
  }, [location, sessionId, refetch]);
  
  // Determine current phase based on location
  const getCurrentPhase = (): 'select' | 'summarize' | 'analyze' | 'optimize' => {
    if (location.includes('/summarize')) return 'summarize';
    if (location.includes('/analyze')) return 'analyze';
    if (location.includes('/optimize')) return 'optimize';
    return 'select';
  };
  
  const currentPhase = getCurrentPhase();
  
  // Determine which phases are accessible based on workflow state
  const getPhaseAccessibility = () => {
    const phases = {
      select: true, // Always accessible
      summarize: false,
      analyze: false,
      optimize: false
    };
    
    // If we have a session ID, at minimum the summarize phase is accessible
    if (sessionId) {
      phases.summarize = true;
      
      // Check workflow state to determine if later phases are accessible
      if (workflowState) {
        const stageOrder = ['select', 'summarize', 'analyze', 'optimize'];
        // Use highestStage if available, otherwise fall back to stage for backward compatibility
        const highestReached = workflowState.highestStage || workflowState.stage || 'select';
        const highestStageIndex = stageOrder.indexOf(highestReached);
        
        // Make all phases up to and including the highest stage reached accessible
        phases.analyze = highestStageIndex >= 1; // Accessible if reached summarize or beyond
        phases.optimize = highestStageIndex >= 2; // Accessible if reached analyze or beyond
      } else if (!workflowLoading) {
        // If no workflow state exists yet but we have a session, allow access to summarize
        // This handles new sessions that haven't saved workflow state yet
        phases.summarize = true;
        // Allow progressive access based on current phase
        if (currentPhase === 'summarize' || currentPhase === 'analyze' || currentPhase === 'optimize') {
          phases.analyze = true;
        }
        if (currentPhase === 'analyze' || currentPhase === 'optimize') {
          phases.optimize = true;
        }
      }
    }
    
    return phases;
  };
  
  const phaseAccessibility = getPhaseAccessibility();
  
  // Generate navigation with dynamic session-based URLs
  const navigation: NavigationItem[] = [
    { 
      name: "Select Properties", 
      href: "/", 
      icon: Home,
      enabled: true,
      requiresAuth: false,
      children: [
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
      href: sessionId 
        ? (isSessionMode ? `/session/summarize/${sessionId}` : `/summarize/${sessionId}`)
        : null, 
      icon: BarChart3,
      enabled: phaseAccessibility.summarize,
      requiresAuth: true
    },
    { 
      name: "Analyze", 
      href: sessionId && phaseAccessibility.analyze 
        ? (isSessionMode ? `/session/analyze/${sessionId}` : `/analyze/${sessionId}`)
        : null, 
      icon: TrendingUp,
      enabled: phaseAccessibility.analyze,
      requiresAuth: true
    },
    { 
      name: "Optimize", 
      href: sessionId && phaseAccessibility.optimize
        ? (isSessionMode ? `/session/optimize/${sessionId}` : `/optimize/${sessionId}`)
        : null, 
      icon: DollarSign,
      enabled: phaseAccessibility.optimize,
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
        <div className="space-y-4">
          {navigation.map((item, index) => {
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
              
              // If navigation is disabled (no session ID or phase not yet accessible), render as disabled
              if (!navItem.enabled || (!navItem.href && !navItem.children)) {
                return (
                  <div
                    key={navItem.name}
                    className={`flex items-center px-3 py-2 rounded-md font-medium text-muted-foreground/30 cursor-not-allowed relative ${isChild ? 'ml-6' : ''}`}
                    data-testid={`nav-link-${navItem.name.toLowerCase().replace(/\s+/g, '-')}-disabled`}
                    title={!sessionId ? "Complete property selection first" : "Complete previous phases to unlock"}
                  >
                    <Icon className="w-5 h-5 mr-3 opacity-50" />
                    <span className="opacity-60">{navItem.name}</span>
                    {/* Visual indicator for locked phases */}
                    {navItem.requiresAuth && !sessionId && (
                      <Lock className="w-3 h-3 ml-auto opacity-40" />
                    )}
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
            
            // Determine the phase for this navigation item
            const getItemPhase = (navItem: NavigationItem): 'select' | 'summarize' | 'analyze' | 'optimize' => {
              if (navItem.name === "Select Properties") return 'select';
              if (navItem.name === "Summarize") return 'summarize';
              if (navItem.name === "Analyze") return 'analyze';
              if (navItem.name === "Optimize") return 'optimize';
              return 'select';
            };
            
            const itemPhase = getItemPhase(item);
            const isPhaseActive = currentPhase === itemPhase;
            
            // Phase indicator colors
            const phaseColors = {
              'select': 'border-blue-500 bg-blue-50 dark:bg-blue-950',
              'summarize': 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950',
              'analyze': 'border-amber-500 bg-amber-50 dark:bg-amber-950',
              'optimize': 'border-purple-500 bg-purple-50 dark:bg-purple-950'
            };
            
            const phaseBorderColors = {
              'select': 'border-blue-500',
              'summarize': 'border-emerald-500',
              'analyze': 'border-amber-500',
              'optimize': 'border-purple-500'
            };
            
            const phaseTextColors = {
              'select': 'text-blue-700 dark:text-blue-300',
              'summarize': 'text-emerald-700 dark:text-emerald-300',
              'analyze': 'text-amber-700 dark:text-amber-300',
              'optimize': 'text-purple-700 dark:text-purple-300'
            };
            
            // Add phase label for all items
            const phaseLabels = {
              'select': 'Phase 1: Select',
              'summarize': 'Phase 2: Summarize',
              'analyze': 'Phase 3: Analyze', 
              'optimize': 'Phase 4: Optimize'
            };
            
            // Determine phase status
            const getPhaseStatus = (phase: string): 'completed' | 'current' | 'upcoming' => {
              const phases = ['select', 'summarize', 'analyze', 'optimize'];
              const currentIndex = phases.indexOf(currentPhase);
              const phaseIndex = phases.indexOf(phase);
              
              if (phaseIndex < currentIndex) return 'completed';
              if (phaseIndex === currentIndex) return 'current';
              return 'upcoming';
            };
            
            const phaseStatus = getPhaseStatus(itemPhase);
            
            // Get status icon
            const StatusIcon = phaseStatus === 'completed' ? Check : 
                              phaseStatus === 'current' ? Dot :
                              Circle;
            
            return (
              <div key={item.name} className="relative">
                {/* Phase indicator and wrapper */}
                {index > 0 && (
                  <div className="mb-2">
                    {/* Phase separator */}
                    <div className="h-px bg-border mb-3" />
                  </div>
                )}
                
                {/* Phase label with status icon - clickable when phase is accessible */}
                <div 
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 transition-all ${
                    item.enabled && item.href 
                      ? 'cursor-pointer hover:opacity-80' 
                      : !sessionId 
                        ? 'cursor-help opacity-50' 
                        : 'cursor-not-allowed opacity-40'
                  }`}
                  onClick={() => {
                    if (item.enabled && item.href) {
                      setNavLocation(item.href);
                    }
                  }}
                  title={
                    !item.enabled 
                      ? (!sessionId 
                        ? "Start by selecting properties" 
                        : `Complete ${itemPhase === 'analyze' ? 'summarization' : itemPhase === 'optimize' ? 'analysis' : 'previous phase'} to unlock`)
                      : undefined
                  }
                  data-testid={`phase-label-${itemPhase}`}
                >
                  {workflowLoading && sessionId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <StatusIcon className={`w-4 h-4 ${
                      phaseStatus === 'completed' ? 'text-green-600 dark:text-green-400' :
                      phaseStatus === 'current' ? phaseTextColors[itemPhase] :
                      'text-muted-foreground'
                    }`} />
                  )}
                  <span className={`${
                    isPhaseActive ? phaseTextColors[itemPhase] : 
                    item.enabled ? 'text-muted-foreground hover:text-foreground' : 
                    'text-muted-foreground'
                  }`}>
                    {phaseLabels[itemPhase]}
                  </span>
                </div>
                
                <div className={`relative transition-all duration-200 ${
                  isPhaseActive ? 'rounded-lg p-3 -mx-2 shadow-sm border ' + phaseColors[itemPhase] + ' ' + phaseBorderColors[itemPhase] : ''
                }`}>
                  {/* Phase active indicator bar */}
                  {isPhaseActive && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l bg-current ${phaseTextColors[itemPhase]}`} />
                  )}
                  
                  <div className={isPhaseActive ? 'ml-3' : ''}>
                    {renderNavigationItem(item)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Settings Section */}
        {isAuthenticated && (
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => toggleExpanded('Settings')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
              data-testid="settings-dropdown"
            >
              <div className="flex items-center">
                <Settings className="w-5 h-5 mr-3" />
                <span>Settings</span>
              </div>
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${
                  expandedItems.has('Settings') ? 'rotate-180' : ''
                }`} 
              />
            </button>
            
            {/* Settings dropdown items */}
            {expandedItems.has('Settings') && (
              <div className="mt-1 space-y-1">
                <Link
                  href="/property-profiles"
                  className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ml-10 ${
                    location === "/property-profiles"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="nav-link-property-profiles"
                >
                  <Building2 className="w-5 h-5 mr-3" />
                  Property Profiles
                </Link>
                
                <Link
                  href="/unit-management"
                  className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ml-10 ${
                    location === "/unit-management"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="nav-link-unit-management"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-3" />
                  Unit Management
                </Link>
              </div>
            )}
          </div>
        )}
        
        {/* Auth Status Indicator */}
        {!isLoading && !isAuthenticated && (
          <div className="p-4 border-t border-border mt-4">
            <Alert>
              <LogIn className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Sign in to access portfolio management features
              </AlertDescription>
            </Alert>
          </div>
        )}
      </nav>
    </div>
  );
}
