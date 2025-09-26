import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Info, BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for the component
interface CompetitiveRelationship {
  id: string;
  portfolioId: string;
  propertyAId: string;
  propertyBId: string;
  relationshipType: "direct_competitor" | "indirect_competitor" | "market_leader" | "market_follower";
  isActive: boolean;
  createdAt: string;
}

interface PropertyProfile {
  id: string;
  name: string;
  address: string;
  url: string;
  role: "subject" | "competitor";
  unitMix?: Record<string, number>;
}

interface CompetitiveSetMatrixProps {
  portfolioId: string;
  onAnalyzeClick?: (activeRelationships: CompetitiveRelationship[]) => void;
}

export function CompetitiveSetMatrix({ portfolioId, onAnalyzeClick }: CompetitiveSetMatrixProps) {
  const [competitorMode, setCompetitorMode] = useState<"external" | "internal">("external");
  const { toast } = useToast();

  // Fetch property profiles for the portfolio
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/portfolios", portfolioId, "properties"],
    enabled: !!portfolioId,
  });

  // Fetch existing competitive relationships
  const { data: relationships = [], isLoading: isLoadingRelationships } = useQuery<CompetitiveRelationship[]>({
    queryKey: ["/api/portfolios", portfolioId, "competitive-relationships"],
    enabled: !!portfolioId,
  });

  // Filter properties based on mode
  const { subjectProperties, competitorProperties } = useMemo(() => {
    const subjects = properties.filter((p) => p.role === "subject");
    const competitors = properties.filter((p) => p.role === "competitor");
    
    if (competitorMode === "internal") {
      // Internal competition: subjects compete with other subjects
      return {
        subjectProperties: subjects,
        competitorProperties: subjects,
      };
    } else {
      // External competition: subjects compete with competitors
      return {
        subjectProperties: subjects,
        competitorProperties: competitors,
      };
    }
  }, [properties, competitorMode]);

  // Create a map of existing relationships for quick lookup
  const relationshipMap = useMemo(() => {
    const map = new Map<string, CompetitiveRelationship>();
    relationships.forEach((rel) => {
      // Create bidirectional mapping
      map.set(`${rel.propertyAId}-${rel.propertyBId}`, rel);
      map.set(`${rel.propertyBId}-${rel.propertyAId}`, rel);
    });
    return map;
  }, [relationships]);

  // Get relationship between two properties
  const getRelationship = (propertyAId: string, propertyBId: string) => {
    return relationshipMap.get(`${propertyAId}-${propertyBId}`);
  };

  // Create/update relationship mutation
  const createRelationshipMutation = useMutation({
    mutationFn: async ({ propertyAId, propertyBId, relationshipType = "direct_competitor" }: { 
      propertyAId: string; 
      propertyBId: string; 
      relationshipType?: string;
    }) => {
      const response = await apiRequest("POST", `/api/portfolios/${portfolioId}/competitive-relationships`, {
        propertyAId,
        propertyBId,
        relationshipType,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", portfolioId, "competitive-relationships"] });
      toast({ title: "Relationship created", description: "Competitive relationship has been established." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create competitive relationship.",
        variant: "destructive",
      });
      console.error("Error creating relationship:", error);
    },
  });

  // Toggle relationship mutation
  const toggleRelationshipMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      const response = await apiRequest("POST", `/api/portfolios/${portfolioId}/competitive-relationships/${relationshipId}/toggle`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", portfolioId, "competitive-relationships"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to toggle competitive relationship.",
        variant: "destructive",
      });
      console.error("Error toggling relationship:", error);
    },
  });

  // Handle cell click to toggle relationship
  const handleCellClick = async (propertyAId: string, propertyBId: string) => {
    // Don't allow self-relationships
    if (propertyAId === propertyBId) return;

    const existingRelationship = getRelationship(propertyAId, propertyBId);

    if (existingRelationship) {
      // Toggle existing relationship
      toggleRelationshipMutation.mutate(existingRelationship.id);
    } else {
      // Create new relationship
      createRelationshipMutation.mutate({ propertyAId, propertyBId });
    }
  };

  // Get active relationships for analysis
  const activeRelationships = useMemo(() => {
    return relationships.filter((rel) => rel.isActive);
  }, [relationships]);

  // Handle analyze button click
  const handleAnalyzeClick = () => {
    if (onAnalyzeClick) {
      onAnalyzeClick(activeRelationships);
    } else {
      toast({
        title: "Analysis Started",
        description: `Starting analysis with ${activeRelationships.length} competitive relationships.`,
      });
    }
  };

  const isLoading = isLoadingProperties || isLoadingRelationships;

  if (isLoading) {
    return (
      <Card data-testid="competitive-matrix-loading">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="competitive-set-matrix">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Competitive Set Matrix
        </CardTitle>
        
        {/* Mode Toggle */}
        <div className="flex items-center gap-4" data-testid="competitor-mode-toggle">
          <label className="text-sm font-medium">Competition Type:</label>
          <ToggleGroup
            type="single"
            value={competitorMode}
            onValueChange={(value) => value && setCompetitorMode(value as "external" | "internal")}
          >
            <ToggleGroupItem value="external" data-testid="toggle-external">
              External Competitors
            </ToggleGroupItem>
            <ToggleGroupItem value="internal" data-testid="toggle-internal">
              Internal Competition
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Explanatory Alert */}
        <Alert data-testid="competitor-explanation">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {competitorMode === "external" 
              ? "External competition shows how your subject properties compete with external competitor properties in the market."
              : "Internal competition shows how your subject properties compete with each other within your portfolio."
            }
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent>
        {subjectProperties.length === 0 || competitorProperties.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-properties-message">
            <p>
              {competitorMode === "external" 
                ? "No subject or competitor properties found in this portfolio."
                : "Need at least 2 subject properties for internal competition analysis."
              }
            </p>
          </div>
        ) : (
          <>
            {/* Matrix Table */}
            <div className="relative overflow-auto border rounded-lg" data-testid="competitive-matrix-table">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-background border-r min-w-[200px]">
                      Subject Properties
                    </TableHead>
                    {competitorProperties.map((competitor: PropertyProfile) => (
                      <TableHead 
                        key={competitor.id} 
                        className="text-center min-w-[120px] rotate-45 h-24"
                        data-testid={`competitor-header-${competitor.id}`}
                      >
                        <div className="transform origin-bottom-left whitespace-nowrap text-xs">
                          {competitor.name}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectProperties.map((subject: PropertyProfile) => (
                    <TableRow key={subject.id} data-testid={`subject-row-${subject.id}`}>
                      <TableCell className="sticky left-0 z-10 bg-background border-r font-medium">
                        <div>
                          <div className="font-semibold text-sm" data-testid={`subject-name-${subject.id}`}>
                            {subject.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {subject.address}
                          </div>
                        </div>
                      </TableCell>
                      {competitorProperties.map((competitor: PropertyProfile) => {
                        const relationship = getRelationship(subject.id, competitor.id);
                        const isActive = relationship?.isActive;
                        const isSelfComparison = subject.id === competitor.id;
                        
                        return (
                          <TableCell 
                            key={competitor.id} 
                            className="text-center p-2"
                            data-testid={`matrix-cell-${subject.id}-${competitor.id}`}
                          >
                            {isSelfComparison ? (
                              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">—</span>
                              </div>
                            ) : (
                              <Button
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "w-8 h-8 p-0 transition-colors",
                                  isActive ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-muted"
                                )}
                                onClick={() => handleCellClick(subject.id, competitor.id)}
                                disabled={createRelationshipMutation.isPending || toggleRelationshipMutation.isPending}
                                data-testid={`relationship-toggle-${subject.id}-${competitor.id}`}
                              >
                                {(createRelationshipMutation.isPending || toggleRelationshipMutation.isPending) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isActive ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <span className="text-xs">+</span>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary and Action Section */}
            <div className="mt-6 flex items-center justify-between" data-testid="matrix-summary">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" data-testid="active-relationships-count">
                  {activeRelationships.length} Active Relationships
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Click cells to toggle competitive relationships
                </div>
              </div>
              
              <Button
                onClick={handleAnalyzeClick}
                disabled={activeRelationships.length === 0}
                className="gap-2"
                data-testid="analyze-competitive-set-button"
              >
                <BarChart3 className="h-4 w-4" />
                Analyze with Competitive Set
              </Button>
            </div>

            {/* Legend */}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg" data-testid="matrix-legend">
              <div className="text-sm font-medium mb-2">Legend:</div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <X className="h-3 w-3 text-white" />
                  </div>
                  <span>Active competitive relationship</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border border-border rounded flex items-center justify-center">
                    <span className="text-xs">+</span>
                  </div>
                  <span>Click to create relationship</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                    <span className="text-xs">—</span>
                  </div>
                  <span>Same property (not applicable)</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CompetitiveSetMatrix;