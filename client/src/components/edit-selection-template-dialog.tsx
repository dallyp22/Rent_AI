import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Loader2, Save, Pencil } from "lucide-react";
import type { SavedSelectionTemplate } from "@shared/schema";

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

export default function EditSelectionTemplateDialog({
  template,
  isOpen,
  onClose,
  onSuccess,
}: EditSelectionTemplateDialogProps) {
  const { toast } = useToast();

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "🏢",
    },
  });

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || "",
        icon: template.icon || "🏢",
      });
    }
  }, [template, form]);

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      if (!template) {
        throw new Error("No template to update");
      }

      const response = await apiRequest("PUT", `/api/saved-selection-templates/${template.id}`, {
        name: data.name,
        description: data.description,
        icon: data.icon,
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
            <span>Template "{data.name}" has been updated</span>
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
      console.error("Error updating template:", error);
      toast({
        title: "Failed to Update Template",
        description: error instanceof Error ? error.message : "An error occurred while updating the template",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TemplateFormData) => {
    updateTemplateMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!template) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[525px]" data-testid="edit-template-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Selection Template
          </DialogTitle>
          <DialogDescription>
            Update the template details below. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateTemplateMutation.isPending}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTemplateMutation.isPending} data-testid="button-update-template">
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}