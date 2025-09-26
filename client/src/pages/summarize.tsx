import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, XCircle, Download, TrendingUp, TrendingDown, AlertCircle, BarChart3, Building2, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CompetitorSelection from "@/components/competitor-selection";
import RentComparisonChart from "@/components/rent-comparison-chart";
import UnitListingsTable from "@/components/unit-listings-table";
import { useWorkflowState } from "@/hooks/use-workflow-state";
import type { Property, PropertyAnalysis, ScrapedProperty, AnalysisSession, PropertyProfile, ScrapedUnit } from "@shared/schema";

interface PropertyWithAnalysis {
  property: Property;
  analysis: PropertyAnalysis;
}

interface ScrapingResult {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  isSubjectProperty: boolean;
  scrapingJobId?: string;
  unitsFound: number;
  units: any[];
  error?: string;
}

interface Unit {
  unitNumber: string;
  unitType: string;
  bedrooms: number;
  bathrooms: string;
  squareFootage: number;
  rent: string;
  availabilityDate: string;
  status: string;
}

interface VacancyData {
  subjectProperty: {
    id: string;
    name: string;
    vacancyRate: number;
    unitTypes: UnitTypeData[];
    units?: Unit[];
  };
  competitors: {
    id: string;
    name: string;
    vacancyRate: number;
    unitTypes: UnitTypeData[];
    units?: Unit[];
  }[];
  marketInsights: {
    subjectVsMarket: string;
    strongestUnitType: string;
    totalVacancies: number;
    competitorAvgVacancies: number;
  };
}

// Interface for canonical scraped units API response
interface CanonicalScrapedUnitsResponse {
  propertyId: string;
  propertyName: string;
  propertyUrl: string;
  propertyAddress: string;
  scrapedPropertyId: string;
  units: ScrapedUnit[];
}

// New interface for session-based vacancy data
interface SessionVacancyData {
  sessionId: string;
  sessionName: string;
  subjectProperties: {
    id: string;
    name: string;
    address: string;
    totalUnits: number;
    availableUnits: number;
    vacancyRate: number;
    units: Unit[];
  }[];
  competitors: {
    id: string;
    name: string;
    address: string;
    totalUnits: number;
    availableUnits: number;
    vacancyRate: number;
    units: Unit[];
  }[];
  portfolioMetrics: {
    portfolioVsMarket: string;
    totalPortfolioUnits: number;
    totalVacantUnits: number;
    portfolioVacancyRate: number;
    competitorAvgVacancy: number;
    performingProperties: number;
    underperformingProperties: number;
  };
}

interface UnitTypeData {
  type: string;
  totalUnits: number;
  availableUnits: number;
  vacancyRate: number;
  avgRent: number;
  avgSqFt: number;
  rentRange: { min: number; max: number };
}

// Helper types for bedroom organization
interface BedroomTypeMetrics {
  type: string;
  displayKey: string;
  units: ScrapedUnit[];
  totalUnits: number;
  availableUnits: number;
  vacancyRate: number;
  avgRent: number;
  avgSqFt: number;
  pricePerSqFt: number;
}

interface PropertyUnitsOrganized {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  isSubjectProperty: boolean;
  bedroomTypes: BedroomTypeMetrics[];
  totalUnits: number;
  availableUnits: number;
  vacancyRate: number;
}

// Helper functions for bedroom organization
const getBedroomDisplayKey = (bedrooms: number | null | undefined): string => {
  if (bedrooms === null || bedrooms === undefined) return 'unknown';
  if (bedrooms === 0) return 'studio';
  if (bedrooms === 1) return 'oneBed';
  if (bedrooms === 2) return 'twoBed';
  if (bedrooms === 3) return 'threeBed';
  if (bedrooms >= 4) return 'fourPlusBed';
  return 'unknown';
};

const getBedroomDisplayLabel = (bedrooms: number | null | undefined): string => {
  if (bedrooms === null || bedrooms === undefined) return 'Unknown';
  if (bedrooms === 0) return 'Studio';
  if (bedrooms === 1) return '1BR';
  if (bedrooms === 2) return '2BR';
  if (bedrooms === 3) return '3BR';
  if (bedrooms >= 4) return '4+BR';
  return 'Unknown';
};

const calculateBedroomMetrics = (units: ScrapedUnit[]): BedroomTypeMetrics[] => {
  // Group units by bedroom count
  const bedroomGroups = units.reduce((acc, unit) => {
    const key = getBedroomDisplayKey(unit.bedrooms);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(unit);
    return acc;
  }, {} as Record<string, ScrapedUnit[]>);

  // Calculate metrics for each bedroom type
  return Object.entries(bedroomGroups).map(([key, groupUnits]) => {
    const availableUnits = groupUnits.filter(unit => unit.status === 'available');
    const totalUnits = groupUnits.length;
    const vacancyRate = totalUnits > 0 ? (availableUnits.length / totalUnits) * 100 : 0;
    
    // Calculate average rent (only for units with rent data)
    const unitsWithRent = groupUnits.filter(unit => unit.rent && Number(unit.rent) > 0);
    const avgRent = unitsWithRent.length > 0 
      ? unitsWithRent.reduce((sum, unit) => sum + Number(unit.rent), 0) / unitsWithRent.length 
      : 0;
    
    // Calculate average square footage (only for units with sqft data)
    const unitsWithSqFt = groupUnits.filter(unit => unit.squareFootage && Number(unit.squareFootage) > 0);
    const avgSqFt = unitsWithSqFt.length > 0 
      ? unitsWithSqFt.reduce((sum, unit) => sum + Number(unit.squareFootage), 0) / unitsWithSqFt.length 
      : 0;
    
    // Calculate price per square foot
    const pricePerSqFt = avgRent > 0 && avgSqFt > 0 ? avgRent / avgSqFt : 0;
    
    const firstUnit = groupUnits[0];
    const displayLabel = getBedroomDisplayLabel(firstUnit?.bedrooms);
    
    return {
      type: displayLabel,
      displayKey: key,
      units: groupUnits,
      totalUnits,
      availableUnits: availableUnits.length,
      vacancyRate,
      avgRent,
      avgSqFt,
      pricePerSqFt
    };
  }).sort((a, b) => {
    // Sort by bedroom count (studio, 1BR, 2BR, etc.)
    const order = ['studio', 'oneBed', 'twoBed', 'threeBed', 'fourPlusBed', 'unknown'];
    return order.indexOf(a.displayKey) - order.indexOf(b.displayKey);
  });
};

