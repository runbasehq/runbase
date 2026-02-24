import { rootDomain } from "@/lib/utils";

interface SafeAuthRedirectOptions {
  allowExternal?: boolean;
}

function getExternalHostAllowlist() {
  const raw = process.env.NEXT_PUBLIC_AUTH_RETURN_TO_ALLOWLIST || "";

  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isHostAllowedByPattern(hostname: string, pattern: string) {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(2);
    return suffix.length > 0 && hostname.endsWith(`.${suffix}`);
  }

  return hostname === pattern;
}

export function getSafeAuthRedirect(
  target: string | null | undefined,
  options?: SafeAuthRedirectOptions,
) {
  if (!target) {
    return null;
  }

  if (target.startsWith("/")) {
    if (target.startsWith("//")) {
      return null;
    }

    return target;
  }

  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const rootHostname = rootDomain.split(":")[0]?.toLowerCase() || "";
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost =
      hostname === rootHostname || hostname.endsWith(`.${rootHostname}`);

    if (isAllowedHost) {
      return parsed.toString();
    }

    if (!options?.allowExternal) {
      return null;
    }

    const allowlist = getExternalHostAllowlist();
    if (
      !allowlist.some((pattern) => isHostAllowedByPattern(hostname, pattern))
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
