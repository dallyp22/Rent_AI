import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit2,
  Trash2,
  Save,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PropertyUnit, TagDefinition } from "@shared/schema";

interface UnitsTableViewProps {
  units: PropertyUnit[];
  tagDefinitions: TagDefinition[];
  onRefresh: () => void;
}

export default function UnitsTableView({ units, tagDefinitions, onRefresh }: UnitsTableViewProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PropertyUnit>>({});
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("unitNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Update unit mutation
  const updateUnitMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<PropertyUnit> }) => {
      return apiRequest("PUT", `/api/units/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({ title: "Unit updated successfully" });
      setEditingId(null);
      onRefresh();
    },
    onError: () => {
      toast({ 
        title: "Failed to update unit", 
        variant: "destructive" 
      });
    }
  });

  // Delete unit mutation
  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      return apiRequest("DELETE", `/api/units/${unitId}`);
    },
    onSuccess: () => {
      toast({ title: "Unit deleted successfully" });
      onRefresh();
    },
    onError: () => {
      toast({ 
        title: "Failed to delete unit", 
        variant: "destructive" 
      });
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { units: Array<{ id: string; tag: string }> }) => {
      return apiRequest("PUT", "/api/units/bulk", updates);
    },
    onSuccess: () => {
      toast({ title: "Units updated successfully" });
      setSelectedUnits(new Set());
      onRefresh();
    },
    onError: () => {
      toast({ 
        title: "Failed to update units", 
        variant: "destructive" 
      });
    }
  });

  // Filter and sort units
  const filteredUnits = units.filter(unit => 
    filterTag === "all" || unit.tag === filterTag
  );

  const sortedUnits = [...filteredUnits].sort((a, b) => {
    const aVal = a[sortBy as keyof PropertyUnit];
    const bVal = b[sortBy as keyof PropertyUnit];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedUnits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUnits = sortedUnits.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const startEdit = (unit: PropertyUnit) => {
    setEditingId(unit.id!);
    setEditData({
      unitNumber: unit.unitNumber,
      tag: unit.tag,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      squareFootage: unit.squareFootage,
      currentRent: unit.currentRent,
      status: unit.status
    });
  };

  const saveEdit = () => {
    if (editingId) {
      updateUnitMutation.mutate({
        id: editingId,
        updates: editData
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const toggleSelectAll = () => {
    if (selectedUnits.size === paginatedUnits.length) {
      setSelectedUnits(new Set());
    } else {
      setSelectedUnits(new Set(paginatedUnits.map(u => u.id!)));
    }
  };

  const toggleSelect = (unitId: string) => {
    const newSelected = new Set(selectedUnits);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnits(newSelected);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Bulk Actions */}
      <div className="flex flex-col md:flex-row gap-4">
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-tag">
            <SelectValue placeholder="Filter by TAG" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All TAGs</SelectItem>
            {tagDefinitions.map(tag => (
              <SelectItem key={tag.tag} value={tag.tag}>
                {tag.tag}
              </SelectItem>
            ))}
            <SelectItem value="null">Untagged</SelectItem>
          </SelectContent>
        </Select>

        {selectedUnits.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge>{selectedUnits.size} selected</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newTag = prompt("Enter TAG for selected units:");
                if (newTag) {
                  bulkUpdateMutation.mutate({
                    units: Array.from(selectedUnits).map(id => ({ id, tag: newTag }))
                  });
                }
              }}
              data-testid="button-bulk-tag"
            >
              Bulk Assign TAG
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${selectedUnits.size} units?`)) {
                  selectedUnits.forEach(id => deleteUnitMutation.mutate(id));
                }
              }}
              data-testid="button-bulk-delete"
            >
              Bulk Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedUnits.size === paginatedUnits.length && paginatedUnits.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("unitNumber")}
                  className="-ml-4"
                >
                  Unit Number
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("tag")}
                  className="-ml-4"
                >
                  TAG
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("bedrooms")}
                  className="-ml-4"
                >
                  Bedrooms
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Bathrooms</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("squareFootage")}
                  className="-ml-4"
                >
                  Sq Ft
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("currentRent")}
                  className="-ml-4"
                >
                  Current Rent
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUnits.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedUnits.has(unit.id!)}
                    onCheckedChange={() => toggleSelect(unit.id!)}
                    data-testid={`checkbox-unit-${unit.unitNumber}`}
                  />
                </TableCell>
                <TableCell>
                  {editingId === unit.id ? (
                    <Input
                      value={editData.unitNumber || ""}
                      onChange={(e) => setEditData({ ...editData, unitNumber: e.target.value })}
                      className="w-24"
                    />
                  ) : (
                    <span className="font-medium">{unit.unitNumber}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === unit.id ? (
                    <Select
                      value={editData.tag || "untagged"}
                      onValueChange={(value) => setEditData({ ...editData, tag: value === "untagged" ? "" : value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="untagged">Untagged</SelectItem>
                        {tagDefinitions.map(tag => (
                          <SelectItem key={tag.tag} value={tag.tag || `tag-${tag.id}`}>
                            {tag.tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={unit.tag ? "secondary" : "outline"}>
                      {unit.tag || "Untagged"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === unit.id ? (
                    <Input
                      type="number"
                      value={editData.bedrooms || ""}
                      onChange={(e) => setEditData({ ...editData, bedrooms: parseInt(e.target.value) })}
                      className="w-16"
                    />
                  ) : (
                    unit.bedrooms || "-"
                  )}
                </TableCell>
                <TableCell>
                  {editingId === unit.id ? (
                    <Input
                      type="number"
                      step="0.5"
                      value={editData.bathrooms || ""}
                      onChange={(e) => setEditData({ ...editData, bathrooms: e.target.value })}
                      className="w-16"
                    />
                  ) : (
                    unit.bathrooms || "-"
                  )}
                </TableCell>
                <TableCell>
                  {editingId === unit.id ? (
                    <Input
                      type="number"
                      value={editData.squareFootage || ""}
                      onChange={(e) => setEditData({ ...editData, squareFootage: parseInt(e.target.value) })}
                      className="w-20"
                    />
                  ) : (
                    unit.squareFootage || "-"
                  )}
                </TableCell>
                <TableCell>
                  {editingId === unit.id ? (
                    <Input
                      type="number"
                      value={editData.currentRent || ""}
                      onChange={(e) => setEditData({ ...editData, currentRent: e.target.value })}
                      className="w-24"
                    />
                  ) : (
                    unit.currentRent ? `$${unit.currentRent}` : "-"
                  )}
                </TableCell>
                <TableCell>
                  {editingId === unit.id ? (
                    <Select
                      value={editData.status || "occupied"}
                      onValueChange={(value) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="notice_given">Notice Given</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={
                      unit.status === "vacant" ? "destructive" :
                      unit.status === "notice_given" ? "outline" :
                      "default"
                    }>
                      {unit.status || "occupied"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === unit.id ? (
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={saveEdit}
                        data-testid={`button-save-unit-${unit.unitNumber}`}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
                        data-testid={`button-cancel-unit-${unit.unitNumber}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(unit)}
                        data-testid={`button-edit-unit-${unit.unitNumber}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete Unit ${unit.unitNumber}?`)) {
                            deleteUnitMutation.mutate(unit.id!);
                          }
                        }}
                        data-testid={`button-delete-unit-${unit.unitNumber}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedUnits.length)} of {sortedUnits.length} units
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}