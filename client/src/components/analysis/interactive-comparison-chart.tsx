import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Scatter, Bar } from 'react-chartjs-2';
import type { UnitComparison } from "@shared/schema";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface InteractiveComparisonChartProps {
  subjectUnits: UnitComparison[];
  competitorUnits: UnitComparison[];
  isLoading?: boolean;
  selectedBedroomTypes?: string[];
}

export default function InteractiveComparisonChart({ 
  subjectUnits, 
  competitorUnits,
  isLoading = false,
  selectedBedroomTypes = []
}: InteractiveComparisonChartProps) {
  // State for chart type, metric type, and display mode
  const [chartType, setChartType] = useState<"scatter" | "bar">("scatter");
  const [metricType, setMetricType] = useState<"unitPrice" | "pricePerSqFt">("unitPrice");
  const [displayMode, setDisplayMode] = useState<"vacancies" | "avgByUnitType">("vacancies");

  // Calculate price per sq ft for a unit
  const getPricePerSqFt = (unit: UnitComparison) => {
    return unit.squareFootage && unit.squareFootage > 0 
      ? unit.rent / unit.squareFootage 
      : null;
  };

  // Truncate property name for bar chart labels
  const truncatePropertyName = (name: string, maxLength: number = 15) => {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  // Group units by property and unit type for average mode
  const groupUnitsByPropertyAndType = (units: UnitComparison[]) => {
    const grouped = new Map<string, Map<string, UnitComparison[]>>();
    
    units.forEach(unit => {
      if (!grouped.has(unit.propertyName)) {
        grouped.set(unit.propertyName, new Map());
      }
      const propertyGroup = grouped.get(unit.propertyName)!;
      
      // Normalize unit type (e.g., "1BR", "1 BR", "1 Bedroom" -> "1BR")
      const unitType = unit.unitType?.replace(/\s+/g, '').replace(/Bedroom/i, 'BR')
                       || `${unit.bedrooms}BR`;
      
      if (!propertyGroup.has(unitType)) {
        propertyGroup.set(unitType, []);
      }
      propertyGroup.get(unitType)!.push(unit);
    });
    
    return grouped;
  };

  // Calculate average unit data for a group
  const calculateAverageUnit = (units: UnitComparison[]): UnitComparison & { unitCount: number } => {
    const avgRent = units.reduce((sum, u) => sum + u.rent, 0) / units.length;
    const avgSqFt = units.filter(u => u.squareFootage).reduce((sum, u) => sum + (u.squareFootage || 0), 0) / 
                   units.filter(u => u.squareFootage).length || 0;
    const firstUnit = units[0];
    
    return {
      ...firstUnit,
      rent: avgRent,
      squareFootage: avgSqFt || null,
      unitCount: units.length
    };
  };

  // Color palette for competitor properties (20 distinct colors)
  const competitorColorPalette = [
    { bg: 'rgba(239, 68, 68, 0.5)', border: 'rgba(239, 68, 68, 1)' },    // Red
    { bg: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 1)' },    // Green
    { bg: 'rgba(251, 146, 60, 0.5)', border: 'rgba(251, 146, 60, 1)' },  // Orange
    { bg: 'rgba(168, 85, 247, 0.5)', border: 'rgba(168, 85, 247, 1)' },  // Purple
    { bg: 'rgba(236, 72, 153, 0.5)', border: 'rgba(236, 72, 153, 1)' },  // Pink
    { bg: 'rgba(20, 184, 166, 0.5)', border: 'rgba(20, 184, 166, 1)' },  // Teal
    { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 1)' },  // Amber
    { bg: 'rgba(99, 102, 241, 0.5)', border: 'rgba(99, 102, 241, 1)' },  // Indigo
    { bg: 'rgba(107, 114, 128, 0.5)', border: 'rgba(107, 114, 128, 1)' }, // Gray
    { bg: 'rgba(217, 119, 6, 0.5)', border: 'rgba(217, 119, 6, 1)' },    // Brown
    // Additional 10 distinct colors (11-20)
    { bg: 'rgba(6, 182, 212, 0.5)', border: 'rgba(6, 182, 212, 1)' },    // Cyan
    { bg: 'rgba(245, 158, 11, 0.5)', border: 'rgba(245, 158, 11, 1)' },  // Yellow-Orange
    { bg: 'rgba(139, 92, 246, 0.5)', border: 'rgba(139, 92, 246, 1)' },  // Violet
    { bg: 'rgba(236, 252, 203, 0.5)', border: 'rgba(163, 230, 53, 1)' }, // Lime
    { bg: 'rgba(219, 39, 119, 0.5)', border: 'rgba(219, 39, 119, 1)' },  // Rose
    { bg: 'rgba(59, 7, 100, 0.5)', border: 'rgba(59, 7, 100, 1)' },      // Deep Purple
    { bg: 'rgba(254, 215, 170, 0.5)', border: 'rgba(251, 113, 133, 1)' }, // Peach
    { bg: 'rgba(13, 148, 136, 0.5)', border: 'rgba(13, 148, 136, 1)' },  // Emerald
    { bg: 'rgba(244, 63, 94, 0.5)', border: 'rgba(244, 63, 94, 1)' },    // Crimson
    { bg: 'rgba(8, 145, 178, 0.5)', border: 'rgba(8, 145, 178, 1)' },    // Sky Blue
  ];

  // Prepare data for bar chart
  const barData = useMemo(() => {
    const filteredSubjectUnits = metricType === "pricePerSqFt" 
      ? subjectUnits.filter(unit => getPricePerSqFt(unit) !== null)
      : subjectUnits;
    const filteredCompetitorUnits = metricType === "pricePerSqFt"
      ? competitorUnits.filter(unit => getPricePerSqFt(unit) !== null)
      : competitorUnits;
    
    if (displayMode === "avgByUnitType") {
      // Group units by property and unit type
      const subjectGroups = groupUnitsByPropertyAndType(filteredSubjectUnits);
      const competitorGroups = groupUnitsByPropertyAndType(filteredCompetitorUnits);
      
      // Create averaged units
      const avgSubjectUnits: any[] = [];
      const avgCompetitorUnits: any[] = [];
      
      subjectGroups.forEach((unitTypes, propertyName) => {
        unitTypes.forEach((units, unitType) => {
          const avgUnit = calculateAverageUnit(units);
          avgSubjectUnits.push({ ...avgUnit, propertyName, unitType, isSubject: true });
        });
      });
      
      competitorGroups.forEach((unitTypes, propertyName) => {
        unitTypes.forEach((units, unitType) => {
          const avgUnit = calculateAverageUnit(units);
          avgCompetitorUnits.push({ ...avgUnit, propertyName, unitType, isSubject: false });
        });
      });
      
      // Sort by property name and then unit type for consistent ordering
      const allAvgUnits = [...avgSubjectUnits, ...avgCompetitorUnits].sort((a, b) => {
        const propCompare = a.propertyName.localeCompare(b.propertyName);
        if (propCompare !== 0) return propCompare;
        return a.unitType.localeCompare(b.unitType);
      });
      
      // Create labels for averaged data
      const barLabels = allAvgUnits.map(unit => 
        `${truncatePropertyName(unit.propertyName, 12)} - ${unit.unitType}`
      );
      
      // Group by property for datasets
      const unitsByProperty = new Map<string, typeof allAvgUnits>();
      allAvgUnits.forEach(unit => {
        if (!unitsByProperty.has(unit.propertyName)) {
          unitsByProperty.set(unit.propertyName, []);
        }
        unitsByProperty.get(unit.propertyName)!.push(unit);
      });
      
      // Create datasets - one per property
      const datasets: any[] = [];
      let colorIndex = 0;
      
      unitsByProperty.forEach((units, propertyName) => {
        const isSubject = units.some(u => u.isSubject);
        const color = isSubject 
          ? { bg: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 1)' }
          : competitorColorPalette[colorIndex % competitorColorPalette.length];
        
        datasets.push({
          label: truncatePropertyName(propertyName, 25),
          data: allAvgUnits.map(unit => 
            units.includes(unit) 
              ? (metricType === "unitPrice" ? unit.rent : getPricePerSqFt(unit))
              : null
          ),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: isSubject ? 2 : 1,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
          unitData: allAvgUnits // Store for tooltip
        });
        
        if (!isSubject) colorIndex++;
      });
      
      return {
        labels: barLabels,
        datasets,
      };
    } else {
      // Original code for individual units (vacancies mode)
      // Group competitor units by property name
      const competitorsByProperty = new Map<string, typeof filteredCompetitorUnits>();
      filteredCompetitorUnits.forEach(unit => {
        if (!competitorsByProperty.has(unit.propertyName)) {
          competitorsByProperty.set(unit.propertyName, []);
        }
        competitorsByProperty.get(unit.propertyName)!.push(unit);
      });

      // Get unique subject property names
      const subjectPropertyNames = new Set(filteredSubjectUnits.map(u => u.propertyName));
      const subjectPropertyName = subjectPropertyNames.size === 1 
        ? Array.from(subjectPropertyNames)[0] 
        : 'Your Properties';
      
      const allUnits = [...filteredSubjectUnits, ...filteredCompetitorUnits];
      const barLabels = allUnits.map((unit, index) => {
        const prefix = filteredSubjectUnits.includes(unit) ? 'S' : 'C';
        return `${prefix}${index + 1}: ${truncatePropertyName(unit.propertyName)}`;
      });

      // Create datasets - one for subject property, one for each competitor property
      const datasets = [];
      
      // Add subject property dataset
      if (filteredSubjectUnits.length > 0) {
        datasets.push({
          label: truncatePropertyName(subjectPropertyName, 25),
          data: allUnits.map(unit => 
            filteredSubjectUnits.includes(unit) 
              ? (metricType === "unitPrice" ? unit.rent : getPricePerSqFt(unit))
              : null
          ),
          backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue for subject
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        });
      }

      // Add competitor property datasets with unique colors
      let colorIndex = 0;
      competitorsByProperty.forEach((units, propertyName) => {
        const color = competitorColorPalette[colorIndex % competitorColorPalette.length];
        datasets.push({
          label: truncatePropertyName(propertyName, 25),
          data: allUnits.map(unit => 
            units.includes(unit) 
              ? (metricType === "unitPrice" ? unit.rent : getPricePerSqFt(unit))
              : null
          ),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        });
        colorIndex++;
      });

      return {
        labels: barLabels,
        datasets,
      };
    }
  }, [subjectUnits, competitorUnits, metricType, displayMode]);

  const scatterData = useMemo(() => {
    const datasets: any[] = [];
    
    // Filter units based on metric type
    const filteredSubjectUnits = metricType === "pricePerSqFt" 
      ? subjectUnits.filter(unit => getPricePerSqFt(unit) !== null)
      : subjectUnits;
    const filteredCompetitorUnits = metricType === "pricePerSqFt"
      ? competitorUnits.filter(unit => getPricePerSqFt(unit) !== null)
      : competitorUnits;

    if (displayMode === "avgByUnitType") {
      // Group units by property and unit type for average mode
      const subjectGroups = groupUnitsByPropertyAndType(filteredSubjectUnits);
      const competitorGroups = groupUnitsByPropertyAndType(filteredCompetitorUnits);
      
      // Process subject properties
      let allSubjectAvgUnits: any[] = [];
      subjectGroups.forEach((unitTypes, propertyName) => {
        unitTypes.forEach((units, unitType) => {
          const avgUnit = calculateAverageUnit(units);
          allSubjectAvgUnits.push({ 
            ...avgUnit, 
            propertyName, 
            unitType,
            isSubject: true 
          });
        });
      });
      
      // Get unique subject property names for labeling
      const subjectPropertyNames = new Set(allSubjectAvgUnits.map(u => u.propertyName));
      const subjectPropertyLabel = subjectPropertyNames.size === 1 
        ? Array.from(subjectPropertyNames)[0] 
        : 'Your Properties';
      
      // Add subject dataset
      if (allSubjectAvgUnits.length > 0) {
        datasets.push({
          label: `${truncatePropertyName(subjectPropertyLabel, 25)} (Avg)`,
          data: allSubjectAvgUnits.map(unit => ({
            x: unit.squareFootage || 0,
            y: metricType === "unitPrice" ? unit.rent : getPricePerSqFt(unit),
            unitInfo: unit
          })),
          backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue for subject
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointStyle: 'circle',
          pointRadius: (context: any) => {
            const unit = context.raw?.unitInfo;
            // Larger radius for averaged data to show importance
            return unit ? 6 + Math.min(unit.unitCount * 0.5, 6) : 8;
          },
        });
      }
      
      // Add competitor property datasets
      let colorIndex = 0;
      competitorGroups.forEach((unitTypes, propertyName) => {
        const propertyAvgUnits: any[] = [];
        unitTypes.forEach((units, unitType) => {
          const avgUnit = calculateAverageUnit(units);
          propertyAvgUnits.push({ 
            ...avgUnit, 
            propertyName, 
            unitType,
            isSubject: false 
          });
        });
        
        const color = competitorColorPalette[colorIndex % competitorColorPalette.length];
        datasets.push({
          label: `${truncatePropertyName(propertyName, 25)} (Avg)`,
          data: propertyAvgUnits.map(unit => ({
            x: unit.squareFootage || 0,
            y: metricType === "unitPrice" ? unit.rent : getPricePerSqFt(unit),
            unitInfo: unit
          })),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          pointStyle: 'circle',
          pointRadius: (context: any) => {
            const unit = context.raw?.unitInfo;
            // Larger radius for averaged data to show importance
            return unit ? 6 + Math.min(unit.unitCount * 0.5, 6) : 8;
          },
        });
        colorIndex++;
      });
    } else {
      // Original code for individual units (vacancies mode)
      // Get unique subject property names for labeling
      const subjectPropertyNames = new Set(filteredSubjectUnits.map(u => u.propertyName));
      const subjectPropertyLabel = subjectPropertyNames.size === 1 
        ? Array.from(subjectPropertyNames)[0] 
        : 'Your Properties';

      // Group competitor units by property name
      const competitorsByProperty = new Map<string, typeof filteredCompetitorUnits>();
      filteredCompetitorUnits.forEach(unit => {
        if (!competitorsByProperty.has(unit.propertyName)) {
          competitorsByProperty.set(unit.propertyName, []);
        }
        competitorsByProperty.get(unit.propertyName)!.push(unit);
      });

      // Add subject property dataset (all subject properties in one blue dataset)
      if (filteredSubjectUnits.length > 0) {
        datasets.push({
          label: truncatePropertyName(subjectPropertyLabel, 25),
          data: filteredSubjectUnits.map(unit => ({
            x: unit.squareFootage || 0,
            y: metricType === "unitPrice" ? unit.rent : getPricePerSqFt(unit),
            unitInfo: unit
          })),
          backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue for subject
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointStyle: 'circle',
          pointRadius: (context: any) => {
            const unit = context.raw?.unitInfo;
            return unit ? 4 + (unit.bedrooms * 2) : 6;
          },
        });
      }

      // Add competitor property datasets with unique colors
      let colorIndex = 0;
      competitorsByProperty.forEach((units, propertyName) => {
        const color = competitorColorPalette[colorIndex % competitorColorPalette.length];
        datasets.push({
          label: truncatePropertyName(propertyName, 25),
          data: units.map(unit => ({
            x: unit.squareFootage || 0,
            y: metricType === "unitPrice" ? unit.rent : getPricePerSqFt(unit),
            unitInfo: unit
          })),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          pointStyle: 'circle',
          pointRadius: (context: any) => {
            const unit = context.raw?.unitInfo;
            return unit ? 4 + (unit.bedrooms * 2) : 6;
          },
        });
        colorIndex++;
      });
    }

    return { datasets };
  }, [subjectUnits, competitorUnits, metricType, displayMode]);

  const scatterOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const unitInfo = context.raw.unitInfo;
            const pricePerSqFt = getPricePerSqFt(unitInfo);
            
            if (displayMode === "avgByUnitType" && unitInfo.unitCount) {
              // Average mode tooltip
              return [
                `Property: ${unitInfo.propertyName}`,
                `Unit Type: ${unitInfo.unitType}`,
                `Avg Rent: $${Math.round(unitInfo.rent).toLocaleString()}`,
                `Avg Size: ${unitInfo.squareFootage ? `${Math.round(unitInfo.squareFootage)} sq ft` : 'N/A'}`,
                `Avg Price/SqFt: ${pricePerSqFt !== null ? `$${pricePerSqFt.toFixed(2)}` : 'N/A'}`,
                `Units Averaged: ${unitInfo.unitCount}`,
                `Bedrooms: ${unitInfo.bedrooms}`
              ];
            } else {
              // Vacancies mode tooltip
              return [
                `Property: ${unitInfo.propertyName}`,
                `Type: ${unitInfo.unitType}`,
                `Rent: $${unitInfo.rent.toLocaleString()}`,
                `Size: ${unitInfo.squareFootage || 'N/A'} sq ft`,
                `Price/SqFt: ${pricePerSqFt !== null ? `$${pricePerSqFt.toFixed(2)}` : 'N/A'}`,
                `Bedrooms: ${unitInfo.bedrooms}`,
                `Bathrooms: ${unitInfo.bathrooms || 'N/A'}`
              ];
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Square Footage',
        },
        // Dynamic scaling with 5% buffer for better visualization
        suggestedMin: undefined, // Let Chart.js calculate based on data
        suggestedMax: undefined, // Let Chart.js calculate based on data
        beginAtZero: false, // Don't force zero baseline
        grace: '5%', // Add 5% padding on left and right of data range
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      y: {
        title: {
          display: true,
          text: metricType === "unitPrice" ? 'Monthly Rent ($)' : 'Price per Sq Ft ($/sq ft)',
        },
        // Dynamic scaling with 5% buffer for better visualization
        suggestedMin: undefined, // Let Chart.js calculate based on data
        suggestedMax: undefined, // Let Chart.js calculate based on data
        beginAtZero: false, // Don't force zero baseline
        grace: '5%', // Add 5% padding above and below data range
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value: any) {
            return metricType === "unitPrice" 
              ? '$' + value.toLocaleString()
              : '$' + value.toFixed(2);
          }
        }
      }
    }
  }), [metricType, displayMode]);

  const barOptions = useMemo(() => {
    const filteredSubjectUnits = metricType === "pricePerSqFt" 
      ? subjectUnits.filter(unit => getPricePerSqFt(unit) !== null)
      : subjectUnits;
    const filteredCompetitorUnits = metricType === "pricePerSqFt"
      ? competitorUnits.filter(unit => getPricePerSqFt(unit) !== null)
      : competitorUnits;
    
    let allUnits: any[] = [];
    
    if (displayMode === "avgByUnitType") {
      // For average mode, use the unitData stored in datasets
      // We'll retrieve this from the context
      allUnits = []; // Will be populated from context
    } else {
      allUnits = [...filteredSubjectUnits, ...filteredCompetitorUnits];
    }
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              if (displayMode === "avgByUnitType") {
                // In average mode, get the unit from the dataset's unitData
                const unit = context.dataset.unitData?.[context.dataIndex];
                if (unit) {
                  const pricePerSqFt = getPricePerSqFt(unit);
                  return [
                    `Property: ${unit.propertyName}`,
                    `Unit Type: ${unit.unitType}`,
                    `Avg Rent: $${Math.round(unit.rent).toLocaleString()}`,
                    `Avg Size: ${unit.squareFootage ? `${Math.round(unit.squareFootage)} sq ft` : 'N/A'}`,
                    `Avg Price/SqFt: ${pricePerSqFt !== null ? `$${pricePerSqFt.toFixed(2)}` : 'N/A'}`,
                    `Units Averaged: ${unit.unitCount}`,
                    `Bedrooms: ${unit.bedrooms}`
                  ];
                }
              } else {
                // In vacancies mode
                const index = context.dataIndex;
                const unit = [...filteredSubjectUnits, ...filteredCompetitorUnits][index];
                if (unit) {
                  const pricePerSqFt = getPricePerSqFt(unit);
                  return [
                    `Property: ${unit.propertyName}`,
                    `Type: ${unit.unitType}`,
                    `Rent: $${unit.rent.toLocaleString()}`,
                    `Size: ${unit.squareFootage || 'N/A'} sq ft`,
                    `Price/SqFt: ${pricePerSqFt !== null ? `$${pricePerSqFt.toFixed(2)}` : 'N/A'}`,
                    `Bedrooms: ${unit.bedrooms}`,
                    `Bathrooms: ${unit.bathrooms || 'N/A'}`
                  ];
                }
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Units',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 20,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          title: {
            display: true,
            text: metricType === "unitPrice" ? 'Monthly Rent ($)' : 'Price per Sq Ft ($/sq ft)',
          },
          // Dynamic scaling with 5% buffer for better visualization
          suggestedMin: undefined, // Let Chart.js calculate based on data
          suggestedMax: undefined, // Let Chart.js calculate based on data
          beginAtZero: false, // Don't force zero baseline
          grace: '5%', // Add 5% padding above and below data range
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            callback: function(value: any) {
              return metricType === "unitPrice" 
                ? '$' + value.toLocaleString()
                : '$' + value.toFixed(2);
            }
          }
        }
      }
    };
  }, [subjectUnits, competitorUnits, metricType, displayMode]);

  // Calculate summary statistics
  const totalUnits = subjectUnits.length + competitorUnits.length;
  
  const avgSubjectRent = subjectUnits.length > 0 
    ? subjectUnits.reduce((sum, u) => sum + u.rent, 0) / subjectUnits.length 
    : 0;
  const avgCompetitorRent = competitorUnits.length > 0
    ? competitorUnits.reduce((sum, u) => sum + u.rent, 0) / competitorUnits.length
    : 0;
    
  const subjectUnitsWithSqFt = subjectUnits.filter(u => getPricePerSqFt(u) !== null);
  const competitorUnitsWithSqFt = competitorUnits.filter(u => getPricePerSqFt(u) !== null);
  
  const avgSubjectPricePerSqFt = subjectUnitsWithSqFt.length > 0
    ? subjectUnitsWithSqFt.reduce((sum, u) => sum + (getPricePerSqFt(u) || 0), 0) / subjectUnitsWithSqFt.length
    : 0;
  const avgCompetitorPricePerSqFt = competitorUnitsWithSqFt.length > 0
    ? competitorUnitsWithSqFt.reduce((sum, u) => sum + (getPricePerSqFt(u) || 0), 0) / competitorUnitsWithSqFt.length
    : 0;

  const displaySubjectMetric = metricType === "unitPrice" ? avgSubjectRent : avgSubjectPricePerSqFt;
  const displayCompetitorMetric = metricType === "unitPrice" ? avgCompetitorRent : avgCompetitorPricePerSqFt;
  const displayDifference = displaySubjectMetric - displayCompetitorMetric;

  return (
    <Card data-testid="interactive-comparison-chart">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Unit-Level Market Comparison</CardTitle>
              {selectedBedroomTypes.length > 0 && (
                <div className="flex gap-1.5">
                  {selectedBedroomTypes.map(type => (
                    <Badge 
                      key={type} 
                      variant="default" 
                      className="text-xs"
                      data-testid={`bedroom-type-indicator-${type.toLowerCase()}`}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" data-testid="subject-units-count">
                {subjectUnits.length} Your Units
              </Badge>
              <Badge variant="outline" data-testid="competitor-units-count">
                {competitorUnits.length} Competitor Units
              </Badge>
            </div>
          </div>
          
          {/* Chart Controls */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Chart Type:</span>
              <ToggleGroup 
                type="single" 
                value={chartType} 
                onValueChange={(value) => value && setChartType(value as "scatter" | "bar")}
                data-testid="toggle-chart-type"
              >
                <ToggleGroupItem value="scatter" aria-label="Scatter chart" data-testid="toggle-scatter">
                  Scatter
                </ToggleGroupItem>
                <ToggleGroupItem value="bar" aria-label="Bar chart" data-testid="toggle-bar">
                  Bar
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Metric:</span>
              <ToggleGroup 
                type="single" 
                value={metricType} 
                onValueChange={(value) => value && setMetricType(value as "unitPrice" | "pricePerSqFt")}
                data-testid="toggle-metric-type"
              >
                <ToggleGroupItem value="unitPrice" aria-label="Unit price" data-testid="toggle-unit-price">
                  Unit Price
                </ToggleGroupItem>
                <ToggleGroupItem value="pricePerSqFt" aria-label="Price per sq ft" data-testid="toggle-price-per-sqft">
                  Price per Sq Ft
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Display:</span>
              <ToggleGroup 
                type="single" 
                value={displayMode} 
                onValueChange={(value) => value && setDisplayMode(value as "vacancies" | "avgByUnitType")}
                data-testid="toggle-display-mode"
              >
                <ToggleGroupItem value="vacancies" aria-label="Individual units" data-testid="toggle-vacancies">
                  Vacancies
                </ToggleGroupItem>
                <ToggleGroupItem value="avgByUnitType" aria-label="Average by unit type" data-testid="toggle-avg-by-unit-type">
                  Avg by Unit Type
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4" data-testid="chart-loading">
            <Skeleton className="h-[400px] w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        ) : totalUnits > 0 ? (
          <>
            {/* Chart Container */}
            <div className="h-[400px] mb-6" data-testid={chartType === "scatter" ? "scatter-chart" : "bar-chart"}>
              {chartType === "scatter" ? (
                <Scatter data={scatterData} options={scatterOptions} />
              ) : (
                <Bar data={barData} options={barOptions} />
              )}
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg" data-testid="avg-subject-metric">
                <div className="text-2xl font-bold text-blue-600">
                  {metricType === "unitPrice" 
                    ? `$${Math.round(displaySubjectMetric).toLocaleString()}`
                    : `$${displaySubjectMetric.toFixed(2)}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {metricType === "unitPrice" ? "Your Avg Rent" : "Your Avg $/SqFt"}
                </div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg" data-testid="avg-competitor-metric">
                <div className="text-2xl font-bold text-red-600">
                  {metricType === "unitPrice" 
                    ? `$${Math.round(displayCompetitorMetric).toLocaleString()}`
                    : `$${displayCompetitorMetric.toFixed(2)}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {metricType === "unitPrice" ? "Competitor Avg Rent" : "Competitor Avg $/SqFt"}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg" data-testid="metric-difference">
                <div className={`text-2xl font-bold ${
                  displayDifference > 0 ? 'text-green-600' : 
                  displayDifference < 0 ? 'text-orange-600' : 
                  'text-gray-600'
                }`}>
                  {displayDifference > 0 ? '+' : ''}
                  {metricType === "unitPrice" 
                    ? `$${Math.round(displayDifference).toLocaleString()}`
                    : `$${displayDifference.toFixed(2)}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  Difference
                </div>
              </div>
            </div>

            {/* Chart Legend Info */}
            <div className="mt-4 text-xs text-muted-foreground text-center">
              {displayMode === "avgByUnitType" 
                ? chartType === "scatter" 
                  ? "Bubble size represents number of units averaged. Hover over points for average unit information by type."
                  : "Bars show average rent by unit type for each property. Hover over bars for detailed average information."
                : chartType === "scatter" 
                  ? "Bubble size represents bedroom count. Hover over points for detailed unit information."
                  : "Each property has its own color. S = Subject (Your) Units, C = Competitor Units. Hover over bars for detailed information."}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground" data-testid="no-data">
            No units match the current filter criteria. Try adjusting your filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}