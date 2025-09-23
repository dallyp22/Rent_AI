import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Building2, Target, Users } from "lucide-react";
import PropertyProfileForm from "../components/property-profile-form";
import PropertyProfilesList from "../components/property-profiles-list";
import type { PropertyProfile, InsertPropertyProfile } from "@shared/schema";

export default function PropertyProfiles() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PropertyProfile | null>(null);

  // Fetch all property profiles
  const { data: profiles = [], isLoading } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/property-profiles"],
  });

  // Filter profiles by type
  const subjectProperties = profiles.filter(p => p.profileType === 'subject');
  const competitorProperties = profiles.filter(p => p.profileType === 'competitor');

  // Create property profile mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertPropertyProfile): Promise<PropertyProfile> => {
      const res = await apiRequest("POST", "/api/property-profiles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-profiles"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Property Profile Created",
        description: "Property profile has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Error creating property profile:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create property profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update property profile mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PropertyProfile> }): Promise<PropertyProfile> => {
      const res = await apiRequest("PUT", `/api/property-profiles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-profiles"] });
      setEditingProfile(null);
      toast({
        title: "Property Profile Updated",
        description: "Property profile has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating property profile:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update property profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete property profile mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiRequest("DELETE", `/api/property-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-profiles"] });
      toast({
        title: "Property Profile Deleted",
        description: "Property profile has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting property profile:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete property profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreate = (data: InsertPropertyProfile) => {
    // Ensure amenities is a proper Array before sending to API
    const cleanData = {
      ...data,
      amenities: data.amenities ? Array.from(data.amenities).filter((item): item is string => typeof item === 'string') : []
    };
    createMutation.mutate(cleanData);
  };

  const handleEdit = (profile: PropertyProfile) => {
    setEditingProfile(profile);
  };

  const handleUpdate = (data: InsertPropertyProfile) => {
    if (editingProfile) {
      // Ensure amenities is a proper Array before sending to API
      const cleanData = {
        ...data,
        amenities: data.amenities ? Array.from(data.amenities).filter((item): item is string => typeof item === 'string') : []
      };
      updateMutation.mutate({ id: editingProfile.id, data: cleanData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this property profile? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6" data-testid="property-profiles-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Property Profile Management
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Manage your subject properties and competitors for analysis
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
          data-testid="button-add-property"
        >
          <Plus className="h-4 w-4" />
          Add Property Profile
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-total-properties">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">
              {profiles.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Managed property profiles
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-subject-properties">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subject Properties</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-subject-count">
              {subjectProperties.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Properties being analyzed
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-competitor-properties">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-competitor-count">
              {competitorProperties.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Competitive properties
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Properties List */}
      <PropertyProfilesList
        profiles={profiles}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-property">
          <DialogHeader>
            <DialogTitle>Add Property Profile</DialogTitle>
          </DialogHeader>
          <PropertyProfileForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-property">
          <DialogHeader>
            <DialogTitle>Edit Property Profile</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <PropertyProfileForm
              initialData={editingProfile}
              onSubmit={handleUpdate}
              onCancel={() => setEditingProfile(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}