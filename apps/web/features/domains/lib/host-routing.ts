import { getRedis } from "@/lib/redis";
import {
  extractHostFromHeaders,
  extractSubdomainFromHeaders,
} from "@/lib/subdomains";
import { rootDomain } from "@/lib/utils";

import { getCustomDomainCacheKey, normalizeHostname } from "./domain-cache";

function getHostFromHeaders(headers: Pick<Headers, "get">) {
  return normalizeHostname(extractHostFromHeaders(headers));
}

function isRootHost(hostname: string) {
  const rootHostname = normalizeHostname(rootDomain.split(":")[0] ?? "");

  if (!hostname || !rootHostname) {
    return false;
  }

  return hostname === rootHostname || hostname === `www.${rootHostname}`;
}

async function getWorkspaceSlugForCustomDomain(hostname: string) {
  try {
    const cached = await getRedis().get<{ workspaceSlug?: string } | string>(
      getCustomDomainCacheKey(hostname),
    );

    if (typeof cached === "string") {
      return cached;
    }

    if (cached && typeof cached.workspaceSlug === "string") {
      return cached.workspaceSlug;
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveWorkspaceSlugFromHeaders(
  headers: Pick<Headers, "get">,
) {
  const subdomain = extractSubdomainFromHeaders(headers);

  if (subdomain) {
    return subdomain;
  }

  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const hostname = getHostFromHeaders(headers);

  if (!hostname || isRootHost(hostname)) {
    return null;
  }

  return getWorkspaceSlugForCustomDomain(hostname);
}
