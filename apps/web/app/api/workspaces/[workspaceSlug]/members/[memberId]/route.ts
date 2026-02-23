import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceMembersError } from "~/workspace-members/workspace-members.errors";
import {
  decodeMemberParams,
  decodeUpdateMemberRoleInput,
} from "~/workspace-members/workspace-members.schema";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; memberId: string }>;
  },
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
    const paramsInput = yield* decodeMemberParams(rawParams);
    const bodyInput = yield* decodeUpdateMemberRoleInput(rawBody);
    const member = yield* WorkspaceMembersService.updateMemberRole({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      memberId: paramsInput.memberId,
      role: bodyInput.role,
    });

    return member;
  }).pipe(
    Effect.match({
      onSuccess: (member) => NextResponse.json({ member }),
      onFailure: handleWorkspaceMembersError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; memberId: string }>;
  },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const paramsInput = yield* decodeMemberParams(rawParams);
    const result = yield* WorkspaceMembersService.removeMember({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      memberId: paramsInput.memberId,
    });

    return result;
  }).pipe(
    Effect.match({
      onSuccess: ({ memberId }) =>
        NextResponse.json({ success: true, memberId }),
      onFailure: handleWorkspaceMembersError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
