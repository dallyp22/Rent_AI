import { useState, useEffect, useCallback } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Settings } from "lucide-react";

interface OptimizationControlsProps {
  goal: string;
  targetOccupancy: number[];
  riskTolerance: number[];
  onGoalChange: (goal: string) => void;
  onTargetOccupancyChange: (value: number[]) => void;
  onRiskToleranceChange: (value: number[]) => void;
}

interface PresetConfig {
  occupancy: number;
  risk: number;
}

const presets: Record<string, PresetConfig> = {
  "maximize-revenue": { occupancy: 85, risk: 3 },
  "maximize-occupancy": { occupancy: 98, risk: 1 },
  "balanced": { occupancy: 92, risk: 2 }
};

// Utility function for smooth value transitions
const animateSliderValue = (
  currentValue: number,
  targetValue: number,
  onUpdate: (value: number) => void,
  duration: number = 500
): void => {
  const steps = 20;
  const stepDuration = duration / steps;
  const valueStep = (targetValue - currentValue) / steps;
  
  let step = 0;
  
  const animate = () => {
    if (step < steps) {
      const newValue = Math.round(currentValue + (valueStep * step));
      onUpdate(newValue);
      step++;
      setTimeout(animate, stepDuration);
    } else {
      // Ensure final value is exact
      onUpdate(targetValue);
    }
  };
  
  animate();
};

const getRiskLabel = (value: number): string => {
  switch (value) {
    case 1: return "Low";
    case 2: return "Medium";
    case 3: return "High";
    default: return "Medium";
  }
};

export default function OptimizationControls({
  goal,
  targetOccupancy,
  riskTolerance,
  onGoalChange,
  onTargetOccupancyChange,
  onRiskToleranceChange
}: OptimizationControlsProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevGoal, setPrevGoal] = useState(goal);

  // Handle goal changes and trigger animations
  useEffect(() => {
    // Only animate if goal actually changed and it's not Custom mode
    if (goal !== prevGoal && goal !== "custom" && presets[goal]) {
      setIsAnimating(true);
      
      const preset = presets[goal];
      const currentOccupancy = targetOccupancy[0];
      const currentRisk = riskTolerance[0];
      
      // Animate occupancy if it's different
      if (currentOccupancy !== preset.occupancy) {
        animateSliderValue(
          currentOccupancy,
          preset.occupancy,
          (value) => onTargetOccupancyChange([value]),
          500
        );
      }
      
      // Animate risk tolerance if it's different
      if (currentRisk !== preset.risk) {
        animateSliderValue(
          currentRisk,
          preset.risk,
          (value) => onRiskToleranceChange([value]),
          500
        );
      }
      
      // Stop animation state after duration
      setTimeout(() => setIsAnimating(false), 500);
    }
    
    setPrevGoal(goal);
  }, [goal, targetOccupancy, riskTolerance, onTargetOccupancyChange, onRiskToleranceChange, prevGoal]);

  const isCustomMode = goal === "custom";
  const isSliderDisabled = !isCustomMode;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" data-testid="optimization-controls">
      {/* Optimization Goal Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Optimization Goal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={goal} onValueChange={onGoalChange} data-testid="radio-goal">
            <div className="space-y-3">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maximize-revenue" id="maximize-revenue" />
                  <Label htmlFor="maximize-revenue" className="font-medium">Maximize Revenue</Label>
                </div>
                <Badge variant="secondary" className="text-xs">85% • High Risk</Badge>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maximize-occupancy" id="maximize-occupancy" />
                  <Label htmlFor="maximize-occupancy" className="font-medium">Maximize Occupancy</Label>
                </div>
                <Badge variant="secondary" className="text-xs">98% • Low Risk</Badge>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced" className="font-medium">Balanced</Label>
                </div>
                <Badge variant="secondary" className="text-xs">92% • Medium Risk</Badge>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-medium">Custom</Label>
                </div>
                <Badge variant="outline" className="text-xs">User Defined</Badge>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      {/* Target Occupancy Slider */}
      <Card className={`transition-opacity duration-300 ${isSliderDisabled ? 'opacity-60' : 'opacity-100'}`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Target Occupancy</span>
            {isAnimating && !isCustomMode && (
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
                <span className="text-xs text-blue-500 font-medium">Auto-adjusting</span>
              </div>
            )}
            {isSliderDisabled && !isAnimating && (
              <Badge variant="outline" className="text-xs">Auto-configured</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="px-2" data-testid="slider-occupancy">
            <Slider
              value={targetOccupancy}
              onValueChange={isCustomMode ? onTargetOccupancyChange : undefined}
              max={100}
              min={85}
              step={1}
              className={`w-full transition-all duration-300 ${
                isSliderDisabled 
                  ? 'pointer-events-none cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
              disabled={isSliderDisabled}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>85%</span>
            <span className={`font-semibold transition-all duration-200 ${
              isAnimating ? 'text-blue-500 scale-110' : 'text-foreground'
            }`}>
              {targetOccupancy[0]}%
            </span>
            <span>100%</span>
          </div>
          {isSliderDisabled && (
            <div className="text-xs text-muted-foreground text-center italic">
              Switch to Custom mode to manually adjust
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Risk Tolerance Slider */}
      <Card className={`transition-opacity duration-300 ${isSliderDisabled ? 'opacity-60' : 'opacity-100'}`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Risk Tolerance</span>
            {isAnimating && !isCustomMode && (
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
                <span className="text-xs text-blue-500 font-medium">Auto-adjusting</span>
              </div>
            )}
            {isSliderDisabled && !isAnimating && (
              <Badge variant="outline" className="text-xs">Auto-configured</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="px-2" data-testid="slider-risk">
            <Slider
              value={riskTolerance}
              onValueChange={isCustomMode ? onRiskToleranceChange : undefined}
              max={3}
              min={1}
              step={1}
              className={`w-full transition-all duration-300 ${
                isSliderDisabled 
                  ? 'pointer-events-none cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
              disabled={isSliderDisabled}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Low</span>
            <span className={`font-semibold transition-all duration-200 ${
              isAnimating ? 'text-blue-500 scale-110' : 'text-foreground'
            }`}>
              {getRiskLabel(riskTolerance[0])}
            </span>
            <span>High</span>
          </div>
          {isSliderDisabled && (
            <div className="text-xs text-muted-foreground text-center italic">
              Switch to Custom mode to manually adjust
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}