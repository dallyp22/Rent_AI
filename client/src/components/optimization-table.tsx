import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, TrendingUp, TrendingDown, RotateCcw, RotateCw, RefreshCw, DollarSign } from "lucide-react";
import { formatCurrency, formatCurrencyChange, formatLargeCurrency } from "@/utils/formatters";
import type { PropertyUnit, OptimizationReport } from "@shared/schema";

interface OptimizationTableProps {
  units: PropertyUnit[];
  report: OptimizationReport;
  onApplyChanges?: (unitPrices: Record<string, number>) => void;
}

interface UnitWithDetails extends PropertyUnit {
  reasoning?: string;
  marketAverage?: string;
}

// Memoized table row component for better performance
const TableRow = memo(({ unit, modifiedPrices, handlePriceChange, handleQuickAdjust, getChangeIndicator, getStatusBadge, formatCurrency, formatCurrencyChange }: any) => {
  const unitWithDetails = unit as UnitWithDetails;
  const currentRent = parseFloat(unit.currentRent);
  const recommendedRent = unit.recommendedRent ? parseFloat(unit.recommendedRent) : currentRent;
  const marketAvg = unitWithDetails.marketAverage ? parseFloat(unitWithDetails.marketAverage) : currentRent;
  const newRent = modifiedPrices[unit.id] || recommendedRent;
  const change = newRent - currentRent;
  const annualImpact = change * 12;

  return (
    <tr 
      className="hover:bg-accent transition-colors duration-200" 
      data-testid={`unit-row-${unit.unitNumber}`}
    >
      <td className="px-4 py-3 font-medium" data-testid={`unit-number-${unit.unitNumber}`}>
        {unit.unitNumber}
      </td>
      <td className="px-4 py-3" data-testid={`unit-type-${unit.unitNumber}`}>
        {unit.unitType}
      </td>
      <td className="px-4 py-3" data-testid={`current-rent-${unit.unitNumber}`}>
        {formatCurrency(currentRent)}
      </td>
      <td className="px-4 py-3" data-testid={`ai-recommended-${unit.unitNumber}`}>
        <span className="text-blue-600 font-medium">
          {formatCurrency(recommendedRent)}
        </span>
      </td>
      <td className="px-4 py-3" data-testid={`market-avg-${unit.unitNumber}`}>
        {formatCurrency(marketAvg)}
      </td>
      <td className="px-4 py-3" data-testid={`editable-rent-${unit.unitNumber}`}>
        <Input
          type="number"
          value={newRent.toFixed(2)}
          onChange={(e) => handlePriceChange(unit.id, parseFloat(e.target.value) || 0)}
          className="w-28 font-medium price-input"
          step="0.01"
          min="0"
          data-testid={`input-rent-${unit.unitNumber}`}
        />
      </td>
      <td className="px-4 py-3" data-testid={`quick-adjust-${unit.unitNumber}`}>
        <div className="flex gap-1 quick-adjust-buttons">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleQuickAdjust(unit.id, -10)}
            data-testid={`button-minus-10-${unit.unitNumber}`}
            className="transition-all duration-200 hover:scale-105 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
          >
            -$10
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleQuickAdjust(unit.id, -5)}
            data-testid={`button-minus-5-${unit.unitNumber}`}
            className="transition-all duration-200 hover:scale-105 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
          >
            -$5
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleQuickAdjust(unit.id, 5)}
            data-testid={`button-plus-5-${unit.unitNumber}`}
            className="transition-all duration-200 hover:scale-105 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
          >
            +$5
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleQuickAdjust(unit.id, 10)}
            data-testid={`button-plus-10-${unit.unitNumber}`}
            className="transition-all duration-200 hover:scale-105 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
          >
            +$10
          </Button>
        </div>
      </td>
      <td className="px-4 py-3" data-testid={`change-${unit.unitNumber}`}>
        {getChangeIndicator(currentRent, newRent)}
      </td>
      <td className="px-4 py-3" data-testid={`impact-${unit.unitNumber}`}>
        <span className={
          annualImpact > 0 ? "text-green-600 font-medium" : 
          annualImpact < 0 ? "text-red-600 font-medium" : 
          "text-gray-600"
        }>
          {formatCurrencyChange(annualImpact, true)}/year
        </span>
      </td>
      <td className="px-4 py-3" data-testid={`status-${unit.unitNumber}`}>
        {getStatusBadge(unit.status)}
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

