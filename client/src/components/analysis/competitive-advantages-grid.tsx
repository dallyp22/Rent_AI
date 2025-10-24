import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DollarSign, Square, Calendar, Info } from "lucide-react";
import type { CompetitiveEdges } from "@shared/schema";

interface CompetitiveAdvantagesGridProps {
  competitiveEdges: CompetitiveEdges;
}

export default function CompetitiveAdvantagesGrid({ 
  competitiveEdges 
}: CompetitiveAdvantagesGridProps) {
  const getStatusColor = (status: "advantage" | "neutral" | "disadvantage") => {
    switch (status) {
      case "advantage": return "bg-green-100 text-green-700 border-green-300";
      case "neutral": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "disadvantage": return "bg-red-100 text-red-700 border-red-300";
    }
  };

  const getStatusBadge = (status: "advantage" | "neutral" | "disadvantage") => {
    switch (status) {
      case "advantage": return "Advantage";
      case "neutral": return "Neutral";
      case "disadvantage": return "Disadvantage";
    }
  };

  const edges = [
    {
      key: "pricing",
      title: "Pricing",
      icon: <DollarSign className="h-5 w-5" />,
      data: competitiveEdges.pricing
    },
    {
      key: "size",
      title: "Unit Size",
      icon: <Square className="h-5 w-5" />,
      data: competitiveEdges.size
    },
    {
      key: "availability",
      title: "Availability",
      icon: <Calendar className="h-5 w-5" />,
      data: competitiveEdges.availability
    }
  ];

  return (
    <TooltipProvider>
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
      data-testid="competitive-advantages-grid"
    >
      {edges.map((edge) => (
        <Card 
          key={edge.key}
          className={`h-full border-2 ${getStatusColor(edge.data.status)} transition-all hover:shadow-lg`}
          data-testid={`edge-card-${edge.key}`}
        >
          <CardContent className="p-4 h-full flex flex-col">
            {/* Header with icon and title */}
            <div className="text-center mb-3 space-y-2">
              <div className="flex items-center justify-center gap-2">
                {edge.icon}
                <span className="font-semibold text-sm">{edge.title}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                      aria-label={`${edge.title} explanation`}
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 space-y-2">
                    {edge.key === "pricing" && (
                      <>
                        <div className="font-medium">Pricing Advantage</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Shows how your average rent compares to competitors.</p>
                          <p className="pt-1">• <strong>Negative %</strong> - You charge less than market (pricing advantage)</p>
                          <p>• <strong>0%</strong> - You're at market rate</p>
                          <p>• <strong>Positive %</strong> - You charge more than market (may need adjustment)</p>
                        </div>
                        <div className="text-xs text-muted-foreground pt-2 italic">
                          Example: -19% means your rents are 19% below competitor average
                        </div>
                      </>
                    )}
                    {edge.key === "size" && (
                      <>
                        <div className="font-medium">Size Advantage</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Compares your average unit size to competitors.</p>
                          <p className="pt-1">• <strong>Positive sq ft</strong> - Your units are larger (space advantage)</p>
                          <p>• <strong>0 sq ft</strong> - Similar sized units</p>
                          <p>• <strong>Negative sq ft</strong> - Your units are smaller</p>
                        </div>
                        <div className="text-xs text-muted-foreground pt-2 italic">
                          Larger units typically command higher rents but may be harder to lease
                        </div>
                      </>
                    )}
                    {edge.key === "availability" && (
                      <>
                        <div className="font-medium">Availability Advantage</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Compares available units between you and competitors.</p>
                          <p className="pt-1">• <strong>More units</strong> - You have more availability (may indicate pricing is too high)</p>
                          <p>• <strong>Equal</strong> - Similar availability levels</p>
                          <p>• <strong>Fewer units</strong> - You have less availability (opportunity to raise prices)</p>
                        </div>
                        <div className="text-xs text-muted-foreground pt-2 italic">
                          Lower availability often indicates stronger demand and pricing power
                        </div>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex justify-center">
                <Badge 
                  variant="outline" 
                  className="text-xs whitespace-nowrap"
                  data-testid={`status-badge-${edge.key}`}
                >
                  {getStatusBadge(edge.data.status)}
                </Badge>
              </div>
            </div>

            {/* Edge value display */}
            <div className="flex-1 flex items-center justify-center py-3">
              <div 
                className="text-xl lg:text-2xl font-bold text-center leading-tight"
                data-testid={`edge-value-${edge.key}`}
              >
                {edge.key === "pricing" && edge.data.edge !== 0 && (
                  <div className="flex flex-col items-center">
                    <span>{edge.data.edge > 0 ? `+${edge.data.edge}%` : `${edge.data.edge}%`}</span>
                  </div>
                )}
                {edge.key === "size" && edge.data.edge !== 0 && (
                  <div className="flex flex-col items-center">
                    <span>{edge.data.edge > 0 ? `+${edge.data.edge}` : `${edge.data.edge}`}</span>
                    <span className="text-sm font-normal">sq ft</span>
                  </div>
                )}
                {edge.key === "availability" && (
                  <div className="flex flex-col items-center">
                    <span>{edge.data.edge !== 0 ? `${Math.abs(edge.data.edge)}` : "0"}</span>
                    <span className="text-sm font-normal">
                      {edge.data.edge !== 0 ? "units" : "equal"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description label */}
            <div className="text-center mt-auto">
              <span 
                className="text-xs font-medium leading-tight block"
                data-testid={`edge-label-${edge.key}`}
              >
                {edge.data.label}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    </TooltipProvider>
  );
}