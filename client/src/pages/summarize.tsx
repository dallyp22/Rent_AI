import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, XCircle, Download, TrendingUp, TrendingDown, AlertCircle, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CompetitorSelection from "@/components/competitor-selection";
import RentComparisonChart from "@/components/rent-comparison-chart";
import type { Property, PropertyAnalysis, ScrapedProperty } from "@shared/schema";

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

interface VacancyData {
  subjectProperty: {
    id: string;
    name: string;
    vacancyRate: number;
    unitTypes: UnitTypeData[];
  };
  competitors: {
    id: string;
    name: string;
    vacancyRate: number;
    unitTypes: UnitTypeData[];
  }[];
  marketInsights: {
    subjectVsMarket: string;
    strongestUnitType: string;
    totalVacancies: number;
    competitorAvgVacancies: number;
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

export default function Summarize({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const [selectedCompetitors, setSelectedCompetitors] = useState<ScrapedProperty[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [scrapingStage, setScrapingStage] = useState<'none' | 'scraping' | 'completed' | 'error'>('none');
  const [scrapingResults, setScrapingResults] = useState<ScrapingResult[]>([]);
  const [showVacancyChart, setShowVacancyChart] = useState(false);
  const { toast } = useToast();

  const propertyQuery = useQuery<PropertyWithAnalysis>({
    queryKey: ['/api/properties', params.id],
  });

  const competitorsQuery = useQuery<ScrapedProperty[]>({
    queryKey: ['/api/competitors'],
  });

  // Vacancy data query - triggered after scraping completes
  const vacancyQuery = useQuery<VacancyData>({
    queryKey: ['/api/vacancy/summary', params.id, selectedCompetitors.map(c => c.id)],
    queryFn: async () => {
      const competitorIds = selectedCompetitors.map(c => c.id);
      const searchParams = new URLSearchParams({
        propertyId: params.id,
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
    enabled: scrapingStage === 'completed' && selectedCompetitors.length > 0,
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

  const handleCompetitorSelection = async (selectedIds: string[]) => {
    if (competitorsQuery.data) {
      const selected = competitorsQuery.data.filter(comp => selectedIds.includes(comp.id));
      setSelectedCompetitors(selected);
      setShowChart(true);
      
      // Start unit scraping workflow
      setScrapingStage('scraping');
      try {
        await scrapingMutation.mutateAsync(selectedIds);
      } catch (error) {
        console.error('Failed to start scraping:', error);
      }
    }
  };

  const handleContinueToAnalyze = () => {
    setLocation(`/analyze/${params.id}`);
  };

  const handleBackToCompetitors = () => {
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

  if (propertyQuery.isLoading || competitorsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="text-muted-foreground">Loading property data...</div>
      </div>
    );
  }

  if (propertyQuery.error || competitorsQuery.error) {
    return (
      <div className="text-center py-8" data-testid="error-state">
        <div className="text-red-600 mb-4">Failed to load property data</div>
        <Button onClick={() => window.location.reload()} data-testid="button-retry">
          Retry
        </Button>
      </div>
    );
  }

  const competitors = competitorsQuery.data || [];

  return (
    <div className="space-y-6" data-testid="summarize-page">
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
                data-testid="button-proceed-analysis"
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
  );
}
