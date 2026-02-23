import { getRedis } from "@/lib/redis";
import { rootDomain } from "@/lib/utils";

export type SubdomainData = {
  emoji: string;
  createdAt: number;
};

export function sanitizeSubdomain(subdomain: string) {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function shouldTrustForwardedHeaders() {
  return process.env.TRUST_PROXY_HEADERS === "true";
}

function normalizeHeaderHost(rawHost: string) {
  const firstValue = rawHost.split(",")[0]?.trim().toLowerCase() || "";
  const withoutPort = firstValue.split(":")[0]?.trim() || "";

  if (!withoutPort || !/^[a-z0-9.-]+$/.test(withoutPort)) {
    return "";
  }

  return withoutPort.replace(/\.$/, "");
}

export function extractHostFromHeaders(headers: Pick<Headers, "get">) {
  const host = headers.get("host") || "";
  const forwardedHost = headers.get("x-forwarded-host") || "";

  if (shouldTrustForwardedHeaders()) {
    return normalizeHeaderHost(forwardedHost || host);
  }

  return normalizeHeaderHost(host || forwardedHost);
}

export function extractSubdomainFromHost(rawHost: string) {
  const hostname = rawHost.split(":")[0]?.toLowerCase() || "";

  if (!hostname) {
    return null;
  }

  if (hostname.includes(".localhost")) {
    return hostname.split(".")[0] || null;
  }

  const rootDomainFormatted = rootDomain.split(":")[0].toLowerCase();

  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts[0] || null;
  }

  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

export function extractSubdomainFromHeaders(headers: Pick<Headers, "get">) {
  const host = extractHostFromHeaders(headers);
  return extractSubdomainFromHost(host);
}

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch {
    return str.length >= 1 && str.length <= 10;
  }

  return str.length >= 1 && str.length <= 10;
}

export async function getSubdomainData(subdomain: string) {
  const sanitizedSubdomain = sanitizeSubdomain(subdomain);
  return getRedis().get<SubdomainData>(`subdomain:${sanitizedSubdomain}`);
}

export async function getAllSubdomains() {
  const redis = getRedis();
  const keys = await redis.keys("subdomain:*");

  if (!keys.length) {
    return [];
  }

  const values = await redis.mget<SubdomainData[]>(...keys);

  return keys.map((key, index) => {
    const subdomain = key.replace("subdomain:", "");
    const data = values[index];

    return {
      subdomain,
      emoji: data?.emoji || "❓",
      createdAt: data?.createdAt || Date.now(),
    };
  });
}
