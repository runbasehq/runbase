"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelWorkspaceInvitation,
  fetchWorkspaceInvitations,
  resendWorkspaceInvitation,
} from "~/workspace-members/lib/workspace-members-api";
import { workspaceMembersQueryKeys } from "~/workspace-members/lib/query-keys";
import type {
  WorkspaceInvitationView,
  WorkspaceTeamPermissions,
} from "~/workspace-members/lib/types";

interface UseWorkspaceInvitationsOptions {
  workspaceSlug: string;
  initialInvitations: WorkspaceInvitationView[];
  initialPermissions: WorkspaceTeamPermissions;
}

export function useWorkspaceInvitations({
  workspaceSlug,
  initialInvitations,
  initialPermissions,
}: UseWorkspaceInvitationsOptions) {
  return useQuery({
    queryKey: workspaceMembersQueryKeys.invitations(workspaceSlug),
    queryFn: () => fetchWorkspaceInvitations(workspaceSlug),
    initialData: {
      invitations: initialInvitations,
      permissions: initialPermissions,
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCancelWorkspaceInvitationMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const teamKey = workspaceMembersQueryKeys.team(workspaceSlug);
  const invitationsKey = workspaceMembersQueryKeys.invitations(workspaceSlug);

  return useMutation({
    mutationKey: [
      ...workspaceMembersQueryKeys.all,
      workspaceSlug,
      "cancel-invite",
    ],
    mutationFn: ({ invitationId }: { invitationId: string }) =>
      cancelWorkspaceInvitation({ workspaceSlug, invitationId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: invitationsKey,
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: teamKey, exact: true }),
      ]);
    },
  });
}

export function useResendWorkspaceInvitationMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const invitationsKey = workspaceMembersQueryKeys.invitations(workspaceSlug);

  return useMutation({
    mutationKey: [
      ...workspaceMembersQueryKeys.all,
      workspaceSlug,
      "resend-invite",
    ],
    mutationFn: ({ invitationId }: { invitationId: string }) =>
      resendWorkspaceInvitation({ workspaceSlug, invitationId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: invitationsKey,
        exact: true,
      });
    },
  });
}
