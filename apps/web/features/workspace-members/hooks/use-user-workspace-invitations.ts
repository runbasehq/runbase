"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceMembersQueryKeys } from "~/workspace-members/lib/query-keys";
import {
  acceptUserWorkspaceInvitation,
  fetchUserWorkspaceInvitations,
  rejectUserWorkspaceInvitation,
} from "~/workspace-members/lib/workspace-members-api";

export function useUserWorkspaceInvitations() {
  return useQuery({
    queryKey: workspaceMembersQueryKeys.userInvitations(),
    queryFn: () => fetchUserWorkspaceInvitations(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAcceptUserWorkspaceInvitationMutation() {
  const queryClient = useQueryClient();
  const invitationsKey = workspaceMembersQueryKeys.userInvitations();

  return useMutation({
    mutationKey: [...workspaceMembersQueryKeys.all, "user", "accept-invite"],
    mutationFn: ({ invitationId }: { invitationId: string }) =>
      acceptUserWorkspaceInvitation({ invitationId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: invitationsKey,
        exact: true,
      });
    },
  });
}

export function useRejectUserWorkspaceInvitationMutation() {
  const queryClient = useQueryClient();
  const invitationsKey = workspaceMembersQueryKeys.userInvitations();

  return useMutation({
    mutationKey: [...workspaceMembersQueryKeys.all, "user", "reject-invite"],
    mutationFn: ({ invitationId }: { invitationId: string }) =>
      rejectUserWorkspaceInvitation({ invitationId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: invitationsKey,
        exact: true,
      });
    },
  });
}
