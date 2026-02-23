import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceMembersError } from "~/workspace-members/workspace-members.errors";
import { decodeInvitationParams } from "~/workspace-members/workspace-members.schema";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; invitationId: string }>;
  },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const input = yield* decodeInvitationParams(rawParams);
    const invitation = yield* WorkspaceMembersService.resendInvitation({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
      invitationId: input.invitationId,
    });

    return invitation;
  }).pipe(
    Effect.match({
      onSuccess: (invitation) => NextResponse.json({ invitation }),
      onFailure: handleWorkspaceMembersError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
