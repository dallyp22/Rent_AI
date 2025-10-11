import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Building2, MapPin, Calendar, Home } from "lucide-react";
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
    <Card
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      } ${className}`}
      data-testid={`property-card-${property.id}`}
      {...rest}
    >
      <div className="p-6 space-y-4">
        {/* Header with checkbox and external link */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(property.id, !!checked)}
              data-testid={`checkbox-property-${property.id}`}
              className="mt-1 h-5 w-5 shrink-0 border-2"
            />
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight" data-testid={`text-name-${property.id}`}>
                {property.name}
              </h3>
              
              {property.address && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="line-clamp-1" data-testid={`text-address-${property.id}`}>
                    {property.address}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {property.url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0 hover:bg-secondary"
              onClick={(e) => {
                e.stopPropagation();
                window.open(property.url, '_blank');
              }}
              title="View property URL"
              data-testid={`button-view-url-${property.id}`}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Property Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {property.totalUnits && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium" data-testid={`badge-units-${property.id}`}>
                  {property.totalUnits} units
                </div>
                <div className="text-xs text-muted-foreground">Total Units</div>
              </div>
            </div>
          )}
          
          {property.propertyType && (
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium" data-testid={`badge-type-${property.id}`}>
                  {property.propertyType}
                </div>
                <div className="text-xs text-muted-foreground">Property Type</div>
              </div>
            </div>
          )}
          
          {property.builtYear && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium" data-testid={`badge-year-${property.id}`}>
                  {property.builtYear}
                </div>
                <div className="text-xs text-muted-foreground">Built Year</div>
              </div>
            </div>
          )}
          
          {showDistance && property.distance && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium" data-testid={`badge-distance-${property.id}`}>
                  {property.distance} mi
                </div>
                <div className="text-xs text-muted-foreground">Distance</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Property Type Badge */}
        <div className="pt-2 border-t">
          <Badge 
            variant={property.profileType === 'subject' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {property.profileType === 'subject' ? 'Subject Property' : 'Competitor Property'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}