# Rent AI Optimization - Real Estate Analysis Platform

## Overview

Rent AI Optimization (formerly Property Analytics Pro) is a comprehensive real estate analysis platform that helps property managers and real estate professionals analyze, compare, and optimize their property pricing strategies. The application combines AI-powered property analysis with web scraping capabilities to provide market insights and competitive analysis. It features a multi-stage workflow that guides users through property input, competitor analysis, detailed comparison, and pricing optimization.

## Recent Changes

### October 12, 2025 (Latest)
- **Fixed Market Position Gauge to Show Accurate Session Data**: Market Position Gauge now displays transparent, data-driven calculations
  - Simplified percentile rank calculation to use pure rent comparisons without complex adjustments
  - Fixed pricing power score with transparent formula: 40% percentile, 30% price difference, 30% occupancy
  - Simplified market position text to clear 3-tier system: Below Market (0-33%), At Market (34-66%), Above Market (67-100%)
  - Added data transparency fields: dataPointsUsed, actual average rents, and comparison notes
  - Special handling for small datasets: "Insufficient Data" for 0 competitors, exact position for 1-2 competitors
  - Removed all randomization and complex scoring adjustments that obscured real market comparisons

### October 12, 2025 (Earlier)
- **Fixed Availability Date Display in Optimize Section**: Availability dates now properly flow from Summarize to Optimize and Excel export
  - Enhanced optimization API endpoints to preserve availabilityDate field for both session and property-based flows
  - Fixed formatAvailability logic in OptimizationTable to prioritize specific dates over "Available Now"
  - Fixed formatAvailabilityDate in Excel export to display actual dates like "Oct 18" instead of defaulting to "Available Now"
  - Added dedicated "Availability Date" column to Excel export with properly formatted dates
  - Changed column header from "Status" to "Availability" for better clarity
  - Complete data flow: Scraped Units → Optimization API → UI Display → Excel Export

### October 12, 2025 (Earlier)
- **Streamlined Analysis UI**: Removed Location Score statistics box and adjusted layout
  - Removed Location Score box from analysis results statistics section
  - Adjusted grid layout from 4 columns to 3 columns for better space utilization
  - Updated loading skeleton to match the new 3-box layout
  - Remaining statistics: Unit Count, Average Rent, Price per Sq Ft
  - Cleaner, more balanced visual presentation of key metrics

### October 12, 2025
- **Fixed Phase Navigation Refresh Issue**: Resolved sidebar navigation not updating when on Optimize page
  - Removed 30-second cache time on workflow state queries in sidebar
  - Set `staleTime: 0` to ensure sidebar always fetches fresh workflow state
  - Added `refetchOnWindowFocus` and `refetchOnMount` for better state synchronization
  - Navigation now properly shows all accessible phases immediately after state changes
  - Users can now reliably navigate backward from Optimize to any previously visited phase

### October 12, 2025 (Earlier)
- **Implemented Free Navigation Between Completed Phases**: Enhanced workflow navigation for bidirectional movement
  - Added `highestStage` tracking to workflow state to preserve furthest phase reached
  - Updated sidebar to check `highestStage` instead of current stage for phase accessibility
  - Users can now freely navigate between any phases they've already visited
  - Backward navigation (e.g., Optimize→Analyze→Summarize) no longer locks out later phases
  - Maintains full session context and data when moving between phases
  - Backward compatible with existing sessions

### October 11, 2025
- **Settings Menu Implementation**: Reorganized sidebar navigation for improved focus on workflow
  - Created dedicated Settings dropdown menu with gear icon
  - Moved Property Profiles and Unit Management into Settings menu
  - Removed Portfolio Dashboard completely from navigation 
  - Updated auth redirects to use Property Profiles as default landing page
  - Settings menu only appears for authenticated users
  - Maintains clean separation between workflow phases (Select/Summarize/Analyze/Optimize) and administrative features
  - Enhanced visual hierarchy with phase indicators and status icons

### October 10, 2025
- **Critical Data Architecture Fix**: Separated internal unit management from scraped market data
  - Scraping no longer overwrites propertyUnits table (preserves TAGs and internal data)
  - propertyUnits table = user's managed internal data (TAGs, custom fields)
  - scrapedUnits table = external market data (current prices, availability)
  - Optimization now merges both sources: TAGs from propertyUnits, prices from scrapedUnits
  - Added Market Comparison view in Unit Management showing pricing discrepancies
  - Prevents data loss when scraping - your TAGs are now safe!

### October 10, 2025 
- **Square Footage Data Fix**: Fixed squareFootage field persistence and display in Unit Management
  - Added comprehensive logging to track squareFootage values through Excel import process
  - Verified complete data pipeline from database → API → frontend for squareFootage field
  - Ensured "Sqft" column from Excel is properly detected, parsed, and saved
  - Confirmed display in both Table View ("Sq Ft" column) and Hierarchical View (unit cards)

### October 10, 2025 (Earlier)
- **TAG Field Added to Optimization Output**: Integrated TAG field into optimization table and Excel export
  - Added TAG column between Unit and Property columns in optimization table display
  - Updated Excel export to include TAG field in same position for consistency
  - Fixed backend optimization endpoints to properly fetch and include TAG data from propertyUnits table
  - TAG data now flows from propertyUnits table through optimization process to export
  - Enables users to identify unit configurations during pricing review
  - Fixed database issue: Consolidated 732 units from "Atlas " to "The Atlas Apartments" property

