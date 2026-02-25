import { rootDomain } from "@/lib/utils";

export function getSafeAuthRedirect(target: string | null | undefined) {
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

    if (
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin
    ) {
      return parsed.toString();
    }

    const rootHostname = rootDomain.split(":")[0]?.toLowerCase() || "";
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost =
      hostname === rootHostname || hostname.endsWith(`.${rootHostname}`);

    if (isAllowedHost) {
      return parsed.toString();
    }

    return null;
  } catch {
    return null;
  }
}
