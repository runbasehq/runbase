import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db/index";
import * as schema from "./db/schema";

const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

export const auth = betterAuth({
  appName: "Runbase",
  baseURL: betterAuthUrl,
  secret: betterAuthSecret,
  trustedOrigins: [betterAuthUrl],
  experimental: {
    joins: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
