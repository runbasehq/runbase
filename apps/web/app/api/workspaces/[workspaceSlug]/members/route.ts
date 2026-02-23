import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceMembersError } from "~/workspace-members/workspace-members.errors";
import { decodeWorkspaceSlugParams } from "~/workspace-members/workspace-members.schema";
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
    return yield* WorkspaceMembersService.listTeamSnapshot({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
    });
  }).pipe(
    Effect.match({
      onSuccess: (snapshot) => NextResponse.json(snapshot),
      onFailure: handleWorkspaceMembersError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
