"use client";

const POPUP_AUTH_STATE_KEY = "runbase-popup-auth-state";

function createFallbackAuthState() {
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createUuidFromRandomValues(cryptoObject: Crypto) {
  const bytes = new Uint8Array(16);
  cryptoObject.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}

function createPopupAuthStateId() {
  const cryptoObject = window.crypto;

  if (typeof cryptoObject?.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  if (typeof cryptoObject?.getRandomValues === "function") {
    return createUuidFromRandomValues(cryptoObject);
  }

  return createFallbackAuthState();
}

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

  const authState = createPopupAuthStateId();
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
