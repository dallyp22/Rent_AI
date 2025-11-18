/**
 * User Migration Script: Neon Database → Railway PostgreSQL + Clerk
 * 
 * This script migrates the existing user from Neon database to:
 * 1. Railway PostgreSQL (data migration)
 * 2. Clerk (authentication)
 * 
 * Prerequisites:
 * - NEON_DATABASE_URL: Connection string for source database
 * - RAILWAY_DATABASE_URL: Connection string for target database  
 * - CLERK_SECRET_KEY: Clerk API key for user creation
 * 
 * Usage:
 * NEON_DATABASE_URL="..." RAILWAY_DATABASE_URL="..." CLERK_SECRET_KEY="..." tsx scripts/migrate-user-to-clerk.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/neon-http";
import { users, propertyProfiles, analysisSessions, savedPortfolios, savedSelectionTemplates } from "../shared/schema";
import { eq } from "drizzle-orm";

// Check required environment variables
if (!process.env.NEON_DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.RAILWAY_DATABASE_URL) {
  console.error('❌ RAILWAY_DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  process.exit(1);
}

// Database connections
const neonSql = neon(process.env.NEON_DATABASE_URL);
const neonDb = drizzleNeon(neonSql);

const railwaySql = neon(process.env.RAILWAY_DATABASE_URL);
const railwayDb = drizzlePostgres(railwaySql);

const CLERK_API_BASE = 'https://api.clerk.com/v1';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

/**
 * Create user in Clerk via API
 */
async function createClerkUser(email: string, firstName?: string, lastName?: string): Promise<string> {
  console.log(`📧 Creating Clerk user for: ${email}`);
  
  const response = await fetch(`${CLERK_API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      first_name: firstName || '',
      last_name: lastName || '',
      skip_password_checks: true, // We'll let them set password on first login
      skip_password_requirement: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Clerk user: ${response.status} - ${error}`);
  }

  const clerkUser = await response.json();
  console.log(`✅ Clerk user created with ID: ${clerkUser.id}`);
  
  return clerkUser.id;
}

/**
 * Main migration function
 */
async function migrateUser() {
  console.log('🚀 Starting user migration from Neon to Railway + Clerk');
  console.log('=====================================\n');

  try {
    // Step 1: Fetch existing user from Neon
    console.log('📊 Step 1: Fetching user from Neon database...');
    const neonUsers = await neonDb.select().from(users).limit(1);
    
    if (neonUsers.length === 0) {
      console.log('⚠️  No users found in Neon database');
      return;
    }

    const existingUser = neonUsers[0];
    console.log(`✅ Found user: ${existingUser.email}`);
    console.log(`   - Name: ${existingUser.firstName} ${existingUser.lastName}`);
    console.log(`   - ID: ${existingUser.id}\n`);

    // Step 2: Create user in Clerk
    console.log('📊 Step 2: Creating user in Clerk...');
    const clerkUserId = await createClerkUser(
      existingUser.email,
      existingUser.firstName || undefined,
      existingUser.lastName || undefined
    );
    console.log(`✅ Clerk user ID: ${clerkUserId}\n`);

    // Step 3: Update user ID mapping in Railway database
    console.log('📊 Step 3: Updating user ownership in Railway database...');
    
    // Update propertyProfiles
    const propertiesResult = await railwayDb
      .update(propertyProfiles)
      .set({ userId: clerkUserId })
      .where(eq(propertyProfiles.userId, existingUser.id!));
    console.log(`✅ Updated property profiles`);

    // Update analysisSessions
    const sessionsResult = await railwayDb
      .update(analysisSessions)
      .set({ userId: clerkUserId })
      .where(eq(analysisSessions.userId, existingUser.id!));
    console.log(`✅ Updated analysis sessions`);

    // Update savedPortfolios
    const portfoliosResult = await railwayDb
      .update(savedPortfolios)
      .set({ userId: clerkUserId })
      .where(eq(savedPortfolios.userId, existingUser.id!));
    console.log(`✅ Updated saved portfolios`);

    // Update savedSelectionTemplates
    const templatesResult = await railwayDb
      .update(savedSelectionTemplates)
      .set({ userId: clerkUserId })
      .where(eq(savedSelectionTemplates.userId, existingUser.id!));
    console.log(`✅ Updated selection templates\n`);

    // Step 4: Verification
    console.log('📊 Step 4: Verifying migration...');
    const updatedProperties = await railwayDb
      .select()
      .from(propertyProfiles)
      .where(eq(propertyProfiles.userId, clerkUserId));
    
    console.log(`✅ Verified: ${updatedProperties.length} properties now owned by Clerk user\n`);

    console.log('=====================================');
    console.log('🎉 Migration completed successfully!');
    console.log('=====================================\n');
    console.log('📝 Summary:');
    console.log(`   - Old User ID: ${existingUser.id}`);
    console.log(`   - New Clerk ID: ${clerkUserId}`);
    console.log(`   - Email: ${existingUser.email}`);
    console.log(`   - Properties migrated: ${updatedProperties.length}`);
    console.log('\n⚠️  Next Steps:');
    console.log('   1. User should sign in with Clerk using their email');
    console.log('   2. They will need to set a new password on first login');
    console.log('   3. Verify all data is accessible in the application');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateUser()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