### October 9, 2025
- **Square Footage Field Added**: Added squareFootage field to propertyUnits for better pricing analysis
  - Added squareFootage column (varchar) to propertyUnits table
  - Integrated into Table View with display and inline editing
  - Updated Excel import to detect "Square Footage", "Sq Ft", "SqFt", "Size" columns
  - Added Square Footage column to Excel exports (positioned after Bathrooms)
  - Full backward compatibility - defaults to empty string if not provided
- **TAG-Based Unit Management System**: Implemented comprehensive hierarchical unit management
  - Enhanced propertyUnits table with TAG, bedrooms, bathrooms, and optimization priority fields
  - Created tagDefinitions table for managing TAG display order
  - Added Unit Management page with hierarchical (Property → Bedroom → TAG → Units) and table views
  - Implemented inline editing, bulk operations, and TAG reordering functionality
  - Added Excel import/export with hierarchical formatting and TAG support
  - Integrated virtualization for handling 3000+ units efficiently
  - Full CRUD operations for units with data completeness tracking

### October 7, 2025
- **Branding Update**: Changed application title from "Property Analytics Pro" to "Rent AI Optimization"
- **Navigation Improvement**: Updated sidebar navigation text from "Property Input" to "Select Properties" for clarity
- **UX Enhancement**: Added accessible glow animation to "Analyze Selected Properties" button
  - Uses CSS pseudo-element approach to avoid conflicts with focus ring
  - Subtle pulsing radial gradient effect (2s duration)
  - Conditionally shows only when button is enabled
  - Preserves keyboard navigation accessibility
- **Bug Fix**: Corrected price per square foot calculation to properly average individual unit calculations instead of dividing aggregate values

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with a multi-page workflow
- **State Management**: React Query (TanStack Query) for server state management with optimistic updates
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Styling**: Tailwind CSS with CSS custom properties for theming support
- **Navigation**: Hierarchical sidebar with collapsible sections - Property Profiles, Portfolio Dashboard, and Selection Matrix are nested under Property Input for cleaner organization

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization
- **Validation**: Zod schemas shared between client and server for consistent validation

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon Database
- **ORM**: Drizzle ORM with support for relations and type-safe queries
- **Schema Design**: Normalized database with tables for properties, analysis, competitors, units, optimization reports, and scraping jobs
- **Caching Strategy**: Smart caching service with 30-day TTL for scraped data

### Authentication and Authorization
- **Dual Authentication System**: Support for both Replit OAuth and local email/password authentication
- **Local Authentication**: Email/password registration with bcrypt hashing (10 rounds)
- **Password Reset**: Secure token-based password reset functionality for local users
- **Session Management**: Express sessions with PostgreSQL storage (7-day TTL) for both auth types
- **Unified Middleware**: isAuthenticatedAny and getAuthenticatedUserId support both auth methods
- **User Data Isolation**: Complete data isolation between all users regardless of auth type
- **Security**: All endpoints protected with unified authentication middleware
- **Data Persistence**: User accounts persist across sessions with complete data isolation

### Web Scraping Integration
- **Primary Service**: Scrapezy API for apartment listing discovery and detailed property data extraction
- **Multi-stage Scraping**: 
  - Stage 1: URL discovery from search pages
  - Stage 2: Detailed unit information extraction
  - Stage 3: Smart caching with automatic refresh
- **Error Handling**: Robust error handling with individual property failure isolation
- **Rate Limiting**: Built-in polling mechanism with configurable retry logic

### AI Integration
- **Provider**: OpenAI GPT-5 for property analysis and market insights
- **Use Cases**: 
  - Property market positioning analysis
  - Competitive advantage identification
  - Pricing insights and recommendations
  - Optimization report generation
- **Response Format**: Structured JSON responses for consistent data processing

### Workflow Architecture
- **Multi-page Flow**: 4-stage workflow (Input → Summarize → Analyze → Optimize)
- **Progressive Enhancement**: Each stage builds upon previous data
- **State Persistence**: Server-side state management with client-side caching
- **Real-time Updates**: Polling-based updates for long-running scraping operations

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Connection Pooling**: Built-in connection management for optimal performance

### AI Services
- **OpenAI API**: GPT-5 model for natural language processing and analysis
- **Structured Outputs**: JSON mode for consistent response formatting

### Web Scraping Services
- **Scrapezy API**: Professional web scraping service for apartment listings
- **Rate Limiting**: API-level rate limiting and job queue management
- **Data Extraction**: AI-powered data extraction with custom prompts

### Development Tools
- **Vite**: Fast development server and build tool with HMR
- **TypeScript**: Static type checking across the entire stack
- **ESBuild**: Fast JavaScript bundling for production builds
- **Replit Integration**: Development environment optimization for Replit platform

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives
- **shadcn/ui**: Pre-styled components with consistent design system
- **Lucide React**: Icon library with comprehensive icon set
- **Tailwind CSS**: Utility-first CSS framework with design tokens

### Data Handling Libraries
- **React Hook Form**: Performant form library with validation
- **Zod**: TypeScript-first schema validation
- **date-fns**: Modern date utility library
- **class-variance-authority**: Type-safe variant handling for components

### Development Dependencies
- **tsx**: TypeScript execution for Node.js development
- **PostCSS**: CSS processing with Tailwind integration
- **Autoprefixer**: CSS vendor prefix automation