import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceMembersError } from "~/workspace-members/workspace-members.errors";
import { decodeAcceptInvitationInput } from "~/workspace-members/workspace-members.schema";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be signed in to accept an invitation" },
      { status: 401 },
    );
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

  const program = Effect.gen(function* () {
    const input = yield* decodeAcceptInvitationInput(rawBody);
    const result = yield* WorkspaceMembersService.acceptInvitation({
      token: input.token,
      userId: session.user.id,
      userEmail: session.user.email,
    });

    return result;
  }).pipe(
    Effect.match({
      onSuccess: (result) => NextResponse.json(result),
      onFailure: handleWorkspaceMembersError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
