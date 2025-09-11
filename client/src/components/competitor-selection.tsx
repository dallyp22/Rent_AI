import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight } from "lucide-react";
import type { ScrapedProperty } from "@shared/schema";

interface CompetitorSelectionProps {
  competitors: ScrapedProperty[];
  onContinue: (selectedIds: string[]) => void;
}

export default function CompetitorSelection({ competitors, onContinue }: CompetitorSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : prev.length < 5 
        ? [...prev, id]
        : prev
    );
  };

  const handleContinue = () => {
    onContinue(selectedIds);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6" data-testid="competitor-selection">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold" data-testid="selection-title">
          Select Competitor Properties
        </h3>
        <div className="text-sm text-muted-foreground" data-testid="selection-limit">
          Select up to 5 properties for comparison
        </div>
      </div>

      <div className="space-y-3" data-testid="competitors-list">
        {competitors.map((property) => (
          <div 
            key={property.id}
            className="flex items-center p-4 border border-border rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => toggleSelection(property.id)}
            data-testid={`competitor-${property.id}`}
          >
            <Checkbox
              checked={selectedIds.includes(property.id)}
              onChange={() => toggleSelection(property.id)}
              className="mr-4"
              data-testid={`checkbox-competitor-${property.id}`}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold" data-testid={`name-${property.id}`}>
                  {property.name}
                </h4>
                {property.distance && (
                  <div className="text-sm text-muted-foreground">
                    <span data-testid={`distance-${property.id}`}>
                      {property.distance} miles away
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1" data-testid={`details-${property.id}`}>
                {property.address}
              </div>
              {property.matchScore && (
                <div className="text-xs text-muted-foreground mt-2">
                  <span data-testid={`match-score-${property.id}`}>
                    Match Score: {property.matchScore}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-muted-foreground" data-testid="selection-count">
          {selectedIds.length} of 5 properties selected
        </div>
        <Button 
          onClick={handleContinue}
          disabled={selectedIds.length === 0}
          data-testid="button-continue-summary"
        >
          Continue to Summary
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
