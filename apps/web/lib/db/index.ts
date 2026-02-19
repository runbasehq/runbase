import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

const resolvedDatabaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!resolvedDatabaseUrl) {
  throw new Error(
    "Database URL is not set. Define DATABASE_URL (or POSTGRES_URL).",
  );
}

const sql = neon(resolvedDatabaseUrl);

export const db = drizzle({ client: sql, schema });
