import "server-only";

import { Effect } from "effect";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import type { WorkspaceTeamSnapshot } from "~/workspace-members/lib/types";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

function emptySnapshot(userId: string): WorkspaceTeamSnapshot {
  return {
    members: [],
    invitations: [],
    permissions: {
      canManageMembers: false,
      currentRole: "contributor",
      currentUserId: userId,
    },
  };
}

export async function loadWorkspaceTeamSnapshot(workspaceSlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return emptySnapshot("anonymous");
  }

  const program = WorkspaceMembersService.listTeamSnapshot({
    workspaceSlug,
    userId: session.user.id,
  }).pipe(
    Effect.match({
      onSuccess: (snapshot) => snapshot,
      onFailure: (error) => {
        console.error("Failed to load workspace team snapshot", error);
        return emptySnapshot(session.user.id);
      },
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<WorkspaceTeamSnapshot, never, never>,
  );
}
