#!/bin/bash

#
# Database Migration Script: Neon → Railway PostgreSQL
# 
# This script helps migrate data from Neon to Railway PostgreSQL
#
# Prerequisites:
# - pg_dump and psql installed
# - NEON_DATABASE_URL environment variable
# - RAILWAY_DATABASE_URL environment variable
#

set -e  # Exit on error

echo "🚀 Database Migration: Neon → Railway PostgreSQL"
echo "================================================="
echo ""

# Check for required tools
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found. Please install PostgreSQL client tools."
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client tools."
    exit 1
fi

# Check for environment variables
if [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ NEON_DATABASE_URL environment variable is required"
    echo "   Example: export NEON_DATABASE_URL='postgresql://...'"
    exit 1
fi

if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo "❌ RAILWAY_DATABASE_URL environment variable is required"
    echo "   Example: export RAILWAY_DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Export from Neon
echo "📊 Step 1: Exporting data from Neon database..."
BACKUP_FILE="neon_backup_$(date +%Y%m%d_%H%M%S).sql"

pg_dump "$NEON_DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Export completed: $BACKUP_FILE"
    echo "   File size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Export failed"
    exit 1
fi
echo ""

# Step 2: Import to Railway
echo "📊 Step 2: Importing data to Railway PostgreSQL..."
echo "⚠️  This will overwrite existing data in Railway database"
read -p "   Continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "❌ Import cancelled"
    exit 1
fi

psql "$RAILWAY_DATABASE_URL" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Import completed successfully"
else
    echo "❌ Import failed"
    exit 1
fi
echo ""

# Step 3: Run schema push (optional)
echo "📊 Step 3: Sync schema with Drizzle..."
read -p "   Run npm run db:push? (yes/no): " -r
echo

if [[ $REPLY =~ ^[Yy]es$ ]]; then
    npm run db:push
    echo "✅ Schema synced"
fi
echo ""

# Success
echo "================================================="
echo "🎉 Migration completed successfully!"
echo "================================================="
echo ""
echo "📝 Summary:"
echo "   - Backup file: $BACKUP_FILE"
echo "   - Source: Neon PostgreSQL"
echo "   - Destination: Railway PostgreSQL"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Run user migration script to create Clerk user:"
echo "      NEON_DATABASE_URL=\"...\" RAILWAY_DATABASE_URL=\"...\" CLERK_SECRET_KEY=\"...\" tsx scripts/migrate-user-to-clerk.ts"
echo "   2. Test the application with Railway database"
echo "   3. Keep the backup file safe: $BACKUP_FILE"
echo ""

