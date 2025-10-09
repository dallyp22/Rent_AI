import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Plus, TableIcon, TreeIcon, AlertCircle } from "lucide-react";
import { PropertyProfile, PropertyUnit, TagDefinition } from "@shared/schema";
import UnitHierarchyView from "@/components/unit-hierarchy-view";
import UnitsTableView from "@/components/units-table-view";
import UnitEditDialog from "@/components/unit-edit-dialog";
import TagManagement from "@/components/tag-management";
import ExcelImportDialog from "@/components/excel-import-dialog";
import ExcelExportButton from "@/components/excel-export-button";

export default function UnitManagement() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"hierarchical" | "table">("hierarchical");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTagManagement, setShowTagManagement] = useState(false);

  // Fetch user's properties
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ["/api/property-profiles"],
    queryFn: async () => {
      const response = await fetch("/api/property-profiles");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    }
  });

  // Auto-select first property
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Fetch units for selected property
  const { data: unitsData, isLoading: loadingUnits, refetch: refetchUnits } = useQuery({
    queryKey: selectedPropertyId ? [`/api/property-profiles/${selectedPropertyId}/units`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/property-profiles/${selectedPropertyId}/units`);
      if (!response.ok) throw new Error("Failed to fetch units");
      return response.json();
    },
    enabled: !!selectedPropertyId
  });

  // Fetch hierarchical data for selected property
  const { data: hierarchicalData, refetch: refetchHierarchical } = useQuery({
    queryKey: selectedPropertyId ? [`/api/property-profiles/${selectedPropertyId}/units/hierarchical`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/property-profiles/${selectedPropertyId}/units/hierarchical`);
      if (!response.ok) throw new Error("Failed to fetch hierarchical data");
      return response.json();
    },
    enabled: !!selectedPropertyId && viewMode === "hierarchical"
  });

  // Fetch TAG definitions
  const { data: tagDefinitions = [], refetch: refetchTags } = useQuery({
    queryKey: selectedPropertyId ? [`/api/tag-definitions/${selectedPropertyId}`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/tag-definitions/${selectedPropertyId}`);
      if (!response.ok) throw new Error("Failed to fetch TAG definitions");
      return response.json();
    },
    enabled: !!selectedPropertyId
  });

  // Fetch data completeness
  const { data: completeness } = useQuery({
    queryKey: selectedPropertyId ? [`/api/property-profiles/${selectedPropertyId}/data-completeness`] : null,
    queryFn: async () => {
      const response = await fetch(`/api/property-profiles/${selectedPropertyId}/data-completeness`);
      if (!response.ok) throw new Error("Failed to fetch data completeness");
      return response.json();
    },
    enabled: !!selectedPropertyId
  });

  const handleUnitSaved = () => {
    refetchUnits();
    refetchHierarchical();
    setShowAddUnit(false);
  };

  const handleImportComplete = () => {
    refetchUnits();
    refetchHierarchical();
    refetchTags();
    setShowImport(false);
    toast({
      title: "Import Complete",
      description: "Units have been successfully imported from Excel."
    });
  };

  const handleTagsUpdated = () => {
    refetchTags();
    refetchHierarchical();
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const units = unitsData?.units || [];
  const totalUnits = units.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Unit Management</h1>
          <p className="text-muted-foreground">Manage property units with TAG hierarchy</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTagManagement(true)} data-testid="button-manage-tags">
            Manage TAGs
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)} data-testid="button-import">
            <Upload className="mr-2 h-4 w-4" />
            Import Excel
          </Button>
          {selectedPropertyId && (
            <ExcelExportButton propertyProfileId={selectedPropertyId} propertyName={selectedProperty?.name} />
          )}
          <Button onClick={() => setShowAddUnit(true)} data-testid="button-add-unit">
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Property Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedPropertyId || ""} onValueChange={setSelectedPropertyId} data-testid="select-property">
            <SelectTrigger>
              <SelectValue placeholder={loadingProperties ? "Loading properties..." : "Select a property"} />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property: PropertyProfile) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name} - {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProperty && (
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Units:</span>{" "}
                <Badge variant="secondary">{totalUnits}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Property Type:</span>{" "}
                <Badge variant="outline">{selectedProperty.profileType}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Completeness Indicators */}
      {completeness && (completeness.missingTag > 0 || completeness.missingBedrooms > 0 || 
        completeness.missingBathrooms > 0 || completeness.missingSqft > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Data Completeness Issues:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {completeness.missingTag > 0 && (
                <div>Missing TAGs: <Badge variant="destructive">{completeness.missingTag}</Badge></div>
              )}
              {completeness.missingBedrooms > 0 && (
                <div>Missing Bedrooms: <Badge variant="destructive">{completeness.missingBedrooms}</Badge></div>
              )}
              {completeness.missingBathrooms > 0 && (
                <div>Missing Bathrooms: <Badge variant="destructive">{completeness.missingBathrooms}</Badge></div>
              )}
              {completeness.missingSqft > 0 && (
                <div>Missing Sq Ft: <Badge variant="destructive">{completeness.missingSqft}</Badge></div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* View Mode Tabs */}
      {selectedPropertyId && (
        <Card>
          <CardContent className="pt-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "hierarchical" | "table")}>
              <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="hierarchical" data-testid="tab-hierarchical">
                  <TreeIcon className="mr-2 h-4 w-4" />
                  Hierarchical View
                </TabsTrigger>
                <TabsTrigger value="table" data-testid="tab-table">
                  <TableIcon className="mr-2 h-4 w-4" />
                  Table View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hierarchical" className="mt-6">
                {loadingUnits ? (
                  <div className="text-center py-8 text-muted-foreground">Loading units...</div>
                ) : hierarchicalData ? (
                  <UnitHierarchyView 
                    data={hierarchicalData}
                    tagDefinitions={tagDefinitions}
                    onRefresh={() => {
                      refetchUnits();
                      refetchHierarchical();
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No units found</div>
                )}
              </TabsContent>

              <TabsContent value="table" className="mt-6">
                {loadingUnits ? (
                  <div className="text-center py-8 text-muted-foreground">Loading units...</div>
                ) : units.length > 0 ? (
                  <UnitsTableView 
                    units={units}
                    tagDefinitions={tagDefinitions}
                    onRefresh={refetchUnits}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No units found</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {showAddUnit && selectedPropertyId && (
        <UnitEditDialog
          propertyProfileId={selectedPropertyId}
          tagDefinitions={tagDefinitions}
          onSave={handleUnitSaved}
          onClose={() => setShowAddUnit(false)}
        />
      )}

      {showImport && selectedPropertyId && (
        <ExcelImportDialog
          propertyProfileId={selectedPropertyId}
          onImportComplete={handleImportComplete}
          onClose={() => setShowImport(false)}
        />
      )}

      {showTagManagement && selectedPropertyId && (
        <TagManagement
          propertyProfileId={selectedPropertyId}
          tagDefinitions={tagDefinitions}
          onClose={() => setShowTagManagement(false)}
          onUpdate={handleTagsUpdated}
        />
      )}
    </div>
  );
}