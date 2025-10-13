import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet, Save, Building2, Home } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OptimizationTable from "@/components/optimization-table";
import OptimizationControls from "@/components/optimization-controls";
import SaveSelectionTemplateDialog from "@/components/save-selection-template-dialog";
import { OptimizationProgressModal } from "@/components/optimization-progress-modal";
import { exportToExcel, type ExcelExportData } from "@/lib/excel-export";
import { useWorkflowState } from "@/hooks/use-workflow-state";
import type { Property, PropertyUnit, OptimizationReport, AnalysisSession, PropertyProfile, PropertyAnalysis } from "@shared/schema";

interface OptimizationData {
  report: OptimizationReport;
  units: PropertyUnit[];
  portfolio?: Record<string, { units: PropertyUnit[]; report: OptimizationReport }>;
}

interface PropertyWithAnalysis {
  property: Property;
  analysis: PropertyAnalysis | null;
}

// Utility function to check if a string looks like a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Robust session mode detection function with API validation
const detectSessionMode = (params: { id?: string, sessionId?: string }, currentLocation: string): { isSessionMode: boolean; sessionId: string; confidence: 'high' | 'medium' | 'low' } => {
  console.log('[OPTIMIZE_DETECTION] Starting session mode detection...');
  console.log('[OPTIMIZE_DETECTION] Params:', { id: params.id, sessionId: params.sessionId });
  console.log('[OPTIMIZE_DETECTION] Current URL:', currentLocation);
  
  let isSessionMode = false;
  let sessionId = '';
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // Method 1: Check if params.sessionId is explicitly set (highest confidence)
  if (params.sessionId) {
    isSessionMode = true;
    sessionId = params.sessionId;
    confidence = 'high';
    console.log('[OPTIMIZE_DETECTION] Method 1: Explicit sessionId parameter found');
  }
  // Method 2: Check URL path pattern (high confidence)
  else if (currentLocation.includes('/session/')) {
    isSessionMode = true;
    sessionId = params.id || '';
    confidence = 'high';
    console.log('[OPTIMIZE_DETECTION] Method 2: URL contains "/session/" pattern');
  }
  // Method 3: Check if params.id looks like a UUID (medium confidence)
  else if (params.id && isUUID(params.id)) {
    isSessionMode = true;
    sessionId = params.id;
    confidence = 'medium';
    console.log('[OPTIMIZE_DETECTION] Method 3: ID appears to be a UUID (likely session ID)');
  }
  // Method 4: Default to single property mode (low confidence)
  else {
    isSessionMode = false;
    sessionId = params.id || '';
    confidence = 'low';
    console.log('[OPTIMIZE_DETECTION] Method 4: Defaulting to single property mode');
  }
  
  console.log('[OPTIMIZE_DETECTION] Final detection result:', { 
    isSessionMode, 
    sessionId, 
    confidence,
    detectedMode: isSessionMode ? 'Session-based portfolio analysis' : 'Single property analysis'
  });
  
  // Additional validation warning for UUID IDs that might be sessions
  if (!isSessionMode && params.id && isUUID(params.id)) {
    console.warn('[OPTIMIZE_DETECTION] WARNING: Detected UUID in single property mode!');
    console.warn('[OPTIMIZE_DETECTION] This might indicate a routing issue where a session ID is being passed through the wrong route.');
    console.warn('[OPTIMIZE_DETECTION] Expected route: /session/optimize/' + params.id);
    console.warn('[OPTIMIZE_DETECTION] Current route appears to be: /optimize/' + params.id);
  }
  
  return { isSessionMode, sessionId, confidence };
};

