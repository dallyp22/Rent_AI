import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Determine which driver to use based on DATABASE_URL
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech');

let db;

if (isNeonDatabase) {
  // Use Neon's HTTP driver for Neon databases
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle: drizzleNeon } = await import("drizzle-orm/neon-http");
  const sql = neon(process.env.DATABASE_URL);
  db = drizzleNeon(sql, { schema });
  console.log('[DATABASE] Using Neon HTTP driver');
} else {
  // Use node-postgres for Railway and other PostgreSQL databases
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  db = drizzle(pool, { schema });
  console.log('[DATABASE] Using node-postgres driver for Railway');
}

export { db };

// Export schema for easy access
export * from "@shared/schema";