import { 
  // New property profiles system types
  type PropertyProfile,
  type InsertPropertyProfile,
  type AnalysisSession,
  type InsertAnalysisSession,
  type SessionPropertyProfile,
  type InsertSessionPropertyProfile,
  // Legacy types (for backward compatibility)
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
  type FilteredAnalysis,
  type UnitComparison,
  type CompetitiveEdges
} from "@shared/schema";
import { randomUUID } from "crypto";

// Workflow State interface (updated for property profiles)
export interface WorkflowState {
  // Legacy support
  propertyId?: string;
  selectedCompetitorIds?: string[];
  // New property profiles support
  analysisSessionId?: string;
  selectedPropertyProfileIds?: string[];
  scrapingJobId?: string;
  filterCriteria?: any;
  currentStage: 'input' | 'summarize' | 'analyze' | 'optimize';
}

export interface IStorage {
  // NEW: Property Profiles System
  createPropertyProfile(profile: InsertPropertyProfile): Promise<PropertyProfile>;
  getPropertyProfile(id: string): Promise<PropertyProfile | undefined>;
  getAllPropertyProfiles(): Promise<PropertyProfile[]>;
  getPropertyProfilesByType(profileType: 'subject' | 'competitor'): Promise<PropertyProfile[]>;
  updatePropertyProfile(id: string, updates: Partial<PropertyProfile>): Promise<PropertyProfile | undefined>;
  deletePropertyProfile(id: string): Promise<boolean>;
  
  // Analysis Sessions
  createAnalysisSession(session: InsertAnalysisSession): Promise<AnalysisSession>;
  getAnalysisSession(id: string): Promise<AnalysisSession | undefined>;
  getAllAnalysisSessions(): Promise<AnalysisSession[]>;
  updateAnalysisSession(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | undefined>;
  deleteAnalysisSession(id: string): Promise<boolean>;
  
  // Session Property Profiles (many-to-many relationships)
  addPropertyProfileToSession(sessionPropertyProfile: InsertSessionPropertyProfile): Promise<SessionPropertyProfile>;
  removePropertyProfileFromSession(sessionId: string, propertyProfileId: string): Promise<boolean>;
  getPropertyProfilesInSession(sessionId: string): Promise<PropertyProfile[]>;
  getSessionsForPropertyProfile(propertyProfileId: string): Promise<AnalysisSession[]>;
  
  // Multi-property analysis support
  generateMultiPropertyAnalysis(sessionId: string, criteria: FilterCriteria): Promise<FilteredAnalysis>;
  getSubjectPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]>;
  getCompetitorPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]>;
  
  // LEGACY: Properties (maintained for backward compatibility)
  createProperty(property: InsertProperty): Promise<Property>;
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  
  // Property Analysis (updated to support both legacy and new systems)
  createPropertyAnalysis(analysis: InsertPropertyAnalysis): Promise<PropertyAnalysis>;
  getPropertyAnalysis(propertyId: string): Promise<PropertyAnalysis | undefined>;
  getPropertyAnalysisBySession(sessionId: string): Promise<PropertyAnalysis | undefined>;
  
  // Competitor Properties (Legacy - will be replaced by scraped data)
  createCompetitorProperty(property: InsertCompetitorProperty): Promise<CompetitorProperty>;
  getAllCompetitorProperties(): Promise<CompetitorProperty[]>;
  getSelectedCompetitorProperties(ids: string[]): Promise<CompetitorProperty[]>;
  
  // Property Units
  createPropertyUnit(unit: InsertPropertyUnit): Promise<PropertyUnit>;
  getPropertyUnits(propertyId: string): Promise<PropertyUnit[]>;
  updatePropertyUnit(id: string, updates: Partial<PropertyUnit>): Promise<PropertyUnit | undefined>;
  clearPropertyUnits(propertyId: string): Promise<void>;
  
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
  updateScrapedProperty(id: string, updates: Partial<ScrapedProperty>): Promise<ScrapedProperty | undefined>;
  
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
  
  // Workflow State Management
  getWorkflowState(propertyId: string): Promise<WorkflowState | null>;
  getWorkflowStateBySession(sessionId: string): Promise<WorkflowState | null>;
  saveWorkflowState(state: WorkflowState): Promise<WorkflowState>;
  
  // NEW: Property Profile specific retrieval methods
  getPropertyUnitsByProfile(propertyProfileId: string): Promise<PropertyUnit[]>;
  getScrapingJobsByProfile(propertyProfileId: string): Promise<ScrapingJob[]>;
  getScrapingJobsBySession(sessionId: string): Promise<ScrapingJob[]>;
  getAllOptimizationReports(): Promise<OptimizationReport[]>;
}

export class MemStorage implements IStorage {
  // New property profiles system
  private propertyProfiles: Map<string, PropertyProfile>;
  private analysisSessions: Map<string, AnalysisSession>;
  private sessionPropertyProfiles: Map<string, SessionPropertyProfile>;
  
