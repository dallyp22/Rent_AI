import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, FileTemplate } from "lucide-react";
import type { PropertyProfile } from "@shared/schema";

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

interface SaveSelectionTemplateDialogProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SaveSelectionTemplateDialog({
  sessionId,
  isOpen,
  onClose,
  onSuccess,
}: SaveSelectionTemplateDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "🏢",
    },
  });

  // Fetch session property profiles
  const { data: sessionProperties = [], isLoading: isLoadingProperties } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/analysis-sessions", sessionId, "properties"],
    enabled: isOpen && !!sessionId,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      // Prepare property profiles with roles
      const propertyProfileIds = sessionProperties.map((property) => ({
        propertyProfileId: property.id,
        role: property.profileType === "subject" ? "subject" : "competitor",
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
        title: "Template Saved Successfully",
        description: (
          <div className="flex items-center gap-2">
            <FileTemplate className="h-4 w-4" />
            <span>Template "{data.name}" has been saved</span>
          </div>
        ),
      });
      
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/saved-selection-templates"] });
      
      // Reset form
      form.reset();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close dialog
      onClose();
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      toast({
        title: "Failed to Save Template",
        description: error instanceof Error ? error.message : "An error occurred while saving the template",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TemplateFormData) => {
    setIsSaving(true);
    createTemplateMutation.mutate(data, {
      onSettled: () => {
        setIsSaving(false);
      },
    });
  };

  // Count properties by type
  const subjectCount = sessionProperties.filter((p) => p.profileType === "subject").length;
  const competitorCount = sessionProperties.filter((p) => p.profileType === "competitor").length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]" data-testid="save-template-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Selection as Template
          </DialogTitle>
          <DialogDescription>
            Save your current property selection ({subjectCount} subject
            {subjectCount !== 1 ? "s" : ""}, {competitorCount} competitor
            {competitorCount !== 1 ? "s" : ""}) as a reusable template for future analysis sessions.
          </DialogDescription>
        </DialogHeader>

        {isLoadingProperties ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                    <FormLabel>Icon (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-icon">
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

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} data-testid="button-save-template">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}