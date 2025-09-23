import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AnalysisFilters from "@/components/analysis-filters";
import FilteredAnalysisResults from "@/components/filtered-analysis-results";
import { useWorkflowState } from "@/hooks/use-workflow-state";
import { motion, AnimatePresence } from "framer-motion";
import type { FilterCriteria, FilteredAnalysis } from "@shared/schema";

export default function Analyze({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterCriteria>({
    bedroomTypes: [],
    priceRange: { min: 500, max: 5000 },  // Widened range to capture all units
    availability: "60days",  // Most inclusive option to show all units
    squareFootageRange: { min: 200, max: 3000 }  // Expanded range for all unit sizes
  });
  const [analysisData, setAnalysisData] = useState<FilteredAnalysis | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSessionAnalysis, setIsSessionAnalysis] = useState(false);
  const { state: workflowState, saveState: saveWorkflowState, loadState: loadWorkflowState } = useWorkflowState(params.id);

  // Mutation for filtered analysis
  const analysisMutation = useMutation({
    mutationFn: async (filterCriteria: FilterCriteria): Promise<FilteredAnalysis> => {
      // Determine if this is a session-based analysis or legacy property analysis
      if (isSessionAnalysis) {
        const response = await apiRequest('POST', '/api/session-analysis', {
          sessionId: params.id,
          filterCriteria
        });
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/filtered-analysis', filterCriteria);
        return response.json();
      }
    },
    onSuccess: (data: FilteredAnalysis) => {
      setAnalysisData(data);
    },
    onError: (error) => {
      console.error('Analysis error:', error);
    }
  });

  // Detect if this is a session analysis or legacy property analysis
  useEffect(() => {
    const detectAnalysisType = async () => {
      try {
        // Try to fetch as an analysis session first
        const sessionResponse = await apiRequest('GET', `/api/analysis-sessions/${params.id}`);
        if (sessionResponse.ok) {
          setIsSessionAnalysis(true);
          console.log('[ANALYZE] Detected session-based analysis');
        } else {
          setIsSessionAnalysis(false);
          console.log('[ANALYZE] Using legacy property-based analysis');
        }
      } catch (error) {
        // If session fetch fails, assume it's a legacy property ID
        setIsSessionAnalysis(false);
        console.log('[ANALYZE] Defaulting to legacy property-based analysis');
      }
    };
    
    detectAnalysisType();
  }, [params.id]);

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
  }, [params.id]);

  // Debounced filter changes (300ms delay)
  useEffect(() => {
    if (isInitialized && isSessionAnalysis !== null) {
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
  }, [filters, isInitialized, isSessionAnalysis]);

  const handleFiltersChange = (newFilters: FilterCriteria) => {
    setFilters(newFilters);
  };

  const handleContinueToOptimize = async () => {
    // Save workflow state before navigating
    await saveWorkflowState({
      stage: 'optimize',
      filterCriteria: filters
    });
    setLocation(`/optimize/${params.id}`);
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
              <AnalysisFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}