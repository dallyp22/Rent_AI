import { memo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home } from "lucide-react";
import { motion } from "framer-motion";
import type { PropertyProfile } from "@shared/schema";

interface PropertyFilterSidebarProps {
  availableProperties: PropertyProfile[];
  selectedProperties?: string[];
  onPropertySelectionChange: (propertyIds: string[] | undefined) => void;
  isLoadingProperties?: boolean;
}

const PropertyFilterSidebar = memo(({
  availableProperties,
  selectedProperties,
  onPropertySelectionChange,
  isLoadingProperties = false
}: PropertyFilterSidebarProps) => {
  // Property filtering handlers
  const handlePropertyChange = useCallback((propertyId: string, checked: boolean) => {
    const currentProperties = selectedProperties || [];
    const newProperties = checked
      ? [...currentProperties, propertyId]
      : currentProperties.filter(id => id !== propertyId);
    
    onPropertySelectionChange(newProperties.length > 0 ? newProperties : undefined);
  }, [selectedProperties, onPropertySelectionChange]);

  const handleSelectAllProperties = useCallback(() => {
    const allPropertyIds = availableProperties.map(p => p.id);
    onPropertySelectionChange(allPropertyIds.length > 0 ? allPropertyIds : undefined);
  }, [onPropertySelectionChange, availableProperties]);

  const handleDeselectAllProperties = useCallback(() => {
    onPropertySelectionChange(undefined);
  }, [onPropertySelectionChange]);

  // Don't render if no properties available
  if (!availableProperties || availableProperties.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="w-full h-full" 
      data-testid="property-filter-sidebar"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between" data-testid="property-filters-title">
            <span className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Properties
            </span>
            {selectedProperties?.length && (
              <Badge variant="outline" className="ml-2">
                {selectedProperties.length} selected
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Filter analysis by specific properties in your portfolio
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selection Controls */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllProperties}
              className="text-xs flex-1"
              data-testid="button-select-all-properties"
              disabled={isLoadingProperties}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAllProperties}
              className="text-xs flex-1"
              data-testid="button-deselect-all-properties"
              disabled={isLoadingProperties || !selectedProperties?.length}
            >
              Deselect All
            </Button>
          </div>

          {/* Property List */}
          {isLoadingProperties ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2 p-2">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="property-list">
              {availableProperties.map((property) => {
                const isSelected = selectedProperties?.includes(property.id) || false;
                const isSubject = property.profileType === 'subject';
                
                return (
                  <div 
                    key={property.id} 
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/30" 
                    data-testid={`property-${property.id}`}
                  >
                    <Checkbox
                      id={`property-${property.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handlePropertyChange(property.id, checked as boolean)}
                      data-testid={`checkbox-property-${property.id}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isSubject ? (
                          <Home className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Building2 className="h-3 w-3 text-orange-500 flex-shrink-0" />
                        )}
                        <Label 
                          htmlFor={`property-${property.id}`} 
                          className="text-sm cursor-pointer font-medium truncate"
                          data-testid={`label-property-${property.id}`}
                        >
                          {property.name}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={isSubject ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {isSubject ? "Subject" : "Competitor"}
                        </Badge>
                        {property.totalUnits && (
                          <Badge variant="outline" className="text-xs">
                            {property.totalUnits} units
                          </Badge>
                        )}
                      </div>
                      {property.address && (
                        <p className="text-xs text-muted-foreground truncate">
                          {property.address}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <div className="flex justify-between">
              <span>Total Properties:</span>
              <span className="font-medium">{availableProperties.length}</span>
            </div>
            {selectedProperties && (
              <div className="flex justify-between">
                <span>Selected:</span>
                <span className="font-medium">{selectedProperties.length}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

PropertyFilterSidebar.displayName = "PropertyFilterSidebar";

export default PropertyFilterSidebar;