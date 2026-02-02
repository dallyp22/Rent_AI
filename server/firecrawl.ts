import FirecrawlApp from '@mendable/firecrawl-js';

if (!process.env.FIRECRAWL_API_KEY) {
  console.warn('[FIRECRAWL] Warning: FIRECRAWL_API_KEY environment variable not set');
}

const firecrawl = new FirecrawlApp({ 
  apiKey: process.env.FIRECRAWL_API_KEY || '' 
});

/**
 * Scrape a single property URL using Firecrawl
 * Returns structured property data including units
 */
export async function scrapePropertyUrl(url: string) {
  console.log(`[FIRECRAWL] Scraping single URL: ${url}`);

  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
      waitFor: 5000, // Wait for dynamic content (floor plans, unit listings) to load
    });

    console.log(`[FIRECRAWL] Successfully scraped URL: ${url} (${result?.markdown?.length || 0} chars)`);
    return result;
  } catch (error) {
    console.error(`[FIRECRAWL] Error scraping URL ${url}:`, error);
    throw error;
  }
}

/**
 * Extract structured property data using Firecrawl's extract feature
 * This provides more consistent data extraction using JSON schema
 */
export async function extractPropertyData(url: string): Promise<{ extract: any; markdown: string }> {
  console.log(`[FIRECRAWL] Extracting structured data + markdown from: ${url}`);

  try {
    // Request BOTH extract and markdown in a single API call
    // This ensures we always have markdown content for the OpenAI fallback
    // without needing a second API call that might fail
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['extract', 'markdown'],
      waitFor: 5000, // Wait for dynamic JS content (unit listings) to load
      extract: {
        prompt: 'Extract all property information and every individual available or listed apartment unit. On sites like apartments.com, units are listed under floor plan sections - extract each individual unit row with its specific unit number, rent price, sq ft, and availability. If units are grouped by floor plan, extract each unit separately. For each unit, extract the unit number/identifier, floor plan name, unit type (Studio, 1 Bedroom, 2 Bedroom, etc.), bedroom count, bathroom count, square footage, monthly rent price, and availability date. Also extract the total unit mix showing how many units of each bedroom type exist in the entire property. Be thorough - extract every single unit listing shown on the page, even if they are in expandable or tabbed sections.',
        schema: {
          type: 'object',
          properties: {
            propertyName: { type: 'string', description: 'Name of the apartment property' },
            address: { type: 'string', description: 'Full street address of the property' },
            builtYear: { type: 'number', description: 'Year the property was built' },
            totalUnits: { type: 'number', description: 'Total number of units in the property' },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of property amenities'
            },
            unitMix: {
              type: 'object',
              description: 'Total number of units by bedroom type across the entire property',
              properties: {
                studio: { type: 'number', description: 'Total number of studio units' },
                oneBedroom: { type: 'number', description: 'Total number of 1-bedroom units' },
                twoBedroom: { type: 'number', description: 'Total number of 2-bedroom units' },
                threeBedroom: { type: 'number', description: 'Total number of 3-bedroom units' },
                fourPlusBedroom: { type: 'number', description: 'Total number of 4+ bedroom units' }
              }
            },
            units: {
              type: 'array',
              description: 'All individual apartment units listed on the page with pricing and availability details',
              items: {
                type: 'object',
                properties: {
                  unitNumber: { type: 'string', description: 'Unit number or identifier (e.g. Unit 101, Apt 2B)' },
                  floorPlanName: { type: 'string', description: 'Name of the floor plan (e.g. The Studio, The Franc)' },
                  unitType: { type: 'string', description: 'Type of unit: Studio, 1 Bedroom, 2 Bedroom, 3 Bedroom, etc.' },
                  bedrooms: { type: 'number', description: 'Number of bedrooms (0 for studio)' },
                  bathrooms: { type: 'number', description: 'Number of bathrooms' },
                  squareFootage: { type: 'number', description: 'Unit size in square feet' },
                  rent: { type: 'number', description: 'Monthly rent price in dollars (numbers only, no $ sign)' },
                  availabilityDate: { type: 'string', description: 'Move-in or availability date' },
                  status: { type: 'string', description: 'Availability status (available, occupied, etc.)' }
                },
              },
            },
          },
        },
      },
    });

    const extractData = result.extract || {};
    const markdownContent = result.markdown || '';

    console.log(`[FIRECRAWL] Successfully scraped: ${url}`);
    console.log(`[FIRECRAWL] Extract: ${extractData?.units?.length || 0} units, unitMix:`, extractData?.unitMix);
    console.log(`[FIRECRAWL] Markdown: ${markdownContent.length} chars`);

    return { extract: extractData, markdown: markdownContent };
  } catch (error) {
    console.error(`[FIRECRAWL] Error extracting data from ${url}:`, error);
    throw error;
  }
}

