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
 * Utility function to invalidate property profile queries after mutations
 */
export const getPropertyProfileInvalidationKeys = (profileType: 'subject' | 'competitor') => {
  return [
    PROPERTY_PROFILE_QUERY_KEYS.all(),
    PROPERTY_PROFILE_QUERY_KEYS.byType(profileType),
  ];
};