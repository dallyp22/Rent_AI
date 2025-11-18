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
      formats: ['markdown', 'html'],
      onlyMainContent: true,
    });
    
    console.log(`[FIRECRAWL] Successfully scraped URL: ${url}`);
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
export async function extractPropertyData(url: string) {
  console.log(`[FIRECRAWL] Extracting structured data from: ${url}`);
  
  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['extract'],
      extract: {
        schema: {
          type: 'object',
          properties: {
            propertyName: { type: 'string' },
            address: { type: 'string' },
            builtYear: { type: 'number' },
            totalUnits: { type: 'number' },
            amenities: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            units: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  unitNumber: { type: 'string' },
                  floorPlanName: { type: 'string' },
                  unitType: { type: 'string' },
                  bedrooms: { type: 'number' },
                  bathrooms: { type: 'number' },
                  squareFootage: { type: 'number' },
                  rent: { type: 'number' },
                  availabilityDate: { type: 'string' },
                  status: { type: 'string' }
                },
              },
            },
          },
        },
      },
    });
    
    console.log(`[FIRECRAWL] Successfully extracted structured data from: ${url}`);
    return result.extract;
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
  
  // Parse property information
  const property = {
    name: data.propertyName || data.name || 'Unknown Property',
    address: data.address || 'Unknown Address',
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    builtYear: data.builtYear || null,
    totalUnits: data.totalUnits || null,
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
  
  return { property, units };
}

