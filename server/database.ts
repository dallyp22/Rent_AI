import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create the database connection
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Export schema for easy access
export * from "@shared/schema";