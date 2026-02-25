import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import {
  handleOAuthHandoffError,
  type OAuthHandoffRouteError,
} from "~/oauth-handoff/oauth-handoff.errors";
import { decodeOAuthHandoffStartInput } from "~/oauth-handoff/oauth-handoff.schema";
import { OAuthHandoffService } from "~/oauth-handoff/oauth-handoff.service";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie");

  const program = Effect.gen(function* () {
    const input = yield* decodeOAuthHandoffStartInput(rawBody);

    return yield* OAuthHandoffService.createHandoff({
      returnTo: input.returnTo,
      openerOrigin: input.openerOrigin,
      authState: input.authState,
      authType: input.authType,
      oid: input.oid,
      cookieHeader,
    });
  }).pipe(
    Effect.match({
      onSuccess: ({ handoffUrl }) => NextResponse.json({ handoffUrl }),
      onFailure: (error) =>
        handleOAuthHandoffError(error as OAuthHandoffRouteError),
    }),
  );

  const response = await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
  return response as NextResponse;
}
