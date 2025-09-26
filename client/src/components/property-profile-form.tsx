import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useImperativeHandle, useEffect } from "react";
import { insertPropertyProfileSchema, unitMixSchema, type UnitMix } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Home } from "lucide-react";
import type { PropertyProfile, InsertPropertyProfile } from "@shared/schema";
import { normalizeAmenities } from "@shared/utils";

// Extend the schema with additional validation
const formSchema = insertPropertyProfileSchema.extend({
  name: z.string().min(1, "Property name is required").max(100, "Property name must be less than 100 characters"),
  address: z.string().min(1, "Address is required").max(200, "Address must be less than 200 characters"),
  url: z.string().url("Please enter a valid URL").min(1, "Property URL is required"),
  profileType: z.enum(["subject", "competitor"], {
    required_error: "Please select a property type",
  }),
  unitMix: unitMixSchema.optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PropertyProfileFormProps {
  initialData?: PropertyProfile;
  onSubmit: (data: InsertPropertyProfile) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Export interface for form ref to allow parent to reset form
export interface PropertyProfileFormRef {
  resetForm: () => void;
}

const PropertyProfileForm = forwardRef<PropertyProfileFormRef, PropertyProfileFormProps>(
  (
    {
      initialData,
      onSubmit,
      onCancel,
      isLoading = false
    },
    ref
  ) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      address: initialData?.address ?? "",
      url: initialData?.url ?? "",
      profileType: (initialData?.profileType as "subject" | "competitor") ?? "subject",
      city: initialData?.city ?? "",
      state: initialData?.state ?? "",
      propertyType: initialData?.propertyType ?? "",
      totalUnits: initialData?.totalUnits ?? undefined,
      builtYear: initialData?.builtYear ?? undefined,
      squareFootage: initialData?.squareFootage ?? undefined,
      parkingSpaces: initialData?.parkingSpaces ?? undefined,
      amenities: initialData?.amenities ?? [],
      unitMix: initialData?.unitMix ?? {
        studio: 0,
        oneBedroom: 0,
        twoBedroom: 0,
        threeBedroom: 0,
        fourPlusBedroom: 0
      },
    }
  });

  // Expose form reset functionality to parent via ref
  useImperativeHandle(ref, () => ({
    resetForm: () => {
      form.reset({
        name: "",
        address: "",
        url: "",
        profileType: "subject",
        city: "",
        state: "",
        propertyType: "",
        totalUnits: undefined,
        builtYear: undefined,
        squareFootage: undefined,
        parkingSpaces: undefined,
        amenities: [],
        unitMix: {
          studio: 0,
          oneBedroom: 0,
          twoBedroom: 0,
          threeBedroom: 0,
          fourPlusBedroom: 0
        },
      });
    }
  }), [form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  // Calculate total units from unit mix with NaN protection
  const calculateTotalUnitsFromMix = (unitMix: UnitMix): number => {
    const studio = Number(unitMix.studio) || 0;
    const oneBedroom = Number(unitMix.oneBedroom) || 0;
    const twoBedroom = Number(unitMix.twoBedroom) || 0;
    const threeBedroom = Number(unitMix.threeBedroom) || 0;
    const fourPlusBedroom = Number(unitMix.fourPlusBedroom) || 0;
    return studio + oneBedroom + twoBedroom + threeBedroom + fourPlusBedroom;
  };

  // Watch unit mix changes to calculate total with proper validation
  const unitMixValues = form.watch("unitMix");
  const calculatedTotalUnits = React.useMemo(() => {
    if (!unitMixValues || typeof unitMixValues !== 'object') return 0;
    
    // Additional validation to ensure all required properties exist
    const hasRequiredProps = 'studio' in unitMixValues && 
                            'oneBedroom' in unitMixValues && 
                            'twoBedroom' in unitMixValues && 
                            'threeBedroom' in unitMixValues && 
                            'fourPlusBedroom' in unitMixValues;
    
    if (!hasRequiredProps) return 0;
    
    const total = calculateTotalUnitsFromMix(unitMixValues);
    return isNaN(total) ? 0 : total;
  }, [unitMixValues]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="property-profile-form">
        {/* Required Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter property name"
                    {...field}
                    data-testid="input-property-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="profileType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-property-type">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="subject">Subject Property</SelectItem>
                    <SelectItem value="competitor">Competitor Property</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter full property address"
                  className="resize-none"
                  rows={3}
                  {...field}
                  data-testid="input-address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property URL *</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://www.apartments.com/property-name"
                  {...field}
                  data-testid="input-url"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Optional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter city"
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-city"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter state"
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-state"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="propertyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Building Type</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Garden Style, Mid-Rise, High-Rise"
                    {...field}
                    value={field.value ?? ""}
                    data-testid="input-building-type"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalUnits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Units</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter number of units"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    value={field.value ?? ""}
                    data-testid="input-total-units"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="builtYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Built Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 2020"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    value={field.value ?? ""}
                    data-testid="input-built-year"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="squareFootage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Square Footage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Total sq ft"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    value={field.value ?? ""}
                    data-testid="input-square-footage"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parkingSpaces"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parking Spaces</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Number of spaces"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    value={field.value ?? ""}
                    data-testid="input-parking-spaces"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Amenities Field */}
        <FormField
          control={form.control}
          name="amenities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amenities</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter amenities separated by commas (e.g., Pool, Gym, Parking, Pet Friendly)"
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={Array.isArray(field.value) ? field.value.join(", ") : ""}
                  onChange={(e) => {
                    // Use shared normalization helper to ensure consistency
                    const normalizedAmenities = normalizeAmenities(e.target.value);
                    field.onChange(normalizedAmenities);
                  }}
                  data-testid="input-amenities"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit Mix Section */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium">Unit Mix Breakdown</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the number of units for each bedroom type. The total will be calculated automatically.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <FormField
              control={form.control}
              name="unitMix.studio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Studio Units</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      value={field.value || 0}
                      data-testid="input-studio-units"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitMix.oneBedroom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>1 Bedroom</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      value={field.value || 0}
                      data-testid="input-one-bedroom-units"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitMix.twoBedroom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2 Bedroom</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      value={field.value || 0}
                      data-testid="input-two-bedroom-units"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitMix.threeBedroom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>3 Bedroom</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      value={field.value || 0}
                      data-testid="input-three-bedroom-units"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitMix.fourPlusBedroom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4+ Bedroom</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      value={field.value || 0}
                      data-testid="input-four-plus-bedroom-units"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Calculated Total Units Display */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Total Units from Mix:</span>
              <span 
                className="text-lg font-bold text-primary" 
                data-testid="text-calculated-total-units"
              >
                {calculatedTotalUnits}
              </span>
            </div>
            {calculatedTotalUnits > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                This total is calculated from your unit mix breakdown above.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            data-testid="button-save"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Property" : "Create Property"}
          </Button>
        </div>
      </form>
    </Form>
  );
});

PropertyProfileForm.displayName = "PropertyProfileForm";

export default PropertyProfileForm;