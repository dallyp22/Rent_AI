import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PropertyForm from "@/components/property-form";
import AIAnalysis from "@/components/ai-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";
import type { InsertProperty, Property, PropertyAnalysis, ScrapingJob } from "@shared/schema";

interface PropertyWithAnalysis {
  property: Property;
  analysis: PropertyAnalysis;
}

interface ScrapingResult {
  scrapingJob: ScrapingJob;
  message: string;
  targetUrl: string;
}

export default function PropertyInput() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [result, setResult] = useState<PropertyWithAnalysis | null>(null);
  const [scrapingResult, setScrapingResult] = useState<ScrapingResult | null>(null);

  const createPropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty): Promise<PropertyWithAnalysis> => {
      const res = await apiRequest("POST", "/api/properties", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      // Automatically start scraping after property creation
      startScrapingMutation.mutate(data.property.id);
    },
    onError: (error) => {
      console.error("Error creating property:", error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze your property. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startScrapingMutation = useMutation({
    mutationFn: async (propertyId: string): Promise<ScrapingResult> => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/scrape`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setScrapingResult(data);
      toast({
        title: "Scraping Started",
        description: data.message,
      });
    },
    onError: (error) => {
      console.error("Error starting scraping:", error);
      toast({
        title: "Scraping Failed",
        description: "Failed to start competitive data scraping.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: InsertProperty) => {
    createPropertyMutation.mutate(data);
  };

  const handleContinue = () => {
    if (result?.property.id) {
      setLocation(`/summarize/${result.property.id}`);
    }
  };

  return (
    <div className="space-y-6" data-testid="property-input-page">
      <PropertyForm 
        onSubmit={handleSubmit}
        isLoading={createPropertyMutation.isPending}
      />
      
      {result && (
        <AIAnalysis
          analysis={result.analysis}
          onContinue={handleContinue}
        />
      )}

      {/* Scraping Status Card */}
      {(startScrapingMutation.isPending || scrapingResult) && (
        <Card className="border-blue-200 bg-blue-50" data-testid="scraping-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Database className="h-5 w-5" />
              Competitive Data Scraping
            </CardTitle>
          </CardHeader>
          <CardContent>
            {startScrapingMutation.isPending && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Starting competitive data collection...</p>
                  <p className="text-sm text-blue-700">Analyzing your property address and preparing scraping job</p>
                </div>
              </div>
            )}
            
            {scrapingResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Scraping job initiated successfully!</p>
                    <p className="text-sm text-green-700">{scrapingResult.message}</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Scraping Details:</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-blue-700">Target URL:</span>
                      <span className="ml-2 font-mono text-blue-900">{scrapingResult.targetUrl}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Job ID:</span>
                      <span className="ml-2 font-mono text-blue-900">{scrapingResult.scrapingJob.id}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Status:</span>
                      <span className="ml-2 text-blue-900 capitalize">{scrapingResult.scrapingJob.status}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-900">Background Processing</p>
                        <p className="text-yellow-800">
                          The scraping job is now running in the background. You can continue with the analysis 
                          while competitive data is being collected. Real scraped data will be available for 
                          comparison shortly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {startScrapingMutation.isError && (
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Scraping failed</p>
                  <p className="text-sm text-red-700">
                    Unable to start competitive data collection. You can still proceed with manual analysis.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
