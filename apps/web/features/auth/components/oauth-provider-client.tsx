"use client";

import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { rootDomain } from "@/lib/utils";
import { getAuthRootOrigin } from "~/auth/lib/get-auth-root-origin";

type SocialProvider = "google" | "github";

interface OAuthProviderClientProps {
  provider: SocialProvider;
  openerOrigin: string | null;
  authState: string | null;
  next: string | null;
  type: string | null;
  oid: string | null;
}

function readSocialRedirectUrl(result: unknown) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const root = result as { url?: unknown; data?: unknown };
  if (typeof root.url === "string" && root.url.length > 0) {
    return root.url;
  }

  if (!root.data || typeof root.data !== "object") {
    return null;
  }

  const data = root.data as { url?: unknown };
  if (typeof data.url === "string" && data.url.length > 0) {
    return data.url;
  }

  return null;
}

function isRootFamilyOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    const rootHostname = rootDomain.split(":")[0]?.toLowerCase() || "";

    return hostname === rootHostname || hostname.endsWith(`.${rootHostname}`);
  } catch {
    return false;
  }
}

export function OAuthProviderClient({
  provider,
  openerOrigin,
  authState,
  next,
  type,
  oid,
}: OAuthProviderClientProps) {
  useEffect(() => {
    void (async () => {
      const authRootOrigin = getAuthRootOrigin();
      const effectiveNext = next || "/";

      let callbackUrl: string;

      if (openerOrigin && !isRootFamilyOrigin(openerOrigin)) {
        // Custom domain flow: callback goes through session-transfer
        const initUrl = new URL(
          "/api/auth/session-transfer/init",
          authRootOrigin,
        );
        initUrl.searchParams.set("target", openerOrigin);
        if (authState) {
          initUrl.searchParams.set("authState", authState);
        }
        initUrl.searchParams.set("next", effectiveNext);
        if (type) {
          initUrl.searchParams.set("type", type);
        }
        if (oid) {
          initUrl.searchParams.set("oid", oid);
        }

        callbackUrl = initUrl.toString();
      } else {
        // Subdomain fallback: callback goes to /oauth/loading directly
        const loadingUrl = new URL("/oauth/loading", authRootOrigin);
        if (openerOrigin) {
          loadingUrl.searchParams.set("openerOrigin", openerOrigin);
        }
        if (authState) {
          loadingUrl.searchParams.set("authState", authState);
        }
        loadingUrl.searchParams.set("returnTo", effectiveNext);
        if (type) {
          loadingUrl.searchParams.set("type", type);
        }
        if (oid) {
          loadingUrl.searchParams.set("oid", oid);
        }

        callbackUrl = loadingUrl.toString();
      }

      const result = await authClient.signIn.social({
        provider,
        callbackURL: callbackUrl,
        disableRedirect: true,
      });

      if (result.error) {
        window.location.replace("/sign-in?error=auth_start_failed");
        return;
      }

      const redirectUrl = readSocialRedirectUrl(result);
      if (!redirectUrl) {
        window.location.replace("/sign-in?error=provider_url_missing");
        return;
      }

      window.location.replace(redirectUrl);
    })();
  }, [provider, openerOrigin, authState, next, type, oid]);

  return <main className="min-h-screen bg-background" aria-hidden />;
}
