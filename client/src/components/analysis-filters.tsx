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
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { FilterCriteria, PropertyProfile } from "@shared/schema";

interface AnalysisFiltersProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  isPortfolioMode?: boolean;
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


const AnalysisFilters = memo(({ 
  filters, 
  onFiltersChange,
  isPortfolioMode = false
}: AnalysisFiltersProps) => {
  // Memoize advanced filters count
  const advancedFiltersCount = useMemo(() => 
    (filters.amenities?.length || 0) +
    (filters.leaseTerms?.length || 0) +
    (filters.floorLevel ? 1 : 0) +
    (filters.renovationStatus ? 1 : 0),
    [filters.amenities, filters.leaseTerms, filters.floorLevel, filters.renovationStatus]
  );

  // Check if all bedroom types are selected
  const allBedroomTypesSelected = useMemo(() => 
    bedroomTypes.every(type => filters.bedroomTypes.includes(type)),
    [filters.bedroomTypes]
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

  // Handle Select All/Deselect All for bedroom types
  const handleSelectAllBedrooms = useCallback((checked: boolean | "indeterminate") => {
    // Convert indeterminate to false and ensure we handle the state properly
    const isChecked = checked === true;
    onFiltersChange({
      ...filters,
      bedroomTypes: isChecked ? [...bedroomTypes] : []
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

          {/* Bedroom Type Filters */}
          <div className="space-y-3" data-testid="bedroom-filters">
            <Label className="text-sm font-semibold">Unit Types</Label>
            
            {/* Select All Checkbox */}
            <div className="flex items-center space-x-2 mb-2" data-testid="bedroom-filter-select-all">
              <Checkbox
                id="bedroom-select-all"
                checked={allBedroomTypesSelected}
                onCheckedChange={handleSelectAllBedrooms}
                data-testid="checkbox-select-all"
              />
              <Label 
                htmlFor="bedroom-select-all" 
                className="text-sm cursor-pointer font-medium"
                data-testid="label-select-all"
              >
                Select All
              </Label>
            </div>
            
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