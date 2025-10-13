import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Building2,
  Target,
  Users,
  MapPin,
  Home,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import type { PropertyProfile, SavedSelectionTemplate } from "@shared/schema";

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

// Form schema for step 1
const templateDetailsSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  icon: z.string().optional(),
});

type TemplateDetailsData = z.infer<typeof templateDetailsSchema>;

interface PropertySelectionItem {
  propertyProfileId: string;
  role: 'subject' | 'competitor';
}

interface CreateSelectionTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (template: SavedSelectionTemplate) => void;
}

export default function CreateSelectionTemplateDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateSelectionTemplateDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<Map<string, 'subject' | 'competitor'>>(new Map());

  // Form setup for step 1
  const form = useForm<TemplateDetailsData>({
    resolver: zodResolver(templateDetailsSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "🏢",
    },
  });

  // Fetch all property profiles
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/property-profiles"],
    enabled: isOpen,
  });

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    
    const query = searchQuery.toLowerCase();
    return properties.filter(
      property =>
        property.name.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query) ||
        (property.city && property.city.toLowerCase().includes(query)) ||
        (property.state && property.state.toLowerCase().includes(query))
    );
  }, [properties, searchQuery]);

  // Group properties by their profile type
  const groupedProperties = useMemo(() => {
    const subjects = filteredProperties.filter(p => p.profileType === 'subject');
    const competitors = filteredProperties.filter(p => p.profileType === 'competitor');
    return { subjects, competitors };
  }, [filteredProperties]);

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateDetailsData) => {
      // Prepare property profile IDs with roles
      const propertyProfileIds = Array.from(selectedProperties.entries()).map(([propertyProfileId, role]) => ({
        propertyProfileId,
        role,
      }));

      const response = await apiRequest("POST", "/api/saved-selection-templates", {
        name: data.name,
        description: data.description,
        icon: data.icon,
        propertyProfileIds,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create template");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Template Created Successfully",
        description: (
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Template "{data.name}" has been created</span>
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
        onSuccess(data);
      }
      
      // Close dialog
      onClose();
    },
    onError: (error) => {
      console.error("Error creating template:", error);
      toast({
        title: "Failed to Create Template",
        description: error instanceof Error ? error.message : "An error occurred while creating the template",
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

    // Get form data and create template
    const formData = form.getValues();
    createTemplateMutation.mutate(formData);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]" data-testid="create-template-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 1 ? (
              <>
                <Building2 className="h-5 w-5" />
                Create Selection Template
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Select Properties
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? "Set up the basic details for your selection template"
              : "Choose which properties to include in this template and assign their roles"}
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
            <span className="text-sm font-medium">Select Properties</span>
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
                        data-testid="input-template-name"
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
                        data-testid="textarea-template-description"
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
                    <FormLabel>Icon</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-template-icon">
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ICON_OPTIONS.map(option => (
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
                      Choose an icon to visually identify this template
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
              {isLoadingProperties ? (
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

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStep === 2 && (
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {currentStep === 1 ? (
            <Button
              onClick={handleNextStep}
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={selectedProperties.size === 0 || createTemplateMutation.isPending}
              data-testid="button-create-template"
            >
              {createTemplateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}