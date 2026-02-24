"use client";

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
