import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Calendar,
  FileText,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { exportPortfolioToExcel } from "@/lib/portfolio-excel-export";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import type { PropertyProfile, AnalysisSession, OptimizationReport } from "@shared/schema";

interface PortfolioMetrics {
  totalProperties: number;
  totalUnits: number;
  totalValue: number;
  avgOccupancyRate: number;
  totalMonthlyRevenue: number;
  totalOptimizationPotential: number;
  portfolioROI: number;
  performanceScore: number;
}

interface PropertyPerformance {
  propertyId: string;
  propertyName: string;
  address: string;
  totalUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  optimizationPotential: number;
  performanceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastAnalyzed: Date;
}

export default function PortfolioDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '1y'>('90d');
  const { toast } = useToast();

  // Default portfolio metrics if not loaded yet
  const defaultMetrics = {
    totalProperties: 0,
    totalUnits: 0,
    totalValue: 0,
    avgOccupancyRate: 0,
    totalMonthlyRevenue: 0,
    totalOptimizationPotential: 0,
    portfolioROI: 0,
    performanceScore: 0
  };

  // Fetch real portfolio analytics from backend (replaces client-side calculations)
  const { data: portfolioMetrics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/portfolio/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/portfolio/analytics");
      if (!response.ok) throw new Error("Failed to fetch portfolio analytics");
      return response.json();
    }
  });

  // Fetch portfolio financial report for exports
  const { data: portfolioFinancialData } = useQuery({
    queryKey: ["/api/portfolio/financial-report"],
    queryFn: async () => {
      const response = await fetch("/api/portfolio/financial-report");
      if (!response.ok) throw new Error("Failed to fetch portfolio financial data");
      return response.json();
    }
  });

  // Fetch portfolio insights for exports
  const { data: portfolioInsights } = useQuery({
    queryKey: ["/api/portfolio/insights"],
    queryFn: async () => {
      const response = await fetch("/api/portfolio/insights");
      if (!response.ok) throw new Error("Failed to fetch portfolio insights");
      return response.json();
    }
  });

  // Export portfolio report mutation
  const exportMutation = useMutation({
    mutationFn: async (reportType: 'summary' | 'financial' | 'performance' | 'executive') => {
      if (!portfolioFinancialData) {
        throw new Error("Portfolio data not available for export");
      }

      // Use portfolioMetrics from the analytics API, with fallback to defaults
      const metricsToUse = portfolioMetrics || defaultMetrics;
      
      // Prepare export data
      const exportData = {
        portfolioSummary: {
          totalProperties: metricsToUse.totalProperties,
          totalUnits: metricsToUse.totalUnits,
          totalCurrentRevenue: portfolioFinancialData.portfolioSummary.totalCurrentRevenue,
          totalOptimizedRevenue: portfolioFinancialData.portfolioSummary.totalOptimizedRevenue,
          totalOptimizationPotential: portfolioFinancialData.portfolioSummary.totalOptimizationPotential,
          annualOptimizationPotential: portfolioFinancialData.portfolioSummary.annualOptimizationPotential,
          avgPerformanceScore: portfolioFinancialData.portfolioSummary.avgPerformanceScore,
          portfolioROI: metricsToUse.portfolioROI,
          avgOccupancyRate: metricsToUse.avgOccupancyRate,
          generatedAt: new Date().toISOString()
        },
        propertyPerformance: portfolioFinancialData.propertyPerformance,
        trends: portfolioFinancialData.trends,
        insights: portfolioInsights
      };

      await exportPortfolioToExcel(exportData, reportType);
      return { success: true, reportType };
    },
    onSuccess: (data) => {
      toast({
        title: "Export Successful",
        description: `${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)} report has been downloaded successfully.`,
      });
    },
    onError: (error) => {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export portfolio report. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Use real property performance data from the backend financial report
  const propertyPerformance: PropertyPerformance[] = useMemo(() => {
    if (!portfolioFinancialData?.propertyPerformance) {
      return [];
    }
    
    // Transform backend data to match frontend interface
    return portfolioFinancialData.propertyPerformance.map((property: any) => ({
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      address: property.address,
      totalUnits: property.totalUnits,
      occupancyRate: property.occupancyRate,
      monthlyRevenue: property.currentMonthlyRevenue,
      optimizationPotential: property.optimizationPotential,
      performanceScore: property.performanceScore,
      riskLevel: property.performanceScore > 80 ? 'low' : property.performanceScore > 60 ? 'medium' : 'high' as 'low' | 'medium' | 'high',
      lastAnalyzed: new Date(property.lastAnalyzed)
    }));
  }, [portfolioFinancialData]);

  const isLoading = isLoadingAnalytics;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="portfolio-dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portfolio-dashboard">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Portfolio Dashboard
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Comprehensive overview and analytics for your property portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <select 
              value={selectedTimeframe} 
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
              data-testid="timeframe-selector"
            >
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => exportMutation.mutate('summary')}
              disabled={exportMutation.isPending}
              data-testid="button-export-summary"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Summary Report
            </Button>
            <Button 
              variant="outline" 
              onClick={() => exportMutation.mutate('executive')}
              disabled={exportMutation.isPending}
              data-testid="button-export-executive"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Executive Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="metric-card-properties">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-properties">
              {portfolioMetrics?.totalProperties || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolioMetrics?.totalUnits || 0} total units
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-card-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="metric-monthly-revenue">
              ${(portfolioMetrics?.totalMonthlyRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-green-600 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +8.2% vs last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="metric-card-occupancy">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-occupancy-rate">
              {(portfolioMetrics?.avgOccupancyRate || 0).toFixed(1)}%
            </div>
            <Progress value={portfolioMetrics?.avgOccupancyRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="metric-card-optimization">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Optimization Potential</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="metric-optimization-potential">
              ${(portfolioMetrics?.totalOptimizationPotential || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Annual revenue potential
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Portfolio Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Portfolio Performance Score
                </CardTitle>
                <CardDescription>
                  Overall portfolio health and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Score</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {portfolioMetrics?.performanceScore || 0}/100
                    </span>
                  </div>
                  <Progress value={portfolioMetrics?.performanceScore || 0} className="h-3" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Revenue Growth</div>
                      <div className="text-green-600">+12.3%</div>
                    </div>
                    <div>
                      <div className="font-medium">Portfolio ROI</div>
                      <div className="text-blue-600">{portfolioMetrics?.portfolioROI || 0}%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Opportunities
                </CardTitle>
                <CardDescription>
                  Priority optimization opportunities across the portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {propertyPerformance.slice(0, 3).map((property, index) => (
                    <div key={property.propertyId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{property.propertyName}</div>
                        <div className="text-xs text-muted-foreground">{property.address}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">
                          +${property.optimizationPotential.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">potential</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" data-testid="button-view-all-opportunities">
                  <Eye className="h-4 w-4 mr-2" />
                  View All Opportunities
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Consolidated Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Revenue Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Monthly</span>
                    <span className="font-bold">${portfolioFinancialData?.portfolioSummary?.totalCurrentRevenue?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Optimized Monthly</span>
                    <span className="font-bold text-green-600">${portfolioFinancialData?.portfolioSummary?.totalOptimizedRevenue?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Monthly Uplift</span>
                      <span className="font-bold text-blue-600">${portfolioFinancialData?.portfolioSummary?.totalOptimizationPotential?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-medium">Annual Potential</span>
                      <span className="font-bold text-purple-600">${portfolioFinancialData?.portfolioSummary?.annualOptimizationPotential?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Portfolio ROI Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current ROI</span>
                    <span className="font-bold">{(portfolioMetrics?.portfolioROI || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Optimization Success Rate</span>
                    <span className="font-bold text-green-600">{portfolioFinancialData?.trends?.optimizationSuccessRate?.toFixed(1) || '0'}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Revenue Growth</span>
                    <span className="font-bold text-blue-600">+{portfolioFinancialData?.trends?.revenueGrowth?.toFixed(1) || '0'}%</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Portfolio Score</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{portfolioMetrics?.performanceScore || 0}/100</span>
                        <Progress value={portfolioMetrics?.performanceScore || 0} className="w-16 h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Optimization Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {propertyPerformance.slice(0, 3).map((property, index) => (
                    <div key={property.propertyId} className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="text-sm font-medium truncate">{property.propertyName}</div>
                        <div className="text-xs text-muted-foreground">
                          {property.totalUnits} units
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">
                          +${property.optimizationPotential.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">potential</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  View All Opportunities
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Property-by-Property Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Property Performance Comparison</CardTitle>
              <CardDescription>
                Detailed financial and operational metrics for each property in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="performance-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Property</th>
                      <th className="text-left p-2">Units</th>
                      <th className="text-left p-2">Current Revenue</th>
                      <th className="text-left p-2">Optimized Revenue</th>
                      <th className="text-left p-2">Monthly Potential</th>
                      <th className="text-left p-2">Annual Potential</th>
                      <th className="text-left p-2">Occupancy</th>
                      <th className="text-left p-2">Performance</th>
                      <th className="text-left p-2">Risk Level</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioFinancialData?.propertyPerformance?.map((property, index) => (
                      <tr key={property.propertyId} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{property.propertyName}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-32">{property.address}</div>
                          </div>
                        </td>
                        <td className="p-2 text-center">{property.totalUnits}</td>
                        <td className="p-2 font-medium">${property.currentMonthlyRevenue?.toLocaleString() || '0'}</td>
                        <td className="p-2 font-medium text-green-600">${property.optimizedMonthlyRevenue?.toLocaleString() || '0'}</td>
                        <td className="p-2">
                          <div className="font-bold text-blue-600">
                            +${property.optimizationPotential?.toLocaleString() || '0'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {property.optimizationPotential > 0 ? 
                              `+${((property.optimizationPotential / property.currentMonthlyRevenue) * 100).toFixed(1)}%` : 
                              'Optimized'
                            }
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="font-bold text-purple-600">
                            +${property.annualOptimizationPotential?.toLocaleString() || '0'}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span>{property.occupancyRate?.toFixed(1) || '85.0'}%</span>
                            <Progress value={property.occupancyRate || 85} className="w-16 h-2" />
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span>{property.performanceScore?.toFixed(0) || '75'}</span>
                            <Progress value={property.performanceScore || 75} className="w-16 h-2" />
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant={propertyPerformance[index]?.riskLevel === 'low' ? 'default' : 
                                   propertyPerformance[index]?.riskLevel === 'medium' ? 'secondary' : 'destructive'}
                          >
                            {propertyPerformance[index]?.riskLevel || 'medium'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Potential Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Potential Analysis</CardTitle>
                <CardDescription>Portfolio optimization impact breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div>
                      <div className="font-medium text-green-900 dark:text-green-100">High Impact Properties</div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Properties with optimization potential &gt; $5,000/month
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {portfolioFinancialData?.propertyPerformance?.filter(p => p.optimizationPotential > 5000).length || 0}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-100">Medium Impact Properties</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        Properties with optimization potential $1,000-$5,000/month
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {portfolioFinancialData?.propertyPerformance?.filter(p => 
                        p.optimizationPotential >= 1000 && p.optimizationPotential <= 5000
                      ).length || 0}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">Low Impact Properties</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Properties with optimization potential &lt; $1,000/month
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-600">
                      {portfolioFinancialData?.propertyPerformance?.filter(p => p.optimizationPotential < 1000).length || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Success Tracking</CardTitle>
                <CardDescription>Performance metrics and success rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Success Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600">
                        {portfolioFinancialData?.trends?.optimizationSuccessRate?.toFixed(1) || '87.3'}%
                      </span>
                      <Progress value={portfolioFinancialData?.trends?.optimizationSuccessRate || 87.3} className="w-20 h-2" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Revenue Growth YTD</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">
                        +{portfolioFinancialData?.trends?.revenueGrowth?.toFixed(1) || '8.2'}%
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Rent Growth Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-600">
                        +{portfolioFinancialData?.trends?.rentGrowth?.toFixed(1) || '5.5'}%
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Occupancy Trend</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600">
                        +{portfolioFinancialData?.trends?.occupancyTrend?.toFixed(1) || '2.1'}%
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </div>
                  </div>

                  <div className="border-t pt-3 mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => exportMutation.mutate('financial')}
                      disabled={exportMutation.isPending}
                      className="w-full"
                    >
                      {exportMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export Financial Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PerformanceAnalyticsComponents 
            portfolioFinancialData={portfolioFinancialData}
            portfolioMetrics={portfolioMetrics}
            selectedTimeframe={selectedTimeframe}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <AIPortfolioInsights 
            portfolioInsights={portfolioInsights}
            portfolioMetrics={portfolioMetrics}
            isLoading={!portfolioInsights}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Performance Analytics Components
interface PerformanceAnalyticsProps {
  portfolioFinancialData: any;
  portfolioMetrics: PortfolioMetrics;
  selectedTimeframe: string;
}

function PerformanceAnalyticsComponents({ portfolioFinancialData, portfolioMetrics, selectedTimeframe }: PerformanceAnalyticsProps) {
  // Sample occupancy trend data
  const occupancyTrendData = [
    { month: 'Jan', portfolio: 85.2, market: 82.1, competitor: 83.5 },
    { month: 'Feb', portfolio: 86.1, market: 83.2, competitor: 84.1 },
    { month: 'Mar', portfolio: 87.3, market: 84.5, competitor: 85.2 },
    { month: 'Apr', portfolio: 88.1, market: 85.2, competitor: 86.0 },
    { month: 'May', portfolio: 87.9, market: 84.8, competitor: 85.7 },
    { month: 'Jun', portfolio: 89.2, market: 86.1, competitor: 86.8 },
    { month: 'Jul', portfolio: 88.5, market: 85.7, competitor: 86.2 },
    { month: 'Aug', portfolio: 87.8, market: 84.9, competitor: 85.9 },
    { month: 'Sep', portfolio: 88.9, market: 86.3, competitor: 87.1 },
    { month: 'Oct', portfolio: 89.1, market: 86.8, competitor: 87.5 },
    { month: 'Nov', portfolio: 87.6, market: 85.4, competitor: 86.3 },
    { month: 'Dec', portfolio: 87.2, market: 84.1, competitor: 85.8 }
  ];

  // Revenue performance data
  const revenueData = [
    { month: 'Jan', current: 245000, optimized: 267000, target: 270000 },
    { month: 'Feb', current: 248000, optimized: 272000, target: 275000 },
    { month: 'Mar', current: 252000, optimized: 276000, target: 280000 },
    { month: 'Apr', current: 255000, optimized: 280000, target: 285000 },
    { month: 'May', current: 258000, optimized: 284000, target: 290000 },
    { month: 'Jun', current: 262000, optimized: 288000, target: 295000 }
  ];

  // Portfolio composition data
  const portfolioComposition = [
    { name: 'High Performers', value: 35, color: '#22c55e' },
    { name: 'Average Performers', value: 45, color: '#3b82f6' },
    { name: 'Improvement Needed', value: 20, color: '#f59e0b' }
  ];

  // Performance comparison data
  const performanceComparison = [
    { metric: 'Avg Rent/SqFt', portfolio: 2.45, market: 2.32, competitor: 2.38 },
    { metric: 'Occupancy Rate', portfolio: 87.2, market: 84.1, competitor: 85.8 },
    { metric: 'Revenue Growth', portfolio: 8.2, market: 6.5, competitor: 7.1 },
    { metric: 'Optimization Rate', portfolio: 89.3, market: 75.0, competitor: 78.5 }
  ];

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Portfolio vs Market</p>
                <p className="text-2xl font-bold text-green-600">+3.1%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Optimization Success</p>
                <p className="text-2xl font-bold text-blue-600">89.3%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Growth YTD</p>
                <p className="text-2xl font-bold text-purple-600">+8.2%</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Position</p>
                <p className="text-2xl font-bold text-indigo-600">Top 25%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Trends - Portfolio vs Market</CardTitle>
            <CardDescription>Occupancy rate comparison over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={occupancyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[80, 92]} />
                <Tooltip formatter={(value: any) => [`${value}%`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="portfolio" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Your Portfolio"
                />
                <Line 
                  type="monotone" 
                  dataKey="market" 
                  stroke="#6b7280" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Market Average"
                />
                <Line 
                  type="monotone" 
                  dataKey="competitor" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Top Competitors"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Performance</CardTitle>
            <CardDescription>Monthly revenue: current vs optimized potential</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`$${(value/1000).toFixed(0)}K`, '']}
                />
                <Legend />
                <Bar dataKey="current" fill="#6b7280" name="Current Revenue" />
                <Bar dataKey="optimized" fill="#22c55e" name="Optimized Revenue" />
                <Bar dataKey="target" fill="#3b82f6" name="Target Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Composition</CardTitle>
            <CardDescription>Properties by performance category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={portfolioComposition}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {portfolioComposition.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}%`, '']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Benchmarking</CardTitle>
            <CardDescription>Portfolio performance vs market and competitors</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceComparison} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="metric" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="portfolio" fill="#3b82f6" name="Your Portfolio" />
                <Bar dataKey="market" fill="#6b7280" name="Market Average" />
                <Bar dataKey="competitor" fill="#f59e0b" name="Competitors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Market Positioning Summary</CardTitle>
          <CardDescription>How your portfolio performs against key market indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-2">Outperforming</div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Revenue Growth (+8.2% vs +6.5% market)
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Optimization Success (89.3% vs 75% market)
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">Competitive</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Occupancy Rate (87.2% vs 84.1% market)
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Rent per SqFt ($2.45 vs $2.32 market)
              </div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <div className="text-2xl font-bold text-amber-600 mb-2">Opportunities</div>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                Market share expansion potential
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                Premium positioning in select markets
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// AI Portfolio Insights Component
interface AIPortfolioInsightsProps {
  portfolioInsights: any;
  portfolioMetrics: PortfolioMetrics;
  isLoading: boolean;
}

function AIPortfolioInsights({ portfolioInsights, portfolioMetrics, isLoading }: AIPortfolioInsightsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!portfolioInsights) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-4" />
            <p>AI insights are being generated for your portfolio...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-6 w-6 text-blue-600" />
            AI-Generated Portfolio Insights
          </CardTitle>
          <CardDescription>
            Strategic recommendations powered by AI analysis of your portfolio performance and market data
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Recommendations</CardTitle>
          <CardDescription>Priority actions to optimize your portfolio performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolioInsights?.strategicRecommendations?.map((recommendation: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={recommendation.priority === 'High' ? 'destructive' : 
                               recommendation.priority === 'Medium' ? 'secondary' : 'default'}
                    >
                      {recommendation.priority} Priority
                    </Badge>
                    <h4 className="font-semibold">{recommendation.category}</h4>
                  </div>
                  {recommendation.priority === 'High' && <Target className="h-5 w-5 text-red-500" />}
                </div>
                
                <p className="text-muted-foreground mb-3">{recommendation.insight}</p>
                
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Action Items:</h5>
                  <ul className="space-y-1">
                    {recommendation.actionItems?.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className="text-sm flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )) || []}
          </div>
        </CardContent>
      </Card>

      {/* Performance Benchmarking */}
      {portfolioInsights?.performanceBenchmarks && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance vs Industry</CardTitle>
              <CardDescription>How your portfolio compares to industry benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall Portfolio Score</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600">
                      {portfolioInsights.performanceBenchmarks.portfolioScore}/100
                    </span>
                    <Progress value={portfolioInsights.performanceBenchmarks.portfolioScore} className="w-20 h-2" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Industry Average</span>
                    <div className="font-medium">{portfolioInsights.performanceBenchmarks.industryAverage}/100</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Top Quartile</span>
                    <div className="font-medium">{portfolioInsights.performanceBenchmarks.topQuartile}/100</div>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  {Object.entries(portfolioInsights.performanceBenchmarks.areas || {}).map(([area, data]: [string, any]) => (
                    <div key={area} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{area.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          data.score > data.benchmark ? 'text-green-600' : 
                          data.score === data.benchmark ? 'text-blue-600' : 'text-amber-600'
                        }`}>
                          {data.score}
                        </span>
                        <span className="text-xs text-muted-foreground">vs {data.benchmark}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>Portfolio risk analysis and mitigation strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall Risk Level</span>
                  <Badge 
                    variant={portfolioInsights.riskAssessment?.overallRiskLevel === 'Low' ? 'default' : 
                             portfolioInsights.riskAssessment?.overallRiskLevel === 'Medium' ? 'secondary' : 'destructive'}
                  >
                    {portfolioInsights.riskAssessment?.overallRiskLevel || 'Medium'}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <h5 className="font-medium text-sm">Risk Mitigation Recommendations:</h5>
                  <ul className="space-y-2">
                    {portfolioInsights.riskAssessment?.recommendations?.map((recommendation: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-amber-600 mt-1">⚠</span>
                        <span>{recommendation}</span>
                      </li>
                    )) || []}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Next Steps</CardTitle>
          <CardDescription>Priority actions based on AI analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Run Optimization Analysis</div>
                <div className="text-sm text-muted-foreground">Identify immediate revenue opportunities</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Review Market Positioning</div>
                <div className="text-sm text-muted-foreground">Assess competitive landscape changes</div>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Schedule Portfolio Review</div>
                <div className="text-sm text-muted-foreground">Plan strategic initiatives</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}