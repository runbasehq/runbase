import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceMembersError } from "~/workspace-members/workspace-members.errors";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email?.trim();

  if (!userEmail) {
    return NextResponse.json(
      { error: "Your account does not have a valid email address" },
      { status: 400 },
    );
  }

  const program = Effect.gen(function* () {
    const invitations = yield* WorkspaceMembersService.listPendingInvitationsForUser(
      {
        userEmail,
      },
    );

    return { invitations };
  }).pipe(
    Effect.match({
      onSuccess: (payload) => NextResponse.json(payload),
      onFailure: handleWorkspaceMembersError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
