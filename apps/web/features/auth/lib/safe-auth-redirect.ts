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
    const rootHostname = rootDomain.split(":")[0]?.toLowerCase() || "";
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost =
      hostname === rootHostname || hostname.endsWith(`.${rootHostname}`);

    if (!isAllowedHost) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
