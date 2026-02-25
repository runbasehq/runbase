import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { lastLoginMethod } from "better-auth/plugins";

import { isVerifiedCustomDomain } from "~/domains/lib/verified-domain-lookup.server";

import { db } from "./db/index";
import * as schema from "./db/schema";
import { rootDomain } from "./utils";

const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const betterAuthProductionUrl =
  process.env.BETTER_AUTH_PRODUCTION_URL ?? betterAuthUrl;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const authUrlProtocol = betterAuthUrl.startsWith("https://") ? "https" : "http";

const socialProviders = {
  ...(googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          redirectURI: `${betterAuthProductionUrl}/api/auth/callback/google`,
        },
      }
    : {}),
  ...(githubClientId && githubClientSecret
    ? {
        github: {
          clientId: githubClientId,
          clientSecret: githubClientSecret,
          redirectURI: `${betterAuthProductionUrl}/api/auth/callback/github`,
        },
      }
    : {}),
};

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

export const auth = betterAuth({
  appName: "Runbase",
  baseURL: betterAuthUrl,
  secret: betterAuthSecret,
  trustedOrigins: async (request) => {
    const staticOrigins = [
      betterAuthUrl,
      `${authUrlProtocol}://${rootDomain}`,
      `${authUrlProtocol}://*.${rootDomain}`,
    ];
    const origin = request?.headers.get("origin");
    if (!origin) return staticOrigins;
    try {
      const hostname = new URL(origin).hostname;
      if (await isVerifiedCustomDomain(hostname)) {
        return [...staticOrigins, origin];
      }
    } catch {}
    return staticOrigins;
  },
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
    Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
  plugins: [
    nextCookies(),
    lastLoginMethod({
      storeInDatabase: false,
    }),
  ],
});
