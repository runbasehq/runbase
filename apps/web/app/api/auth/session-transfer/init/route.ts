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

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.redirect(
      new URL("/sign-in?error=no_session", request.url),
    );
  }

  const cookieHeader = request.headers.get("cookie");

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
      onSuccess: ({ handoffUrl }) => NextResponse.redirect(handoffUrl),
      onFailure: (error) =>
        handleOAuthHandoffError(error as OAuthHandoffRouteError),
    }),
  );

  return await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
