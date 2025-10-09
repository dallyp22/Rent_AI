import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Bed, 
  Tag as TagIcon, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  X,
  Filter
} from "lucide-react";
import { formatCurrency, formatCurrencyChange } from "@/utils/formatters";
import type { PropertyUnit, TagDefinition } from "@shared/schema";

interface PropertyDrillDownProps {
  propertyProfileId?: string;
  sessionId?: string;
  showFilters?: boolean;
  onUnitSelect?: (unitId: string) => void;
}

interface HierarchicalData {
  propertyId: string;
  propertyName: string;
  hierarchy: {
    [bedrooms: string]: {
      [tag: string]: PropertyUnit[];
    };
  };
}

interface SessionHierarchicalData {
  sessionId: string;
  sessionName: string;
  properties: {
    propertyId: string;
    propertyName: string;
    hierarchy: {
      [bedrooms: string]: {
        [tag: string]: PropertyUnit[];
      };
    };
  }[];
}

type PropertyHierarchy = {
  [bedrooms: string]: {
    [tag: string]: PropertyUnit[];
  };
};

export function PropertyDrillDown({
  propertyProfileId,
  sessionId,
  showFilters = true,
  onUnitSelect
}: PropertyDrillDownProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Determine which mode we're in
  const isSessionMode = !!sessionId;

  // Fetch hierarchical units data (single property mode)
  const { data: singlePropertyData, isLoading: isLoadingSingleProperty, error: singlePropertyError } = useQuery<HierarchicalData>({
    queryKey: ['/api/property-profiles', propertyProfileId, 'units', 'hierarchical'],
    enabled: !!propertyProfileId && !isSessionMode,
  });

  // Fetch hierarchical units data (session mode)
  const { data: sessionData, isLoading: isLoadingSession, error: sessionError } = useQuery<SessionHierarchicalData>({
    queryKey: ['/api/analysis-sessions', sessionId, 'units', 'hierarchical'],
    enabled: !!sessionId && isSessionMode,
  });

  // Determine loading and error states
  const isLoadingUnits = isSessionMode ? isLoadingSession : isLoadingSingleProperty;
  const unitsError = isSessionMode ? sessionError : singlePropertyError;

  // Fetch tag definitions
  const { data: tagDefinitions = [], isLoading: isLoadingTags } = useQuery<TagDefinition[]>({
    queryKey: ['/api/tag-definitions'],
  });

  // Get unique tags across all properties (for session mode) or single property
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    
    if (isSessionMode && sessionData) {
      sessionData.properties.forEach(property => {
        Object.values(property.hierarchy).forEach(tagGroups => {
          Object.keys(tagGroups).forEach(tag => tags.add(tag));
        });
      });
    } else if (singlePropertyData) {
      Object.values(singlePropertyData.hierarchy).forEach(tagGroups => {
        Object.keys(tagGroups).forEach(tag => tags.add(tag));
      });
    }
    
    return Array.from(tags).sort();
  }, [isSessionMode, sessionData, singlePropertyData]);

  // Filter a single property's hierarchy based on selected tags
  const filterHierarchy = (hierarchy: PropertyHierarchy): PropertyHierarchy => {
    if (selectedTags.length === 0) {
      return hierarchy;
    }

    const filtered: PropertyHierarchy = {};

    Object.entries(hierarchy).forEach(([bedroomKey, tagGroups]) => {
      const filteredTags: typeof tagGroups = {};

      Object.entries(tagGroups).forEach(([tag, units]) => {
        if (selectedTags.includes(tag)) {
          filteredTags[tag] = units;
        }
      });

      if (Object.keys(filteredTags).length > 0) {
        filtered[bedroomKey] = filteredTags;
      }
    });

    return filtered;
  };

  // Calculate overall session/property statistics
  const overallStats = useMemo(() => {
    let totalUnits = 0;
    let totalCurrentRent = 0;
    let totalRecommendedRent = 0;

    if (isSessionMode && sessionData) {
      sessionData.properties.forEach(property => {
        const filteredHierarchy = filterHierarchy(property.hierarchy);
        Object.values(filteredHierarchy).forEach(tagGroups => {
          Object.values(tagGroups).forEach(units => {
            units.forEach(unit => {
              totalUnits++;
              totalCurrentRent += parseFloat(unit.currentRent);
              totalRecommendedRent += parseFloat(unit.recommendedRent || unit.currentRent);
            });
          });
        });
      });
    } else if (singlePropertyData) {
      const filteredHierarchy = filterHierarchy(singlePropertyData.hierarchy);
      Object.values(filteredHierarchy).forEach(tagGroups => {
        Object.values(tagGroups).forEach(units => {
          units.forEach(unit => {
            totalUnits++;
            totalCurrentRent += parseFloat(unit.currentRent);
            totalRecommendedRent += parseFloat(unit.recommendedRent || unit.currentRent);
          });
        });
      });
    }

    const avgRent = totalUnits > 0 ? totalCurrentRent / totalUnits : 0;
    const totalAnnualImpact = (totalRecommendedRent - totalCurrentRent) * 12;

    return {
      totalUnits,
      avgRent,
      totalAnnualImpact
    };
  }, [isSessionMode, sessionData, singlePropertyData, selectedTags]);

  // Calculate property-level statistics
  const getPropertyStats = (hierarchy: PropertyHierarchy) => {
    const filteredHierarchy = filterHierarchy(hierarchy);
    let totalUnits = 0;
    let totalCurrentRent = 0;
    let totalRecommendedRent = 0;

    Object.values(filteredHierarchy).forEach(tagGroups => {
      Object.values(tagGroups).forEach(units => {
        units.forEach(unit => {
          totalUnits++;
          totalCurrentRent += parseFloat(unit.currentRent);
          totalRecommendedRent += parseFloat(unit.recommendedRent || unit.currentRent);
        });
      });
    });

    const avgRent = totalUnits > 0 ? totalCurrentRent / totalUnits : 0;
    const totalAnnualImpact = (totalRecommendedRent - totalCurrentRent) * 12;

    return {
      totalUnits,
      avgRent,
      totalAnnualImpact
    };
  };

  // Calculate bedroom-level statistics
  const getBedroomStats = (tagGroups: { [tag: string]: PropertyUnit[] }) => {
    let count = 0;
    let totalRent = 0;

    Object.values(tagGroups).forEach(units => {
      units.forEach(unit => {
        count++;
        totalRent += parseFloat(unit.currentRent);
      });
    });

    return {
      count,
      avgRent: count > 0 ? totalRent / count : 0
    };
  };

  // Calculate TAG-level statistics
  const getTagStats = (units: PropertyUnit[]) => {
    const count = units.length;
    const totalRent = units.reduce((sum, unit) => sum + parseFloat(unit.currentRent), 0);
    const avgRent = count > 0 ? totalRent / count : 0;

    return { count, avgRent };
  };

  // Get color coding for rent changes
  const getRentChangeColor = (currentRent: number, recommendedRent?: number) => {
    if (!recommendedRent) return "text-gray-600";
    const change = recommendedRent - currentRent;
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTags([]);
  };

  // Reusable component to render bedroom/TAG hierarchy
  const renderBedroomTagHierarchy = (hierarchy: PropertyHierarchy, propertyPrefix?: string) => {
    const filteredHierarchy = filterHierarchy(hierarchy);

    if (Object.keys(filteredHierarchy).length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8" data-testid="no-filtered-results">
          No units match the selected filters
        </div>
      );
    }

    return (
      <Accordion type="multiple" className="w-full" data-testid={propertyPrefix ? `bedroom-accordion-${propertyPrefix}` : "bedroom-accordion"}>
        {Object.entries(filteredHierarchy)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([bedroomKey, tagGroups]) => {
            const bedroomStats = getBedroomStats(tagGroups);
            const bedroomLabel = bedroomKey === '0' ? 'Studio' : `${bedroomKey} Bedroom${bedroomKey === '1' ? '' : 's'}`;

            return (
              <AccordionItem 
                key={bedroomKey} 
                value={`bedroom-${bedroomKey}`}
                data-testid={`accordion-bedroom-${bedroomKey}${propertyPrefix ? `-${propertyPrefix}` : ''}`}
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4" />
                      <span className="font-semibold" data-testid={`bedroom-label-${bedroomKey}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                        {bedroomLabel}
                      </span>
                    </div>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span data-testid={`bedroom-count-${bedroomKey}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                        {bedroomStats.count} units
                      </span>
                      <span data-testid={`bedroom-avg-${bedroomKey}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                        Avg: {formatCurrency(bedroomStats.avgRent)}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6 space-y-4 pt-2">
                    {Object.entries(tagGroups)
                      .sort(([a], [b]) => {
                        const tagA = tagDefinitions.find(t => t.tag === a);
                        const tagB = tagDefinitions.find(t => t.tag === b);
                        const orderA = tagA?.displayOrder ?? 999;
                        const orderB = tagB?.displayOrder ?? 999;
                        return orderA - orderB;
                      })
                      .map(([tag, units]) => {
                        const tagStats = getTagStats(units);

                        return (
                          <div 
                            key={tag} 
                            className="border rounded-lg p-4 space-y-3"
                            data-testid={`tag-group-${tag}${propertyPrefix ? `-${propertyPrefix}` : ''}`}
                          >
                            {/* TAG Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TagIcon className="h-4 w-4 text-primary" />
                                <span className="font-medium" data-testid={`tag-label-${tag}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                  TAG: {tag}
                                </span>
                              </div>
                              <div className="flex gap-3 text-sm text-muted-foreground">
                                <span data-testid={`tag-count-${tag}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                  {tagStats.count} units
                                </span>
                                <span data-testid={`tag-avg-${tag}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                  Avg: {formatCurrency(tagStats.avgRent)}
                                </span>
                              </div>
                            </div>

                            <Separator />

                            {/* Units Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="text-xs text-muted-foreground border-b">
                                    <th className="text-left py-2 px-2">Unit #</th>
                                    <th className="text-right py-2 px-2">Current Rent</th>
                                    <th className="text-right py-2 px-2">Recommended</th>
                                    <th className="text-right py-2 px-2">Change</th>
                                    <th className="text-left py-2 px-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {units.map(unit => {
                                    const currentRent = parseFloat(unit.currentRent);
                                    const recommendedRent = unit.recommendedRent 
                                      ? parseFloat(unit.recommendedRent) 
                                      : null;
                                    const change = recommendedRent ? recommendedRent - currentRent : 0;

                                    return (
                                      <tr 
                                        key={unit.id}
                                        className="hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => onUnitSelect?.(unit.id)}
                                        data-testid={`unit-row-${unit.unitNumber}${propertyPrefix ? `-${propertyPrefix}` : ''}`}
                                      >
                                        <td className="py-2 px-2 font-medium" data-testid={`unit-number-${unit.unitNumber}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                          {unit.unitNumber}
                                        </td>
                                        <td className="py-2 px-2 text-right" data-testid={`unit-current-${unit.unitNumber}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                          {formatCurrency(currentRent)}
                                        </td>
                                        <td className="py-2 px-2 text-right" data-testid={`unit-recommended-${unit.unitNumber}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                          {recommendedRent ? (
                                            <span className={getRentChangeColor(currentRent, recommendedRent)}>
                                              {formatCurrency(recommendedRent)}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2 text-right" data-testid={`unit-change-${unit.unitNumber}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                          {recommendedRent ? (
                                            <span className={`flex items-center justify-end gap-1 ${getRentChangeColor(currentRent, recommendedRent)}`}>
                                              {change > 0 ? (
                                                <TrendingUp className="h-3 w-3" />
                                              ) : change < 0 ? (
                                                <TrendingDown className="h-3 w-3" />
                                              ) : null}
                                              {formatCurrencyChange(change)}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2" data-testid={`unit-status-${unit.unitNumber}${propertyPrefix ? `-${propertyPrefix}` : ''}`}>
                                          <Badge 
                                            variant={
                                              unit.status === 'vacant' ? 'destructive' :
                                              unit.status === 'occupied' ? 'default' :
                                              'secondary'
                                            }
                                            className="text-xs"
                                          >
                                            {unit.status}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
      </Accordion>
    );
  };

  if (!propertyProfileId && !sessionId) {
    return (
      <Card data-testid="drill-down-no-property">
        <CardContent className="p-6 text-center text-muted-foreground">
          Please select a property profile or session to view unit details
        </CardContent>
      </Card>
    );
  }

  if (isLoadingUnits || isLoadingTags) {
    return (
      <Card data-testid="drill-down-loading">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (unitsError) {
    return (
      <Card data-testid="drill-down-error">
        <CardContent className="p-6 text-center text-destructive">
          Error loading unit data: {unitsError instanceof Error ? unitsError.message : 'Unknown error'}
        </CardContent>
      </Card>
    );
  }

  // Check for empty data
  const hasData = isSessionMode 
    ? sessionData && sessionData.properties.length > 0
    : singlePropertyData && Object.keys(singlePropertyData.hierarchy).length > 0;

  if (!hasData) {
    return (
      <Card data-testid="drill-down-empty">
        <CardContent className="p-6 text-center text-muted-foreground">
          No units found for this {isSessionMode ? 'session' : 'property'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="property-drill-down">
      {/* Session/Property Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="property-name">
              <Building2 className="h-5 w-5" />
              {isSessionMode && sessionData ? sessionData.sessionName : singlePropertyData?.propertyName}
              {isSessionMode && sessionData && (
                <Badge variant="secondary" className="ml-2" data-testid="session-badge">
                  {sessionData.properties.length} Properties
                </Badge>
              )}
            </CardTitle>
            {overallStats && overallStats.totalUnits > 0 && (
              <div className="flex gap-4 text-sm" data-testid="property-stats">
                <Badge variant="outline" data-testid="stat-total-units">
                  {overallStats.totalUnits} Units
                </Badge>
                <Badge variant="outline" data-testid="stat-avg-rent">
                  Avg: {formatCurrency(overallStats.avgRent)}
                </Badge>
                <Badge 
                  variant={overallStats.totalAnnualImpact >= 0 ? "default" : "destructive"}
                  data-testid="stat-annual-impact"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {formatCurrencyChange(overallStats.totalAnnualImpact)}/year
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        {/* TAG Filters */}
        {showFilters && availableTags.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by TAG:</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    data-testid={`filter-tag-${tag}`}
                    className="h-8"
                  >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>

              {selectedTags.length > 0 && (
                <>
                  <Badge variant="secondary" data-testid="filter-count">
                    {selectedTags.length} active
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Hierarchical Display */}
      <Card>
        <CardContent className="p-6">
          {isSessionMode && sessionData ? (
            // Session mode: Property → Bedroom → TAG → Units
            <Accordion type="multiple" className="w-full" data-testid="property-accordion">
              {sessionData.properties.map(property => {
                const propertyStats = getPropertyStats(property.hierarchy);
                
                return (
                  <AccordionItem 
                    key={property.propertyId} 
                    value={property.propertyId}
                    data-testid={`accordion-property-${property.propertyId}`}
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          <span className="font-semibold" data-testid={`property-label-${property.propertyId}`}>
                            {property.propertyName}
                          </span>
                        </div>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          <Badge variant="outline" data-testid={`property-units-${property.propertyId}`}>
                            {propertyStats.totalUnits} units
                          </Badge>
                          <Badge variant="outline" data-testid={`property-avg-${property.propertyId}`}>
                            Avg: {formatCurrency(propertyStats.avgRent)}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 pt-2">
                        {renderBedroomTagHierarchy(property.hierarchy, property.propertyId)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            // Single property mode: Bedroom → TAG → Units
            singlePropertyData && renderBedroomTagHierarchy(singlePropertyData.hierarchy)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
