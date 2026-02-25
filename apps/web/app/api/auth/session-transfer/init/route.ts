import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import {
  handleOAuthHandoffError,
  type OAuthHandoffRouteError,
} from "~/oauth-handoff/oauth-handoff.errors";
import { decodeSessionTransferInitInput } from "~/oauth-handoff/oauth-handoff.schema";
import { OAuthHandoffService } from "~/oauth-handoff/oauth-handoff.service";

const debug = process.env.OAUTH_DEBUG_LOGS === "true";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  const host = request.headers.get("host") || "";
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "";

  if (debug) {
    console.info("[oauth] init.request", {
      host,
      proto,
      target,
      hasAuthState: Boolean(request.nextUrl.searchParams.get("authState")),
      hasNext: Boolean(request.nextUrl.searchParams.get("next")),
    });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    console.warn("[oauth] init.no_session", { host, target });
    return NextResponse.redirect(
      new URL("/sign-in?error=no_session", request.url),
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const cookieNames = cookieHeader
    ? cookieHeader
        .split(";")
        .map((c) => c.trim().split("=")[0])
        .filter(Boolean)
    : [];

  if (debug) {
    console.info("[oauth] init.cookies", {
      userId: session.user.id,
      cookieCount: cookieNames.length,
      cookieNames,
    });
  }

  const program = Effect.gen(function* () {
    const input = yield* decodeSessionTransferInitInput(
      request.nextUrl.searchParams,
    );

    return yield* OAuthHandoffService.createHandoff({
      targetOrigin: input.targetOrigin,
      authState: input.authState,
      next: input.next,
      authType: input.authType,
      oid: input.oid,
      cookieHeader,
    });
  }).pipe(
    Effect.match({
      onSuccess: ({ handoffUrl }) => {
        if (debug) {
          console.info("[oauth] init.redirect", {
            handoffOrigin: new URL(handoffUrl).origin,
          });
        }
        return NextResponse.redirect(handoffUrl);
      },
      onFailure: (error) => {
        const err = error as OAuthHandoffRouteError;
        console.error("[oauth] init.error", {
          tag: err._tag,
          target,
          host,
        });
        return handleOAuthHandoffError(err);
      },
    }),
  );

  return await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
