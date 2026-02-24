import "server-only";

import { rootDomain } from "@/lib/utils";
import { isVerifiedCustomDomain } from "~/domains/lib/verified-domain-lookup.server";

function isHttpUrl(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

function getRootHostname() {
  return rootDomain.split(":")[0]?.toLowerCase() || "";
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
