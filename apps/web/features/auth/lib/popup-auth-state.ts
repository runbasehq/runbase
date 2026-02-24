"use client";

const POPUP_AUTH_STATE_KEY = "runbase-popup-auth-state";

function readPendingPopupAuthState() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(POPUP_AUTH_STATE_KEY);
}

export function createPendingPopupAuthState() {
  if (typeof window === "undefined") {
    return null;
  }

  const authState = window.crypto.randomUUID();
  window.sessionStorage.setItem(POPUP_AUTH_STATE_KEY, authState);
  return authState;
}

export function clearPendingPopupAuthState() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(POPUP_AUTH_STATE_KEY);
}

export function consumePendingPopupAuthState(
  authState: string | null | undefined,
) {
  if (!authState) {
    return false;
  }

  const pendingState = readPendingPopupAuthState();
  if (!pendingState || pendingState !== authState) {
    return false;
  }

  clearPendingPopupAuthState();
  return true;
}
