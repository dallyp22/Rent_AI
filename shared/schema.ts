import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, json, timestamp, index, unique, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define unit mix type for property profiles
export const unitMixSchema = z.object({
  studio: z.number().int().min(0).default(0),
  oneBedroom: z.number().int().min(0).default(0),
  twoBedroom: z.number().int().min(0).default(0),
  threeBedroom: z.number().int().min(0).default(0),
  fourPlusBedroom: z.number().int().min(0).default(0)
});

export type UnitMix = z.infer<typeof unitMixSchema>;

// New unified property profiles table
export const propertyProfiles = pgTable("property_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // User ownership
  name: text("name").notNull(),
  address: text("address").notNull(),
  url: text("url").notNull(), // Direct URL - key requirement
  profileType: text("profile_type").notNull(), // "subject" | "competitor"
  city: text("city"),
  state: text("state"),
  propertyType: text("property_type"),
  totalUnits: integer("total_units"),
  builtYear: integer("built_year"),
  squareFootage: integer("square_footage"),
  parkingSpaces: integer("parking_spaces"),
  amenities: json("amenities").$type<string[]>().default([]),
  unitMix: json("unit_mix").$type<UnitMix>(),
  // Additional fields for competitors (optional, mainly from scraping)
  distance: decimal("distance", { precision: 5, scale: 2 }), // distance from subject property
  matchScore: decimal("match_score", { precision: 5, scale: 2 }), // similarity score
  vacancyRate: decimal("vacancy_rate", { precision: 5, scale: 2 }),
  priceRange: text("price_range"), // for competitors
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Indexes for performance
  userIdIdx: index("property_profiles_user_id_idx").on(table.userId),
  profileTypeIdx: index("property_profiles_profile_type_idx").on(table.profileType),
  urlIdx: index("property_profiles_url_idx").on(table.url),
  locationIdx: index("property_profiles_location_idx").on(table.city, table.state),
  createdAtIdx: index("property_profiles_created_at_idx").on(table.createdAt),
  // Unique constraint on URL per user to prevent duplicates for same user
  urlUserUnique: unique("property_profiles_url_user_unique").on(table.url, table.userId),
  // Check constraint to ensure profileType is valid
  profileTypeCheck: check("property_profiles_profile_type_check", sql`${table.profileType} IN ('subject', 'competitor')`)
}));

// Analysis sessions to group multiple properties for comparison
export const analysisSessions = pgTable("analysis_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Downtown Portfolio Analysis"
  description: text("description"),
  // NEW: Link to users and portfolios
  userId: varchar("user_id").references(() => users.id),
  portfolioId: varchar("portfolio_id").references(() => savedPortfolios.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Indexes for performance
  nameIdx: index("analysis_sessions_name_idx").on(table.name),
  createdAtIdx: index("analysis_sessions_created_at_idx").on(table.createdAt),
  userIdIdx: index("analysis_sessions_user_id_idx").on(table.userId),
  portfolioIdIdx: index("analysis_sessions_portfolio_id_idx").on(table.portfolioId)
}));

// Junction table for many-to-many relationship between sessions and property profiles
export const sessionPropertyProfiles = pgTable("session_property_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => analysisSessions.id).notNull(),
  propertyProfileId: varchar("property_profile_id").references(() => propertyProfiles.id).notNull(),
  role: text("role").notNull(), // "subject" | "competitor" - role in this specific analysis
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Indexes for performance
  sessionIdIdx: index("session_property_profiles_session_id_idx").on(table.sessionId),
  propertyProfileIdIdx: index("session_property_profiles_property_profile_id_idx").on(table.propertyProfileId),
  roleIdx: index("session_property_profiles_role_idx").on(table.role),
  // Unique constraint to prevent duplicate property profiles in same session
  sessionPropertyUnique: unique("session_property_profiles_session_property_unique").on(table.sessionId, table.propertyProfileId),
  // Check constraint to ensure role is valid
  roleCheck: check("session_property_profiles_role_check", sql`${table.role} IN ('subject', 'competitor')`)
}));

