import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db/index";
import * as schema from "./db/schema";
import { rootDomain } from "./utils";

const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const authUrlProtocol = betterAuthUrl.startsWith("https://")
  ? "https"
  : "http";

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

export const auth = betterAuth({
  appName: "Runbase",
  baseURL: betterAuthUrl,
  secret: betterAuthSecret,
  trustedOrigins: [
    betterAuthUrl,
    `${authUrlProtocol}://${rootDomain}`,
    `${authUrlProtocol}://*.${rootDomain}`,
  ],
  experimental: {
    joins: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }
      : undefined,
  plugins: [nextCookies()],
});
