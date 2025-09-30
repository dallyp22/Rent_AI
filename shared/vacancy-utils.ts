import type { PropertyProfile, ScrapedUnit } from "./schema";

/**
 * Maps scraped unit types to normalized bedroom categories
 */
const mapUnitTypeToBedroom = (unitType: string): string => {
  const normalizedType = unitType.toLowerCase().trim();
  
  if (normalizedType.includes('studio') || normalizedType === '0br' || normalizedType === '0 br') {
    return 'studio';
  } else if (normalizedType.includes('1 bed') || normalizedType === '1br' || normalizedType === '1 br') {
    return 'oneBedroom';
  } else if (normalizedType.includes('2 bed') || normalizedType === '2br' || normalizedType === '2 br') {
    return 'twoBedroom';
  } else if (normalizedType.includes('3 bed') || normalizedType === '3br' || normalizedType === '3 br') {
    return 'threeBedroom';
  } else if (normalizedType.includes('4 bed') || normalizedType === '4br' || normalizedType === '4 br' || 
             normalizedType.includes('5 bed') || normalizedType === '5br' || normalizedType === '5 br' ||
             normalizedType.includes('penthouse')) {
    return 'fourPlusBedroom';
  }
  
  // Default mapping based on first character if pattern doesn't match
  const firstChar = normalizedType.charAt(0);
  if (firstChar === '0' || normalizedType.startsWith('studio')) {
    return 'studio';
  } else if (firstChar === '1') {
    return 'oneBedroom';
  } else if (firstChar === '2') {
    return 'twoBedroom';
  } else if (firstChar === '3') {
    return 'threeBedroom';
  } else if (firstChar === '4' || firstChar === '5') {
    return 'fourPlusBedroom';
  }
  
  // If we can't determine the type, return unknown
  return 'unknown';
};

/**
 * Calculate overall vacancy percentage for a property
 * @param property - Property profile with unitMix data
 * @param scrapedUnits - Array of scraped units for this property
 * @returns Overall vacancy percentage (0-100) or null if no data
 */
export function calculateOverallVacancy(
  property: Pick<PropertyProfile, 'unitMix' | 'totalUnits'>,
  scrapedUnits: Pick<ScrapedUnit, 'propertyId'>[]
): number | null {
  // Calculate total units from unitMix if available, otherwise use totalUnits
  let totalUnits = 0;
  
  if (property.unitMix && typeof property.unitMix === 'object') {
    const mix = property.unitMix as any;
    totalUnits = (mix.studio || 0) + 
                 (mix.oneBedroom || 0) + 
                 (mix.twoBedroom || 0) + 
                 (mix.threeBedroom || 0) + 
                 (mix.fourPlusBedroom || 0);
  }
  
  // Fallback to totalUnits if unitMix doesn't give us a valid total
  if (totalUnits === 0 && property.totalUnits) {
    totalUnits = property.totalUnits;
  }
  
  // Handle edge case: no units
  if (totalUnits === 0) {
    return null;
  }
  
  // Count vacant units (scraped units are available units)
  const vacantUnits = scrapedUnits.length;
  
  // Calculate vacancy percentage
  const vacancyRate = (vacantUnits / totalUnits) * 100;
  
  // Round to 2 decimal places
  return Math.round(vacancyRate * 100) / 100;
}

/**
 * Calculate vacancy percentage by bedroom type
 * @param property - Property profile with unitMix data
 * @param scrapedUnits - Array of scraped units with unitType information
 * @returns Object with vacancy rates for each bedroom type
 */
export function calculateVacancyByBedroom(
  property: Pick<PropertyProfile, 'unitMix'>,
  scrapedUnits: Pick<ScrapedUnit, 'unitType'>[]
): {
  studio: number | null;
  oneBedroom: number | null;
  twoBedroom: number | null;
  threeBedroom: number | null;
  fourPlusBedroom: number | null;
} {
  const result = {
    studio: null as number | null,
    oneBedroom: null as number | null,
    twoBedroom: null as number | null,
    threeBedroom: null as number | null,
    fourPlusBedroom: null as number | null,
  };
  
  // If no unit mix data, return all nulls
  if (!property.unitMix || typeof property.unitMix !== 'object') {
    return result;
  }
  
  const mix = property.unitMix as any;
  
  // Count vacant units by bedroom type
  const vacantByType: Record<string, number> = {
    studio: 0,
    oneBedroom: 0,
    twoBedroom: 0,
    threeBedroom: 0,
    fourPlusBedroom: 0,
  };
  
  // Group scraped units by bedroom type
  for (const unit of scrapedUnits) {
    if (unit.unitType) {
      const bedroomType = mapUnitTypeToBedroom(unit.unitType);
      if (bedroomType !== 'unknown' && bedroomType in vacantByType) {
        vacantByType[bedroomType]++;
      }
    }
  }
  
  // Calculate vacancy rate for each bedroom type
  const bedroomTypes = ['studio', 'oneBedroom', 'twoBedroom', 'threeBedroom', 'fourPlusBedroom'] as const;
  
  for (const type of bedroomTypes) {
    const totalForType = mix[type] || 0;
    if (totalForType > 0) {
      const vacantForType = vacantByType[type];
      const vacancyRate = (vacantForType / totalForType) * 100;
      result[type] = Math.round(vacancyRate * 100) / 100;
    }
  }
  
  return result;
}

/**
 * Format vacancy rate for display
 * @param rate - Vacancy rate as a number or null
 * @returns Formatted string for display
 */
export function formatVacancyRate(rate: number | null): string {
  if (rate === null) {
    return 'N/A';
  }
  return `${rate.toFixed(1)}%`;
}

/**
 * Get vacancy status level based on rate
 * @param rate - Vacancy rate as a percentage
 * @returns Status level: 'low', 'moderate', 'high', or 'critical'
 */
export function getVacancyStatus(rate: number | null): 'low' | 'moderate' | 'high' | 'critical' | 'unknown' {
  if (rate === null) {
    return 'unknown';
  }
  
  if (rate < 5) {
    return 'low';
  } else if (rate < 10) {
    return 'moderate';
  } else if (rate < 20) {
    return 'high';
  } else {
    return 'critical';
  }
}