import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileSpreadsheet, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OptimizationTable from "@/components/optimization-table";
import { exportToExcel, type ExcelExportData } from "@/lib/excel-export";
import type { Property, PropertyUnit, OptimizationReport } from "@shared/schema";

interface OptimizationData {
  report: OptimizationReport;
  units: PropertyUnit[];
}

interface PropertyWithAnalysis {
  property: Property;
  analysis: any;
}

export default function Optimize({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  
  const [goal, setGoal] = useState("maximize-revenue");
  const [targetOccupancy, setTargetOccupancy] = useState([95]);
  const [riskTolerance, setRiskTolerance] = useState([2]); // 1=Low, 2=Medium, 3=High
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [pendingPrices, setPendingPrices] = useState<Record<string, number>>({});

  const propertyQuery = useQuery<PropertyWithAnalysis>({
    queryKey: ['/api/properties', params.id],
  });

  const optimizationQuery = useQuery<OptimizationData>({
    queryKey: ['/api/properties', params.id, 'optimization'],
    enabled: false // We'll trigger this manually
  });

  const createUnitsMutation = useMutation({
    mutationFn: async (): Promise<PropertyUnit[]> => {
      const res = await apiRequest("POST", `/api/properties/${params.id}/units`, {});
      return res.json();
    }
  });

  const optimizeMutation = useMutation({
    mutationFn: async (data: { goal: string; targetOccupancy: number; riskTolerance: number }): Promise<OptimizationData> => {
      const res = await apiRequest("POST", `/api/properties/${params.id}/optimize`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/properties', params.id, 'optimization'], data);
      toast({
        title: "Optimization Complete",
        description: `Generated recommendations for ${data.units.length} units.`,
      });
    },
    onError: () => {
      toast({
        title: "Optimization Failed",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    }
  });

  const applyPricingMutation = useMutation({
    mutationFn: async (unitPrices: Record<string, number>) => {
      const res = await apiRequest("POST", `/api/properties/${params.id}/apply-pricing`, { unitPrices });
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
    // First create units if they don't exist, then optimize
    if (!optimizationQuery.data) {
      createUnitsMutation.mutate(undefined, {
        onSuccess: () => {
          optimizeMutation.mutate({ 
            goal, 
            targetOccupancy: targetOccupancy[0], 
            riskTolerance: riskTolerance[0] 
          });
        }
      });
    } else {
      optimizeMutation.mutate({ 
        goal, 
        targetOccupancy: targetOccupancy[0], 
        riskTolerance: riskTolerance[0] 
      });
    }
  };

  const getRiskLabel = (value: number) => {
    switch (value) {
      case 1: return "Low";
      case 2: return "Medium";
      case 3: return "High";
      default: return "Medium";
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
    const property = propertyQuery.data?.property;
    const optimization = optimizationQuery.data;
    
    if (!property || !optimization) {
      toast({
        title: "Export Failed",
        description: "No optimization data available to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData: ExcelExportData = {
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
        confidenceLevel: 'Medium', // Default confidence level
        reasoning: 'AI-generated pricing recommendation' // Default reasoning
      })),
      summary: {
        totalIncrease: parseFloat(optimization.report.totalIncrease),
        affectedUnits: optimization.report.affectedUnits,
        avgIncrease: parseFloat(optimization.report.avgIncrease),
        riskLevel: optimization.report.riskLevel,
      }
    };

    try {
      await exportToExcel(exportData);
      toast({
        title: "Export Successful",
        description: "Optimization report has been downloaded as Excel file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel file. Please try again.",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6" data-testid="optimize-page">
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" data-testid="optimization-title">
            Pricing Optimization
          </h3>
          <Button 
            onClick={handleExportToExcel}
            disabled={!optimizationQuery.data}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>

        {/* Optimization Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" data-testid="optimization-controls">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Optimization Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={goal} onValueChange={setGoal} data-testid="radio-goal">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maximize-revenue" id="maximize-revenue" />
                  <Label htmlFor="maximize-revenue">Maximize Revenue</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maximize-occupancy" id="maximize-occupancy" />
                  <Label htmlFor="maximize-occupancy">Maximize Occupancy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced">Balanced</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="px-2" data-testid="slider-occupancy">
                <Slider
                  value={targetOccupancy}
                  onValueChange={setTargetOccupancy}
                  max={100}
                  min={85}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>85%</span>
                <span className="font-semibold">{targetOccupancy[0]}%</span>
                <span>100%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Tolerance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="px-2" data-testid="slider-risk">
                <Slider
                  value={riskTolerance}
                  onValueChange={setRiskTolerance}
                  max={3}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Low</span>
                <span className="font-semibold">{getRiskLabel(riskTolerance[0])}</span>
                <span>High</span>
              </div>
            </CardContent>
          </Card>
        </div>

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
            units={optimizationQuery.data.units}
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
