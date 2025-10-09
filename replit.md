# Rent AI Optimization - Real Estate Analysis Platform

## Overview

Rent AI Optimization (formerly Property Analytics Pro) is a comprehensive real estate analysis platform that helps property managers and real estate professionals analyze, compare, and optimize their property pricing strategies. The application combines AI-powered property analysis with web scraping capabilities to provide market insights and competitive analysis. It features a multi-stage workflow that guides users through property input, competitor analysis, detailed comparison, and pricing optimization.

## Recent Changes

### October 9, 2025
- **TAG-Based Hierarchical Sorting**: Enhanced platform to support Property → Bedroom → TAG drill-down for Nustyle portfolio (17 properties, 3,000 units, 353 TAGs)
  - **Database Schema**: 
    - Added TAG, bedrooms, bathrooms, squareFeet fields to propertyUnits table
    - Created composite indexes: (property_profile_id, bedrooms, tag) and (property_profile_id, optimization_priority, tag)
    - Designed for efficient hierarchical queries with proper indexing strategy
  - **TAG Definitions Table**: 
    - Created tagDefinitions table with displayOrder field for consistent TAG sorting
    - Composite index on (property_profile_id, display_order) for grouped sorting operations
    - Supports custom TAG ordering per property profile
  - **Storage Layer**: 
    - Implemented 11 TAG-aware CRUD methods in IStorage interface
    - Full implementation in both DrizzleStorage and MemStorageLegacy classes
    - Hierarchical query capabilities: getUnitsHierarchyByProperty, getPropertyUnitsGroupedByTag
  - **Optimization Logic**: 
    - Built sortUnitsHierarchically helper function using TAG displayOrder
    - Integrated into both legacy (/api/properties/:id/optimize) and session (/api/analysis-sessions/:sessionId/optimize) endpoints
    - Sorts units by: Property (alphabetical) → Bedrooms (numerical) → TAG (displayOrder)
  - **Excel Export**: 
    - Created exportToExcelHierarchical function with 4-level hierarchy
    - Property headers, bedroom subheaders, TAG groups, and individual units
    - Subtotals at bedroom and property levels
    - Fetches TAG displayOrder from API for consistent sorting
  - **UI Components**: 
    - Created PropertyDrillDown component with accordion-based hierarchical display
    - Supports both single property and session (multi-property) modes
    - TAG filtering with multi-select interface
    - Summary statistics at all levels (property, bedroom, TAG)
    - Responsive design with proper loading and error states
  - **API Endpoints**: 
    - GET `/api/tag-definitions` - Retrieve all TAG definitions with displayOrder
    - GET `/api/property-profiles/:id/units/hierarchical` - Single property hierarchical data
    - GET `/api/analysis-sessions/:sessionId/units/hierarchical` - Session-wide aggregated hierarchical data
  - **Optimization Page Enhancement**:
    - Added view toggle: Table View (existing) and Hierarchical View (new)
    - Hierarchical view shows Session→Property→Bedroom→TAG→Units structure
    - Excel export includes TAG data when exporting from hierarchical view
    - Works correctly in both single property and session modes

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