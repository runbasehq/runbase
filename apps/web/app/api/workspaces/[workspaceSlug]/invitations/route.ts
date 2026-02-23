import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceMembersError } from "~/workspace-members/workspace-members.errors";
import {
  decodeCreateInvitationInput,
  decodeWorkspaceSlugParams,
} from "~/workspace-members/workspace-members.schema";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const input = yield* decodeWorkspaceSlugParams(rawParams);
    const snapshot = yield* WorkspaceMembersService.listTeamSnapshot({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
    });

    return {
      invitations: snapshot.invitations,
      permissions: snapshot.permissions,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
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

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const paramsInput = yield* decodeWorkspaceSlugParams(rawParams);
    const input = yield* decodeCreateInvitationInput(rawBody);
    const invitation = yield* WorkspaceMembersService.inviteMember({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      email: input.email,
      role: input.role,
    });

    return invitation;
  }).pipe(
    Effect.match({
      onSuccess: (invitation) =>
        NextResponse.json({ invitation }, { status: 201 }),
      onFailure: handleWorkspaceMembersError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
