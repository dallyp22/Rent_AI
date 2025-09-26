import { memo, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronRight, Sparkles, DollarSign, Clock, RotateCcw, AlertCircle, Loader2, Building2, Home } from "lucide-react";
import { motion } from "framer-motion";
import type { FilterCriteria, PropertyProfile } from "@shared/schema";

interface AnalysisFiltersProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  isPortfolioMode?: boolean;
  // New props for competitive relationships state
  isLoadingRelationships?: boolean;
  hasCompetitiveRelationships?: boolean;
  relationshipsError?: Error | null;
  // Property filtering props
  availableProperties?: PropertyProfile[];
  isLoadingProperties?: boolean;
}

const bedroomTypes = ["Studio", "1BR", "2BR", "3BR"] as const;
const availabilityOptions = [
  { value: "now", label: "Available Now" },
  { value: "30days", label: "Within 30 Days" },
  { value: "60days", label: "Within 60 Days" }
] as const;

const amenityOptions = [
  { value: "in_unit_laundry", label: "In-Unit Laundry" },
  { value: "parking", label: "Parking Included" },
  { value: "gym", label: "Gym/Fitness Center" },
  { value: "pool", label: "Pool" },
  { value: "pet_friendly", label: "Pet Friendly" }
] as const;

const leaseTermOptions = [
  { value: "6_month", label: "6 Month" },
  { value: "12_month", label: "12 Month" },
  { value: "month_to_month", label: "Month-to-Month" }
] as const;

const floorLevelOptions = [
  { value: "ground", label: "Ground Floor" },
  { value: "mid", label: "Mid Level" },
  { value: "top", label: "Top Floor" }
] as const;

const renovationStatusOptions = [
  { value: "newly_renovated", label: "Newly Renovated" },
  { value: "updated", label: "Updated" },
  { value: "original", label: "Original" }
] as const;

const competitiveSetOptions = [
  { value: "all_competitors", label: "All Competitors", description: "Show all scraped competitors" },
  { value: "internal_competitors_only", label: "Internal Competition Only", description: "Show only properties marked as internal competitors" },
  { value: "external_competitors_only", label: "External Competitors Only", description: "Show only properties marked as external competitors" },
  { value: "subject_properties_only", label: "Subject Properties Only", description: "Show only the user's portfolio properties" }
] as const;

