"use client";

import { authClient } from "@/lib/auth-client";

import { readSocialRedirectUrl } from "./read-social-redirect-url";
import { getSafeAuthRedirect } from "./safe-auth-redirect";

type SocialProvider = "google" | "github";

interface StartSocialPopupSignInInput {
  provider: SocialProvider;
  nextTarget: string;
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
}: StartSocialPopupSignInInput): Promise<StartSocialPopupSignInResult> {
  const safeNext = getSafeAuthRedirect(nextTarget) || "/";
  const absoluteNext = toAbsoluteUrl(safeNext);
  const callbackUrl = new URL("/auth/popup-callback", window.location.origin);
  callbackUrl.searchParams.set("next", absoluteNext);
  callbackUrl.searchParams.set("openerOrigin", window.location.origin);

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
    return {
      error: result.error.message || `Unable to sign in with ${provider}`,
      popupOpened: false,
    };
  }

  const redirectUrl = readSocialRedirectUrl(result);

  if (!redirectUrl) {
    popup?.close();
    return {
      error: `Unable to start ${provider} sign in`,
      popupOpened: false,
    };
  }

  if (popup) {
    popup.location.href = redirectUrl;
    return {
      error: null,
      popupOpened: true,
    };
  }

  window.location.assign(redirectUrl);
  return {
    error: null,
    popupOpened: false,
  };
}
