import type { NextRequest } from "next/server";

export const FEEDBACK_ANON_COOKIE = "fb_anon";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const SESSION_ID_PATTERN = /^[a-f0-9-]{36}$/i;

export function isValidAnonSessionId(
  value: string | null | undefined,
): value is string {
  return Boolean(value && SESSION_ID_PATTERN.test(value));
}

export function getAnonSessionIdFromRequest(request: NextRequest) {
  const value = request.cookies.get(FEEDBACK_ANON_COOKIE)?.value;

  if (!isValidAnonSessionId(value)) {
    return null;
  }

  return value;
}

export function createAnonSessionId() {
  return crypto.randomUUID();
}

export function getAnonVoteSession(request: NextRequest): {
  anonSessionId: string;
  isNew: boolean;
} {
  const existingId = getAnonSessionIdFromRequest(request);

  if (existingId) {
    return { anonSessionId: existingId, isNew: false };
  }

  return {
    anonSessionId: createAnonSessionId(),
    isNew: true,
  };
}

export function getAnonVoteCookieConfig() {
  return {
    name: FEEDBACK_ANON_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