const AnalysisFilters = memo(({ 
  filters, 
  onFiltersChange,
  isPortfolioMode = false,
  isLoadingRelationships = false,
  hasCompetitiveRelationships = false,
  relationshipsError = null,
  availableProperties = [],
  isLoadingProperties = false
}: AnalysisFiltersProps) => {
  // Memoize advanced filters count
  const advancedFiltersCount = useMemo(() => 
    (filters.amenities?.length || 0) +
    (filters.leaseTerms?.length || 0) +
    (filters.floorLevel ? 1 : 0) +
    (filters.renovationStatus ? 1 : 0) +
    ((filters.competitiveSet && filters.competitiveSet !== "all_competitors") ? 1 : 0) +
    (filters.selectedProperties?.length || 0),
    [filters.amenities, filters.leaseTerms, filters.floorLevel, filters.renovationStatus, filters.competitiveSet, filters.selectedProperties]
  );

  const handleBedroomChange = useCallback((bedroom: string, checked: boolean) => {
    const newBedroomTypes = checked 
      ? [...filters.bedroomTypes, bedroom as any]
      : filters.bedroomTypes.filter(type => type !== bedroom);
    
    onFiltersChange({
      ...filters,
      bedroomTypes: newBedroomTypes
    });
  }, [filters, onFiltersChange]);

  const handlePriceRangeChange = useCallback((values: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: { min: values[0], max: values[1] }
    });
  }, [filters, onFiltersChange]);

  const handleSquareFootageChange = useCallback((values: number[]) => {
    onFiltersChange({
      ...filters,
      squareFootageRange: { min: values[0], max: values[1] }
    });
  }, [filters, onFiltersChange]);

  const handleAvailabilityChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      availability: value as any
    });
  }, [filters, onFiltersChange]);

  const handleAmenityChange = useCallback((amenity: string, checked: boolean) => {
    const currentAmenities = filters.amenities || [];
    const newAmenities = checked
      ? [...currentAmenities, amenity as any]
      : currentAmenities.filter(a => a !== amenity);
    
    onFiltersChange({
      ...filters,
      amenities: newAmenities.length > 0 ? newAmenities : undefined
    });
  }, [filters, onFiltersChange]);

  const handleLeaseTermChange = useCallback((term: string, checked: boolean) => {
    const currentTerms = filters.leaseTerms || [];
    const newTerms = checked
      ? [...currentTerms, term as any]
      : currentTerms.filter(t => t !== term);
    
    onFiltersChange({
      ...filters,
      leaseTerms: newTerms.length > 0 ? newTerms : undefined
    });
  }, [filters, onFiltersChange]);

  const handleFloorLevelChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      floorLevel: value as any
    });
  }, [filters, onFiltersChange]);

  const handleRenovationStatusChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      renovationStatus: value as any
    });
  }, [filters, onFiltersChange]);

  const handleCompetitiveSetChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      competitiveSet: value as any
    });
  }, [filters, onFiltersChange]);

  // Property filtering handlers
  const handlePropertyChange = useCallback((propertyId: string, checked: boolean) => {
    const currentProperties = filters.selectedProperties || [];
    const newProperties = checked
      ? [...currentProperties, propertyId]
      : currentProperties.filter(id => id !== propertyId);
    
    onFiltersChange({
      ...filters,
      selectedProperties: newProperties.length > 0 ? newProperties : undefined
    });
  }, [filters, onFiltersChange]);

  const handleSelectAllProperties = useCallback(() => {
    const allPropertyIds = availableProperties.map(p => p.id);
    onFiltersChange({
      ...filters,
      selectedProperties: allPropertyIds.length > 0 ? allPropertyIds : undefined
    });
  }, [filters, onFiltersChange, availableProperties]);

  const handleDeselectAllProperties = useCallback(() => {
    onFiltersChange({
      ...filters,
      selectedProperties: undefined
    });
  }, [filters, onFiltersChange]);

  // Memoized preset handlers
  const applyPremiumPreset = useCallback(() => {
    onFiltersChange({
      ...filters,
      priceRange: { min: 2000, max: 5000 },  // Expanded upper range
      bedroomTypes: ["2BR", "3BR"],
      squareFootageRange: { min: 1000, max: 3000 }  // Expanded upper range
    });
  }, [filters, onFiltersChange]);

  const applyEntryLevelPreset = useCallback(() => {
    onFiltersChange({
      ...filters,
      priceRange: { min: 500, max: 1500 },  // Lowered minimum
      bedroomTypes: ["Studio", "1BR"],
      squareFootageRange: { min: 200, max: 800 }  // Lowered minimum
    });
  }, [filters, onFiltersChange]);

  const applyHighTurnoverPreset = useCallback(() => {
    onFiltersChange({
      ...filters,
      availability: "now",
      leaseTerms: ["month_to_month", "6_month"]
    });
  }, [filters, onFiltersChange]);

  const resetFilters = useCallback(() => {
    onFiltersChange({
      bedroomTypes: [],
      priceRange: { min: 500, max: 5000 },  // Widened range to show all units
      availability: "60days",  // Most inclusive option
      squareFootageRange: { min: 200, max: 3000 },  // Expanded range
      amenities: undefined,
      leaseTerms: undefined,
      floorLevel: undefined,
      renovationStatus: undefined,
      competitiveSet: "all_competitors"
    });
  }, [onFiltersChange]);

  return (
    <motion.div 
      className="w-full space-y-4" 
      data-testid="analysis-filters"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between" data-testid="filters-title">
            <span>{isPortfolioMode ? 'Portfolio Filters' : 'Filter Analysis'}</span>
            {advancedFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {advancedFiltersCount} advanced
              </Badge>
            )}
          </CardTitle>
          {isPortfolioMode && (
            <p className="text-xs text-muted-foreground mt-2">
              Filters apply across all subject properties in the portfolio analysis
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter Presets */}
          <div className="space-y-3" data-testid="filter-presets">
            <Label className="text-sm font-semibold">
              {isPortfolioMode ? 'Portfolio Presets' : 'Quick Presets'}
            </Label>
            <TooltipProvider>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={applyPremiumPreset}
                        className="justify-center text-xs h-9"
                        data-testid="preset-premium"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        Premium
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPortfolioMode 
                        ? 'High-end portfolio units: $2000-$5000, 2-3BR, 1000-3000 sq ft'
                        : 'High-end units: $2000-$3000, 2-3BR, 1000-2000 sq ft'
                      }</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={applyEntryLevelPreset}
                        className="justify-center text-xs h-9"
                        data-testid="preset-entry"
                      >
                        <DollarSign className="mr-1 h-3 w-3" />
                        Entry Level
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPortfolioMode 
                        ? 'Affordable portfolio units: $500-$1500, Studio-1BR, 200-800 sq ft'
                        : 'Affordable units: $500-$1500, Studio-1BR, 200-800 sq ft'
                      }</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={applyHighTurnoverPreset}
                        className="justify-center text-xs h-9"
                        data-testid="preset-turnover"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        High Turn
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPortfolioMode 
                        ? 'High turnover across portfolio: Available now, flexible lease terms'
                        : 'Quick move-ins: Available now, flexible lease terms'
                      }</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={resetFilters}
                        className="justify-center text-xs h-9"
                        data-testid="preset-clear"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Clear All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset all filters to defaults</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          </div>

          <Separator />

          {/* Bedroom Type Filters */}
          <div className="space-y-3" data-testid="bedroom-filters">
            <Label className="text-sm font-semibold">Unit Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {bedroomTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2" data-testid={`bedroom-filter-${type.toLowerCase()}`}>
                  <Checkbox
                    id={`bedroom-${type}`}
                    checked={filters.bedroomTypes.includes(type)}
                    onCheckedChange={(checked) => handleBedroomChange(type, checked as boolean)}
                    data-testid={`checkbox-${type.toLowerCase()}`}
                  />
                  <Label 
                    htmlFor={`bedroom-${type}`} 
                    className="text-sm cursor-pointer"
                    data-testid={`label-${type.toLowerCase()}`}
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Price Range Slider */}
          <div className="space-y-3" data-testid="price-range-filter">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-semibold">Price Range</Label>
              <span className="text-sm text-muted-foreground" data-testid="price-range-display">
                ${filters.priceRange.min.toLocaleString()} - ${filters.priceRange.max.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[filters.priceRange.min, filters.priceRange.max]}
              onValueChange={handlePriceRangeChange}
              max={5000}  // Expanded to show all units
              min={500}   // Lowered to capture all units
              step={50}
              className="w-full"
              data-testid="slider-price-range"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$500</span>
              <span>$5,000</span>
            </div>
          </div>

          <Separator />

          {/* Availability Filter */}
          <div className="space-y-3" data-testid="availability-filter">
            <Label className="text-sm font-semibold">Availability</Label>
            <RadioGroup 
              value={filters.availability} 
              onValueChange={handleAvailabilityChange}
              data-testid="radiogroup-availability"
            >
              {availabilityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2" data-testid={`availability-option-${option.value}`}>
                  <RadioGroupItem 
                    value={option.value} 
                    id={option.value}
                    data-testid={`radio-${option.value}`}
                  />
                  <Label 
                    htmlFor={option.value} 
                    className="text-sm cursor-pointer"
                    data-testid={`label-${option.value}`}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Square Footage Range Slider */}
          <div className="space-y-3" data-testid="sqft-range-filter">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-semibold">Square Footage</Label>
              <span className="text-sm text-muted-foreground" data-testid="sqft-range-display">
                {filters.squareFootageRange.min} - {filters.squareFootageRange.max} sq ft
              </span>
            </div>
            <Slider
              value={[filters.squareFootageRange.min, filters.squareFootageRange.max]}
              onValueChange={handleSquareFootageChange}
              max={3000}  // Expanded to capture luxury units
              min={200}   // Lowered to include studios
              step={25}
              className="w-full"
              data-testid="slider-sqft-range"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>200 sq ft</span>
              <span>3,000 sq ft</span>
            </div>
          </div>

          {/* Competitive Set Filter - Only for Portfolio Mode */}
          {isPortfolioMode && (
            <>
              <Separator />
              
              <div className="space-y-3" data-testid="competitive-set-filter">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Competitive Set</Label>
                  {filters.competitiveSet && filters.competitiveSet !== "all_competitors" && (
                    <Badge variant="default" className="text-xs">
                      {competitiveSetOptions.find(opt => opt.value === filters.competitiveSet)?.label.split(' ')[0]}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Filter analysis based on competitive relationships defined in your portfolio matrix
                </p>

                {/* Loading state */}
                {isLoadingRelationships && (
                  <div className="space-y-3" data-testid="competitive-set-loading">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading competitive relationships...</span>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error state */}
                {relationshipsError && !isLoadingRelationships && (
                  <Alert variant="destructive" data-testid="competitive-set-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load competitive relationships. Competitive filtering may not work properly.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Empty state - no relationships */}
                {!isLoadingRelationships && !relationshipsError && !hasCompetitiveRelationships && (
                  <Alert data-testid="competitive-set-empty">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No competitive relationships defined. Only "All Competitors" filtering is available. 
                      Visit the Property Selection Matrix to define competitive relationships.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Radio group - gated by loading and relationships state */}
                {!isLoadingRelationships && !relationshipsError && (
                  <RadioGroup 
                    value={filters.competitiveSet || "all_competitors"} 
                    onValueChange={handleCompetitiveSetChange}
                    data-testid="radiogroup-competitive-set"
                    disabled={isLoadingRelationships}
                  >
                    {competitiveSetOptions.map((option) => {
                      // Disable non-"all_competitors" options if no relationships exist
                      const isDisabled = !hasCompetitiveRelationships && option.value !== "all_competitors";
                      
                      return (
                        <div key={option.value} className="flex items-start space-x-2" data-testid={`competitive-set-${option.value}`}>
                          <RadioGroupItem 
                            value={option.value} 
                            id={`competitive-${option.value}`}
                            data-testid={`radio-competitive-${option.value}`}
                            className="mt-0.5"
                            disabled={isDisabled}
                          />
                          <div className="space-y-1">
                            <Label 
                              htmlFor={`competitive-${option.value}`} 
                              className={`text-sm cursor-pointer font-medium ${isDisabled ? 'text-muted-foreground opacity-50' : ''}`}
                              data-testid={`label-competitive-${option.value}`}
                            >
                              {option.label}
                              {isDisabled && !hasCompetitiveRelationships && (
                                <span className="ml-1 text-xs">(requires relationships)</span>
                              )}
                            </Label>
                            <p className={`text-xs text-muted-foreground ${isDisabled ? 'opacity-50' : ''}`}>
                              {option.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Advanced Filters Section */}
          <Accordion type="single" collapsible className="w-full" data-testid="advanced-filters">
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="hover:no-underline px-0">
                <div className="flex items-center">
                  <ChevronRight className="h-4 w-4 mr-2" />
                  <span className="text-sm font-semibold">Advanced Filters</span>
                  {advancedFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {advancedFiltersCount}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Amenities */}
                <div className="space-y-3" data-testid="amenity-filters">
                  <Label className="text-sm font-medium">Amenities</Label>
                  <div className="space-y-2">
                    {amenityOptions.map((amenity) => (
                      <div key={amenity.value} className="flex items-center space-x-2" data-testid={`amenity-${amenity.value}`}>
                        <Checkbox
                          id={`amenity-${amenity.value}`}
                          checked={filters.amenities?.includes(amenity.value) || false}
                          onCheckedChange={(checked) => handleAmenityChange(amenity.value, checked as boolean)}
                          data-testid={`checkbox-amenity-${amenity.value}`}
                        />
                        <Label 
                          htmlFor={`amenity-${amenity.value}`} 
                          className="text-sm cursor-pointer"
                          data-testid={`label-amenity-${amenity.value}`}
                        >
                          {amenity.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Properties Filter - only show in session/portfolio mode */}
                {isPortfolioMode && availableProperties.length > 0 && (
                  <>
                    <div className="space-y-3" data-testid="property-filters">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center">
                          <Building2 className="h-4 w-4 mr-1.5" />
                          Properties
                          {filters.selectedProperties?.length && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {filters.selectedProperties.length} selected
                            </Badge>
                          )}
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllProperties}
                            className="text-xs h-7 px-2"
                            data-testid="button-select-all-properties"
                            disabled={isLoadingProperties}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDeselectAllProperties}
                            className="text-xs h-7 px-2"
                            data-testid="button-deselect-all-properties"
                            disabled={isLoadingProperties || !filters.selectedProperties?.length}
                          >
                            Deselect All
                          </Button>
                        </div>
                      </div>
                      
                      {isLoadingProperties ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <Skeleton className="h-4 w-4" />
                              <Skeleton className="h-4 flex-1" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {availableProperties.map((property) => {
                            const isSelected = filters.selectedProperties?.includes(property.id) || false;
                            const isSubject = property.profileType === 'subject';
                            
                            return (
                              <div 
                                key={property.id} 
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50" 
                                data-testid={`property-${property.id}`}
                              >
                                <Checkbox
                                  id={`property-${property.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handlePropertyChange(property.id, checked as boolean)}
                                  data-testid={`checkbox-property-${property.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
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
                                    <Badge 
                                      variant={isSubject ? "default" : "secondary"} 
                                      className="text-xs flex-shrink-0"
                                    >
                                      {isSubject ? "Subject" : "Competitor"}
                                    </Badge>
                                  </div>
                                  {property.address && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {property.address}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />
                  </>
                )}

                {/* Lease Terms */}
                <div className="space-y-3" data-testid="lease-term-filters">
                  <Label className="text-sm font-medium">Lease Terms</Label>
                  <div className="space-y-2">
                    {leaseTermOptions.map((term) => (
                      <div key={term.value} className="flex items-center space-x-2" data-testid={`lease-term-${term.value}`}>
                        <Checkbox
                          id={`lease-${term.value}`}
                          checked={filters.leaseTerms?.includes(term.value) || false}
                          onCheckedChange={(checked) => handleLeaseTermChange(term.value, checked as boolean)}
                          data-testid={`checkbox-lease-${term.value}`}
                        />
                        <Label 
                          htmlFor={`lease-${term.value}`} 
                          className="text-sm cursor-pointer"
                          data-testid={`label-lease-${term.value}`}
                        >
                          {term.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Floor Level */}
                <div className="space-y-3" data-testid="floor-level-filter">
                  <Label className="text-sm font-medium">Floor Level</Label>
                  <RadioGroup 
                    value={filters.floorLevel || ""} 
                    onValueChange={handleFloorLevelChange}
                    data-testid="radiogroup-floor-level"
                  >
                    {floorLevelOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2" data-testid={`floor-level-${option.value}`}>
                        <RadioGroupItem 
                          value={option.value} 
                          id={`floor-${option.value}`}
                          data-testid={`radio-floor-${option.value}`}
                        />
                        <Label 
                          htmlFor={`floor-${option.value}`} 
                          className="text-sm cursor-pointer"
                          data-testid={`label-floor-${option.value}`}
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Renovation Status */}
                <div className="space-y-3" data-testid="renovation-status-filter">
                  <Label className="text-sm font-medium">Renovation Status</Label>
                  <RadioGroup 
                    value={filters.renovationStatus || ""} 
                    onValueChange={handleRenovationStatusChange}
                    data-testid="radiogroup-renovation"
                  >
                    {renovationStatusOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2" data-testid={`renovation-${option.value}`}>
                        <RadioGroupItem 
                          value={option.value} 
                          id={`renovation-${option.value}`}
                          data-testid={`radio-renovation-${option.value}`}
                        />
                        <Label 
                          htmlFor={`renovation-${option.value}`} 
                          className="text-sm cursor-pointer"
                          data-testid={`label-renovation-${option.value}`}
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export default AnalysisFilters;