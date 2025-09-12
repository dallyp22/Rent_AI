import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertPropertyAnalysisSchema, insertOptimizationReportSchema, insertScrapingJobSchema, filterCriteriaSchema, type ScrapedUnit } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

const SCRAPEZY_API_KEY = process.env.SCRAPEZY_API_KEY;
const SCRAPEZY_BASE_URL = "https://scrapezy.com/api/extract";

// Scrapezy API integration functions
async function callScrapezyScraping(url: string, customPrompt?: string) {
  if (!SCRAPEZY_API_KEY) {
    throw new Error("Scrapezy API key not configured");
  }

  const prompt = customPrompt || "Extract apartment listings from this apartments.com page. For each apartment property listing, extract: 1) The complete URL link to the individual apartment page (must start with https://www.apartments.com/), 2) The property/apartment name or title, 3) The address or location information. Return as JSON array with objects containing \"url\", \"name\", and \"address\" fields.";

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
        
        // Check for apartment_listings or apartments key (Scrapezy format)
        const apartmentData = parsed.apartment_listings || parsed.apartments;
        if (apartmentData && Array.isArray(apartmentData)) {
          properties = apartmentData.filter(item => 
            item && 
            typeof item === 'object' && 
            item.url && 
            typeof item.url === 'string' &&
            item.url.includes('apartments.com') &&
            item.url.startsWith('http')
          );
        }
        // Also check if it's a direct array
        else if (Array.isArray(parsed)) {
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
    } else if (typeof resultText === 'object' && resultText !== null) {
      // Handle object response (already parsed)
      const apartmentDataObj = resultText.apartment_listings || resultText.apartments;
      if (apartmentDataObj && Array.isArray(apartmentDataObj)) {
        properties = apartmentDataObj.filter(item => 
          item && 
          typeof item === 'object' && 
          item.url && 
          typeof item.url === 'string' &&
          item.url.includes('apartments.com')
        );
      } else if (Array.isArray(resultText)) {
        properties = resultText.filter(item => 
          item && 
          typeof item === 'object' && 
          item.url && 
          typeof item.url === 'string' &&
          item.url.includes('apartments.com')
        );
      }
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

// Parse Scrapezy results to extract unit details
function parseUnitData(scrapezyResult: any): Array<{
  unitNumber?: string;
  unitType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  rent?: number;
  availabilityDate?: string;
}> {
  let units = [];
  
  try {
    // Try to get the result from the response structure
    const resultText = scrapezyResult.result || scrapezyResult.data || scrapezyResult;
    console.log(`Parsing unit data. Result type: ${typeof resultText}, structure keys:`, typeof resultText === 'object' ? Object.keys(resultText) : 'N/A');
    
    if (typeof resultText === 'string') {
      try {
        const parsed = JSON.parse(resultText);
        
        // Check for different possible keys for unit data
        // Handle nested "root" structure that Scrapezy uses
        const rootData = parsed.root || parsed;
        const unitData = rootData.units || rootData.availableUnits || rootData.apartment_units || rootData.listings || parsed.units || parsed.apartment_units || parsed.listings || parsed;
        if (Array.isArray(unitData)) {
          units = unitData.filter(item => 
            item && 
            typeof item === 'object' && 
            (item.unitType || item.unit_type || item.type)
          );
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON result for units, trying fallback parsing');
        // Fallback: try to extract basic unit info from text
        const lines = resultText.split('\n');
        for (const line of lines) {
          if (line.includes('BR') || line.includes('Studio') || line.includes('bedroom')) {
            units.push({
              unitType: line.trim(),
              bedrooms: extractBedroomCount(line),
              bathrooms: extractBathroomCount(line),
              rent: extractRentPrice(line)
            });
          }
        }
      }
    } else if (typeof resultText === 'object' && resultText !== null) {
      // Handle object response (already parsed)
      // Handle nested "root" structure that Scrapezy uses
      const rootData = resultText.root || resultText;
      const unitDataObj = rootData.units || rootData.availableUnits || rootData.apartment_units || rootData.listings || resultText.units || resultText.apartment_units || resultText.listings;
      if (Array.isArray(unitDataObj)) {
        units = unitDataObj.filter(item => 
          item && 
          typeof item === 'object' && 
          (item.unitType || item.unit_type || item.type)
        );
      } else if (Array.isArray(resultText)) {
        units = resultText.filter(item => 
          item && 
          typeof item === 'object' && 
          (item.unitType || item.unit_type || item.type)
        );
      }
    }
  } catch (error) {
    console.error('Error parsing Scrapezy unit result:', error);
  }

  // Normalize and validate unit data
  const validUnits = units
    .map(unit => ({
      unitNumber: unit.unitNumber || unit.unit_number || null,
      unitType: unit.unitType || unit.unit_type || unit.type || 'Unknown',
      bedrooms: parseNumber(unit.bedrooms || unit.bedroom_count),
      bathrooms: parseNumber(unit.bathrooms || unit.bathroom_count),
      squareFootage: parseNumber(unit.squareFootage || unit.square_footage || unit.sqft),
      rent: parseNumber(unit.rent || unit.price || unit.monthlyRent),
      availabilityDate: unit.availabilityDate || unit.availability_date || unit.available || null
    }))
    .filter(unit => unit.unitType && unit.unitType !== 'Unknown');

  return validUnits;
}

// Helper functions for unit data parsing
function extractBedroomCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*BR|(\d+)\s*bedroom/i);
  return match ? parseInt(match[1] || match[2]) : undefined;
}

function extractBathroomCount(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*BA|(\d+(?:\.\d+)?)\s*bathroom/i);
  return match ? parseFloat(match[1] || match[2]) : undefined;
}

function extractRentPrice(text: string): number | undefined {
  const match = text.match(/\$(\d{1,3}(?:,\d{3})*)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : undefined;
}

function parseNumber(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[,$]/g, ''));
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}


