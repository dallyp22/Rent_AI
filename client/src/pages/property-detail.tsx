import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Home,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { PropertyDrillDown } from "@/components/property-drill-down";
import { formatCurrency } from "@/utils/formatters";
import type { PropertyProfile, PropertyUnit } from "@shared/schema";

interface PropertyDetailParams {
  id: string;
}

type ViewMode = "hierarchical" | "table";
type SortField = "unitNumber" | "tag" | "bedrooms" | "bathrooms" | "squareFeet" | "currentRent" | "status";
type SortOrder = "asc" | "desc";

export default function PropertyDetail({ params }: { params: PropertyDetailParams }) {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("hierarchical");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("unitNumber");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Fetch property profile details
  const { data: property, isLoading: isLoadingProperty, error: propertyError } = useQuery<PropertyProfile>({
    queryKey: [`/api/property-profiles/${params.id}`],
  });

  // Fetch units for table view
  const { data: units = [], isLoading: isLoadingUnits, error: unitsError } = useQuery<PropertyUnit[]>({
    queryKey: [`/api/property-profiles/${params.id}/units`],
    enabled: viewMode === "table", // Only fetch when in table view
  });

  // Calculate data validation metrics
  const dataMetrics = useMemo(() => {
    if (!units.length) {
      return {
        totalUnits: 0,
        unitsWithoutTag: 0,
        unitsWithoutBedrooms: 0,
        unitsWithoutBathrooms: 0,
        unitsWithoutSquareFeet: 0,
        completenessPercentage: 100
      };
    }

    const unitsWithoutTag = units.filter(u => !u.tag).length;
    const unitsWithoutBedrooms = units.filter(u => u.bedrooms === null || u.bedrooms === undefined).length;
    const unitsWithoutBathrooms = units.filter(u => !u.bathrooms).length;
    const unitsWithoutSquareFeet = units.filter(u => !u.squareFeet).length;

    const totalFields = units.length * 5; // 5 key fields per unit: tag, bedrooms, bathrooms, squareFeet, currentRent
    const missingFields = unitsWithoutTag + unitsWithoutBedrooms + unitsWithoutBathrooms + unitsWithoutSquareFeet;
    const completenessPercentage = Math.round(((totalFields - missingFields) / totalFields) * 100);

    return {
      totalUnits: units.length,
      unitsWithoutTag,
      unitsWithoutBedrooms,
      unitsWithoutBathrooms,
      unitsWithoutSquareFeet,
      completenessPercentage
    };
  }, [units]);

  // Filter and sort units for table view
  const filteredAndSortedUnits = useMemo(() => {
    let filtered = units.filter(unit => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        unit.unitNumber?.toLowerCase().includes(searchLower) ||
        unit.tag?.toLowerCase().includes(searchLower) ||
        unit.unitType?.toLowerCase().includes(searchLower) ||
        unit.status?.toLowerCase().includes(searchLower)
      );
    });

    // Sort units
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      // Convert to numbers for numeric fields
      if (sortField === "bedrooms" || sortField === "bathrooms" || sortField === "squareFeet") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortField === "currentRent") {
        aValue = Number(a.currentRent) || 0;
        bValue = Number(b.currentRent) || 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [units, searchTerm, sortField, sortOrder]);

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Check if a unit has missing data
  const hasIncompleteData = (unit: PropertyUnit) => {
    return !unit.tag || !unit.bedrooms || !unit.bathrooms || !unit.squareFeet;
  };

  // Loading state
  if (isLoadingProperty) {
    return (
      <div className="space-y-6" data-testid="loading-property-detail">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (propertyError || !property) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4" data-testid="error-property-detail">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">Failed to load property details</p>
        <Button onClick={() => navigate("/property-profiles")} data-testid="button-back-to-list">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="property-detail-page">
      {/* Header Section */}
      <Card data-testid="property-header">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl" data-testid="text-property-name">{property.name}</CardTitle>
              <CardDescription className="text-base mt-1" data-testid="text-property-address">
                {property.address}
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/property-profiles")}
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Properties
            </Button>
          </div>
          
          {/* Property Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Type</Label>
              <div className="flex items-center gap-2" data-testid="text-property-type">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{property.propertyType || "N/A"}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-muted-foreground">Total Units</Label>
              <div className="flex items-center gap-2" data-testid="text-total-units">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>{property.totalUnits || "N/A"}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-muted-foreground">Built Year</Label>
              <div className="flex items-center gap-2" data-testid="text-built-year">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{property.builtYear || "N/A"}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-muted-foreground">Data Completeness</Label>
              <div className="space-y-1">
                <Progress 
                  value={dataMetrics.completenessPercentage} 
                  className="h-2"
                  data-testid="progress-data-completeness"
                />
                <span className="text-sm text-muted-foreground">
                  {dataMetrics.completenessPercentage}% complete
                </span>
              </div>
            </div>
          </div>

          {/* Additional Metadata */}
          {(property.city || property.state) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {property.city && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">City</Label>
                  <div data-testid="text-city">{property.city}</div>
                </div>
              )}
              {property.state && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">State</Label>
                  <div data-testid="text-state">{property.state}</div>
                </div>
              )}
              {property.squareFootage && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Square Footage</Label>
                  <div data-testid="text-square-footage">{property.squareFootage.toLocaleString()} sq ft</div>
                </div>
              )}
              {property.parkingSpaces && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Parking Spaces</Label>
                  <div data-testid="text-parking-spaces">{property.parkingSpaces}</div>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Data Validation Indicators */}
      {viewMode === "table" && units.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="validation-indicators">
          {dataMetrics.unitsWithoutTag > 0 && (
            <Badge variant="destructive" data-testid="badge-missing-tags">
              <AlertCircle className="mr-1 h-3 w-3" />
              {dataMetrics.unitsWithoutTag} units missing TAGs
            </Badge>
          )}
          {dataMetrics.unitsWithoutBedrooms > 0 && (
            <Badge variant="destructive" data-testid="badge-missing-bedrooms">
              <AlertCircle className="mr-1 h-3 w-3" />
              {dataMetrics.unitsWithoutBedrooms} units missing bedroom data
            </Badge>
          )}
          {dataMetrics.unitsWithoutBathrooms > 0 && (
            <Badge variant="outline" data-testid="badge-missing-bathrooms">
              <AlertCircle className="mr-1 h-3 w-3" />
              {dataMetrics.unitsWithoutBathrooms} units missing bathroom data
            </Badge>
          )}
          {dataMetrics.unitsWithoutSquareFeet > 0 && (
            <Badge variant="outline" data-testid="badge-missing-sqft">
              <AlertCircle className="mr-1 h-3 w-3" />
              {dataMetrics.unitsWithoutSquareFeet} units missing square footage
            </Badge>
          )}
          <Badge variant="secondary" data-testid="badge-total-units">
            Total: {dataMetrics.totalUnits} units
          </Badge>
        </div>
      )}

      {/* View Toggle */}
      <Card data-testid="view-toggle-card">
        <CardContent className="pt-6">
          <RadioGroup
            value={viewMode}
            onValueChange={(value: ViewMode) => setViewMode(value)}
            className="flex flex-row space-x-6"
            data-testid="radio-view-toggle"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hierarchical" id="hierarchical" />
              <Label htmlFor="hierarchical" className="cursor-pointer">
                Hierarchical View
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="table" id="table" />
              <Label htmlFor="table" className="cursor-pointer">
                Table View
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Data Display Section */}
      {viewMode === "hierarchical" ? (
        <Card data-testid="hierarchical-view-container">
          <CardContent className="pt-6">
            <PropertyDrillDown
              propertyProfileId={params.id}
              showFilters={true}
            />
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="table-view-container">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Unit Details</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-units"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUnits ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : unitsError ? (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load units
              </div>
            ) : filteredAndSortedUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-units-message">
                {searchTerm ? "No units match your search" : "No units available"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="units-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("unitNumber")}
                          data-testid="button-sort-unit-number"
                        >
                          Unit Number
                          {sortField === "unitNumber" && (
                            sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("tag")}
                          data-testid="button-sort-tag"
                        >
                          TAG
                          {sortField === "tag" && (
                            sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("bedrooms")}
                          data-testid="button-sort-bedrooms"
                        >
                          Bedrooms
                          {sortField === "bedrooms" && (
                            sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("bathrooms")}
                          data-testid="button-sort-bathrooms"
                        >
                          Bathrooms
                          {sortField === "bathrooms" && (
                            sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("squareFeet")}
                          data-testid="button-sort-square-feet"
                        >
                          Sq Ft
                          {sortField === "squareFeet" && (
                            sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("currentRent")}
                          data-testid="button-sort-rent"
                        >
                          Current Rent
                          {sortField === "currentRent" && (
                            sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort("status")}
                          data-testid="button-sort-status"
                        >
                          Status
                          {sortField === "status" && (
                            sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUnits.map((unit, index) => (
                      <TableRow 
                        key={unit.id} 
                        className={hasIncompleteData(unit) ? "bg-destructive/5" : ""}
                        data-testid={`row-unit-${unit.id}`}
                      >
                        <TableCell data-testid={`text-unit-number-${index}`}>
                          {unit.unitNumber || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-tag-${index}`}>
                          {unit.tag ? (
                            <Badge variant="outline">{unit.tag}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-bedrooms-${index}`}>
                          {unit.bedrooms ?? "-"}
                        </TableCell>
                        <TableCell data-testid={`text-bathrooms-${index}`}>
                          {unit.bathrooms || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-square-feet-${index}`}>
                          {unit.squareFeet ? unit.squareFeet.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell data-testid={`text-rent-${index}`}>
                          {formatCurrency(Number(unit.currentRent) || 0)}
                        </TableCell>
                        <TableCell data-testid={`text-status-${index}`}>
                          <Badge 
                            variant={unit.status === "vacant" ? "destructive" : 
                                   unit.status === "notice_given" ? "outline" : 
                                   "secondary"}
                          >
                            {unit.status || "Unknown"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}