function OptimizationTable({ units, report, onApplyChanges }: OptimizationTableProps) {
  const [modifiedPrices, setModifiedPrices] = useState<Record<string, number>>({});
  const [selectedUnitType, setSelectedUnitType] = useState<string>("all");
  const [bulkFixedAmount, setBulkFixedAmount] = useState<string>("");
  const [history, setHistory] = useState<Record<string, number>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Initialize modified prices with recommended rents
  useEffect(() => {
    const initialPrices: Record<string, number> = {};
    units.forEach(unit => {
      const recommendedRent = unit.recommendedRent ? parseFloat(unit.recommendedRent) : parseFloat(unit.currentRent);
      initialPrices[unit.id] = recommendedRent;
    });
    setModifiedPrices(initialPrices);
    setHistory([initialPrices]);
    setHistoryIndex(0);
  }, [units]);

  // Get unique unit types for filtering
  const unitTypes = useMemo(() => {
    const types = new Set(units.map(unit => unit.unitType));
    return Array.from(types).sort();
  }, [units]);

  // Calculate real-time impact
  const impact = useMemo(() => {
    let totalMonthlyIncrease = 0;
    let affectedUnits = 0;
    let unitsIncreased = 0;
    let unitsDecreased = 0;

    units.forEach(unit => {
      const currentRent = parseFloat(unit.currentRent);
      const newRent = modifiedPrices[unit.id] || currentRent;
      const change = newRent - currentRent;

      if (change !== 0) {
        affectedUnits++;
        totalMonthlyIncrease += change;
        if (change > 0) unitsIncreased++;
        else unitsDecreased++;
      }
    });

    const avgPercentChange = affectedUnits > 0 
      ? (totalMonthlyIncrease / units.reduce((sum, unit) => sum + parseFloat(unit.currentRent), 0)) * 100
      : 0;

    return {
      totalMonthlyIncrease,
      totalAnnualIncrease: totalMonthlyIncrease * 12,
      affectedUnits,
      unitsIncreased,
      unitsDecreased,
      avgPercentChange: avgPercentChange.toFixed(2)
    };
  }, [modifiedPrices, units]);

  // Debounced price change handler to prevent excessive re-renders
  const handlePriceChange = useCallback((unitId: string, newPrice: number) => {
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Immediately update the price for responsive UI
    const updated = { ...modifiedPrices, [unitId]: newPrice };
    setModifiedPrices(updated);

    // Debounce the history update to avoid excessive history entries during rapid changes
    const timeout = setTimeout(() => {
      addToHistory(updated);
    }, 300);
    setDebounceTimeout(timeout);
  }, [modifiedPrices, debounceTimeout]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  const handleQuickAdjust = useCallback((unitId: string, amount: number) => {
    const currentPrice = modifiedPrices[unitId] || 0;
    const newPrice = Math.max(0, currentPrice + amount);
    // Use immediate update for quick adjustments without debouncing
    const updated = { ...modifiedPrices, [unitId]: newPrice };
    setModifiedPrices(updated);
    addToHistory(updated);
  }, [modifiedPrices]);

  const applyBulkPercentage = (percentage: number) => {
    const updated: Record<string, number> = {};
    const unitsToUpdate = selectedUnitType === "all" 
      ? units 
      : units.filter(u => u.unitType === selectedUnitType);

    unitsToUpdate.forEach(unit => {
      const currentPrice = modifiedPrices[unit.id] || parseFloat(unit.currentRent);
      updated[unit.id] = Math.round(currentPrice * (1 + percentage / 100));
    });

    const newPrices = { ...modifiedPrices, ...updated };
    setModifiedPrices(newPrices);
    addToHistory(newPrices);
  };

  const applyBulkFixed = (amount: number, operation: 'add' | 'subtract') => {
    const updated: Record<string, number> = {};
    const unitsToUpdate = selectedUnitType === "all" 
      ? units 
      : units.filter(u => u.unitType === selectedUnitType);

    unitsToUpdate.forEach(unit => {
      const currentPrice = modifiedPrices[unit.id] || parseFloat(unit.currentRent);
      const adjustedAmount = operation === 'add' ? amount : -amount;
      updated[unit.id] = Math.max(0, currentPrice + adjustedAmount);
    });

    const newPrices = { ...modifiedPrices, ...updated };
    setModifiedPrices(newPrices);
    addToHistory(newPrices);
  };

  const setToMarket = (multiplier: number = 1) => {
    const updated: Record<string, number> = {};
    const unitsToUpdate = selectedUnitType === "all" 
      ? units 
      : units.filter(u => u.unitType === selectedUnitType);

    unitsToUpdate.forEach(unit => {
      const unitWithDetails = unit as UnitWithDetails;
      const marketAvg = unitWithDetails.marketAverage ? parseFloat(unitWithDetails.marketAverage) : parseFloat(unit.currentRent);
      updated[unit.id] = Math.round(marketAvg * multiplier);
    });

    const newPrices = { ...modifiedPrices, ...updated };
    setModifiedPrices(newPrices);
    addToHistory(newPrices);
  };

  const resetToRecommendations = () => {
    const updated: Record<string, number> = {};
    units.forEach(unit => {
      const recommendedRent = unit.recommendedRent ? parseFloat(unit.recommendedRent) : parseFloat(unit.currentRent);
      updated[unit.id] = recommendedRent;
    });
    setModifiedPrices(updated);
    addToHistory(updated);
  };

  const addToHistory = (prices: Record<string, number>) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(prices);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setModifiedPrices(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setModifiedPrices(history[historyIndex + 1]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "vacant":
        return <Badge variant="destructive" data-testid={`status-vacant`}>Vacant</Badge>;
      case "occupied":
        return <Badge variant="default" className="bg-green-100 text-green-800" data-testid={`status-occupied`}>Occupied</Badge>;
      case "notice_given":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800" data-testid={`status-notice`}>Notice Given</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-unknown`}>{status}</Badge>;
    }
  };


  const getChangeIndicator = (currentRent: number, newRent: number) => {
    const change = newRent - currentRent;
    if (change > 0) {
      return (
        <span className="flex items-center text-green-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          {formatCurrencyChange(change)}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-red-600">
          <TrendingDown className="w-4 h-4 mr-1" />
          {formatCurrencyChange(change)}
        </span>
      );
    }
    return <span className="text-gray-500">{formatCurrency(0)}</span>;
  };

  return (
    <div className="space-y-6 optimization-table" data-testid="optimization-table">
      {/* Bulk Adjustment Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bulk Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unit Type Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Apply to:</span>
            <Select value={selectedUnitType} onValueChange={setSelectedUnitType}>
              <SelectTrigger className="w-[200px]" data-testid="select-unit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {unitTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Percentage Adjustments */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-32">Percentage:</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyBulkPercentage(-5)}
                data-testid="button-bulk-minus-5"
              >
                -5%
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyBulkPercentage(-2)}
                data-testid="button-bulk-minus-2"
              >
                -2%
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyBulkPercentage(2)}
                data-testid="button-bulk-plus-2"
              >
                +2%
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => applyBulkPercentage(5)}
                data-testid="button-bulk-plus-5"
              >
                +5%
              </Button>
            </div>
          </div>

          {/* Fixed Amount Adjustments */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-32">Fixed Amount:</span>
            <Input
              type="number"
              placeholder="Amount"
              value={bulkFixedAmount}
              onChange={(e) => setBulkFixedAmount(e.target.value)}
              className="w-32"
              data-testid="input-bulk-amount"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => bulkFixedAmount && applyBulkFixed(parseFloat(bulkFixedAmount), 'add')}
              data-testid="button-bulk-add"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => bulkFixedAmount && applyBulkFixed(parseFloat(bulkFixedAmount), 'subtract')}
              data-testid="button-bulk-subtract"
            >
              <Minus className="w-4 h-4 mr-1" />
              Subtract
            </Button>
          </div>

          {/* Market-based Presets */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-32">Market Presets:</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setToMarket(1)}
                data-testid="button-set-market"
              >
                Set to Market
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setToMarket(1.05)}
                data-testid="button-set-105-market"
              >
                105% of Market
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetToRecommendations}
                data-testid="button-reset-ai"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset to AI
              </Button>
            </div>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-32">History:</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              data-testid="button-undo"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Undo
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              data-testid="button-redo"
            >
              <RotateCw className="w-4 h-4 mr-1" />
              Redo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 transition-all duration-300" data-testid="impact-cards">
        <Card className={`transition-all duration-500 ${impact.totalMonthlyIncrease > 0 ? "border-green-200 bg-green-50 shadow-green-100 shadow-md" : impact.totalMonthlyIncrease < 0 ? "border-red-200 bg-red-50 shadow-red-100 shadow-md" : ""}`}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold transition-all duration-300" data-testid="monthly-impact">
              {formatLargeCurrency(impact.totalMonthlyIncrease)}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Impact</div>
          </CardContent>
        </Card>
        <Card className={`transition-all duration-500 ${impact.totalAnnualIncrease > 0 ? "border-green-200 bg-green-50 shadow-green-100 shadow-md" : impact.totalAnnualIncrease < 0 ? "border-red-200 bg-red-50 shadow-red-100 shadow-md" : ""}`}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold transition-all duration-300" data-testid="annual-impact">
              {formatLargeCurrency(impact.totalAnnualIncrease)}
            </div>
            <div className="text-sm text-muted-foreground">Annual Impact</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold" data-testid="affected-units-count">
              {impact.affectedUnits}
            </div>
            <div className="text-sm text-muted-foreground">Units Changed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="units-increased">
              ↑ {impact.unitsIncreased}
            </div>
            <div className="text-sm text-muted-foreground">Increased</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="units-decreased">
              ↓ {impact.unitsDecreased}
            </div>
            <div className="text-sm text-muted-foreground">Decreased</div>
          </CardContent>
        </Card>
      </div>

      {/* Units Table */}
      <div className="bg-muted rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Unit</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Current</th>
                <th className="px-4 py-3 text-left font-semibold">AI Rec.</th>
                <th className="px-4 py-3 text-left font-semibold">Market Avg</th>
                <th className="px-4 py-3 text-left font-semibold">New Price</th>
                <th className="px-4 py-3 text-left font-semibold">Quick Adjust</th>
                <th className="px-4 py-3 text-left font-semibold">Change</th>
                <th className="px-4 py-3 text-left font-semibold">Annual</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((unit) => (
                <TableRow
                  key={unit.id}
                  unit={unit}
                  modifiedPrices={modifiedPrices}
                  handlePriceChange={handlePriceChange}
                  handleQuickAdjust={handleQuickAdjust}
                  getChangeIndicator={getChangeIndicator}
                  getStatusBadge={getStatusBadge}
                  formatCurrency={formatCurrency}
                  formatCurrencyChange={formatCurrencyChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Changes Button */}
      {onApplyChanges && (
        <div className="flex justify-end">
          <Button 
            size="lg"
            onClick={() => onApplyChanges(modifiedPrices)}
            disabled={impact.affectedUnits === 0}
            data-testid="button-apply-changes"
            className="px-8"
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Apply Changes ({impact.affectedUnits} units)
          </Button>
        </div>
      )}
    </div>
  );
}

export default memo(OptimizationTable);