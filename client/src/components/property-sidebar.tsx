import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Users, CheckSquare, Square, Building2 } from "lucide-react";
import PropertyCheckboxCard from "@/components/property-checkbox-card";
import type { PropertyProfile } from "@shared/schema";

interface PropertySidebarProps {
  selectedPropertyIds: string[];
  onPropertySelectionChange: (propertyId: string, selected: boolean) => void;
  className?: string;
}

interface PropertySelectionCounts {
  subjects: number;
  competitors: number;
  total: number;
}

export default function PropertySidebar({
  selectedPropertyIds,
  onPropertySelectionChange,
  className = ""
}: PropertySidebarProps) {
  // Fetch subject properties
  const { data: subjectProperties = [], isLoading: isLoadingSubjects } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/property-profiles", { type: "subject" }],
  });

  // Fetch competitor properties
  const { data: competitorProperties = [], isLoading: isLoadingCompetitors } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/property-profiles", { type: "competitor" }],
  });

  const isLoading = isLoadingSubjects || isLoadingCompetitors;

  // Calculate selection counts
  const getSelectionCounts = (): PropertySelectionCounts => {
    const selectedSubjects = subjectProperties.filter(p => selectedPropertyIds.includes(p.id)).length;
    const selectedCompetitors = competitorProperties.filter(p => selectedPropertyIds.includes(p.id)).length;
    
    return {
      subjects: selectedSubjects,
      competitors: selectedCompetitors,
      total: selectedSubjects + selectedCompetitors
    };
  };

  const counts = getSelectionCounts();

  // Select/deselect all properties of a type
  const handleSelectAllType = (type: 'subject' | 'competitor', selectAll: boolean) => {
    const properties = type === 'subject' ? subjectProperties : competitorProperties;
    
    properties.forEach(property => {
      const isCurrentlySelected = selectedPropertyIds.includes(property.id);
      if (selectAll && !isCurrentlySelected) {
        onPropertySelectionChange(property.id, true);
      } else if (!selectAll && isCurrentlySelected) {
        onPropertySelectionChange(property.id, false);
      }
    });
  };

  // Check if all properties of a type are selected
  const areAllSelected = (type: 'subject' | 'competitor'): boolean => {
    const properties = type === 'subject' ? subjectProperties : competitorProperties;
    return properties.length > 0 && properties.every(p => selectedPropertyIds.includes(p.id));
  };

  if (isLoading) {
    return (
      <Card className={className} data-testid="property-sidebar-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="property-sidebar">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Property Selection
        </CardTitle>
        {counts.total > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="default" data-testid="badge-total-selected">
              {counts.total} Selected
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Subject Properties Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium text-sm">Subject Properties</h3>
              <Badge variant="secondary" className="text-xs" data-testid="badge-subject-count">
                {subjectProperties.length} available
              </Badge>
            </div>
            
            {subjectProperties.length > 0 && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleSelectAllType('subject', true)}
                  disabled={areAllSelected('subject')}
                  data-testid="button-select-all-subjects"
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleSelectAllType('subject', false)}
                  disabled={counts.subjects === 0}
                  data-testid="button-deselect-all-subjects"
                >
                  <Square className="h-3 w-3 mr-1" />
                  None
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {subjectProperties.length === 0 ? (
              <div className="text-center text-muted-foreground py-6" data-testid="no-subject-properties">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No subject properties available</p>
              </div>
            ) : (
              subjectProperties.map((property) => (
                <PropertyCheckboxCard
                  key={property.id}
                  property={property}
                  isSelected={selectedPropertyIds.includes(property.id)}
                  onSelectionChange={onPropertySelectionChange}
                  showDistance={false}
                  data-testid={`subject-property-${property.id}`}
                />
              ))
            )}
          </div>
          
          {counts.subjects > 0 && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs" data-testid="badge-subject-selected">
                {counts.subjects} of {subjectProperties.length} selected
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Competitor Properties Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              <h3 className="font-medium text-sm">Competitor Properties</h3>
              <Badge variant="secondary" className="text-xs" data-testid="badge-competitor-count">
                {competitorProperties.length} available
              </Badge>
            </div>
            
            {competitorProperties.length > 0 && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleSelectAllType('competitor', true)}
                  disabled={areAllSelected('competitor')}
                  data-testid="button-select-all-competitors"
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleSelectAllType('competitor', false)}
                  disabled={counts.competitors === 0}
                  data-testid="button-deselect-all-competitors"
                >
                  <Square className="h-3 w-3 mr-1" />
                  None
                </Button>
              </div>
            )}
          </div>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-2">
              {competitorProperties.length === 0 ? (
                <div className="text-center text-muted-foreground py-6" data-testid="no-competitor-properties">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No competitor properties available</p>
                </div>
              ) : (
                competitorProperties.map((property) => (
                  <PropertyCheckboxCard
                    key={property.id}
                    property={property}
                    isSelected={selectedPropertyIds.includes(property.id)}
                    onSelectionChange={onPropertySelectionChange}
                    showDistance={true}
                    data-testid={`competitor-property-${property.id}`}
                  />
                ))
              )}
            </div>
          </ScrollArea>
          
          {counts.competitors > 0 && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs" data-testid="badge-competitor-selected">
                {counts.competitors} of {competitorProperties.length} selected
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}