const organizeUnitsByProperty = (scrapedUnitsData: CanonicalScrapedUnitsResponse[], sessionData?: AnalysisSession & { propertyProfiles: PropertyProfile[] }): PropertyUnitsOrganized[] => {
  return scrapedUnitsData.map(propertyData => {
    const bedroomTypes = calculateBedroomMetrics(propertyData.units);
    const totalUnits = propertyData.units.length;
    const availableUnits = propertyData.units.filter(unit => unit.status === 'available').length;
    const vacancyRate = totalUnits > 0 ? (availableUnits / totalUnits) * 100 : 0;
    
    // Check if this is a subject property
    const isSubjectProperty = sessionData?.propertyProfiles
      ?.find(profile => profile.id === propertyData.propertyId)?.profileType === 'subject' || false;
    
    return {
      propertyId: propertyData.propertyId,
      propertyName: propertyData.propertyName,
      propertyAddress: propertyData.propertyAddress,
      isSubjectProperty,
      bedroomTypes,
      totalUnits,
      availableUnits,
      vacancyRate
    };
  });
};

// Helper function to organize legacy vacancy data for hierarchical display
const organizeLegacyUnitsByProperty = (vacancyData: VacancyData): PropertyUnitsOrganized[] => {
  const properties: PropertyUnitsOrganized[] = [];
  
  // Add subject property
  if (vacancyData.subjectProperty.units) {
    const subjectUnits = vacancyData.subjectProperty.units.map(unit => ({
      id: `legacy-${unit.unitNumber}-${unit.unitType}`,
      unitNumber: unit.unitNumber,
      floorPlanName: null,
      unitType: unit.unitType,
      bedrooms: parseInt(unit.unitType.match(/(\d+)BR/)?.[1] || '0') || (unit.unitType.toLowerCase().includes('studio') ? 0 : null),
      bathrooms: unit.bathrooms, // Keep as string
      squareFootage: unit.squareFootage,
      rent: unit.rent, // Keep as string
      availabilityDate: unit.availabilityDate,
      status: unit.status,
      propertyId: vacancyData.subjectProperty.id,
      createdAt: new Date()
    } as ScrapedUnit));
    
    const bedroomTypes = calculateBedroomMetrics(subjectUnits);
    const totalUnits = subjectUnits.length;
    const availableUnits = subjectUnits.filter(unit => unit.status === 'available').length;
    const vacancyRate = totalUnits > 0 ? (availableUnits / totalUnits) * 100 : 0;
    
    properties.push({
      propertyId: vacancyData.subjectProperty.id,
      propertyName: vacancyData.subjectProperty.name,
      propertyAddress: 'Subject Property', // Legacy data doesn't have address
      isSubjectProperty: true,
      bedroomTypes,
      totalUnits,
      availableUnits,
      vacancyRate
    });
  }
  
  // Add competitor properties
  vacancyData.competitors.forEach(competitor => {
    if (competitor.units) {
      const competitorUnits = competitor.units.map(unit => ({
        id: `legacy-${competitor.id}-${unit.unitNumber}-${unit.unitType}`,
        unitNumber: unit.unitNumber,
        floorPlanName: null,
        unitType: unit.unitType,
        bedrooms: parseInt(unit.unitType.match(/(\d+)BR/)?.[1] || '0') || (unit.unitType.toLowerCase().includes('studio') ? 0 : null),
        bathrooms: unit.bathrooms, // Keep as string
        squareFootage: unit.squareFootage,
        rent: unit.rent, // Keep as string
        availabilityDate: unit.availabilityDate,
        status: unit.status,
        propertyId: competitor.id,
        createdAt: new Date()
      } as ScrapedUnit));
      
      const bedroomTypes = calculateBedroomMetrics(competitorUnits);
      const totalUnits = competitorUnits.length;
      const availableUnits = competitorUnits.filter(unit => unit.status === 'available').length;
      const vacancyRate = totalUnits > 0 ? (availableUnits / totalUnits) * 100 : 0;
      
      properties.push({
        propertyId: competitor.id,
        propertyName: competitor.name,
        propertyAddress: 'Competitor Property', // Legacy data doesn't have address
        isSubjectProperty: false,
        bedroomTypes,
        totalUnits,
        availableUnits,
        vacancyRate
      });
    }
  });
  
  return properties;
};

