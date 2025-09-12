import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Square, Calendar } from "lucide-react";
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
  );
}