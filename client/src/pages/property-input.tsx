import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import PropertyCheckboxCard from "@/components/property-checkbox-card";
import { ScrapingProgressModal } from "@/components/scraping-progress-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertCircle, Database, Play, Building2, Plus, Lock, ShieldAlert, Target, Users, CheckSquare, Square, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { 
  InsertPropertyProfile, 
  PropertyProfile, 
  InsertAnalysisSession,
  AnalysisSession 
} from "@shared/schema";
import { getPropertyProfileInvalidationKeys, PROPERTY_PROFILE_QUERY_KEYS } from "@shared/query-keys";

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Property selection state
  const [propertySelection, setPropertySelection] = useState<PropertySelectionState>({
    selectedPropertyIds: [],
    subjectCount: 0,
    competitorCount: 0,
    totalCount: 0
  });
  
  // Scraping status tracking
  const [scrapingStatuses, setScrapingStatuses] = useState<Record<string, ScrapingStatus>>({});
  
  // Modal state for scraping progress
  const [showScrapingModal, setShowScrapingModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Fetch subject properties
  const { data: subjectProperties = [], isLoading: isLoadingSubjects } = useQuery<PropertyProfile[]>({
    queryKey: PROPERTY_PROFILE_QUERY_KEYS.byType('subject'),
  });

  // Fetch competitor properties
  const { data: competitorProperties = [], isLoading: isLoadingCompetitors } = useQuery<PropertyProfile[]>({
    queryKey: PROPERTY_PROFILE_QUERY_KEYS.byType('competitor'),
  });

  const isLoading = isLoadingSubjects || isLoadingCompetitors;

  // Calculate selection counts
  const selectedSubjects = subjectProperties.filter(p => propertySelection.selectedPropertyIds.includes(p.id)).length;
  const selectedCompetitors = competitorProperties.filter(p => propertySelection.selectedPropertyIds.includes(p.id)).length;
  
  const counts = {
    subjects: selectedSubjects,
    competitors: selectedCompetitors,
    total: selectedSubjects + selectedCompetitors
  };
  
  // Update selection counts in state when they change
  useEffect(() => {
    setPropertySelection(prev => ({
      ...prev,
      subjectCount: selectedSubjects,
      competitorCount: selectedCompetitors,
      totalCount: selectedSubjects + selectedCompetitors
    }));
  }, [selectedSubjects, selectedCompetitors]);

  // Handle 401 authentication errors
  const handleAuthError = (error: any, actionName: string) => {
    if (error.message && error.message.includes('401')) {
      // Store the current path to redirect back after login
      sessionStorage.setItem('auth_redirect_path', window.location.pathname + window.location.search);
      
      toast({
        title: "Authentication Required",
        description: `You need to sign in to ${actionName}. Redirecting to login...`,
        variant: "default",
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 2000);
      
      return true;
    }
    return false;
  };

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
      
      // Handle 401 authentication errors
      if (handleAuthError(error, "start property data scraping")) {
        return;
      }
      
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

      // Trigger scraping for all properties in the session
      const scrapingRes = await apiRequest("POST", `/api/analysis-sessions/${session.id}/scrape`, {});
      const scrapingData = await scrapingRes.json();
      
      console.log("[SESSION_SCRAPING] Scraping initiated:", scrapingData);

      return session;
    },
    onSuccess: (session) => {
      // Store session ID for modal
      setCurrentSessionId(session.id);
      
      // Show the scraping progress modal
      setShowScrapingModal(true);

      toast({
        title: "Analysis Session Created",
        description: `Starting data collection for ${propertySelection.subjectCount} subject and ${propertySelection.competitorCount} competitor properties...`,
      });
    },
    onError: (error) => {
      console.error("Error creating analysis session:", error);
      
      // Handle 401 authentication errors
      if (handleAuthError(error, "create analysis sessions")) {
        return;
      }
      
      toast({
        title: "Analysis Session Failed",
        description: "Failed to create analysis session with selected properties. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle property selection changes
  const handlePropertySelectionChange = useCallback((propertyId: string, selected: boolean) => {
    setPropertySelection(prev => {
      const newSelectedIds = selected 
        ? [...prev.selectedPropertyIds, propertyId]
        : prev.selectedPropertyIds.filter(id => id !== propertyId);
      
      return {
        ...prev,
        selectedPropertyIds: newSelectedIds
      };
    });
  }, []);

  // Select/deselect all properties of a type
  const handleSelectAllType = useCallback((type: 'subject' | 'competitor', selectAll: boolean) => {
    const properties = type === 'subject' ? subjectProperties : competitorProperties;
    
    properties.forEach(property => {
      const isCurrentlySelected = propertySelection.selectedPropertyIds.includes(property.id);
      if (selectAll && !isCurrentlySelected) {
        handlePropertySelectionChange(property.id, true);
      } else if (!selectAll && isCurrentlySelected) {
        handlePropertySelectionChange(property.id, false);
      }
    });
  }, [subjectProperties, competitorProperties, propertySelection.selectedPropertyIds, handlePropertySelectionChange]);

  // Check if all properties of a type are selected
  const areAllSelected = useCallback((type: 'subject' | 'competitor'): boolean => {
    const properties = type === 'subject' ? subjectProperties : competitorProperties;
    return properties.length > 0 && properties.every(p => propertySelection.selectedPropertyIds.includes(p.id));
  }, [subjectProperties, competitorProperties, propertySelection.selectedPropertyIds]);

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
      {/* Guest Mode Banner */}
      {!authLoading && !isAuthenticated && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950" data-testid="guest-mode-banner">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <ShieldAlert className="text-blue-600 mt-1 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  🎯 Trial Mode - Create Your First Analysis
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  You're browsing as a guest! You can view existing property data and explore basic features, 
                  but creating properties and saving analysis requires an account.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Free account • Portfolio management • Data persistence
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Analysis Setup</h1>
          <p className="text-muted-foreground">
            Select properties to include in your comprehensive market analysis
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Add Property Button */}
          <Button
            variant="outline"
            onClick={() => setLocation('/property-profiles')}
            data-testid="button-add-property"
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Main Property Grid */}
      <div className="space-y-8">
        {/* Subject Properties Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Subject Properties</h2>
              <Badge variant="secondary" data-testid="badge-subject-count">
                {subjectProperties.length} available
              </Badge>
              {counts.subjects > 0 && (
                <Badge variant="outline" className="text-xs" data-testid="badge-subject-selected">
                  {counts.subjects} selected
                </Badge>
              )}
            </div>
            
            {subjectProperties.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllType('subject', true)}
                  disabled={areAllSelected('subject')}
                  data-testid="button-select-all-subjects"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllType('subject', false)}
                  disabled={counts.subjects === 0}
                  data-testid="button-deselect-all-subjects"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          {isLoadingSubjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : subjectProperties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Subject Properties Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first subject property to start analyzing your portfolio
                </p>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/property-profiles')}
                  data-testid="button-add-first-subject"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject Property
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectProperties.map((property) => (
                <PropertyCheckboxCard
                  key={property.id}
                  property={property}
                  isSelected={propertySelection.selectedPropertyIds.includes(property.id)}
                  onSelectionChange={handlePropertySelectionChange}
                  showDistance={false}
                  data-testid={`subject-property-${property.id}`}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Competitor Properties Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold">Competitor Properties</h2>
              <Badge variant="secondary" data-testid="badge-competitor-count">
                {competitorProperties.length} available
              </Badge>
              {counts.competitors > 0 && (
                <Badge variant="outline" className="text-xs" data-testid="badge-competitor-selected">
                  {counts.competitors} selected
                </Badge>
              )}
            </div>
            
            {competitorProperties.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllType('competitor', true)}
                  disabled={areAllSelected('competitor')}
                  data-testid="button-select-all-competitors"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllType('competitor', false)}
                  disabled={counts.competitors === 0}
                  data-testid="button-deselect-all-competitors"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          {isLoadingCompetitors ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : competitorProperties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Competitor Properties Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add competitor properties to compare against your portfolio
                </p>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/property-profiles')}
                  data-testid="button-add-first-competitor"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor Property
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitorProperties.map((property) => (
                <PropertyCheckboxCard
                  key={property.id}
                  property={property}
                  isSelected={propertySelection.selectedPropertyIds.includes(property.id)}
                  onSelectionChange={handlePropertySelectionChange}
                  showDistance={false}
                  data-testid={`competitor-property-${property.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Centered Analysis Action Area */}
      {propertySelection.totalCount > 0 && (
        <div className="flex justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="px-4 py-2 text-lg" data-testid="badge-total-selected">
                <CheckCircle className="h-4 w-4 mr-2" />
                {propertySelection.totalCount} Properties Selected
              </Badge>
            </div>
            <div className="text-center text-sm text-muted-foreground mb-2">
              {propertySelection.subjectCount} {propertySelection.subjectCount === 1 ? 'subject' : 'subjects'} • {propertySelection.competitorCount} {propertySelection.competitorCount === 1 ? 'competitor' : 'competitors'}
            </div>
            <Button
              size="lg"
              onClick={handleStartAnalysis}
              disabled={createAnalysisSessionMutation.isPending}
              data-testid="button-start-analysis"
              className={`${!createAnalysisSessionMutation.isPending ? 'animate-glow' : ''}`}
            >
              <Play className="h-5 w-5 mr-2" />
              {createAnalysisSessionMutation.isPending ? "Starting Analysis..." : "Analyze Selected Properties"}
            </Button>
          </div>
        </div>
      )}

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
                <li><strong>Add Properties:</strong> Click "Add Property" to create subject and competitor profiles</li>
                <li><strong>Select for Analysis:</strong> Use the checkboxes to select properties for comparison</li>
                <li><strong>Auto-Scraping:</strong> Properties with URLs are automatically scraped for unit data</li>
                <li><strong>Start Analysis:</strong> Click "Analyze Selected Properties" when ready</li>
                <li><strong>Review Results:</strong> Explore competitive positioning and pricing insights</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Scraping Progress Modal */}
      <ScrapingProgressModal
        isOpen={showScrapingModal}
        sessionId={currentSessionId || ''}
        onComplete={() => {
          setShowScrapingModal(false);
          setLocation(`/session/summarize/${currentSessionId}`);
        }}
        onClose={() => setShowScrapingModal(false)}
      />
    </div>
  );
}