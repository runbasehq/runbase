import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const rawQuery = {
    code: request.nextUrl.searchParams.get("code") ?? "",
  };

  const program = Effect.gen(function* () {
    const input = yield* decodeOAuthHandoffExchangeInput(rawQuery);

    return yield* OAuthHandoffService.consumeHandoff({
      code: input.code,
      currentOrigin: readRequestOrigin(request),
    });
  }).pipe(
    Effect.match({
      onSuccess: (result) => {
        const response = NextResponse.redirect(result.redirectUrl);
        const secure = request.nextUrl.protocol === "https:";
        const hasDontRemember =
          Boolean(result.dontRememberCookieName) &&
          Boolean(result.dontRememberCookieValue);

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

        return response;
      },
      onFailure: (error) =>
        handleOAuthHandoffError(error as OAuthHandoffRouteError),
    }),
  );

  return await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
