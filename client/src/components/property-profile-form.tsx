import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useImperativeHandle, useEffect } from "react";
import { insertPropertyProfileSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
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
      });
    }
  }), [form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

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