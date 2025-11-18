# Quick Start Guide - PropertyPilotV2 Deployment

## Your Configuration

### GitHub Repository
**Repository**: https://github.com/dallyp22/Rent_AI.git

**Status**: Currently empty - you'll need to push your code here first.

### API Keys

You'll need these API keys (use your actual values):
- **Firecrawl API Key**: Your Firecrawl key
- **OpenAI API Key**: Your OpenAI key

---

## Step-by-Step Deployment (30 minutes)

### Step 1: Push Code to GitHub (5 min)

```bash
cd "/Users/dallas/Downloads/PropertyPilotV2 2"

# Initialize git if not already done
git init

# Add your GitHub remote
git remote add origin https://github.com/dallyp22/Rent_AI.git

# Add all files
git add .

# Commit with migration message
git commit -m "Migrate to Vercel + Railway with Clerk auth and Firecrawl"

# Push to GitHub
git push -u origin main
```

If you get an error about the remote repository being empty, you may need to:
```bash
git push -u origin main --force
```

---

### Step 2: Set Up Clerk (5 min)

1. Go to https://dashboard.clerk.com
2. Click **"Create Application"**
3. Name: `PropertyPilotV2`
4. Enable: **Email** authentication
5. Click **Create**

**Copy these keys:**
- **Publishable Key**: `pk_test_...` (for Vercel)
- **Secret Key**: `sk_test_...` (for Railway)

---

### Step 3: Deploy to Railway (10 min)

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Click **"New"** → **"GitHub Repo"**
5. Select: `dallyp22/Rent_AI`

**Set Environment Variables** in Railway:

```bash
# Database (auto-populated by Railway)
DATABASE_URL=(leave this, Railway fills it)

# API Keys (use your actual keys)
OPENAI_API_KEY=sk-proj-your-openai-api-key

FIRECRAWL_API_KEY=fc-your-firecrawl-api-key

# Clerk (from Step 2)
CLERK_SECRET_KEY=sk_test_... (paste your Clerk secret key)

# Session Secret (generate new one)
SESSION_SECRET=<run command below>

# Node Settings
NODE_ENV=production
PORT=5000

# Frontend (update after Vercel deployment in Step 4)
FRONTEND_URL=https://your-app.vercel.app
```

**Generate Session Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `SESSION_SECRET` in Railway.

**Get Railway URL:**
- Go to Settings → Networking → Enable Public Networking
- Copy your backend URL (e.g., `https://rent-ai-production.up.railway.app`)

---

### Step 4: Deploy to Vercel (5 min)

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import: `dallyp22/Rent_AI`
4. Framework: **Vite**
5. Build Command: `vite build`
6. Output Directory: `dist/public`

**Set Environment Variables** in Vercel:

```bash
# Railway Backend (from Step 3)
VITE_API_BASE_URL=https://rent-ai-production.up.railway.app

# Clerk (from Step 2)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_... (paste your Clerk publishable key)
```

7. Click **"Deploy"**

**Get Vercel URL:**
- Copy your deployment URL (e.g., `https://rent-ai.vercel.app`)

---

### Step 5: Update Railway Frontend URL (1 min)

1. Go back to **Railway**
2. Add/update environment variable:
   ```bash
   FRONTEND_URL=https://rent-ai.vercel.app
   ```
3. Redeploy (Railway will auto-redeploy)

---

### Step 6: Configure Clerk URLs (2 min)

1. Go to https://dashboard.clerk.com
2. Select your **PropertyPilotV2** application
3. Go to **Paths** (left sidebar)
4. Add to **Allowed Origins**:
   - `https://rent-ai.vercel.app`
   - `http://localhost:5173` (for local dev)
5. Add to **Allowed Redirect URLs**:
   - `https://rent-ai.vercel.app/*`

---

### Step 7: Migrate Database (5 min)

**Option A: Fresh Start (Recommended)**
Just let Railway create a new database, no migration needed!

**Option B: Migrate from Neon (If you have existing data)**

```bash
# 1. Export from Neon
export NEON_DATABASE_URL="postgresql://neondb_owner:npg_aJLP59YBvDTp@ep-nameless-band-ae5jco0t.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
pg_dump "$NEON_DATABASE_URL" > neon_backup.sql

# 2. Import to Railway
export RAILWAY_DATABASE_URL="<get from Railway dashboard>"
psql "$RAILWAY_DATABASE_URL" < neon_backup.sql

# 3. Run schema push
npm run db:push

# 4. Migrate user to Clerk
export CLERK_SECRET_KEY="<your-clerk-secret-key>"
tsx scripts/migrate-user-to-clerk.ts
```

---

### Step 8: Test Everything (5 min)

1. Open your Vercel URL: `https://rent-ai.vercel.app`
2. Click **"Sign In"**
3. Create a new account with Clerk
4. Add a property profile
5. Test scraping (if you have a property URL)
6. Verify everything works!

---

## Troubleshooting

### Build Failed on Railway?
- Check logs in Railway dashboard
- Verify all environment variables are set
- Make sure GitHub push was successful

### Build Failed on Vercel?
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Try manual redeploy

### CORS Errors?
- Verify `FRONTEND_URL` in Railway matches Vercel URL exactly
- Redeploy Railway after updating

### Authentication Not Working?
- Check Clerk keys are correct
- Verify Vercel URL is in Clerk's allowed origins
- Check browser console for errors

### Can't Access Deployment?
**Railway:**
- Make sure public networking is enabled
- Check deployment logs for errors

**Vercel:**
- Deployment should be automatic
- Check domains are properly configured

---

## Quick Reference

| Service | Purpose | URL |
|---------|---------|-----|
| **GitHub** | Code repository | https://github.com/dallyp22/Rent_AI |
| **Railway** | Backend + Database | https://railway.app |
| **Vercel** | Frontend | https://vercel.com |
| **Clerk** | Authentication | https://dashboard.clerk.com |
| **Firecrawl** | Web scraping | Already configured ✅ |
| **OpenAI** | AI analysis | Already configured ✅ |

---

## Next Steps After Deployment

1. ✅ Test authentication flow
2. ✅ Add some properties
3. ✅ Test scraping with Firecrawl
4. ✅ Run a complete analysis workflow
5. ✅ Test Excel exports
6. 📊 Monitor Railway and Vercel dashboards
7. 🔄 Set up custom domain (optional)

---

## Support

- **Full Guide**: See `DEPLOYMENT.md` for detailed instructions
- **Migration Summary**: See `MIGRATION_SUMMARY.md` for all changes made
- **Clerk Docs**: https://clerk.com/docs
- **Firecrawl Docs**: https://docs.firecrawl.dev
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs

---

**You're all set!** 🚀 Follow these steps and you'll have PropertyPilotV2 running on Vercel + Railway in about 30 minutes.

