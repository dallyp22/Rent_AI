import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, Save, Pencil, Building2, Users, Search, 
  Target, Check, AlertCircle, MapPin, Home, ArrowLeft, ArrowRight 
} from "lucide-react";
import type { SavedSelectionTemplate, PropertyProfile } from "@shared/schema";

// Icon options for templates
const ICON_OPTIONS = [
  { value: "🏢", label: "Building" },
  { value: "🌟", label: "Star" },
  { value: "💼", label: "Briefcase" },
  { value: "📊", label: "Chart" },
  { value: "🏆", label: "Trophy" },
  { value: "🎯", label: "Target" },
  { value: "📌", label: "Pin" },
  { value: "🏠", label: "House" },
  { value: "🌆", label: "City" },
  { value: "📈", label: "Growth" },
];

// Form schema
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  icon: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface EditSelectionTemplateDialogProps {
  template: SavedSelectionTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface TemplateWithProfiles extends SavedSelectionTemplate {
  propertyProfiles?: PropertyProfile[];
  templatePropertyProfiles?: Array<{
    propertyProfileId: string;
    role: 'subject' | 'competitor';
  }>;
}

export default function EditSelectionTemplateDialog({
  template,
  isOpen,
  onClose,
  onSuccess,
}: EditSelectionTemplateDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProperties, setSelectedProperties] = useState<Map<string, 'subject' | 'competitor'>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "🏢",
    },
  });

  // Fetch all property profiles
  const { data: allProperties = [], isLoading: isLoadingProperties } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/property-profiles"],
    enabled: isOpen && currentStep === 2,
  });

  // Fetch template details with property profiles when dialog opens
  useEffect(() => {
    if (template && isOpen) {
      setIsLoadingTemplate(true);
      
      // Reset form with template data
      form.reset({
        name: template.name,
        description: template.description || "",
        icon: template.icon || "🏢",
      });

      // Fetch template with its property profiles
      apiRequest("GET", `/api/saved-selection-templates/${template.id}`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch template details");
          }
          const data: TemplateWithProfiles = await response.json();
          
          // Set selected properties from template's property profiles
          const newSelectedProperties = new Map<string, 'subject' | 'competitor'>();
          
          // If we have propertyProfiles (from the join), use them
          if (data.propertyProfiles && Array.isArray(data.propertyProfiles)) {
            data.propertyProfiles.forEach((profile: any) => {
              // The backend returns profiles with roles from the junction table
              const role = profile.role || profile.profileType || 'competitor';
              newSelectedProperties.set(profile.id, role as 'subject' | 'competitor');
            });
          }
          
          // If we have templatePropertyProfiles (alternative format), use them
          if (data.templatePropertyProfiles && Array.isArray(data.templatePropertyProfiles)) {
            data.templatePropertyProfiles.forEach((tpp) => {
              newSelectedProperties.set(tpp.propertyProfileId, tpp.role);
            });
          }
          
          setSelectedProperties(newSelectedProperties);
        })
        .catch((error) => {
          console.error("Error fetching template details:", error);
          toast({
            title: "Failed to Load Template",
            description: "Could not load template property profiles",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingTemplate(false);
        });
    }
  }, [template, isOpen, form, toast]);

  // Filter properties based on search
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return allProperties;
    
    const query = searchQuery.toLowerCase();
    return allProperties.filter(property => 
      property.name.toLowerCase().includes(query) ||
      property.address?.toLowerCase().includes(query) ||
      property.city?.toLowerCase().includes(query) ||
      property.state?.toLowerCase().includes(query)
    );
  }, [allProperties, searchQuery]);

  // Group properties by their profile type
  const groupedProperties = useMemo(() => {
    const subjects = filteredProperties.filter(p => p.profileType === 'subject');
    const competitors = filteredProperties.filter(p => p.profileType === 'competitor');
    return { subjects, competitors };
  }, [filteredProperties]);

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      if (!template) {
        throw new Error("No template to update");
      }

      // Prepare property profile IDs with roles
      const propertyProfileIds = Array.from(selectedProperties.entries()).map(([propertyProfileId, role]) => ({
        propertyProfileId,
        role
      }));

      const response = await apiRequest("PUT", `/api/saved-selection-templates/${template.id}`, {
        name: data.name,
        description: data.description,
        icon: data.icon,
        propertyProfileIds, // Include property profiles in the update
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update template");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Template Updated Successfully",
        description: (
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            <span>Template "{data.name}" has been updated with {selectedProperties.size} properties</span>
          </div>
        ),
      });
      
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/saved-selection-templates"] });
      
      // Reset form and state
      form.reset();
      setSelectedProperties(new Map());
      setCurrentStep(1);
      setSearchQuery("");
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close dialog
      onClose();
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast({
        title: "Failed to Update Template",
        description: error instanceof Error ? error.message : "An error occurred while updating the template",
        variant: "destructive",
      });
    },
  });

  const handlePropertyToggle = (propertyId: string, checked: boolean, defaultRole: 'subject' | 'competitor') => {
    setSelectedProperties(prev => {
      const newMap = new Map(prev);
      if (checked) {
        newMap.set(propertyId, defaultRole);
      } else {
        newMap.delete(propertyId);
      }
      return newMap;
    });
  };

  const handleRoleChange = (propertyId: string, role: 'subject' | 'competitor') => {
    setSelectedProperties(prev => {
      const newMap = new Map(prev);
      if (newMap.has(propertyId)) {
        newMap.set(propertyId, role);
      }
      return newMap;
    });
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Validate step 1
      const isValid = await form.trigger();
      if (!isValid) return;
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    // Validate that at least one property is selected
    if (selectedProperties.size === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select at least one property for this template",
        variant: "destructive",
      });
      return;
    }

    // Get form data and update template
    const formData = form.getValues();
    updateTemplateMutation.mutate(formData);
  };

  const handleClose = () => {
    form.reset();
    setSelectedProperties(new Map());
    setCurrentStep(1);
    setSearchQuery("");
    onClose();
  };

  const getSelectionCounts = () => {
    let subjects = 0;
    let competitors = 0;
    selectedProperties.forEach(role => {
      if (role === 'subject') subjects++;
      else competitors++;
    });
    return { subjects, competitors };
  };

  const counts = getSelectionCounts();

  if (!template) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]" data-testid="edit-template-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 1 ? (
              <>
                <Pencil className="h-5 w-5" />
                Edit Selection Template
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Edit Property Selection
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? "Update the template details below"
              : "Modify which properties are included in this template and their roles"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">Template Details</span>
          </div>
          <Separator className="w-8" />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Property Selection</span>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 ? (
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Downtown Portfolio, Class A Competition"
                        data-testid="input-edit-template-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive name for this property selection template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the purpose or context of this template..."
                        rows={3}
                        data-testid="textarea-edit-template-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Add notes about when to use this template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-template-icon">
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ICON_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span className="text-xl">{option.value}</span>
                              <span>{option.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose an icon to help identify this template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        ) : (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties by name, address, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-property-search"
              />
            </div>

            {/* Selection Summary */}
            <Card data-testid="selection-summary">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium">{counts.subjects} Subject{counts.subjects !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      <span className="font-medium">{counts.competitors} Competitor{counts.competitors !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{selectedProperties.size} Total Selected</span>
                    </div>
                  </div>
                  {selectedProperties.size === 0 && (
                    <Badge variant="outline" className="text-amber-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Select at least one property
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Properties List */}
            <ScrollArea className="h-[350px] rounded-md border p-4">
              {isLoadingProperties || isLoadingTemplate ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No properties found matching your search" : "No properties available"}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Subject Properties Section */}
                  {groupedProperties.subjects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Subject Properties</h3>
                        <Badge variant="secondary">{groupedProperties.subjects.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {groupedProperties.subjects.map(property => {
                          const isSelected = selectedProperties.has(property.id);
                          const role = selectedProperties.get(property.id);
                          return (
                            <Card 
                              key={property.id} 
                              className={`transition-colors ${isSelected ? 'border-primary' : ''}`}
                              data-testid={`property-card-${property.id}`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => 
                                        handlePropertyToggle(property.id, checked as boolean, 'subject')
                                      }
                                      data-testid={`checkbox-property-${property.id}`}
                                    />
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">{property.name}</h4>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{property.address}</span>
                                      </div>
                                      {(property.city || property.state) && (
                                        <div className="text-xs text-muted-foreground">
                                          {property.city}{property.city && property.state ? ', ' : ''}{property.state}
                                        </div>
                                      )}
                                      {property.propertyType && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Home className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">{property.propertyType}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <RadioGroup 
                                      value={role} 
                                      onValueChange={(value) => 
                                        handleRoleChange(property.id, value as 'subject' | 'competitor')
                                      }
                                      className="flex gap-3"
                                      data-testid={`role-group-${property.id}`}
                                    >
                                      <div className="flex items-center">
                                        <RadioGroupItem value="subject" id={`subject-${property.id}`} />
                                        <Label 
                                          htmlFor={`subject-${property.id}`} 
                                          className="ml-1 text-xs cursor-pointer"
                                        >
                                          Subject
                                        </Label>
                                      </div>
                                      <div className="flex items-center">
                                        <RadioGroupItem value="competitor" id={`competitor-${property.id}`} />
                                        <Label 
                                          htmlFor={`competitor-${property.id}`} 
                                          className="ml-1 text-xs cursor-pointer"
                                        >
                                          Competitor
                                        </Label>
                                      </div>
                                    </RadioGroup>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Competitor Properties Section */}
                  {groupedProperties.competitors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-secondary" />
                        <h3 className="font-semibold">Competitor Properties</h3>
                        <Badge variant="secondary">{groupedProperties.competitors.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {groupedProperties.competitors.map(property => {
                          const isSelected = selectedProperties.has(property.id);
                          const role = selectedProperties.get(property.id);
                          return (
                            <Card 
                              key={property.id} 
                              className={`transition-colors ${isSelected ? 'border-primary' : ''}`}
                              data-testid={`property-card-${property.id}`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => 
                                        handlePropertyToggle(property.id, checked as boolean, 'competitor')
                                      }
                                      data-testid={`checkbox-property-${property.id}`}
                                    />
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">{property.name}</h4>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                        <MapPin className="h-3 w-3" />
                                        <span>{property.address}</span>
                                      </div>
                                      {(property.city || property.state) && (
                                        <div className="text-xs text-muted-foreground">
                                          {property.city}{property.city && property.state ? ', ' : ''}{property.state}
                                        </div>
                                      )}
                                      {property.propertyType && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Home className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">{property.propertyType}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <RadioGroup 
                                      value={role} 
                                      onValueChange={(value) => 
                                        handleRoleChange(property.id, value as 'subject' | 'competitor')
                                      }
                                      className="flex gap-3"
                                      data-testid={`role-group-${property.id}`}
                                    >
                                      <div className="flex items-center">
                                        <RadioGroupItem value="subject" id={`subject-${property.id}`} />
                                        <Label 
                                          htmlFor={`subject-${property.id}`} 
                                          className="ml-1 text-xs cursor-pointer"
                                        >
                                          Subject
                                        </Label>
                                      </div>
                                      <div className="flex items-center">
                                        <RadioGroupItem value="competitor" id={`competitor-${property.id}`} />
                                        <Label 
                                          htmlFor={`competitor-${property.id}`} 
                                          className="ml-1 text-xs cursor-pointer"
                                        >
                                          Competitor
                                        </Label>
                                      </div>
                                    </RadioGroup>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 pt-4">
          {currentStep === 2 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              disabled={updateTemplateMutation.isPending}
              data-testid="button-previous-step"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateTemplateMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            {currentStep === 1 ? (
              <Button 
                type="button" 
                onClick={handleNextStep}
                disabled={updateTemplateMutation.isPending}
                data-testid="button-next-step"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={updateTemplateMutation.isPending || selectedProperties.size === 0}
                data-testid="button-update-template"
              >
                {updateTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Template
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}