export default function Optimize({ params }: { params: { id?: string, sessionId?: string } }) {
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Robust session mode detection with multiple validation methods
  const { isSessionMode, sessionId, confidence } = detectSessionMode(params, location);
  
  // Validate detection confidence and warn if uncertain
  useEffect(() => {
    if (confidence === 'low') {
      console.warn('[OPTIMIZE_DETECTION] Low confidence in session mode detection. This might indicate a routing issue.');
    }
    if (confidence === 'medium') {
      console.warn('[OPTIMIZE_DETECTION] Medium confidence in session mode detection. Using UUID-based inference.');
    }
  }, [confidence]);
  
  const { state: workflowState, saveState: saveWorkflowState, loadState: loadWorkflowState } = useWorkflowState(sessionId, isSessionMode);
  
  const [goal, setGoal] = useState("maximize-revenue");
  const [targetOccupancy, setTargetOccupancy] = useState([95]);
  const [riskTolerance, setRiskTolerance] = useState([2]); // 1=Low, 2=Medium, 3=High
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentModifiedPrices, setCurrentModifiedPrices] = useState<Record<string, number>>({});
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationStage, setOptimizationStage] = useState(1);
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false);
  
  // Query for session data when in session mode
  const sessionQuery = useQuery<AnalysisSession & { propertyProfiles: PropertyProfile[] }>({
    queryKey: ['/api/analysis-sessions', sessionId],
    enabled: isSessionMode,
    staleTime: 30000
  });

  // Enhanced debugging for session mode detection with validation warnings
  useEffect(() => {
    console.log('[OPTIMIZE] === ENHANCED SESSION MODE DETECTION SUMMARY ===');
    console.log('[OPTIMIZE] URL Location:', location);
    console.log('[OPTIMIZE] URL Params:', params);
    console.log('[OPTIMIZE] Detected Mode:', isSessionMode ? 'Session-based portfolio analysis' : 'Single property analysis');
    console.log('[OPTIMIZE] Session/Property ID:', sessionId);
    console.log('[OPTIMIZE] Detection Confidence:', confidence);
    console.log('[OPTIMIZE] Expected API Endpoints:');
    if (isSessionMode) {
      console.log('[OPTIMIZE]   - Session Query: /api/analysis-sessions/' + sessionId);
      console.log('[OPTIMIZE]   - Optimization: /api/analysis-sessions/' + sessionId + '/optimization');
      console.log('[OPTIMIZE]   - Optimize: /api/analysis-sessions/' + sessionId + '/optimize');
    } else {
      console.log('[OPTIMIZE]   - Property Query: /api/properties/' + params.id);
      console.log('[OPTIMIZE]   - Optimization: /api/properties/' + params.id + '/optimization');
      console.log('[OPTIMIZE]   - Sync Units: /api/properties/' + params.id + '/sync-units');
      console.log('[OPTIMIZE]   - Optimize: /api/properties/' + params.id + '/optimize');
    }
    
    // Validation check for potential routing issues
    if (!isSessionMode && params.id && isUUID(params.id)) {
      console.error('[OPTIMIZE] 🚨 POTENTIAL ROUTING ISSUE DETECTED! 🚨');
      console.error('[OPTIMIZE] A UUID is being passed as params.id but treated as single property mode.');
      console.error('[OPTIMIZE] This will cause API calls to fail with 404 errors.');
      console.error('[OPTIMIZE] Expected: /session/optimize/' + params.id + ' (session mode)');
      console.error('[OPTIMIZE] Actual: /optimize/' + params.id + ' (property mode)');
    }
    
    console.log('[OPTIMIZE] ================================================');
  }, [isSessionMode, sessionId, location, params, confidence]);

  const propertyQuery = useQuery<PropertyWithAnalysis>({
    queryKey: ['/api/properties', params.id],
    enabled: !isSessionMode
  });

  const optimizationQuery = useQuery<OptimizationData>({
    queryKey: isSessionMode 
      ? ['/api/analysis-sessions', sessionId, 'optimization']
      : ['/api/properties', params.id, 'optimization'],
    enabled: hasInitialized,
    staleTime: 0, // Override global staleTime to ensure fresh data
    refetchOnMount: true // Always refetch when component mounts
  });

  const syncUnitsMutation = useMutation({
    mutationFn: async (): Promise<PropertyUnit[]> => {
      // Only sync units for single property mode - session mode handles units differently
      if (isSessionMode) {
        throw new Error('Unit syncing not applicable in session mode');
      }
      const res = await apiRequest("POST", `/api/properties/${params.id}/sync-units`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', params.id, 'optimization'] });
    }
  });

  const createUnitsMutation = useMutation({
    mutationFn: async (): Promise<PropertyUnit[]> => {
      const res = await apiRequest("POST", `/api/properties/${params.id}/units`, {});
      return res.json();
    }
  });

  // Load workflow state and sync units on mount
  useEffect(() => {
    const initializeOptimization = async () => {
      // Load workflow state
      const loadedState = await loadWorkflowState();
      if (loadedState && loadedState.optimizationParams) {
        setGoal(loadedState.optimizationParams.goal || "maximize-revenue");
        setTargetOccupancy([loadedState.optimizationParams.targetOccupancy || 95]);
        setRiskTolerance([loadedState.optimizationParams.riskTolerance || 2]);
      }
      
      // Save current stage
      await saveWorkflowState({
        stage: 'optimize',
        optimizationParams: {
          goal,
          targetOccupancy: targetOccupancy[0],
          riskTolerance: riskTolerance[0]
        }
      });
      
      // Sync units first for single property mode only
      if (!isSessionMode) {
        try {
          await syncUnitsMutation.mutateAsync();
        } catch (error) {
          console.error('Failed to sync units:', error);
        }
      }
      
      setHasInitialized(true);
    };
    
    initializeOptimization();
  }, [params.id]);

  // Save workflow state when optimization params change
  useEffect(() => {
    if (hasInitialized) {
      saveWorkflowState({
        stage: 'optimize',
        optimizationParams: {
          goal,
          targetOccupancy: targetOccupancy[0],
          riskTolerance: riskTolerance[0]
        }
      });
    }
  }, [goal, targetOccupancy, riskTolerance, hasInitialized]);

  const optimizeMutation = useMutation({
    mutationFn: async (data: { goal: string; targetOccupancy: number; riskTolerance: number }): Promise<OptimizationData> => {
      // Validate parameters before API call
      if (!data.goal) {
        throw new Error('Please select an optimization goal');
      }
      if (!data.targetOccupancy || data.targetOccupancy < 1 || data.targetOccupancy > 100) {
        throw new Error('Please provide a valid target occupancy rate (1-100%)');
      }
      if (!data.riskTolerance || data.riskTolerance < 1 || data.riskTolerance > 3) {
        throw new Error('Please select a valid risk tolerance level');
      }

      // Show modal and set initial stage
      setShowOptimizationModal(true);
      setOptimizationStage(1);
      
      // Simulate stage progression
      const stageTimers: NodeJS.Timeout[] = [];
      
      // Stage 2: After 2 seconds - Analyzing market
      stageTimers.push(setTimeout(() => {
        setOptimizationStage(2);
      }, 2000));
      
      // Stage 3: After 4 seconds - Generating AI recommendations
      stageTimers.push(setTimeout(() => {
        setOptimizationStage(3);
      }, 4000));
      
      // Stage 4: After 6 seconds - Calculating impacts
      stageTimers.push(setTimeout(() => {
        setOptimizationStage(4);
      }, 6000));

      const endpoint = isSessionMode 
        ? `/api/analysis-sessions/${sessionId}/optimize`
        : `/api/properties/${params.id}/optimize`;
      
      console.log('[OPTIMIZE_MUTATION] Using endpoint:', endpoint);
      console.log('[OPTIMIZE_MUTATION] Mode:', isSessionMode ? 'session' : 'property');
      console.log('[OPTIMIZE_MUTATION] Data:', data);
      
      // Add retry logic for API failures
      const maxRetries = 3;
      let attempt = 0;
      
      try {
        while (attempt < maxRetries) {
          try {
            const res = await apiRequest("POST", endpoint, data);
            console.log('[OPTIMIZE_MUTATION] API call successful on attempt:', attempt + 1);
            
            // Clear stage timers and set to final stage
            stageTimers.forEach(timer => clearTimeout(timer));
            setOptimizationStage(5);
            
            return res.json();
          } catch (error) {
            attempt++;
            console.error(`[OPTIMIZE_MUTATION] Optimization attempt ${attempt} failed:`, error);
            console.error(`[OPTIMIZE_MUTATION] Attempted endpoint:`, endpoint);
            
            if (attempt === maxRetries) {
              // Clear timers on error
              stageTimers.forEach(timer => clearTimeout(timer));
              
              // Extract meaningful error message from response
              if (error instanceof Error) {
                throw error;
              }
              throw new Error('Network error - please check your connection and try again');
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      } catch (error) {
        // Clear timers on error
        stageTimers.forEach(timer => clearTimeout(timer));
        throw error;
      }
      
      // This should never be reached but satisfies TypeScript
      throw new Error('Unexpected error during optimization');
    },
    onSuccess: (data) => {
      const queryKey = isSessionMode 
        ? ['/api/analysis-sessions', sessionId, 'optimization']
        : ['/api/properties', params.id, 'optimization'];
      queryClient.setQueryData(queryKey, data);
      
      const unitCount = Array.isArray(data.units) ? data.units.length : 
        (data.portfolio ? Object.values(data.portfolio).reduce((sum, p) => sum + p.units.length, 0) : 0);
      
      // Stage 5 is already set in mutationFn, modal will auto-close
      // Just show the success toast
      toast({
        title: "Optimization Complete",
        description: isSessionMode 
          ? `Generated portfolio recommendations for ${unitCount} total units across multiple properties.`
          : `Generated recommendations for ${unitCount} units.`,
      });
      
      // Clean up modal state after showing completion
      setTimeout(() => {
        setShowOptimizationModal(false);
        setOptimizationStage(1);
      }, 2000); // Give time for modal to show stage 5 and auto-close
    },
    onError: (error: any) => {
      console.error('Optimization generation failed:', error);
      const errorMessage = error.message || 'Failed to generate recommendations. Please try again.';
      
      // Close modal on error
      setShowOptimizationModal(false);
      setOptimizationStage(1);
      
      toast({
        title: "Optimization Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });


  const generateRecommendations = () => {
    // Pre-validation before API calls
    if (!goal) {
      toast({
        title: "Validation Error",
        description: "Please select an optimization goal before generating recommendations.",
        variant: "destructive",
      });
      return;
    }

    const targetOcc = targetOccupancy[0];
    const riskTol = riskTolerance[0];
    
    if (!targetOcc || targetOcc < 1 || targetOcc > 100) {
      toast({
        title: "Validation Error", 
        description: "Please set a valid target occupancy rate (1-100%).",
        variant: "destructive",
      });
      return;
    }

    // For session mode, skip unit creation and directly trigger optimization
    if (isSessionMode) {
      optimizeMutation.mutate({ 
        goal, 
        targetOccupancy: targetOcc, 
        riskTolerance: riskTol 
      });
    } else {
      // For single property mode, first create units if they don't exist, then optimize
      if (!optimizationQuery.data) {
        // Show modal when starting the process with unit creation
        setShowOptimizationModal(true);
        setOptimizationStage(1);
        
        createUnitsMutation.mutate(undefined, {
          onSuccess: () => {
            // Modal is already showing, now proceed with optimization
            optimizeMutation.mutate({ 
              goal, 
              targetOccupancy: targetOcc, 
              riskTolerance: riskTol 
            });
          },
          onError: (error) => {
            console.error('Failed to create units:', error);
            // Close modal on error
            setShowOptimizationModal(false);
            setOptimizationStage(1);
            
            toast({
              title: "Unit Creation Failed",
              description: "Could not prepare property data for optimization. Please try again.",
              variant: "destructive",
            });
          }
        });
      } else {
        optimizeMutation.mutate({ 
          goal, 
          targetOccupancy: targetOcc, 
          riskTolerance: riskTol 
        });
      }
    }
  };

  const handleExportToExcel = async () => {
    const optimization = optimizationQuery.data;
    
    // Check if optimization data exists
    if (!optimization) {
      toast({
        title: "Export Failed",
        description: "Please generate optimization recommendations first, then try exporting again.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      let exportData: ExcelExportData;

      if (isSessionMode) {
        // Session mode - portfolio export
        const sessionData = sessionQuery.data;
        const subjectProperties = sessionData?.propertyProfiles?.filter(p => p.profileType === 'subject') || [];
        
        if (subjectProperties.length === 0) {
          toast({
            title: "Export Failed",
            description: "No subject properties found in portfolio. Please ensure you have properties marked as 'subject' in your session.",
            variant: "destructive",
          });
          return;
        }

        // For portfolio mode, create a combined export
        const totalUnits = subjectProperties.reduce((sum, p) => sum + (p.totalUnits || 0), 0);
        const portfolioAddress = subjectProperties.length === 1 
          ? subjectProperties[0].address 
          : `Portfolio (${subjectProperties.length} properties)`;
        
        exportData = {
          propertyInfo: {
            address: portfolioAddress,
            type: 'Portfolio',
            units: totalUnits,
            builtYear: Math.min(...subjectProperties.map(p => p.builtYear || new Date().getFullYear())),
          },
          units: optimization.units.map(unit => {
            // Use modified price if available, otherwise use recommended rent
            const adjustedPrice = currentModifiedPrices[unit.id] || 
              (unit.recommendedRent ? parseFloat(unit.recommendedRent) : parseFloat(unit.currentRent));
            const currentRent = parseFloat(unit.currentRent);
            const change = adjustedPrice - currentRent;
            
            // Find the property name for this unit based on propertyProfileId
            const propertyProfile = sessionData?.propertyProfiles?.find(
              p => p.id === unit.propertyProfileId
            );
            
            return {
              propertyName: propertyProfile?.name || propertyProfile?.address || 'Unknown Property',
              unitNumber: unit.unitNumber,
              tag: unit.tag ?? undefined,
              unitType: unit.unitType,
              squareFootage: (unit as any).squareFootage || undefined,
              currentRent: currentRent,
              recommendedRent: adjustedPrice,
              change: change,
              annualImpact: change * 12,
              status: unit.status,
              availabilityDate: (unit as any).availabilityDate || null,
              reasoning: currentModifiedPrices[unit.id] 
                ? 'User-adjusted pricing recommendation' 
                : 'AI-generated portfolio optimization recommendation'
            };
          }),
          summary: (() => {
            // Recalculate summary based on adjusted prices
            let totalIncrease = 0;
            let affectedUnits = 0;
            let totalCurrentRent = 0;
            
            optimization.units.forEach(unit => {
              const currentRent = parseFloat(unit.currentRent);
              totalCurrentRent += currentRent;
              
              const adjustedPrice = currentModifiedPrices[unit.id] || 
                (unit.recommendedRent ? parseFloat(unit.recommendedRent) : currentRent);
              const change = adjustedPrice - currentRent;
              
              if (change !== 0) {
                affectedUnits++;
                totalIncrease += change * 12; // Annual increase
              }
            });
            
            const avgIncrease = totalCurrentRent > 0 
              ? ((totalIncrease / 12) / totalCurrentRent * 100).toFixed(2)
              : '0';
            
            return {
              totalIncrease: totalIncrease,
              affectedUnits: affectedUnits,
              avgIncrease: parseFloat(avgIncrease),
              riskLevel: optimization.report.riskLevel,
            };
          })()
        };
      } else {
        // Single property mode
        const property = propertyQuery.data?.property;
        
        if (!property) {
          toast({
            title: "Export Failed",
            description: "Property data not available. Please refresh the page and try again.",
            variant: "destructive",
          });
          return;
        }

        exportData = {
          propertyInfo: {
            address: property.address,
            type: property.propertyType || 'Unknown',
            units: property.totalUnits || 0,
            builtYear: property.builtYear || 0,
          },
          units: optimization.units.map(unit => {
            // Use modified price if available, otherwise use recommended rent
            const adjustedPrice = currentModifiedPrices[unit.id] || 
              (unit.recommendedRent ? parseFloat(unit.recommendedRent) : parseFloat(unit.currentRent));
            const currentRent = parseFloat(unit.currentRent);
            const change = adjustedPrice - currentRent;
            
            return {
              propertyName: property.propertyName || property.address || 'Unknown Property',
              unitNumber: unit.unitNumber,
              tag: unit.tag ?? undefined,
              unitType: unit.unitType,
              squareFootage: (unit as any).squareFootage || undefined,
              currentRent: currentRent,
              recommendedRent: adjustedPrice,
              change: change,
              annualImpact: change * 12,
              status: unit.status,
              availabilityDate: (unit as any).availabilityDate || null,
              reasoning: currentModifiedPrices[unit.id] 
                ? 'User-adjusted pricing recommendation' 
                : 'AI-generated pricing recommendation'
            };
          }),
          summary: (() => {
            // Recalculate summary based on adjusted prices
            let totalIncrease = 0;
            let affectedUnits = 0;
            let totalCurrentRent = 0;
            
            optimization.units.forEach(unit => {
              const currentRent = parseFloat(unit.currentRent);
              totalCurrentRent += currentRent;
              
              const adjustedPrice = currentModifiedPrices[unit.id] || 
                (unit.recommendedRent ? parseFloat(unit.recommendedRent) : currentRent);
              const change = adjustedPrice - currentRent;
              
              if (change !== 0) {
                affectedUnits++;
                totalIncrease += change * 12; // Annual increase
              }
            });
            
            const avgIncrease = totalCurrentRent > 0 
              ? ((totalIncrease / 12) / totalCurrentRent * 100).toFixed(2)
              : '0';
            
            return {
              totalIncrease: totalIncrease,
              affectedUnits: affectedUnits,
              avgIncrease: parseFloat(avgIncrease),
              riskLevel: optimization.report.riskLevel,
            };
          })()
        };
      }

      await exportToExcel(exportData);
      
      toast({
        title: "Export Successful",
        description: isSessionMode 
          ? `Portfolio optimization report downloaded (${optimization.units.length} units across ${sessionQuery.data?.propertyProfiles?.filter(p => p.profileType === 'subject').length || 0} properties).`
          : `Property optimization report downloaded (${optimization.units.length} units).`,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel file. Please try again or check your browser's download settings.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (propertyQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="text-muted-foreground">Loading property data...</div>
      </div>
    );
  }

  if (propertyQuery.error) {
    return (
      <div className="text-center py-8" data-testid="error-state">
        <div className="text-red-600 mb-4">Failed to load property data</div>
        <Button onClick={() => window.location.reload()} data-testid="button-retry">
          Retry
        </Button>
      </div>
    );
  }

  const sessionData = sessionQuery.data;
  const subjectProperties = sessionData?.propertyProfiles?.filter(p => p.profileType === 'subject') || [];

  // Client-side deduplication of units to prevent React key warnings
  const deduplicatedUnits = useMemo(() => {
    if (!optimizationQuery.data) {
      console.log('[OPTIMIZE_DEBUG] No optimization data available');
      return [];
    }

    // Add comprehensive debugging to understand the API response structure
    console.log('[OPTIMIZE_DEBUG] === OPTIMIZATION DATA STRUCTURE DEBUG ===');
    console.log('[OPTIMIZE_DEBUG] Full optimizationQuery.data:', optimizationQuery.data);
    console.log('[OPTIMIZE_DEBUG] Has portfolio property:', !!optimizationQuery.data.portfolio);
    console.log('[OPTIMIZE_DEBUG] Has units property:', !!optimizationQuery.data.units);
    console.log('[OPTIMIZE_DEBUG] Portfolio keys:', optimizationQuery.data.portfolio ? Object.keys(optimizationQuery.data.portfolio) : 'none');
    console.log('[OPTIMIZE_DEBUG] Direct units count:', optimizationQuery.data.units ? optimizationQuery.data.units.length : 0);
    console.log('[OPTIMIZE_DEBUG] Session mode:', isSessionMode);
    
    let allUnits: PropertyUnit[] = [];
    
    // Enhanced logic to handle multiple response structures
    if (isSessionMode) {
      // First, try to get units from direct units array (new structure)
      if (optimizationQuery.data.units && Array.isArray(optimizationQuery.data.units)) {
        console.log('[OPTIMIZE_DEBUG] Session mode: Using direct units array');
        allUnits = optimizationQuery.data.units;
      }
      // Fallback to portfolio structure if direct units array is empty or doesn't exist
      else if (optimizationQuery.data.portfolio) {
        console.log('[OPTIMIZE_DEBUG] Session mode: Using portfolio structure');
        Object.values(optimizationQuery.data.portfolio).forEach(propertyData => {
          if (propertyData.units && Array.isArray(propertyData.units)) {
            allUnits = allUnits.concat(propertyData.units);
          }
        });
      }
      // Additional fallback: try to extract from any nested structure
      else {
        console.log('[OPTIMIZE_DEBUG] Session mode: Attempting deep extraction from response');
        const extractUnitsRecursively = (obj: any): PropertyUnit[] => {
          let units: PropertyUnit[] = [];
          if (obj && typeof obj === 'object') {
            if (Array.isArray(obj.units)) {
              units = units.concat(obj.units);
            }
            if (typeof obj === 'object' && !Array.isArray(obj)) {
              Object.values(obj).forEach(value => {
                units = units.concat(extractUnitsRecursively(value));
              });
            }
          }
          return units;
        };
        allUnits = extractUnitsRecursively(optimizationQuery.data);
      }
    } else {
      // Single property mode: use units directly
      console.log('[OPTIMIZE_DEBUG] Single property mode: Using direct units');
      allUnits = optimizationQuery.data.units || [];
    }
    
    console.log('[OPTIMIZE_DEBUG] Extracted units count:', allUnits.length);
    console.log('[OPTIMIZE_DEBUG] Sample unit (first 3):', allUnits.slice(0, 3));

    // Development logging to detect duplicates early
    if (import.meta.env.DEV) {
      const unitIds = allUnits.map(unit => unit.id);
      const uniqueIds = new Set(unitIds);
      
      console.log(`[OPTIMIZE] Unit deduplication check:`);
      console.log(`  Original units count: ${allUnits.length}`);
      console.log(`  Unique unit IDs count: ${uniqueIds.size}`);
      
      if (uniqueIds.size !== unitIds.length) {
        console.warn(`[OPTIMIZE] WARNING: Duplicate units detected! ${unitIds.length - uniqueIds.size} duplicates found.`);
        const duplicates = unitIds.filter((id, index) => unitIds.indexOf(id) !== index);
        console.warn(`[OPTIMIZE] Duplicate unit IDs:`, duplicates);
      }
    }

    // Use Map to deduplicate by unit.id, keeping the last occurrence
    const unitMap = new Map<string, PropertyUnit>();
    allUnits.forEach(unit => {
      unitMap.set(unit.id, unit);
    });

    const deduplicatedArray = Array.from(unitMap.values());
    
    if (import.meta.env.DEV) {
      console.log(`[OPTIMIZE] Final deduplicated units count: ${deduplicatedArray.length}`);
    }

    return deduplicatedArray;
  }, [optimizationQuery.data, isSessionMode]);

  return (
    <div className="space-y-6" data-testid="optimize-page">
      {/* Header with mode indicator */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isSessionMode ? (
              <>
                <Building2 className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">{sessionData?.name || 'Portfolio Optimization'}</h1>
                  <p className="text-sm text-muted-foreground">
                    Multi-property portfolio optimization • {subjectProperties.length} subject properties
                  </p>
                </div>
              </>
            ) : (
              <>
                <Home className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Property Optimization</h1>
                  <p className="text-sm text-muted-foreground">Single property unit optimization</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Save as Template button - only show in session mode with valid sessionId */}
            {isSessionMode && params.sessionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSaveTemplateDialogOpen(true)}
                data-testid="button-save-as-template"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            )}
            <Badge variant={isSessionMode ? "default" : "secondary"}>
              {isSessionMode ? 'Portfolio Mode' : 'Single Property'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold" data-testid="optimization-title">
            {isSessionMode ? 'Portfolio Optimization' : 'Pricing Optimization'}
          </h3>
        </div>

        {/* Optimization Controls */}
        <OptimizationControls
          goal={goal}
          targetOccupancy={targetOccupancy}
          riskTolerance={riskTolerance}
          onGoalChange={setGoal}
          onTargetOccupancyChange={setTargetOccupancy}
          onRiskToleranceChange={setRiskTolerance}
        />

        {/* Generate Button */}
        <div className="flex justify-center mb-6">
          <Button 
            size="lg"
            onClick={generateRecommendations}
            disabled={optimizeMutation.isPending || createUnitsMutation.isPending}
            data-testid="button-generate-recommendations"
            className="px-8"
          >
            {(optimizeMutation.isPending || createUnitsMutation.isPending) 
              ? "Generating Recommendations..." 
              : "Generate Optimization Recommendations"}
          </Button>
        </div>

        {/* Optimization Table */}
        {optimizationQuery.data ? (
          <OptimizationTable
            units={deduplicatedUnits}
            report={optimizationQuery.data.report}
            onPricesChange={setCurrentModifiedPrices}
            onExportToExcel={handleExportToExcel}
            isExporting={isExporting}
          />
        ) : (
          <div className="text-center py-8" data-testid="no-data-state">
            <div className="text-muted-foreground mb-4">
              No optimization data available. Generate recommendations to get started.
            </div>
            <Button 
              onClick={generateRecommendations}
              disabled={optimizeMutation.isPending || createUnitsMutation.isPending}
              data-testid="button-get-started"
            >
              Generate Recommendations
            </Button>
          </div>
        )}

      </div>

      {/* Optimization Progress Modal */}
      {showOptimizationModal && (
        <OptimizationProgressModal
          isOpen={showOptimizationModal}
          currentStage={optimizationStage}
          onComplete={() => {
            setShowOptimizationModal(false);
            setOptimizationStage(1);
          }}
          onClose={() => {
            setShowOptimizationModal(false);
            setOptimizationStage(1);
          }}
        />
      )}
      
      {/* Save Selection Template Dialog */}
      {isSessionMode && params.sessionId && (
        <SaveSelectionTemplateDialog
          sessionId={params.sessionId}
          isOpen={isSaveTemplateDialogOpen}
          onClose={() => setIsSaveTemplateDialogOpen(false)}
          onSuccess={() => {
            toast({
              title: "Template Saved",
              description: "You can now use this template to quickly create similar analysis sessions.",
            });
          }}
        />
      )}
    </div>
  );
}
