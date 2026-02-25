import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { createAxiomLogger } from "@/lib/axiom-server";
import { appRuntime } from "@/lib/runtime";
import {
  handleOAuthHandoffError,
  type OAuthHandoffRouteError,
} from "~/oauth-handoff/oauth-handoff.errors";
import { decodeOAuthHandoffExchangeInput } from "~/oauth-handoff/oauth-handoff.schema";
import { OAuthHandoffService } from "~/oauth-handoff/oauth-handoff.service";

const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function readFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function readRequestOrigin(request: NextRequest) {
  const forwardedHost = readFirstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const host =
    forwardedHost || readFirstHeaderValue(request.headers.get("host"));

  if (!host) {
    return request.nextUrl.origin;
  }

  const forwardedProto = readFirstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  ).toLowerCase();
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : request.nextUrl.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

function isSecureRequest(request: NextRequest) {
  const forwardedProto = readFirstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  ).toLowerCase();

  if (forwardedProto === "https") return true;
  if (forwardedProto === "http") return false;

  return request.nextUrl.protocol === "https:";
}

export async function GET(request: NextRequest) {
  const log = createAxiomLogger("oauth.session-transfer.complete", {
    feature: "oauth-handoff",
    route: "/api/auth/session-transfer/complete",
    method: "GET",
  });

  const rawHost = request.headers.get("host") || "";
  const rawForwardedHost = request.headers.get("x-forwarded-host") || "";
  const rawForwardedProto = request.headers.get("x-forwarded-proto") || "";
  const computedOrigin = readRequestOrigin(request);
  const hasCode = Boolean(request.nextUrl.searchParams.get("code"));

  try {
    log.debug("complete.request", {
      rawHost,
      rawForwardedHost,
      rawForwardedProto,
      computedOrigin,
      nextUrlProtocol: request.nextUrl.protocol,
      hasCode,
    });

    const rawQuery = {
      code: request.nextUrl.searchParams.get("code") ?? "",
    };

    const program = Effect.gen(function* () {
      const input = yield* decodeOAuthHandoffExchangeInput(rawQuery);

      return yield* OAuthHandoffService.consumeHandoff({
        code: input.code,
        currentOrigin: computedOrigin,
        log,
      });
    }).pipe(
      Effect.match({
        onSuccess: (result) => {
          const redirectUrl = result.redirectUrl;
          const response = NextResponse.redirect(redirectUrl);
          const secure = isSecureRequest(request);
          const hasDontRemember =
            Boolean(result.dontRememberCookieName) &&
            Boolean(result.dontRememberCookieValue);

          log.info("complete.consumed", {
            sessionCookieName: result.sessionCookieName,
            hasSessionValue: Boolean(result.sessionCookieValue),
            sessionValueLen: result.sessionCookieValue?.length || 0,
            dontRememberCookieName: result.dontRememberCookieName,
            hasDontRememberValue: Boolean(result.dontRememberCookieValue),
            redirectUrl,
            redirectOrigin: new URL(redirectUrl).origin,
          });

          log.debug("complete.set_cookie", {
            cookieName: result.sessionCookieName,
            secure,
            sameSite: "lax",
            httpOnly: true,
            hasDontRemember,
            hasMaxAge: !hasDontRemember,
            maxAge: hasDontRemember
              ? undefined
              : DEFAULT_SESSION_MAX_AGE_SECONDS,
          });

          response.cookies.set({
            name: result.sessionCookieName,
            value: result.sessionCookieValue,
            path: "/",
            httpOnly: true,
            secure,
            sameSite: "lax",
            ...(hasDontRemember
              ? {}
              : { maxAge: DEFAULT_SESSION_MAX_AGE_SECONDS }),
          });

          if (hasDontRemember) {
            response.cookies.set({
              name: result.dontRememberCookieName as string,
              value: result.dontRememberCookieValue as string,
              path: "/",
              httpOnly: true,
              secure,
              sameSite: "lax",
            });
          }

          const setCookieHeaders = response.headers.getSetCookie();
          log.debug("complete.response_headers", {
            setCookieCount: setCookieHeaders.length,
            setCookieNames: setCookieHeaders.map(
              (h) => h.split("=")[0] || "??",
            ),
            statusCode: response.status,
            locationHeader: response.headers.get("location") || "none",
          });

          return response;
        },
        onFailure: (error) => {
          const err = error as OAuthHandoffRouteError;
          log.error("complete.error", {
            tag: err._tag,
            computedOrigin,
            rawHost,
            rawForwardedHost,
          });
          return handleOAuthHandoffError(err);
        },
      }),
    );

    return await appRuntime.runPromise(
      program as Effect.Effect<NextResponse, never, never>,
    );
  } finally {
    await log.flush();
  }
}
