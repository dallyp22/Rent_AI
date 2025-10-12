# Rent AI Optimization - Real Estate Analysis Platform

## Overview

Rent AI Optimization is a comprehensive real estate analysis platform designed to help property managers and professionals analyze, compare, and optimize property pricing strategies. The platform leverages AI-powered analysis and web scraping to provide market insights and competitive analysis. It guides users through a multi-stage workflow: property input, competitor analysis, detailed comparison, and pricing optimization. The goal is to enhance pricing accuracy and market positioning for real estate assets.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Framework**: React with TypeScript, Vite, and Wouter for routing.
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling.
- **Navigation**: Hierarchical sidebar with collapsible sections, clearly separating workflow phases from administrative features. Enhanced visual hierarchy with phase indicators and status icons.
- **Layout**: Streamlined analysis UI with a 3-column grid for key metrics (Unit Count, Average Rent, Price per Sq Ft).
- **Accessibility**: Accessible glow animation for primary action buttons without compromising keyboard navigation.

### Technical Implementations
- **Frontend**: React Query for server state management with optimistic updates, React Hook Form with Zod for type-safe form handling.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations and schema management (Drizzle Kit).
- **Authentication**: Dual system supporting Replit OAuth and local email/password with bcrypt hashing, secure password reset, and Express sessions with PostgreSQL storage. Ensures complete user data isolation.
- **Web Scraping**: Utilizes Scrapezy API for multi-stage URL discovery and detailed property data extraction, including smart caching and robust error handling.
- **AI Integration**: Leverages OpenAI GPT-5 for property market positioning, competitive advantage identification, pricing insights, and optimization report generation, providing structured JSON responses.
- **Workflow**: A 4-stage (Input → Summarize → Analyze → Optimize) multi-page flow with server-side state persistence and client-side caching. Supports free navigation between completed phases, maintaining session context.
- **Data Management**: Separates internal unit management (propertyUnits table for user-managed data like TAGs) from scraped market data (scrapedUnits table for current prices/availability) to prevent data loss and allow for merging both sources during optimization. Includes comprehensive unit management with TAGs, bedrooms, bathrooms, and optimization priority fields, supporting hierarchical and table views, inline editing, bulk operations, and Excel import/export.
- **Calculations**: Transparent and data-driven calculations for market position, percentile rank, and pricing power score, with clear definitions for "Below Market," "At Market," and "Above Market."
- **Smart Pricing Optimization**: Unit-level pricing power scores (40% percentile rank, 30% price difference, 30% availability status) drive intelligent price adjustments. Maximize Revenue applies larger increases to underpriced units (+8-10% for power score 0-40) and minimal to premium units (+1-2% for 80-100). Maximize Occupancy only reduces or holds prices, with steeper cuts for premium units (-8 to -10% for 80-100) and no changes for already below-market units (0% for 0-40). Each adjustment includes clear reasoning and power score display in UI and Excel exports.

### System Design Choices
- **Scalability**: PostgreSQL hosted on Neon Database with built-in connection pooling.
- **Data Consistency**: Shared Zod schemas between client and server for consistent validation.
- **Security**: All endpoints protected with unified authentication middleware, ensuring data isolation.
- **Performance**: Vite for fast development and build, ESBuild for fast JavaScript bundling, virtualization for efficient handling of large unit datasets.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.

### AI Services
- **OpenAI API**: GPT-5 model for NLP and analysis.

### Web Scraping Services
- **Scrapezy API**: Professional web scraping for apartment listings.

### UI Component Libraries
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-styled components.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.

### Data Handling Libraries
- **React Hook Form**: Form management.
- **Zod**: Schema validation.
- **date-fns**: Date utility library.
- **class-variance-authority**: Type-safe variant handling.