  // Legacy maps (maintained for backward compatibility)
  private properties: Map<string, Property>;
  private propertyAnalyses: Map<string, PropertyAnalysis>;
  private competitorProperties: Map<string, CompetitorProperty>;
  private propertyUnits: Map<string, PropertyUnit>;
  private optimizationReports: Map<string, OptimizationReport>;
  private scrapingJobs: Map<string, ScrapingJob>;
  private scrapedProperties: Map<string, ScrapedProperty>;
  private scrapedUnits: Map<string, ScrapedUnit>;
  private workflowStates: Map<string, WorkflowState>;

  constructor() {
    // Initialize new property profiles system
    this.propertyProfiles = new Map();
    this.analysisSessions = new Map();
    this.sessionPropertyProfiles = new Map();
    
    // Initialize legacy maps
    this.properties = new Map();
    this.propertyAnalyses = new Map();
    this.competitorProperties = new Map();
    this.propertyUnits = new Map();
    this.optimizationReports = new Map();
    this.scrapingJobs = new Map();
    this.scrapedProperties = new Map();
    this.scrapedUnits = new Map();
    this.workflowStates = new Map();
    // Removed seedData() - only use real data from Scrapezy
  }

  // NEW: Property Profiles System Methods
  
  async createPropertyProfile(insertProfile: InsertPropertyProfile): Promise<PropertyProfile> {
    const id = randomUUID();
    const profile: PropertyProfile = {
      ...insertProfile,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      city: insertProfile.city ?? null,
      state: insertProfile.state ?? null,
      propertyType: insertProfile.propertyType ?? null,
      totalUnits: insertProfile.totalUnits ?? null,
      builtYear: insertProfile.builtYear ?? null,
      squareFootage: insertProfile.squareFootage ?? null,
      parkingSpaces: insertProfile.parkingSpaces ?? null,
      amenities: insertProfile.amenities ? [...insertProfile.amenities] : [],
      distance: insertProfile.distance ?? null,
      matchScore: insertProfile.matchScore ?? null,
      vacancyRate: insertProfile.vacancyRate ?? null,
      priceRange: insertProfile.priceRange ?? null
    };
    this.propertyProfiles.set(id, profile);
    return profile;
  }

  async getPropertyProfile(id: string): Promise<PropertyProfile | undefined> {
    return this.propertyProfiles.get(id);
  }

  async getAllPropertyProfiles(): Promise<PropertyProfile[]> {
    return Array.from(this.propertyProfiles.values());
  }

  async getPropertyProfilesByType(profileType: 'subject' | 'competitor'): Promise<PropertyProfile[]> {
    return Array.from(this.propertyProfiles.values()).filter(
      profile => profile.profileType === profileType
    );
  }

  async updatePropertyProfile(id: string, updates: Partial<PropertyProfile>): Promise<PropertyProfile | undefined> {
    const profile = this.propertyProfiles.get(id);
    if (!profile) return undefined;
    
    // Ensure amenities field is properly handled as string[]
    const processedUpdates = { ...updates };
    if (processedUpdates.amenities !== undefined) {
      // Force conversion to proper Array type, handle any array-like objects
      if (processedUpdates.amenities && typeof processedUpdates.amenities === 'object') {
        // Convert array-like objects (including Arguments objects) to proper arrays
        processedUpdates.amenities = Array.from(processedUpdates.amenities as any)
          .filter((item: any) => typeof item === 'string');
      } else {
        processedUpdates.amenities = [];
      }
    }
    
    const updatedProfile = { 
      ...profile, 
      ...processedUpdates, 
      updatedAt: new Date() 
    };
    this.propertyProfiles.set(id, updatedProfile);
    return updatedProfile;
  }

  async deletePropertyProfile(id: string): Promise<boolean> {
    return this.propertyProfiles.delete(id);
  }

  // Analysis Sessions Methods
  
