import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

interface RentComparisonChartProps {
  data: VacancyData | null;
  isLoading?: boolean;
  error?: string;
}

const UNIT_TYPES = ['Studio', '1BR', '2BR', '3BR+'];

// Color palette for chart
const SUBJECT_PROPERTY_COLOR = '#3B82F6'; // Blue
const COMPETITOR_COLORS = [
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
];

export default function RentComparisonChart({ data, isLoading, error }: RentComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!data) return null;

    const labels = UNIT_TYPES;
    const datasets = [];

    // Helper function to get rent data for a property by unit type
    const getRentByUnitType = (property: any, unitType: string) => {
      const unit = property.unitTypes.find((u: UnitTypeData) => u.type === unitType);
      return unit ? unit.avgRent : 0;
    };

    // Subject property dataset (blue bars)
    datasets.push({
      label: data.subjectProperty.name,
      data: labels.map(type => getRentByUnitType(data.subjectProperty, type)),
      backgroundColor: SUBJECT_PROPERTY_COLOR,
      borderColor: SUBJECT_PROPERTY_COLOR,
      borderWidth: 1,
      isSubject: true,
    });

    // Competitor datasets (different colors)
    data.competitors.forEach((competitor, index) => {
      const color = COMPETITOR_COLORS[index % COMPETITOR_COLORS.length];
      datasets.push({
        label: competitor.name,
        data: labels.map(type => getRentByUnitType(competitor, type)),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        isSubject: false,
      });
    });

    return { labels, datasets };
  }, [data]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Average Rent Comparison by Unit Type',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: 20,
      },
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context: TooltipItem<'bar'>[]) => {
            return `${context[0].label} Units`;
          },
          beforeBody: (context: TooltipItem<'bar'>[]) => {
            const datasetIndex = context[0].datasetIndex;
            const unitType = context[0].label;
            
            if (!data) return '';
            
            // Find the property data (subject or competitor)
            let property;
            if (datasetIndex === 0) {
              property = data.subjectProperty;
            } else {
              property = data.competitors[datasetIndex - 1];
            }
            
            if (!property) return '';
            
            const unitTypeData = property.unitTypes.find(u => u.type === unitType);
            if (!unitTypeData) return '';
            
            const lines = [
              `Property: ${property.name}`,
              `Total Units: ${unitTypeData.totalUnits}`,
              `Available: ${unitTypeData.availableUnits}`,
              `Vacancy Rate: ${unitTypeData.vacancyRate.toFixed(1)}%`,
            ];
            
            if (unitTypeData.avgSqFt > 0) {
              lines.push(`Avg Sq Ft: ${Math.round(unitTypeData.avgSqFt)}`);
            }
            
            if (unitTypeData.rentRange.min !== unitTypeData.rentRange.max) {
              lines.push(`Rent Range: $${Math.round(unitTypeData.rentRange.min)} - $${Math.round(unitTypeData.rentRange.max)}`);
            }
            
            return lines;
          },
          label: (context: TooltipItem<'bar'>) => {
            const value = context.parsed.y;
            return value > 0 ? `Average Rent: $${Math.round(value)}` : 'No data available';
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Unit Type',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Average Rent ($)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  }), [data]);

  if (isLoading) {
    return (
      <Card data-testid="rent-chart-loading">
        <CardHeader>
          <CardTitle>Average Rent Comparison</CardTitle>
          <CardDescription>Loading rent comparison data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="space-y-4 w-full">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-64 w-full" />
              <div className="flex justify-center space-x-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="rent-chart-error">
        <CardHeader>
          <CardTitle>Average Rent Comparison</CardTitle>
          <CardDescription className="text-red-600">Error loading chart data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-red-500 text-sm">{error}</div>
              <div className="text-muted-foreground text-sm">
                Please ensure unit data has been collected for the selected properties.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !chartData) {
    return (
      <Card data-testid="rent-chart-no-data">
        <CardHeader>
          <CardTitle>Average Rent Comparison</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-muted-foreground">No rent comparison data available</div>
              <div className="text-sm text-muted-foreground">
                Unit data collection may still be in progress.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="rent-comparison-chart">
      <CardHeader>
        <CardTitle>Average Rent Comparison by Unit Type</CardTitle>
        <CardDescription>
          Comparing average rents across {data.subjectProperty.name} and {data.competitors.length} competitor{data.competitors.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full" data-testid="chart-container">
          <Bar data={chartData} options={chartOptions} />
        </div>
        
        {/* Unit type summary below chart */}
        <div className="mt-6 space-y-4" data-testid="unit-type-summary">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Unit Type Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {UNIT_TYPES.map(unitType => {
              const subjectUnit = data.subjectProperty.unitTypes.find(u => u.type === unitType);
              const hasData = subjectUnit && subjectUnit.totalUnits > 0;
              
              return (
                <div key={unitType} className="text-center p-3 bg-muted rounded-lg" data-testid={`unit-summary-${unitType.toLowerCase()}`}>
                  <div className="font-semibold text-sm">{unitType}</div>
                  {hasData ? (
                    <>
                      <div className="text-lg font-bold text-primary">
                        ${Math.round(subjectUnit.avgRent).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {subjectUnit.totalUnits} units
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {subjectUnit.vacancyRate.toFixed(1)}% vacant
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No data</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}