import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CompetitorSelection from "@/components/competitor-selection";
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

export default function Summarize({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const [selectedCompetitors, setSelectedCompetitors] = useState<ScrapedProperty[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [scrapingStage, setScrapingStage] = useState<'none' | 'scraping' | 'completed' | 'error'>('none');
  const [scrapingResults, setScrapingResults] = useState<ScrapingResult[]>([]);
  const { toast } = useToast();

  const propertyQuery = useQuery<PropertyWithAnalysis>({
    queryKey: ['/api/properties', params.id],
  });

  const competitorsQuery = useQuery<ScrapedProperty[]>({
    queryKey: ['/api/competitors'],
  });

  const scrapingMutation = useMutation({
    mutationFn: async (competitorIds: string[]) => {
      const response = await apiRequest('POST', '/api/competitors/scrape-units', { competitorIds });
      return await response.json();
    },
    onSuccess: (data) => {
      setScrapingResults(data.results || []);
      setScrapingStage('completed');
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
          
          <div className="flex justify-end" data-testid="continue-section">
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
        </>
      )}
    </div>
  );
}
