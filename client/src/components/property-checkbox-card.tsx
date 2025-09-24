import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ExternalLink, Building2 } from "lucide-react";
import type { PropertyProfile } from "@shared/schema";

interface PropertyCheckboxCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'property'> {
  property: PropertyProfile;
  isSelected: boolean;
  onSelectionChange: (propertyId: string, selected: boolean) => void;
  showDistance?: boolean;
  className?: string;
}

export default function PropertyCheckboxCard({
  property,
  isSelected,
  onSelectionChange,
  showDistance = false,
  className = "",
  ...rest
}: PropertyCheckboxCardProps) {
  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${className}`}
      data-testid={`property-card-${property.id}`}
      {...rest}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectionChange(property.id, !!checked)}
        data-testid={`checkbox-property-${property.id}`}
        className="shrink-0"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate" data-testid={`text-name-${property.id}`}>
              {property.name}
            </h4>
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-address-${property.id}`}>
              {property.address}
            </p>
          </div>
          
          {property.url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => window.open(property.url, '_blank')}
              title="View property URL"
              data-testid={`button-view-url-${property.id}`}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="flex gap-1 mt-1 flex-wrap">
          {property.totalUnits && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-units-${property.id}`}>
              <Building2 className="h-3 w-3 mr-1" />
              {property.totalUnits} units
            </Badge>
          )}
          
          {showDistance && property.distance && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-distance-${property.id}`}>
              {property.distance} mi
            </Badge>
          )}
          
          {property.builtYear && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-year-${property.id}`}>
              {property.builtYear}
            </Badge>
          )}
          
          {property.propertyType && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-type-${property.id}`}>
              {property.propertyType}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}