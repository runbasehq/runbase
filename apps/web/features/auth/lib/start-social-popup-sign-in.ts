"use client";

import { authClient } from "@/lib/auth-client";
import { rootDomain } from "@/lib/utils";

import {
  clearPendingPopupAuthState,
  createPendingPopupAuthState,
} from "./popup-auth-state";
import { getSafeAuthRedirect } from "./safe-auth-redirect";
import { getAuthRootOrigin } from "./get-auth-root-origin";

type SocialProvider = "google" | "github";

interface StartSocialPopupSignInInput {
  provider: SocialProvider;
  nextTarget?: string;
  returnTo?: string;
  type?: string;
  oid?: string;
}

interface StartSocialPopupSignInResult {
  error: string | null;
  popupOpened: boolean;
}

function isSubdomainOfRoot(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  const rootHostname = rootDomain.split(":")[0]?.toLowerCase() || "";

  if (hostname === rootHostname) return true;
  if (hostname.endsWith(`.${rootHostname}`)) return true;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;

  return false;
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

function toAbsoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

export async function startSocialPopupSignIn({
  provider,
  nextTarget,
  returnTo,
  type,
  oid,
}: StartSocialPopupSignInInput): Promise<StartSocialPopupSignInResult> {
  const safeNext = getSafeAuthRedirect(nextTarget) || "/";
  const absoluteNext = toAbsoluteUrl(safeNext);
  const sanitizedReturnTo =
    typeof returnTo === "string" && returnTo.trim().length > 0
      ? returnTo.trim()
      : null;
  const authRootOrigin = getAuthRootOrigin();
  const authState = createPendingPopupAuthState();

  if (isSubdomainOfRoot()) {
    // --- Subdomain flow: client-side authClient.signIn.social (2df7a70 style) ---
    const callbackUrl = new URL("/oauth/loading", authRootOrigin);
    callbackUrl.searchParams.set("next", absoluteNext);
    callbackUrl.searchParams.set("openerOrigin", window.location.origin);
    if (authState) {
      callbackUrl.searchParams.set("authState", authState);
    }
    if (sanitizedReturnTo) {
      callbackUrl.searchParams.set("returnTo", sanitizedReturnTo);
    }
    if (type) {
      callbackUrl.searchParams.set("type", type);
    }
    if (oid) {
      callbackUrl.searchParams.set("oid", oid);
    }

    const popup = window.open(
      "",
      `runbase-auth-${provider}`,
      "popup,width=520,height=720,left=120,top=80",
    );

    const result = await authClient.signIn.social({
      provider,
      callbackURL: callbackUrl.toString(),
      disableRedirect: true,
    });

    if (result.error) {
      popup?.close();
      clearPendingPopupAuthState();
      return {
        error: result.error.message || `Unable to sign in with ${provider}`,
        popupOpened: false,
      };
    }

    const redirectUrl = readSocialRedirectUrl(result);
    if (!redirectUrl) {
      popup?.close();
      clearPendingPopupAuthState();
      return {
        error: `Unable to start ${provider} sign in`,
        popupOpened: false,
      };
    }

    if (popup) {
      popup.location.href = redirectUrl;
      popup.focus();
      return {
        error: null,
        popupOpened: true,
      };
    }

    clearPendingPopupAuthState();
    return {
      error: "Popup blocked. Enable popups and try again.",
      popupOpened: false,
    };
  }

  // --- Custom domain flow: redirect popup to broker on root domain ---
  const brokerUrl = new URL(`/oauth/${provider}`, authRootOrigin);
  brokerUrl.searchParams.set("next", absoluteNext);
  brokerUrl.searchParams.set("openerOrigin", window.location.origin);
  if (authState) {
    brokerUrl.searchParams.set("authState", authState);
  }
  if (sanitizedReturnTo) {
    brokerUrl.searchParams.set("returnTo", sanitizedReturnTo);
  }
  if (type) {
    brokerUrl.searchParams.set("type", type);
  }
  if (oid) {
    brokerUrl.searchParams.set("oid", oid);
  }

  const popup = window.open(
    "",
    `runbase-auth-${provider}`,
    "popup,width=520,height=720,left=120,top=80",
  );

  if (popup) {
    popup.location.href = brokerUrl.toString();
    popup.focus();
    return {
      error: null,
      popupOpened: true,
    };
  }

  clearPendingPopupAuthState();
  return {
    error: "Popup blocked. Enable popups and try again.",
    popupOpened: false,
  };
}