/**
 * Map a property website to discover all URLs
 * Useful for finding all property pages on a website
 */
export async function mapPropertyWebsite(url: string) {
  console.log(`[FIRECRAWL] Mapping website: ${url}`);
  
  try {
    const result = await firecrawl.mapUrl(url);
    console.log(`[FIRECRAWL] Successfully mapped website: ${url} - Found ${result.links?.length || 0} URLs`);
    return result;
  } catch (error) {
    console.error(`[FIRECRAWL] Error mapping website ${url}:`, error);
    throw error;
  }
}

/**
 * Batch scrape multiple property URLs using Firecrawl's crawl feature
 * Polls for completion and returns all results
 */
export async function batchScrapeProperties(urls: string[]) {
  console.log(`[FIRECRAWL] Starting batch scrape for ${urls.length} URLs`);
  
  if (urls.length === 0) {
    return [];
  }
  
  try {
    // Start crawl for the first URL with a limit
    const crawlResult = await firecrawl.crawlUrl(urls[0], {
      limit: urls.length,
      scrapeOptions: {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      },
    });
    
    const crawlId = crawlResult.id;
    console.log(`[FIRECRAWL] Batch crawl started with ID: ${crawlId}`);
    
    // Poll for completion
    let crawlStatus;
    let pollCount = 0;
    const maxPolls = 60; // 2 minutes max (60 * 2 seconds)
    
    while (pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      crawlStatus = await firecrawl.checkCrawlStatus(crawlId);
      
      console.log(`[FIRECRAWL] Crawl status: ${crawlStatus.status} (poll ${pollCount + 1}/${maxPolls})`);
      
      if (crawlStatus.status === 'completed') {
        console.log(`[FIRECRAWL] Batch crawl completed successfully`);
        break;
      }
      
      if (crawlStatus.status === 'failed') {
        throw new Error(`Batch crawl failed: ${crawlStatus.error || 'Unknown error'}`);
      }
      
      pollCount++;
    }
    
    if (pollCount >= maxPolls) {
      throw new Error('Batch crawl timed out after 2 minutes');
    }
    
    return crawlStatus?.data || [];
  } catch (error) {
    console.error(`[FIRECRAWL] Error in batch scrape:`, error);
    throw error;
  }
}

/**
 * Parse Firecrawl result to extract property data
 * Converts Firecrawl's format to the application's expected format
 */
export function parseFirecrawlData(result: any): {
  property: {
    name: string;
    address: string;
    amenities: string[];
    builtYear: number | null;
    totalUnits: number | null;
    unitMix: {
      studio: number;
      oneBedroom: number;
      twoBedroom: number;
      threeBedroom: number;
      fourPlusBedroom: number;
    } | null;
  };
  units: Array<{
    unitNumber: string;
    floorPlanName: string | null;
    unitType: string;
    bedrooms: number | null;
    bathrooms: number | null;
    squareFootage: number | null;
    rent: number | null;
    availabilityDate: string | null;
  }>;
} {
  // If using structured extraction, data will be in result.extract
  const data = result.extract || result;

  // Parse unitMix if available
  const rawUnitMix = data.unitMix;
  const unitMix = rawUnitMix && typeof rawUnitMix === 'object' ? {
    studio: Number(rawUnitMix.studio) || 0,
    oneBedroom: Number(rawUnitMix.oneBedroom) || 0,
    twoBedroom: Number(rawUnitMix.twoBedroom) || 0,
    threeBedroom: Number(rawUnitMix.threeBedroom) || 0,
    fourPlusBedroom: Number(rawUnitMix.fourPlusBedroom) || 0,
  } : null;

  // Parse property information
  const property = {
    name: data.propertyName || data.name || 'Unknown Property',
    address: data.address || 'Unknown Address',
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    builtYear: data.builtYear || null,
    totalUnits: data.totalUnits || null,
    unitMix,
  };

  // Parse units
  const units = Array.isArray(data.units)
    ? data.units.map((unit: any) => ({
        unitNumber: unit.unitNumber || '',
        floorPlanName: unit.floorPlanName || null,
        unitType: unit.unitType || `${unit.bedrooms || 0}BR`,
        bedrooms: unit.bedrooms || null,
        bathrooms: unit.bathrooms || null,
        squareFootage: unit.squareFootage || null,
        rent: unit.rent || null,
        availabilityDate: unit.availabilityDate || null,
      }))
    : [];

  console.log(`[FIRECRAWL] Parsed ${units.length} units from extraction data`);

  return { property, units };
}