// Component for rendering bedroom tabs with unit counts
const BedroomTabsView = ({ propertyData }: { propertyData: PropertyUnitsOrganized }) => {
  if (!propertyData.bedroomTypes.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No unit data available for this property
      </div>
    );
  }

  return (
    <Tabs defaultValue={propertyData.bedroomTypes[0]?.displayKey} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${propertyData.bedroomTypes.length}, 1fr)` }}>
        {propertyData.bedroomTypes.map((bedroomType) => (
          <TabsTrigger 
            key={bedroomType.displayKey} 
            value={bedroomType.displayKey}
            data-testid={`tab-${bedroomType.displayKey}-${propertyData.propertyId}`}
          >
            {bedroomType.type} ({bedroomType.totalUnits})
          </TabsTrigger>
        ))}
      </TabsList>
      
      {propertyData.bedroomTypes.map((bedroomType) => (
        <TabsContent key={bedroomType.displayKey} value={bedroomType.displayKey} className="mt-4">
          <div className="space-y-4">
            {/* Bedroom Type Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Avg Rent</div>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  ${bedroomType.avgRent > 0 ? Math.round(bedroomType.avgRent).toLocaleString() : 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm font-medium text-green-700 dark:text-green-300">Avg Sq Ft</div>
                <div className="text-lg font-bold text-green-900 dark:text-green-100">
                  {bedroomType.avgSqFt > 0 ? Math.round(bedroomType.avgSqFt).toLocaleString() : 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Vacancy Rate</div>
                <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  {bedroomType.vacancyRate.toFixed(1)}%
                </div>
              </div>
              
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-700 dark:text-purple-300">$/Sq Ft</div>
                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  ${bedroomType.pricePerSqFt > 0 ? bedroomType.pricePerSqFt.toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Units Table */}
            <BedroomUnitsTable bedroomType={bedroomType} propertyId={propertyData.propertyId} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};

// Component for rendering units table within each bedroom tab
const BedroomUnitsTable = ({ bedroomType, propertyId }: { bedroomType: BedroomTypeMetrics; propertyId: string }) => {
  if (!bedroomType.units.length) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No units available for this bedroom type
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-testid={`table-header-unit-${propertyId}`}>Unit</TableHead>
            <TableHead data-testid={`table-header-rent-${propertyId}`}>Rent</TableHead>
            <TableHead data-testid={`table-header-sqft-${propertyId}`}>Sq Ft</TableHead>
            <TableHead data-testid={`table-header-price-per-sqft-${propertyId}`}>$/Sq Ft</TableHead>
            <TableHead data-testid={`table-header-available-${propertyId}`}>Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bedroomType.units.map((unit, index) => {
            const rent = Number(unit.rent) || 0;
            const sqft = Number(unit.squareFootage) || 0;
            const pricePerSqFt = rent > 0 && sqft > 0 ? rent / sqft : 0;
            const isAvailable = unit.status === 'available';
            
            return (
              <TableRow 
                key={unit.id || index} 
                data-testid={`unit-row-${unit.id || index}-${propertyId}`}
                className={isAvailable ? "" : "opacity-60"}
              >
                <TableCell className="font-medium">
                  <div>
                    <div>{unit.unitNumber || unit.floorPlanName || `Unit ${index + 1}`}</div>
                    {unit.floorPlanName && unit.unitNumber && (
                      <div className="text-xs text-muted-foreground">{unit.floorPlanName}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {rent > 0 ? `$${rent.toLocaleString()}` : 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{sqft > 0 ? `${sqft.toLocaleString()} sq ft` : 'N/A'}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {pricePerSqFt > 0 ? `$${pricePerSqFt.toFixed(2)}` : 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={isAvailable ? "default" : "secondary"}
                    className={isAvailable ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                  >
                    {isAvailable ? 'Available' : 'Occupied'}
                  </Badge>
                  {unit.availabilityDate && isAvailable && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {unit.availabilityDate}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default function Summarize({ params }: { params: { id?: string; sessionId?: string } }) {
  const [, setLocation] = useLocation();
  const [selectedCompetitors, setSelectedCompetitors] = useState<ScrapedProperty[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [scrapingStage, setScrapingStage] = useState<'none' | 'scraping' | 'completed' | 'error'>('none');
  const [scrapingResults, setScrapingResults] = useState<ScrapingResult[]>([]);
  const [showVacancyChart, setShowVacancyChart] = useState(false);
  const [isSessionMode, setIsSessionMode] = useState(false);
  const { toast } = useToast();
  
  // Determine the current mode and ID
  const currentId = params.sessionId || params.id || '';
  const isSessionModeDetected = !!params.sessionId;
  const { state: workflowState, saveState: saveWorkflowState, loadState: loadWorkflowState } = useWorkflowState(currentId, isSessionModeDetected);
  
  // Detect session mode based on URL pattern
  useEffect(() => {
    const isSession = window.location.pathname.includes('/session/summarize/');
    setIsSessionMode(isSession);
    console.log('[SUMMARIZE] Mode detected:', isSession ? 'Session-based multi-property' : 'Legacy single-property');
  }, []);

  // Legacy single-property query
  const propertyQuery = useQuery<PropertyWithAnalysis>({
    queryKey: ['/api/properties', params.id],
    enabled: !isSessionMode && !!params.id,
  });

  // Session-based query for multi-property analysis
  const sessionQuery = useQuery<AnalysisSession & { propertyProfiles: PropertyProfile[] }>({
    queryKey: ['/api/analysis-sessions', params.sessionId],
    enabled: isSessionMode && !!params.sessionId,
  });

  const competitorsQuery = useQuery<ScrapedProperty[]>({
    queryKey: ['/api/competitors'],
    enabled: !isSessionMode, // Only for legacy mode
  });

  // Load workflow state on mount and restore selections
  useEffect(() => {
    const initializeState = async () => {
      const loadedState = await loadWorkflowState();
      if (loadedState && loadedState.selectedCompetitorIds && competitorsQuery.data) {
        const selected = competitorsQuery.data.filter(comp => 
          loadedState.selectedCompetitorIds?.includes(comp.id)
        );
        if (selected.length > 0) {
          setSelectedCompetitors(selected);
          setShowChart(true);
          // Check if scraping was completed
          if (loadedState.stage === 'summarize-completed') {
            setScrapingStage('completed');
            setShowVacancyChart(true);
          }
        }
      }
    };

    if (competitorsQuery.data) {
      initializeState();
    }
  }, [competitorsQuery.data, params.id]);

  // Legacy vacancy data query - triggered after scraping completes
  const vacancyQuery = useQuery<VacancyData>({
    queryKey: ['/api/vacancy/summary', params.id, selectedCompetitors.map(c => c.id)],
    queryFn: async () => {
      const competitorIds = selectedCompetitors.map(c => c.id);
      const searchParams = new URLSearchParams({
        propertyId: params.id!,
        ...competitorIds.reduce((acc, id, index) => {
          acc[`competitorIds[${index}]`] = id;
          return acc;
        }, {} as Record<string, string>)
      });
      const response = await apiRequest('GET', `/api/vacancy/summary?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vacancy data');
      }
      return await response.json();
    },
    enabled: !isSessionMode && scrapingStage === 'completed' && selectedCompetitors.length > 0,
    retry: 3,
    retryDelay: 2000,
  });

  // NEW: Canonical scraped units query for session mode - this replaces legacy competitor data
  const scrapedUnitsQuery = useQuery<CanonicalScrapedUnitsResponse[]>({
    queryKey: ['/api/analysis-sessions', params.sessionId, 'scraped-units'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/analysis-sessions/${params.sessionId}/scraped-units`);
      if (!response.ok) {
        throw new Error('Failed to fetch scraped units data');
      }
      return await response.json();
    },
    enabled: isSessionMode && !!params.sessionId,
    retry: 3,
    retryDelay: 2000,
  });

  // Session-based vacancy data query for multi-property portfolio analysis
  const sessionVacancyQuery = useQuery<SessionVacancyData>({
    queryKey: ['/api/analysis-sessions', params.sessionId, 'vacancy-summary'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/analysis-sessions/${params.sessionId}/vacancy-summary`);
      if (!response.ok) {
        throw new Error('Failed to fetch session vacancy data');
      }
      return await response.json();
    },
    enabled: isSessionMode && !!params.sessionId,
    retry: 3,
    retryDelay: 2000,
  });

  const scrapingMutation = useMutation({
    mutationFn: async (competitorIds: string[]) => {
      const response = await apiRequest('POST', '/api/competitors/scrape-units', { competitorIds });
      return await response.json();
    },
    onSuccess: (data) => {
      setScrapingResults(data.results || []);
      setScrapingStage('completed');
      // Invalidate and refetch vacancy data
      queryClient.invalidateQueries({ queryKey: ['/api/vacancy/summary'] });
      toast({
        title: "Unit Scraping Completed",
        description: `Successfully scraped ${data.totalUnitsFound} units from ${data.processedProperties} properties.`
      });
    },
    onError: (error) => {
      setScrapingStage('error');
      console.error('Scraping error:', error);
      toast({
        title: "Scraping Failed",
        description: "Failed to scrape unit data. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Session-based scraping mutation for multi-property analysis
  const sessionScrapingMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/analysis-sessions/${sessionId}/scrape`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('[SESSION_SCRAPING] Session scraping initiated successfully:', data);
      setScrapingStage('scraping');
      toast({
        title: "Session Scraping Started",
        description: `Initiated scraping for ${data.totalPropertiesToScrape} properties in session "${data.sessionName}".`
      });
      // Start polling for completion
      setTimeout(() => checkSessionScrapingProgress(), 5000);
    },
    onError: (error) => {
      setScrapingStage('error');
      console.error('Session scraping error:', error);
      toast({
        title: "Session Scraping Failed",
        description: "Failed to start session scraping. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Function to check session scraping progress
  const checkSessionScrapingProgress = async () => {
    if (!params.sessionId) return;
    
    try {
      // Check if vacancy data is available (indicates scraping completion)
      const response = await queryClient.fetchQuery({
        queryKey: ['/api/analysis-sessions', params.sessionId, 'vacancy-summary'],
        queryFn: async () => {
          const res = await apiRequest('GET', `/api/analysis-sessions/${params.sessionId}/vacancy-summary`);
          if (!res.ok) {
            throw new Error('Not ready yet');
          }
          return await res.json();
        }
      });
      
      if (response) {
        setScrapingStage('completed');
        setShowVacancyChart(true);
        queryClient.invalidateQueries({ queryKey: ['/api/analysis-sessions', params.sessionId, 'vacancy-summary'] });
        toast({
          title: "Session Scraping Completed",
          description: `All properties in the session have been successfully scraped.`
        });
      }
    } catch (error) {
      // Still processing, check again in 10 seconds
      setTimeout(() => checkSessionScrapingProgress(), 10000);
    }
  };

  // Automatic session scraping trigger when page loads in session mode
  useEffect(() => {
    const triggerSessionScraping = async () => {
      if (isSessionMode && params.sessionId && sessionQuery.data && scrapingStage === 'none') {
        console.log('[SESSION_SCRAPING] Auto-triggering scraping for session:', params.sessionId);
        
        // Check if there are properties with URLs to scrape
        const propertiesToScrape = sessionQuery.data.propertyProfiles?.filter(profile => profile.url);
        
        if (propertiesToScrape && propertiesToScrape.length > 0) {
          console.log('[SESSION_SCRAPING] Found', propertiesToScrape.length, 'properties to scrape');
          await sessionScrapingMutation.mutateAsync(params.sessionId);
        } else {
          console.log('[SESSION_SCRAPING] No properties with URLs found, skipping scraping');
          setScrapingStage('completed');
          setShowVacancyChart(true);
        }
      }
    };

    // Only trigger if we have session data and haven't started scraping yet
    if (isSessionMode && sessionQuery.data && scrapingStage === 'none') {
      triggerSessionScraping();
    }
  }, [isSessionMode, sessionQuery.data, scrapingStage, params.sessionId]);

  const handleCompetitorSelection = async (selectedIds: string[]) => {
    if (competitorsQuery.data) {
      const selected = competitorsQuery.data.filter(comp => selectedIds.includes(comp.id));
      setSelectedCompetitors(selected);
      setShowChart(true);
      
      // Save workflow state with selected competitors
      await saveWorkflowState({
        stage: 'summarize-in-progress',
        selectedCompetitorIds: selectedIds
      });
      
      // Start unit scraping workflow
      setScrapingStage('scraping');
      try {
        await scrapingMutation.mutateAsync(selectedIds);
        // Save completed state after successful scraping
        await saveWorkflowState({
          stage: 'summarize-completed',
          selectedCompetitorIds: selectedIds
        });
      } catch (error) {
        console.error('Failed to start scraping:', error);
      }
    }
  };

  const handleContinueToAnalyze = async () => {
    // Save workflow state before navigating
    if (isSessionMode) {
      console.log('[SUMMARIZE] Navigation params.sessionId:', params.sessionId);
      console.log('[SUMMARIZE] Navigation currentId:', currentId);
      
      await saveWorkflowState({
        stage: 'analyze',
        analysisSessionId: params.sessionId || currentId
      });
      
      // Use currentId as fallback if params.sessionId is undefined
      const sessionIdToUse = params.sessionId || currentId;
      console.log('[SUMMARIZE] Navigating to:', `/session/analyze/${sessionIdToUse}`);
      setLocation(`/session/analyze/${sessionIdToUse}`);
    } else {
      await saveWorkflowState({
        stage: 'analyze',
        selectedCompetitorIds: selectedCompetitors.map(c => c.id)
      });
      setLocation(`/analyze/${params.id}`);
    }
  };

  const handleBackToCompetitors = async () => {
    // Update workflow state but don't clear data
    await saveWorkflowState({
      stage: 'summarize',
      selectedCompetitorIds: [] // Still save empty to indicate going back
    });
    setShowChart(false);
    setShowVacancyChart(false);
    setScrapingStage('none');
    setSelectedCompetitors([]);
    setScrapingResults([]);
  };

  const handleExportData = () => {
    if (vacancyQuery.data) {
      const data = vacancyQuery.data;
      const csvContent = generateCSVReport(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rent-comparison-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: "Rent comparison data has been downloaded as CSV."
      });
    }
  };

  const generateCSVReport = (data: VacancyData): string => {
    const headers = ['Property', 'Unit Type', 'Total Units', 'Available Units', 'Vacancy Rate %', 'Avg Rent', 'Avg Sq Ft', 'Min Rent', 'Max Rent'];
    const rows = [headers];
    
    // Add subject property data
    data.subjectProperty.unitTypes.forEach(unit => {
      rows.push([
        `${data.subjectProperty.name} (Subject)`,
        unit.type,
        unit.totalUnits.toString(),
        unit.availableUnits.toString(),
        unit.vacancyRate.toFixed(1),
        Math.round(unit.avgRent).toString(),
        Math.round(unit.avgSqFt).toString(),
        Math.round(unit.rentRange.min).toString(),
        Math.round(unit.rentRange.max).toString()
      ]);
    });
    
    // Add competitor data
    data.competitors.forEach(competitor => {
      competitor.unitTypes.forEach(unit => {
        rows.push([
          competitor.name,
          unit.type,
          unit.totalUnits.toString(),
          unit.availableUnits.toString(),
          unit.vacancyRate.toFixed(1),
          Math.round(unit.avgRent).toString(),
          Math.round(unit.avgSqFt).toString(),
          Math.round(unit.rentRange.min).toString(),
          Math.round(unit.rentRange.max).toString()
        ]);
      });
    });
    
    return rows.map(row => row.join(',')).join('\n');
  };

  // Effect to show vacancy chart when data is ready
  useEffect(() => {
    if (scrapingStage === 'completed' && vacancyQuery.data && !vacancyQuery.isLoading) {
      setShowVacancyChart(true);
    }
  }, [scrapingStage, vacancyQuery.data, vacancyQuery.isLoading]);

  // Loading state for both modes
  const isLoading = isSessionMode 
    ? (sessionQuery.isLoading || scrapedUnitsQuery.isLoading)
    : (propertyQuery.isLoading || competitorsQuery.isLoading);
    
  const hasError = isSessionMode 
    ? (sessionQuery.error || scrapedUnitsQuery.error)
    : (propertyQuery.error || competitorsQuery.error);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="text-muted-foreground">
          {isSessionMode ? 'Loading session data...' : 'Loading property data...'}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center py-8" data-testid="error-state">
        <div className="text-red-600 mb-4">
          {isSessionMode ? 'Failed to load session data' : 'Failed to load property data'}
        </div>
        <Button onClick={() => window.location.reload()} data-testid="button-retry">
          Retry
        </Button>
      </div>
    );
  }

  const competitors = competitorsQuery.data || [];
  
  // Get data based on current mode
  const sessionData = sessionQuery.data;
  const subjectProperties = sessionData?.propertyProfiles?.filter(p => p.profileType === 'subject') || [];
  const competitorProfiles = sessionData?.propertyProfiles?.filter(p => p.profileType === 'competitor') || [];

  return (
    <div className="space-y-6" data-testid="summarize-page">
      {/* Header with mode indicator */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isSessionMode ? (
              <>
                <Building2 className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">{sessionData?.name || 'Portfolio Analysis'}</h1>
                  <p className="text-muted-foreground">
                    Multi-property portfolio analysis • {subjectProperties.length} subject properties
                  </p>
                  {sessionData?.description && (
                    <p className="text-sm text-muted-foreground mt-1">{sessionData.description}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Home className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Property Analysis Summary</h1>
                  <p className="text-muted-foreground">Single property competitive analysis</p>
                </div>
              </>
            )}
          </div>
          <Badge variant={isSessionMode ? "default" : "secondary"}>
            {isSessionMode ? 'Portfolio Mode' : 'Single Property'}
          </Badge>
        </div>
      </div>

      {/* Session-based portfolio view */}
      {isSessionMode ? (
        <div className="space-y-6">
          {/* Portfolio Properties Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span>Portfolio Properties</span>
              </CardTitle>
              <CardDescription>
                {subjectProperties.length} subject properties and {competitorProfiles.length} competitors selected for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject Properties */}
                <div>
                  <h4 className="font-medium mb-3 text-primary">Subject Properties ({subjectProperties.length})</h4>
                  <div className="space-y-2">
                    {subjectProperties.map((property) => {
                      // Find scraped data for this property
                      const scrapedData = scrapedUnitsQuery.data?.find(data => data.propertyId === property.id);
                      const actualUnitCount = scrapedData?.units.length;
                      const availableUnits = scrapedData?.units.filter(unit => unit.status === 'available').length;
                      
                      return (
                        <div key={property.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="font-medium text-blue-900 dark:text-blue-100">{property.name}</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">{property.address}</div>
                          {actualUnitCount !== undefined ? (
                            <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                              {actualUnitCount} scraped units {availableUnits !== undefined && `• ${availableUnits} available`}
                            </div>
                          ) : property.totalUnits ? (
                            <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                              {property.totalUnits} units (estimated)
                            </div>
                          ) : scrapedUnitsQuery.isLoading ? (
                            <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                              Loading unit data...
                            </div>
                          ) : (
                            <div className="text-xs text-red-500 dark:text-red-500 mt-1">
                              No unit data available
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Competitor Properties */}
                <div>
                  <h4 className="font-medium mb-3 text-muted-foreground">Competitor Properties ({competitorProfiles.length})</h4>
                  <div className="space-y-2">
                    {competitorProfiles.map((property) => {
                      // Find scraped data for this property
                      const scrapedData = scrapedUnitsQuery.data?.find(data => data.propertyId === property.id);
                      const actualUnitCount = scrapedData?.units.length;
                      const availableUnits = scrapedData?.units.filter(unit => unit.status === 'available').length;
                      
                      return (
                        <div key={property.id} className="p-3 bg-muted rounded-lg">
                          <div className="font-medium">{property.name}</div>
                          <div className="text-sm text-muted-foreground">{property.address}</div>
                          {actualUnitCount !== undefined ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              {actualUnitCount} scraped units {availableUnits !== undefined && `• ${availableUnits} available`}
                            </div>
                          ) : property.totalUnits ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              {property.totalUnits} units (estimated)
                            </div>
                          ) : scrapedUnitsQuery.isLoading ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              Loading unit data...
                            </div>
                          ) : (
                            <div className="text-xs text-red-500 mt-1">
                              No unit data available
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organized Units Display - NEW HIERARCHICAL VIEW */}
          {scrapedUnitsQuery.data && scrapedUnitsQuery.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>Property Unit Analysis</span>
                </CardTitle>
                <CardDescription>
                  Detailed unit breakdown by bedroom type for each property
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {organizeUnitsByProperty(scrapedUnitsQuery.data, sessionData).map((propertyData) => (
                    <div key={propertyData.propertyId} className="space-y-4">
                      {/* Property Header */}
                      <div className={`p-4 rounded-lg border ${
                        propertyData.isSubjectProperty 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-muted border-border'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className={`text-lg font-semibold ${
                                propertyData.isSubjectProperty 
                                  ? 'text-blue-900 dark:text-blue-100'
                                  : 'text-foreground'
                              }`}>
                                {propertyData.propertyName}
                              </h4>
                              {propertyData.isSubjectProperty && (
                                <Badge variant="default" className="bg-blue-600">
                                  Subject Property
                                </Badge>
                              )}
                            </div>
                            <div className={`text-sm ${
                              propertyData.isSubjectProperty 
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-muted-foreground'
                            }`}>
                              {propertyData.propertyAddress}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{propertyData.totalUnits} Total Units</div>
                            <div className="text-sm text-muted-foreground">
                              {propertyData.availableUnits} available • {propertyData.vacancyRate.toFixed(1)}% vacancy
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bedroom Tabs */}
                      <BedroomTabsView propertyData={propertyData} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Scraping Progress Section */}
          <div className="bg-card rounded-lg border border-border p-6" data-testid="session-scraping-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Portfolio Data Collection</h3>
              {scrapingStage === 'scraping' && (
                <div className="flex items-center text-blue-600" data-testid="session-scraping-indicator">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="text-sm">Scraping portfolio properties...</span>
                </div>
              )}
              {scrapingStage === 'completed' && (
                <div className="flex items-center text-green-600" data-testid="session-scraping-completed">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Portfolio collection completed</span>
                </div>
              )}
              {scrapingStage === 'error' && (
                <div className="flex items-center text-red-600" data-testid="session-scraping-error">
                  <XCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Collection failed</span>
                </div>
              )}
            </div>

            {scrapingStage === 'scraping' && (
              <div className="space-y-3" data-testid="session-scraping-progress">
                <p className="text-sm text-muted-foreground">
                  Collecting detailed unit information from all properties in the session. This may take several minutes...
                </p>
                <div className="space-y-2">
                  {/* Subject Properties Progress */}
                  {subjectProperties.filter(p => p.url).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Subject Properties</h4>
                      {subjectProperties.filter(p => p.url).map((property) => (
                        <div key={property.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md mb-2">
                          <div className="flex items-center">
                            <Loader2 className="h-3 w-3 mr-2 animate-spin text-blue-500" />
                            <div>
                              <div className="text-sm font-medium">{property.name}</div>
                              <div className="text-xs text-muted-foreground">Collecting unit data...</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Competitor Properties Progress */}
                  {competitorProfiles.filter(p => p.url).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Competitor Properties</h4>
                      {competitorProfiles.filter(p => p.url).map((property) => (
                        <div key={property.id} className="flex items-center p-3 bg-muted rounded-md mb-1">
                          <Loader2 className="h-3 w-3 mr-2 animate-spin text-blue-500" />
                          <span className="text-sm">{property.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {scrapingStage === 'error' && (
              <div className="text-center py-4" data-testid="session-scraping-error-message">
                <p className="text-sm text-muted-foreground mb-3">
                  Failed to collect portfolio data. Please try again or proceed with available data.
                </p>
                <Button
                  onClick={() => sessionScrapingMutation.mutate(params.sessionId!)}
                  variant="outline"
                  size="sm"
                  data-testid="button-retry-session-scraping"
                  disabled={sessionScrapingMutation.isPending}
                >
                  {sessionScrapingMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Retry Collection'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* NEW: Scraped Units Display - Session Mode */}
          {isSessionMode && scrapedUnitsQuery.isError && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>Failed to Load Scraped Units</span>
                </CardTitle>
                <CardDescription>
                  Unable to retrieve scraped unit data from the canonical endpoint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Error: {scrapedUnitsQuery.error?.message || 'Unknown error occurred'}
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => scrapedUnitsQuery.refetch()}
                    variant="outline"
                    size="sm"
                  >
                    Retry Loading
                  </Button>
                  <Button
                    onClick={handleContinueToAnalyze}
                    variant="default"
                    size="sm"
                  >
                    Continue Anyway
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isSessionMode && scrapedUnitsQuery.isLoading && !scrapedUnitsQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading Scraped Unit Data</span>
                </CardTitle>
                <CardDescription>
                  Retrieving detailed unit information from the canonical data source...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isSessionMode && scrapedUnitsQuery.data && scrapedUnitsQuery.data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Home className="h-5 w-5 text-primary" />
                      <span>Scraped Unit Data</span>
                    </CardTitle>
                    <CardDescription>
                      All scraped unit information from properties in this session - this is the data that will be used for analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                <div className="space-y-6">
                  {scrapedUnitsQuery.data.map((propertyData) => {
                    const totalUnits = propertyData.units.length;
                    const availableUnits = propertyData.units.filter(unit => unit.status === 'available').length;
                    const vacancyRate = totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0;
                    
                    // Group units by type for summary
                    const unitsByType = propertyData.units.reduce((acc, unit) => {
                      const type = unit.unitType || 'Unknown';
                      if (!acc[type]) {
                        acc[type] = { total: 0, available: 0, avgRent: 0, rentSum: 0, avgSqFt: 0, sqFtSum: 0, count: 0 };
                      }
                      acc[type].total++;
                      if (unit.status === 'available') {
                        acc[type].available++;
                      }
                      // Handle rent calculation
                      if (unit.rent) {
                        const rentValue = typeof unit.rent === 'string' 
                          ? parseFloat(unit.rent.replace(/[$,]/g, '')) 
                          : typeof unit.rent === 'number' 
                            ? unit.rent 
                            : parseFloat(String(unit.rent));
                        if (!isNaN(rentValue)) {
                          acc[type].rentSum += rentValue;
                          acc[type].count++;
                        }
                      }
                      // Handle square footage
                      if (unit.squareFootage) {
                        const sqFtValue = typeof unit.squareFootage === 'string' 
                          ? parseFloat(unit.squareFootage) 
                          : typeof unit.squareFootage === 'number'
                            ? unit.squareFootage
                            : parseFloat(String(unit.squareFootage));
                        if (!isNaN(sqFtValue)) {
                          acc[type].sqFtSum += sqFtValue;
                        }
                      }
                      return acc;
                    }, {} as Record<string, { total: number; available: number; avgRent: number; rentSum: number; avgSqFt: number; sqFtSum: number; count: number; }>);

                    // Calculate averages
                    Object.keys(unitsByType).forEach(type => {
                      const data = unitsByType[type];
                      data.avgRent = data.count > 0 ? Math.round(data.rentSum / data.count) : 0;
                      data.avgSqFt = data.total > 0 ? Math.round(data.sqFtSum / data.total) : 0;
                    });

                    return (
                      <div key={propertyData.propertyId} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-lg">{propertyData.propertyName}</h4>
                            <p className="text-sm text-muted-foreground">{propertyData.propertyAddress}</p>
                            {propertyData.propertyUrl && (
                              <a 
                                href={propertyData.propertyUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                View Property ↗
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{totalUnits}</div>
                            <div className="text-sm text-muted-foreground">Total Units</div>
                            <div className="text-sm">
                              <span className="text-green-600">{availableUnits} available</span>
                              <span className="text-muted-foreground"> • </span>
                              <span className="text-blue-600">{vacancyRate}% vacant</span>
                            </div>
                          </div>
                        </div>

                        {/* Unit Type Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                          {Object.entries(unitsByType).map(([type, data]) => (
                            <div key={type} className="p-3 bg-muted rounded-md">
                              <div className="font-medium text-sm">{type}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {data.total} units • {data.available} available
                              </div>
                              {data.avgRent > 0 && (
                                <div className="text-xs text-green-600 mt-1">
                                  Avg: ${data.avgRent.toLocaleString()}/mo
                                </div>
                              )}
                              {data.avgSqFt > 0 && (
                                <div className="text-xs text-blue-600">
                                  {data.avgSqFt} sq ft avg
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Sample units display */}
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Sample Units (showing first 5):</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {propertyData.units.slice(0, 5).map((unit, index) => {
                              const rentDisplay = unit.rent 
                                ? (typeof unit.rent === 'string' 
                                   ? unit.rent 
                                   : `$${parseFloat(String(unit.rent)).toLocaleString()}`)
                                : 'N/A';
                              
                              return (
                                <div key={unit.id || index} className="text-xs p-2 bg-background rounded border">
                                  <span className="font-medium">{unit.unitNumber || unit.unitType}</span>
                                  <span className="text-muted-foreground"> • </span>
                                  <span>{unit.bedrooms}BR</span>
                                  {unit.bathrooms && (
                                    <>
                                      <span className="text-muted-foreground"> • </span>
                                      <span>{unit.bathrooms}BA</span>
                                    </>
                                  )}
                                  {unit.squareFootage && (
                                    <>
                                      <span className="text-muted-foreground"> • </span>
                                      <span>{unit.squareFootage} sq ft</span>
                                    </>
                                  )}
                                  <span className="text-muted-foreground"> • </span>
                                  <span className="text-green-600">{rentDisplay}</span>
                                  <span className="text-muted-foreground"> • </span>
                                  <span className={unit.status === 'available' ? 'text-green-600' : 'text-red-600'}>
                                    {unit.status}
                                  </span>
                                </div>
                              );
                            })}
                            {propertyData.units.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                ...and {propertyData.units.length - 5} more units
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Portfolio Vacancy Analysis */}
          {sessionVacancyQuery.data && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Portfolio Vacancy Analysis</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {sessionVacancyQuery.data.subjectProperties.length} Properties • {sessionVacancyQuery.data.portfolioMetrics.totalPortfolioUnits} Total Units
                </Badge>
              </div>

              {/* Portfolio Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Portfolio Vacancy Rate */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Portfolio Vacancy</span>
                  </div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {sessionVacancyQuery.data.portfolioMetrics.portfolioVacancyRate}%
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {sessionVacancyQuery.data.portfolioMetrics.portfolioVsMarket}
                  </div>
                </div>

                {/* Total Portfolio Units */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Home className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Units</span>
                  </div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {sessionVacancyQuery.data.portfolioMetrics.totalPortfolioUnits}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {sessionVacancyQuery.data.portfolioMetrics.totalVacantUnits} vacant
                  </div>
                </div>

                {/* Market Comparison */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Market Avg</span>
                  </div>
                  <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    {sessionVacancyQuery.data.portfolioMetrics.competitorAvgVacancy}%
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    Competitor average
                  </div>
                </div>

                {/* Portfolio Performance */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Performance</span>
                  </div>
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {sessionVacancyQuery.data.portfolioMetrics.performingProperties}/{sessionVacancyQuery.data.subjectProperties.length}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    Above market avg
                  </div>
                </div>
              </div>

              {/* Individual Property Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Individual Property Performance</CardTitle>
                  <CardDescription>
                    Vacancy rates and performance metrics for each property in the portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessionVacancyQuery.data.subjectProperties.map((property) => (
                      <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{property.name}</div>
                          <div className="text-sm text-muted-foreground">{property.address}</div>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                          <div>
                            <div className="text-sm font-medium">{property.totalUnits} units</div>
                            <div className="text-xs text-muted-foreground">{property.availableUnits} vacant</div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            property.vacancyRate < sessionVacancyQuery.data.portfolioMetrics.competitorAvgVacancy
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {property.vacancyRate.toFixed(1)}% vacancy
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Portfolio Navigation */}
          <div className="flex justify-end pt-6">
            <Button onClick={handleContinueToAnalyze} data-testid="button-continue-to-analyze">
              Proceed to Portfolio Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* Legacy single-property view */
        <div className="space-y-6">
          {!showChart ? (
            <CompetitorSelection 
              competitors={competitors}
              onContinue={handleCompetitorSelection}
            />
          ) : (
            <>
              <div className="bg-card rounded-lg border border-border p-6" data-testid="competitor-summary">
            <h3 className="text-xl font-semibold mb-6">Selected Competitors</h3>
            <div className="space-y-4">
              {selectedCompetitors.map((competitor) => (
                <div key={competitor.id} className="p-4 bg-muted rounded-lg" data-testid={`selected-competitor-${competitor.id}`}>
                  <div className="font-semibold">{competitor.name}</div>
                  <div className="text-sm text-muted-foreground">{competitor.address}</div>
                  {competitor.distance && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Distance: {competitor.distance} miles
                    </div>
                  )}
                  {competitor.matchScore && (
                    <div className="text-xs text-muted-foreground">
                      Match Score: {competitor.matchScore}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Unit Scraping Progress Section */}
          <div className="bg-card rounded-lg border border-border p-6" data-testid="unit-scraping-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Unit Data Collection</h3>
              {scrapingStage === 'scraping' && (
                <div className="flex items-center text-blue-600" data-testid="scraping-indicator">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="text-sm">Scraping unit details...</span>
                </div>
              )}
              {scrapingStage === 'completed' && (
                <div className="flex items-center text-green-600" data-testid="scraping-completed">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Collection completed</span>
                </div>
              )}
              {scrapingStage === 'error' && (
                <div className="flex items-center text-red-600" data-testid="scraping-error">
                  <XCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Collection failed</span>
                </div>
              )}
            </div>

            {scrapingStage === 'scraping' && (
              <div className="space-y-3" data-testid="scraping-progress">
                <p className="text-sm text-muted-foreground">
                  Collecting detailed unit information from subject property and selected competitors. This may take a few minutes...
                </p>
                <div className="space-y-2">
                  {/* Note: During scraping, we show selected competitors. The backend will automatically include the subject property */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="flex items-center">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin text-blue-500" />
                      <div>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Subject Property</span>
                        <div className="text-sm">Collecting unit data...</div>
                      </div>
                    </div>
                  </div>
                  {selectedCompetitors.map((competitor) => (
                    <div key={competitor.id} className="flex items-center p-3 bg-muted rounded-md">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin text-blue-500" />
                      <span className="text-sm">{competitor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scrapingStage === 'completed' && scrapingResults.length > 0 && (
              <div className="space-y-3" data-testid="scraping-results">
                <p className="text-sm text-muted-foreground">
                  Successfully collected unit data from {scrapingResults.filter(r => !r.error).length} properties
                  {scrapingResults.some(r => r.isSubjectProperty) ? ' (including subject property)' : ''}.
                </p>
                
                {/* Subject Property Display */}
                {scrapingResults.filter(r => r.isSubjectProperty).map((result) => (
                  <div key={result.propertyId} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid={`subject-property-${result.propertyId}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {result.error ? (
                          <XCircle className="h-4 w-4 mr-2 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        )}
                        <div>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Subject Property</span>
                          <div className="text-sm font-semibold">{result.propertyName}</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.error ? 'Failed to collect data' : `${result.unitsFound} units found`}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Competitor Properties Display */}
                {scrapingResults.filter(r => !r.isSubjectProperty).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground mt-4">Competitor Properties</h4>
                    {scrapingResults.filter(r => !r.isSubjectProperty).map((result) => (
                      <div key={result.propertyId} className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid={`competitor-result-${result.propertyId}`}>
                        <div className="flex items-center">
                          {result.error ? (
                            <XCircle className="h-4 w-4 mr-2 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          )}
                          <span className="text-sm font-medium">{result.propertyName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.error ? 'Failed to collect data' : `${result.unitsFound} units found`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {scrapingStage === 'error' && (
              <div className="text-center py-4" data-testid="scraping-error-message">
                <p className="text-sm text-muted-foreground mb-3">
                  Failed to collect unit data. Please try again or proceed with available data.
                </p>
                <Button
                  onClick={() => scrapingMutation.mutate(selectedCompetitors.map(c => c.id))}
                  variant="outline"
                  size="sm"
                  data-testid="button-retry-scraping"
                >
                  Retry Collection
                </Button>
              </div>
            )}
          </div>

          {/* Vacancy Analysis Chart */}
          {showVacancyChart && (
            <div className="space-y-6" data-testid="vacancy-analysis-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Rent Analysis & Market Comparison</h3>
                </div>
                {vacancyQuery.data && (
                  <Badge variant="secondary" className="text-xs">
                    {vacancyQuery.data.competitors.length + 1} Properties Analyzed
                  </Badge>
                )}
              </div>

              <RentComparisonChart 
                data={vacancyQuery.data || null}
                isLoading={vacancyQuery.isLoading}
                error={vacancyQuery.error?.message}
              />

              {/* Key Market Insights */}
              {vacancyQuery.data && (
                <Card data-testid="market-insights">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span>Key Market Insights</span>
                    </CardTitle>
                    <CardDescription>
                      Market analysis based on {vacancyQuery.data.competitors.length} competitor properties
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Subject Property vs Market */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-2 mb-2">
                          {vacancyQuery.data.subjectProperty.vacancyRate < vacancyQuery.data.marketInsights.competitorAvgVacancies ? (
                            <TrendingDown className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Market Position</span>
                        </div>
                        <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                          {vacancyQuery.data.subjectProperty.vacancyRate.toFixed(1)}% Vacancy
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {vacancyQuery.data.marketInsights.subjectVsMarket}
                        </div>
                      </div>

                      {/* Strongest Unit Type */}
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">Strongest Unit</span>
                        </div>
                        <div className="text-lg font-bold text-green-900 dark:text-green-100">
                          {vacancyQuery.data.marketInsights.strongestUnitType}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Lowest vacancy rate
                        </div>
                      </div>

                      {/* Market Avg Vacancy */}
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Market Average</span>
                        </div>
                        <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                          {vacancyQuery.data.marketInsights.competitorAvgVacancies.toFixed(1)}%
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Competitor avg vacancy
                        </div>
                      </div>

                      {/* Total Market Vacancies */}
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center space-x-2 mb-2">
                          <BarChart3 className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Vacancies</span>
                        </div>
                        <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {vacancyQuery.data.marketInsights.totalVacancies}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          Across all properties
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Detailed insights text */}
                    <div className="prose max-w-none">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your property <strong>{vacancyQuery.data.subjectProperty.name}</strong> has a vacancy rate of <strong>{vacancyQuery.data.subjectProperty.vacancyRate.toFixed(1)}%</strong>, 
                        which is <strong>{vacancyQuery.data.marketInsights.subjectVsMarket.toLowerCase()}</strong>. 
                        The <strong>{vacancyQuery.data.marketInsights.strongestUnitType}</strong> unit type shows the strongest performance with the lowest vacancy rate. 
                        Consider focusing optimization efforts on underperforming unit types while leveraging the success of your strongest units.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hierarchical Unit Listings Section - Legacy Mode */}
              {vacancyQuery.data?.subjectProperty?.units && (
                <Card data-testid="legacy-unit-listings-section">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span>Property Unit Analysis</span>
                    </CardTitle>
                    <CardDescription>
                      Detailed unit breakdown by bedroom type for each property
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {organizeLegacyUnitsByProperty(vacancyQuery.data).map((propertyData) => (
                        <div key={propertyData.propertyId} className="space-y-4">
                          {/* Property Header */}
                          <div className={`p-4 rounded-lg border ${
                            propertyData.isSubjectProperty 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'bg-muted border-border'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className={`text-lg font-semibold ${
                                    propertyData.isSubjectProperty 
                                      ? 'text-blue-900 dark:text-blue-100'
                                      : 'text-foreground'
                                  }`}>
                                    {propertyData.propertyName}
                                  </h4>
                                  {propertyData.isSubjectProperty && (
                                    <Badge variant="default" className="bg-blue-600">
                                      Subject Property
                                    </Badge>
                                  )}
                                </div>
                                <div className={`text-sm ${
                                  propertyData.isSubjectProperty 
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-muted-foreground'
                                }`}>
                                  {propertyData.propertyAddress}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">{propertyData.totalUnits} Total Units</div>
                                <div className="text-sm text-muted-foreground">
                                  {propertyData.availableUnits} available • {propertyData.vacancyRate.toFixed(1)}% vacancy
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Bedroom Tabs */}
                          <BedroomTabsView propertyData={propertyData} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6" data-testid="navigation-buttons">
            <Button 
              variant="outline" 
              onClick={handleBackToCompetitors}
              data-testid="button-back-competitors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Competitors
            </Button>
            
            <div className="flex space-x-3">
              {vacancyQuery.data && (
                <Button 
                  variant="outline" 
                  onClick={handleExportData}
                  data-testid="button-export-data"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              )}
              
              <Button 
                onClick={handleContinueToAnalyze}
                disabled={scrapingStage === 'scraping'}
                data-testid="button-continue-to-analyze"
              >
                {scrapingStage === 'scraping' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Collecting Data...
                  </>
                ) : (
                  <>
                    Proceed to Analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
        </div>
      )}
    </div>
  );
}
