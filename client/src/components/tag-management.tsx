import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, Edit2, Trash2, Save, X, Plus } from "lucide-react";
import { TagDefinition } from "@shared/schema";

interface TagManagementProps {
  propertyProfileId: string;
  tagDefinitions: TagDefinition[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function TagManagement({
  propertyProfileId,
  tagDefinitions,
  onClose,
  onUpdate
}: TagManagementProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Create TAG mutation
  const createTagMutation = useMutation({
    mutationFn: async (data: { tag: string; description: string }) => {
      return apiRequest("/api/tag-definitions", {
        method: "POST",
        body: JSON.stringify({
          propertyProfileId,
          tag: data.tag,
          description: data.description,
          displayOrder: tagDefinitions.length
        })
      });
    },
    onSuccess: () => {
      toast({ title: "TAG created successfully" });
      setNewTag("");
      setNewDescription("");
      onUpdate();
    },
    onError: () => {
      toast({ 
        title: "Failed to create TAG", 
        variant: "destructive" 
      });
    }
  });

  // Update TAG mutation
  const updateTagMutation = useMutation({
    mutationFn: async (data: { id: string; description: string }) => {
      return apiRequest(`/api/tag-definitions/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({ description: data.description })
      });
    },
    onSuccess: () => {
      toast({ title: "TAG updated successfully" });
      setEditingId(null);
      onUpdate();
    },
    onError: () => {
      toast({ 
        title: "Failed to update TAG", 
        variant: "destructive" 
      });
    }
  });

  // Delete TAG mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/tag-definitions/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({ title: "TAG deleted successfully" });
      onUpdate();
    },
    onError: () => {
      toast({ 
        title: "Failed to delete TAG", 
        variant: "destructive" 
      });
    }
  });

  // Reorder TAGs mutation
  const reorderTagsMutation = useMutation({
    mutationFn: async (updates: Array<{ tag: string; order: number }>) => {
      return apiRequest("/api/tag-definitions/reorder", {
        method: "PUT",
        body: JSON.stringify({
          propertyProfileId,
          updates
        })
      });
    },
    onSuccess: () => {
      toast({ title: "TAGs reordered successfully" });
      onUpdate();
    },
    onError: () => {
      toast({ 
        title: "Failed to reorder TAGs", 
        variant: "destructive" 
      });
    }
  });

  const moveTag = (index: number, direction: "up" | "down") => {
    const sorted = [...tagDefinitions].sort((a, b) => a.displayOrder - b.displayOrder);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= sorted.length) return;

    const updates = sorted.map((tag, i) => {
      let order = i;
      if (i === index) order = newIndex;
      else if (i === newIndex) order = index;
      
      return { tag: tag.tag, order };
    });

    reorderTagsMutation.mutate(updates);
  };

  const startEdit = (tag: TagDefinition) => {
    setEditingId(tag.id!);
    setEditDescription(tag.description || "");
  };

  const saveEdit = () => {
    if (editingId) {
      updateTagMutation.mutate({
        id: editingId,
        description: editDescription
      });
    }
  };

  const sorted = [...tagDefinitions].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>TAG Management</DialogTitle>
          <DialogDescription>
            Manage TAGs for this property. TAGs help organize units into logical groups.
          </DialogDescription>
        </DialogHeader>

        {/* Add New TAG */}
        <div className="space-y-2 border rounded-lg p-4">
          <h3 className="font-medium">Add New TAG</h3>
          <div className="flex gap-2">
            <Input
              placeholder="TAG name"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              data-testid="input-new-tag-name"
            />
            <Input
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              data-testid="input-new-tag-description"
            />
            <Button
              onClick={() => createTagMutation.mutate({ tag: newTag, description: newDescription })}
              disabled={!newTag || createTagMutation.isPending}
              data-testid="button-create-tag"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* TAG List */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Order</TableHead>
                <TableHead>TAG Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((tag, index) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveTag(index, "up")}
                          disabled={index === 0}
                          data-testid={`button-move-up-${tag.tag}`}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveTag(index, "down")}
                          disabled={index === sorted.length - 1}
                          data-testid={`button-move-down-${tag.tag}`}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{tag.tag}</span>
                  </TableCell>
                  <TableCell>
                    {editingId === tag.id ? (
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="max-w-[300px]"
                        data-testid={`input-edit-description-${tag.tag}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {tag.description || "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === tag.id ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={saveEdit}
                          data-testid={`button-save-tag-${tag.tag}`}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(null)}
                          data-testid={`button-cancel-tag-${tag.tag}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(tag)}
                          data-testid={`button-edit-tag-${tag.tag}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Delete TAG "${tag.tag}"? This will not delete any units.`)) {
                              deleteTagMutation.mutate(tag.id!);
                            }
                          }}
                          data-testid={`button-delete-tag-${tag.tag}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No TAGs defined yet. Add one above to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}