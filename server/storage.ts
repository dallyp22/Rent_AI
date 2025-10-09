import { 
  // New property profiles system types
  type PropertyProfile,
  type InsertPropertyProfile,
  type AnalysisSession,
  type InsertAnalysisSession,
  type SessionPropertyProfile,
  type InsertSessionPropertyProfile,
  // Portfolio management types
  type SavedPortfolio,
  type InsertSavedPortfolio,
  type SavedPropertyProfile,
  type InsertSavedPropertyProfile,
  type CompetitiveRelationship,
  type InsertCompetitiveRelationship,
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
  type TagDefinition,
  type InsertTagDefinition,
  type FilterCriteria,
  type FilteredAnalysis,
  type UnitComparison,
  type CompetitiveEdges,
  // User authentication types
  type User,
  type UpsertUser
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./database";
import { 
  propertyProfiles,
  analysisSessions, 
  sessionPropertyProfiles,
  savedPortfolios,
  savedPropertyProfiles,
  competitiveRelationships,
  properties,
  propertyAnalysis,
  competitorProperties,
  propertyUnits,
  optimizationReports,
  scrapingJobs,
  scrapedProperties,
  scrapedUnits,
  tagDefinitions,
  users
} from "@shared/schema";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";

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
  getPropertyProfilesByUser(userId: string): Promise<PropertyProfile[]>;
  getPropertyProfilesByUserAndType(userId: string, profileType: 'subject' | 'competitor'): Promise<PropertyProfile[]>;
  getPropertyProfileByNameAndAddress(userId: string, name: string, address: string): Promise<PropertyProfile | undefined>;
  updatePropertyProfile(id: string, updates: Partial<PropertyProfile>): Promise<PropertyProfile | undefined>;
  deletePropertyProfile(id: string): Promise<boolean>;
  
  // Analysis Sessions
  createAnalysisSession(session: InsertAnalysisSession): Promise<AnalysisSession>;
  getAnalysisSession(id: string): Promise<AnalysisSession | undefined>;
  getAllAnalysisSessions(): Promise<AnalysisSession[]>;
  getAnalysisSessionsByUser(userId: string): Promise<AnalysisSession[]>;
  updateAnalysisSession(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | undefined>;
  deleteAnalysisSession(id: string): Promise<boolean>;
  
  // Session Property Profiles (many-to-many relationships)
  addPropertyProfileToSession(sessionPropertyProfile: InsertSessionPropertyProfile): Promise<SessionPropertyProfile>;
  removePropertyProfileFromSession(sessionId: string, propertyProfileId: string): Promise<boolean>;
  getPropertyProfilesInSession(sessionId: string): Promise<PropertyProfile[]>;
  getSessionsForPropertyProfile(propertyProfileId: string): Promise<AnalysisSession[]>;
  
  // Multi-property analysis support
  generateMultiPropertyAnalysis(sessionId: string, criteria: FilterCriteria, competitiveRelationships?: any[], providedPropertyProfiles?: any[]): Promise<FilteredAnalysis>;
  getSubjectPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]>;
  getCompetitorPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]>;
  getScrapedUnitsForSession(sessionId: string): Promise<ScrapedUnit[]>;
  
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
  clearPropertyUnits(propertyId: string): Promise<void>;  // Legacy - uses propertyId
  clearPropertyUnitsByProfile(propertyProfileId: string): Promise<void>;  // New - uses propertyProfileId
  replacePropertyUnitsByProfile(propertyProfileId: string, units: InsertPropertyUnit[]): Promise<PropertyUnit[]>;
  
  // Optimization Reports
  createOptimizationReport(report: InsertOptimizationReport): Promise<OptimizationReport>;
  getOptimizationReport(propertyId: string): Promise<OptimizationReport | undefined>;
  getOptimizationReportsBySession(sessionId: string): Promise<OptimizationReport[]>;
  
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
  clearScrapedUnitsForProperty(propertyId: string): Promise<void>;
  replaceScrapedUnitsForProperty(propertyId: string, units: InsertScrapedUnit[]): Promise<ScrapedUnit[]>;
  
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
  
  // NEW: Portfolio Management Operations
  // Portfolio CRUD operations
  createPortfolio(portfolio: InsertSavedPortfolio): Promise<SavedPortfolio>;
  getPortfolio(id: string): Promise<SavedPortfolio | undefined>;
  getPortfoliosByUser(userId: string): Promise<SavedPortfolio[]>;
  updatePortfolio(id: string, updates: Partial<SavedPortfolio>): Promise<SavedPortfolio | undefined>;
  deletePortfolio(id: string): Promise<boolean>;
  updatePortfolioLastAccessed(id: string): Promise<void>;
  
  // Property profile operations within portfolios
  createSavedPropertyProfile(profile: InsertSavedPropertyProfile): Promise<SavedPropertyProfile>;
  getSavedPropertyProfile(id: string): Promise<SavedPropertyProfile | undefined>;
  getSavedPropertyProfilesByPortfolio(portfolioId: string): Promise<SavedPropertyProfile[]>;
  updateSavedPropertyProfile(id: string, updates: Partial<SavedPropertyProfile>): Promise<SavedPropertyProfile | undefined>;
  deleteSavedPropertyProfile(id: string): Promise<boolean>;
  
  // Competitive relationship operations
  createCompetitiveRelationship(relationship: InsertCompetitiveRelationship): Promise<CompetitiveRelationship>;
  getCompetitiveRelationship(id: string): Promise<CompetitiveRelationship | undefined>;
  getCompetitiveRelationshipsByPortfolio(portfolioId: string): Promise<CompetitiveRelationship[]>;
  updateCompetitiveRelationship(id: string, updates: Partial<CompetitiveRelationship>): Promise<CompetitiveRelationship | undefined>;
  toggleCompetitiveRelationship(id: string): Promise<CompetitiveRelationship | undefined>;
  deleteCompetitiveRelationship(id: string): Promise<boolean>;

  // TAG Management Operations
  createTagDefinition(tagDef: InsertTagDefinition): Promise<TagDefinition>;
  getTagDefinition(tag: string): Promise<TagDefinition | undefined>;
  getAllTagDefinitions(): Promise<TagDefinition[]>;
  getTagDefinitionsByGroup(tagGroup: string): Promise<TagDefinition[]>;
  upsertTagDefinition(tagDef: InsertTagDefinition): Promise<TagDefinition>;
  updateTagDefinition(id: string, updates: Partial<TagDefinition>): Promise<TagDefinition | undefined>;
  deleteTagDefinition(id: string): Promise<boolean>;
  
  // Hierarchical Unit Queries (Property → Bedroom → TAG)
  getUnitsHierarchyByProperty(propertyProfileId: string): Promise<any>;
  getUnitsHierarchyBySession(sessionId: string): Promise<any>;
  getUnitsByPropertyAndTag(propertyProfileId: string, tag: string): Promise<PropertyUnit[]>;
  getUnitsByPropertyBedroomTag(propertyProfileId: string, bedrooms: number, tag: string): Promise<PropertyUnit[]>;

  // User authentication operations - MANDATORY for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUsersByEmailAndAuthProvider(email: string, authProvider: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Password reset token management
  setResetToken(userId: string, token: string, expires: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearResetToken(userId: string): Promise<void>;
}

// DrizzleStorage class for actual database operations
export class DrizzleStorage implements IStorage {
  
