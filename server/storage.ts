import { 
  type Property, 
  type InsertProperty,
  type PropertyAnalysis,
  type InsertPropertyAnalysis,
  type CompetitorProperty,
  type InsertCompetitorProperty,
  type PropertyUnit,
  type InsertPropertyUnit,
  type OptimizationReport,
  type InsertOptimizationReport,
  type ScrapingJob,
  type InsertScrapingJob,
  type ScrapedProperty,
  type InsertScrapedProperty,
  type ScrapedUnit,
  type InsertScrapedUnit,
  type FilterCriteria,
  type FilteredAnalysis
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Properties
  createProperty(property: InsertProperty): Promise<Property>;
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  
  // Property Analysis
  createPropertyAnalysis(analysis: InsertPropertyAnalysis): Promise<PropertyAnalysis>;
  getPropertyAnalysis(propertyId: string): Promise<PropertyAnalysis | undefined>;
  
  // Competitor Properties (Legacy - will be replaced by scraped data)
  createCompetitorProperty(property: InsertCompetitorProperty): Promise<CompetitorProperty>;
  getAllCompetitorProperties(): Promise<CompetitorProperty[]>;
  getSelectedCompetitorProperties(ids: string[]): Promise<CompetitorProperty[]>;
  
  // Property Units
  createPropertyUnit(unit: InsertPropertyUnit): Promise<PropertyUnit>;
  getPropertyUnits(propertyId: string): Promise<PropertyUnit[]>;
  updatePropertyUnit(id: string, updates: Partial<PropertyUnit>): Promise<PropertyUnit | undefined>;
  
  // Optimization Reports
  createOptimizationReport(report: InsertOptimizationReport): Promise<OptimizationReport>;
  getOptimizationReport(propertyId: string): Promise<OptimizationReport | undefined>;
  
  // Scrapezy Integration
  createScrapingJob(job: InsertScrapingJob): Promise<ScrapingJob>;
  getScrapingJob(id: string): Promise<ScrapingJob | undefined>;
  getScrapingJobsByProperty(propertyId: string): Promise<ScrapingJob[]>;
  updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob | undefined>;
  
  createScrapedProperty(property: InsertScrapedProperty): Promise<ScrapedProperty>;
  getScrapedPropertiesByJob(scrapingJobId: string): Promise<ScrapedProperty[]>;
  getAllScrapedCompetitors(): Promise<ScrapedProperty[]>;
  getSelectedScrapedProperties(ids: string[]): Promise<ScrapedProperty[]>;
  
  createScrapedUnit(unit: InsertScrapedUnit): Promise<ScrapedUnit>;
  getScrapedUnitsByProperty(propertyId: string): Promise<ScrapedUnit[]>;
  
  // Get subject property (marked as isSubjectProperty: true)
  getSubjectScrapedProperty(): Promise<ScrapedProperty | null>;
  
  // Get scraped property by ID
  getScrapedProperty(id: string): Promise<ScrapedProperty | undefined>;
  
  // Get original property ID from scraped property
  getOriginalPropertyIdFromScraped(scrapedPropertyId: string): Promise<string | null>;
  
  // Filtered analysis methods
  getFilteredScrapedUnits(criteria: FilterCriteria): Promise<ScrapedUnit[]>;
  generateFilteredAnalysis(propertyId: string, criteria: FilterCriteria): Promise<FilteredAnalysis>;
}

export class MemStorage implements IStorage {
  private properties: Map<string, Property>;
  private propertyAnalyses: Map<string, PropertyAnalysis>;
  private competitorProperties: Map<string, CompetitorProperty>;
  private propertyUnits: Map<string, PropertyUnit>;
  private optimizationReports: Map<string, OptimizationReport>;
  private scrapingJobs: Map<string, ScrapingJob>;
  private scrapedProperties: Map<string, ScrapedProperty>;
  private scrapedUnits: Map<string, ScrapedUnit>;

