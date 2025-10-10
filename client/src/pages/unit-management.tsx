import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Download, Plus, TableIcon, Trees, AlertCircle, Building2, TrendingUp, TrendingDown, Info, Calendar, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { PropertyProfile, PropertyUnit, TagDefinition } from "@shared/schema";
import UnitHierarchyView from "@/components/unit-hierarchy-view";
import UnitsTableView from "@/components/units-table-view";
import UnitEditDialog from "@/components/unit-edit-dialog";
import TagManagement from "@/components/tag-management";
import ExcelImportDialog from "@/components/excel-import-dialog";
import ExcelImportPortfolioDialog from "@/components/excel-import-portfolio-dialog";
import ExcelExportButton from "@/components/excel-export-button";

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'unitNumber' | 'unitType' | 'tag' | 'bedrooms' | 'bathrooms' | 'squareFootage' | 'internalRent' | 'marketRent' | 'difference' | 'percentDifference' | 'dataAge';

export default function UnitManagement() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"hierarchical" | "table" | "market-comparison">("hierarchical");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportPortfolio, setShowImportPortfolio] = useState(false);
  const [showTagManagement, setShowTagManagement] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('percentDifference');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch user's properties
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ["/api/property-profiles"],
    queryFn: async () => {
      const response = await fetch("/api/property-profiles");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    }
  });

  // Auto-select first property
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Fetch units for selected property
  const { data: unitsData, isLoading: loadingUnits, refetch: refetchUnits } = useQuery({
    queryKey: selectedPropertyId ? [`/api/property-profiles/${selectedPropertyId}/units`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/property-profiles/${selectedPropertyId}/units`);
      if (!response.ok) throw new Error("Failed to fetch units");
      return response.json();
    },
    enabled: !!selectedPropertyId
  });

  // Fetch hierarchical data for selected property
  const { data: hierarchicalData, refetch: refetchHierarchical } = useQuery({
    queryKey: selectedPropertyId ? [`/api/property-profiles/${selectedPropertyId}/units/hierarchical`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/property-profiles/${selectedPropertyId}/units/hierarchical`);
      if (!response.ok) throw new Error("Failed to fetch hierarchical data");
      return response.json();
    },
    enabled: !!selectedPropertyId && viewMode === "hierarchical"
  });

  // Fetch TAG definitions
  const { data: tagDefinitions = [], refetch: refetchTags } = useQuery({
    queryKey: selectedPropertyId ? [`/api/tag-definitions/${selectedPropertyId}`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/tag-definitions/${selectedPropertyId}`);
      if (!response.ok) throw new Error("Failed to fetch TAG definitions");
      return response.json();
    },
    enabled: !!selectedPropertyId
  });

  // Fetch data completeness
  const { data: completeness } = useQuery({
    queryKey: selectedPropertyId ? [`/api/property-profiles/${selectedPropertyId}/data-completeness`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/property-profiles/${selectedPropertyId}/data-completeness`);
      if (!response.ok) throw new Error("Failed to fetch data completeness");
      return response.json();
    },
    enabled: !!selectedPropertyId
  });

  // Fetch market comparison data
  const { data: marketComparison, isLoading: loadingMarketData, refetch: refetchMarketComparison } = useQuery({
    queryKey: selectedPropertyId ? [`/api/property-profiles/${selectedPropertyId}/market-comparison`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/property-profiles/${selectedPropertyId}/market-comparison`);
      if (!response.ok) throw new Error("Failed to fetch market comparison");
      return response.json();
    },
    enabled: !!selectedPropertyId && viewMode === "market-comparison"
  });

  const handleUnitSaved = () => {
    refetchUnits();
    refetchHierarchical();
    setShowAddUnit(false);
  };

  const handleImportComplete = () => {
    refetchUnits();
    refetchHierarchical();
    refetchTags();
    setShowImport(false);
    toast({
      title: "Import Complete",
      description: "Units have been successfully imported from Excel."
    });
  };

  const handlePortfolioImportComplete = () => {
    refetchUnits();
    refetchHierarchical();
    refetchTags();
    setShowImportPortfolio(false);
    toast({
      title: "Portfolio Import Complete",
      description: "Units have been successfully imported for your portfolio."
    });
  };

  const handleTagsUpdated = () => {
    refetchTags();
    refetchHierarchical();
  };

  const selectedProperty = properties.find((p: PropertyProfile) => p.id === selectedPropertyId);
  const units = unitsData || [];
  const totalUnits = units.length;

  // Sorting function for market comparison table
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle through: asc -> desc -> null -> asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn('percentDifference'); // Reset to default
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Generic sorting function
  const sortComparisons = (comparisons: any[]) => {
    if (!sortDirection) return comparisons;

    return [...comparisons].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case 'unitNumber':
          // Try to sort numerically if possible, otherwise alphabetically
          aVal = parseInt(a.unitNumber) || a.unitNumber;
          bVal = parseInt(b.unitNumber) || b.unitNumber;
          break;
        case 'unitType':
          aVal = a.unitType || '';
          bVal = b.unitType || '';
          break;
        case 'tag':
          aVal = a.tag || '';
          bVal = b.tag || '';
          break;
        case 'bedrooms':
          aVal = a.bedrooms || 0;
          bVal = b.bedrooms || 0;
          break;
        case 'bathrooms':
          aVal = parseFloat(a.bathrooms) || 0;
          bVal = parseFloat(b.bathrooms) || 0;
          break;
        case 'squareFootage':
          aVal = a.squareFootage || 0;
          bVal = b.squareFootage || 0;
          break;
        case 'internalRent':
          aVal = a.internalRent || 0;
          bVal = b.internalRent || 0;
          break;
        case 'marketRent':
          aVal = a.marketRent || 0;
          bVal = b.marketRent || 0;
          break;
        case 'difference':
          aVal = Math.abs(a.difference) || 0;
          bVal = Math.abs(b.difference) || 0;
          break;
        case 'percentDifference':
          aVal = Math.abs(a.percentDifference) || 0;
          bVal = Math.abs(b.percentDifference) || 0;
          break;
        case 'dataAge':
          aVal = a.marketDataCount || 0;
          bVal = b.marketDataCount || 0;
          break;
        default:
          return 0;
      }

      // Handle string vs number comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        // Numeric comparison
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });
  };

  // Helper to render sort indicator
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    
    return (
      <span className="ml-1 inline-flex">
        {sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
        {sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Unit Management</h1>
          <p className="text-muted-foreground">Manage property units with TAG hierarchy</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTagManagement(true)} data-testid="button-manage-tags">
            Manage TAGs
          </Button>
          <Button variant="outline" onClick={() => setShowImportPortfolio(true)} data-testid="button-import-portfolio">
            <Building2 className="mr-2 h-4 w-4" />
            Import Portfolio
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)} data-testid="button-import">
            <Upload className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          {selectedPropertyId && (
            <ExcelExportButton propertyProfileId={selectedPropertyId} propertyName={selectedProperty?.name} />
          )}
          <Button onClick={() => setShowAddUnit(true)} data-testid="button-add-unit">
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Property Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedPropertyId || ""} onValueChange={setSelectedPropertyId} data-testid="select-property">
            <SelectTrigger>
              <SelectValue placeholder={loadingProperties ? "Loading properties..." : "Select a property"} />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property: PropertyProfile) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name} - {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProperty && (
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Units:</span>{" "}
                <Badge variant="secondary">{totalUnits}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Property Type:</span>{" "}
                <Badge variant="outline">{selectedProperty.profileType}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Completeness Indicators */}
      {completeness && (completeness.missingTag > 0 || completeness.missingBedrooms > 0 || 
        completeness.missingBathrooms > 0 || completeness.missingSqft > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Data Completeness Issues:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {completeness.missingTag > 0 && (
                <div>Missing TAGs: <Badge variant="destructive">{completeness.missingTag}</Badge></div>
              )}
              {completeness.missingBedrooms > 0 && (
                <div>Missing Bedrooms: <Badge variant="destructive">{completeness.missingBedrooms}</Badge></div>
              )}
              {completeness.missingBathrooms > 0 && (
                <div>Missing Bathrooms: <Badge variant="destructive">{completeness.missingBathrooms}</Badge></div>
              )}
              {completeness.missingSqft > 0 && (
                <div>Missing Sq Ft: <Badge variant="destructive">{completeness.missingSqft}</Badge></div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* View Mode Tabs */}
      {selectedPropertyId && (
        <Card>
          <CardContent className="pt-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "hierarchical" | "table" | "market-comparison")}>
              <div className="flex justify-between items-center mb-4">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                  <TabsTrigger value="hierarchical" data-testid="tab-hierarchical">
                    <Trees className="mr-2 h-4 w-4" />
                    Hierarchical View
                  </TabsTrigger>
                  <TabsTrigger value="table" data-testid="tab-table">
                    <TableIcon className="mr-2 h-4 w-4" />
                    Table View
                  </TabsTrigger>
                  <TabsTrigger value="market-comparison" data-testid="tab-market-comparison">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Market Comparison
                  </TabsTrigger>
                </TabsList>
                {process.env.NODE_ENV === 'development' && viewMode === "hierarchical" && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/property-profiles/${selectedPropertyId}/units/test-large?count=3000`);
                        if (response.ok) {
                          const testData = await response.json();
                          // Temporarily replace hierarchical data with test data
                          queryClient.setQueryData(
                            [`/api/property-profiles/${selectedPropertyId}/units/hierarchical`],
                            testData
                          );
                          toast({
                            title: "Test Data Loaded",
                            description: "3000 test units loaded for virtualization testing"
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Error loading test data",
                          variant: "destructive"
                        });
                      }
                    }}
                    data-testid="button-load-test-data"
                  >
                    Load 3000 Test Units
                  </Button>
                )}
              </div>

              <TabsContent value="hierarchical" className="mt-6">
                {loadingUnits ? (
                  <div className="text-center py-8 text-muted-foreground">Loading units...</div>
                ) : hierarchicalData ? (
                  <UnitHierarchyView 
                    data={hierarchicalData}
                    tagDefinitions={tagDefinitions}
                    onRefresh={() => {
                      refetchUnits();
                      refetchHierarchical();
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No units found</div>
                )}
              </TabsContent>

              <TabsContent value="table" className="mt-6">
                {loadingUnits ? (
                  <div className="text-center py-8 text-muted-foreground">Loading units...</div>
                ) : units.length > 0 ? (
                  <UnitsTableView 
                    units={units}
                    tagDefinitions={tagDefinitions}
                    onRefresh={refetchUnits}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No units found</div>
                )}
              </TabsContent>

              <TabsContent value="market-comparison" className="mt-6">
                {loadingMarketData ? (
                  <div className="text-center py-8 text-muted-foreground">Loading market comparison...</div>
                ) : !marketComparison || !marketComparison.hasMarketData ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold">No Market Data Available</div>
                      <div className="mt-1">
                        {marketComparison?.message || "This property hasn't been scraped yet. Scrape the property first to see market comparisons."}
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    {/* Market Data Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          Last updated: {new Date(marketComparison.lastUpdated).toLocaleDateString()}
                          {marketComparison.isStale && (
                            <Badge variant="outline" className="ml-2">
                              <Calendar className="mr-1 h-3 w-3" />
                              {marketComparison.daysSinceUpdate} days old
                            </Badge>
                          )}
                        </div>
                        {marketComparison.unitsWithDifferences > 0 && (
                          <Badge variant="secondary">
                            {marketComparison.unitsWithDifferences} units with price differences
                          </Badge>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // TODO: Trigger re-scraping
                          toast({
                            title: "Feature Coming Soon",
                            description: "Re-scraping functionality will be available soon.",
                          });
                        }}
                        data-testid="button-rescrape"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Re-scrape Data
                      </Button>
                    </div>

                    {/* Stale Data Warning */}
                    {marketComparison.isStale && (
                      <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription>
                          <div className="font-semibold text-yellow-900 dark:text-yellow-100">Market Data is Outdated</div>
                          <div className="text-yellow-800 dark:text-yellow-200">
                            The market data was last updated {marketComparison.daysSinceUpdate} days ago. Consider re-scraping for the most current prices.
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Comparison Table */}
                    {marketComparison.comparisons.length > 0 ? (
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th 
                                className="text-left p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('unitNumber')}
                              >
                                <div className="flex items-center">
                                  Unit
                                  <SortIndicator column="unitNumber" />
                                </div>
                              </th>
                              <th 
                                className="text-left p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('tag')}
                              >
                                <div className="flex items-center">
                                  TAG
                                  <SortIndicator column="tag" />
                                </div>
                              </th>
                              <th 
                                className="text-left p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('bedrooms')}
                              >
                                <div className="flex items-center">
                                  Beds
                                  <SortIndicator column="bedrooms" />
                                </div>
                              </th>
                              <th 
                                className="text-left p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('bathrooms')}
                              >
                                <div className="flex items-center">
                                  Baths
                                  <SortIndicator column="bathrooms" />
                                </div>
                              </th>
                              <th 
                                className="text-right p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('internalRent')}
                              >
                                <div className="flex items-center justify-end">
                                  Internal Rent
                                  <SortIndicator column="internalRent" />
                                </div>
                              </th>
                              <th 
                                className="text-right p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('marketRent')}
                              >
                                <div className="flex items-center justify-end">
                                  Market Rent
                                  <SortIndicator column="marketRent" />
                                </div>
                              </th>
                              <th 
                                className="text-right p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('difference')}
                              >
                                <div className="flex items-center justify-end">
                                  Difference ($)
                                  <SortIndicator column="difference" />
                                </div>
                              </th>
                              <th 
                                className="text-right p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('percentDifference')}
                              >
                                <div className="flex items-center justify-end">
                                  Difference (%)
                                  <SortIndicator column="percentDifference" />
                                </div>
                              </th>
                              <th 
                                className="text-right p-3 font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => handleSort('dataAge')}
                              >
                                <div className="flex items-center justify-end">
                                  Data Age
                                  <SortIndicator column="dataAge" />
                                </div>
                              </th>
                              <th className="text-center p-3 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            <TooltipProvider>
                              {sortComparisons(marketComparison.comparisons).map((comparison: any) => {
                                const isHigherThanMarket = comparison.difference < 0;
                                const isSignificant = Math.abs(comparison.percentDifference) > 5;
                                
                                return (
                                  <tr 
                                    key={comparison.unitId}
                                    className={`border-b hover:bg-muted/30 transition-colors ${isSignificant ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
                                    data-testid={`row-comparison-${comparison.unitNumber}`}
                                  >
                                    <td className="p-3 font-medium">{comparison.unitNumber}</td>
                                    <td className="p-3">
                                      {comparison.tag && (
                                        <Badge variant="outline">{comparison.tag}</Badge>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      {comparison.bedrooms || '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                      {comparison.bathrooms || '-'}
                                    </td>
                                    <td className="p-3 text-right font-mono">
                                      ${comparison.internalRent?.toLocaleString() || '0'}
                                    </td>
                                    <td className="p-3 text-right font-mono">
                                      ${comparison.marketRent?.toLocaleString() || '0'}
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className={`font-mono ${isHigherThanMarket ? 'text-green-600' : 'text-red-600'}`}>
                                        {comparison.difference > 0 ? '+' : ''}${Math.abs(comparison.difference).toLocaleString()}
                                      </div>
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {isHigherThanMarket ? (
                                          <TrendingDown className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <TrendingUp className="h-4 w-4 text-red-600" />
                                        )}
                                        <div className={`font-medium ${isHigherThanMarket ? 'text-green-600' : 'text-red-600'}`}>
                                          {comparison.percentDifference > 0 ? '+' : ''}{comparison.percentDifference}%
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3 text-right">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-sm text-muted-foreground cursor-help">
                                            {comparison.marketDataCount} unit{comparison.marketDataCount !== 1 ? 's' : ''}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="text-xs">
                                            Based on {comparison.marketDataCount} comparable market unit{comparison.marketDataCount !== 1 ? 's' : ''}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </td>
                                    <td className="p-3 text-center">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant={isSignificant ? "default" : "outline"}
                                            onClick={() => {
                                              // Open edit dialog with suggested market price
                                              // This would require updating the UnitEditDialog component
                                              toast({
                                                title: "Update Unit Price",
                                                description: `Suggested market price for unit ${comparison.unitNumber}: $${comparison.marketRent}`,
                                              });
                                            }}
                                            data-testid={`button-update-${comparison.unitNumber}`}
                                          >
                                            Update
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="text-xs">
                                            {isHigherThanMarket 
                                              ? "Your rent is above market rate"
                                              : "Your rent is below market rate"}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </td>
                                  </tr>
                                );
                              })}
                            </TooltipProvider>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold">All Prices Match Market Rates</div>
                          <div className="mt-1">
                            Your internal pricing is aligned with current market rates. No significant differences found.
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {showAddUnit && selectedPropertyId && (
        <UnitEditDialog
          propertyProfileId={selectedPropertyId}
          tagDefinitions={tagDefinitions}
          onSave={handleUnitSaved}
          onClose={() => setShowAddUnit(false)}
        />
      )}

      {showImport && selectedPropertyId && (
        <ExcelImportDialog
          propertyProfileId={selectedPropertyId}
          onImportComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {showImportPortfolio && (
        <ExcelImportPortfolioDialog
          onImportComplete={handlePortfolioImportComplete}
          onClose={() => setShowImportPortfolio(false)}
        />
      )}

      {showTagManagement && selectedPropertyId && (
        <TagManagement
          propertyProfileId={selectedPropertyId}
          tagDefinitions={tagDefinitions}
          onClose={() => setShowTagManagement(false)}
          onUpdate={handleTagsUpdated}
        />
      )}
    </div>
  );
}