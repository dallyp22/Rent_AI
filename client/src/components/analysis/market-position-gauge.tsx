import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface MarketPositionGaugeProps {
  percentileRank: number;
  marketPosition: string;
  pricingPowerScore: number;
}

export default function MarketPositionGauge({ 
  percentileRank, 
  marketPosition,
  pricingPowerScore 
}: MarketPositionGaugeProps) {
  // Determine color and icon based on percentile
  const getPositionColor = (percentile: number) => {
    if (percentile <= 33) return "text-green-600";
    if (percentile <= 66) return "text-yellow-600";
    return "text-red-600";
  };

  const getPositionBgColor = (percentile: number) => {
    if (percentile <= 33) return "bg-green-100";
    if (percentile <= 66) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getPositionIcon = (percentile: number) => {
    if (percentile <= 33) return <TrendingDown className="h-5 w-5" />;
    if (percentile <= 66) return <Minus className="h-5 w-5" />;
    return <TrendingUp className="h-5 w-5" />;
  };

  const getPositionLabel = (percentile: number) => {
    if (percentile <= 33) return "Underpriced";
    if (percentile <= 66) return "Optimal";
    return "Overpriced";
  };

  const positionColor = getPositionColor(percentileRank);
  const positionBgColor = getPositionBgColor(percentileRank);
  const positionIcon = getPositionIcon(percentileRank);
  const positionLabel = getPositionLabel(percentileRank);

  return (
    <TooltipProvider>
      <Card data-testid="market-position-gauge">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>Market Position</span>
          <Badge 
            variant="secondary" 
            className={`${positionBgColor} ${positionColor}`}
            data-testid="position-badge"
          >
            {positionLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Percentile Gauge */}
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Market Percentile</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                    aria-label="Market Percentile explanation"
                  >
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs p-3 space-y-2">
                  <div className="font-medium">How Market Percentile is calculated:</div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Shows where your property's average rent sits compared to all competitors.</p>
                    <p className="pt-1">• <strong>0%</strong> = Your rent is the lowest (all competitors charge more)</p>
                    <p>• <strong>50%</strong> = Your rent is in the middle (half charge more, half charge less)</p>
                    <p>• <strong>100%</strong> = Your rent is the highest (all competitors charge less)</p>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 italic">
                    Example: If 3 out of 10 competitors charge less than you, you're at 30%
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className={`flex items-center gap-1 ${positionColor}`}>
              {positionIcon}
              <span className="text-2xl font-bold" data-testid="percentile-value">
                {percentileRank}%
              </span>
            </div>
          </div>
          
          {/* Visual Gauge with colored zones */}
          <div className="relative h-4 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full w-1 bg-gray-800"
              style={{ left: `${percentileRank}%` }}
              data-testid="gauge-indicator"
            />
          </div>
          
          {/* Zone labels */}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Underpriced</span>
            <span>Optimal</span>
            <span>Overpriced</span>
          </div>
        </div>

        {/* Market Position Text */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-lg font-semibold" data-testid="market-position-text">
            {marketPosition}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Current Market Position
          </div>
        </div>

        {/* Pricing Power Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">Pricing Power Score</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                    aria-label="Pricing Power Score explanation"
                  >
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs p-3 space-y-2">
                  <div className="font-medium">How Pricing Power Score is calculated:</div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>A composite score (0-100) that measures your property's pricing leverage based on three factors:</p>
                    <p className="pt-1">• <strong>40%</strong> - Market Percentile Rank</p>
                    <p className="ml-4 text-xs">Your position relative to competitors</p>
                    <p>• <strong>30%</strong> - Price Difference from Market</p>
                    <p className="ml-4 text-xs">How far above/below market average</p>
                    <p>• <strong>30%</strong> - Availability Status</p>
                    <p className="ml-4 text-xs">Available units indicate pricing flexibility</p>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <p className="font-medium mb-1">Score Ranges:</p>
                    <p>• <strong>0-40:</strong> Strong opportunity to raise prices</p>
                    <p>• <strong>40-60:</strong> Balanced market positioning</p>
                    <p>• <strong>60-80:</strong> Limited pricing flexibility</p>
                    <p>• <strong>80-100:</strong> Consider price reductions</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-bold" data-testid="pricing-power-value">
              {pricingPowerScore}/100
            </span>
          </div>
          <Progress 
            value={pricingPowerScore} 
            className="h-2" 
            data-testid="pricing-power-progress"
          />
          <div className="text-xs text-muted-foreground">
            Higher score indicates stronger pricing leverage
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}