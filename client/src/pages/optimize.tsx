import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { FileSpreadsheet, Save, Building2, Home, BarChart3 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OptimizationTable from "@/components/optimization-table";
import OptimizationControls from "@/components/optimization-controls";
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

export default function Optimize({ params }: { params: { id?: string, sessionId?: string } }) {
  const { toast } = useToast();
  // Determine session mode and ID based on URL pattern
  const isSessionMode = !!params.sessionId;
  const sessionId = params.sessionId || params.id || '';
  const { state: workflowState, saveState: saveWorkflowState, loadState: loadWorkflowState } = useWorkflowState(sessionId, isSessionMode);
  
  const [goal, setGoal] = useState("maximize-revenue");
  const [targetOccupancy, setTargetOccupancy] = useState([95]);
  const [riskTolerance, setRiskTolerance] = useState([2]); // 1=Low, 2=Medium, 3=High
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [pendingPrices, setPendingPrices] = useState<Record<string, number>>({});
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Query for session data when in session mode
  const sessionQuery = useQuery<AnalysisSession & { propertyProfiles: PropertyProfile[] }>({
    queryKey: ['/api/analysis-sessions', sessionId],
    enabled: isSessionMode,
    staleTime: 30000
  });

  // Session mode is determined by URL pattern - no additional detection needed
  useEffect(() => {
    console.log('[OPTIMIZE] Mode:', isSessionMode ? 'Session-based portfolio analysis' : 'Single property analysis');
    console.log('[OPTIMIZE] Session/Property ID:', sessionId);
  }, [isSessionMode, sessionId]);

  const propertyQuery = useQuery<PropertyWithAnalysis>({
    queryKey: ['/api/properties', params.id],
    enabled: !isSessionMode
  });

  const optimizationQuery = useQuery<OptimizationData>({
    queryKey: isSessionMode 
      ? ['/api/sessions', sessionId, 'optimization']
      : ['/api/properties', params.id, 'optimization'],
    enabled: hasInitialized
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

      const endpoint = isSessionMode 
        ? `/api/analysis-sessions/${sessionId}/optimize`
        : `/api/properties/${params.id}/optimize`;
      
      // Add retry logic for API failures
      const maxRetries = 3;
      let attempt = 0;
      
      while (attempt < maxRetries) {
        try {
          const res = await apiRequest("POST", endpoint, data);
          return res.json();
        } catch (error) {
          attempt++;
          console.error(`Optimization attempt ${attempt} failed:`, error);
          
          if (attempt === maxRetries) {
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
      
      // This should never be reached but satisfies TypeScript
      throw new Error('Unexpected error during optimization');
    },
    onSuccess: (data) => {
      const queryKey = isSessionMode 
        ? ['/api/sessions', sessionId, 'optimization']
        : ['/api/properties', params.id, 'optimization'];
      queryClient.setQueryData(queryKey, data);
      
      const unitCount = Array.isArray(data.units) ? data.units.length : 
        (data.portfolio ? Object.values(data.portfolio).reduce((sum, p) => sum + p.units.length, 0) : 0);
      
      toast({
        title: "Optimization Complete",
        description: isSessionMode 
          ? `Generated portfolio recommendations for ${unitCount} total units across multiple properties.`
          : `Generated recommendations for ${unitCount} units.`,
      });
    },
    onError: (error: any) => {
      console.error('Optimization generation failed:', error);
      const errorMessage = error.message || 'Failed to generate recommendations. Please try again.';
      
      toast({
        title: "Optimization Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const applyPricingMutation = useMutation({
    mutationFn: async (unitPrices: Record<string, number>) => {
      const endpoint = isSessionMode 
        ? `/api/sessions/${sessionId}/apply-pricing`
        : `/api/properties/${params.id}/apply-pricing`;
      const res = await apiRequest("POST", endpoint, { unitPrices });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', params.id] });
      toast({
        title: "Pricing Applied Successfully",
        description: `Updated pricing for ${data.affectedUnits} units with an annual impact of $${data.totalAnnualImpact.toLocaleString()}.`,
      });
      setShowApplyDialog(false);
    },
    onError: () => {
      toast({
        title: "Failed to Apply Pricing",
        description: "There was an error saving the pricing changes. Please try again.",
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
        createUnitsMutation.mutate(undefined, {
          onSuccess: () => {
            optimizeMutation.mutate({ 
              goal, 
              targetOccupancy: targetOcc, 
              riskTolerance: riskTol 
            });
          },
          onError: (error) => {
            console.error('Failed to create units:', error);
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


  const handleApplyChanges = (unitPrices: Record<string, number>) => {
    setPendingPrices(unitPrices);
    setShowApplyDialog(true);
  };

  const confirmApplyChanges = () => {
    applyPricingMutation.mutate(pendingPrices);
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
          units: optimization.units.map(unit => ({
            unitNumber: unit.unitNumber,
            unitType: unit.unitType,
            currentRent: parseFloat(unit.currentRent),
            recommendedRent: unit.recommendedRent ? parseFloat(unit.recommendedRent) : undefined,
            change: unit.recommendedRent ? parseFloat(unit.recommendedRent) - parseFloat(unit.currentRent) : 0,
            annualImpact: unit.recommendedRent ? (parseFloat(unit.recommendedRent) - parseFloat(unit.currentRent)) * 12 : 0,
            status: unit.status,
            reasoning: 'AI-generated portfolio optimization recommendation'
          })),
          summary: {
            totalIncrease: parseFloat(optimization.report.totalIncrease),
            affectedUnits: optimization.report.affectedUnits,
            avgIncrease: parseFloat(optimization.report.avgIncrease),
            riskLevel: optimization.report.riskLevel,
          }
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
          units: optimization.units.map(unit => ({
            unitNumber: unit.unitNumber,
            unitType: unit.unitType,
            currentRent: parseFloat(unit.currentRent),
            recommendedRent: unit.recommendedRent ? parseFloat(unit.recommendedRent) : undefined,
            change: unit.recommendedRent ? parseFloat(unit.recommendedRent) - parseFloat(unit.currentRent) : 0,
            annualImpact: unit.recommendedRent ? (parseFloat(unit.recommendedRent) - parseFloat(unit.currentRent)) * 12 : 0,
            status: unit.status,
            reasoning: 'AI-generated pricing recommendation'
          })),
          summary: {
            totalIncrease: parseFloat(optimization.report.totalIncrease),
            affectedUnits: optimization.report.affectedUnits,
            avgIncrease: parseFloat(optimization.report.avgIncrease),
            riskLevel: optimization.report.riskLevel,
          }
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
      return [];
    }

    let allUnits: PropertyUnit[] = [];
    
    if (isSessionMode && optimizationQuery.data.portfolio) {
      // Session mode: collect units from all properties in portfolio
      Object.values(optimizationQuery.data.portfolio).forEach(propertyData => {
        allUnits = allUnits.concat(propertyData.units);
      });
    } else {
      // Single property mode: use units directly
      allUnits = optimizationQuery.data.units || [];
    }

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
                <span>Portfolio Optimization Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">{subjectProperties.length}</div>
                  <div className="text-muted-foreground">Properties</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {subjectProperties.reduce((sum, p) => sum + (p.totalUnits || 0), 0)}
                  </div>
                  <div className="text-muted-foreground">Total Units</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600 dark:text-orange-400">
                    {optimizationQuery.data ? Object.keys(optimizationQuery.data.portfolio || {}).length : 0}
                  </div>
                  <div className="text-muted-foreground">Optimized Properties</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    ${optimizationQuery.data?.report?.totalIncrease || '0'}
                  </div>
                  <div className="text-muted-foreground">Portfolio Impact</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" data-testid="optimization-title">
            {isSessionMode ? 'Portfolio Optimization' : 'Pricing Optimization'}
          </h3>
          <Button 
            onClick={handleExportToExcel}
            disabled={!optimizationQuery.data || isExporting}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
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
            onApplyChanges={handleApplyChanges}
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

      {/* Apply Changes Confirmation Dialog */}
      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Pricing Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to apply pricing changes to your property units. 
              This action will update the recommended rent prices for all modified units.
              <br /><br />
              {Object.keys(pendingPrices).length} units will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmApplyChanges}
              disabled={applyPricingMutation.isPending}
            >
              {applyPricingMutation.isPending ? "Applying..." : "Apply Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
