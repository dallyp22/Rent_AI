# PropertyPilotV2 Deployment Guide

## Vercel (Frontend) + Railway (Backend) Deployment

This guide walks you through deploying PropertyPilotV2 with:
- **Frontend**: Vercel
- **Backend**: Railway  
- **Database**: Railway PostgreSQL
- **Authentication**: Clerk
- **Web Scraping**: Firecrawl

---

## Prerequisites

1. **Accounts Required**:
   - [Railway](https://railway.app) account
   - [Vercel](https://vercel.com) account
   - [Clerk](https://clerk.com) account
   - [Firecrawl](https://firecrawl.dev) API key
   - [OpenAI](https://openai.com) API key

2. **Tools Required**:
   - Node.js 18+ and npm
   - Git
   - PostgreSQL client tools (pg_dump, psql) for database migration

---

## Part 1: Railway Setup (Backend + Database)

### 1.1 Create Railway Project

1. Log into [Railway](https://railway.app)
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Note the database connection string

### 1.2 Deploy Backend to Railway

1. In your Railway project, click **"New"** → **"GitHub Repo"**
2. Connect your PropertyPilotV2 repository
3. Railway will auto-detect the Node.js app
4. Go to **Settings** → **Environment Variables**

### 1.3 Configure Railway Environment Variables

Add the following environment variables in Railway:

```bash
# Database (auto-provided by Railway PostgreSQL)
DATABASE_URL=<Railway will auto-populate this>

# OpenAI API
OPENAI_API_KEY=<your-openai-api-key>

# Firecrawl API
FIRECRAWL_API_KEY=<your-firecrawl-api-key>

# Session Security
SESSION_SECRET=<generate-random-32-char-string>

# Clerk Authentication
CLERK_SECRET_KEY=<from-clerk-dashboard>

# Node Environment
NODE_ENV=production
PORT=5000

# Frontend URL (will be your Vercel URL)
FRONTEND_URL=<your-vercel-url>  # Update after Vercel deployment
```

### 1.4 Generate Random Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.5 Get Railway Backend URL

After deployment, go to **Settings** → **Networking** → **Public Networking**
- Enable public networking
- Note your backend URL (e.g., `https://your-app.up.railway.app`)

---

## Part 2: Clerk Setup (Authentication)

### 2.1 Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click **"Create Application"**
3. Name it "PropertyPilotV2"
4. Enable **Email** authentication
5. Click **Create**

### 2.2 Get Clerk Keys

From your Clerk dashboard:
- **API Keys** → Copy **Publishable Key** (starts with `pk_`)
- **API Keys** → Copy **Secret Key** (starts with `sk_`)

### 2.3 Configure Clerk Settings

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Make sure **Email** is enabled
3. Go to **Paths** and note the sign-in/sign-up URLs

---

## Part 3: Database Migration

### 3.1 Export from Neon Database

```bash
# Set source database URL
export NEON_DATABASE_URL="postgresql://neondb_owner:npg_aJLP59YBvDTp@ep-nameless-band-ae5jco0t.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Export database
pg_dump "$NEON_DATABASE_URL" > neon_backup.sql
```

### 3.2 Import to Railway PostgreSQL

```bash
# Set Railway database URL (from Railway dashboard)
export RAILWAY_DATABASE_URL="<your-railway-postgres-url>"

# Import database
psql "$RAILWAY_DATABASE_URL" < neon_backup.sql
```

### 3.3 Run Drizzle Schema Push

```bash
# Update DATABASE_URL in .env to point to Railway
echo "DATABASE_URL=$RAILWAY_DATABASE_URL" > .env

# Push schema changes for Clerk
npm run db:push
```

### 3.4 Migrate User to Clerk

```bash
# Set all required environment variables
export NEON_DATABASE_URL="<neon-url>"
export RAILWAY_DATABASE_URL="<railway-url>"
export CLERK_SECRET_KEY="<clerk-secret-key>"

# Run migration script
tsx scripts/migrate-user-to-clerk.ts
```

**What this does:**
- Creates Clerk user with the same email
- Updates all property records to use new Clerk user ID
- Preserves all existing data

---

## Part 4: Vercel Setup (Frontend)

### 4.1 Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import your PropertyPilotV2 repository
4. Vercel will auto-detect the settings

### 4.2 Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: None (custom)
- **Build Command**: `vite build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### 4.3 Configure Vercel Environment Variables

Add the following environment variables in Vercel:

```bash
# Backend API URL
VITE_API_BASE_URL=<your-railway-backend-url>

# Clerk Publishable Key
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
```

### 4.4 Deploy

Click **"Deploy"** and wait for the build to complete.

### 4.5 Update Railway FRONTEND_URL

After Vercel deployment:
1. Copy your Vercel URL (e.g., `https://property-pilot-v2.vercel.app`)
2. Go back to Railway
3. Update the `FRONTEND_URL` environment variable
4. Trigger a redeployment

---

## Part 5: Clerk Configuration (Final Steps)

### 5.1 Add Vercel URL to Clerk

1. Go to Clerk Dashboard
2. Navigate to **Paths**
3. Add your Vercel URL to **Allowed Origins**
4. Add your Vercel URL to **Allowed Redirect URLs**

### 5.2 Configure Sign-In/Sign-Up URLs

Make sure Clerk's redirect URLs include your Vercel domain.

---

## Part 6: Verification & Testing

### 6.1 Test Authentication

1. Go to your Vercel URL
2. Click **"Sign In"**
3. Use the migrated user email
4. Set a new password (Clerk will prompt)
5. Verify you can sign in successfully

### 6.2 Test Property Management

1. Navigate to **Property Profiles**
2. Verify existing properties are visible
3. Try creating a new property
4. Verify the property is saved

### 6.3 Test Scraping (Firecrawl)

1. Add a property with a URL
2. Trigger scraping
3. Verify unit data is extracted
4. Check for any errors in Railway logs

### 6.4 Test Analysis Workflow

1. Select properties for analysis
2. Start an analysis session
3. Navigate through: Summarize → Analyze → Optimize
4. Verify all features work correctly

### 6.5 Test Excel Export

1. Run an analysis
2. Click **"Export to Excel"**
3. Verify the downloaded file contains correct data

---

## Environment Variables Reference

### Railway (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-populated by Railway |
| `OPENAI_API_KEY` | OpenAI API key for AI analysis | `sk-proj-...` |
| `FIRECRAWL_API_KEY` | Firecrawl API key for scraping | `fc-...` |
| `SESSION_SECRET` | Secret for session encryption | Random 64-char hex string |
| `CLERK_SECRET_KEY` | Clerk backend API key | `sk_test_...` or `sk_live_...` |
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Vercel frontend URL | `https://your-app.vercel.app` |

### Vercel (Frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Railway backend URL | `https://your-app.up.railway.app` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | `pk_test_...` or `pk_live_...` |

---

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. Redeploy Railway backend after updating
3. Check browser console for specific error messages

### Authentication Fails

1. Verify Clerk keys are correct
2. Check Clerk dashboard → **Allowed Origins** includes Vercel URL
3. Ensure user was migrated successfully
4. Check Railway logs for auth errors

### Database Connection Errors

1. Verify `DATABASE_URL` in Railway is set correctly
2. Check Railway PostgreSQL is running
3. Test connection with: `psql "$DATABASE_URL" -c "SELECT 1"`

### Scraping Failures

1. Verify `FIRECRAWL_API_KEY` is set correctly
2. Check Firecrawl API quota/limits
3. Review Railway logs for detailed error messages
4. Test Firecrawl API directly with curl

### Build Failures

**Railway:**
- Check build logs in Railway dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles without errors

**Vercel:**
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Ensure Vite build succeeds locally

---

## Rollback Plan

If migration fails or issues arise:

### 1. Revert to Neon Database

Update Railway `DATABASE_URL` to point back to Neon:

```bash
DATABASE_URL=postgresql://neondb_owner:npg_aJLP59YBvDTp@ep-nameless-band-ae5jco0t.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 2. Keep Backup File

The migration script creates a backup file: `neon_backup_TIMESTAMP.sql`
- Keep this file safe
- Can restore anytime with: `psql "$RAILWAY_DATABASE_URL" < backup_file.sql`

### 3. Tear Down (if needed)

- Railway and Vercel projects can be deleted without affecting Neon
- Original Replit deployment remains intact
- Git history contains all old auth code for reference

---

## Monitoring & Maintenance

### Railway Logs

View logs in real-time:
```bash
railway logs
```

### Vercel Logs

View deployment and function logs in Vercel dashboard

### Database Backups

Railway provides automatic backups. You can also:
```bash
pg_dump "$RAILWAY_DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

### Update Dependencies

```bash
npm update
npm audit fix
```

---

## Support & Resources

- **Clerk Docs**: https://clerk.com/docs
- **Firecrawl Docs**: https://docs.firecrawl.dev
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs

---

## Post-Deployment Checklist

- [ ] Railway backend deployed and accessible
- [ ] Railway PostgreSQL provisioned
- [ ] Database migrated from Neon to Railway
- [ ] User migrated to Clerk
- [ ] Vercel frontend deployed
- [ ] All environment variables configured
- [ ] Clerk authentication working
- [ ] Property management functional
- [ ] Firecrawl scraping operational
- [ ] Analysis workflow tested
- [ ] Excel export working
- [ ] Monitoring/logging set up
- [ ] Backup strategy in place

---

**Migration completed!** Your PropertyPilotV2 application is now running on Vercel + Railway with Clerk authentication and Firecrawl scraping. 🎉

