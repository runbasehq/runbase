"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchWorkspaceTeam,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "~/workspace-members/lib/workspace-members-api";
import { workspaceMembersQueryKeys } from "~/workspace-members/lib/query-keys";
import type {
  WorkspaceMemberRole,
  WorkspaceTeamSnapshot,
} from "~/workspace-members/lib/types";

interface UseWorkspaceMembersOptions {
  workspaceSlug: string;
  initialData: WorkspaceTeamSnapshot;
}

export function useWorkspaceMembers({
  workspaceSlug,
  initialData,
}: UseWorkspaceMembersOptions) {
  return useQuery({
    queryKey: workspaceMembersQueryKeys.team(workspaceSlug),
    queryFn: () => fetchWorkspaceTeam(workspaceSlug),
    initialData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useInviteWorkspaceMemberMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const teamKey = workspaceMembersQueryKeys.team(workspaceSlug);
  const invitationsKey = workspaceMembersQueryKeys.invitations(workspaceSlug);

  return useMutation({
    mutationKey: [...workspaceMembersQueryKeys.all, workspaceSlug, "invite"],
    mutationFn: ({
      email,
      role,
    }: {
      email: string;
      role: WorkspaceMemberRole;
    }) => inviteWorkspaceMember({ workspaceSlug, email, role }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamKey, exact: true }),
        queryClient.invalidateQueries({
          queryKey: invitationsKey,
          exact: true,
        }),
      ]);
    },
  });
}

export function useUpdateWorkspaceMemberRoleMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const teamKey = workspaceMembersQueryKeys.team(workspaceSlug);

  return useMutation({
    mutationKey: [
      ...workspaceMembersQueryKeys.all,
      workspaceSlug,
      "update-role",
    ],
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: WorkspaceMemberRole;
    }) => updateWorkspaceMemberRole({ workspaceSlug, memberId, role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamKey, exact: true });
    },
  });
}

export function useRemoveWorkspaceMemberMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const teamKey = workspaceMembersQueryKeys.team(workspaceSlug);

  return useMutation({
    mutationKey: [
      ...workspaceMembersQueryKeys.all,
      workspaceSlug,
      "remove-member",
    ],
    mutationFn: ({ memberId }: { memberId: string }) =>
      removeWorkspaceMember({ workspaceSlug, memberId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamKey, exact: true });
    },
  });
}