// Legacy properties table (maintained for backward compatibility)
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  propertyName: text("property_name").notNull(),
  city: text("city"),
  state: text("state"),
  propertyType: text("property_type"),
  totalUnits: integer("total_units"),
  builtYear: integer("built_year"),
  squareFootage: integer("square_footage"),
  parkingSpaces: integer("parking_spaces"),
  amenities: json("amenities").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow()
});

export const propertyAnalysis = pgTable("property_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Legacy reference (for backward compatibility)
  propertyId: varchar("property_id").references(() => properties.id),
  // New reference to unified property profiles
  propertyProfileId: varchar("property_profile_id").references(() => propertyProfiles.id),
  // Analysis session reference for multi-property analysis
  sessionId: varchar("session_id").references(() => analysisSessions.id),
  marketPosition: text("market_position").notNull(),
  competitiveAdvantages: json("competitive_advantages").$type<string[]>().notNull(),
  pricingInsights: text("pricing_insights").notNull(),
  recommendations: json("recommendations").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const competitorProperties = pgTable("competitor_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  distance: decimal("distance", { precision: 5, scale: 2 }).notNull(),
  priceRange: text("price_range").notNull(),
  totalUnits: integer("total_units").notNull(),
  builtYear: integer("built_year").notNull(),
  amenities: json("amenities").$type<string[]>().notNull().default([]),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(),
  vacancyRate: decimal("vacancy_rate", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const propertyUnits = pgTable("property_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Legacy reference (for backward compatibility)
  propertyId: varchar("property_id").references(() => properties.id),
  // New reference to unified property profiles
  propertyProfileId: varchar("property_profile_id").references(() => propertyProfiles.id),
  unitNumber: text("unit_number").notNull(),
  unitType: text("unit_type").notNull(),
  
  // TAG-based identification and sorting
  tag: text("tag"), // Unique configuration identifier (e.g., "Moscow", "1/1 FRANC")
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  squareFeet: integer("square_feet"),
  
  // Pricing data
  currentRent: decimal("current_rent", { precision: 10, scale: 2 }).notNull(),
  recommendedRent: decimal("recommended_rent", { precision: 10, scale: 2 }),
  marketRent: decimal("market_rent", { precision: 10, scale: 2 }),
  optimalRent: decimal("optimal_rent", { precision: 10, scale: 2 }),
  
  // Status and availability
  status: text("status").notNull().default("occupied"), // vacant, occupied, notice_given
  leaseEndDate: timestamp("lease_end_date"),
  daysOnMarket: integer("days_on_market"),
  
  // Optimization metadata
  rentPercentile: decimal("rent_percentile", { precision: 5, scale: 2 }),
  optimizationPriority: integer("optimization_priority"), // 1-5, for sorting recommendations
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Indexes for hierarchical sorting: Property → Bedroom → TAG
  propertyTagIdx: index("property_units_property_tag_idx").on(table.propertyProfileId, table.tag),
  sortingIdx: index("property_units_sorting_idx").on(table.propertyProfileId, table.bedrooms, table.tag),
  // Fixed: Include property_profile_id for property-scoped optimization queries
  optimizationIdx: index("property_units_optimization_idx").on(table.propertyProfileId, table.optimizationPriority, table.tag),
  // Index for property profile queries
  propertyProfileIdx: index("property_units_property_profile_idx").on(table.propertyProfileId)
}));

export const optimizationReports = pgTable("optimization_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Legacy reference (for backward compatibility)
  propertyId: varchar("property_id").references(() => properties.id),
  // New reference to unified property profiles
  propertyProfileId: varchar("property_profile_id").references(() => propertyProfiles.id),
  // Analysis session reference for multi-property optimization
  sessionId: varchar("session_id").references(() => analysisSessions.id),
  goal: text("goal").notNull(),
  riskTolerance: text("risk_tolerance").notNull(),
  timeline: text("timeline").notNull(),
  totalIncrease: decimal("total_increase", { precision: 10, scale: 2 }).notNull(),
  affectedUnits: integer("affected_units").notNull(),
  avgIncrease: decimal("avg_increase", { precision: 5, scale: 2 }).notNull(),
  riskLevel: text("risk_level").notNull(),
  // Store the optimized units data
  optimizedUnits: json("optimized_units").$type<any[]>(),
  portfolioSummary: json("portfolio_summary").$type<any>(),
  createdAt: timestamp("created_at").defaultNow()
});

