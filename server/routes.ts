import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertPropertyAnalysisSchema, insertOptimizationReportSchema, insertScrapingJobSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

const SCRAPEZY_API_KEY = process.env.SCRAPEZY_API_KEY;
const SCRAPEZY_BASE_URL = "https://scrapezy.com/api/extract";

// Scrapezy API integration functions
async function callScrapezyScraping(url: string) {
  if (!SCRAPEZY_API_KEY) {
    throw new Error("Scrapezy API key not configured");
  }

  const prompt = "Extract apartment listings from this apartments.com page. For each apartment property listing, extract: 1) The complete URL link to the individual apartment page (must start with https://www.apartments.com/), 2) The property/apartment name or title, 3) The address or location information. Return as JSON array with objects containing \"url\", \"name\", and \"address\" fields.";

  // Create job
  const jobResponse = await fetch(SCRAPEZY_BASE_URL, {
    method: "POST",
    headers: {
      "x-api-key": SCRAPEZY_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url,
      prompt
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!jobResponse.ok) {
    throw new Error(`Scrapezy API error: ${jobResponse.status} ${jobResponse.statusText}`);
  }

  const jobData = await jobResponse.json();
  const jobId = jobData.id || jobData.jobId;
  
  if (!jobId) {
    throw new Error('No job ID received from Scrapezy');
  }

  // Poll for results
  let attempts = 0;
  const maxAttempts = 15; // 2.5 minutes maximum
  const POLL_INTERVAL = 10000; // 10 seconds
  let finalResult = null;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    attempts++;
    
    const resultResponse = await fetch(`${SCRAPEZY_BASE_URL}/${jobId}`, {
      headers: {
        "x-api-key": SCRAPEZY_API_KEY,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!resultResponse.ok) {
      throw new Error(`Scrapezy polling error: ${resultResponse.status} ${resultResponse.statusText}`);
    }

    const resultData = await resultResponse.json();
    
    if (resultData.status === 'completed') {
      finalResult = resultData;
      break;
    } else if (resultData.status === 'failed') {
      throw new Error(`Scrapezy job failed: ${resultData.error || 'Unknown error'}`);
    }
    // Continue polling if status is pending
  }

  if (!finalResult && attempts >= maxAttempts) {
    throw new Error('Scrapezy job timed out after 2.5 minutes');
  }

  return finalResult;
}

// Parse Scrapezy results to extract property URLs
function parseUrls(scrapezyResult: any): Array<{url: string, name: string, address: string}> {
  let properties = [];
  
  try {
    // Try to get the result from the response structure
    const resultText = scrapezyResult.result || scrapezyResult.data || scrapezyResult;
    
    if (typeof resultText === 'string') {
      try {
        const parsed = JSON.parse(resultText);
        if (Array.isArray(parsed)) {
          properties = parsed.filter(item => 
            item && 
            typeof item === 'object' && 
            item.url && 
            typeof item.url === 'string' &&
            item.url.includes('apartments.com') &&
            item.url.startsWith('http')
          );
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON result, trying fallback parsing');
        // Fallback: try to extract URLs from text
        const lines = resultText.split('\n');
        for (const line of lines) {
          if (line.includes('apartments.com') && line.startsWith('http')) {
            properties.push({
              url: line.trim(),
              name: 'Property',
              address: 'Address not available'
            });
          }
        }
      }
    } else if (Array.isArray(resultText)) {
      properties = resultText.filter(item => 
        item && 
        typeof item === 'object' && 
        item.url && 
        typeof item.url === 'string' &&
        item.url.includes('apartments.com')
      );
    }
  } catch (error) {
    console.error('Error parsing Scrapezy result:', error);
  }

  // Ensure all properties have required fields and deduplicate
  const validProperties = properties
    .map(prop => ({
      url: prop.url?.trim() || '',
      name: prop.name?.trim() || 'Property Name Not Available',
      address: prop.address?.trim() || 'Address Not Available'
    }))
    .filter(prop => prop.url)
    .filter((prop, index, arr) => arr.findIndex(p => p.url === prop.url) === index);

  return validProperties;
}


export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create property and get initial AI analysis
  app.post("/api/properties", async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      
      // Create property
      const property = await storage.createProperty(propertyData);
      
      // Generate AI analysis
      const prompt = `Analyze the following property for real estate market positioning and provide insights in JSON format:
      
      Property Details:
      - Address: ${property.address}
      - Type: ${property.propertyType}
      - Total Units: ${property.totalUnits}
      - Built Year: ${property.builtYear}
      - Square Footage: ${property.squareFootage}
      - Parking Spaces: ${property.parkingSpaces}
      - Amenities: ${property.amenities?.join(", ") || "None specified"}
      
      Please provide analysis in this exact JSON format:
      {
        "marketPosition": "string describing market position",
        "competitiveAdvantages": ["advantage1", "advantage2", "advantage3"],
        "pricingInsights": "string with pricing insights",
        "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
      }`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o which is widely available
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const analysisData = JSON.parse(aiResponse.choices[0].message.content || "{}");
      
      // Save analysis
      const analysis = await storage.createPropertyAnalysis({
        propertyId: property.id,
        marketPosition: analysisData.marketPosition,
        competitiveAdvantages: analysisData.competitiveAdvantages,
        pricingInsights: analysisData.pricingInsights,
        recommendations: analysisData.recommendations
      });

      res.json({ property, analysis });
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property and analysis" });
    }
  });

  // Get property with analysis
  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const analysis = await storage.getPropertyAnalysis(property.id);
      res.json({ property, analysis });
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Get all competitor properties
  app.get("/api/competitors", async (req, res) => {
    try {
      const competitors = await storage.getAllCompetitorProperties();
      res.json(competitors);
    } catch (error) {
      console.error("Error fetching competitors:", error);
      res.status(500).json({ message: "Failed to fetch competitor properties" });
    }
  });

  // Get selected competitor properties for comparison
  app.post("/api/competitors/selected", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "IDs must be an array" });
      }

      const competitors = await storage.getSelectedCompetitorProperties(ids);
      res.json(competitors);
    } catch (error) {
      console.error("Error fetching selected competitors:", error);
      res.status(500).json({ message: "Failed to fetch selected competitors" });
    }
  });

  // Create sample units for a property (for demo purposes)
  app.post("/api/properties/:id/units", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Create sample units based on property type
      const sampleUnits = [
        { unitNumber: "A101", unitType: "1BR/1BA", currentRent: "1450", status: "vacant" },
        { unitNumber: "A102", unitType: "1BR/1BA", currentRent: "1450", status: "occupied" },
        { unitNumber: "B201", unitType: "2BR/2BA", currentRent: "1850", status: "notice_given" },
        { unitNumber: "B202", unitType: "2BR/2BA", currentRent: "1900", status: "occupied" },
        { unitNumber: "C301", unitType: "3BR/2BA", currentRent: "2200", status: "vacant" }
      ];

      const units = [];
      for (const unitData of sampleUnits) {
        const unit = await storage.createPropertyUnit({
          propertyId,
          unitNumber: unitData.unitNumber,
          unitType: unitData.unitType,
          currentRent: unitData.currentRent,
          status: unitData.status
        });
        units.push(unit);
      }

      res.json(units);
    } catch (error) {
      console.error("Error creating units:", error);
      res.status(500).json({ message: "Failed to create property units" });
    }
  });

  // Get property units
  app.get("/api/properties/:id/units", async (req, res) => {
    try {
      const units = await storage.getPropertyUnits(req.params.id);
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ message: "Failed to fetch property units" });
    }
  });

  // Generate optimization report
  app.post("/api/properties/:id/optimize", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const { goal, riskTolerance, timeline } = req.body;

      const property = await storage.getProperty(propertyId);
      const units = await storage.getPropertyUnits(propertyId);
      
      if (!property || units.length === 0) {
        return res.status(404).json({ message: "Property or units not found" });
      }

      // Generate AI-powered optimization recommendations
      const prompt = `Generate pricing optimization recommendations for a property with the following details:

      Property: ${property.address}
      Goal: ${goal}
      Risk Tolerance: ${riskTolerance}
      Timeline: ${timeline}
      
      Current Units:
      ${units.map(unit => `${unit.unitNumber}: ${unit.unitType} - $${unit.currentRent} - ${unit.status}`).join('\n')}
      
      Please provide optimization in this exact JSON format:
      {
        "unitRecommendations": [
          {
            "unitNumber": "string",
            "currentRent": number,
            "recommendedRent": number,
            "change": number,
            "annualImpact": number
          }
        ],
        "totalIncrease": number,
        "affectedUnits": number,
        "avgIncrease": number,
        "riskLevel": "Low|Medium|High"
      }`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o which is widely available
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const optimizationData = JSON.parse(aiResponse.choices[0].message.content || "{}");
      
      // Update units with recommendations
      const updatedUnits = [];
      for (const recommendation of optimizationData.unitRecommendations) {
        const unit = units.find(u => u.unitNumber === recommendation.unitNumber);
        if (unit) {
          const updatedUnit = await storage.updatePropertyUnit(unit.id, {
            recommendedRent: recommendation.recommendedRent.toString()
          });
          updatedUnits.push(updatedUnit);
        }
      }

      // Create optimization report
      const report = await storage.createOptimizationReport({
        propertyId,
        goal,
        riskTolerance,
        timeline,
        totalIncrease: optimizationData.totalIncrease.toString(),
        affectedUnits: optimizationData.affectedUnits,
        avgIncrease: optimizationData.avgIncrease.toString(),
        riskLevel: optimizationData.riskLevel
      });

      res.json({ report, units: updatedUnits });
    } catch (error) {
      console.error("Error generating optimization:", error);
      res.status(500).json({ message: "Failed to generate optimization report" });
    }
  });

  // Get optimization report
  app.get("/api/properties/:id/optimization", async (req, res) => {
    try {
      const report = await storage.getOptimizationReport(req.params.id);
      const units = await storage.getPropertyUnits(req.params.id);
      
      if (!report) {
        return res.status(404).json({ message: "Optimization report not found" });
      }

      res.json({ report, units });
    } catch (error) {
      console.error("Error fetching optimization report:", error);
      res.status(500).json({ message: "Failed to fetch optimization report" });
    }
  });

  // Helper function to generate city URL from address
  function generateCityUrl(address: string): string {
    const parts = address.split(',');
    if (parts.length < 2) return '';
    
    // Extract city, state and ZIP (e.g., "2929 California Plaza, Omaha, NE 68131" -> "omaha-ne-68131")
    const city = parts[parts.length - 2].trim().toLowerCase().replace(/\s+/g, '-');
    const stateWithZip = parts[parts.length - 1].trim();
    const stateZipParts = stateWithZip.split(' ');
    const state = stateZipParts[0].toLowerCase();
    const zip = stateZipParts[1] || '';
    
    return zip ? `apartments.com/${city}-${state}-${zip}/` : `apartments.com/${city}-${state}/`;
  }

  // Helper function to extract city/state from address for job naming
  function extractCityState(address: string): string {
    const parts = address.split(',');
    if (parts.length < 2) return 'Unknown Location';
    
    const city = parts[parts.length - 2].trim();
    const state = parts[parts.length - 1].trim().split(' ')[0]; // Remove zip code if present
    
    return `${city}, ${state}`;
  }

  // Start scraping job for a property
  app.post("/api/properties/:id/scrape", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const cityUrl = generateCityUrl(property.address);
      if (!cityUrl) {
        return res.status(400).json({ message: "Unable to extract city from address" });
      }

      const cityState = extractCityState(property.address);

      // Create scraping job
      const scrapingJob = await storage.createScrapingJob({
        propertyId,
        stage: "city_discovery",
        cityUrl: `https://www.${cityUrl}`,
        status: "processing"
      });

      // Real Scrapezy API call for single-page city scraping
      try {
        const urls = [
          `https://www.${cityUrl}`
        ];

        console.log(`Starting Scrapezy scraping for ${cityState}:`, urls);
        
        // Scrape single page
        const allProperties = [];
        const jobIds = [];
        
        for (const url of urls) {
          try {
            console.log(`Scraping: ${url}`);
            const pageResult = await callScrapezyScraping(url);
            
            if (pageResult && pageResult.id) {
              jobIds.push(pageResult.id);
            }
            
            // Parse the results from this page
            const pageProperties = parseUrls(pageResult);
            console.log(`Found ${pageProperties.length} properties on ${url}`);
            allProperties.push(...pageProperties);
            
          } catch (pageError) {
            console.error(`Error scraping ${url}:`, pageError);
            // Continue with next page even if one fails
          }
        }

        console.log(`Total properties found: ${allProperties.length}`);
        
        // Store scraped properties and try to match subject property
        const scrapedProperties = [];
        let subjectPropertyFound = false;

        for (const propertyData of allProperties) {
          if (!propertyData.name || !propertyData.address || !propertyData.url) {
            console.log('Skipping property with missing data:', propertyData);
            continue;
          }

          // Simple matching logic - check if property name or address matches
          const isSubjectProperty = 
            propertyData.name.toLowerCase().includes(property.propertyName?.toLowerCase() || '') ||
            propertyData.address.toLowerCase().includes(property.address.split(',')[0].toLowerCase());

          if (isSubjectProperty) {
            subjectPropertyFound = true;
            console.log('Found subject property match:', propertyData.name);
          }

          const scrapedProperty = await storage.createScrapedProperty({
            scrapingJobId: scrapingJob.id,
            name: propertyData.name,
            url: propertyData.url,
            address: propertyData.address,
            distance: null,
            matchScore: isSubjectProperty ? "100.0" : null,
            isSubjectProperty
          });
          scrapedProperties.push(scrapedProperty);
        }

        // Update job status to completed
        await storage.updateScrapingJob(scrapingJob.id, {
          status: "completed",
          completedAt: new Date(),
          results: { 
            totalProperties: allProperties.length,
            subjectPropertyFound,
            urls: urls,
            jobIds: jobIds
          }
        });

        res.json({ 
          scrapingJob: { ...scrapingJob, status: "completed" },
          message: `Successfully scraped ${allProperties.length} properties from ${cityState}`,
          targetUrl: `https://www.${cityUrl}`,
          scrapedProperties: scrapedProperties.length,
          subjectPropertyFound,
          jobIds
        });

      } catch (scrapingError) {
        console.error("Scrapezy API error:", scrapingError);
        
        // Update job status to failed
        await storage.updateScrapingJob(scrapingJob.id, {
          status: "failed",
          errorMessage: scrapingError instanceof Error ? scrapingError.message : "Unknown scraping error"
        });

        res.status(500).json({ 
          message: "Scraping failed",
          error: scrapingError instanceof Error ? scrapingError.message : "Unknown error",
          details: scrapingError instanceof Error ? scrapingError.stack : undefined
        });
      }
    } catch (error) {
      console.error("Error starting scraping job:", error);
      res.status(500).json({ message: "Failed to start scraping job" });
    }
  });

  // Simulate scraping completion (in real implementation, this would be called by Scrapezy webhook)
  app.post("/api/scraping/:jobId/complete", async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const { properties } = req.body; // Array of scraped property data
      
      const job = await storage.getScrapingJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Scraping job not found" });
      }

      // Update job status
      await storage.updateScrapingJob(jobId, {
        status: "completed",
        completedAt: new Date()
      });

      // Store scraped properties
      const scrapedProperties = [];
      for (const propertyData of properties || []) {
        const scrapedProperty = await storage.createScrapedProperty({
          scrapingJobId: jobId,
          name: propertyData.name,
          url: propertyData.url,
          address: propertyData.address,
          distance: propertyData.distance?.toString(),
          matchScore: propertyData.matchScore?.toString()
        });
        scrapedProperties.push(scrapedProperty);
      }

      res.json({ job, scrapedProperties });
    } catch (error) {
      console.error("Error completing scraping job:", error);
      res.status(500).json({ message: "Failed to complete scraping job" });
    }
  });

  // Get scraping job status and results
  app.get("/api/scraping/:jobId", async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const job = await storage.getScrapingJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Scraping job not found" });
      }

      const scrapedProperties = await storage.getScrapedPropertiesByJob(jobId);
      
      res.json({ job, scrapedProperties });
    } catch (error) {
      console.error("Error fetching scraping job:", error);
      res.status(500).json({ message: "Failed to fetch scraping job" });
    }
  });

  // Get scraped properties for a property (for UI display)
  app.get("/api/properties/:id/scraped-properties", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const jobs = await storage.getScrapingJobsByProperty(propertyId);
      
      if (jobs.length === 0) {
        return res.json({ scrapedProperties: [], totalCount: 0 });
      }

      // Get the most recent successful job
      const completedJob = jobs
        .filter(job => job.status === "completed")
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        })[0];

      if (!completedJob) {
        return res.json({ scrapedProperties: [], totalCount: 0 });
      }

      const scrapedProperties = await storage.getScrapedPropertiesByJob(completedJob.id);
      
      // Separate subject property from competitors
      const subjectProperty = scrapedProperties.find(p => p.isSubjectProperty);
      const competitors = scrapedProperties.filter(p => !p.isSubjectProperty);

      res.json({ 
        scrapedProperties: competitors,  // Only return competitors for selection
        subjectProperty,
        totalCount: scrapedProperties.length,
        scrapingJob: completedJob
      });
    } catch (error) {
      console.error("Error fetching scraped properties:", error);
      res.status(500).json({ message: "Failed to fetch scraped properties" });
    }
  });

  // Get all scraping jobs for a property
  app.get("/api/properties/:id/scraping-jobs", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const jobs = await storage.getScrapingJobsByProperty(propertyId);
      
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching scraping jobs:", error);
      res.status(500).json({ message: "Failed to fetch scraping jobs" });
    }
  });

  // Match subject property with scraped data
  app.post("/api/properties/:id/match", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const { scrapedPropertyId } = req.body;
      
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Here you would implement matching logic
      // For now, we'll just return a success response
      res.json({ 
        matched: true,
        message: `Successfully matched ${property.propertyName} with scraped data`,
        scrapedPropertyId
      });
    } catch (error) {
      console.error("Error matching property:", error);
      res.status(500).json({ message: "Failed to match property" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
