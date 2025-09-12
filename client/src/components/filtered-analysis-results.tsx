import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import MarketPositionGauge from "@/components/analysis/market-position-gauge";
import CompetitiveAdvantagesGrid from "@/components/analysis/competitive-advantages-grid";
import DynamicInsightsPanel from "@/components/analysis/dynamic-insights-panel";
import InteractiveComparisonChart from "@/components/analysis/interactive-comparison-chart";
import type { FilteredAnalysis } from "@shared/schema";

interface FilteredAnalysisResultsProps {
  analysis: FilteredAnalysis;
  isLoading?: boolean;
}

// Skeleton Loading Component
const LoadingSkeleton = memo(() => (
  <div className="flex-1 space-y-6" data-testid="analysis-loading">
    {/* Top Row: Market Position and Competitive Advantages */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-[280px] rounded-lg" />
      <Skeleton className="h-[280px] rounded-lg" />
    </div>
    
    {/* Interactive Chart */}
    <Skeleton className="h-[400px] rounded-lg" />
    
    {/* AI Insights Panel */}
    <Skeleton className="h-[200px] rounded-lg" />
    
    {/* Summary Statistics */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  </div>
));

const FilteredAnalysisResults = memo(({ 
  analysis, 
  isLoading = false 
}: FilteredAnalysisResultsProps) => {
  // Handle loading state or missing analysis data
  if (isLoading || !analysis) {
    return <LoadingSkeleton />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const statVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <motion.div 
      className="flex-1 space-y-6" 
      data-testid="filtered-analysis-results"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Row: Market Position and Competitive Advantages - NEW ARRANGEMENT */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`gauge-${analysis.percentileRank}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <MarketPositionGauge 
              percentileRank={analysis.percentileRank}
              marketPosition={analysis.marketPosition}
              pricingPowerScore={analysis.pricingPowerScore}
            />
          </motion.div>
        </AnimatePresence>
        
        {analysis.competitiveEdges && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`edges-${JSON.stringify(analysis.competitiveEdges)}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <CompetitiveAdvantagesGrid 
                competitiveEdges={analysis.competitiveEdges}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* Interactive Comparison Chart - FULL WIDTH */}
      {analysis.subjectUnits && analysis.competitorUnits && (
        <motion.div variants={itemVariants}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`chart-${analysis.unitCount}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <InteractiveComparisonChart 
                subjectUnits={analysis.subjectUnits}
                competitorUnits={analysis.competitorUnits}
                isLoading={isLoading}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* AI Insights Panel - FULL WIDTH */}
      <motion.div variants={itemVariants}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`insights-${analysis.aiInsights?.length || 0}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <DynamicInsightsPanel 
              aiInsights={analysis.aiInsights || []}
              isLoading={isLoading}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Summary Statistics with Animated Numbers */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={itemVariants}
      >
        <motion.div 
          className="text-center p-4 bg-muted rounded-lg transition-all hover:shadow-md" 
          data-testid="unit-count"
          variants={statVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            className="text-2xl font-bold text-primary" 
            data-testid="unit-count-value"
            key={analysis.unitCount}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {analysis.unitCount}
          </motion.div>
          <div className="text-sm text-muted-foreground">Your Units</div>
        </motion.div>
        
        <motion.div 
          className="text-center p-4 bg-muted rounded-lg transition-all hover:shadow-md" 
          data-testid="avg-rent"
          variants={statVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            className="text-2xl font-bold text-primary" 
            data-testid="avg-rent-value"
            key={analysis.avgRent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            ${analysis.avgRent.toLocaleString()}
          </motion.div>
          <div className="text-sm text-muted-foreground">Avg Rent</div>
        </motion.div>
        
        <motion.div 
          className="text-center p-4 bg-muted rounded-lg transition-all hover:shadow-md" 
          data-testid="location-score"
          variants={statVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            className="text-2xl font-bold text-primary" 
            data-testid="location-score-value"
            key={analysis.locationScore}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {analysis.locationScore}/100
          </motion.div>
          <div className="text-sm text-muted-foreground">Location Score</div>
        </motion.div>
        
        <motion.div 
          className="text-center p-4 bg-muted rounded-lg transition-all hover:shadow-md" 
          data-testid="price-per-sqft"
          variants={statVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            className="text-2xl font-bold text-primary" 
            data-testid="price-per-sqft-value"
            key={analysis.pricePerSqFt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            ${analysis.pricePerSqFt}
          </motion.div>
          <div className="text-sm text-muted-foreground">Price/Sq Ft</div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

export default FilteredAnalysisResults;