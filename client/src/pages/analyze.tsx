import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, AlertCircle, Loader2, Building2, Home, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AnalysisFilters from "@/components/analysis-filters";
import FilteredAnalysisResults from "@/components/filtered-analysis-results";
import { useWorkflowState } from "@/hooks/use-workflow-state";
import { motion, AnimatePresence } from "framer-motion";
import type { FilterCriteria, FilteredAnalysis, AnalysisSession, PropertyProfile } from "@shared/schema";

// Type for competitive relationships
type CompetitiveRelationship = {
  id: string;
  portfolioId: string;
  propertyAId: string;
  propertyBId: string;
  relationshipType: "direct_competitor" | "indirect_competitor" | "market_leader" | "market_follower";
  isActive: boolean;
  createdAt: string;
};

// Extended session type that includes propertyProfiles from API response
type SessionWithPropertyProfiles = AnalysisSession & {
  propertyProfiles?: PropertyProfile[];
};

export default function Analyze({ params }: { params: { id?: string, sessionId?: string } }) {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterCriteria>({
    bedroomTypes: [],
    priceRange: { min: 500, max: 5000 },  // Widened range to capture all units
    availability: "60days",  // Most inclusive option to show all units
    squareFootageRange: { min: 200, max: 3000 },  // Expanded range for all unit sizes
    competitiveSet: "all_competitors"
  });
  const [analysisData, setAnalysisData] = useState<FilteredAnalysis | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Determine session mode and ID based on URL pattern
  const isSessionMode = !!params.sessionId;
  const sessionId = params.sessionId || params.id;
  const { state: workflowState, saveState: saveWorkflowState, loadState: loadWorkflowState } = useWorkflowState(sessionId, isSessionMode);
  
  // Query for session data when in session mode
  const sessionQuery = useQuery<SessionWithPropertyProfiles>({
    queryKey: ['/api/analysis-sessions', sessionId],
    enabled: isSessionMode,
    staleTime: 30000
  });

  // Query for competitive relationships when in session mode and portfolio ID is available
  const competitiveRelationshipsQuery = useQuery<CompetitiveRelationship[]>({
    queryKey: ['/api/portfolios', sessionQuery.data?.portfolioId, 'competitive-relationships'],
    enabled: isSessionMode && !!sessionQuery.data?.portfolioId,
    staleTime: 30000
  });

  // Mutation for filtered analysis with competitive set filtering
  const analysisMutation = useMutation({
    mutationFn: async (filterCriteria: FilterCriteria): Promise<FilteredAnalysis> => {
      try {
        if (isSessionMode) {
          // Prepare additional metadata for competitive set filtering
          const analysisPayload: any = {
            filterCriteria
          };
          
          // Only include metadata if competitive filtering is enabled and data is available
          if (filterCriteria.competitiveSet && filterCriteria.competitiveSet !== "all_competitors") {
            const relationships = competitiveRelationshipsQuery.data || [];
            const sessionData = sessionQuery.data;
            
            if (sessionData?.propertyProfiles && relationships.length > 0) {
              analysisPayload.competitiveRelationships = relationships;
              analysisPayload.propertyProfiles = sessionData.propertyProfiles;
              console.log('[ANALYZE] Including competitive metadata in request');
            } else {
              console.warn('[ANALYZE] Competitive filtering requested but insufficient metadata available');
            }
          }
          
          const response = await apiRequest('POST', `/api/analysis-sessions/${sessionId}/filtered-analysis`, analysisPayload);
          if (!response.ok) {
            throw new Error(`Analysis request failed: ${response.status} ${response.statusText}`);
          }
          return response.json();
        } else {
          const response = await apiRequest('POST', '/api/filtered-analysis', filterCriteria);
          if (!response.ok) {
            throw new Error(`Analysis request failed: ${response.status} ${response.statusText}`);
          }
          return response.json();
        }
      } catch (error) {
        console.error('[ANALYZE] Analysis mutation error:', error);
        // Re-throw with more context
        throw new Error(`Failed to generate analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    onSuccess: (data: FilteredAnalysis) => {
      console.log('[ANALYZE] Analysis completed successfully');
      setAnalysisData(data);
    },
    onError: (error) => {
      console.error('[ANALYZE] Analysis failed:', error);
      // Could add user notification here
    }
  });

  // Session mode is determined by URL pattern - no additional detection needed
  useEffect(() => {
    console.log('[ANALYZE] Mode:', isSessionMode ? 'Session-based portfolio analysis' : 'Single property analysis');
    console.log('[ANALYZE] Session/Property ID:', sessionId);
  }, [isSessionMode, sessionId]);

  // Load workflow state on mount and restore filters
  useEffect(() => {
    const initializeState = async () => {
      const loadedState = await loadWorkflowState();
      if (loadedState && loadedState.filterCriteria) {
        setFilters(loadedState.filterCriteria);
      }
      setIsInitialized(true);
    };
    initializeState();
  }, [sessionId, isSessionMode]);

  // Debounced filter changes (300ms delay)
  useEffect(() => {
    if (isInitialized) {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Show debouncing indicator
      setIsDebouncing(true);
      
      // Set new timer for 300ms
      debounceTimerRef.current = setTimeout(() => {
        analysisMutation.mutate(filters);
        setIsDebouncing(false);
        // Save workflow state with current filters
        saveWorkflowState({
          stage: 'analyze',
          filterCriteria: filters
        });
      }, 300);
      
      // Cleanup on unmount
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
  }, [filters, isInitialized, isSessionMode]);

  const handleFiltersChange = (newFilters: FilterCriteria) => {
    setFilters(newFilters);
  };

  const handleContinueToOptimize = async () => {
    // Save workflow state before navigating
    await saveWorkflowState({
      stage: 'optimize',
      filterCriteria: filters
    });
    
    // Navigate based on session mode vs legacy mode
    if (isSessionMode && params.sessionId) {
      setLocation(`/session/optimize/${params.sessionId}`);
    } else {
      setLocation(`/optimize/${params.id}`);
    }
  };

  const sessionData = sessionQuery.data;
  const subjectProperties = sessionData?.propertyProfiles?.filter((p: PropertyProfile) => p.profileType === 'subject') || [];
  const competitiveRelationships = competitiveRelationshipsQuery.data || [];
  
  // Determine if competitive set filtering is available and active
  const hasCompetitiveRelationships = isSessionMode && competitiveRelationships.length > 0;
  const isCompetitiveFilterActive = filters.competitiveSet && filters.competitiveSet !== "all_competitors";
  
  // Loading states
  const isLoadingRelationships = competitiveRelationshipsQuery.isLoading;
  const isLoadingSession = sessionQuery.isLoading;
  const hasLoadingError = competitiveRelationshipsQuery.error || sessionQuery.error;
  
  // Get display name for current competitive filter
  const getCompetitiveFilterDisplay = () => {
    switch (filters.competitiveSet) {
      case "internal_competitors_only":
        return "Internal Competition";
      case "external_competitors_only":
        return "External Competitors";
      case "subject_properties_only":
        return "Subject Properties";
      default:
        return "All Competitors";
    }
  };

  return (
    <motion.div 
      className="h-full" 
      data-testid="analyze-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-card rounded-lg border border-border h-full overflow-hidden">
        {/* Header with mode indicator */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isSessionMode ? (
                <>
                  <Building2 className="h-6 w-6 text-primary" />
                  <div>
                    <h1 className="text-xl font-semibold">{sessionData?.name || 'Portfolio Analysis'}</h1>
                    <p className="text-sm text-muted-foreground">
                      Multi-property portfolio analysis • {subjectProperties.length} subject properties
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Home className="h-6 w-6 text-primary" />
                  <div>
                    <h1 className="text-xl font-semibold">Property Analysis</h1>
                    <p className="text-sm text-muted-foreground">Single property competitive analysis</p>
                  </div>
                </>
              )}
            </div>
            <Badge variant={isSessionMode ? "default" : "secondary"}>
              {isSessionMode ? 'Portfolio Mode' : 'Single Property'}
            </Badge>
          </div>

          {/* Portfolio Properties Summary for Session Mode */}
          {isSessionMode && sessionData && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Portfolio Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">{subjectProperties.length}</div>
                    <div className="text-muted-foreground">Subject Properties</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {sessionData.propertyProfiles?.filter((p: PropertyProfile) => p.profileType === 'competitor').length || 0}
                    </div>
                    <div className="text-muted-foreground">Competitors</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-orange-600 dark:text-orange-400">
                      {subjectProperties.reduce((sum: number, p: PropertyProfile) => sum + (p.totalUnits || 0), 0)}
                    </div>
                    <div className="text-muted-foreground">Total Units</div>
                  </div>
                  <div className="text-center" data-testid="competitive-filter-status">
                    <div className="font-semibold text-purple-600 dark:text-purple-400">
                      {isCompetitiveFilterActive ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          {getCompetitiveFilterDisplay()}
                        </div>
                      ) : (
                        "All Competitors"
                      )}
                    </div>
                    <div className="text-muted-foreground">Analysis Filter</div>
                    {isLoadingRelationships && (
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </div>
                    )}
                  </div>
                </div>
                {/* Competitive Relationships Status */}
                {hasLoadingError && (
                  <div className="mt-3 text-xs text-red-500 flex items-center gap-1" data-testid="relationships-error">
                    <AlertCircle className="h-3 w-3" />
                    Unable to load competitive relationships
                  </div>
                )}
                {hasCompetitiveRelationships && (
                  <div className="mt-3 text-xs text-muted-foreground" data-testid="relationships-available">
                    {competitiveRelationships.length} competitive relationships defined
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 75/25 Layout Container */}
        <div className="flex flex-col lg:flex-row h-full">
          {/* Main Analysis Area - 75% width */}
          <div className="flex-1 lg:w-3/4 p-6 overflow-y-auto relative">
            {/* Debouncing Indicator */}
            <AnimatePresence>
              {isDebouncing && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 right-4 z-10 bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                  data-testid="debouncing-indicator"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating analysis...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analysis Results Area */}
            {analysisMutation.error ? (
              <motion.div 
                className="flex items-center justify-center min-h-[500px]" 
                data-testid="error-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <div className="text-lg font-medium">Analysis Failed</div>
                  <div className="text-muted-foreground mb-4">
                    Unable to load analysis data. Please try again.
                  </div>
                  <Button 
                    onClick={() => analysisMutation.mutate(filters)} 
                    data-testid="button-retry"
                  >
                    Retry Analysis
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={JSON.stringify(filters)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <FilteredAnalysisResults 
                  analysis={analysisData!}
                  isLoading={analysisMutation.isPending || isDebouncing}
                />
              </motion.div>
            )}
            
            {/* Continue to Optimization Button */}
            {analysisData && !analysisMutation.isPending && !isDebouncing && (
              <motion.div 
                className="flex justify-end pt-6 border-t mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Button 
                  onClick={handleContinueToOptimize} 
                  data-testid="button-proceed-optimization"
                  size="lg"
                  className="shadow-lg hover:shadow-xl transition-all"
                >
                  Proceed to Optimization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Filter Sidebar - 25% width */}
          <div className="lg:w-1/4 lg:border-l border-border p-6 bg-muted/5 overflow-y-auto">
            <div className="sticky top-0">
              <div className="mb-4">
                <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-2">
                  Analysis Filters
                </h3>
                {isSessionMode && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Filters apply across all {subjectProperties.length} subject properties in the portfolio
                  </p>
                )}
              </div>
              <AnalysisFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isPortfolioMode={isSessionMode}
                isLoadingRelationships={isLoadingRelationships}
                hasCompetitiveRelationships={hasCompetitiveRelationships}
                relationshipsError={hasLoadingError ? new Error('Failed to load relationships') : null}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}