// Scrapezy scraping jobs and cached data
export const scrapingJobs = pgTable("scraping_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Legacy reference (for backward compatibility)
  propertyId: varchar("property_id").references(() => properties.id),
  // New reference to unified property profiles
  propertyProfileId: varchar("property_profile_id").references(() => propertyProfiles.id),
  // Analysis session reference for multi-property scraping
  sessionId: varchar("session_id").references(() => analysisSessions.id),
  stage: text("stage").notNull(), // "city_discovery" or "unit_details"
  cityUrl: text("city_url").notNull(),
  scrapezyJobId: text("scrapezy_job_id"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  results: json("results").$type<any>(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});

export const scrapedProperties = pgTable("scraped_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scrapingJobId: varchar("scraping_job_id").references(() => scrapingJobs.id).notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  url: text("url").notNull(),
  distance: decimal("distance", { precision: 5, scale: 2 }),
  isSubjectProperty: boolean("is_subject_property").default(false),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow()
});

export const scrapedUnits = pgTable("scraped_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => scrapedProperties.id).notNull(),
  unitNumber: text("unit_number"),
  floorPlanName: text("floor_plan_name"),
  unitType: text("unit_type").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  squareFootage: integer("square_footage"),
  rent: decimal("rent", { precision: 10, scale: 2 }),
  availabilityDate: text("availability_date"),
  status: text("status").default("available"), // available, occupied, pending
  createdAt: timestamp("created_at").defaultNow()
});

// TAG definitions for unit configuration standardization and sorting
export const tagDefinitions = pgTable("tag_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tag: text("tag").unique().notNull(),
  
  // Categorization
  category: text("category"), // 'location', 'unit_config', 'building', 'custom'
  tagGroup: text("tag_group"), // e.g., 'Portland' for Portland.1, Portland.2, Portland.3
  
  // Sorting control - CRITICAL for hierarchical export
  displayOrder: integer("display_order").notNull().default(999),
  sortPriority: integer("sort_priority").notNull().default(0),
  
  // Metadata
  description: text("description"),
  bedroomCount: integer("bedroom_count"), // To validate unit assignments
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  categoryIdx: index("tag_definitions_category_idx").on(table.category),
  // Composite index for grouped display ordering (filter by group, then sort)
  groupSortIdx: index("tag_definitions_group_sort_idx").on(table.tagGroup, table.sortPriority, table.displayOrder),
  sortIdx: index("tag_definitions_sort_idx").on(table.displayOrder),
  tagIdx: index("tag_definitions_tag_idx").on(table.tag)
}));

// Session storage table - MANDATORY for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - MANDATORY for Replit Auth  
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Dual authentication support fields
  authProvider: text("auth_provider").notNull().default("replit"), // 'replit' or 'local'
  passwordHash: text("password_hash"), // nullable - only used for local auth
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"), // nullable
  verificationTokenExpires: timestamp("verification_token_expires"), // nullable
  resetToken: text("reset_token"), // nullable
  resetTokenExpires: timestamp("reset_token_expires"), // nullable
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for performance
  authProviderIdx: index("users_auth_provider_idx").on(table.authProvider),
  emailIdx: index("users_email_idx").on(table.email),
  // Unique index on lower(email) for case-insensitive email lookups
  emailLowerIdx: index("users_email_lower_idx").on(sql`lower(${table.email})`),
  // Check constraint to ensure authProvider is either 'replit' or 'local'
  authProviderCheck: check("users_auth_provider_check", sql`${table.authProvider} IN ('replit', 'local')`)
}));

// NEW: Portfolio Management Tables

// Saved portfolios for users
export const savedPortfolios = pgTable("saved_portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow()
}, (table) => ({
  // Indexes for performance
  userIdIdx: index("saved_portfolios_user_id_idx").on(table.userId),
  nameIdx: index("saved_portfolios_name_idx").on(table.name),
  createdAtIdx: index("saved_portfolios_created_at_idx").on(table.createdAt),
  lastAccessedIdx: index("saved_portfolios_last_accessed_idx").on(table.lastAccessedAt)
}));

// Saved property profiles within portfolios
export const savedPropertyProfiles = pgTable("saved_property_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => savedPortfolios.id).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  role: text("role").notNull(), // "subject" | "competitor"
  address: text("address").notNull(),
  unitMix: json("unit_mix").$type<{[unitType: string]: number}>().default({}),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Indexes for performance
  portfolioIdIdx: index("saved_property_profiles_portfolio_id_idx").on(table.portfolioId),
  roleIdx: index("saved_property_profiles_role_idx").on(table.role),
  urlIdx: index("saved_property_profiles_url_idx").on(table.url),
  createdAtIdx: index("saved_property_profiles_created_at_idx").on(table.createdAt),
  // Check constraint to ensure role is valid
  roleCheck: check("saved_property_profiles_role_check", sql`${table.role} IN ('subject', 'competitor')`)
}));

// Competitive relationships between properties in a portfolio
export const competitiveRelationships = pgTable("competitive_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => savedPortfolios.id).notNull(),
  propertyAId: varchar("property_a_id").references(() => savedPropertyProfiles.id).notNull(),
  propertyBId: varchar("property_b_id").references(() => savedPropertyProfiles.id).notNull(),
  relationshipType: text("relationship_type").notNull(), // "direct_competitor" | "indirect_competitor" | "market_leader" | "market_follower"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Indexes for performance
  portfolioIdIdx: index("competitive_relationships_portfolio_id_idx").on(table.portfolioId),
  propertyAIdx: index("competitive_relationships_property_a_idx").on(table.propertyAId),
  propertyBIdx: index("competitive_relationships_property_b_idx").on(table.propertyBId),
  relationshipTypeIdx: index("competitive_relationships_type_idx").on(table.relationshipType),
  isActiveIdx: index("competitive_relationships_is_active_idx").on(table.isActive),
  createdAtIdx: index("competitive_relationships_created_at_idx").on(table.createdAt),
  // Unique constraint to prevent duplicate relationships
  uniqueRelationship: unique("competitive_relationships_unique").on(table.portfolioId, table.propertyAId, table.propertyBId),
  // Check constraint to ensure relationship type is valid
  relationshipTypeCheck: check("competitive_relationships_type_check", 
    sql`${table.relationshipType} IN ('direct_competitor', 'indirect_competitor', 'market_leader', 'market_follower')`)
}));

// Insert schemas for new property profiles system
// Custom schema to handle decimal fields properly (they can be strings or numbers)
export const insertPropertyProfileSchema = createInsertSchema(propertyProfiles)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Allow decimal fields to accept both strings and numbers, then transform to string
    distance: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
    matchScore: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
    vacancyRate: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
  });
export const insertAnalysisSessionSchema = createInsertSchema(analysisSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionPropertyProfileSchema = createInsertSchema(sessionPropertyProfiles).omit({ id: true, createdAt: true });

// Legacy insert schemas (maintained for backward compatibility)
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true });
export const insertPropertyAnalysisSchema = createInsertSchema(propertyAnalysis).omit({ id: true, createdAt: true });
export const insertCompetitorPropertySchema = createInsertSchema(competitorProperties).omit({ id: true, createdAt: true });
export const insertPropertyUnitSchema = createInsertSchema(propertyUnits)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Allow decimal fields to accept both strings and numbers, then transform to string
    bathrooms: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
    currentRent: z.union([z.string(), z.number()]).transform(val => val?.toString()),
    recommendedRent: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
    marketRent: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
    optimalRent: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
    rentPercentile: z.union([z.string(), z.number()]).transform(val => val?.toString()).optional().nullable(),
  });
export const insertTagDefinitionSchema = createInsertSchema(tagDefinitions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOptimizationReportSchema = createInsertSchema(optimizationReports).omit({ id: true, createdAt: true });
export const insertScrapingJobSchema = createInsertSchema(scrapingJobs).omit({ id: true, createdAt: true, completedAt: true });
export const insertScrapedPropertySchema = createInsertSchema(scrapedProperties).omit({ id: true, createdAt: true });
export const insertScrapedUnitSchema = createInsertSchema(scrapedUnits).omit({ id: true, createdAt: true });

// User authentication schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });

// NEW: Portfolio management insert schemas
export const insertSavedPortfolioSchema = createInsertSchema(savedPortfolios).omit({ id: true, createdAt: true, updatedAt: true, lastAccessedAt: true });
export const insertSavedPropertyProfileSchema = createInsertSchema(savedPropertyProfiles).omit({ id: true, createdAt: true });
export const insertCompetitiveRelationshipSchema = createInsertSchema(competitiveRelationships).omit({ id: true, createdAt: true });

// New property profiles system types
export type PropertyProfile = typeof propertyProfiles.$inferSelect;
export type InsertPropertyProfile = z.infer<typeof insertPropertyProfileSchema>;
export type AnalysisSession = typeof analysisSessions.$inferSelect;
export type InsertAnalysisSession = z.infer<typeof insertAnalysisSessionSchema>;
export type SessionPropertyProfile = typeof sessionPropertyProfiles.$inferSelect;
export type InsertSessionPropertyProfile = z.infer<typeof insertSessionPropertyProfileSchema>;

// Legacy types (maintained for backward compatibility)
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type PropertyAnalysis = typeof propertyAnalysis.$inferSelect;
export type InsertPropertyAnalysis = z.infer<typeof insertPropertyAnalysisSchema>;
export type CompetitorProperty = typeof competitorProperties.$inferSelect;
export type InsertCompetitorProperty = z.infer<typeof insertCompetitorPropertySchema>;
export type PropertyUnit = typeof propertyUnits.$inferSelect;
export type InsertPropertyUnit = z.infer<typeof insertPropertyUnitSchema>;
export type OptimizationReport = typeof optimizationReports.$inferSelect;
export type InsertOptimizationReport = z.infer<typeof insertOptimizationReportSchema>;
export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = z.infer<typeof insertScrapingJobSchema>;
export type ScrapedProperty = typeof scrapedProperties.$inferSelect;
export type InsertScrapedProperty = z.infer<typeof insertScrapedPropertySchema>;
export type ScrapedUnit = typeof scrapedUnits.$inferSelect;
export type InsertScrapedUnit = z.infer<typeof insertScrapedUnitSchema>;
export type TagDefinition = typeof tagDefinitions.$inferSelect;
export type InsertTagDefinition = z.infer<typeof insertTagDefinitionSchema>;

// NEW: Portfolio management types
export type SavedPortfolio = typeof savedPortfolios.$inferSelect;
export type InsertSavedPortfolio = z.infer<typeof insertSavedPortfolioSchema>;
export type SavedPropertyProfile = typeof savedPropertyProfiles.$inferSelect;
export type InsertSavedPropertyProfile = z.infer<typeof insertSavedPropertyProfileSchema>;
export type CompetitiveRelationship = typeof competitiveRelationships.$inferSelect;
export type InsertCompetitiveRelationship = z.infer<typeof insertCompetitiveRelationshipSchema>;

// Filter criteria and analysis schemas
export const filterCriteriaSchema = z.object({
  bedroomTypes: z.array(z.enum(["Studio", "1BR", "2BR", "3BR"])).default([]),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }),
  availability: z.enum(["now", "30days", "60days"]).default("now"),
  squareFootageRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }),
  // Advanced filters
  amenities: z.array(z.enum(["in_unit_laundry", "parking", "gym", "pool", "pet_friendly"])).optional(),
  leaseTerms: z.array(z.enum(["6_month", "12_month", "month_to_month"])).optional(),
  floorLevel: z.enum(["ground", "mid", "top"]).optional(),
  renovationStatus: z.enum(["newly_renovated", "updated", "original"]).optional(),
  // Property filtering
  selectedProperties: z.array(z.string()).optional(), // Array of property profile IDs
  // Competitive set filters
  competitiveSet: z.enum(["all_competitors", "internal_competitors_only", "external_competitors_only", "subject_properties_only"]).default("all_competitors").optional()
});

// Schema for session-based filtered analysis requests with optional metadata
export const sessionFilteredAnalysisRequestSchema = z.object({
  filterCriteria: filterCriteriaSchema,
  // Optional metadata for competitive set filtering
  competitiveRelationships: z.array(z.object({
    id: z.string(),
    portfolioId: z.string(),
    propertyAId: z.string(),
    propertyBId: z.string(),
    relationshipType: z.enum(["direct_competitor", "indirect_competitor", "market_leader", "market_follower"]),
    isActive: z.boolean(),
    createdAt: z.string()
  })).optional(),
  propertyProfiles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    url: z.string(),
    profileType: z.string(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    propertyType: z.string().nullable().optional(),
    totalUnits: z.number().nullable().optional(),
    builtYear: z.number().nullable().optional(),
    squareFootage: z.number().nullable().optional(),
    parkingSpaces: z.number().nullable().optional(),
    amenities: z.array(z.string()).default([]),
    unitMix: z.record(z.string(), z.number()).nullable().optional(),
    distance: z.string().nullable().optional(),
    matchScore: z.string().nullable().optional(),
    vacancyRate: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })).optional()
});

// Unit comparison data for visualization
export const unitComparisonSchema = z.object({
  unitId: z.string(),
  propertyName: z.string(),
  unitType: z.string(),
  bedrooms: z.number(),
  bathrooms: z.number().nullable(),
  squareFootage: z.number().nullable(),
  rent: z.number(),
  isSubject: z.boolean(),
  availabilityDate: z.string().optional()
});

// Competitive edge analysis
export const competitiveEdgesSchema = z.object({
  pricing: z.object({
    edge: z.number(), // percentage difference from market
    label: z.string(), // e.g., "+5% above market"
    status: z.enum(["advantage", "neutral", "disadvantage"])
  }),
  size: z.object({
    edge: z.number(), // sq ft difference
    label: z.string(), // e.g., "+120 sq ft larger"
    status: z.enum(["advantage", "neutral", "disadvantage"])
  }),
  availability: z.object({
    edge: z.number(), // days difference
    label: z.string(), // e.g., "2 days faster"
    status: z.enum(["advantage", "neutral", "disadvantage"])
  }),
  amenities: z.object({
    edge: z.number(), // score difference
    label: z.string(), // e.g., "Premium amenities"
    status: z.enum(["advantage", "neutral", "disadvantage"])
  })
});

export const filteredAnalysisSchema = z.object({
  marketPosition: z.string(),
  pricingPowerScore: z.number().min(0).max(100),
  competitiveAdvantages: z.array(z.string()),
  recommendations: z.array(z.string()),
  unitCount: z.number().min(0),
  avgRent: z.number().min(0),
  percentileRank: z.number().min(0).max(100),
  locationScore: z.number().min(0).max(100),
  amenityScore: z.number().min(0).max(100),
  pricePerSqFt: z.number().min(0),
  // New fields for enhanced analysis
  subjectUnits: z.array(unitComparisonSchema),
  competitorUnits: z.array(unitComparisonSchema),
  competitiveEdges: competitiveEdgesSchema,
  aiInsights: z.array(z.string()),
  subjectAvgRent: z.number(),
  competitorAvgRent: z.number(),
  subjectAvgSqFt: z.number(),
  competitorAvgSqFt: z.number()
});

export type FilterCriteria = z.infer<typeof filterCriteriaSchema>;
export type UnitComparison = z.infer<typeof unitComparisonSchema>;
export type CompetitiveEdges = z.infer<typeof competitiveEdgesSchema>;
export type FilteredAnalysis = z.infer<typeof filteredAnalysisSchema>;

// User authentication types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof insertUserSchema>;
