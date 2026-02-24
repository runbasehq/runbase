import "server-only";

import { extractSubdomainFromHost } from "@/lib/subdomains";
import { protocol, rootDomain } from "@/lib/utils";
import {
  getPreferredVerifiedDomainForWorkspace,
  getVerifiedWorkspaceSlugForDomain,
  isVerifiedCustomDomain,
} from "~/domains/lib/verified-domain-lookup.server";

function isHttpUrl(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

function getRootHostname() {
  return rootDomain.split(":")[0]?.toLowerCase() || "";
}

function buildWorkspaceSubdomainOrigin(workspaceSlug: string) {
  const trimmedSlug = workspaceSlug.trim().toLowerCase();
  const trimmedRootDomain = rootDomain.trim().toLowerCase();
  return `${protocol}://${trimmedSlug}.${trimmedRootDomain}`;
}

function isRootHostname(hostname: string) {
  const rootHostname = getRootHostname();
  return hostname === rootHostname || hostname.endsWith(`.${rootHostname}`);
}

async function isAllowedExternalHostname(hostname: string) {
  if (isRootHostname(hostname)) {
    return true;
  }

  return isVerifiedCustomDomain(hostname);
}

export async function getSafeServerAuthRedirect(
  target: string | null | undefined,
) {
  if (!target) {
    return null;
  }

  if (target.startsWith("/")) {
    return target.startsWith("//") ? null : target;
  }

  try {
    const parsed = new URL(target);
    if (!isHttpUrl(parsed.protocol)) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!(await isAllowedExternalHostname(hostname))) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export async function getSafeServerOrigin(origin: string | null | undefined) {
  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(origin);
    if (!isHttpUrl(parsed.protocol)) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!(await isAllowedExternalHostname(hostname))) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export async function getWorkspaceSlugFromAllowedOrigin(
  origin: string | null | undefined,
) {
  const safeOrigin = await getSafeServerOrigin(origin);
  if (!safeOrigin) {
    return null;
  }

  try {
    const parsed = new URL(safeOrigin);
    const hostname = parsed.hostname.toLowerCase();
    const subdomain = extractSubdomainFromHost(hostname);

    if (subdomain) {
      return subdomain;
    }

    return getVerifiedWorkspaceSlugForDomain(hostname);
  } catch {
    return null;
  }
}

export async function getPreferredWorkspaceOrigin(workspaceSlug: string) {
  if (process.env.NODE_ENV !== "production") {
    return buildWorkspaceSubdomainOrigin(workspaceSlug);
  }

  const preferredCustomDomain =
    await getPreferredVerifiedDomainForWorkspace(workspaceSlug);
  if (preferredCustomDomain) {
    return `${protocol}://${preferredCustomDomain}`;
  }

  return buildWorkspaceSubdomainOrigin(workspaceSlug);
}
