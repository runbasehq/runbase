import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceMembersError } from "~/workspace-members/workspace-members.errors";
import { decodeUserInvitationParams } from "~/workspace-members/workspace-members.schema";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
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

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const input = yield* decodeUserInvitationParams(rawParams);
    const result = yield* WorkspaceMembersService.rejectPendingInvitation({
      invitationId: input.invitationId,
      userEmail,
    });

    return {
      success: true as const,
      invitationId: result.invitationId,
    };
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
