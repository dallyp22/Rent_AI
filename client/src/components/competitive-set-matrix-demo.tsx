import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompetitiveSetMatrix } from "./competitive-set-matrix";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Demo component to showcase the CompetitiveSetMatrix functionality
export function CompetitiveSetMatrixDemo() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const { toast } = useToast();

  // Mock portfolio data for demo
  const mockPortfolios = [
    { id: "portfolio-1", name: "Downtown Portfolio", propertyCount: 5 },
    { id: "portfolio-2", name: "Suburban Portfolio", propertyCount: 8 },
    { id: "portfolio-3", name: "Mixed-Use Portfolio", propertyCount: 12 },
  ];

  const handleAnalyzeWithCompetitiveSet = (activeRelationships: any[]) => {
    toast({
      title: "Analysis Started",
      description: `Starting competitive analysis with ${activeRelationships.length} active relationships.`,
    });
    
    // Here you would typically navigate to an analysis page or trigger analysis
    console.log("Starting analysis with relationships:", activeRelationships);
  };

  return (
    <div className="space-y-6" data-testid="competitive-matrix-demo">
      <Card>
        <CardHeader>
          <CardTitle>Competitive Set Matrix Demo</CardTitle>
          <div className="text-sm text-muted-foreground">
            Select a portfolio to manage competitive relationships between properties.
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select Portfolio:</label>
              <Select 
                value={selectedPortfolioId} 
                onValueChange={setSelectedPortfolioId}
                data-testid="portfolio-selector"
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose a portfolio..." />
                </SelectTrigger>
                <SelectContent>
                  {mockPortfolios.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name} ({portfolio.propertyCount} properties)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPortfolioId && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Portfolio Selected</Badge>
                  <span className="text-sm text-muted-foreground">
                    {mockPortfolios.find(p => p.id === selectedPortfolioId)?.name}
                  </span>
                </div>
                
                <CompetitiveSetMatrix
                  portfolioId={selectedPortfolioId}
                  onAnalyzeClick={handleAnalyzeWithCompetitiveSet}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Features Demonstrated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">✅ Core Features</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• External vs Internal competition toggle</li>
                <li>• Interactive matrix with clickable cells</li>
                <li>• Visual relationship indicators (X for active)</li>
                <li>• Sticky headers for large matrices</li>
                <li>• Real-time relationship management</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">✅ Technical Features</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• React Query for API integration</li>
                <li>• Optimistic updates for better UX</li>
                <li>• Loading states and error handling</li>
                <li>• Toast notifications for feedback</li>
                <li>• TypeScript types throughout</li>
                <li>• Comprehensive data-testid attributes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CompetitiveSetMatrixDemo;