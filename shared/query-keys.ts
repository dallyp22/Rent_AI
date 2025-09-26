// Shared query keys for TanStack Query to prevent cache invalidation mismatches
// This file ensures all components use consistent query keys

/**
 * Property Profiles query keys
 */
export const PROPERTY_PROFILE_QUERY_KEYS = {
  // Get all property profiles
  all: () => ['/api/property-profiles'] as const,
  
  // Get property profiles by type
  byType: (type: 'subject' | 'competitor') => [`/api/property-profiles?type=${type}`] as const,
  
  // Get a specific property profile
  byId: (id: string) => [`/api/property-profiles/${id}`] as const,
} as const;

/**
 * Analysis Session query keys
 */
export const ANALYSIS_SESSION_QUERY_KEYS = {
  // Get all analysis sessions
  all: () => ['/api/analysis-sessions'] as const,
  
  // Get a specific analysis session
  byId: (id: string) => [`/api/analysis-sessions/${id}`] as const,
  
  // Get session properties
  properties: (sessionId: string) => [`/api/analysis-sessions/${sessionId}/properties`] as const,
} as const;

/**
 * Portfolio query keys
 */
export const PORTFOLIO_QUERY_KEYS = {
  // Get all portfolios
  all: () => ['/api/portfolios'] as const,
  
  // Get a specific portfolio
  byId: (id: string) => [`/api/portfolios/${id}`] as const,
  
  // Get properties in a portfolio
  properties: (portfolioId: string) => [`/api/portfolios/${portfolioId}/properties`] as const,
  
  // Get competitive relationships in a portfolio
  competitiveRelationships: (portfolioId: string) => [`/api/portfolios/${portfolioId}/competitive-relationships`] as const,
} as const;

/**
 * Competitive Relationships query keys
 */
export const COMPETITIVE_RELATIONSHIP_QUERY_KEYS = {
  // Get all relationships for a portfolio
  byPortfolio: (portfolioId: string) => PORTFOLIO_QUERY_KEYS.competitiveRelationships(portfolioId),
  
  // Get a specific relationship
  byId: (portfolioId: string, relationshipId: string) => [`/api/portfolios/${portfolioId}/competitive-relationships/${relationshipId}`] as const,
} as const;

/**
 * Utility function to invalidate property profile queries after mutations
 */
export const getPropertyProfileInvalidationKeys = (profileType: 'subject' | 'competitor') => {
  return [
    PROPERTY_PROFILE_QUERY_KEYS.all(),
    PROPERTY_PROFILE_QUERY_KEYS.byType(profileType),
  ];
};

/**
 * Utility function to invalidate competitive relationship queries after mutations
 */
export const getCompetitiveRelationshipInvalidationKeys = (portfolioId: string) => {
  return [
    COMPETITIVE_RELATIONSHIP_QUERY_KEYS.byPortfolio(portfolioId),
    PORTFOLIO_QUERY_KEYS.properties(portfolioId),
  ];
};