  async createAnalysisSession(insertSession: InsertAnalysisSession): Promise<AnalysisSession> {
    const id = randomUUID();
    const session: AnalysisSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: insertSession.description ?? null
    };
    this.analysisSessions.set(id, session);
    return session;
  }

  async getAnalysisSession(id: string): Promise<AnalysisSession | undefined> {
    return this.analysisSessions.get(id);
  }

  async getAllAnalysisSessions(): Promise<AnalysisSession[]> {
    return Array.from(this.analysisSessions.values());
  }

  async updateAnalysisSession(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | undefined> {
    const session = this.analysisSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { 
      ...session, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.analysisSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteAnalysisSession(id: string): Promise<boolean> {
    // Remove all session property profile relationships first
    const sessionProfiles = Array.from(this.sessionPropertyProfiles.values()).filter(
      sp => sp.sessionId === id
    );
    sessionProfiles.forEach(sp => this.sessionPropertyProfiles.delete(sp.id));
    
    return this.analysisSessions.delete(id);
  }

  // Session Property Profiles Methods
  
  async addPropertyProfileToSession(insertSessionPropertyProfile: InsertSessionPropertyProfile): Promise<SessionPropertyProfile> {
    // Validate that role aligns with profileType
    const propertyProfile = this.propertyProfiles.get(insertSessionPropertyProfile.propertyProfileId);
    if (propertyProfile && propertyProfile.profileType !== insertSessionPropertyProfile.role) {
      console.warn(`[STORAGE] Role/Type mismatch: Property profile type '${propertyProfile.profileType}' does not match session role '${insertSessionPropertyProfile.role}'. This may be intentional for flexible analysis scenarios.`);
    }

    const id = randomUUID();
    const sessionPropertyProfile: SessionPropertyProfile = {
      ...insertSessionPropertyProfile,
      id,
      createdAt: new Date()
    };
    this.sessionPropertyProfiles.set(id, sessionPropertyProfile);
    return sessionPropertyProfile;
  }

  async removePropertyProfileFromSession(sessionId: string, propertyProfileId: string): Promise<boolean> {
    const sessionProfileToRemove = Array.from(this.sessionPropertyProfiles.values()).find(
      sp => sp.sessionId === sessionId && sp.propertyProfileId === propertyProfileId
    );
    
    if (!sessionProfileToRemove) return false;
    
    return this.sessionPropertyProfiles.delete(sessionProfileToRemove.id);
  }

  async getPropertyProfilesInSession(sessionId: string): Promise<PropertyProfile[]> {
    const sessionProfiles = Array.from(this.sessionPropertyProfiles.values()).filter(
      sp => sp.sessionId === sessionId
    );
    
    const profileIds = sessionProfiles.map(sp => sp.propertyProfileId);
    return profileIds.map(id => this.propertyProfiles.get(id)).filter(Boolean) as PropertyProfile[];
  }

  async getSessionsForPropertyProfile(propertyProfileId: string): Promise<AnalysisSession[]> {
    const sessionProfiles = Array.from(this.sessionPropertyProfiles.values()).filter(
      sp => sp.propertyProfileId === propertyProfileId
    );
    
    const sessionIds = sessionProfiles.map(sp => sp.sessionId);
    return sessionIds.map(id => this.analysisSessions.get(id)).filter(Boolean) as AnalysisSession[];
  }

  // Multi-property analysis support
  
  async generateMultiPropertyAnalysis(sessionId: string, criteria: FilterCriteria): Promise<FilteredAnalysis> {
    // This is a placeholder implementation - in a real system this would perform complex analysis
    const profilesInSession = await this.getPropertyProfilesInSession(sessionId);
    const subjectProfiles = profilesInSession.filter(p => p.profileType === 'subject');
    const competitorProfiles = profilesInSession.filter(p => p.profileType === 'competitor');
    
    // Create basic analysis result
    return {
      marketPosition: "Mid-market",
      pricingPowerScore: 75,
      competitiveAdvantages: ["Multiple properties", "Diverse portfolio"],
      recommendations: ["Optimize pricing across portfolio", "Leverage economies of scale"],
      unitCount: subjectProfiles.reduce((sum, p) => sum + (p.totalUnits || 0), 0),
      avgRent: 1500,
      percentileRank: 75,
      locationScore: 80,
      amenityScore: 85,
      pricePerSqFt: 2.5,
      subjectUnits: [],
      competitorUnits: [],
      competitiveEdges: {
        pricing: { edge: 0, label: "Market rate", status: "neutral" },
        size: { edge: 0, label: "Average size", status: "neutral" },
        availability: { edge: 0, label: "Standard availability", status: "neutral" },
        amenities: { edge: 10, label: "Premium amenities", status: "advantage" }
      },
      aiInsights: [`Analysis of ${subjectProfiles.length} subject properties vs ${competitorProfiles.length} competitors`],
      subjectAvgRent: 1500,
      competitorAvgRent: 1450,
      subjectAvgSqFt: 800,
      competitorAvgSqFt: 780
    };
  }

  async getSubjectPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]> {
    if (sessionId) {
      const profilesInSession = await this.getPropertyProfilesInSession(sessionId);
      return profilesInSession.filter(p => p.profileType === 'subject');
    }
    
    return await this.getPropertyProfilesByType('subject');
  }

  async getCompetitorPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]> {
    if (sessionId) {
      const profilesInSession = await this.getPropertyProfilesInSession(sessionId);
      return profilesInSession.filter(p => p.profileType === 'competitor');
    }
    
    return await this.getPropertyProfilesByType('competitor');
  }

  // Updated Property Analysis methods
  
  async getPropertyAnalysisBySession(sessionId: string): Promise<PropertyAnalysis | undefined> {
    return Array.from(this.propertyAnalyses.values()).find(
      analysis => analysis.sessionId === sessionId
    );
  }

  // LEGACY METHODS (maintained for backward compatibility)

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
      sessionId: insertAnalysis.sessionId ?? null,
      propertyProfileId: insertAnalysis.propertyProfileId ?? null,
      propertyId: insertAnalysis.propertyId ?? null,
      competitiveAdvantages: Array.isArray(insertAnalysis.competitiveAdvantages) ? [...insertAnalysis.competitiveAdvantages] : [],
      recommendations: Array.isArray(insertAnalysis.recommendations) ? [...insertAnalysis.recommendations] : []
    };
    const propertyKey = insertAnalysis.propertyId ?? id;
    this.propertyAnalyses.set(propertyKey, analysis);
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
      propertyId: insertUnit.propertyId ?? null,
      propertyProfileId: insertUnit.propertyProfileId ?? null,
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

  async clearPropertyUnits(propertyId: string): Promise<void> {
    const unitsToDelete = Array.from(this.propertyUnits.keys()).filter(id => {
      const unit = this.propertyUnits.get(id);
      return unit && unit.propertyId === propertyId;
    });
    
    unitsToDelete.forEach(id => this.propertyUnits.delete(id));
  }

  async createOptimizationReport(insertReport: InsertOptimizationReport): Promise<OptimizationReport> {
    const id = randomUUID();
    const report: OptimizationReport = { 
      ...insertReport, 
      id, 
      createdAt: new Date(),
      sessionId: insertReport.sessionId ?? null,
      propertyProfileId: insertReport.propertyProfileId ?? null,
      propertyId: insertReport.propertyId ?? null
    };
    const reportKey = insertReport.propertyId ?? id;
    this.optimizationReports.set(reportKey, report);
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
      sessionId: insertJob.sessionId ?? null,
      propertyProfileId: insertJob.propertyProfileId ?? null,
      propertyId: insertJob.propertyId ?? null,
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
    const allProperties = Array.from(this.scrapedProperties.values());
    
    // First ensure we have a subject property marked
    const subjectProperty = await this.getSubjectScrapedProperty();
    
    // Filter out the subject property to get only competitors
    const competitors = allProperties.filter(
      property => property.isSubjectProperty !== true
    );
    
    console.log('[STORAGE] getAllScrapedCompetitors: Found', competitors.length, 'competitor properties');
    return competitors;
  }

  async getSelectedScrapedProperties(ids: string[]): Promise<ScrapedProperty[]> {
    return ids.map(id => this.scrapedProperties.get(id)).filter(Boolean) as ScrapedProperty[];
  }

  async updateScrapedProperty(id: string, updates: Partial<ScrapedProperty>): Promise<ScrapedProperty | undefined> {
    const property = this.scrapedProperties.get(id);
    if (!property) return undefined;
    
    const updatedProperty = { ...property, ...updates };
    this.scrapedProperties.set(id, updatedProperty);
    return updatedProperty;
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
      floorPlanName: insertUnit.floorPlanName ?? null,
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
    const allProperties = Array.from(this.scrapedProperties.values());
    console.log('[STORAGE] getSubjectScrapedProperty: Total scraped properties:', allProperties.length);
    
    const subjectProperty = allProperties.find(
      property => property.isSubjectProperty === true
    );
    
    if (subjectProperty) {
      console.log('[STORAGE] ✅ Found subject property:', subjectProperty.name);
      console.log('[STORAGE] Subject property ID:', subjectProperty.id);
      console.log('[STORAGE] Subject property URL:', subjectProperty.url);
    } else {
      console.log('[STORAGE] ⚠️ No subject property found with isSubjectProperty === true');
      console.log('[STORAGE] Properties with isSubjectProperty flag:');
      allProperties.forEach(p => {
        console.log(`[STORAGE]   - ${p.name}: isSubjectProperty = ${p.isSubjectProperty}`);
      });
      
      // FALLBACK: If no subject property is marked but we have properties, mark the first one
      if (allProperties.length > 0) {
        console.log('[STORAGE] Applying emergency fallback - marking first property as subject');
        const firstProperty = allProperties[0];
        firstProperty.isSubjectProperty = true;
        this.scrapedProperties.set(firstProperty.id, firstProperty);
        console.log('[STORAGE] ✅ Emergency fallback: Marked', firstProperty.name, 'as subject');
        return firstProperty;
      }
    }
    
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
    console.log('[FILTER] Starting with', units.length, 'total units');
    
    // Log sample unit data for debugging
    if (units.length > 0) {
      console.log('[FILTER] Sample unit data:');
      const sampleUnit = units[0];
      console.log('[FILTER]   Unit Type:', sampleUnit.unitType);
      console.log('[FILTER]   Bedrooms:', sampleUnit.bedrooms);
      console.log('[FILTER]   Rent:', sampleUnit.rent);
      console.log('[FILTER]   Status:', sampleUnit.status);
      console.log('[FILTER]   Square Footage:', sampleUnit.squareFootage);
    }

    // Filter by bedroom types
    if (criteria.bedroomTypes.length > 0) {
      const beforeCount = units.length;
      units = units.filter(unit => {
        if (criteria.bedroomTypes.includes("Studio") && (unit.bedrooms === 0 || unit.unitType.toLowerCase().includes("studio"))) return true;
        if (criteria.bedroomTypes.includes("1BR") && unit.bedrooms === 1) return true;
        if (criteria.bedroomTypes.includes("2BR") && unit.bedrooms === 2) return true;
        if (criteria.bedroomTypes.includes("3BR") && unit.bedrooms === 3) return true;
        return false;
      });
      console.log('[FILTER] After bedroom filter:', units.length, 'units (filtered out', beforeCount - units.length, ')');
    } else {
      console.log('[FILTER] No bedroom filter applied - keeping all', units.length, 'units');
    }

    // Filter by price range
    const beforePriceCount = units.length;
    units = units.filter(unit => {
      if (!unit.rent) {
        console.log('[FILTER] Unit has no rent value, including anyway for wide filter');
        return true; // Include units without rent data when using wide ranges
      }
      // Handle rent values that may be strings with formatting (e.g., "$1,234" or "1234")
      let rentValue: number;
      const rentStr = unit.rent.toString();
      
      // Remove dollar signs, commas, and other non-numeric characters
      const cleanedRent = rentStr.replace(/[$,]/g, '').trim();
      rentValue = parseFloat(cleanedRent);
      
      if (isNaN(rentValue)) {
        console.log('[FILTER] Could not parse rent value:', rentStr, '-> cleaned:', cleanedRent, '- including anyway');
        return true; // Include units we can't parse for wide filter
      }
      
      const inRange = rentValue >= criteria.priceRange.min && rentValue <= criteria.priceRange.max;
      if (!inRange) {
        console.log('[FILTER] Unit rent', rentValue, 'outside range', criteria.priceRange.min, '-', criteria.priceRange.max);
      }
      return inRange;
    });
    console.log('[FILTER] After price filter (', criteria.priceRange.min, '-', criteria.priceRange.max, '):', units.length, 'units (filtered out', beforePriceCount - units.length, ')');

    // Filter by square footage range
    const beforeSqFtCount = units.length;
    units = units.filter(unit => {
      if (!unit.squareFootage) {
        console.log('[FILTER] Unit has no square footage, including anyway');
        return true; // Keep units without sq ft data
      }
      const inRange = unit.squareFootage >= criteria.squareFootageRange.min && unit.squareFootage <= criteria.squareFootageRange.max;
      if (!inRange) {
        console.log('[FILTER] Unit sq ft', unit.squareFootage, 'outside range', criteria.squareFootageRange.min, '-', criteria.squareFootageRange.max);
      }
      return inRange;
    });
    console.log('[FILTER] After square footage filter:', units.length, 'units (filtered out', beforeSqFtCount - units.length, ')');

    // Filter by availability - flexible matching for various status formats
    const beforeAvailabilityCount = units.length;
    console.log('[FILTER] Availability filter:', criteria.availability);
    
    if (criteria.availability === "now") {
      units = units.filter(unit => {
        if (!unit.status) {
          console.log('[FILTER] Unit has no status, excluding from "now" filter');
          return false;
        }
        const status = unit.status.toLowerCase();
        // Match: "available", "now", "available immediately", etc.
        const matches = status === "available" || 
                       status === "now" || 
                       status.includes("available") ||
                       status.includes("immediate");
        if (!matches) {
          console.log('[FILTER] Status "' + unit.status + '" does not match "now" criteria');
        }
        return matches;
      });
    } else if (criteria.availability === "30days") {
      units = units.filter(unit => {
        if (!unit.status) {
          console.log('[FILTER] Unit has no status, excluding from "30days" filter');
          return false;
        }
        const status = unit.status.toLowerCase();
        // Include units available now or within ~30 days
        // Match: "available", "now", "available oct 7", "available sep 28", etc.
        const matches = status === "available" || 
                       status === "now" || 
                       status === "pending" ||
                       status.includes("available") ||
                       status.includes("immediate") ||
                       !status.includes("occupied"); // Include anything not explicitly occupied
        if (!matches) {
          console.log('[FILTER] Status "' + unit.status + '" does not match "30days" criteria');
        }
        return matches;
      });
    } else if (criteria.availability === "60days") {
      // For 60days, include ALL units regardless of status for maximum visibility
      console.log('[FILTER] 60days filter - including all units regardless of status');
      // Don't filter anything - keep all units
    }
    
    console.log('[FILTER] After availability filter:', units.length, 'units (filtered out', beforeAvailabilityCount - units.length, ')');

    // Advanced filters (simplified implementation since scraped data may not have all details)
    
    // Filter by amenities - would need property-level amenities data
    if (criteria.amenities && criteria.amenities.length > 0) {
      // For demo: simulate by filtering based on price ranges (higher price = more amenities)
      // In production, you'd match against actual property amenities
      const avgRent = units.reduce((sum, u) => sum + (u.rent ? parseFloat(u.rent.toString()) : 0), 0) / units.length || 0;
      if (criteria.amenities.includes("gym") || criteria.amenities.includes("pool")) {
        // Premium amenities typically in higher-priced units
        units = units.filter(unit => {
          const rent = unit.rent ? parseFloat(unit.rent.toString()) : 0;
          return rent >= avgRent * 0.9; // Keep units in upper price tier
        });
      }
    }

    // Filter by lease terms - would need actual lease data
    if (criteria.leaseTerms && criteria.leaseTerms.length > 0) {
      // Simplified: month-to-month typically has higher rent
      if (criteria.leaseTerms.includes("month_to_month")) {
        // Keep all units for now - in production would filter by actual lease terms
      }
    }

    // Filter by floor level - would need actual floor data
    if (criteria.floorLevel) {
      // Simplified: top floors typically have higher rent
      if (criteria.floorLevel === "top") {
        const sortedByRent = [...units].sort((a, b) => {
          const rentA = a.rent ? parseFloat(a.rent.toString()) : 0;
          const rentB = b.rent ? parseFloat(b.rent.toString()) : 0;
          return rentB - rentA;
        });
        // Keep top 70% by price as proxy for upper floors
        const cutoff = Math.floor(sortedByRent.length * 0.3);
        if (cutoff > 0) {
          units = sortedByRent.slice(0, -cutoff);
        }
      }
    }

    // Filter by renovation status - would need actual renovation data
    if (criteria.renovationStatus) {
      // Simplified: newly renovated units typically have higher rent
      if (criteria.renovationStatus === "newly_renovated") {
        const avgRent = units.reduce((sum, u) => sum + (u.rent ? parseFloat(u.rent.toString()) : 0), 0) / units.length || 0;
        units = units.filter(unit => {
          const rent = unit.rent ? parseFloat(unit.rent.toString()) : 0;
          return rent >= avgRent * 1.1; // Keep units 10% above average
        });
      }
    }

    return units;
  }

  async generateFilteredAnalysis(propertyId: string, criteria: FilterCriteria): Promise<FilteredAnalysis> {
    // Get filtered units from all properties for comparison
    const allFilteredUnits = await this.getFilteredScrapedUnits(criteria);
    
    // Get subject property (look for isSubjectProperty flag)
    const subjectProperty = await this.getSubjectScrapedProperty();
    if (!subjectProperty) {
      // Return a default analysis when no scraped data is available
      return {
        marketPosition: "No Data Available",
        pricingPowerScore: 0,
        competitiveAdvantages: ["Scraping Required"],
        recommendations: ["Please complete competitor scraping to generate analysis"],
        unitCount: 0,
        avgRent: 0,
        percentileRank: 0,
        locationScore: 0,
        amenityScore: 0,
        pricePerSqFt: 0,
        subjectUnits: [],
        competitorUnits: [],
        competitiveEdges: {
          pricing: { edge: 0, label: "No data", status: "neutral" },
          size: { edge: 0, label: "No data", status: "neutral" },
          availability: { edge: 0, label: "No data", status: "neutral" },
          amenities: { edge: 0, label: "No data", status: "neutral" }
        },
        aiInsights: [
          "Complete competitor property scraping to enable analysis",
          "Add competitor properties from the Summarize page",
          "Analysis requires unit-level data from apartments.com"
        ],
        subjectAvgRent: 0,
        competitorAvgRent: 0,
        subjectAvgSqFt: 0,
        competitorAvgSqFt: 0
      };
    }
    
    // Separate subject and competitor units
    const subjectUnits = allFilteredUnits.filter(unit => unit.propertyId === subjectProperty.id);
    const competitorUnits = allFilteredUnits.filter(unit => unit.propertyId !== subjectProperty.id);
    
    // Get property details for unit comparisons
    const propertyMap = new Map<string, ScrapedProperty>();
    for (const prop of Array.from(this.scrapedProperties.values())) {
      propertyMap.set(prop.id, prop);
    }
    
    // Convert to UnitComparison format
    const formatUnit = (unit: ScrapedUnit, isSubject: boolean): UnitComparison => {
      const property = propertyMap.get(unit.propertyId);
      return {
        unitId: unit.id,
        propertyName: property?.name || "Unknown",
        unitType: unit.unitType,
        bedrooms: unit.bedrooms || 0,
        bathrooms: unit.bathrooms ? parseFloat(unit.bathrooms.toString()) : null,
        squareFootage: unit.squareFootage,
        rent: unit.rent ? parseFloat(unit.rent.toString()) : 0,
        isSubject,
        availabilityDate: unit.availabilityDate || undefined
      };
    };
    
    const subjectUnitsFormatted = subjectUnits.map(u => formatUnit(u, true));
    const competitorUnitsFormatted = competitorUnits.map(u => formatUnit(u, false));
    
    // Calculate averages for subject and competitors
    const calcAverage = (units: UnitComparison[], field: 'rent' | 'squareFootage') => {
      if (units.length === 0) return 0;
      const sum = units.reduce((acc, unit) => {
        const value = unit[field];
        return acc + (value || 0);
      }, 0);
      return sum / units.length;
    };
    
    const subjectAvgRent = calcAverage(subjectUnitsFormatted, 'rent');
    const competitorAvgRent = calcAverage(competitorUnitsFormatted, 'rent');
    const subjectAvgSqFt = calcAverage(subjectUnitsFormatted, 'squareFootage');
    const competitorAvgSqFt = calcAverage(competitorUnitsFormatted, 'squareFootage');
    
    // Calculate true percentile rank based on competitor rents
    const competitorRents = competitorUnitsFormatted
      .map(u => u.rent)
      .filter(r => r > 0)
      .sort((a, b) => a - b);
    
    let percentileRank = 50;
    if (competitorRents.length > 0 && subjectAvgRent > 0) {
      const belowCount = competitorRents.filter(r => r < subjectAvgRent).length;
      percentileRank = Math.round((belowCount / competitorRents.length) * 100);
    }
    
    // Calculate competitive edges
    const pricingEdge = competitorAvgRent > 0 ? ((subjectAvgRent - competitorAvgRent) / competitorAvgRent) * 100 : 0;
    const sizeEdge = competitorAvgSqFt > 0 ? subjectAvgSqFt - competitorAvgSqFt : 0;
    const availabilityEdge = subjectUnits.filter(u => u.status === 'available').length - 
                            competitorUnits.filter(u => u.status === 'available').length;
    const amenityScore = percentileRank > 60 ? 75 : percentileRank > 40 ? 50 : 25;
    
    const competitiveEdges: CompetitiveEdges = {
      pricing: {
        edge: Math.round(pricingEdge * 10) / 10,
        label: pricingEdge > 0 ? `+${Math.abs(Math.round(pricingEdge))}% above market` : 
               pricingEdge < 0 ? `${Math.abs(Math.round(pricingEdge))}% below market` : "At market rate",
        status: pricingEdge > 10 ? "disadvantage" as const : pricingEdge < -10 ? "advantage" as const : "neutral" as const
      },
      size: {
        edge: Math.round(sizeEdge),
        label: sizeEdge > 0 ? `+${Math.round(sizeEdge)} sq ft larger` : 
               sizeEdge < 0 ? `${Math.abs(Math.round(sizeEdge))} sq ft smaller` : "Similar size",
        status: sizeEdge > 50 ? "advantage" as const : sizeEdge < -50 ? "disadvantage" as const : "neutral" as const
      },
      availability: {
        edge: availabilityEdge,
        label: availabilityEdge > 0 ? `${availabilityEdge} more units available` : 
               availabilityEdge < 0 ? `${Math.abs(availabilityEdge)} fewer units available` : "Similar availability",
        status: availabilityEdge > 2 ? "advantage" as const : availabilityEdge < -2 ? "disadvantage" as const : "neutral" as const
      },
      amenities: {
        edge: amenityScore,
        label: amenityScore > 60 ? "Premium amenities" : amenityScore > 40 ? "Standard amenities" : "Basic amenities",
        status: amenityScore > 60 ? "advantage" as const : amenityScore < 40 ? "disadvantage" as const : "neutral" as const
      }
    };
    
    // Generate pricing power score
    const pricingPowerScore = Math.min(100, Math.max(0, 
      percentileRank + 
      (competitiveEdges.size.status === "advantage" ? 10 : competitiveEdges.size.status === "disadvantage" ? -10 : 0) +
      (competitiveEdges.amenities.status === "advantage" ? 5 : competitiveEdges.amenities.status === "disadvantage" ? -5 : 0)
    ));
    
    // Generate dynamic competitive advantages
    const competitiveAdvantages = [];
    if (percentileRank > 75) competitiveAdvantages.push("Premium market positioning");
    if (competitiveEdges.size.status === "advantage") competitiveAdvantages.push("Larger than average units");
    if (competitiveEdges.pricing.status === "advantage") competitiveAdvantages.push("Competitive pricing advantage");
    if (competitiveEdges.availability.status === "advantage") competitiveAdvantages.push("Higher unit availability");
    if (competitiveEdges.amenities.status === "advantage") competitiveAdvantages.push("Superior amenity package");
    
    // Generate dynamic recommendations
    const recommendations = [];
    if (percentileRank < 30) recommendations.push("Consider reviewing pricing strategy to better align with market");
    if (competitiveEdges.size.status === "disadvantage") recommendations.push("Highlight other value propositions to offset smaller unit sizes");
    if (competitiveEdges.pricing.status === "disadvantage") recommendations.push("Ensure premium pricing is justified by superior amenities or location");
    if (competitiveEdges.availability.status === "disadvantage") recommendations.push("Limited availability may support premium pricing strategy");
    if (recommendations.length === 0) recommendations.push("Maintain current competitive positioning");
    
    // Generate market position description
    let marketPosition = "Market Average";
    if (percentileRank > 75) marketPosition = "Premium Market Leader";
    else if (percentileRank > 50) marketPosition = "Above Market Average";
    else if (percentileRank > 25) marketPosition = "Below Market Average";
    else marketPosition = "Value Market Position";
    
    // Generate AI insights (placeholder - will be replaced with OpenAI)
    const aiInsights = [
      `Your property ranks in the ${percentileRank}th percentile for this filter criteria`,
      competitiveEdges.pricing.status === "advantage" ? 
        "Your pricing provides strong competitive advantage in the current market" :
        competitiveEdges.pricing.status === "disadvantage" ?
        "Consider reviewing pricing strategy to improve market competitiveness" :
        "Your pricing aligns well with market expectations",
      subjectUnitsFormatted.length > 0 ?
        `With ${subjectUnitsFormatted.length} units matching filters, you have ${subjectUnitsFormatted.length > 5 ? 'strong' : 'limited'} inventory in this segment` :
        "No units match the current filter criteria - consider expanding criteria"
    ];
    
    return {
      marketPosition,
      pricingPowerScore,
      competitiveAdvantages,
      recommendations,
      unitCount: subjectUnitsFormatted.length,
      avgRent: Math.round(subjectAvgRent),
      percentileRank,
      locationScore: Math.min(100, Math.max(0, percentileRank + 5)),
      amenityScore: Math.min(100, Math.max(0, amenityScore)),
      pricePerSqFt: subjectAvgSqFt > 0 ? Math.round((subjectAvgRent / subjectAvgSqFt) * 100) / 100 : 0,
      // New fields
      subjectUnits: subjectUnitsFormatted,
      competitorUnits: competitorUnitsFormatted,
      competitiveEdges,
      aiInsights,
      subjectAvgRent: Math.round(subjectAvgRent),
      competitorAvgRent: Math.round(competitorAvgRent),
      subjectAvgSqFt: Math.round(subjectAvgSqFt),
      competitorAvgSqFt: Math.round(competitorAvgSqFt)
    };
  }

  // Workflow State Management
  async getWorkflowState(propertyId: string): Promise<WorkflowState | null> {
    return this.workflowStates.get(propertyId) || null;
  }

  async getWorkflowStateBySession(sessionId: string): Promise<WorkflowState | null> {
    // Search through all workflow states to find one with matching analysisSessionId
    const stateEntries = Array.from(this.workflowStates.entries());
    const foundEntry = stateEntries.find(([key, state]) => 
      state.analysisSessionId === sessionId
    );
    return foundEntry ? foundEntry[1] : null;
  }

  async saveWorkflowState(state: WorkflowState): Promise<WorkflowState> {
    const stateKey = state.propertyId ?? state.analysisSessionId ?? randomUUID();
    this.workflowStates.set(stateKey, state);
    return state;
  }
  
  // NEW: Property Profile specific retrieval methods
  async getPropertyUnitsByProfile(propertyProfileId: string): Promise<PropertyUnit[]> {
    return Array.from(this.propertyUnits.values()).filter(
      unit => unit.propertyProfileId === propertyProfileId
    );
  }

  async getScrapingJobsByProfile(propertyProfileId: string): Promise<ScrapingJob[]> {
    return Array.from(this.scrapingJobs.values()).filter(
      job => job.propertyProfileId === propertyProfileId
    );
  }

  async getScrapingJobsBySession(sessionId: string): Promise<ScrapingJob[]> {
    return Array.from(this.scrapingJobs.values()).filter(
      job => job.sessionId === sessionId
    );
  }

  async getAllOptimizationReports(): Promise<OptimizationReport[]> {
    return Array.from(this.optimizationReports.values());
  }

  // PORTFOLIO ANALYTICS METHODS
  async getPortfolioMetrics(): Promise<any> {
    const subjectProperties = await this.getPropertyProfilesByType('subject');
    const allOptimizationReports = await this.getAllOptimizationReports();
    
    return {
      totalProperties: subjectProperties.length,
      totalUnits: subjectProperties.reduce((sum, p) => sum + (p.totalUnits || 0), 0),
      totalOptimizationPotential: allOptimizationReports.reduce((sum, r) => 
        sum + (parseFloat(r.totalIncrease) || 0), 0
      ),
      avgOccupancyRate: 85, // Placeholder
      avgPerformanceScore: 78 // Placeholder
    };
  }

  async getPortfolioFinancialSummary(): Promise<any> {
    const subjectProperties = await this.getPropertyProfilesByType('subject');
    const allOptimizationReports = await this.getAllOptimizationReports();
    
    const propertyPerformance = await Promise.all(
      subjectProperties.map(async (property) => {
        const units = await this.getPropertyUnitsByProfile(property.id);
        const optimizationReport = allOptimizationReports.find(r => r.propertyProfileId === property.id);
        
        const currentMonthlyRevenue = units.reduce((sum, unit) => 
          sum + parseFloat(unit.currentRent), 0
        );
        
        const optimizedMonthlyRevenue = units.reduce((sum, unit) => 
          sum + parseFloat(unit.recommendedRent || unit.currentRent), 0
        );
        
        return {
          propertyId: property.id,
          propertyName: property.name,
          currentMonthlyRevenue,
          optimizedMonthlyRevenue,
          optimizationPotential: optimizedMonthlyRevenue - currentMonthlyRevenue
        };
      })
    );

    return {
      totalCurrentRevenue: propertyPerformance.reduce((sum, p) => sum + p.currentMonthlyRevenue, 0),
      totalOptimizedRevenue: propertyPerformance.reduce((sum, p) => sum + p.optimizedMonthlyRevenue, 0),
      totalOptimizationPotential: propertyPerformance.reduce((sum, p) => sum + p.optimizationPotential, 0),
      propertyPerformance
    };
  }
}

export const storage = new MemStorage();
