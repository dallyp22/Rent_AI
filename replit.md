# Property Analytics Pro - Real Estate Analysis Platform

## Overview

Property Analytics Pro is a comprehensive real estate analysis platform that helps property managers and real estate professionals analyze, compare, and optimize their property pricing strategies. The application combines AI-powered property analysis with web scraping capabilities to provide market insights and competitive analysis. It features a multi-stage workflow that guides users through property input, competitor analysis, detailed comparison, and pricing optimization.

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
- **Current State**: Full authentication system implemented with Replit OIDC
- **Session Management**: Express sessions with PostgreSQL storage (7-day TTL)
- **User Data Isolation**: All data is properly associated with authenticated users
- **Security**: All endpoints protected with authentication middleware, data filtered by user ID
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