  constructor() {
    this.properties = new Map();
    this.propertyAnalyses = new Map();
    this.competitorProperties = new Map();
    this.propertyUnits = new Map();
    this.optimizationReports = new Map();
    this.scrapingJobs = new Map();
    this.scrapedProperties = new Map();
    this.scrapedUnits = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed some competitor properties for demonstration
    const competitors: CompetitorProperty[] = [
      {
        id: randomUUID(),
        name: "Sunset Gardens Apartments",
        address: "456 Oak Avenue",
        distance: "0.3",
        priceRange: "$1,450-$2,100",
        totalUnits: 65,
        builtYear: 2018,
        amenities: ["Pool", "Gym", "Pet Friendly"],
        matchScore: "92.0",
        vacancyRate: "11.2",
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Riverside Commons",
        address: "789 River Road",
        distance: "0.7",
        priceRange: "$1,350-$1,950",
        totalUnits: 48,
        builtYear: 2016,
        amenities: ["Pool", "Laundry", "Parking"],
        matchScore: "88.0",
        vacancyRate: "7.1",
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Metro Plaza Residences",
        address: "321 Metro Street",
        distance: "1.2",
        priceRange: "$1,600-$2,300",
        totalUnits: 82,
        builtYear: 2020,
        amenities: ["Pool", "Gym", "Concierge", "Rooftop Deck"],
        matchScore: "76.0",
        vacancyRate: "5.8",
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Parkview Estates",
        address: "555 Park Lane",
        distance: "0.9",
        priceRange: "$1,400-$2,000",
        totalUnits: 72,
        builtYear: 2017,
        amenities: ["Pool", "Gym", "Pet Friendly", "Balconies"],
        matchScore: "84.0",
        vacancyRate: "12.1",
        createdAt: new Date()
      }
    ];

    competitors.forEach(competitor => {
      this.competitorProperties.set(competitor.id, competitor);
    });

    // No sample scraped properties or units - these will be populated from real scraping only
    // This ensures only valid apartments.com URLs are used in the scraping workflow
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = { 
      ...insertProperty, 
      id, 
      createdAt: new Date(),
      city: insertProperty.city ?? null,
      state: insertProperty.state ?? null,
      propertyType: insertProperty.propertyType ?? null,
      totalUnits: insertProperty.totalUnits ?? null,
      builtYear: insertProperty.builtYear ?? null,
      squareFootage: insertProperty.squareFootage ?? null,
      parkingSpaces: insertProperty.parkingSpaces ?? null,
      amenities: insertProperty.amenities ? [...insertProperty.amenities] : null
    };
    this.properties.set(id, property);
    return property;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async createPropertyAnalysis(insertAnalysis: InsertPropertyAnalysis): Promise<PropertyAnalysis> {
    const id = randomUUID();
    const analysis: PropertyAnalysis = { 
      ...insertAnalysis, 
      id, 
      createdAt: new Date(),
      competitiveAdvantages: Array.isArray(insertAnalysis.competitiveAdvantages) ? [...insertAnalysis.competitiveAdvantages] : [],
      recommendations: Array.isArray(insertAnalysis.recommendations) ? [...insertAnalysis.recommendations] : []
    };
    this.propertyAnalyses.set(insertAnalysis.propertyId, analysis);
    return analysis;
  }

  async getPropertyAnalysis(propertyId: string): Promise<PropertyAnalysis | undefined> {
    return Array.from(this.propertyAnalyses.values()).find(
      analysis => analysis.propertyId === propertyId
    );
  }

  async createCompetitorProperty(insertProperty: InsertCompetitorProperty): Promise<CompetitorProperty> {
    const id = randomUUID();
    const property: CompetitorProperty = { 
      ...insertProperty, 
      id, 
      createdAt: new Date(),
      amenities: Array.isArray(insertProperty.amenities) ? [...insertProperty.amenities] : []
    };
    this.competitorProperties.set(id, property);
    return property;
  }

  async getAllCompetitorProperties(): Promise<CompetitorProperty[]> {
    return Array.from(this.competitorProperties.values());
  }

  async getSelectedCompetitorProperties(ids: string[]): Promise<CompetitorProperty[]> {
    return ids.map(id => this.competitorProperties.get(id)).filter(Boolean) as CompetitorProperty[];
  }

  async createPropertyUnit(insertUnit: InsertPropertyUnit): Promise<PropertyUnit> {
    const id = randomUUID();
    const unit: PropertyUnit = { 
      ...insertUnit, 
      id, 
      createdAt: new Date(),
      status: insertUnit.status || "occupied",
      recommendedRent: insertUnit.recommendedRent ?? null
    };
    this.propertyUnits.set(id, unit);
    return unit;
  }

  async getPropertyUnits(propertyId: string): Promise<PropertyUnit[]> {
    return Array.from(this.propertyUnits.values()).filter(
      unit => unit.propertyId === propertyId
    );
  }

  async updatePropertyUnit(id: string, updates: Partial<PropertyUnit>): Promise<PropertyUnit | undefined> {
    const unit = this.propertyUnits.get(id);
    if (!unit) return undefined;
    
    const updatedUnit = { ...unit, ...updates };
    this.propertyUnits.set(id, updatedUnit);
    return updatedUnit;
  }

  async createOptimizationReport(insertReport: InsertOptimizationReport): Promise<OptimizationReport> {
    const id = randomUUID();
    const report: OptimizationReport = { ...insertReport, id, createdAt: new Date() };
    this.optimizationReports.set(insertReport.propertyId, report);
    return report;
  }

  async getOptimizationReport(propertyId: string): Promise<OptimizationReport | undefined> {
    return Array.from(this.optimizationReports.values()).find(
      report => report.propertyId === propertyId
    );
  }

  // Scrapezy Integration Methods
  async createScrapingJob(insertJob: InsertScrapingJob): Promise<ScrapingJob> {
    const id = randomUUID();
    const job: ScrapingJob = { 
      ...insertJob, 
      id, 
      createdAt: new Date(),
      completedAt: null,
      scrapezyJobId: insertJob.scrapezyJobId ?? null,
      status: insertJob.status || "pending",
      results: insertJob.results ?? null,
      errorMessage: insertJob.errorMessage ?? null
    };
    this.scrapingJobs.set(id, job);
    return job;
  }

  async getScrapingJob(id: string): Promise<ScrapingJob | undefined> {
    return this.scrapingJobs.get(id);
  }

  async getScrapingJobsByProperty(propertyId: string): Promise<ScrapingJob[]> {
    return Array.from(this.scrapingJobs.values()).filter(
      job => job.propertyId === propertyId
    );
  }

  async updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob | undefined> {
    const job = this.scrapingJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    this.scrapingJobs.set(id, updatedJob);
    return updatedJob;
  }

  async createScrapedProperty(insertProperty: InsertScrapedProperty): Promise<ScrapedProperty> {
    const id = randomUUID();
    const property: ScrapedProperty = { 
      ...insertProperty, 
      id, 
      createdAt: new Date(),
      distance: insertProperty.distance ?? null,
      isSubjectProperty: insertProperty.isSubjectProperty ?? null,
      matchScore: insertProperty.matchScore ?? null
    };
    this.scrapedProperties.set(id, property);
    return property;
  }

  async getScrapedPropertiesByJob(scrapingJobId: string): Promise<ScrapedProperty[]> {
    return Array.from(this.scrapedProperties.values()).filter(
      property => property.scrapingJobId === scrapingJobId
    );
  }

  async getAllScrapedCompetitors(): Promise<ScrapedProperty[]> {
    return Array.from(this.scrapedProperties.values()).filter(
      property => !property.isSubjectProperty
    );
  }

  async getSelectedScrapedProperties(ids: string[]): Promise<ScrapedProperty[]> {
    return ids.map(id => this.scrapedProperties.get(id)).filter(Boolean) as ScrapedProperty[];
  }

  async createScrapedUnit(insertUnit: InsertScrapedUnit): Promise<ScrapedUnit> {
    const id = randomUUID();
    const unit: ScrapedUnit = { 
      ...insertUnit, 
      id, 
      createdAt: new Date(),
      squareFootage: insertUnit.squareFootage ?? null,
      status: insertUnit.status ?? null,
      unitNumber: insertUnit.unitNumber ?? null,
      bedrooms: insertUnit.bedrooms ?? null,
      bathrooms: insertUnit.bathrooms ?? null,
      rent: insertUnit.rent ?? null,
      availabilityDate: insertUnit.availabilityDate ?? null
    };
    this.scrapedUnits.set(id, unit);
    return unit;
  }

  async getScrapedUnitsByProperty(propertyId: string): Promise<ScrapedUnit[]> {
    return Array.from(this.scrapedUnits.values()).filter(
      unit => unit.propertyId === propertyId
    );
  }

  async getSubjectScrapedProperty(): Promise<ScrapedProperty | null> {
    const subjectProperty = Array.from(this.scrapedProperties.values()).find(
      property => property.isSubjectProperty === true
    );
    return subjectProperty || null;
  }

  async getScrapedProperty(id: string): Promise<ScrapedProperty | undefined> {
    return this.scrapedProperties.get(id);
  }

  async getOriginalPropertyIdFromScraped(scrapedPropertyId: string): Promise<string | null> {
    const scrapedProperty = await this.getScrapedProperty(scrapedPropertyId);
    if (!scrapedProperty) return null;
    
    // Get the scraping job associated with this scraped property
    const scrapingJob = await this.getScrapingJob(scrapedProperty.scrapingJobId);
    if (!scrapingJob) return null;
    
    // Return the original property ID from the scraping job
    return scrapingJob.propertyId;
  }

  async getFilteredScrapedUnits(criteria: FilterCriteria): Promise<ScrapedUnit[]> {
    let units = Array.from(this.scrapedUnits.values());

    // Filter by bedroom types
    if (criteria.bedroomTypes.length > 0) {
      units = units.filter(unit => {
        if (criteria.bedroomTypes.includes("Studio") && (unit.bedrooms === 0 || unit.unitType.toLowerCase().includes("studio"))) return true;
        if (criteria.bedroomTypes.includes("1BR") && unit.bedrooms === 1) return true;
        if (criteria.bedroomTypes.includes("2BR") && unit.bedrooms === 2) return true;
        if (criteria.bedroomTypes.includes("3BR") && unit.bedrooms === 3) return true;
        return false;
      });
    }

    // Filter by price range
    units = units.filter(unit => {
      if (!unit.rent) return false;
      const rent = parseFloat(unit.rent.toString());
      return rent >= criteria.priceRange.min && rent <= criteria.priceRange.max;
    });

    // Filter by square footage range
    units = units.filter(unit => {
      if (!unit.squareFootage) return true; // Keep units without sq ft data
      return unit.squareFootage >= criteria.squareFootageRange.min && unit.squareFootage <= criteria.squareFootageRange.max;
    });

    // Filter by availability (simplified for demo)
    if (criteria.availability === "now") {
      units = units.filter(unit => unit.status === "available");
    } else if (criteria.availability === "30days") {
      units = units.filter(unit => unit.status === "available" || unit.status === "pending");
    }
    // For 60days, keep all units

    return units;
  }

  async generateFilteredAnalysis(propertyId: string, criteria: FilterCriteria): Promise<FilteredAnalysis> {
    // Get filtered units from all properties for comparison
    const allFilteredUnits = await this.getFilteredScrapedUnits(criteria);
    
    // Get property-specific units
    const propertyUnits = allFilteredUnits.filter(unit => unit.propertyId === propertyId);

    // Calculate metrics
    const unitCount = propertyUnits.length;
    const avgRent = propertyUnits.reduce((sum, unit) => sum + (unit.rent ? parseFloat(unit.rent.toString()) : 0), 0) / unitCount || 0;
    const avgSqFt = propertyUnits.reduce((sum, unit) => sum + (unit.squareFootage || 0), 0) / unitCount || 0;
    const pricePerSqFt = avgSqFt > 0 ? avgRent / avgSqFt : 0;

    // Calculate market percentile (simplified)
    const allRents = allFilteredUnits.map(unit => parseFloat(unit.rent?.toString() || "0")).filter(rent => rent > 0).sort((a, b) => a - b);
    let percentileRank = 50; // Default
    if (allRents.length > 0 && avgRent > 0) {
      const position = allRents.findIndex(rent => rent >= avgRent);
      percentileRank = position >= 0 ? Math.round((position / allRents.length) * 100) : 95;
    }

    // Generate pricing power score (0-100)
    const pricingPowerScore = Math.min(100, Math.max(0, percentileRank + (pricePerSqFt > 2.5 ? 10 : -5)));

    // Generate competitive advantages based on data
    const competitiveAdvantages = [];
    if (percentileRank > 75) competitiveAdvantages.push("Premium market positioning");
    if (pricePerSqFt > 2.0) competitiveAdvantages.push("High value per square foot");
    if (avgSqFt > 900) competitiveAdvantages.push("Spacious unit layouts");
    if (unitCount > 10) competitiveAdvantages.push("Diverse unit mix available");

    // Generate recommendations
    const recommendations = [];
    if (percentileRank < 50) recommendations.push("Consider premium amenity upgrades");
    if (pricePerSqFt < 1.8) recommendations.push("Opportunity for rent optimization");
    if (unitCount < 5) recommendations.push("Limited inventory may create scarcity value");

    // Generate market position description
    let marketPosition = "Market Average";
    if (percentileRank > 75) marketPosition = "Premium Market Leader";
    else if (percentileRank > 50) marketPosition = "Above Market Average";
    else if (percentileRank > 25) marketPosition = "Below Market Average";
    else marketPosition = "Value Market Position";

    return {
      marketPosition,
      pricingPowerScore,
      competitiveAdvantages,
      recommendations,
      unitCount,
      avgRent: Math.round(avgRent),
      percentileRank,
      locationScore: Math.min(100, Math.max(0, percentileRank + 5)), // Simplified
      amenityScore: Math.min(100, Math.max(0, pricingPowerScore - 10)), // Simplified
      pricePerSqFt: Math.round(pricePerSqFt * 100) / 100
    };
  }
}

export const storage = new MemStorage();
