import { useState, useMemo, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Search,
  Home,
  Bed,
  Tag,
} from "lucide-react";
import { PropertyUnit, TagDefinition } from "@shared/schema";
import UnitEditDialog from "./unit-edit-dialog";

interface HierarchicalData {
  hierarchy: {
    [bedroom: string]: {
      [tag: string]: PropertyUnit[];
    };
  };
  summary: {
    totalUnits: number;
    uniqueTags: number;
    bedroomTypes: number;
  };
}

interface UnitHierarchyViewProps {
  data: HierarchicalData;
  tagDefinitions: TagDefinition[];
  onRefresh: () => void;
}

// Types for flattened list items
type FlattenedItemType = 'bedroom' | 'tag' | 'unit';

interface FlattenedItem {
  type: FlattenedItemType;
  id: string;
  level: number;
  bedroom?: string;
  tag?: string;
  unit?: PropertyUnit;
  unitCount?: number;
  isExpanded?: boolean;
}

export default function UnitHierarchyView({ data, tagDefinitions, onRefresh }: UnitHierarchyViewProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [expandedBedrooms, setExpandedBedrooms] = useState<Set<string>>(new Set());
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [editingUnit, setEditingUnit] = useState<PropertyUnit | null>(null);
  
  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter hierarchy based on search term
  const filteredHierarchy = useMemo(() => {
    if (!searchTerm) return data.hierarchy;

    const filtered: typeof data.hierarchy = {};
    Object.entries(data.hierarchy).forEach(([bedroom, tags]) => {
      const filteredTags: typeof tags = {};
      Object.entries(tags).forEach(([tag, units]) => {
        const filteredUnits = units.filter(unit => 
          unit.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.currentRent?.toString().includes(searchTerm)
        );
        if (filteredUnits.length > 0) {
          filteredTags[tag] = filteredUnits;
        }
      });
      if (Object.keys(filteredTags).length > 0) {
        filtered[bedroom] = filteredTags;
      }
    });
    return filtered;
  }, [data.hierarchy, searchTerm]);

  // Create flattened list for virtualization
  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];
    
    Object.entries(filteredHierarchy).forEach(([bedroom, tags]) => {
      const bedroomKey = bedroom;
      const totalUnitsInBedroom = Object.values(tags).reduce((sum, units) => sum + units.length, 0);
      
      // Add bedroom item
      items.push({
        type: 'bedroom',
        id: bedroomKey,
        level: 0,
        bedroom,
        unitCount: totalUnitsInBedroom,
        isExpanded: expandedBedrooms.has(bedroomKey)
      });
      
      // Only add children if bedroom is expanded
      if (expandedBedrooms.has(bedroomKey)) {
        Object.entries(tags).forEach(([tag, units]) => {
          const tagKey = `${bedroomKey}-${tag}`;
          
          // Add tag item
          items.push({
            type: 'tag',
            id: tagKey,
            level: 1,
            bedroom,
            tag,
            unitCount: units.length,
            isExpanded: expandedTags.has(tagKey)
          });
          
          // Only add units if tag is expanded
          if (expandedTags.has(tagKey)) {
            units.forEach((unit) => {
              items.push({
                type: 'unit',
                id: unit.id!,
                level: 2,
                bedroom,
                tag,
                unit
              });
            });
          }
        });
      }
    });
    
    return items;
  }, [filteredHierarchy, expandedBedrooms, expandedTags]);

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback((index: number) => {
      const item = flattenedItems[index];
      if (!item) return 50;
      
      switch (item.type) {
        case 'bedroom': return 56; // Height for bedroom row
        case 'tag': return 52; // Height for tag row
        case 'unit': return 72; // Height for unit card
        default: return 50;
      }
    }, [flattenedItems]),
    overscan: 10, // Render 10 items outside viewport for smoother scrolling
  });

  // Delete unit mutation
  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      return apiRequest(`/api/units/${unitId}`, {
        method: "DELETE"
      });
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
    mutationFn: async (updates: { unitIds: string[], tag: string }) => {
      return apiRequest("/api/units/bulk", {
        method: "PUT",
        body: JSON.stringify({
          units: updates.unitIds.map(id => ({ id, tag: updates.tag }))
        })
      });
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

  const handleSelectAll = (bedroom: string, tag: string) => {
    const newSelected = new Set(selectedUnits);
    const units = filteredHierarchy[bedroom]?.[tag] || [];
    units.forEach(unit => {
      if (unit.id) newSelected.add(unit.id);
    });
    setSelectedUnits(newSelected);
  };

  const handleDeselectAll = (bedroom: string, tag: string) => {
    const newSelected = new Set(selectedUnits);
    const units = filteredHierarchy[bedroom]?.[tag] || [];
    units.forEach(unit => {
      if (unit.id) newSelected.delete(unit.id);
    });
    setSelectedUnits(newSelected);
  };

  const toggleUnit = (unitId: string) => {
    const newSelected = new Set(selectedUnits);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnits(newSelected);
  };

  const toggleBedroom = (bedroom: string) => {
    const newExpanded = new Set(expandedBedrooms);
    if (newExpanded.has(bedroom)) {
      newExpanded.delete(bedroom);
      // Also collapse all tags under this bedroom
      const tagKeysToRemove = Array.from(expandedTags).filter(key => key.startsWith(`${bedroom}-`));
      const newExpandedTags = new Set(expandedTags);
      tagKeysToRemove.forEach(key => newExpandedTags.delete(key));
      setExpandedTags(newExpandedTags);
    } else {
      newExpanded.add(bedroom);
    }
    setExpandedBedrooms(newExpanded);
  };

  const toggleTag = (key: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTags(newExpanded);
  };

  const expandAll = () => {
    const allBedrooms = new Set(Object.keys(filteredHierarchy));
    const allTags = new Set<string>();
    Object.entries(filteredHierarchy).forEach(([bedroom, tags]) => {
      Object.keys(tags).forEach(tag => {
        allTags.add(`${bedroom}-${tag}`);
      });
    });
    setExpandedBedrooms(allBedrooms);
    setExpandedTags(allTags);
  };

  const collapseAll = () => {
    setExpandedBedrooms(new Set());
    setExpandedTags(new Set());
  };

  const getBedroomLabel = (bedroom: string) => {
    const num = parseInt(bedroom);
    if (num === 0) return "Studio";
    if (num === 1) return "1 Bedroom";
    return `${num} Bedrooms`;
  };

  // Render a single virtual row
  const renderVirtualRow = (item: FlattenedItem) => {
    switch (item.type) {
      case 'bedroom':
        return (
          <div 
            className="flex items-center justify-between p-3 hover:bg-accent rounded-lg cursor-pointer border-b"
            onClick={() => toggleBedroom(item.bedroom!)}
            data-testid={`accordion-bedroom-${item.bedroom}`}
          >
            <div className="flex items-center gap-3">
              {expandedBedrooms.has(item.bedroom!) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Bed className="h-4 w-4" />
              <span className="font-semibold">{getBedroomLabel(item.bedroom!)}</span>
            </div>
            <Badge variant="outline">{item.unitCount} units</Badge>
          </div>
        );
        
      case 'tag':
        return (
          <div 
            className="flex items-center justify-between p-2 ml-8 hover:bg-accent rounded-lg cursor-pointer"
            onClick={() => toggleTag(item.id)}
            data-testid={`accordion-tag-${item.tag}`}
          >
            <div className="flex items-center gap-3">
              {expandedTags.has(item.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Tag className="h-4 w-4" />
              <span className="font-medium">{item.tag || "Untagged"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{item.unitCount} units</Badge>
              {expandedTags.has(item.id) && (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll(item.bedroom!, item.tag!)}
                    data-testid={`button-select-all-${item.tag}`}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeselectAll(item.bedroom!, item.tag!)}
                    data-testid={`button-deselect-all-${item.tag}`}
                  >
                    Deselect All
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'unit':
        const unit = item.unit!;
        return (
          <div className="ml-16 mr-2">
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedUnits.has(unit.id!)}
                    onCheckedChange={() => toggleUnit(unit.id!)}
                    data-testid={`checkbox-unit-${unit.unitNumber}`}
                  />
                  <div>
                    <div className="font-medium">
                      Unit {unit.unitNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {unit.bedrooms} BR | {unit.bathrooms} BA | 
                      {unit.squareFootage ? ` ${unit.squareFootage} sqft | ` : " "}
                      ${unit.currentRent}/mo
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingUnit(unit)}
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
              </div>
            </Card>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search units by number, TAG, or rent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-units"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronDown className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronRight className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex gap-4 text-sm">
        <Badge variant="secondary">
          <Home className="h-3 w-3 mr-1" />
          {data.summary.totalUnits} Units
        </Badge>
        <Badge variant="secondary">
          <Bed className="h-3 w-3 mr-1" />
          {data.summary.bedroomTypes} Bedroom Types
        </Badge>
        <Badge variant="secondary">
          <Tag className="h-3 w-3 mr-1" />
          {data.summary.uniqueTags} TAGs
        </Badge>
        {selectedUnits.size > 0 && (
          <Badge variant="default">
            {selectedUnits.size} Selected
          </Badge>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedUnits.size > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Bulk Actions:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newTag = prompt("Enter TAG for selected units:");
                  if (newTag) {
                    bulkUpdateMutation.mutate({
                      unitIds: Array.from(selectedUnits),
                      tag: newTag
                    });
                  }
                }}
                data-testid="button-bulk-assign-tag"
              >
                Assign TAG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUnits(new Set())}
                data-testid="button-clear-selection"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Virtualized Hierarchical Display */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto border rounded-lg bg-background"
        style={{ height: 'calc(100vh - 350px)', minHeight: '400px' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = flattenedItems[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderVirtualRow(item)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Dialog */}
      {editingUnit && (
        <UnitEditDialog
          unit={editingUnit}
          propertyProfileId={editingUnit.propertyProfileId!}
          tagDefinitions={tagDefinitions}
          onSave={() => {
            setEditingUnit(null);
            onRefresh();
          }}
          onClose={() => setEditingUnit(null)}
        />
      )}
    </div>
  );
}