  // Property Profiles System Methods
  async createPropertyProfile(insertProfile: InsertPropertyProfile): Promise<PropertyProfile> {
    try {
      // Ensure amenities is properly formatted as string array
      const profileData = {
        ...insertProfile,
        amenities: insertProfile.amenities 
          ? Array.isArray(insertProfile.amenities) 
            ? insertProfile.amenities.filter((item): item is string => typeof item === 'string')
            : []
          : []
      };
      
      const [profile] = await db.insert(propertyProfiles).values(profileData).returning();
      
      return profile;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating property profile:', error);
      throw new Error(`Failed to create property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyProfile(id: string): Promise<PropertyProfile | undefined> {
    try {
      const [profile] = await db.select().from(propertyProfiles).where(eq(propertyProfiles.id, id));
      return profile;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting property profile:', error);
      throw new Error(`Failed to get property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllPropertyProfiles(): Promise<PropertyProfile[]> {
    try {
      return await db.select().from(propertyProfiles).orderBy(desc(propertyProfiles.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting all property profiles:', error);
      throw new Error(`Failed to get property profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyProfilesByType(profileType: 'subject' | 'competitor'): Promise<PropertyProfile[]> {
    try {
      return await db.select()
        .from(propertyProfiles)
        .where(eq(propertyProfiles.profileType, profileType))
        .orderBy(desc(propertyProfiles.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting property profiles by type:', error);
      throw new Error(`Failed to get property profiles by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyProfilesByUser(userId: string): Promise<PropertyProfile[]> {
    try {
      console.log('[DEBUG DRIZZLE_STORAGE] getPropertyProfilesByUser called with userId:', userId);
      
      // CRITICAL FIX: Only get profiles for the specific user
      // Exclude profiles with null or empty userId
      const query = db.select()
        .from(propertyProfiles)
        .where(and(
          eq(propertyProfiles.userId, userId),
          sql`${propertyProfiles.userId} IS NOT NULL`,
          sql`${propertyProfiles.userId} != ''`
        ))
        .orderBy(desc(propertyProfiles.createdAt));
      
      console.log('[DEBUG DRIZZLE_STORAGE] Executing query for userId:', userId);
      const results = await query;
      
      console.log(`[DEBUG DRIZZLE_STORAGE] Query returned ${results.length} profiles for userId: ${userId}`);
      console.log('[DEBUG DRIZZLE_STORAGE] Profile IDs returned:', results.map(p => ({ id: p.id, userId: p.userId, name: p.name })));
      
      return results;
    } catch (error) {
      console.error('[ERROR DRIZZLE_STORAGE] Error getting property profiles by user:', error);
      throw new Error(`Failed to get property profiles by user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyProfilesByUserAndType(userId: string, profileType: 'subject' | 'competitor'): Promise<PropertyProfile[]> {
    try {
      console.log('[DEBUG DRIZZLE_STORAGE] getPropertyProfilesByUserAndType called with userId:', userId, 'profileType:', profileType);
      
      // CRITICAL FIX: Only get profiles for the specific user and type
      // Exclude profiles with null or empty userId
      const query = db.select()
        .from(propertyProfiles)
        .where(and(
          eq(propertyProfiles.userId, userId),
          eq(propertyProfiles.profileType, profileType),
          sql`${propertyProfiles.userId} IS NOT NULL`,
          sql`${propertyProfiles.userId} != ''`
        ))
        .orderBy(desc(propertyProfiles.createdAt));
      
      console.log('[DEBUG DRIZZLE_STORAGE] Executing query for userId:', userId, 'and type:', profileType);
      const results = await query;
      
      console.log(`[DEBUG DRIZZLE_STORAGE] Query returned ${results.length} profiles for userId: ${userId} and type: ${profileType}`);
      console.log('[DEBUG DRIZZLE_STORAGE] Profile IDs returned:', results.map(p => ({ id: p.id, userId: p.userId, name: p.name })));
      
      return results;
    } catch (error) {
      console.error('[ERROR DRIZZLE_STORAGE] Error getting property profiles by user and type:', error);
      throw new Error(`Failed to get property profiles by user and type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyProfileByNameAndAddress(userId: string, name: string, address: string): Promise<PropertyProfile | undefined> {
    try {
      console.log('[DEBUG DRIZZLE_STORAGE] getPropertyProfileByNameAndAddress called with userId:', userId, 'name:', name, 'address:', address);
      
      const [profile] = await db.select()
        .from(propertyProfiles)
        .where(and(
          eq(propertyProfiles.userId, userId),
          eq(propertyProfiles.name, name),
          eq(propertyProfiles.address, address),
          sql`${propertyProfiles.userId} IS NOT NULL`,
          sql`${propertyProfiles.userId} != ''`
        ));
      
      console.log('[DEBUG DRIZZLE_STORAGE] Found profile:', profile ? 'yes' : 'no');
      
      return profile;
    } catch (error) {
      console.error('[ERROR DRIZZLE_STORAGE] Error getting property profile by name and address:', error);
      throw new Error(`Failed to get property profile by name and address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePropertyProfile(id: string, updates: Partial<PropertyProfile>): Promise<PropertyProfile | undefined> {
    try {
      console.log(`🔍 [UPDATE_DEBUG] Updating property profile ${id}`);
      console.log(`🔍 [UPDATE_DEBUG] updates.unitMix:`, updates.unitMix);
      console.log(`🔍 [UPDATE_DEBUG] updates.unitMix type:`, typeof updates.unitMix);
      
      const [updatedProfile] = await db.update(propertyProfiles)
        .set(updates)
        .where(eq(propertyProfiles.id, id))
        .returning();
      
      console.log(`🔍 [UPDATE_DEBUG] Updated profile unitMix:`, updatedProfile.unitMix);
      
      return updatedProfile;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating property profile:', error);
      throw new Error(`Failed to update property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePropertyProfile(id: string): Promise<boolean> {
    try {
      console.log('[DRIZZLE_STORAGE] Deleting property profile and its references:', id);
      
      // First, remove all references from session_property_profiles table
      const sessionRefsResult = await db.delete(sessionPropertyProfiles)
        .where(eq(sessionPropertyProfiles.propertyProfileId, id));
      
      console.log('[DRIZZLE_STORAGE] Removed', sessionRefsResult.rowCount || 0, 'session references for property profile:', id);
      
      // Second, delete all scraping_jobs that reference this property profile
      const scrapingJobsResult = await db.delete(scrapingJobs)
        .where(eq(scrapingJobs.propertyProfileId, id));
      
      console.log('[DRIZZLE_STORAGE] Removed', scrapingJobsResult.rowCount || 0, 'scraping jobs for property profile:', id);
      
      // Then delete the property profile itself
      const result = await db.delete(propertyProfiles).where(eq(propertyProfiles.id, id));
      
      const deleted = result.rowCount > 0;
      console.log('[DRIZZLE_STORAGE] Property profile deletion result:', deleted);
      
      return deleted;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error deleting property profile:', error);
      throw new Error(`Failed to delete property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analysis Sessions Methods
  async createAnalysisSession(insertSession: InsertAnalysisSession): Promise<AnalysisSession> {
    try {
      const [session] = await db.insert(analysisSessions).values(insertSession).returning();
      
      return session;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating analysis session:', error);
      throw new Error(`Failed to create analysis session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAnalysisSession(id: string): Promise<AnalysisSession | undefined> {
    try {
      const [session] = await db.select().from(analysisSessions).where(eq(analysisSessions.id, id));
      return session;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting analysis session:', error);
      throw new Error(`Failed to get analysis session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllAnalysisSessions(): Promise<AnalysisSession[]> {
    try {
      return await db.select().from(analysisSessions).orderBy(desc(analysisSessions.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting all analysis sessions:', error);
      throw new Error(`Failed to get analysis sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAnalysisSessionsByUser(userId: string): Promise<AnalysisSession[]> {
    try {
      return await db.select()
        .from(analysisSessions)
        .where(eq(analysisSessions.userId, userId))
        .orderBy(desc(analysisSessions.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting analysis sessions by user:', error);
      throw new Error(`Failed to get analysis sessions by user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateAnalysisSession(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | undefined> {
    try {
      const [updatedSession] = await db.update(analysisSessions)
        .set(updates)
        .where(eq(analysisSessions.id, id))
        .returning();
      
      return updatedSession;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating analysis session:', error);
      throw new Error(`Failed to update analysis session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteAnalysisSession(id: string): Promise<boolean> {
    try {
      // Use transaction to delete related data
      await db.transaction(async (tx) => {
        // Delete session property profiles first
        await tx.delete(sessionPropertyProfiles).where(eq(sessionPropertyProfiles.sessionId, id));
        // Delete the session
        await tx.delete(analysisSessions).where(eq(analysisSessions.id, id));
      });
      
      return true;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error deleting analysis session:', error);
      throw new Error(`Failed to delete analysis session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Session Property Profiles Methods
  async addPropertyProfileToSession(insertSessionPropertyProfile: InsertSessionPropertyProfile): Promise<SessionPropertyProfile> {
    try {
      const [sessionPropertyProfile] = await db.insert(sessionPropertyProfiles).values(insertSessionPropertyProfile).returning();
      
      return sessionPropertyProfile;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error adding property profile to session:', error);
      throw new Error(`Failed to add property profile to session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removePropertyProfileFromSession(sessionId: string, propertyProfileId: string): Promise<boolean> {
    try {
      const result = await db.delete(sessionPropertyProfiles)
        .where(and(
          eq(sessionPropertyProfiles.sessionId, sessionId),
          eq(sessionPropertyProfiles.propertyProfileId, propertyProfileId)
        ));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error removing property profile from session:', error);
      throw new Error(`Failed to remove property profile from session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyProfilesInSession(sessionId: string): Promise<PropertyProfile[]> {
    try {
      const result = await db.select({
        id: propertyProfiles.id,
        userId: propertyProfiles.userId,
        name: propertyProfiles.name,
        address: propertyProfiles.address,
        url: propertyProfiles.url,
        profileType: propertyProfiles.profileType,
        city: propertyProfiles.city,
        state: propertyProfiles.state,
        propertyType: propertyProfiles.propertyType,
        totalUnits: propertyProfiles.totalUnits,
        builtYear: propertyProfiles.builtYear,
        squareFootage: propertyProfiles.squareFootage,
        parkingSpaces: propertyProfiles.parkingSpaces,
        amenities: propertyProfiles.amenities,
        unitMix: propertyProfiles.unitMix,
        distance: propertyProfiles.distance,
        matchScore: propertyProfiles.matchScore,
        vacancyRate: propertyProfiles.vacancyRate,
        priceRange: propertyProfiles.priceRange,
        createdAt: propertyProfiles.createdAt,
        updatedAt: propertyProfiles.updatedAt
      })
      .from(sessionPropertyProfiles)
      .innerJoin(propertyProfiles, eq(sessionPropertyProfiles.propertyProfileId, propertyProfiles.id))
      .where(eq(sessionPropertyProfiles.sessionId, sessionId));
      
      return result;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting property profiles in session:', error);
      throw new Error(`Failed to get property profiles in session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSessionsForPropertyProfile(propertyProfileId: string): Promise<AnalysisSession[]> {
    try {
      const result = await db.select({
        id: analysisSessions.id,
        name: analysisSessions.name,
        description: analysisSessions.description,
        userId: analysisSessions.userId,
        portfolioId: analysisSessions.portfolioId,
        createdAt: analysisSessions.createdAt,
        updatedAt: analysisSessions.updatedAt
      })
      .from(sessionPropertyProfiles)
      .innerJoin(analysisSessions, eq(sessionPropertyProfiles.sessionId, analysisSessions.id))
      .where(eq(sessionPropertyProfiles.propertyProfileId, propertyProfileId));
      
      return result;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting sessions for property profile:', error);
      throw new Error(`Failed to get sessions for property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Portfolio Management Operations
  async createPortfolio(portfolio: InsertSavedPortfolio): Promise<SavedPortfolio> {
    try {
      const [createdPortfolio] = await db.insert(savedPortfolios).values(portfolio).returning();
      
      return createdPortfolio;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating portfolio:', error);
      throw new Error(`Failed to create portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPortfolio(id: string): Promise<SavedPortfolio | undefined> {
    try {
      const [portfolio] = await db.select().from(savedPortfolios).where(eq(savedPortfolios.id, id));
      return portfolio;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting portfolio:', error);
      throw new Error(`Failed to get portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPortfoliosByUser(userId: string): Promise<SavedPortfolio[]> {
    try {
      return await db.select()
        .from(savedPortfolios)
        .where(eq(savedPortfolios.userId, userId))
        .orderBy(desc(savedPortfolios.lastAccessedAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting portfolios by user:', error);
      throw new Error(`Failed to get portfolios by user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePortfolio(id: string, updates: Partial<SavedPortfolio>): Promise<SavedPortfolio | undefined> {
    try {
      const [updatedPortfolio] = await db.update(savedPortfolios)
        .set(updates)
        .where(eq(savedPortfolios.id, id))
        .returning();
      
      return updatedPortfolio;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating portfolio:', error);
      throw new Error(`Failed to update portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePortfolio(id: string): Promise<boolean> {
    try {
      const result = await db.delete(savedPortfolios).where(eq(savedPortfolios.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error deleting portfolio:', error);
      throw new Error(`Failed to delete portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePortfolioLastAccessed(id: string): Promise<void> {
    try {
      await db.update(savedPortfolios)
        .set({ lastAccessedAt: new Date() })
        .where(eq(savedPortfolios.id, id));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating portfolio last accessed:', error);
      throw new Error(`Failed to update portfolio last accessed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // User Management Operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting user:', error);
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUsersByEmailAndAuthProvider(email: string, authProvider: string): Promise<User[]> {
    try {
      return await db.select()
        .from(users)
        .where(and(
          eq(users.email, email.toLowerCase()),
          eq(users.authProvider, authProvider)
        ));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting users by email and auth provider:', error);
      throw new Error(`Failed to get users by email and auth provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    try {
      console.log('[STORAGE] Upserting user with email:', user.email, 'authProvider:', user.authProvider);
      
      // First, check if a user with this email already exists
      const existingUsers = await this.getUsersByEmailAndAuthProvider(user.email, user.authProvider || 'replit');
      
      if (existingUsers.length > 0) {
        // User exists with same email and auth provider - update it
        const existingUser = existingUsers[0];
        console.log('[STORAGE] Found existing user with same email and auth provider:', existingUser.id);
        
        const [updatedUser] = await db.update(users)
          .set({
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            emailVerified: user.emailVerified ?? existingUser.emailVerified,
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        
        return updatedUser;
      }
      
      // Check if a user with this email exists but with a different auth provider
      const [allUsersWithEmail] = await db.select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);
      
      if (allUsersWithEmail) {
        // User exists with same email but different auth provider
        // Return the existing user (they should use their original login method)
        console.log('[STORAGE] User exists with email', user.email, 'but different auth provider. Returning existing user.');
        return allUsersWithEmail;
      }
      
      // No existing user - create new one
      const userData: any = {
        ...user,
        id: user.id || randomUUID(),
        authProvider: user.authProvider || 'replit',
        passwordHash: user.passwordHash ?? null,
        emailVerified: user.emailVerified ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('[STORAGE] Creating new user with id:', userData.id);
      
      const [newUser] = await db.insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            emailVerified: userData.emailVerified,
            updatedAt: new Date()
          }
        })
        .returning();
      
      return newUser;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error upserting user:', error);
      throw new Error(`Failed to upsert user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Password reset token management
  async setResetToken(userId: string, token: string, expires: Date): Promise<void> {
    try {
      await db.update(users)
        .set({
          resetToken: token,
          resetTokenExpires: expires,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error setting reset token:', error);
      throw new Error(`Failed to set reset token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(and(
          eq(users.resetToken, token),
          sql`${users.resetTokenExpires} > NOW()`
        ));
      return user;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting user by reset token:', error);
      throw new Error(`Failed to get user by reset token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearResetToken(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set({
          resetToken: null,
          resetTokenExpires: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error clearing reset token:', error);
      throw new Error(`Failed to clear reset token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to get scraped property IDs from property profile IDs
  private async getScrapedPropertyIdsFromProfileIds(profileIds: string[]): Promise<string[]> {
    try {
      if (profileIds.length === 0) return [];
      
      console.log('[DRIZZLE_STORAGE] Getting scraped property IDs from profile IDs:', profileIds);
      
      // Step 1: Get all scraping jobs for the selected property profiles
      const jobs = await db.select().from(scrapingJobs)
        .where(inArray(scrapingJobs.propertyProfileId, profileIds));
      
      console.log('[DRIZZLE_STORAGE] Found', jobs.length, 'scraping jobs for selected profiles');
      
      if (jobs.length === 0) return [];
      
      // Step 2: Get all scraped properties from those scraping jobs
      const jobIds = jobs.map(job => job.id);
      const scrapedProps = await db.select().from(scrapedProperties)
        .where(inArray(scrapedProperties.scrapingJobId, jobIds));
      
      const propertyIds = scrapedProps.map(prop => prop.id);
      console.log('[DRIZZLE_STORAGE] Found', propertyIds.length, 'scraped properties for selected profiles');
      
      return propertyIds;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraped property IDs from profile IDs:', error);
      return [];
    }
  }

  // Multi-property analysis support
  async generateMultiPropertyAnalysis(sessionId: string, criteria: FilterCriteria, competitiveRelationships?: any[], providedPropertyProfiles?: any[]): Promise<FilteredAnalysis> {
    // This is a complex method that generates analysis based on session data
    // For now, we'll delegate to legacy analysis logic but use session-based data
    try {
      const allUnits = await this.getScrapedUnitsForSession(sessionId);
      
      // Get unit details with property information to determine isSubject
      const unitsWithPropertyInfo = await Promise.all(
        allUnits.map(async (unit) => {
          const property = await this.getScrapedProperty(unit.propertyId);
          return {
            ...unit,
            isSubject: property?.isSubjectProperty || false,
            propertyName: property?.name || 'Unknown Property'
          };
        })
      );
      
      const subjectUnits = unitsWithPropertyInfo.filter(unit => unit.isSubject);
      const competitorUnits = unitsWithPropertyInfo.filter(unit => !unit.isSubject);
      
      // Apply filtering based on criteria
      let filteredSubjectUnits = [...subjectUnits];
      let filteredCompetitorUnits = [...competitorUnits];
      
      // Filter by bedroom types
      if (criteria.bedroomTypes && criteria.bedroomTypes.length > 0) {
        console.log('[FILTER] Applying bedroom filter:', criteria.bedroomTypes);
        
        filteredSubjectUnits = filteredSubjectUnits.filter(unit => {
          // Use helper to get bedroom count from bedrooms field OR unitType string
          const bedroomCount = this.getUnitBedroomCount(unit);
          if (bedroomCount === null) return false;
          
          return criteria.bedroomTypes!.some(type => {
            if (type === 'Studio' || type.toLowerCase() === 'studio') {
              return bedroomCount === 0;
            }
            const match = type.match(/(\d+)/);
            if (match) {
              return bedroomCount === parseInt(match[1]);
            }
            return false;
          });
        });
        
        filteredCompetitorUnits = filteredCompetitorUnits.filter(unit => {
          // Use helper to get bedroom count from bedrooms field OR unitType string
          const bedroomCount = this.getUnitBedroomCount(unit);
          if (bedroomCount === null) return false;
          
          return criteria.bedroomTypes!.some(type => {
            if (type === 'Studio' || type.toLowerCase() === 'studio') {
              return bedroomCount === 0;
            }
            const match = type.match(/(\d+)/);
            if (match) {
              return bedroomCount === parseInt(match[1]);
            }
            return false;
          });
        });
      }
      
      // Filter by price range
      if (criteria.priceRange) {
        console.log('[FILTER] Applying price range filter:', criteria.priceRange);
        filteredSubjectUnits = filteredSubjectUnits.filter(unit => {
          const rent = typeof unit.rent === 'string' ? 
            parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return rent >= criteria.priceRange!.min && rent <= criteria.priceRange!.max;
        });
        filteredCompetitorUnits = filteredCompetitorUnits.filter(unit => {
          const rent = typeof unit.rent === 'string' ? 
            parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return rent >= criteria.priceRange!.min && rent <= criteria.priceRange!.max;
        });
      }
      
      // Filter by square footage range
      if (criteria.squareFootageRange) {
        console.log('[FILTER] Applying square footage filter:', criteria.squareFootageRange);
        filteredSubjectUnits = filteredSubjectUnits.filter(unit => 
          unit.squareFootage && 
          unit.squareFootage >= criteria.squareFootageRange!.min && 
          unit.squareFootage <= criteria.squareFootageRange!.max
        );
        filteredCompetitorUnits = filteredCompetitorUnits.filter(unit => 
          unit.squareFootage && 
          unit.squareFootage >= criteria.squareFootageRange!.min && 
          unit.squareFootage <= criteria.squareFootageRange!.max
        );
      }
      
      // Filter by selected properties
      if (criteria.selectedProperties !== undefined) {
        // If selectedProperties is defined (even if empty), apply the filter
        if (criteria.selectedProperties.length === 0) {
          // No properties selected - return no units
          console.log('[FILTER] No properties selected - filtering out all units');
          filteredSubjectUnits = [];
          filteredCompetitorUnits = [];
        } else {
          // Properties are selected - filter to only those properties
          console.log('[FILTER] Applying property selection filter:', criteria.selectedProperties.length, 'properties');
          console.log('[FILTER] Selected property profile IDs:', criteria.selectedProperties);
          
          // Get scraped property IDs from the selected property profile IDs
          const selectedScrapedPropertyIds = await this.getScrapedPropertyIdsFromProfileIds(criteria.selectedProperties);
          console.log('[FILTER] Mapped to scraped property IDs:', selectedScrapedPropertyIds);
          
          if (selectedScrapedPropertyIds.length > 0) {
            // Filter units to only include those from the selected properties
            filteredSubjectUnits = filteredSubjectUnits.filter(unit => {
              const isSelected = selectedScrapedPropertyIds.includes(unit.propertyId);
              if (isSelected) {
                console.log('[FILTER] Including subject unit from property:', unit.propertyName);
              }
              return isSelected;
            });
            
            filteredCompetitorUnits = filteredCompetitorUnits.filter(unit => {
              const isSelected = selectedScrapedPropertyIds.includes(unit.propertyId);
              if (isSelected) {
                console.log('[FILTER] Including competitor unit from property:', unit.propertyName);
              }
              return isSelected;
            });
          } else {
            console.log('[FILTER] Warning: No scraped properties found for selected property profiles');
            // No scraped properties found - filter out all units
            filteredSubjectUnits = [];
            filteredCompetitorUnits = [];
          }
        }
      }
      
      // Filter by competitive set
      if (criteria.competitiveSet && criteria.competitiveSet !== "all_competitors") {
        console.log('[FILTER] Applying competitive set filter:', criteria.competitiveSet);
        
        switch (criteria.competitiveSet) {
          case "subject_properties_only":
            // Only keep subject units, clear competitor units
            filteredCompetitorUnits = [];
            break;
            
          case "internal_competitors_only":
            // This would require knowledge of which competitors are "internal"
            // For now, we'll keep all competitors (can be enhanced with relationship data)
            break;
            
          case "external_competitors_only":
            // This would require knowledge of which competitors are "external"  
            // For now, we'll keep all competitors (can be enhanced with relationship data)
            break;
        }
      }
      
      console.log('[FILTER] After filtering - Subject units:', filteredSubjectUnits.length, 'Competitor units:', filteredCompetitorUnits.length);
      
      // Simplified analysis for database implementation
      const analysis: FilteredAnalysis = {
        marketPosition: "Competitive",
        pricingPowerScore: 75,
        competitiveAdvantages: ["Modern amenities", "Prime location"],
        recommendations: ["Consider rental optimization", "Enhance marketing"],
        unitCount: filteredSubjectUnits.length + filteredCompetitorUnits.length,
        avgRent: (filteredSubjectUnits.length + filteredCompetitorUnits.length) > 0 ? 
          [...filteredSubjectUnits, ...filteredCompetitorUnits].reduce((sum, unit) => {
            const rent = typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
            return sum + (isNaN(rent) ? 0 : rent);
          }, 0) / (filteredSubjectUnits.length + filteredCompetitorUnits.length) : 0,
        percentileRank: 70,
        locationScore: 85,
        amenityScore: 80,
        pricePerSqFt: (() => {
          const allUnits = [...filteredSubjectUnits, ...filteredCompetitorUnits];
          const validUnitsWithSqft = allUnits.filter(u => u.squareFootage && u.squareFootage > 0);
          if (validUnitsWithSqft.length === 0) return 0;
          const rent = (unit: typeof validUnitsWithSqft[0]) => 
            typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) || 0 : (unit.rent || 0);
          return Math.round((validUnitsWithSqft.reduce((sum, unit) => 
            sum + (rent(unit) / (unit.squareFootage || 1)), 0) / validUnitsWithSqft.length) * 100) / 100;
        })(),
        subjectUnits: filteredSubjectUnits.map(unit => ({
          unitId: unit.id,
          propertyName: unit.propertyName,
          unitType: unit.unitType,
          bedrooms: unit.bedrooms || 0,
          bathrooms: unit.bathrooms ? parseFloat(unit.bathrooms.toString()) : null,
          squareFootage: unit.squareFootage,
          rent: typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) || 0 : (unit.rent || 0),
          isSubject: true,
          availabilityDate: unit.availabilityDate || undefined
        })),
        competitorUnits: filteredCompetitorUnits.map(unit => ({
          unitId: unit.id,
          propertyName: unit.propertyName,
          unitType: unit.unitType,
          bedrooms: unit.bedrooms || 0,
          bathrooms: unit.bathrooms ? parseFloat(unit.bathrooms.toString()) : null,
          squareFootage: unit.squareFootage,
          rent: typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) || 0 : (unit.rent || 0),
          isSubject: false,
          availabilityDate: unit.availabilityDate || undefined
        })),
        competitiveEdges: {
          pricing: { edge: 5, label: "+5% above market", status: "advantage" },
          size: { edge: 120, label: "+120 sq ft larger", status: "advantage" },
          availability: { edge: 2, label: "2 days faster", status: "advantage" },
          amenities: { edge: 15, label: "Premium amenities", status: "advantage" }
        },
        aiInsights: ["Strong competitive position", "Excellent location advantage"],
        subjectAvgRent: filteredSubjectUnits.length > 0 ? filteredSubjectUnits.reduce((sum, unit) => {
          const rent = typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return sum + (isNaN(rent) ? 0 : rent);
        }, 0) / filteredSubjectUnits.length : 0,
        competitorAvgRent: filteredCompetitorUnits.length > 0 ? filteredCompetitorUnits.reduce((sum, unit) => {
          const rent = typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return sum + (isNaN(rent) ? 0 : rent);
        }, 0) / filteredCompetitorUnits.length : 0,
        subjectAvgSqFt: filteredSubjectUnits.length > 0 ? filteredSubjectUnits.reduce((sum, unit) => sum + (unit.squareFootage || 0), 0) / filteredSubjectUnits.length : 0,
        competitorAvgSqFt: filteredCompetitorUnits.length > 0 ? filteredCompetitorUnits.reduce((sum, unit) => sum + (unit.squareFootage || 0), 0) / filteredCompetitorUnits.length : 0
      };
      
      return analysis;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error generating multi-property analysis:', error);
      throw new Error(`Failed to generate analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSubjectPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]> {
    try {
      if (sessionId) {
        const profiles = await this.getPropertyProfilesInSession(sessionId);
        return profiles.filter(profile => profile.profileType === 'subject');
      } else {
        return await this.getPropertyProfilesByType('subject');
      }
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting subject property profiles:', error);
      throw new Error(`Failed to get subject property profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCompetitorPropertyProfiles(sessionId?: string): Promise<PropertyProfile[]> {
    try {
      if (sessionId) {
        const profiles = await this.getPropertyProfilesInSession(sessionId);
        return profiles.filter(profile => profile.profileType === 'competitor');
      } else {
        return await this.getPropertyProfilesByType('competitor');
      }
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting competitor property profiles:', error);
      throw new Error(`Failed to get competitor property profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapedUnitsForSession(sessionId: string): Promise<ScrapedUnit[]> {
    try {
      console.log('[DRIZZLE_STORAGE] Getting scraped units for session with deduplication:', sessionId);
      
      // Get all scraping jobs for this session, ordered by creation date (newest first)
      const jobs = await this.getScrapingJobsBySession(sessionId);
      console.log('[DRIZZLE_STORAGE] Found', jobs.length, 'scraping jobs for session:', sessionId);
      
      // Group jobs by property URL to find the latest job per property
      const latestJobsByProperty = new Map<string, ScrapingJob>();
      
      for (const job of jobs) {
        // Get the property profiles for this job to determine the property URL
        const propertyProfile = job.propertyProfileId ? await this.getPropertyProfile(job.propertyProfileId) : null;
        const propertyUrl = propertyProfile?.url; // Remove cityUrl fallback per architect recommendation
        
        if (propertyUrl) {
          const existingJob = latestJobsByProperty.get(propertyUrl);
          // Handle null createdAt dates properly
          const jobCreatedAt = job.createdAt ? new Date(job.createdAt) : new Date(0);
          const existingJobCreatedAt = existingJob?.createdAt ? new Date(existingJob.createdAt) : new Date(0);
          
          if (!existingJob || jobCreatedAt > existingJobCreatedAt) {
            latestJobsByProperty.set(propertyUrl, job);
          }
        }
      }
      
      console.log('[DRIZZLE_STORAGE] Found', latestJobsByProperty.size, 'unique properties with latest jobs');
      
      // Collect units only from the latest job for each property
      const allUnits: ScrapedUnit[] = [];
      
      // Fix MapIterator compatibility by converting to array
      for (const [propertyUrl, latestJob] of Array.from(latestJobsByProperty.entries())) {
        console.log('[DRIZZLE_STORAGE] Getting units from latest job for property:', propertyUrl, 'job:', latestJob.id);
        
        const properties = await this.getScrapedPropertiesByJob(latestJob.id);
        for (const property of properties) {
          const units = await this.getScrapedUnitsByProperty(property.id);
          console.log('[DRIZZLE_STORAGE] Found', units.length, 'units for property:', property.name);
          allUnits.push(...units);
        }
      }
      
      console.log('[DRIZZLE_STORAGE] Total deduplicated units for session:', allUnits.length);
      return allUnits;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraped units for session:', error);
      throw new Error(`Failed to get scraped units for session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Legacy Properties Methods (for backward compatibility)
  async createProperty(property: InsertProperty): Promise<Property> {
    try {
      // Ensure amenities is properly formatted as string array
      const propertyData = {
        ...property,
        amenities: property.amenities 
          ? Array.isArray(property.amenities) 
            ? property.amenities.filter((item): item is string => typeof item === 'string')
            : []
          : []
      };
      
      const [createdProperty] = await db.insert(properties).values(propertyData).returning();
      
      return createdProperty;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating legacy property:', error);
      throw new Error(`Failed to create property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProperty(id: string): Promise<Property | undefined> {
    try {
      const [property] = await db.select().from(properties).where(eq(properties.id, id));
      return property;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting legacy property:', error);
      throw new Error(`Failed to get property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllProperties(): Promise<Property[]> {
    try {
      return await db.select().from(properties).orderBy(desc(properties.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting all legacy properties:', error);
      throw new Error(`Failed to get properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Property Analysis Methods
  async createPropertyAnalysis(analysis: InsertPropertyAnalysis): Promise<PropertyAnalysis> {
    try {
      // Ensure array properties are properly formatted as string arrays
      const analysisData = {
        ...analysis,
        competitiveAdvantages: analysis.competitiveAdvantages 
          ? Array.isArray(analysis.competitiveAdvantages) 
            ? analysis.competitiveAdvantages.filter((item): item is string => typeof item === 'string')
            : []
          : [],
        recommendations: analysis.recommendations 
          ? Array.isArray(analysis.recommendations) 
            ? analysis.recommendations.filter((item): item is string => typeof item === 'string')
            : []
          : []
      };
      
      const [createdAnalysis] = await db.insert(propertyAnalysis).values(analysisData).returning();
      
      return createdAnalysis;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating property analysis:', error);
      throw new Error(`Failed to create property analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyAnalysis(propertyId: string): Promise<PropertyAnalysis | undefined> {
    try {
      const [analysis] = await db.select().from(propertyAnalysis)
        .where(eq(propertyAnalysis.propertyId, propertyId));
      return analysis;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting property analysis:', error);
      throw new Error(`Failed to get property analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyAnalysisBySession(sessionId: string): Promise<PropertyAnalysis | undefined> {
    try {
      const [analysis] = await db.select().from(propertyAnalysis)
        .where(eq(propertyAnalysis.sessionId, sessionId));
      return analysis;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting property analysis by session:', error);
      throw new Error(`Failed to get property analysis by session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Competitor Properties Methods
  async createCompetitorProperty(property: InsertCompetitorProperty): Promise<CompetitorProperty> {
    try {
      // Ensure amenities is properly formatted as string array
      const propertyData = {
        ...property,
        amenities: property.amenities 
          ? Array.isArray(property.amenities) 
            ? property.amenities.filter((item): item is string => typeof item === 'string')
            : []
          : []
      };
      
      const [createdProperty] = await db.insert(competitorProperties).values(propertyData).returning();
      
      return createdProperty;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating competitor property:', error);
      throw new Error(`Failed to create competitor property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllCompetitorProperties(): Promise<CompetitorProperty[]> {
    try {
      return await db.select().from(competitorProperties).orderBy(desc(competitorProperties.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting all competitor properties:', error);
      throw new Error(`Failed to get competitor properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSelectedCompetitorProperties(ids: string[]): Promise<CompetitorProperty[]> {
    try {
      if (ids.length === 0) return [];
      return await db.select().from(competitorProperties)
        .where(inArray(competitorProperties.id, ids));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting selected competitor properties:', error);
      throw new Error(`Failed to get selected competitor properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Property Units Methods
  async createPropertyUnit(unit: InsertPropertyUnit): Promise<PropertyUnit> {
    try {
      const [createdUnit] = await db.insert(propertyUnits).values(unit).returning();
      
      return createdUnit;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating property unit:', error);
      throw new Error(`Failed to create property unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPropertyUnits(propertyId: string): Promise<PropertyUnit[]> {
    try {
      return await db.select().from(propertyUnits)
        .where(eq(propertyUnits.propertyId, propertyId))
        .orderBy(asc(propertyUnits.unitNumber));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting property units:', error);
      throw new Error(`Failed to get property units: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePropertyUnit(id: string, updates: Partial<PropertyUnit>): Promise<PropertyUnit | undefined> {
    try {
      const [updatedUnit] = await db.update(propertyUnits)
        .set(updates)
        .where(eq(propertyUnits.id, id))
        .returning();
      
      return updatedUnit;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating property unit:', error);
      throw new Error(`Failed to update property unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearPropertyUnits(propertyId: string): Promise<void> {
    // Legacy method for backward compatibility - uses propertyId
    try {
      const existingUnits = await db.select().from(propertyUnits)
        .where(eq(propertyUnits.propertyId, propertyId));
      console.log(`[DRIZZLE_STORAGE] Clearing ${existingUnits.length} existing units for legacy property ${propertyId}`);
      
      await db.delete(propertyUnits).where(eq(propertyUnits.propertyId, propertyId));
      console.log(`[DRIZZLE_STORAGE] Successfully cleared units for legacy property ${propertyId}`);
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error clearing property units:', error);
      throw new Error(`Failed to clear property units: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearPropertyUnitsByProfile(propertyProfileId: string): Promise<void> {
    // New method for property profiles - uses propertyProfileId
    try {
      const existingUnits = await db.select().from(propertyUnits)
        .where(eq(propertyUnits.propertyProfileId, propertyProfileId));
      console.log(`[DRIZZLE_STORAGE] Clearing ${existingUnits.length} existing units for profile ${propertyProfileId}`);
      
      await db.delete(propertyUnits).where(eq(propertyUnits.propertyProfileId, propertyProfileId));
      console.log(`[DRIZZLE_STORAGE] Successfully cleared units for profile ${propertyProfileId}`);
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error clearing property units by profile:', error);
      throw new Error(`Failed to clear property units by profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async replacePropertyUnitsByProfile(propertyProfileId: string, units: InsertPropertyUnit[]): Promise<PropertyUnit[]> {
    try {
      // Get existing units count for logging
      const existingUnits = await db.select().from(propertyUnits)
        .where(eq(propertyUnits.propertyProfileId, propertyProfileId));
      console.log(`[DRIZZLE_STORAGE] Replacing ${existingUnits.length} existing units with ${units.length} new units for profile ${propertyProfileId}`);
      
      // Execute delete and insert operations sequentially (no transaction support in Neon)
      // Delete existing units
      await db.delete(propertyUnits).where(eq(propertyUnits.propertyProfileId, propertyProfileId));
      console.log(`[DRIZZLE_STORAGE] Deleted ${existingUnits.length} old units for profile ${propertyProfileId}`);
      
      // Insert new units if any
      let insertedUnits: PropertyUnit[] = [];
      if (units.length > 0) {
        insertedUnits = await db.insert(propertyUnits).values(units).returning();
        console.log(`[DRIZZLE_STORAGE] Inserted ${insertedUnits.length} new units for profile ${propertyProfileId}`);
      }
      
      console.log(`[DRIZZLE_STORAGE] Replacement complete: ${insertedUnits.length} units now exist for profile ${propertyProfileId}`);
      return insertedUnits;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error replacing property units:', error);
      throw new Error(`Failed to replace property units: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Optimization Reports Methods
  async createOptimizationReport(report: InsertOptimizationReport): Promise<OptimizationReport> {
    try {
      const [createdReport] = await db.insert(optimizationReports).values(report).returning();
      
      return createdReport;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating optimization report:', error);
      throw new Error(`Failed to create optimization report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOptimizationReport(propertyId: string): Promise<OptimizationReport | undefined> {
    try {
      const [report] = await db.select().from(optimizationReports)
        .where(eq(optimizationReports.propertyId, propertyId))
        .orderBy(desc(optimizationReports.createdAt));
      return report;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting optimization report:', error);
      throw new Error(`Failed to get optimization report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllOptimizationReports(): Promise<OptimizationReport[]> {
    try {
      console.log('[DRIZZLE_STORAGE] Getting all optimization reports');
      const reports = await db.select().from(optimizationReports).orderBy(desc(optimizationReports.createdAt));
      console.log('[DRIZZLE_STORAGE] Found', reports.length, 'optimization reports');
      return reports;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting all optimization reports:', error);
      throw new Error(`Failed to get optimization reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOptimizationReportsBySession(sessionId: string): Promise<OptimizationReport[]> {
    try {
      console.log('[DRIZZLE_STORAGE] Getting optimization reports for session:', sessionId);
      const reports = await db.select().from(optimizationReports)
        .where(eq(optimizationReports.sessionId, sessionId))
        .orderBy(desc(optimizationReports.createdAt));
      console.log('[DRIZZLE_STORAGE] Found', reports.length, 'optimization reports for session', sessionId);
      
      if (reports.length > 0) {
        console.log('[DRIZZLE_STORAGE] First report details:', {
          id: reports[0].id,
          sessionId: reports[0].sessionId,
          goal: reports[0].goal,
          totalIncrease: reports[0].totalIncrease,
          affectedUnits: reports[0].affectedUnits,
          createdAt: reports[0].createdAt
        });
      }
      
      return reports;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting optimization reports by session:', error);
      throw new Error(`Failed to get optimization reports by session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Scraping Jobs Methods
  async createScrapingJob(job: InsertScrapingJob): Promise<ScrapingJob> {
    try {
      const [createdJob] = await db.insert(scrapingJobs).values(job).returning();
      
      return createdJob;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating scraping job:', error);
      throw new Error(`Failed to create scraping job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapingJob(id: string): Promise<ScrapingJob | undefined> {
    try {
      const [job] = await db.select().from(scrapingJobs).where(eq(scrapingJobs.id, id));
      return job;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraping job:', error);
      throw new Error(`Failed to get scraping job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapingJobsByProperty(propertyId: string): Promise<ScrapingJob[]> {
    try {
      return await db.select().from(scrapingJobs)
        .where(eq(scrapingJobs.propertyId, propertyId))
        .orderBy(desc(scrapingJobs.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraping jobs by property:', error);
      throw new Error(`Failed to get scraping jobs by property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob | undefined> {
    try {
      const [updatedJob] = await db.update(scrapingJobs)
        .set(updates)
        .where(eq(scrapingJobs.id, id))
        .returning();
      
      return updatedJob;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating scraping job:', error);
      throw new Error(`Failed to update scraping job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapingJobsByProfile(propertyProfileId: string): Promise<ScrapingJob[]> {
    try {
      return await db.select().from(scrapingJobs)
        .where(eq(scrapingJobs.propertyProfileId, propertyProfileId))
        .orderBy(desc(scrapingJobs.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraping jobs by profile:', error);
      throw new Error(`Failed to get scraping jobs by profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapingJobsBySession(sessionId: string): Promise<ScrapingJob[]> {
    try {
      return await db.select().from(scrapingJobs)
        .where(eq(scrapingJobs.sessionId, sessionId))
        .orderBy(desc(scrapingJobs.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraping jobs by session:', error);
      throw new Error(`Failed to get scraping jobs by session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Scraped Properties Methods
  async createScrapedProperty(property: InsertScrapedProperty): Promise<ScrapedProperty> {
    try {
      const [createdProperty] = await db.insert(scrapedProperties).values(property).returning();
      
      return createdProperty;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating scraped property:', error);
      throw new Error(`Failed to create scraped property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapedPropertiesByJob(scrapingJobId: string): Promise<ScrapedProperty[]> {
    try {
      return await db.select().from(scrapedProperties)
        .where(eq(scrapedProperties.scrapingJobId, scrapingJobId))
        .orderBy(desc(scrapedProperties.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraped properties by job:', error);
      throw new Error(`Failed to get scraped properties by job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllScrapedCompetitors(): Promise<ScrapedProperty[]> {
    try {
      return await db.select().from(scrapedProperties)
        .where(eq(scrapedProperties.isSubjectProperty, false))
        .orderBy(desc(scrapedProperties.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting all scraped competitors:', error);
      throw new Error(`Failed to get scraped competitors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSelectedScrapedProperties(ids: string[]): Promise<ScrapedProperty[]> {
    try {
      if (ids.length === 0) return [];
      return await db.select().from(scrapedProperties)
        .where(inArray(scrapedProperties.id, ids));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting selected scraped properties:', error);
      throw new Error(`Failed to get selected scraped properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateScrapedProperty(id: string, updates: Partial<ScrapedProperty>): Promise<ScrapedProperty | undefined> {
    try {
      const [updatedProperty] = await db.update(scrapedProperties)
        .set(updates)
        .where(eq(scrapedProperties.id, id))
        .returning();
      
      return updatedProperty;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating scraped property:', error);
      throw new Error(`Failed to update scraped property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Scraped Units Methods
  async createScrapedUnit(unit: InsertScrapedUnit): Promise<ScrapedUnit> {
    try {
      const [createdUnit] = await db.insert(scrapedUnits).values(unit).returning();
      
      return createdUnit;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating scraped unit:', error);
      throw new Error(`Failed to create scraped unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Clear all scraped units for a specific property
  async clearScrapedUnitsForProperty(propertyId: string): Promise<void> {
    try {
      console.log('[DRIZZLE_STORAGE] Clearing scraped units for property:', propertyId);
      const result = await db.delete(scrapedUnits).where(eq(scrapedUnits.propertyId, propertyId));
      console.log('[DRIZZLE_STORAGE] Cleared', result.rowCount, 'scraped units for property:', propertyId);
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error clearing scraped units for property:', error);
      throw new Error(`Failed to clear scraped units for property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Replace all scraped units for a property (clear existing + insert new)
  async replaceScrapedUnitsForProperty(propertyId: string, units: InsertScrapedUnit[]): Promise<ScrapedUnit[]> {
    try {
      console.log('[DRIZZLE_STORAGE] Replacing scraped units for property:', propertyId, 'with', units.length, 'new units');
      
      // First, clear existing units for this property (use existing method)
      await this.clearScrapedUnitsForProperty(propertyId);
      console.log('[DRIZZLE_STORAGE] Cleared existing units for property:', propertyId);
      
      // Then insert new units (if any)
      if (units.length === 0) {
        console.log('[DRIZZLE_STORAGE] No new units to insert for property:', propertyId);
        return [];
      }
      
      // Insert all new units in a single bulk operation
      const createdUnits = await db.insert(scrapedUnits).values(units).returning();
      console.log('[DRIZZLE_STORAGE] Successfully replaced', createdUnits.length, 'scraped units for property:', propertyId);
      
      return createdUnits;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error replacing scraped units for property:', error);
      // If insertion failed after deletion, log this critical situation
      if (error instanceof Error && error.message.includes('insert')) {
        console.error('[DRIZZLE_STORAGE] CRITICAL: Units were cleared but insertion failed. Property has no units now.');
      }
      throw new Error(`Failed to replace scraped units for property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapedUnitsByProperty(propertyId: string): Promise<ScrapedUnit[]> {
    try {
      return await db.select().from(scrapedUnits)
        .where(eq(scrapedUnits.propertyId, propertyId))
        .orderBy(asc(scrapedUnits.unitType));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraped units by property:', error);
      throw new Error(`Failed to get scraped units by property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Subject Property Methods
  async getSubjectScrapedProperty(): Promise<ScrapedProperty | null> {
    try {
      const [subjectProperty] = await db.select().from(scrapedProperties)
        .where(eq(scrapedProperties.isSubjectProperty, true))
        .orderBy(desc(scrapedProperties.createdAt));
      return subjectProperty || null;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting subject scraped property:', error);
      throw new Error(`Failed to get subject scraped property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScrapedProperty(id: string): Promise<ScrapedProperty | undefined> {
    try {
      const [property] = await db.select().from(scrapedProperties).where(eq(scrapedProperties.id, id));
      return property;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting scraped property:', error);
      throw new Error(`Failed to get scraped property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOriginalPropertyIdFromScraped(scrapedPropertyId: string): Promise<string | null> {
    try {
      // Get the scraped property first
      const scrapedProperty = await this.getScrapedProperty(scrapedPropertyId);
      if (!scrapedProperty) return null;
      
      // Get the scraping job to find the original property ID
      const scrapingJob = await this.getScrapingJob(scrapedProperty.scrapingJobId);
      return scrapingJob?.propertyId || null;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting original property ID from scraped:', error);
      throw new Error(`Failed to get original property ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper to extract normalized bedroom count from a scraped unit
   * Checks bedrooms field first, then falls back to parsing unitType string
   */
  private getUnitBedroomCount(unit: ScrapedUnit): number | null {
    // Primary source: numeric bedrooms field
    if (unit.bedrooms !== null && unit.bedrooms !== undefined) {
      return unit.bedrooms;
    }
    
    // Fallback: parse unitType string
    if (unit.unitType) {
      const unitTypeLower = unit.unitType.toLowerCase();
      
      // Check for Studio (0 bedrooms)
      if (unitTypeLower.includes('studio')) {
        return 0;
      }
      
      // Extract number from patterns like "1 Bed", "1 Bedroom", "1BR", "2 Bed", etc.
      const match = unit.unitType.match(/(\d+)\s*(bed|bedroom|br)/i);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return null;
  }

  // Filtered Analysis Methods
  async getFilteredScrapedUnits(criteria: FilterCriteria): Promise<ScrapedUnit[]> {
    try {
      console.log('[STORAGE] Filtering scraped units with criteria:', JSON.stringify(criteria, null, 2));
      
      // Get all scraped units first
      let allUnits = await db.select().from(scrapedUnits).orderBy(asc(scrapedUnits.rent));
      console.log('[STORAGE] Total scraped units before filtering:', allUnits.length);
      
      // Filter by bedroom types if specified
      if (criteria.bedroomTypes && criteria.bedroomTypes.length > 0) {
        allUnits = allUnits.filter(unit => {
          // Get normalized bedroom count from bedrooms field or unitType
          const bedroomCount = this.getUnitBedroomCount(unit);
          
          // If we couldn't determine bedroom count, exclude the unit
          if (bedroomCount === null) return false;
          
          return criteria.bedroomTypes!.some(type => {
            // Handle "Studio" (0 bedrooms)
            if (type === 'Studio' || type.toLowerCase() === 'studio') {
              return bedroomCount === 0;
            }
            // Extract number from filter type (e.g., "1BR" -> 1, "2BR" -> 2)
            const match = type.match(/(\d+)/);
            if (match) {
              return bedroomCount === parseInt(match[1]);
            }
            return false;
          });
        });
        console.log('[STORAGE] After bedroom filter:', allUnits.length);
      }
      
      // Filter by price range
      if (criteria.priceRange) {
        const { min, max } = criteria.priceRange;
        allUnits = allUnits.filter(unit => {
          if (unit.rent === null) return false;
          const rent = typeof unit.rent === 'string' ? parseFloat(unit.rent) : unit.rent;
          return rent >= min && rent <= max;
        });
        console.log('[STORAGE] After price range filter:', allUnits.length);
      }
      
      // Filter by square footage range
      if (criteria.squareFootageRange) {
        const { min, max } = criteria.squareFootageRange;
        allUnits = allUnits.filter(unit => {
          if (!unit.squareFootage) return false;
          return unit.squareFootage >= min && unit.squareFootage <= max;
        });
        console.log('[STORAGE] After square footage filter:', allUnits.length);
      }
      
      // Filter by availability
      if (criteria.availability) {
        const now = new Date();
        allUnits = allUnits.filter(unit => {
          if (!unit.availabilityDate) return true; // Include if no date specified
          
          const availDate = new Date(unit.availabilityDate);
          
          if (criteria.availability === '30days') {
            const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return availDate <= thirtyDaysOut;
          } else if (criteria.availability === '60days') {
            const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
            return availDate <= sixtyDaysOut;
          } else if (criteria.availability === 'now') {
            // Check if status indicates immediate availability
            return unit.status === 'available' && 
                   (unit.availabilityDate?.toLowerCase().includes('now') || 
                    unit.availabilityDate?.toLowerCase().includes('immediate') ||
                    availDate <= now);
          }
          
          return true;
        });
        console.log('[STORAGE] After availability filter:', allUnits.length);
      }
      
      console.log('[STORAGE] Final filtered units count:', allUnits.length);
      return allUnits;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting filtered scraped units:', error);
      throw new Error(`Failed to get filtered scraped units: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateFilteredAnalysis(propertyId: string, criteria: FilterCriteria): Promise<FilteredAnalysis> {
    try {
      // Get filtered units for the property
      const allUnits = await this.getFilteredScrapedUnits(criteria);
      
      // Get unit details with property information to determine isSubject
      const unitsWithPropertyInfo = await Promise.all(
        allUnits.map(async (unit) => {
          const property = await this.getScrapedProperty(unit.propertyId);
          return {
            ...unit,
            isSubject: property?.isSubjectProperty || false,
            propertyName: property?.name || 'Unknown Property'
          };
        })
      );
      
      const subjectUnits = unitsWithPropertyInfo.filter(unit => unit.isSubject);
      const competitorUnits = unitsWithPropertyInfo.filter(unit => !unit.isSubject);
      
      // Apply filtering based on criteria
      let filteredSubjectUnits = [...subjectUnits];
      let filteredCompetitorUnits = [...competitorUnits];
      
      // Filter by bedroom types (already applied in getFilteredScrapedUnits, but apply again for safety)
      if (criteria.bedroomTypes && criteria.bedroomTypes.length > 0) {
        console.log('[FILTER] Applying bedroom filter:', criteria.bedroomTypes);
        
        filteredSubjectUnits = filteredSubjectUnits.filter(unit => {
          // Use helper to get bedroom count from bedrooms field OR unitType string
          const bedroomCount = this.getUnitBedroomCount(unit);
          if (bedroomCount === null) return false;
          
          return criteria.bedroomTypes!.some(type => {
            if (type === 'Studio' || type.toLowerCase() === 'studio') {
              return bedroomCount === 0;
            }
            const match = type.match(/(\d+)/);
            if (match) {
              return bedroomCount === parseInt(match[1]);
            }
            return false;
          });
        });
        
        filteredCompetitorUnits = filteredCompetitorUnits.filter(unit => {
          // Use helper to get bedroom count from bedrooms field OR unitType string
          const bedroomCount = this.getUnitBedroomCount(unit);
          if (bedroomCount === null) return false;
          
          return criteria.bedroomTypes!.some(type => {
            if (type === 'Studio' || type.toLowerCase() === 'studio') {
              return bedroomCount === 0;
            }
            const match = type.match(/(\d+)/);
            if (match) {
              return bedroomCount === parseInt(match[1]);
            }
            return false;
          });
        });
      }
      
      // Filter by price range
      if (criteria.priceRange) {
        console.log('[FILTER] Applying price range filter:', criteria.priceRange);
        filteredSubjectUnits = filteredSubjectUnits.filter(unit => {
          const rent = typeof unit.rent === 'string' ? 
            parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return rent >= criteria.priceRange!.min && rent <= criteria.priceRange!.max;
        });
        filteredCompetitorUnits = filteredCompetitorUnits.filter(unit => {
          const rent = typeof unit.rent === 'string' ? 
            parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return rent >= criteria.priceRange!.min && rent <= criteria.priceRange!.max;
        });
      }
      
      // Filter by square footage range
      if (criteria.squareFootageRange) {
        console.log('[FILTER] Applying square footage filter:', criteria.squareFootageRange);
        filteredSubjectUnits = filteredSubjectUnits.filter(unit => 
          unit.squareFootage && 
          unit.squareFootage >= criteria.squareFootageRange!.min && 
          unit.squareFootage <= criteria.squareFootageRange!.max
        );
        filteredCompetitorUnits = filteredCompetitorUnits.filter(unit => 
          unit.squareFootage && 
          unit.squareFootage >= criteria.squareFootageRange!.min && 
          unit.squareFootage <= criteria.squareFootageRange!.max
        );
      }
      
      console.log('[FILTER] After filtering - Subject units:', filteredSubjectUnits.length, 'Competitor units:', filteredCompetitorUnits.length);
      
      // Generate simplified analysis
      const analysis: FilteredAnalysis = {
        marketPosition: "Competitive",
        pricingPowerScore: 75,
        competitiveAdvantages: ["Modern amenities", "Prime location"],
        recommendations: ["Consider rental optimization", "Enhance marketing"],
        unitCount: filteredSubjectUnits.length + filteredCompetitorUnits.length,
        avgRent: (filteredSubjectUnits.length + filteredCompetitorUnits.length) > 0 ? 
          [...filteredSubjectUnits, ...filteredCompetitorUnits].reduce((sum, unit) => {
            const rent = typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
            return sum + (isNaN(rent) ? 0 : rent);
          }, 0) / (filteredSubjectUnits.length + filteredCompetitorUnits.length) : 0,
        percentileRank: 70,
        locationScore: 85,
        amenityScore: 80,
        pricePerSqFt: (() => {
          const allUnits = [...filteredSubjectUnits, ...filteredCompetitorUnits];
          const validUnitsWithSqft = allUnits.filter(u => u.squareFootage && u.squareFootage > 0);
          if (validUnitsWithSqft.length === 0) return 0;
          const rent = (unit: typeof validUnitsWithSqft[0]) => 
            typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) || 0 : (unit.rent || 0);
          return Math.round((validUnitsWithSqft.reduce((sum, unit) => 
            sum + (rent(unit) / (unit.squareFootage || 1)), 0) / validUnitsWithSqft.length) * 100) / 100;
        })(),
        subjectUnits: filteredSubjectUnits.map(unit => ({
          unitId: unit.id,
          propertyName: unit.propertyName,
          unitType: unit.unitType,
          bedrooms: unit.bedrooms || 0,
          bathrooms: unit.bathrooms ? parseFloat(unit.bathrooms.toString()) : null,
          squareFootage: unit.squareFootage,
          rent: typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) || 0 : (unit.rent || 0),
          isSubject: true,
          availabilityDate: unit.availabilityDate || undefined
        })),
        competitorUnits: filteredCompetitorUnits.map(unit => ({
          unitId: unit.id,
          propertyName: unit.propertyName,
          unitType: unit.unitType,
          bedrooms: unit.bedrooms || 0,
          bathrooms: unit.bathrooms ? parseFloat(unit.bathrooms.toString()) : null,
          squareFootage: unit.squareFootage,
          rent: typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) || 0 : (unit.rent || 0),
          isSubject: false,
          availabilityDate: unit.availabilityDate || undefined
        })),
        competitiveEdges: {
          pricing: { edge: 5, label: "+5% above market", status: "advantage" },
          size: { edge: 120, label: "+120 sq ft larger", status: "advantage" },
          availability: { edge: 2, label: "2 days faster", status: "advantage" },
          amenities: { edge: 15, label: "Premium amenities", status: "advantage" }
        },
        aiInsights: ["Strong competitive position", "Excellent location advantage"],
        subjectAvgRent: filteredSubjectUnits.length > 0 ? filteredSubjectUnits.reduce((sum, unit) => {
          const rent = typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return sum + (isNaN(rent) ? 0 : rent);
        }, 0) / filteredSubjectUnits.length : 0,
        competitorAvgRent: filteredCompetitorUnits.length > 0 ? filteredCompetitorUnits.reduce((sum, unit) => {
          const rent = typeof unit.rent === 'string' ? parseFloat(unit.rent.replace(/[$,]/g, '')) : (unit.rent || 0);
          return sum + (isNaN(rent) ? 0 : rent);
        }, 0) / filteredCompetitorUnits.length : 0,
        subjectAvgSqFt: subjectUnits.reduce((sum, unit) => sum + (unit.squareFootage || 0), 0) / (subjectUnits.length || 1),
        competitorAvgSqFt: competitorUnits.reduce((sum, unit) => sum + (unit.squareFootage || 0), 0) / (competitorUnits.length || 1)
      };
      
      return analysis;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error generating filtered analysis:', error);
      throw new Error(`Failed to generate filtered analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Workflow State Methods
  // NOTE: Workflow states are typically stored in memory for performance
  // These methods provide a database-based implementation for persistence
  private workflowStates = new Map<string, WorkflowState>();
  
  async getWorkflowState(propertyId: string): Promise<WorkflowState | null> {
    try {
      // For now, use in-memory storage for workflow states as they're temporary
      return this.workflowStates.get(propertyId) || null;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting workflow state:', error);
      return null;
    }
  }

  async getWorkflowStateBySession(sessionId: string): Promise<WorkflowState | null> {
    try {
      // Find workflow state by sessionId
      for (const [key, state] of Array.from(this.workflowStates.entries())) {
        if (state.analysisSessionId === sessionId) {
          return state;
        }
      }
      return null;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting workflow state by session:', error);
      return null;
    }
  }

  async saveWorkflowState(state: WorkflowState): Promise<WorkflowState> {
    try {
      // Use propertyId or sessionId as key
      const key = state.propertyId || state.analysisSessionId || 'default';
      this.workflowStates.set(key, state);
      return state;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error saving workflow state:', error);
      throw new Error(`Failed to save workflow state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Property Profile specific methods
  async getPropertyUnitsByProfile(propertyProfileId: string): Promise<PropertyUnit[]> {
    try {
      return await db.select().from(propertyUnits)
        .where(eq(propertyUnits.propertyProfileId, propertyProfileId))
        .orderBy(asc(propertyUnits.unitNumber));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting property units by profile:', error);
      throw new Error(`Failed to get property units by profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Saved Property Profile Methods
  async createSavedPropertyProfile(profile: InsertSavedPropertyProfile): Promise<SavedPropertyProfile> {
    try {
      const [createdProfile] = await db.insert(savedPropertyProfiles).values(profile).returning();
      
      return createdProfile;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating saved property profile:', error);
      throw new Error(`Failed to create saved property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSavedPropertyProfile(id: string): Promise<SavedPropertyProfile | undefined> {
    try {
      const [profile] = await db.select().from(savedPropertyProfiles).where(eq(savedPropertyProfiles.id, id));
      return profile;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting saved property profile:', error);
      throw new Error(`Failed to get saved property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSavedPropertyProfilesByPortfolio(portfolioId: string): Promise<SavedPropertyProfile[]> {
    try {
      return await db.select().from(savedPropertyProfiles)
        .where(eq(savedPropertyProfiles.portfolioId, portfolioId))
        .orderBy(desc(savedPropertyProfiles.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting saved property profiles by portfolio:', error);
      throw new Error(`Failed to get saved property profiles by portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSavedPropertyProfile(id: string, updates: Partial<SavedPropertyProfile>): Promise<SavedPropertyProfile | undefined> {
    try {
      const [updatedProfile] = await db.update(savedPropertyProfiles)
        .set(updates)
        .where(eq(savedPropertyProfiles.id, id))
        .returning();
      
      return updatedProfile;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating saved property profile:', error);
      throw new Error(`Failed to update saved property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSavedPropertyProfile(id: string): Promise<boolean> {
    try {
      const result = await db.delete(savedPropertyProfiles).where(eq(savedPropertyProfiles.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error deleting saved property profile:', error);
      throw new Error(`Failed to delete saved property profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Competitive Relationship Methods
  async createCompetitiveRelationship(relationship: InsertCompetitiveRelationship): Promise<CompetitiveRelationship> {
    try {
      const [createdRelationship] = await db.insert(competitiveRelationships).values(relationship).returning();
      
      return createdRelationship;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating competitive relationship:', error);
      throw new Error(`Failed to create competitive relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCompetitiveRelationship(id: string): Promise<CompetitiveRelationship | undefined> {
    try {
      const [relationship] = await db.select().from(competitiveRelationships).where(eq(competitiveRelationships.id, id));
      return relationship;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting competitive relationship:', error);
      throw new Error(`Failed to get competitive relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCompetitiveRelationshipsByPortfolio(portfolioId: string): Promise<CompetitiveRelationship[]> {
    try {
      return await db.select().from(competitiveRelationships)
        .where(eq(competitiveRelationships.portfolioId, portfolioId))
        .orderBy(desc(competitiveRelationships.createdAt));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting competitive relationships by portfolio:', error);
      throw new Error(`Failed to get competitive relationships by portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateCompetitiveRelationship(id: string, updates: Partial<CompetitiveRelationship>): Promise<CompetitiveRelationship | undefined> {
    try {
      const [updatedRelationship] = await db.update(competitiveRelationships)
        .set(updates)
        .where(eq(competitiveRelationships.id, id))
        .returning();
      
      return updatedRelationship;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating competitive relationship:', error);
      throw new Error(`Failed to update competitive relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async toggleCompetitiveRelationship(id: string): Promise<CompetitiveRelationship | undefined> {
    try {
      // Get current relationship first
      const current = await this.getCompetitiveRelationship(id);
      if (!current) return undefined;
      
      // Toggle the isActive status
      return await this.updateCompetitiveRelationship(id, { 
        isActive: !current.isActive 
      });
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error toggling competitive relationship:', error);
      throw new Error(`Failed to toggle competitive relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteCompetitiveRelationship(id: string): Promise<boolean> {
    try {
      const result = await db.delete(competitiveRelationships).where(eq(competitiveRelationships.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error deleting competitive relationship:', error);
      throw new Error(`Failed to delete competitive relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // TAG Management Methods
  async createTagDefinition(insertTagDef: InsertTagDefinition): Promise<TagDefinition> {
    try {
      const [tagDef] = await db.insert(tagDefinitions).values(insertTagDef).returning();
      return tagDef;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error creating tag definition:', error);
      throw new Error(`Failed to create tag definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTagDefinition(tag: string): Promise<TagDefinition | undefined> {
    try {
      const [tagDef] = await db.select().from(tagDefinitions).where(eq(tagDefinitions.tag, tag));
      return tagDef;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting tag definition:', error);
      throw new Error(`Failed to get tag definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllTagDefinitions(): Promise<TagDefinition[]> {
    try {
      return await db.select().from(tagDefinitions).orderBy(asc(tagDefinitions.displayOrder), asc(tagDefinitions.sortPriority));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting all tag definitions:', error);
      throw new Error(`Failed to get tag definitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTagDefinitionsByGroup(tagGroup: string): Promise<TagDefinition[]> {
    try {
      return await db.select()
        .from(tagDefinitions)
        .where(eq(tagDefinitions.tagGroup, tagGroup))
        .orderBy(asc(tagDefinitions.sortPriority), asc(tagDefinitions.displayOrder));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting tag definitions by group:', error);
      throw new Error(`Failed to get tag definitions by group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async upsertTagDefinition(insertTagDef: InsertTagDefinition): Promise<TagDefinition> {
    try {
      // Check if tag exists
      const existing = await this.getTagDefinition(insertTagDef.tag);
      
      if (existing) {
        // Update existing tag
        const [updatedTag] = await db.update(tagDefinitions)
          .set({
            ...insertTagDef,
            updatedAt: new Date()
          })
          .where(eq(tagDefinitions.id, existing.id))
          .returning();
        return updatedTag;
      } else {
        // Create new tag
        return await this.createTagDefinition(insertTagDef);
      }
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error upserting tag definition:', error);
      throw new Error(`Failed to upsert tag definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTagDefinition(id: string, updates: Partial<TagDefinition>): Promise<TagDefinition | undefined> {
    try {
      const [updatedTag] = await db.update(tagDefinitions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(tagDefinitions.id, id))
        .returning();
      
      return updatedTag;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error updating tag definition:', error);
      throw new Error(`Failed to update tag definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTagDefinition(id: string): Promise<boolean> {
    try {
      const result = await db.delete(tagDefinitions).where(eq(tagDefinitions.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error deleting tag definition:', error);
      throw new Error(`Failed to delete tag definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Hierarchical Unit Queries
  async getUnitsHierarchyByProperty(propertyProfileId: string): Promise<any> {
    try {
      // Get all units for this property
      const units = await db.select()
        .from(propertyUnits)
        .where(eq(propertyUnits.propertyProfileId, propertyProfileId))
        .orderBy(asc(propertyUnits.bedrooms), asc(propertyUnits.tag));
      
      // Get all tag definitions for sorting
      const tags = await this.getAllTagDefinitions();
      const tagOrderMap = new Map(tags.map(t => [t.tag, t.displayOrder ?? 999]));
      
      // Build hierarchy: { bedrooms: { tag: [units] } }
      const hierarchy: any = {};
      
      for (const unit of units) {
        const bedroomKey = unit.bedrooms ?? 0;
        const tagKey = unit.tag ?? 'untagged';
        
        if (!hierarchy[bedroomKey]) {
          hierarchy[bedroomKey] = {};
        }
        
        if (!hierarchy[bedroomKey][tagKey]) {
          hierarchy[bedroomKey][tagKey] = [];
        }
        
        hierarchy[bedroomKey][tagKey].push(unit);
      }
      
      // Sort tags within each bedroom group by displayOrder
      for (const bedroomKey of Object.keys(hierarchy)) {
        const tags = Object.keys(hierarchy[bedroomKey]);
        const sortedTags = tags.sort((a, b) => {
          const orderA = tagOrderMap.get(a) ?? 999;
          const orderB = tagOrderMap.get(b) ?? 999;
          return orderA - orderB;
        });
        
        // Rebuild with sorted tags
        const sortedTagObj: any = {};
        for (const tag of sortedTags) {
          sortedTagObj[tag] = hierarchy[bedroomKey][tag];
        }
        hierarchy[bedroomKey] = sortedTagObj;
      }
      
      return hierarchy;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting units hierarchy by property:', error);
      throw new Error(`Failed to get units hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUnitsHierarchyBySession(sessionId: string): Promise<any> {
    try {
      // Get all property profiles in the session
      const propertyProfiles = await this.getPropertyProfilesInSession(sessionId);
      
      // Get all tag definitions for sorting
      const tags = await this.getAllTagDefinitions();
      const tagOrderMap = new Map(tags.map(t => [t.tag, t.displayOrder ?? 999]));
      
      // Build combined hierarchy for all properties: { bedrooms: { tag: [units] } }
      const hierarchy: any = {};
      
      for (const profile of propertyProfiles) {
        const units = await db.select()
          .from(propertyUnits)
          .where(eq(propertyUnits.propertyProfileId, profile.id))
          .orderBy(asc(propertyUnits.bedrooms), asc(propertyUnits.tag));
        
        for (const unit of units) {
          const bedroomKey = unit.bedrooms ?? 0;
          const tagKey = unit.tag ?? 'untagged';
          
          if (!hierarchy[bedroomKey]) {
            hierarchy[bedroomKey] = {};
          }
          
          if (!hierarchy[bedroomKey][tagKey]) {
            hierarchy[bedroomKey][tagKey] = [];
          }
          
          hierarchy[bedroomKey][tagKey].push(unit);
        }
      }
      
      // Sort tags within each bedroom group by displayOrder
      for (const bedroomKey of Object.keys(hierarchy)) {
        const tags = Object.keys(hierarchy[bedroomKey]);
        const sortedTags = tags.sort((a, b) => {
          const orderA = tagOrderMap.get(a) ?? 999;
          const orderB = tagOrderMap.get(b) ?? 999;
          return orderA - orderB;
        });
        
        // Rebuild with sorted tags
        const sortedTagObj: any = {};
        for (const tag of sortedTags) {
          sortedTagObj[tag] = hierarchy[bedroomKey][tag];
        }
        hierarchy[bedroomKey] = sortedTagObj;
      }
      
      return hierarchy;
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting units hierarchy by session:', error);
      throw new Error(`Failed to get units hierarchy by session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUnitsByPropertyAndTag(propertyProfileId: string, tag: string): Promise<PropertyUnit[]> {
    try {
      return await db.select()
        .from(propertyUnits)
        .where(and(
          eq(propertyUnits.propertyProfileId, propertyProfileId),
          eq(propertyUnits.tag, tag)
        ))
        .orderBy(asc(propertyUnits.unitNumber));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting units by property and tag:', error);
      throw new Error(`Failed to get units by property and tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUnitsByPropertyBedroomTag(propertyProfileId: string, bedrooms: number, tag: string): Promise<PropertyUnit[]> {
    try {
      return await db.select()
        .from(propertyUnits)
        .where(and(
          eq(propertyUnits.propertyProfileId, propertyProfileId),
          eq(propertyUnits.bedrooms, bedrooms),
          eq(propertyUnits.tag, tag)
        ))
        .orderBy(asc(propertyUnits.unitNumber));
    } catch (error) {
      console.error('[DRIZZLE_STORAGE] Error getting units by property, bedroom, and tag:', error);
      throw new Error(`Failed to get units by property, bedroom, and tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Renamed MemStorage to MemStorageLegacy for fallback
export class MemStorageLegacy implements IStorage {
  // New property profiles system
  private propertyProfiles: Map<string, PropertyProfile>;
  private analysisSessions: Map<string, AnalysisSession>;
  private sessionPropertyProfiles: Map<string, SessionPropertyProfile>;
  
  // Portfolio management system
  private savedPortfolios: Map<string, SavedPortfolio>;
  private savedPropertyProfiles: Map<string, SavedPropertyProfile>;
  private competitiveRelationships: Map<string, CompetitiveRelationship>;
  
  // Legacy maps (maintained for backward compatibility)
  private properties: Map<string, Property>;
  private propertyAnalyses: Map<string, PropertyAnalysis>;
  private competitorProperties: Map<string, CompetitorProperty>;
  private propertyUnits: Map<string, PropertyUnit>;
  private optimizationReports: Map<string, OptimizationReport>;
  private scrapingJobs: Map<string, ScrapingJob>;
  private scrapedProperties: Map<string, ScrapedProperty>;
  private scrapedUnits: Map<string, ScrapedUnit>;
  private tagDefinitions: Map<string, TagDefinition>;
  private workflowStates: Map<string, WorkflowState>;
  
  // User authentication
  private users: Map<string, User>;

  constructor() {
    // Initialize new property profiles system
    this.propertyProfiles = new Map();
    this.analysisSessions = new Map();
    this.sessionPropertyProfiles = new Map();
    
    // Initialize portfolio management system
    this.savedPortfolios = new Map();
    this.savedPropertyProfiles = new Map();
    this.competitiveRelationships = new Map();
    
    // Initialize legacy maps
    this.properties = new Map();
    this.propertyAnalyses = new Map();
    this.competitorProperties = new Map();
    this.propertyUnits = new Map();
    this.optimizationReports = new Map();
    this.scrapingJobs = new Map();
    this.scrapedProperties = new Map();
    this.scrapedUnits = new Map();
    this.tagDefinitions = new Map();
    this.workflowStates = new Map();
    
    // Initialize user authentication
    this.users = new Map();
    // Removed seedData() - only use real data from Scrapezy
  }

  // NEW: Property Profiles System Methods
  
  async createPropertyProfile(insertProfile: InsertPropertyProfile): Promise<PropertyProfile> {
    const id = randomUUID();
    const profile: PropertyProfile = {
      ...insertProfile,
      id,
      userId: insertProfile.userId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      city: insertProfile.city ?? null,
      state: insertProfile.state ?? null,
      propertyType: insertProfile.propertyType ?? null,
      totalUnits: insertProfile.totalUnits ?? null,
      builtYear: insertProfile.builtYear ?? null,
      squareFootage: insertProfile.squareFootage ?? null,
      parkingSpaces: insertProfile.parkingSpaces ?? null,
      amenities: insertProfile.amenities ? insertProfile.amenities.filter((item): item is string => typeof item === 'string') : [],
      unitMix: insertProfile.unitMix ?? null,
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

  async getPropertyProfilesByUser(userId: string): Promise<PropertyProfile[]> {
    return Array.from(this.propertyProfiles.values()).filter(
      profile => profile.userId === userId
    );
  }

  async getPropertyProfilesByUserAndType(userId: string, profileType: 'subject' | 'competitor'): Promise<PropertyProfile[]> {
    return Array.from(this.propertyProfiles.values()).filter(
      profile => profile.userId === userId && profile.profileType === profileType
    );
  }

  async getPropertyProfileByNameAndAddress(userId: string, name: string, address: string): Promise<PropertyProfile | undefined> {
    return Array.from(this.propertyProfiles.values()).find(
      profile => profile.userId === userId && 
                 profile.name === name && 
                 profile.address === address
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
      description: insertSession.description ?? null,
      userId: insertSession.userId ?? null,
      portfolioId: insertSession.portfolioId ?? null
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

  async getAnalysisSessionsByUser(userId: string): Promise<AnalysisSession[]> {
    return Array.from(this.analysisSessions.values()).filter(
      session => session.userId === userId
    );
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
  
  async getScrapedUnitsForSession(sessionId: string): Promise<ScrapedUnit[]> {
    console.log('[STORAGE] Getting scraped units for session:', sessionId);
    
    // Get all property profiles in the session
    const propertyProfiles = await this.getPropertyProfilesInSession(sessionId);
    console.log('[STORAGE] Found', propertyProfiles.length, 'property profiles in session');
    
    const allUnits: ScrapedUnit[] = [];
    
    // For each property profile, find its scraped units
    for (const profile of propertyProfiles) {
      // Get the latest completed scraping job for this property profile
      const scrapingJobs = await this.getScrapingJobsByProfile(profile.id);
      const completedJobs = scrapingJobs
        .filter(job => job.status === 'completed')
        .sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt) : (a.createdAt ? new Date(a.createdAt) : new Date());
          const dateB = b.completedAt ? new Date(b.completedAt) : (b.createdAt ? new Date(b.createdAt) : new Date());
          return dateB.getTime() - dateA.getTime();
        });

      if (completedJobs.length === 0) {
        console.log('[STORAGE] No completed scraping jobs for property profile:', profile.name);
        continue;
      }

      const latestJob = completedJobs[0];
      console.log('[STORAGE] Using latest job for', profile.name, ':', latestJob.id);

      // Get scraped properties for this job
      const scrapedProperties = await this.getScrapedPropertiesByJob(latestJob.id);
      
      // Get units for each scraped property
      for (const scrapedProperty of scrapedProperties) {
        const units = await this.getScrapedUnitsByProperty(scrapedProperty.id);
        console.log('[STORAGE] Found', units.length, 'units for property:', scrapedProperty.name);
        allUnits.push(...units);
      }
    }
    
    console.log('[STORAGE] Total scraped units for session:', allUnits.length);
    return allUnits;
  }

  async generateMultiPropertyAnalysis(sessionId: string, criteria: FilterCriteria, competitiveRelationships?: any[], providedPropertyProfiles?: any[]): Promise<FilteredAnalysis> {
    console.log('[STORAGE] Generating multi-property analysis for session:', sessionId);
    console.log('[STORAGE] Filter criteria:', JSON.stringify(criteria, null, 2));
    
    // Get all scraped units for this session
    const allSessionUnits = await this.getScrapedUnitsForSession(sessionId);
    
    if (allSessionUnits.length === 0) {
      console.log('[STORAGE] No scraped units found for session, returning default analysis');
      return {
        marketPosition: "No Data Available",
        pricingPowerScore: 0,
        competitiveAdvantages: ["Scraping Required"],
        recommendations: ["Please complete property scraping to generate analysis"],
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
          "Complete property scraping to enable portfolio analysis",
          "Add properties from the Property Selection Matrix",
          "Analysis requires unit-level data from scraped properties"
        ],
        subjectAvgRent: 0,
        competitorAvgRent: 0,
        subjectAvgSqFt: 0,
        competitorAvgSqFt: 0
      };
    }

    // Filter the units based on criteria by temporarily storing them and using existing filter logic
    const originalUnits = this.scrapedUnits;
    let filteredUnits: ScrapedUnit[];
    try {
      // Temporarily replace scraped units with session units for filtering
      this.scrapedUnits = new Map();
      allSessionUnits.forEach(unit => this.scrapedUnits.set(unit.id, unit));
      
      // Use existing filter method
      filteredUnits = await this.getFilteredScrapedUnits(criteria);
      console.log('[STORAGE] Filtered to', filteredUnits.length, 'units matching criteria');
      
    } finally {
      // Always restore original units
      this.scrapedUnits = originalUnits;
    }
    
    // Get property profiles to determine subject vs competitor
    const propertyProfiles = await this.getPropertyProfilesInSession(sessionId);
    const subjectProfiles = propertyProfiles.filter(p => p.profileType === 'subject');
    const competitorProfiles = propertyProfiles.filter(p => p.profileType === 'competitor');
    
    // Get property map for unit classification
    const propertyMap = new Map<string, ScrapedProperty>();
    for (const prop of Array.from(this.scrapedProperties.values())) {
      propertyMap.set(prop.id, prop);
    }
    
    // Map scraped properties to their profile types
    const profileMap = new Map<string, PropertyProfile>();
    for (const profile of propertyProfiles) {
      // Find scraped properties associated with this profile
      const jobs = await this.getScrapingJobsByProfile(profile.id);
      for (const job of jobs) {
        if (job.status === 'completed') {
          const scrapedProps = await this.getScrapedPropertiesByJob(job.id);
          for (const scrapedProp of scrapedProps) {
            profileMap.set(scrapedProp.id, profile);
          }
        }
      }
    }
    
    // Separate subject and competitor units based on their property profiles
    const subjectUnits = filteredUnits.filter(unit => {
      const property = propertyMap.get(unit.propertyId);
      const profile = property ? profileMap.get(property.id) : null;
      return profile?.profileType === 'subject';
    });
    
    const competitorUnits = filteredUnits.filter(unit => {
      const property = propertyMap.get(unit.propertyId);
      const profile = property ? profileMap.get(property.id) : null;
      return profile?.profileType === 'competitor';
    });
    
    console.log('[STORAGE] Subject units:', subjectUnits.length, 'Competitor units:', competitorUnits.length);
    
    // Use the same formatting and analysis logic as single property analysis
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
    
    // Calculate averages using the same logic
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
    
    // Rest of analysis logic follows the same pattern as generateFilteredAnalysis
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
    
    // Generate dynamic recommendations for portfolio
    const competitiveAdvantages = [];
    if (percentileRank > 75) competitiveAdvantages.push("Portfolio has premium market positioning");
    if (competitiveEdges.size.status === "advantage") competitiveAdvantages.push("Portfolio units are larger than market average");
    if (competitiveEdges.pricing.status === "advantage") competitiveAdvantages.push("Portfolio has competitive pricing advantage");
    if (competitiveEdges.availability.status === "advantage") competitiveAdvantages.push("Portfolio has higher unit availability");
    if (competitiveEdges.amenities.status === "advantage") competitiveAdvantages.push("Portfolio properties offer superior amenities");
    if (subjectProfiles.length > 1) competitiveAdvantages.push("Diversified portfolio reduces market risk");
    
    const recommendations = [];
    if (percentileRank < 30) recommendations.push("Review pricing strategy across portfolio to better align with market");
    if (competitiveEdges.size.status === "disadvantage") recommendations.push("Highlight portfolio value propositions to offset smaller unit sizes");
    if (competitiveEdges.pricing.status === "disadvantage") recommendations.push("Ensure premium pricing is justified across all portfolio properties");
    if (subjectProfiles.length > 1) recommendations.push("Leverage portfolio scale for operational efficiencies");
    if (recommendations.length === 0) recommendations.push("Maintain current competitive positioning across portfolio");
    
    // Generate market position for portfolio
    let marketPosition = "Portfolio Market Average";
    if (percentileRank > 75) marketPosition = "Premium Portfolio Leader";
    else if (percentileRank > 50) marketPosition = "Above Market Portfolio";
    else if (percentileRank > 25) marketPosition = "Below Market Portfolio";
    else marketPosition = "Value Portfolio Position";
    
    // Portfolio-specific AI insights
    const aiInsights = [
      `Portfolio analysis across ${subjectProfiles.length} subject properties vs ${competitorProfiles.length} competitors`,
      `Portfolio ranks in the ${percentileRank}th percentile for this filter criteria`,
      competitiveEdges.pricing.status === "advantage" ? 
        "Portfolio pricing provides strong competitive advantage in the current market" :
        competitiveEdges.pricing.status === "disadvantage" ?
        "Consider reviewing pricing strategy across portfolio properties" :
        "Portfolio pricing aligns well with market expectations",
      subjectUnitsFormatted.length > 0 ?
        `Portfolio has ${subjectUnitsFormatted.length} units matching filters across ${subjectProfiles.length} properties` :
        "No portfolio units match the current filter criteria - consider expanding criteria"
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
      pricePerSqFt: (() => {
        const validUnitsWithSqft = subjectUnitsFormatted.filter(u => u.squareFootage && u.squareFootage > 0);
        return validUnitsWithSqft.length > 0 
          ? Math.round((validUnitsWithSqft.reduce((sum, unit) => sum + (unit.rent / (unit.squareFootage || 1)), 0) / validUnitsWithSqft.length) * 100) / 100
          : 0;
      })(),
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
      updatedAt: new Date(),
      propertyId: insertUnit.propertyId ?? null,
      propertyProfileId: insertUnit.propertyProfileId ?? null,
      status: insertUnit.status || "occupied",
      recommendedRent: insertUnit.recommendedRent ?? null,
      tag: insertUnit.tag ?? null,
      bedrooms: insertUnit.bedrooms ?? null,
      bathrooms: insertUnit.bathrooms ?? null,
      squareFeet: insertUnit.squareFeet ?? null,
      marketRent: insertUnit.marketRent ?? null,
      optimalRent: insertUnit.optimalRent ?? null,
      leaseEndDate: insertUnit.leaseEndDate ?? null,
      daysOnMarket: insertUnit.daysOnMarket ?? null,
      rentPercentile: insertUnit.rentPercentile ?? null,
      optimizationPriority: insertUnit.optimizationPriority ?? null
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
    
    const updatedUnit = { ...unit, ...updates, updatedAt: new Date() };
    this.propertyUnits.set(id, updatedUnit);
    return updatedUnit;
  }

  async clearPropertyUnits(propertyId: string): Promise<void> {
    // Legacy method for backward compatibility - uses propertyId
    const unitsToDelete = Array.from(this.propertyUnits.keys()).filter(id => {
      const unit = this.propertyUnits.get(id);
      return unit && unit.propertyId === propertyId;
    });
    
    console.log(`[MEM_STORAGE] Clearing ${unitsToDelete.length} existing units for legacy property ${propertyId}`);
    unitsToDelete.forEach(id => this.propertyUnits.delete(id));
    console.log(`[MEM_STORAGE] Successfully cleared units for legacy property ${propertyId}`);
  }

  async clearPropertyUnitsByProfile(propertyProfileId: string): Promise<void> {
    // New method for property profiles - uses propertyProfileId
    const unitsToDelete = Array.from(this.propertyUnits.keys()).filter(id => {
      const unit = this.propertyUnits.get(id);
      return unit && unit.propertyProfileId === propertyProfileId;
    });
    
    console.log(`[MEM_STORAGE] Clearing ${unitsToDelete.length} existing units for profile ${propertyProfileId}`);
    unitsToDelete.forEach(id => this.propertyUnits.delete(id));
    console.log(`[MEM_STORAGE] Successfully cleared units for profile ${propertyProfileId}`);
  }

  async replacePropertyUnitsByProfile(propertyProfileId: string, units: InsertPropertyUnit[]): Promise<PropertyUnit[]> {
    // Get existing units count for logging
    const existingUnits = Array.from(this.propertyUnits.values()).filter(
      unit => unit.propertyProfileId === propertyProfileId
    );
    console.log(`[MEM_STORAGE] Replacing ${existingUnits.length} existing units with ${units.length} new units for profile ${propertyProfileId}`);
    
    // Delete existing units
    await this.clearPropertyUnitsByProfile(propertyProfileId);
    
    // Insert new units
    const insertedUnits: PropertyUnit[] = [];
    for (const unit of units) {
      const newUnit = await this.createPropertyUnit(unit);
      insertedUnits.push(newUnit);
    }
    
    console.log(`[MEM_STORAGE] Replacement complete: ${insertedUnits.length} units now exist for profile ${propertyProfileId}`);
    return insertedUnits;
  }

  async createOptimizationReport(insertReport: InsertOptimizationReport): Promise<OptimizationReport> {
    const id = randomUUID();
    const report: OptimizationReport = { 
      ...insertReport, 
      id, 
      createdAt: new Date(),
      sessionId: insertReport.sessionId ?? null,
      propertyProfileId: insertReport.propertyProfileId ?? null,
      propertyId: insertReport.propertyId ?? null,
      optimizedUnits: insertReport.optimizedUnits ?? null,
      portfolioSummary: insertReport.portfolioSummary ?? null
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

  async clearScrapedUnitsForProperty(propertyId: string): Promise<void> {
    console.log('[STORAGE] Clearing scraped units for property:', propertyId);
    const unitsToDelete = Array.from(this.scrapedUnits.entries())
      .filter(([_, unit]) => unit.propertyId === propertyId)
      .map(([id, _]) => id);
    
    unitsToDelete.forEach(id => this.scrapedUnits.delete(id));
    console.log('[STORAGE] Cleared', unitsToDelete.length, 'scraped units for property:', propertyId);
  }

  async replaceScrapedUnitsForProperty(propertyId: string, units: InsertScrapedUnit[]): Promise<ScrapedUnit[]> {
    console.log('[STORAGE] Replacing scraped units for property:', propertyId, 'with', units.length, 'new units');
    
    // First, clear existing units for this property
    await this.clearScrapedUnitsForProperty(propertyId);
    
    // Then insert new units
    const insertedUnits: ScrapedUnit[] = [];
    for (const insertUnit of units) {
      const unit = await this.createScrapedUnit(insertUnit);
      insertedUnits.push(unit);
    }
    
    console.log('[STORAGE] Successfully replaced units for property:', propertyId, 'inserted:', insertedUnits.length);
    return insertedUnits;
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

    // Filter by selected properties - only include units from specific properties
    if (criteria.selectedProperties !== undefined) {
      const beforePropertyCount = units.length;
      
      if (criteria.selectedProperties.length === 0) {
        // No properties selected - filter out all units
        console.log('[FILTER] No properties selected - filtering out all units');
        units = [];
      } else {
        // Properties are selected - filter to only those properties
        console.log('[FILTER] Applying property filter for', criteria.selectedProperties.length, 'selected properties');
        
        // Get the scraped properties that correspond to the selected property profiles
        const selectedScrapedPropertyIds = new Set<string>();
        
        for (const propertyProfileId of criteria.selectedProperties) {
          // Find scraping jobs for this property profile
          const scrapingJobs = await this.getScrapingJobsByProfile(propertyProfileId);
          for (const job of scrapingJobs) {
            if (job.status === 'completed') {
              const scrapedProps = await this.getScrapedPropertiesByJob(job.id);
              for (const scrapedProp of scrapedProps) {
                selectedScrapedPropertyIds.add(scrapedProp.id);
              }
            }
          }
        }
        
        console.log('[FILTER] Found', selectedScrapedPropertyIds.size, 'scraped properties for selected profiles');
        
        if (selectedScrapedPropertyIds.size > 0) {
          units = units.filter(unit => selectedScrapedPropertyIds.has(unit.propertyId));
          console.log('[FILTER] After property selection filter:', units.length, 'units (filtered out', beforePropertyCount - units.length, ')');
        } else {
          console.log('[FILTER] No scraped properties found for selected property profiles - filtering out all units');
          units = [];
        }
      }
    }

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
      pricePerSqFt: (() => {
        const validUnitsWithSqft = subjectUnitsFormatted.filter(u => u.squareFootage && u.squareFootage > 0);
        return validUnitsWithSqft.length > 0 
          ? Math.round((validUnitsWithSqft.reduce((sum, unit) => sum + (unit.rent / (unit.squareFootage || 1)), 0) / validUnitsWithSqft.length) * 100) / 100
          : 0;
      })(),
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

  async getOptimizationReportsBySession(sessionId: string): Promise<OptimizationReport[]> {
    return Array.from(this.optimizationReports.values()).filter(report => 
      report.sessionId === sessionId
    );
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

  // NEW: PORTFOLIO MANAGEMENT OPERATIONS
  
  // Portfolio CRUD operations
  async createPortfolio(insertPortfolio: InsertSavedPortfolio): Promise<SavedPortfolio> {
    const id = randomUUID();
    const portfolio: SavedPortfolio = {
      ...insertPortfolio,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      description: insertPortfolio.description ?? null
    };
    this.savedPortfolios.set(id, portfolio);
    return portfolio;
  }

  async getPortfolio(id: string): Promise<SavedPortfolio | undefined> {
    return this.savedPortfolios.get(id);
  }

  async getPortfoliosByUser(userId: string): Promise<SavedPortfolio[]> {
    return Array.from(this.savedPortfolios.values()).filter(
      portfolio => portfolio.userId === userId
    );
  }

  async updatePortfolio(id: string, updates: Partial<SavedPortfolio>): Promise<SavedPortfolio | undefined> {
    const portfolio = this.savedPortfolios.get(id);
    if (!portfolio) return undefined;
    
    const updatedPortfolio = { 
      ...portfolio, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.savedPortfolios.set(id, updatedPortfolio);
    return updatedPortfolio;
  }

  async deletePortfolio(id: string): Promise<boolean> {
    // Also delete related property profiles and competitive relationships
    const propertyProfiles = await this.getSavedPropertyProfilesByPortfolio(id);
    for (const profile of propertyProfiles) {
      await this.deleteSavedPropertyProfile(profile.id);
    }
    
    const relationships = await this.getCompetitiveRelationshipsByPortfolio(id);
    for (const relationship of relationships) {
      await this.deleteCompetitiveRelationship(relationship.id);
    }
    
    return this.savedPortfolios.delete(id);
  }

  async updatePortfolioLastAccessed(id: string): Promise<void> {
    const portfolio = this.savedPortfolios.get(id);
    if (portfolio) {
      portfolio.lastAccessedAt = new Date();
      this.savedPortfolios.set(id, portfolio);
    }
  }

  // Property profile operations within portfolios
  async createSavedPropertyProfile(insertProfile: InsertSavedPropertyProfile): Promise<SavedPropertyProfile> {
    const id = randomUUID();
    const profile: SavedPropertyProfile = {
      ...insertProfile,
      id,
      createdAt: new Date(),
      unitMix: insertProfile.unitMix ?? {}
    };
    this.savedPropertyProfiles.set(id, profile);
    return profile;
  }

  async getSavedPropertyProfile(id: string): Promise<SavedPropertyProfile | undefined> {
    return this.savedPropertyProfiles.get(id);
  }

  async getSavedPropertyProfilesByPortfolio(portfolioId: string): Promise<SavedPropertyProfile[]> {
    return Array.from(this.savedPropertyProfiles.values()).filter(
      profile => profile.portfolioId === portfolioId
    );
  }

  async updateSavedPropertyProfile(id: string, updates: Partial<SavedPropertyProfile>): Promise<SavedPropertyProfile | undefined> {
    const profile = this.savedPropertyProfiles.get(id);
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...updates };
    this.savedPropertyProfiles.set(id, updatedProfile);
    return updatedProfile;
  }

  async deleteSavedPropertyProfile(id: string): Promise<boolean> {
    // Also delete related competitive relationships
    const relationships = Array.from(this.competitiveRelationships.values()).filter(
      rel => rel.propertyAId === id || rel.propertyBId === id
    );
    for (const relationship of relationships) {
      await this.deleteCompetitiveRelationship(relationship.id);
    }
    
    return this.savedPropertyProfiles.delete(id);
  }

  // Competitive relationship operations
  async createCompetitiveRelationship(insertRelationship: InsertCompetitiveRelationship): Promise<CompetitiveRelationship> {
    const id = randomUUID();
    const relationship: CompetitiveRelationship = {
      ...insertRelationship,
      id,
      createdAt: new Date(),
      isActive: insertRelationship.isActive ?? true
    };
    this.competitiveRelationships.set(id, relationship);
    return relationship;
  }

  async getCompetitiveRelationship(id: string): Promise<CompetitiveRelationship | undefined> {
    return this.competitiveRelationships.get(id);
  }

  async getCompetitiveRelationshipsByPortfolio(portfolioId: string): Promise<CompetitiveRelationship[]> {
    return Array.from(this.competitiveRelationships.values()).filter(
      relationship => relationship.portfolioId === portfolioId
    );
  }

  async updateCompetitiveRelationship(id: string, updates: Partial<CompetitiveRelationship>): Promise<CompetitiveRelationship | undefined> {
    const relationship = this.competitiveRelationships.get(id);
    if (!relationship) return undefined;
    
    const updatedRelationship = { ...relationship, ...updates };
    this.competitiveRelationships.set(id, updatedRelationship);
    return updatedRelationship;
  }

  async toggleCompetitiveRelationship(id: string): Promise<CompetitiveRelationship | undefined> {
    const relationship = this.competitiveRelationships.get(id);
    if (!relationship) return undefined;
    
    const updatedRelationship = { ...relationship, isActive: !relationship.isActive };
    this.competitiveRelationships.set(id, updatedRelationship);
    return updatedRelationship;
  }

  async deleteCompetitiveRelationship(id: string): Promise<boolean> {
    return this.competitiveRelationships.delete(id);
  }

  // TAG Management Methods
  async createTagDefinition(insertTagDef: InsertTagDefinition): Promise<TagDefinition> {
    const id = randomUUID();
    const tagDef: TagDefinition = {
      ...insertTagDef,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: insertTagDef.category ?? null,
      tagGroup: insertTagDef.tagGroup ?? null,
      displayOrder: insertTagDef.displayOrder ?? 999,
      sortPriority: insertTagDef.sortPriority ?? 0,
      description: insertTagDef.description ?? null,
      bedroomCount: insertTagDef.bedroomCount ?? null
    };
    this.tagDefinitions.set(id, tagDef);
    return tagDef;
  }

  async getTagDefinition(tag: string): Promise<TagDefinition | undefined> {
    return Array.from(this.tagDefinitions.values()).find(t => t.tag === tag);
  }

  async getAllTagDefinitions(): Promise<TagDefinition[]> {
    const tags = Array.from(this.tagDefinitions.values());
    return tags.sort((a, b) => {
      const displayOrderDiff = (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
      if (displayOrderDiff !== 0) return displayOrderDiff;
      return (a.sortPriority ?? 0) - (b.sortPriority ?? 0);
    });
  }

  async getTagDefinitionsByGroup(tagGroup: string): Promise<TagDefinition[]> {
    const tags = Array.from(this.tagDefinitions.values()).filter(t => t.tagGroup === tagGroup);
    return tags.sort((a, b) => {
      const sortPriorityDiff = (a.sortPriority ?? 0) - (b.sortPriority ?? 0);
      if (sortPriorityDiff !== 0) return sortPriorityDiff;
      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }

  async upsertTagDefinition(insertTagDef: InsertTagDefinition): Promise<TagDefinition> {
    const existing = await this.getTagDefinition(insertTagDef.tag);
    
    if (existing) {
      // Update existing tag
      const updatedTag: TagDefinition = {
        ...existing,
        ...insertTagDef,
        updatedAt: new Date()
      };
      this.tagDefinitions.set(existing.id, updatedTag);
      return updatedTag;
    } else {
      // Create new tag
      return await this.createTagDefinition(insertTagDef);
    }
  }

  async updateTagDefinition(id: string, updates: Partial<TagDefinition>): Promise<TagDefinition | undefined> {
    const tagDef = this.tagDefinitions.get(id);
    if (!tagDef) return undefined;
    
    const updatedTag = {
      ...tagDef,
      ...updates,
      updatedAt: new Date()
    };
    this.tagDefinitions.set(id, updatedTag);
    return updatedTag;
  }

  async deleteTagDefinition(id: string): Promise<boolean> {
    return this.tagDefinitions.delete(id);
  }

  // Hierarchical Unit Queries
  async getUnitsHierarchyByProperty(propertyProfileId: string): Promise<any> {
    // Get all units for this property
    const units = Array.from(this.propertyUnits.values()).filter(
      unit => unit.propertyProfileId === propertyProfileId
    );
    
    // Get all tag definitions for sorting
    const tags = await this.getAllTagDefinitions();
    const tagOrderMap = new Map(tags.map(t => [t.tag, t.displayOrder ?? 999]));
    
    // Build hierarchy: { bedrooms: { tag: [units] } }
    const hierarchy: any = {};
    
    for (const unit of units) {
      const bedroomKey = unit.bedrooms ?? 0;
      const tagKey = unit.tag ?? 'untagged';
      
      if (!hierarchy[bedroomKey]) {
        hierarchy[bedroomKey] = {};
      }
      
      if (!hierarchy[bedroomKey][tagKey]) {
        hierarchy[bedroomKey][tagKey] = [];
      }
      
      hierarchy[bedroomKey][tagKey].push(unit);
    }
    
    // Sort tags within each bedroom group by displayOrder
    for (const bedroomKey of Object.keys(hierarchy)) {
      const tagKeys = Object.keys(hierarchy[bedroomKey]);
      const sortedTags = tagKeys.sort((a, b) => {
        const orderA = tagOrderMap.get(a) ?? 999;
        const orderB = tagOrderMap.get(b) ?? 999;
        return orderA - orderB;
      });
      
      // Rebuild with sorted tags
      const sortedTagObj: any = {};
      for (const tag of sortedTags) {
        sortedTagObj[tag] = hierarchy[bedroomKey][tag];
      }
      hierarchy[bedroomKey] = sortedTagObj;
    }
    
    return hierarchy;
  }

  async getUnitsHierarchyBySession(sessionId: string): Promise<any> {
    // Get all property profiles in the session
    const propertyProfiles = await this.getPropertyProfilesInSession(sessionId);
    
    // Get all tag definitions for sorting
    const tags = await this.getAllTagDefinitions();
    const tagOrderMap = new Map(tags.map(t => [t.tag, t.displayOrder ?? 999]));
    
    // Build combined hierarchy for all properties: { bedrooms: { tag: [units] } }
    const hierarchy: any = {};
    
    for (const profile of propertyProfiles) {
      const units = Array.from(this.propertyUnits.values()).filter(
        unit => unit.propertyProfileId === profile.id
      );
      
      for (const unit of units) {
        const bedroomKey = unit.bedrooms ?? 0;
        const tagKey = unit.tag ?? 'untagged';
        
        if (!hierarchy[bedroomKey]) {
          hierarchy[bedroomKey] = {};
        }
        
        if (!hierarchy[bedroomKey][tagKey]) {
          hierarchy[bedroomKey][tagKey] = [];
        }
        
        hierarchy[bedroomKey][tagKey].push(unit);
      }
    }
    
    // Sort tags within each bedroom group by displayOrder
    for (const bedroomKey of Object.keys(hierarchy)) {
      const tagKeys = Object.keys(hierarchy[bedroomKey]);
      const sortedTags = tagKeys.sort((a, b) => {
        const orderA = tagOrderMap.get(a) ?? 999;
        const orderB = tagOrderMap.get(b) ?? 999;
        return orderA - orderB;
      });
      
      // Rebuild with sorted tags
      const sortedTagObj: any = {};
      for (const tag of sortedTags) {
        sortedTagObj[tag] = hierarchy[bedroomKey][tag];
      }
      hierarchy[bedroomKey] = sortedTagObj;
    }
    
    return hierarchy;
  }

  async getUnitsByPropertyAndTag(propertyProfileId: string, tag: string): Promise<PropertyUnit[]> {
    return Array.from(this.propertyUnits.values())
      .filter(unit => unit.propertyProfileId === propertyProfileId && unit.tag === tag)
      .sort((a, b) => {
        if (a.unitNumber && b.unitNumber) {
          return a.unitNumber.localeCompare(b.unitNumber);
        }
        return 0;
      });
  }

  async getUnitsByPropertyBedroomTag(propertyProfileId: string, bedrooms: number, tag: string): Promise<PropertyUnit[]> {
    return Array.from(this.propertyUnits.values())
      .filter(unit => 
        unit.propertyProfileId === propertyProfileId && 
        unit.bedrooms === bedrooms && 
        unit.tag === tag
      )
      .sort((a, b) => {
        if (a.unitNumber && b.unitNumber) {
          return a.unitNumber.localeCompare(b.unitNumber);
        }
        return 0;
      });
  }

  // USER AUTHENTICATION OPERATIONS - MANDATORY for Replit Auth
  
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsersByEmailAndAuthProvider(email: string, authProvider: string): Promise<User[]> {
    const users: User[] = [];
    for (const user of Array.from(this.users.values())) {
      if (user.email?.toLowerCase() === email.toLowerCase() && 
          user.authProvider === authProvider) {
        users.push(user);
      }
    }
    return users;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      ...userData,
      id: userData.id || randomUUID(),
      authProvider: userData.authProvider || 'replit',
      passwordHash: userData.passwordHash ?? null,
      emailVerified: userData.emailVerified ?? false,
      verificationToken: userData.verificationToken ?? null,
      verificationTokenExpires: userData.verificationTokenExpires ?? null,
      resetToken: userData.resetToken ?? null,
      resetTokenExpires: userData.resetTokenExpires ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null
    };
    this.users.set(user.id, user);
    return user;
  }

  // Password reset token management
  async setResetToken(userId: string, token: string, expires: Date): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.resetToken = token;
      user.resetTokenExpires = expires;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const now = new Date();
    for (const user of Array.from(this.users.values())) {
      if (user.resetToken === token && user.resetTokenExpires && user.resetTokenExpires > now) {
        return user;
      }
    }
    return undefined;
  }

  async clearResetToken(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.resetToken = null;
      user.resetTokenExpires = null;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }
}

// Export DrizzleStorage as the default storage implementation for database persistence
export const storage = new DrizzleStorage();

// Keep MemStorageLegacy available as fallback if needed
export const memStorageLegacy = new MemStorageLegacy();
