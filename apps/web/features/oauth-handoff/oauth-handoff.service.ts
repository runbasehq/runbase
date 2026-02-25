import "server-only";

import { Effect } from "effect";

import {
  getSafeServerAuthRedirect,
  getSafeServerOrigin,
} from "~/auth/lib/safe-auth-redirect.server";

import {
  OAuthHandoffForbidden,
  OAuthHandoffInvalidInput,
  OAuthHandoffUnauthorized,
} from "./oauth-handoff.errors";
import { OAuthHandoffRepository } from "./oauth-handoff.repository";

const HANDOFF_TTL_SECONDS = 60;

const readSafeRedirect = (target: string | null | undefined) =>
  Effect.tryPromise({
    try: () => getSafeServerAuthRedirect(target),
    catch: () => null,
  });

const readSafeOrigin = (origin: string | null | undefined) =>
  Effect.tryPromise({
    try: () => getSafeServerOrigin(origin),
    catch: () => null,
  });

interface CookieEntry {
  name: string;
  value: string;
}

function parseCookies(cookieHeader: string | null | undefined): CookieEntry[] {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const separatorIndex = chunk.indexOf("=");
      if (separatorIndex < 0) {
        return null;
      }

      const name = chunk.slice(0, separatorIndex).trim();
      const value = chunk.slice(separatorIndex + 1).trim();

      if (!name || !value) {
        return null;
      }

      return { name, value };
    })
    .filter((entry): entry is CookieEntry => entry !== null);
}

function findCookie(entries: CookieEntry[], names: string[]) {
  for (const cookieName of names) {
    const match = entries.find((entry) => entry.name === cookieName);
    if (match) {
      return match;
    }
  }

  return null;
}

function getSessionCookieCandidates() {
  return [
    "__Secure-better-auth.session_token",
    "better-auth.session_token",
    "__Secure-better-auth-session_token",
    "better-auth-session_token",
  ];
}

function getDontRememberCookieCandidates() {
  return ["__Secure-better-auth.dont_remember", "better-auth.dont_remember"];
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export class OAuthHandoffService extends Effect.Service<OAuthHandoffService>()(
  "OAuthHandoffService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repository = yield* OAuthHandoffRepository;

      const createHandoff = Effect.fn("OAuthHandoffService.createHandoff")(
        ({
          returnTo,
          openerOrigin,
          authState,
          authType,
          oid,
          cookieHeader,
        }: {
          returnTo: string;
          openerOrigin: string | null;
          authState: string | null;
          authType: string | null;
          oid: string | null;
          cookieHeader: string | null;
        }) =>
          Effect.gen(function* () {
            const safeReturnTo = yield* readSafeRedirect(returnTo);
            if (!safeReturnTo || !isAbsoluteHttpUrl(safeReturnTo)) {
              return yield* new OAuthHandoffInvalidInput({
                message: "returnTo must be an allowed absolute URL",
              });
            }

            const parsedReturnTo = new URL(safeReturnTo);
            const safeTargetOrigin = yield* readSafeOrigin(
              parsedReturnTo.origin,
            );
            if (!safeTargetOrigin) {
              return yield* new OAuthHandoffForbidden({
                message: "Target origin is not allowed",
              });
            }

            const safeOpenerOrigin = openerOrigin
              ? yield* readSafeOrigin(openerOrigin)
              : null;

            const cookies = parseCookies(cookieHeader);
            const sessionCookie = findCookie(
              cookies,
              getSessionCookieCandidates(),
            );
            if (!sessionCookie) {
              return yield* new OAuthHandoffUnauthorized({});
            }

            const dontRememberCookie = findCookie(
              cookies,
              getDontRememberCookieCandidates(),
            );

            const code = yield* repository.createCode({
              ttlSeconds: HANDOFF_TTL_SECONDS,
              payload: {
                targetOrigin: safeTargetOrigin,
                returnTo: safeReturnTo,
                openerOrigin: safeOpenerOrigin,
                authState,
                authType,
                oid,
                sessionCookieName: sessionCookie.name,
                sessionCookieValue: sessionCookie.value,
                dontRememberCookieName: dontRememberCookie?.name || null,
                dontRememberCookieValue: dontRememberCookie?.value || null,
              },
            });

            const handoffUrl = new URL(
              "/api/auth/oauth-handoff/exchange",
              safeTargetOrigin,
            );
            handoffUrl.searchParams.set("code", code);

            return {
              handoffUrl: handoffUrl.toString(),
            };
          }),
      );

      const consumeHandoff = Effect.fn("OAuthHandoffService.consumeHandoff")(
        ({ code, currentOrigin }: { code: string; currentOrigin: string }) =>
          Effect.gen(function* () {
            const safeCurrentOrigin = yield* readSafeOrigin(currentOrigin);
            if (!safeCurrentOrigin) {
              return yield* new OAuthHandoffForbidden({
                message: "Current origin is not allowed",
              });
            }

            const handoff = yield* repository.consumeCode({ code });

            if (handoff.targetOrigin !== safeCurrentOrigin) {
              return yield* new OAuthHandoffForbidden({
                message: "Handoff code does not match this origin",
              });
            }

            const loadingUrl = new URL("/oauth/loading", handoff.targetOrigin);
            loadingUrl.searchParams.set("returnTo", handoff.returnTo);
            loadingUrl.searchParams.set("handoff", "1");
            if (handoff.openerOrigin) {
              loadingUrl.searchParams.set("openerOrigin", handoff.openerOrigin);
            }
            if (handoff.authState) {
              loadingUrl.searchParams.set("authState", handoff.authState);
            }
            if (handoff.authType) {
              loadingUrl.searchParams.set("type", handoff.authType);
            }
            if (handoff.oid) {
              loadingUrl.searchParams.set("oid", handoff.oid);
            }

            return {
              redirectUrl: loadingUrl.toString(),
              sessionCookieName: handoff.sessionCookieName,
              sessionCookieValue: handoff.sessionCookieValue,
              dontRememberCookieName: handoff.dontRememberCookieName,
              dontRememberCookieValue: handoff.dontRememberCookieValue,
            };
          }),
      );

      return {
        createHandoff,
        consumeHandoff,
      };
    }),
    dependencies: [OAuthHandoffRepository.Default],
  },
) {}
