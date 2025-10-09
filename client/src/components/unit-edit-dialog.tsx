import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyUnit, TagDefinition } from "@shared/schema";

const unitFormSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required"),
  tag: z.string().optional(),
  bedrooms: z.coerce.number().min(0).max(10),
  bathrooms: z.coerce.number().min(0).max(10).multipleOf(0.5),
  squareFootage: z.coerce.number().min(0).optional(),
  currentRent: z.string().optional(),
  status: z.enum(["occupied", "vacant", "notice_given"]),
});

type UnitFormData = z.infer<typeof unitFormSchema>;

interface UnitEditDialogProps {
  unit?: PropertyUnit;
  propertyProfileId: string;
  tagDefinitions: TagDefinition[];
  onSave: () => void;
  onClose: () => void;
}

export default function UnitEditDialog({
  unit,
  propertyProfileId,
  tagDefinitions,
  onSave,
  onClose
}: UnitEditDialogProps) {
  const { toast } = useToast();
  const isEdit = !!unit;
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      unitNumber: unit?.unitNumber || "",
      tag: unit?.tag || "",
      bedrooms: unit?.bedrooms || 0,
      bathrooms: parseFloat(unit?.bathrooms || "0") || 0,
      squareFootage: unit?.squareFootage || undefined,
      currentRent: unit?.currentRent || "",
      status: (unit?.status || "occupied") as "occupied" | "vacant" | "notice_given"
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: UnitFormData) => {
      const endpoint = isEdit 
        ? `/api/units/${unit.id}`
        : `/api/property-profiles/${propertyProfileId}/units`;
      
      const response = await apiRequest(
        isEdit ? "PUT" : "POST",
        endpoint,
        {
          ...data,
          propertyProfileId,
          bathrooms: data.bathrooms?.toString()
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: isEdit ? "Unit updated successfully" : "Unit created successfully" 
      });
      onSave();
    },
    onError: (error) => {
      toast({ 
        title: "Failed to save unit", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const response = await apiRequest(
        "POST",
        "/api/tag-definitions",
        {
          propertyProfileId,
          tag: tagName,
          displayOrder: tagDefinitions.length
        }
      );
      return response.json();
    },
    onSuccess: async (newTag) => {
      setIsCreatingNewTag(false);
      setNewTagName("");
      form.setValue("tag", newTag.tag);
      toast({ title: "TAG created successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to create TAG", 
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: UnitFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Unit" : "Add New Unit"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the unit details below." : "Enter the details for the new unit."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unitNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="101" data-testid="input-unit-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TAG</FormLabel>
                  <FormControl>
                    {isCreatingNewTag ? (
                      <div className="flex gap-2">
                        <Input
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Enter new TAG name"
                          data-testid="input-new-tag"
                        />
                        <Button
                          type="button"
                          onClick={() => createTagMutation.mutate(newTagName)}
                          disabled={!newTagName}
                        >
                          Create
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreatingNewTag(false);
                            setNewTagName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={field.value || "no-tag"} 
                        onValueChange={(value) => field.onChange(value === "no-tag" ? "" : value)}
                      >
                        <SelectTrigger data-testid="select-tag">
                          <SelectValue placeholder="Select a TAG" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-tag">No TAG</SelectItem>
                          {tagDefinitions.map(tag => (
                            <SelectItem key={tag.id} value={tag.tag || `untagged-${tag.id}`}>
                              {tag.tag || `Untagged ${tag.id}`}
                            </SelectItem>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => setIsCreatingNewTag(true)}
                          >
                            + Create New TAG
                          </Button>
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        min="0" 
                        max="10"
                        data-testid="input-bedrooms" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        min="0" 
                        max="10" 
                        step="0.5"
                        data-testid="input-bathrooms" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="squareFootage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Square Footage</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      placeholder="1200"
                      data-testid="input-sqft" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentRent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Rent</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="1500"
                      data-testid="input-rent" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="notice_given">Notice Given</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}