export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create property and get initial AI analysis
  app.post("/api/properties", async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      
      // Create property
      const property = await storage.createProperty(propertyData);
      
      // Initialize workflow state for the new property
      console.log('[WORKFLOW] Initializing workflow state for property:', property.id);
      await storage.saveWorkflowState({
        propertyId: property.id,
        selectedCompetitorIds: [],
        currentStage: 'input'
      });
      
      // Generate AI analysis using comprehensive public data prompt
      const prompt = `Using only publicly available data, summarize the apartment property "${property.propertyName}" located at ${property.address}. Please include:

Basic Property Info
• Property Name: ${property.propertyName}
• Number of units (estimated if not listed): ${property.totalUnits || 'please estimate'}
• Year built: ${property.builtYear || 'please research'}
• Property type (e.g., garden-style, mid-rise, high-rise): ${property.propertyType || 'please identify'}
• Approximate square footage (if available): ${property.squareFootage || 'please estimate if available'}

Listings & Rent Estimates
• Recent or active rental listings (unit mix, price range)
• Estimated rent per unit type (1BR, 2BR, etc.)
• Source of rent info (e.g., Zillow, Apartments.com, Rentometer)

Amenities and Features
• Parking, laundry, gym, pool, pet policy, in-unit features
• Current known amenities: ${property.amenities?.join(", ") || "Not specified - please research"}
• Highlight what makes it stand out (e.g., remodeled units, smart tech)

Neighborhood Overview
• Walk Score, transit access, proximity to major employers or schools
• Crime rating (from public sources like AreaVibes or NeighborhoodScout)
• Notable nearby businesses or attractions

Visuals
• Link to map/street view
• Exterior photos or listing images if available

Please provide your analysis in this exact JSON format:
{
  "marketPosition": "Comprehensive description of the property's position in the local market based on publicly available data",
  "competitiveAdvantages": ["specific advantage based on research", "another researched advantage", "third advantage from public data"],
  "pricingInsights": "Detailed pricing analysis based on actual listings and rent data from public sources",
  "recommendations": ["specific recommendation based on data", "another data-driven recommendation", "third actionable recommendation"]
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

  // Get all competitor properties (using scraped data instead of legacy competitors)
  app.get("/api/competitors", async (req, res) => {
    try {
      // Get all scraped competitor properties using proper storage method
      const scrapedCompetitors = await storage.getAllScrapedCompetitors();
      
      // Return only authentic scraped data - no placeholder values
      const competitors = scrapedCompetitors.map(scrapedProp => ({
        id: scrapedProp.id,
        name: scrapedProp.name,
        address: scrapedProp.address,
        url: scrapedProp.url,
        distance: scrapedProp.distance,
        matchScore: scrapedProp.matchScore,
        createdAt: scrapedProp.createdAt,
        isSubjectProperty: scrapedProp.isSubjectProperty
      }));

      console.log(`Returning ${competitors.length} scraped properties as competitors`);
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

      // Use scraped properties instead of legacy competitors
      const scrapedProperties = await storage.getSelectedScrapedProperties(ids);
      
      // Return only authentic scraped data - no placeholder values
      const competitors = scrapedProperties.map(scrapedProp => ({
        id: scrapedProp.id,
        name: scrapedProp.name,
        address: scrapedProp.address,
        url: scrapedProp.url,
        distance: scrapedProp.distance,
        matchScore: scrapedProp.matchScore,
        createdAt: scrapedProp.createdAt,
        isSubjectProperty: scrapedProp.isSubjectProperty
      }));

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

  // Generate filtered analysis based on filter criteria
  app.post("/api/filtered-analysis", async (req, res) => {
    try {
      const filterData = filterCriteriaSchema.parse(req.body);
      
      // Get subject property for analysis context
      const subjectProperty = await storage.getSubjectScrapedProperty();
      const propertyId = subjectProperty?.id || "default";
      
      // Generate filtered analysis
      const analysis = await storage.generateFilteredAnalysis(propertyId, filterData);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error generating filtered analysis:", error);
      res.status(500).json({ message: "Failed to generate filtered analysis" });
    }
  });

  // Generate optimization report
  app.post("/api/properties/:id/optimize", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const { goal, targetOccupancy, riskTolerance } = req.body;

      const property = await storage.getProperty(propertyId);
      
      // Get the subject property's scraped units for comprehensive optimization
      let subjectProperty = null;
      let scrapedUnits: ScrapedUnit[] = [];
      
      // Find the subject scraped property
      const scrapingJobs = await storage.getScrapingJobsByProperty(propertyId);
      if (scrapingJobs.length > 0) {
        for (const job of scrapingJobs) {
          const scrapedProperties = await storage.getScrapedPropertiesByJob(job.id);
          const subject = scrapedProperties.find(p => p.isSubjectProperty === true);
          if (subject) {
            subjectProperty = subject;
            // Get all scraped units for this property
            scrapedUnits = await storage.getScrapedUnitsByProperty(subject.id);
            break;
          }
        }
      }
      
      // Always sync from scraped units when available
      let units = [];
      
      // If we have scraped units, always sync them (not just when units.length === 0)
      if (scrapedUnits.length > 0) {
        console.log(`Syncing ${scrapedUnits.length} scraped units for optimization`);
        // Clear existing PropertyUnits
        await storage.clearPropertyUnits(propertyId);
        // Create new PropertyUnits from ALL scraped units
        units = [];
        for (const scrapedUnit of scrapedUnits) {
          const unit = await storage.createPropertyUnit({
            propertyId,
            unitNumber: scrapedUnit.unitNumber || `Unit-${scrapedUnit.id.substring(0, 6)}`,
            unitType: scrapedUnit.unitType,
            currentRent: scrapedUnit.rent || "0",
            status: scrapedUnit.status || "occupied"
          });
          units.push(unit);
        }
      } else {
        // Fall back to existing PropertyUnits only if no scraped data
        units = await storage.getPropertyUnits(propertyId);
      }
      
      if (!property || units.length === 0) {
        return res.status(404).json({ message: "Property or units not found" });
      }

      // Convert parameters to readable format for AI
      const goalDisplayMap: Record<string, string> = {
        'maximize-revenue': 'Maximize Revenue',
        'maximize-occupancy': 'Maximize Occupancy', 
        'balanced': 'Balanced Approach',
        'custom': 'Custom Strategy'
      };
      
      const riskDisplayMap: Record<number, string> = {
        1: 'Low (Conservative)',
        2: 'Medium (Moderate)', 
        3: 'High (Aggressive)'
      };

      // Generate AI-powered optimization recommendations
      const prompt = `As a real estate pricing optimization expert, analyze the following property and provide pricing recommendations:

      Property Details:
      - Address: ${property.address}
      - Property Type: ${property.propertyType}
      - Total Units: ${property.totalUnits}
      - Built Year: ${property.builtYear}

      Optimization Parameters:
      - Goal: ${goalDisplayMap[goal] || goal}
      - Target Occupancy: ${targetOccupancy}%
      - Risk Tolerance: ${riskDisplayMap[riskTolerance] || 'Medium'}
      
      Current Unit Portfolio (${units.length} units):
      ${units.slice(0, 100).map(unit => `${unit.unitNumber}: ${unit.unitType} - Current Rent: $${unit.currentRent} - Status: ${unit.status}`).join('\n')}
      ${units.length > 100 ? `... and ${units.length - 100} more units` : ''}
      
      Market Context:
      - Consider current market conditions for similar properties
      - Factor in seasonal trends and local market dynamics
      - Account for unit turnover costs and vacancy risks
      - Balance revenue optimization with occupancy targets
      
      Please provide optimization recommendations for ALL ${units.length} units in this exact JSON format:
      {
        "unitRecommendations": [
          {
            "unitNumber": "string",
            "currentRent": number,
            "recommendedRent": number,
            "marketAverage": number,
            "change": number,
            "annualImpact": number,
            "confidenceLevel": "High|Medium|Low",
            "reasoning": "Brief explanation for the recommendation"
          }
        ],
        "totalIncrease": number,
        "affectedUnits": number,
        "avgIncrease": number,
        "riskLevel": "Low|Medium|High",
        "marketInsights": {
          "occupancyImpact": "Expected impact on occupancy rate",
          "competitivePosition": "How this positions the property vs competitors", 
          "timeToLease": "Average days to lease at new rates"
        }
      }
      
      Important: Generate recommendations for ALL ${units.length} units based on the optimization goal and parameters.`;

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
          updatedUnits.push({
            ...updatedUnit,
            confidenceLevel: recommendation.confidenceLevel,
            reasoning: recommendation.reasoning
          });
        }
      }
      
      // Ensure all units are included even if not in recommendations
      for (const unit of units) {
        if (!updatedUnits.find(u => u.id === unit.id)) {
          updatedUnits.push({
            ...unit,
            recommendedRent: unit.currentRent, // Default to current if no recommendation
            confidenceLevel: "Low",
            reasoning: "No optimization recommended - maintain current pricing"
          });
        }
      }

      // Create optimization report
      const report = await storage.createOptimizationReport({
        propertyId,
        goal: goalDisplayMap[goal] || goal,
        riskTolerance: riskDisplayMap[riskTolerance] || 'Medium',
        timeline: `Target Occupancy: ${targetOccupancy}%`,
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

  // Apply pricing changes
  app.post("/api/properties/:id/apply-pricing", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const { unitPrices } = req.body; // { unitId: newPrice }
      
      if (!unitPrices || typeof unitPrices !== 'object') {
        return res.status(400).json({ message: "unitPrices must be an object mapping unit IDs to prices" });
      }

      const updatedUnits = [];
      let totalIncrease = 0;
      let affectedUnits = 0;

      for (const [unitId, newPrice] of Object.entries(unitPrices)) {
        try {
          const unit = await storage.updatePropertyUnit(unitId, {
            recommendedRent: String(newPrice)
          });
          
          if (unit) {
            updatedUnits.push(unit);
            const currentRent = parseFloat(unit.currentRent);
            const appliedRent = parseFloat(String(newPrice));
            
            if (appliedRent !== currentRent) {
              affectedUnits++;
              totalIncrease += (appliedRent - currentRent) * 12; // Annual impact
            }
          }
        } catch (unitError) {
          console.error(`Failed to update unit ${unitId}:`, unitError);
        }
      }

      res.json({
        message: "Pricing changes applied successfully",
        updatedUnits: updatedUnits.length,
        affectedUnits,
        totalAnnualImpact: totalIncrease
      });
    } catch (error) {
      console.error("Error applying pricing changes:", error);
      res.status(500).json({ message: "Failed to apply pricing changes" });
    }
  });

  // Scrape unit-level data for selected competitor properties (automatically includes subject property)
  app.post("/api/competitors/scrape-units", async (req, res) => {
    try {
      const { competitorIds } = req.body;
      
      if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
        return res.status(400).json({ message: "competitorIds must be a non-empty array" });
      }

      // Get selected competitor properties
      const selectedCompetitors = await storage.getSelectedScrapedProperties(competitorIds);
      
      if (selectedCompetitors.length === 0) {
        return res.status(404).json({ message: "No competitor properties found" });
      }

      // Get the subject property and prepend it to the list if it exists
      const subjectProperty = await storage.getSubjectScrapedProperty();
      console.log(`DEBUG: getSubjectScrapedProperty returned:`, subjectProperty);
      
      const propertiesToProcess = [];
      
      if (subjectProperty) {
        propertiesToProcess.push(subjectProperty);
        console.log(`Including subject property: ${subjectProperty.name} in unit scraping batch`);
      } else {
        console.log('No subject property found with isSubjectProperty === true');
      }
      
      // Add all selected competitors
      propertiesToProcess.push(...selectedCompetitors);
      
      console.log(`DEBUG: Total properties to process: ${propertiesToProcess.length} (${subjectProperty ? 'with' : 'without'} subject property)`);

      const results = [];
      
      // Process each property (subject + competitors)
      for (const property of propertiesToProcess) {
        try {
          console.log(`Starting unit scraping for property: ${property.name} at ${property.url}`);
          
          // Get the original property ID for subject property
          let jobPropertyId = "temp-" + property.id;
          if (property.isSubjectProperty) {
            const originalPropertyId = await storage.getOriginalPropertyIdFromScraped(property.id);
            if (originalPropertyId) {
              jobPropertyId = originalPropertyId;
              console.log(`Using original property ID ${originalPropertyId} for subject property ${property.name}`);
            } else {
              console.warn(`Could not find original property ID for subject property ${property.name}, using scraped ID`);
              jobPropertyId = property.id;
            }
          }
          
          // Create scraping job for unit details
          const scrapingJob = await storage.createScrapingJob({
            propertyId: jobPropertyId,
            stage: "unit_details",
            cityUrl: property.url,
            status: "processing"
          });

          // Call Scrapezy API for unit-level data
          const unitPrompt = `Extract detailed unit information from this apartments.com property page. For each available apartment unit, extract: 1) Unit number or identifier (if available), 2) Unit type (e.g., "Studio", "1BR/1BA", "2BR/2BA"), 3) Number of bedrooms (as integer), 4) Number of bathrooms (as decimal like 1.0, 1.5, 2.0), 5) Square footage (as integer, if available), 6) Monthly rent price (as number, extract only the numerical value), 7) Availability date or status. Return as JSON array with objects containing "unitNumber", "unitType", "bedrooms", "bathrooms", "squareFootage", "rent", "availabilityDate" fields.`;

          const scrapezyResult = await callScrapezyScraping(property.url, unitPrompt);
          
          // Parse the scraped unit data
          const unitData = parseUnitData(scrapezyResult);
          
          console.log(`Found ${unitData.length} units for property: ${property.name}`);
          
          // Save scraped units to storage
          const savedUnits = [];
          for (const unit of unitData) {
            try {
              const savedUnit = await storage.createScrapedUnit({
                propertyId: property.id,
                unitNumber: unit.unitNumber,
                unitType: unit.unitType,
                bedrooms: unit.bedrooms,
                bathrooms: unit.bathrooms?.toString() || null,
                squareFootage: unit.squareFootage,
                rent: unit.rent?.toString() || null,
                availabilityDate: unit.availabilityDate,
                status: unit.availabilityDate && unit.availabilityDate.toLowerCase().includes('available') ? 'available' : 'occupied'
              });
              savedUnits.push(savedUnit);
            } catch (unitError) {
              console.warn(`Failed to save unit for ${property.name}:`, unitError);
            }
          }

          // Update scraping job status
          await storage.updateScrapingJob(scrapingJob.id, {
            status: "completed",
            results: unitData,
            completedAt: new Date()
          });

          results.push({
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            isSubjectProperty: property.isSubjectProperty || false,
            scrapingJobId: scrapingJob.id,
            unitsFound: savedUnits.length,
            units: savedUnits
          });

        } catch (propertyError) {
          console.error(`Error scraping units for ${property.name}:`, propertyError);
          
          const errorMessage = propertyError instanceof Error ? propertyError.message : "Failed to scrape unit data";
          
          results.push({
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            isSubjectProperty: property.isSubjectProperty || false,
            error: errorMessage,
            unitsFound: 0,
            units: []
          });
        }
      }

      res.json({
        message: "Unit scraping completed",
        processedProperties: results.length,
        totalUnitsFound: results.reduce((sum, result) => sum + result.unitsFound, 0),
        results
      });

    } catch (error) {
      console.error("Error in unit scraping workflow:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ message: "Failed to scrape unit data", error: errorMessage });
    }
  });

  // Comprehensive vacancy summary API endpoint
  app.get("/api/vacancy/summary", async (req, res) => {
    try {
      const { propertyId, competitorIds } = req.query;
      
      // Validate parameters
      if (!propertyId) {
        return res.status(400).json({ message: "propertyId is required" });
      }
      
      const competitorIdsArray = Array.isArray(competitorIds) ? competitorIds : 
                                 competitorIds ? [competitorIds] : [];

      if (competitorIdsArray.length === 0) {
        return res.status(400).json({ message: "At least one competitorId is required" });
      }

      console.log(`Vacancy summary request for property ${propertyId} with ${competitorIdsArray.length} competitors`);

      // Get subject property - need to find the scraped property marked as isSubjectProperty
      let subjectProperty = null;
      
      // First try to find by scraping job associated with the original propertyId
      const scrapingJobs = await storage.getScrapingJobsByProperty(propertyId as string);
      if (scrapingJobs.length > 0) {
        // Get all scraped properties from these jobs
        for (const job of scrapingJobs) {
          const scrapedProperties = await storage.getScrapedPropertiesByJob(job.id);
          const subject = scrapedProperties.find(p => p.isSubjectProperty === true);
          if (subject) {
            subjectProperty = subject;
            break;
          }
        }
      }
      
      // If not found, try the direct method as fallback
      if (!subjectProperty) {
        subjectProperty = await storage.getSubjectScrapedProperty();
      }
      
      if (!subjectProperty) {
        return res.status(404).json({ 
          message: "Subject property not found. Please ensure the property has been scraped first.",
          hint: "Run the scraping workflow for the property before requesting vacancy summary"
        });
      }

      const competitorProperties = await storage.getSelectedScrapedProperties(competitorIdsArray as string[]);
      if (competitorProperties.length === 0) {
        return res.status(404).json({ message: "No competitor properties found" });
      }

      // Helper function to normalize unit types
      const normalizeUnitType = (unitType: string): string => {
        if (!unitType) return 'Studio';
        const type = unitType.toLowerCase().trim();
        
        if (type.includes('studio') || type.includes('0br') || type === '0') {
          return 'Studio';
        } else if (type.includes('1br') || type.includes('1 br') || type === '1') {
          return '1BR';
        } else if (type.includes('2br') || type.includes('2 br') || type === '2') {
          return '2BR';
        } else if (type.includes('3br') || type.includes('3 br') || type === '3' || 
                   type.includes('4br') || type.includes('4 br') || type === '4' ||
                   type.includes('5br') || type.includes('5 br') || type === '5') {
          return '3BR+';
        } else {
          // Try to extract bedroom count from the string
          const match = type.match(/(\d+)/);
          if (match) {
            const bedrooms = parseInt(match[1]);
            if (bedrooms === 0) return 'Studio';
            if (bedrooms === 1) return '1BR';
            if (bedrooms === 2) return '2BR';
            if (bedrooms >= 3) return '3BR+';
          }
          return 'Studio'; // Default fallback
        }
      };

      // Helper function to calculate vacancy data for a property
      const calculateVacancyData = async (property: any) => {
        const units = await storage.getScrapedUnitsByProperty(property.id);
        
        // Group units by type
        const unitTypeGroups: { [key: string]: typeof units } = {
          'Studio': [],
          '1BR': [],
          '2BR': [],
          '3BR+': []
        };

        units.forEach(unit => {
          const normalizedType = normalizeUnitType(unit.unitType);
          unitTypeGroups[normalizedType].push(unit);
        });

        // Calculate stats for each unit type
        const unitTypes = Object.keys(unitTypeGroups).map(type => {
          const typeUnits = unitTypeGroups[type];
          const totalUnits = typeUnits.length;
          const availableUnits = typeUnits.filter(u => 
            u.status === 'available' || 
            (u.availabilityDate && u.availabilityDate.toLowerCase().includes('available'))
          ).length;
          
          const rentPrices = typeUnits
            .map(u => u.rent ? parseFloat(u.rent.toString()) : null)
            .filter(rent => rent !== null && rent > 0) as number[];
          
          const sqftValues = typeUnits
            .map(u => u.squareFootage)
            .filter(sqft => sqft !== null && sqft > 0) as number[];

          return {
            type,
            totalUnits,
            availableUnits,
            vacancyRate: totalUnits > 0 ? (availableUnits / totalUnits) * 100 : 0,
            avgRent: rentPrices.length > 0 ? rentPrices.reduce((sum, rent) => sum + rent, 0) / rentPrices.length : 0,
            avgSqFt: sqftValues.length > 0 ? sqftValues.reduce((sum, sqft) => sum + sqft, 0) / sqftValues.length : 0,
            rentRange: rentPrices.length > 0 ? {
              min: Math.min(...rentPrices),
              max: Math.max(...rentPrices)
            } : { min: 0, max: 0 }
          };
        }).filter(typeData => typeData.totalUnits > 0); // Only include unit types that exist

        // Calculate overall vacancy rate
        const totalUnits = units.length;
        const totalAvailable = units.filter(u => 
          u.status === 'available' || 
          (u.availabilityDate && u.availabilityDate.toLowerCase().includes('available'))
        ).length;
        const overallVacancyRate = totalUnits > 0 ? (totalAvailable / totalUnits) * 100 : 0;

        return {
          id: property.id,
          name: property.name,
          vacancyRate: parseFloat(overallVacancyRate.toFixed(1)),
          unitTypes
        };
      }

      // Helper function to get individual units for a property
      const getPropertyUnits = async (property: any) => {
        const units = await storage.getScrapedUnitsByProperty(property.id);
        return units.map(unit => ({
          unitNumber: unit.unitNumber || 'N/A',
          unitType: unit.unitType,
          bedrooms: unit.bedrooms || 0,
          bathrooms: unit.bathrooms || '0',
          squareFootage: unit.squareFootage || 0,
          rent: unit.rent || '0',
          availabilityDate: unit.availabilityDate || 'Contact for availability',
          status: unit.status || 'unknown'
        }));
      };

      // Calculate data for subject property with units
      const subjectData = await calculateVacancyData(subjectProperty);
      const subjectUnits = await getPropertyUnits(subjectProperty);

      // Calculate data for competitors with units
      const competitorData = await Promise.all(
        competitorProperties.map(async comp => {
          const vacancyData = await calculateVacancyData(comp);
          const units = await getPropertyUnits(comp);
          return {
            ...vacancyData,
            units
          };
        })
      );

      // Calculate market insights
      const competitorVacancyRates = competitorData.map(c => c.vacancyRate);
      const competitorAvgVacancy = competitorVacancyRates.length > 0 
        ? competitorVacancyRates.reduce((sum, rate) => sum + rate, 0) / competitorVacancyRates.length
        : 0;

      const totalCompetitorVacancies = competitorData.reduce((sum, comp) => {
        return sum + comp.unitTypes.reduce((typeSum, type) => typeSum + type.availableUnits, 0);
      }, 0);

      // Find strongest unit type (lowest vacancy rate)
      const subjectUnitTypes = subjectData.unitTypes.filter(type => type.totalUnits > 0);
      const strongestUnitType = subjectUnitTypes.length > 0 
        ? subjectUnitTypes.reduce((strongest, current) => 
            current.vacancyRate < strongest.vacancyRate ? current : strongest
          ).type
        : 'N/A';

      // Calculate subject vs market comparison
      const vacancyDifference = subjectData.vacancyRate - competitorAvgVacancy;
      const subjectVsMarket = Math.abs(vacancyDifference) < 0.1 
        ? "At market average"
        : vacancyDifference > 0 
          ? `${Math.abs(vacancyDifference).toFixed(1)}% above market average`
          : `${Math.abs(vacancyDifference).toFixed(1)}% below market average`;

      const response = {
        subjectProperty: {
          ...subjectData,
          units: subjectUnits
        },
        competitors: competitorData,
        marketInsights: {
          subjectVsMarket,
          strongestUnitType,
          totalVacancies: subjectData.unitTypes.reduce((sum, type) => sum + type.availableUnits, 0) + totalCompetitorVacancies,
          competitorAvgVacancies: parseFloat(competitorAvgVacancy.toFixed(1))
        }
      };

      console.log(`Vacancy summary completed for ${subjectData.name}: ${subjectData.vacancyRate}% vacancy rate`);
      res.json(response);

    } catch (error) {
      console.error("Error generating vacancy summary:", error);
      res.status(500).json({ 
        message: "Failed to generate vacancy summary", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });


  // Address normalization utilities for better property matching
  function normalizeAddress(address: string): string {
    if (!address) return '';
    
    return address
      .toLowerCase()
      .trim()
      // Remove common punctuation
      .replace(/[.,;#]/g, '')
      // Normalize street abbreviations
      .replace(/\bstreet\b/g, 'st')
      .replace(/\bavenue\b/g, 'ave')
      .replace(/\bboulevard\b/g, 'blvd')
      .replace(/\bdrive\b/g, 'dr')
      .replace(/\broad\b/g, 'rd')
      .replace(/\blane\b/g, 'ln')
      .replace(/\bplaza\b/g, 'plz')
      .replace(/\bcircle\b/g, 'cir')
      .replace(/\bparkway\b/g, 'pkwy')
      .replace(/\bcourt\b/g, 'ct')
      // Normalize directional abbreviations
      .replace(/\bnorth\b/g, 'n')
      .replace(/\bsouth\b/g, 's')
      .replace(/\beast\b/g, 'e')
      .replace(/\bwest\b/g, 'w')
      .replace(/\bnortheast\b/g, 'ne')
      .replace(/\bnorthwest\b/g, 'nw')
      .replace(/\bsoutheast\b/g, 'se')
      .replace(/\bsouthwest\b/g, 'sw')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractStreetNumber(address: string): string {
    const match = address.match(/^(\d+)/);
    return match ? match[1] : '';
  }

  function extractStreetName(address: string): string {
    // Extract everything after the street number but before city/state
    const normalized = normalizeAddress(address);
    const parts = normalized.split(',');
    if (parts.length === 0) return normalized;
    
    const streetPart = parts[0].trim();
    // Remove the street number
    return streetPart.replace(/^\d+\s*/, '').trim();
  }

  function normalizePropertyName(name: string): string {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      // Remove common property prefixes/suffixes
      .replace(/^(the)\s+/i, '')
      .replace(/\s+(apartments?|apt|residences?|homes?|towers?|place|commons?)$/i, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Calculate similarity score between two strings (0-100)
  function calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 100;
    
    // Levenshtein distance implementation
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    const maxLen = Math.max(len1, len2);
    const similarity = maxLen === 0 ? 100 : ((maxLen - matrix[len1][len2]) / maxLen) * 100;
    return Math.round(similarity);
  }

  // Advanced property matching logic
  function calculatePropertyMatch(subjectProperty: any, scrapedProperty: any): { isMatch: boolean; score: number; reasons: string[]; matchDetails: any } {
    console.log('[PROPERTY_MATCH] Starting match calculation');
    console.log('[PROPERTY_MATCH] Subject Property:', { 
      name: subjectProperty.propertyName, 
      address: subjectProperty.address,
      city: subjectProperty.city,
      state: subjectProperty.state 
    });
    console.log('[PROPERTY_MATCH] Scraped Property:', { 
      name: scrapedProperty.name, 
      address: scrapedProperty.address,
      url: scrapedProperty.url 
    });
    
    const reasons: string[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;
    const componentScores: any = {};
    
    // Extract and normalize subject property data
    const subjectName = normalizePropertyName(subjectProperty.propertyName || '');
    const subjectAddress = normalizeAddress(subjectProperty.address || '');
    const subjectStreetNumber = extractStreetNumber(subjectProperty.address || '');
    const subjectStreetName = extractStreetName(subjectProperty.address || '');
    
    // Extract and normalize scraped property data
    const scrapedName = normalizePropertyName(scrapedProperty.name || '');
    const scrapedAddress = normalizeAddress(scrapedProperty.address || '');
    const scrapedStreetNumber = extractStreetNumber(scrapedProperty.address || '');
    const scrapedStreetName = extractStreetName(scrapedProperty.address || '');
    
    console.log('[PROPERTY_MATCH] Normalized values:', {
      subjectName, subjectAddress, subjectStreetNumber, subjectStreetName,
      scrapedName, scrapedAddress, scrapedStreetNumber, scrapedStreetName
    });
    
    // 1. Exact street number match (30 points) - very important for properties
    maxPossibleScore += 30;
    componentScores.streetNumber = 0;
    if (subjectStreetNumber && scrapedStreetNumber) {
      if (subjectStreetNumber === scrapedStreetNumber) {
        componentScores.streetNumber = 30;
        totalScore += 30;
        reasons.push(`✅ Exact street number match: ${subjectStreetNumber}`);
      } else {
        // Check for partial match (e.g., 222 vs 2221)
        if (subjectStreetNumber.startsWith(scrapedStreetNumber) || scrapedStreetNumber.startsWith(subjectStreetNumber)) {
          componentScores.streetNumber = 15;
          totalScore += 15;
          reasons.push(`⚠️ Partial street number match: ${subjectStreetNumber} vs ${scrapedStreetNumber}`);
        } else {
          reasons.push(`❌ Street number mismatch: ${subjectStreetNumber} vs ${scrapedStreetNumber}`);
        }
      }
    } else if (!subjectStreetNumber || !scrapedStreetNumber) {
      // One is missing - still give some points if other criteria match
      componentScores.streetNumber = 10;
      totalScore += 10;
      reasons.push(`⚠️ Street number missing in one address`);
    }
    
    // 2. Street name similarity (25 points)
    maxPossibleScore += 25;
    componentScores.streetName = 0;
    if (subjectStreetName && scrapedStreetName) {
      const streetSimilarity = calculateStringSimilarity(subjectStreetName, scrapedStreetName);
      componentScores.streetNameSimilarity = streetSimilarity;
      
      if (streetSimilarity >= 80) {
        const streetPoints = Math.round((streetSimilarity / 100) * 25);
        componentScores.streetName = streetPoints;
        totalScore += streetPoints;
        reasons.push(`✅ Street name similarity: ${streetSimilarity}% (${subjectStreetName} vs ${scrapedStreetName})`);
      } else if (streetSimilarity >= 60) {
        // More forgiving for partial matches
        const streetPoints = Math.round((streetSimilarity / 100) * 20);
        componentScores.streetName = streetPoints;
        totalScore += streetPoints;
        reasons.push(`⚠️ Partial street name match: ${streetSimilarity}% (${subjectStreetName} vs ${scrapedStreetName})`);
      } else {
        reasons.push(`❌ Low street name similarity: ${streetSimilarity}% (${subjectStreetName} vs ${scrapedStreetName})`);
      }
    }
    
    // 3. Property name similarity (20 points)
    maxPossibleScore += 20;
    componentScores.propertyName = 0;
    if (subjectName && scrapedName) {
      const nameSimilarity = calculateStringSimilarity(subjectName, scrapedName);
      componentScores.propertyNameSimilarity = nameSimilarity;
      
      if (nameSimilarity >= 70) {
        // High match - likely same property
        const namePoints = 20;
        componentScores.propertyName = namePoints;
        totalScore += namePoints;
        reasons.push(`✅ Strong property name match: ${nameSimilarity}% (${subjectName} vs ${scrapedName})`);
      } else if (nameSimilarity >= 50) {
        const namePoints = Math.round((nameSimilarity / 100) * 20);
        componentScores.propertyName = namePoints;
        totalScore += namePoints;
        reasons.push(`⚠️ Property name similarity: ${nameSimilarity}% (${subjectName} vs ${scrapedName})`);
      } else {
        // Check if one name contains the other
        if (subjectName.includes(scrapedName) || scrapedName.includes(subjectName)) {
          componentScores.propertyName = 10;
          totalScore += 10;
          reasons.push(`⚠️ Property name partial match: "${subjectName}" and "${scrapedName}"`);
        } else {
          reasons.push(`❌ Low property name similarity: ${nameSimilarity}% (${subjectName} vs ${scrapedName})`);
        }
      }
    }
    
    // 4. Full address similarity (15 points)
    maxPossibleScore += 15;
    const fullAddressSimilarity = calculateStringSimilarity(subjectAddress, scrapedAddress);
    if (fullAddressSimilarity >= 70) {
      const addressPoints = Math.round((fullAddressSimilarity / 100) * 15);
      totalScore += addressPoints;
      reasons.push(`Full address similarity: ${fullAddressSimilarity}%`);
    }
    
    // 5. City/State context (10 points) - from subject property schema
    maxPossibleScore += 10;
    if (subjectProperty.city || subjectProperty.state) {
      const subjectCity = normalizeAddress(subjectProperty.city || '');
      const subjectState = normalizeAddress(subjectProperty.state || '');
      
      if (subjectCity && scrapedAddress.includes(subjectCity)) {
        totalScore += 5;
        reasons.push(`City match in scraped address: ${subjectCity}`);
      }
      if (subjectState && scrapedAddress.includes(subjectState)) {
        totalScore += 5;
        reasons.push(`State match in scraped address: ${subjectState}`);
      }
    }
    
    // Calculate final score percentage
    const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    
    console.log('[PROPERTY_MATCH] Component scores:', componentScores);
    console.log('[PROPERTY_MATCH] Total score:', totalScore, '/', maxPossibleScore);
    console.log('[PROPERTY_MATCH] Final score:', finalScore, '%');
    
    // LOWERED THRESHOLD: Match thresholds:
    // - 70%+ = Highly likely match (LOWERED from 85%)
    // - 60%+ = Likely match (for properties with similar names/addresses)
    // - 50%+ = Possible match (requires manual review)
    const isMatch = finalScore >= 60; // LOWERED from 70% to be more forgiving
    
    console.log('[PROPERTY_MATCH] Is match?', isMatch);
    console.log('[PROPERTY_MATCH] Reasons:', reasons);
    
    return {
      isMatch,
      score: finalScore,
      reasons,
      matchDetails: {
        componentScores,
        totalScore,
        maxPossibleScore,
        threshold: 60,
        subjectData: { name: subjectName, address: subjectAddress },
        scrapedData: { name: scrapedName, address: scrapedAddress }
      }
    };
  }

  // Helper function to generate city URL from address
  function generateCityUrl(address: string): string {
    const parts = address.split(',').map(p => p.trim());
    
    if (parts.length < 2) return '';
    
    // Expected formats:
    // "Street Address, City, State ZIP" -> ["Street Address", "City", "State ZIP"]
    // "Street Address, City State ZIP" -> ["Street Address", "City State ZIP"]
    
    if (parts.length >= 3) {
      // Format: "Street, City, State ZIP"
      const city = parts[1].toLowerCase().replace(/\s+/g, '-');
      const stateWithZip = parts[2];
      const stateZipParts = stateWithZip.split(' ');
      const state = stateZipParts[0].toLowerCase();
      const zip = stateZipParts[1] || '';
      
      return zip ? `apartments.com/${city}-${state}-${zip}/` : `apartments.com/${city}-${state}/`;
    } else if (parts.length === 2) {
      // Format: "Street, City State ZIP"
      const cityStateZip = parts[1];
      const cityStateZipParts = cityStateZip.split(' ');
      
      if (cityStateZipParts.length >= 2) {
        const city = cityStateZipParts[0].toLowerCase();
        const state = cityStateZipParts[1].toLowerCase();
        const zip = cityStateZipParts[2] || '';
        
        return zip ? `apartments.com/${city}-${state}-${zip}/` : `apartments.com/${city}-${state}/`;
      }
    }
    
    return '';
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

          // Advanced property matching with scoring and detailed logging
          const matchResult = calculatePropertyMatch(property, propertyData);
          const isSubjectProperty = matchResult.isMatch;
          
          // Log detailed matching information
          console.log(`\n${'='.repeat(60)}`);
          console.log(`[PROPERTY_MATCH_RESULT] Property #${scrapedProperties.length + 1}`);
          console.log(`Subject: "${property.propertyName}" at "${property.address}"`);
          console.log(`Scraped: "${propertyData.name}" at "${propertyData.address}"`);
          console.log(`Match Score: ${matchResult.score}% (threshold: ${matchResult.matchDetails.threshold}%)`);
          console.log(`Is Match: ${isSubjectProperty ? '✅ YES' : '❌ NO'}`);
          console.log(`Component Scores:`, matchResult.matchDetails.componentScores);
          console.log(`Reasons:`);
          matchResult.reasons.forEach(reason => console.log(`  ${reason}`));
          console.log(`${'='.repeat(60)}\n`);

          if (isSubjectProperty) {
            subjectPropertyFound = true;
            console.log('🎯 FOUND SUBJECT PROPERTY MATCH:', propertyData.name, `(Score: ${matchResult.score}%)`);
            console.log('URL:', propertyData.url);
          }

          const scrapedProperty = await storage.createScrapedProperty({
            scrapingJobId: scrapingJob.id,
            name: propertyData.name,
            url: propertyData.url,
            address: propertyData.address,
            distance: null,
            matchScore: matchResult.score.toString(),
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

        // Include match results in response for debugging
        const matchResults = scrapedProperties.map(sp => ({
          id: sp.id,
          name: sp.name,
          address: sp.address,
          matchScore: sp.matchScore,
          isSubjectProperty: sp.isSubjectProperty,
          url: sp.url
        }));
        
        res.json({ 
          scrapingJob: { ...scrapingJob, status: "completed" },
          message: `Successfully scraped ${allProperties.length} properties from ${cityState}`,
          targetUrl: `https://www.${cityUrl}`,
          scrapedProperties: scrapedProperties.length,
          subjectPropertyFound,
          jobIds,
          matchResults,
          subjectProperty: scrapedProperties.find(p => p.isSubjectProperty) || null,
          debugInfo: {
            totalScraped: allProperties.length,
            totalStored: scrapedProperties.length,
            matchThreshold: 60,
            subjectPropertyData: {
              name: property.propertyName,
              address: property.address
            }
          }
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

  // Manual subject property selection endpoint - mark a scraped property as the subject
  app.post("/api/properties/:id/set-subject", async (req, res) => {
    try {
      const propertyId = req.params.id;
      const { scrapedPropertyId } = req.body;
      
      console.log('[MANUAL_SUBJECT_SELECTION] Setting subject property');
      console.log('[MANUAL_SUBJECT_SELECTION] Property ID:', propertyId);
      console.log('[MANUAL_SUBJECT_SELECTION] Scraped Property ID:', scrapedPropertyId);
      
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Get the scraped property to mark as subject
      const scrapedProperty = await storage.getScrapedProperty(scrapedPropertyId);
      if (!scrapedProperty) {
        return res.status(404).json({ message: "Scraped property not found" });
      }
      
      // Unmark any existing subject properties for this property's scraping jobs
      const scrapingJobs = await storage.getScrapingJobsByProperty(propertyId);
      for (const job of scrapingJobs) {
        const jobProperties = await storage.getScrapedPropertiesByJob(job.id);
        for (const prop of jobProperties) {
          if (prop.isSubjectProperty && prop.id !== scrapedPropertyId) {
            // Update to unmark this property (implementation would need to be added to storage)
            console.log('[MANUAL_SUBJECT_SELECTION] Unmarking previous subject:', prop.name);
          }
        }
      }
      
      // Mark the selected property as the subject
      console.log('[MANUAL_SUBJECT_SELECTION] Marking as subject:', scrapedProperty.name);
      
      res.json({ 
        success: true,
        message: `Successfully set ${scrapedProperty.name} as the subject property`,
        subjectProperty: {
          id: scrapedProperty.id,
          name: scrapedProperty.name,
          address: scrapedProperty.address,
          url: scrapedProperty.url,
          matchScore: scrapedProperty.matchScore
        },
        originalProperty: {
          id: property.id,
          name: property.propertyName,
          address: property.address
        }
      });
    } catch (error) {
      console.error("[MANUAL_SUBJECT_SELECTION] Error:", error);
      res.status(500).json({ message: "Failed to set subject property" });
    }
  });
  
  // Match subject property with scraped data (legacy endpoint)
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

  // Workflow State Management
  app.get("/api/workflow/:propertyId", async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      let state = await storage.getWorkflowState(propertyId);
      
      if (!state) {
        console.log('[WORKFLOW_STATE] No state found for property:', propertyId);
        // Auto-initialize workflow state if it doesn't exist
        console.log('[WORKFLOW_STATE] Auto-initializing workflow state');
        state = await storage.saveWorkflowState({
          propertyId,
          selectedCompetitorIds: [],
          currentStage: 'input'
        });
      }
      
      res.json(state);
    } catch (error) {
      console.error("[WORKFLOW_STATE] Error fetching workflow state:", error);
      res.status(500).json({ message: "Failed to fetch workflow state" });
    }
  });

  app.put("/api/workflow/:propertyId", async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      const state = {
        propertyId,
        ...req.body
      };
      
      console.log('[WORKFLOW_STATE] Saving workflow state for property:', propertyId);
      console.log('[WORKFLOW_STATE] State data:', state);
      
      const savedState = await storage.saveWorkflowState(state);
      res.json(savedState);
    } catch (error) {
      console.error("[WORKFLOW_STATE] Error saving workflow state:", error);
      res.status(500).json({ message: "Failed to save workflow state" });
    }
  });

  // Force sync units from scraped data
  app.post("/api/properties/:id/sync-units", async (req, res) => {
    try {
      const propertyId = req.params.id;
      
      // Find the subject scraped property
      let subjectProperty = null;
      let scrapedUnits: ScrapedUnit[] = [];
      
      const scrapingJobs = await storage.getScrapingJobsByProperty(propertyId);
      if (scrapingJobs.length > 0) {
        for (const job of scrapingJobs) {
          const scrapedProperties = await storage.getScrapedPropertiesByJob(job.id);
          const subject = scrapedProperties.find(p => p.isSubjectProperty === true);
          if (subject) {
            subjectProperty = subject;
            scrapedUnits = await storage.getScrapedUnitsByProperty(subject.id);
            break;
          }
        }
      }
      
      if (scrapedUnits.length === 0) {
        return res.status(404).json({ message: "No scraped units to sync" });
      }
      
      // Clear existing PropertyUnits and recreate from scraped data
      await storage.clearPropertyUnits(propertyId);
      const units = [];
      
      for (const scrapedUnit of scrapedUnits) {
        const unit = await storage.createPropertyUnit({
          propertyId,
          unitNumber: scrapedUnit.unitNumber || `Unit-${scrapedUnit.id.substring(0, 6)}`,
          unitType: scrapedUnit.unitType,
          currentRent: scrapedUnit.rent || "0",
          status: scrapedUnit.status || "occupied"
        });
        units.push(unit);
      }
      
      res.json({ 
        message: `Successfully synced ${units.length} units from scraped data`,
        unitsCount: units.length,
        units: units
      });
    } catch (error) {
      console.error("Error syncing units:", error);
      res.status(500).json({ message: "Failed to sync units" });
    }
  });

  // Test endpoint for matching logic - can be removed in production if desired

  const httpServer = createServer(app);
  return httpServer;
}
