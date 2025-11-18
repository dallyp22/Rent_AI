# PropertyPilotV2

Enterprise-grade real estate portfolio analysis and rent optimization platform powered by AI.

## Quick Links

- **GitHub Repository**: https://github.com/dallyp22/Rent_AI
- **Quick Start Guide**: [QUICK_START.md](./QUICK_START.md) - Deploy in 30 minutes
- **Full Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed instructions
- **Migration Summary**: [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - All changes explained

## What Is PropertyPilotV2?

PropertyPilotV2 helps property managers:
- 🏢 **Manage Property Portfolios** - Track subject properties and competitors
- 🔍 **Scrape Market Data** - Automatically collect unit listings and pricing
- 📊 **Analyze Market Position** - AI-powered competitive analysis
- 💰 **Optimize Pricing** - Data-driven rent recommendations
- 📈 **Export Reports** - Comprehensive Excel reports for stakeholders

## Technology Stack

### Frontend (Vercel)
- React 18 + TypeScript
- Vite for fast builds
- shadcn/ui + Tailwind CSS
- TanStack Query for state management

### Backend (Railway)
- Node.js + Express
- PostgreSQL database
- Clerk authentication
- Firecrawl for web scraping
- OpenAI GPT-4 for AI analysis

## Deployment Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Vercel    │────────▶│   Railway    │────────▶│   Railway    │
│  (Frontend) │  HTTPS  │   (Backend)  │  SQL    │ (PostgreSQL) │
└─────────────┘         └──────────────┘         └──────────────┘
                               │
                        ┌──────┴───────┐
                        │              │
                   ┌────▼───┐    ┌────▼────┐
                   │ Clerk  │    │Firecrawl│
                   │ (Auth) │    │(Scrape) │
                   └────────┘    └─────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- Clerk account (https://clerk.com)
- API keys: OpenAI + Firecrawl

### Quick Deployment (30 minutes)

Follow the [QUICK_START.md](./QUICK_START.md) guide:

1. Push code to GitHub ✅ (Already done!)
2. Set up Clerk authentication
3. Deploy backend to Railway
4. Deploy frontend to Vercel  
5. Configure environment variables
6. Migrate database (if needed)
7. Test and verify

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual API keys

# Run development server
npm run dev        # Backend on port 5000
npm run dev:client # Frontend on port 5173
```

## Features

### 4-Stage Analysis Workflow
1. **Property Input** - Select properties for analysis
2. **Summarize** - View vacancy rates and unit mix
3. **Analyze** - Deep market comparison with filters
4. **Optimize** - AI-powered pricing recommendations

### Advanced Capabilities
- ✅ Multi-property portfolio analysis
- ✅ Competitive set matrix (internal vs external competition)
- ✅ TAG-based unit hierarchy
- ✅ Real-time scraping with progress tracking
- ✅ Excel export with optimization recommendations
- ✅ Configurable risk tolerance and goals

## Environment Variables

### Railway (Backend)
```bash
DATABASE_URL=<Railway auto-populates>
OPENAI_API_KEY=<your-key>
FIRECRAWL_API_KEY=<your-key>
CLERK_SECRET_KEY=<from-clerk-dashboard>
SESSION_SECRET=<random-64-char-hex>
NODE_ENV=production
PORT=5000
FRONTEND_URL=<vercel-url>
```

### Vercel (Frontend)
```bash
VITE_API_BASE_URL=<railway-backend-url>
VITE_CLERK_PUBLISHABLE_KEY=<from-clerk-dashboard>
```

## Project Structure

```
PropertyPilotV2/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
│   └── index.html
├── server/              # Express backend
│   ├── index.ts         # Server entry
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database layer
│   ├── clerkAuth.ts     # Clerk authentication
│   └── firecrawl.ts     # Web scraping
├── shared/              # Shared types
│   └── schema.ts        # Database schema
├── scripts/             # Migration scripts
├── railway.json         # Railway config
├── vercel.json          # Vercel config
└── package.json
```

## Database Schema

14+ PostgreSQL tables including:
- `property_profiles` - Subject & competitor properties
- `analysis_sessions` - Multi-property analysis
- `property_units` - User-managed unit data (TAGs)
- `scraped_units` - Market data from web scraping
- `competitive_relationships` - Portfolio competition mapping
- `saved_portfolios` - User portfolio collections
- `optimization_reports` - AI-generated recommendations

## API Documentation

### Key Endpoints
- `POST /api/property-profiles` - Create property
- `POST /api/analysis-sessions` - Start analysis
- `POST /api/property-profiles/:id/scrape` - Trigger scraping
- `POST /api/analysis-sessions/:id/filtered-analysis` - Run analysis
- `POST /api/analysis-sessions/:id/optimize` - Generate optimization

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete API reference.

## Migration from Replit

This codebase has been migrated from Replit to Vercel + Railway. Key changes:

- **Authentication**: Replit OAuth → Clerk
- **Scraping**: Scrapezy → Firecrawl
- **Database**: Neon → Railway PostgreSQL
- **Deployment**: Monolithic → Microservices

See [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) for details.

## Support & Resources

- **Clerk Docs**: https://clerk.com/docs
- **Firecrawl Docs**: https://docs.firecrawl.dev
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs

## License

MIT

## Troubleshooting

### CORS Errors
Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly.

### Authentication Issues
Check Clerk allowed origins include your Vercel URL.

### Build Failures
- **Railway**: Check build logs, verify environment variables
- **Vercel**: Ensure `VITE_API_BASE_URL` is set correctly

### Database Connection
Verify Railway `DATABASE_URL` is configured properly.

---

**Status**: ✅ Ready for deployment  
**Next Step**: Follow [QUICK_START.md](./QUICK_START.md)

