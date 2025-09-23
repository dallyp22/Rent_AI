/**
 * Shared utility functions used across client and server
 */

/**
 * Normalizes amenities input to a consistent string array format
 * Handles various input types: string[], string (comma-separated), array-like objects
 * @param amenities - Raw amenities input of various types
 * @returns Normalized string array of cleaned amenities
 */
export function normalizeAmenities(amenities: any): string[] {
  if (amenities === undefined || amenities === null) {
    return [];
  }

  if (Array.isArray(amenities)) {
    // Handle proper arrays
    return amenities
      .filter((item: any) => typeof item === 'string' && item.trim())
      .map((item: string) => item.trim());
  }

  if (amenities && typeof amenities === 'object' && 'length' in amenities) {
    // Handle array-like objects (e.g., Arguments objects from React Hook Form)
    const result: string[] = [];
    for (let i = 0; i < amenities.length; i++) {
      const item = amenities[i];
      if (typeof item === 'string' && item.trim()) {
        result.push(item.trim());
      }
    }
    return result;
  }

  if (typeof amenities === 'string') {
    // Handle comma-separated strings
    return amenities
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  // Fallback for unknown types
  return [];
}