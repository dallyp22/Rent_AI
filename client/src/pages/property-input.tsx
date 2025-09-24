import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PropertySidebar from "@/components/property-sidebar";
import PropertyProfileForm, { PropertyProfileFormRef } from "@/components/property-profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, Database, Play, Building2, Plus } from "lucide-react";
import { Link } from "wouter";
import type { 
  InsertPropertyProfile, 
  PropertyProfile, 
  InsertAnalysisSession,
  AnalysisSession 
} from "@shared/schema";
import { getPropertyProfileInvalidationKeys } from "@shared/query-keys";

// Property selection state management interface
interface PropertySelectionState {
  selectedPropertyIds: string[];
  subjectCount: number;
  competitorCount: number;
  totalCount: number;
}

// Scraping status interface for feedback
interface ScrapingStatus {
  propertyId: string;
  propertyName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export default function PropertyInput() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Property selection state
  const [propertySelection, setPropertySelection] = useState<PropertySelectionState>({
    selectedPropertyIds: [],
    subjectCount: 0,
    competitorCount: 0,
    totalCount: 0
  });
  
  // Scraping status tracking
  const [scrapingStatuses, setScrapingStatuses] = useState<Record<string, ScrapingStatus>>({});
  
  // Form dialog state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  // Form reference for resetting
  const formRef = useRef<PropertyProfileFormRef>(null);

  // Create property profile mutation
  const createPropertyProfileMutation = useMutation({
    mutationFn: async (data: InsertPropertyProfile): Promise<PropertyProfile> => {
      const res = await apiRequest("POST", "/api/property-profiles", data);
      return res.json();
    },
    onSuccess: (newProperty) => {
      // Invalidate queries to refresh the sidebar using correct query keys
      const invalidationKeys = getPropertyProfileInvalidationKeys(newProperty.profileType as 'subject' | 'competitor');
      invalidationKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      // Auto-select the newly created property
      handlePropertySelectionChange(newProperty.id, true);
      
      // Start scraping for the new property if it has a URL
      if (newProperty.url) {
        startScrapingMutation.mutate(newProperty.id);
      }
      
      // Reset form for next property creation
      formRef.current?.resetForm();
      
      setIsFormDialogOpen(false);
      
      toast({
        title: "Property Profile Created",
        description: `${newProperty.name} has been added successfully and auto-selected.`,
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

  // Start scraping mutation
  const startScrapingMutation = useMutation({
    mutationFn: async (propertyProfileId: string): Promise<any> => {
      const res = await apiRequest("POST", `/api/property-profiles/${propertyProfileId}/scrape`, {});
      return res.json();
    },
    onSuccess: (data, propertyProfileId) => {
      setScrapingStatuses(prev => ({
        ...prev,
        [propertyProfileId]: {
          propertyId: propertyProfileId,
          propertyName: data.propertyProfile?.name || 'Unknown Property',
          status: 'processing',
          message: data.message
        }
      }));
      
      toast({
        title: "Scraping Started",
        description: data.message,
      });
    },
    onError: (error, propertyProfileId) => {
      console.error("Error starting scraping:", error);
      setScrapingStatuses(prev => ({
        ...prev,
        [propertyProfileId]: {
          propertyId: propertyProfileId,
          propertyName: 'Unknown Property',
          status: 'failed',
          message: 'Failed to start scraping'
        }
      }));
      
      toast({
        title: "Scraping Failed",
        description: "Failed to start property data scraping.",
        variant: "destructive",
      });
    }
  });

  // Create analysis session mutation with proper property role assignment
  const createAnalysisSessionMutation = useMutation({
    mutationFn: async (data: InsertAnalysisSession): Promise<AnalysisSession> => {
      // First create the analysis session
      const sessionRes = await apiRequest("POST", "/api/analysis-sessions", data);
      const session = await sessionRes.json();

      // Fetch all selected PropertyProfiles to get their profileType
      const propertyPromises = propertySelection.selectedPropertyIds.map(async (propertyId) => {
        const propRes = await apiRequest("GET", `/api/property-profiles/${propertyId}`);
        return propRes.json();
      });

      const selectedProperties: PropertyProfile[] = await Promise.all(propertyPromises);

      // Add each property to the session with the correct role based on profileType
      const addPropertiesPromises = selectedProperties.map(async (property) => {
        return apiRequest("POST", `/api/analysis-sessions/${session.id}/properties`, {
          propertyProfileId: property.id,
          role: property.profileType // Use the actual profileType ('subject' or 'competitor')
        });
      });

      await Promise.all(addPropertiesPromises);

      return session;
    },
    onSuccess: (session) => {
      // Navigate to session-based analysis
      setLocation(`/analyze/${session.id}`);

      toast({
        title: "Analysis Session Created",
        description: `Portfolio analysis started with ${propertySelection.subjectCount} subject and ${propertySelection.competitorCount} competitor properties.`,
      });
    },
    onError: (error) => {
      console.error("Error creating analysis session:", error);
      toast({
        title: "Analysis Session Failed",
        description: "Failed to create analysis session with selected properties. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle property selection changes
  const handlePropertySelectionChange = (propertyId: string, selected: boolean) => {
    setPropertySelection(prev => {
      const newSelectedIds = selected 
        ? [...prev.selectedPropertyIds, propertyId]
        : prev.selectedPropertyIds.filter(id => id !== propertyId);
      
      return {
        ...prev,
        selectedPropertyIds: newSelectedIds
      };
    });
  };

  // Handle selection counts updates from sidebar
  const handleSelectionCountsChange = (counts: { subjects: number; competitors: number; total: number }) => {
    setPropertySelection(prev => ({
      ...prev,
      subjectCount: counts.subjects,
      competitorCount: counts.competitors,
      totalCount: counts.total
    }));
  };

  // Handle form submission
  const handleFormSubmit = (data: InsertPropertyProfile) => {
    createPropertyProfileMutation.mutate(data);
  };

  // Handle analysis start with proper validation
  const handleStartAnalysis = () => {
    if (propertySelection.selectedPropertyIds.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select at least one property to start analysis.",
        variant: "destructive",
      });
      return;
    }

    if (propertySelection.subjectCount === 0) {
      toast({
        title: "No Subject Properties Selected",
        description: "Please select at least one subject property to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (propertySelection.competitorCount === 0) {
      toast({
        title: "No Competitor Properties Selected",
        description: "Please select at least one competitor property for comparison.",
        variant: "destructive",
      });
      return;
    }

    createAnalysisSessionMutation.mutate({
      name: `Portfolio Analysis - ${new Date().toLocaleDateString()}`,
      description: `Analysis session with ${propertySelection.subjectCount} subject and ${propertySelection.competitorCount} competitor properties`
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="enhanced-property-input-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Analysis Setup</h1>
          <p className="text-muted-foreground">
            Select properties and add new ones to create comprehensive market analysis
          </p>
        </div>
        
        {propertySelection.totalCount > 0 && (
          <div className="flex items-center gap-3">
            <Badge variant="default" className="px-3 py-1" data-testid="badge-total-selected">
              {propertySelection.totalCount} Selected
            </Badge>
            <Button
              onClick={handleStartAnalysis}
              disabled={createAnalysisSessionMutation.isPending}
              data-testid="button-start-analysis"
              className="shrink-0"
            >
              <Play className="h-4 w-4 mr-2" />
              {createAnalysisSessionMutation.isPending ? "Starting..." : `Analyze Selected Properties (${propertySelection.totalCount})`}
            </Button>
          </div>
        )}
      </div>

      {/* Main Layout: Sidebar + Form Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Property Selection (1/3 on desktop) */}
        <div className="lg:col-span-1">
          <PropertySidebar
            selectedPropertyIds={propertySelection.selectedPropertyIds}
            onPropertySelectionChange={handlePropertySelectionChange}
            onSelectionCountsChange={handleSelectionCountsChange}
            className="sticky top-6"
          />
        </div>

        {/* Right Panel - Quick Add Form (2/3 on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Add Property Form */}
          <Card data-testid="quick-add-form-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Property Profile
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Add a new property profile to expand your analysis. Properties are automatically selected when created.
              </p>
            </CardHeader>
            <CardContent>
              <PropertyProfileForm
                ref={formRef}
                onSubmit={handleFormSubmit}
                onCancel={() => {}} // No cancel needed in this context
                isLoading={createPropertyProfileMutation.isPending}
              />
            </CardContent>
          </Card>

          {/* Scraping Status Display */}
          {Object.keys(scrapingStatuses).length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950" data-testid="scraping-status-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Database className="h-5 w-5" />
                  Property Data Scraping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.values(scrapingStatuses).map((status) => (
                  <div
                    key={status.propertyId}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-800"
                    data-testid={`scraping-status-${status.propertyId}`}
                  >
                    {status.status === 'processing' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    {status.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {status.status === 'failed' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    
                    <div className="flex-1">
                      <p className="font-medium text-sm">{status.propertyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {status.message || `Status: ${status.status}`}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Start Guide */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800" data-testid="quick-start-guide">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Building2 className="text-blue-600 mt-1 h-6 w-6 shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to Get Started:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li><strong>Add Properties:</strong> Use the form to add subject and competitor properties</li>
                    <li><strong>Select for Analysis:</strong> Check properties in the sidebar to include them</li>
                    <li><strong>Auto-Scraping:</strong> Properties with URLs are automatically scraped for data</li>
                    <li><strong>Start Analysis:</strong> Click "Start Analysis" when you have properties selected</li>
                    <li><strong>Review Results:</strong> Analyze competitive positioning and pricing insights</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}