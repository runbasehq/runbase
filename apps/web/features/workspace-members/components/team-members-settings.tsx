"use client";

import { useState } from "react";

import { useDashboardRuntime } from "~/dashboard/components/dashboard-runtime-context";
import {
  useInviteWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useUpdateWorkspaceMemberRoleMutation,
  useWorkspaceMembers,
} from "~/workspace-members/hooks/use-workspace-members";
import {
  useCancelWorkspaceInvitationMutation,
  useResendWorkspaceInvitationMutation,
  useWorkspaceInvitations,
} from "~/workspace-members/hooks/use-workspace-invitations";
import type {
  WorkspaceMemberRole,
  WorkspaceTeamSnapshot,
} from "~/workspace-members/lib/types";

import { InviteMemberDialog } from "./invite-member-dialog";
import { PendingInvitationsList } from "./pending-invitations-list";

export function TeamMembersSettings({
  initialSnapshot,
}: {
  initialSnapshot: WorkspaceTeamSnapshot;
}) {
  const { workspaceSlug } = useDashboardRuntime();
  const [error, setError] = useState<string | null>(null);

  const membersQuery = useWorkspaceMembers({
    workspaceSlug,
    initialData: initialSnapshot,
  });
  const invitationsQuery = useWorkspaceInvitations({
    workspaceSlug,
    initialInvitations: initialSnapshot.invitations,
    initialPermissions: initialSnapshot.permissions,
  });

  const inviteMutation = useInviteWorkspaceMemberMutation(workspaceSlug);
  const updateRoleMutation =
    useUpdateWorkspaceMemberRoleMutation(workspaceSlug);
  const removeMemberMutation = useRemoveWorkspaceMemberMutation(workspaceSlug);
  const cancelInvitationMutation =
    useCancelWorkspaceInvitationMutation(workspaceSlug);
  const resendInvitationMutation =
    useResendWorkspaceInvitationMutation(workspaceSlug);

  const snapshot = membersQuery.data ?? initialSnapshot;
  const invitationsPayload =
    invitationsQuery.data ??
    ({
      invitations: initialSnapshot.invitations,
      permissions: initialSnapshot.permissions,
    } as const);

  const canManageMembers = snapshot.permissions.canManageMembers;

  async function handleInvite(input: {
    email: string;
    role: WorkspaceMemberRole;
  }) {
    setError(null);

    try {
      await inviteMutation.mutateAsync(input);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send invitation",
      );
    }
  }

  async function handleRoleChange(memberId: string, role: WorkspaceMemberRole) {
    setError(null);

    try {
      await updateRoleMutation.mutateAsync({ memberId, role });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update role",
      );
    }
  }

  async function handleRemoveMember(memberId: string) {
    setError(null);

    try {
      await removeMemberMutation.mutateAsync({ memberId });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove member",
      );
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    setError(null);

    try {
      await cancelInvitationMutation.mutateAsync({ invitationId });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to cancel invitation",
      );
    }
  }

  async function handleResendInvitation(invitationId: string) {
    setError(null);

    try {
      await resendInvitationMutation.mutateAsync({ invitationId });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to resend invitation",
      );
    }
  }

  return (
    <div className="space-y-6">
      <InviteMemberDialog
        canManageMembers={canManageMembers}
        isSubmitting={inviteMutation.isPending}
        onSubmit={handleInvite}
      />

      {error ? (
        <p className="rounded-(--r-sm) border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-(--r-md) border border-(--border)">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--surface)">
            <tr className="text-(--muted)">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border) bg-(--bg)">
            {snapshot.members.map((member) => {
              const isSelf =
                member.userId === snapshot.permissions.currentUserId;

              return (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-(--text)">{member.name}</p>
                    <p className="text-xs text-(--muted)">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {canManageMembers ? (
                      <select
                        value={member.role}
                        onChange={(event) =>
                          void handleRoleChange(
                            member.id,
                            event.target.value as WorkspaceMemberRole,
                          )
                        }
                        disabled={updateRoleMutation.isPending}
                        className="h-8 rounded-(--r-sm) border border-(--border) bg-(--bg) px-2 text-xs text-(--text) disabled:opacity-60"
                      >
                        <option value="contributor">Contributor</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="text-(--text)">{member.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-(--muted)">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageMembers ? (
                      <button
                        type="button"
                        onClick={() => void handleRemoveMember(member.id)}
                        disabled={removeMemberMutation.isPending || isSelf}
                        className="rounded-(--r-sm) border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-(--text)">
          Pending invitations
        </p>
        <PendingInvitationsList
          canManageMembers={canManageMembers}
          invitations={invitationsPayload.invitations}
          isCanceling={cancelInvitationMutation.isPending}
          isResending={resendInvitationMutation.isPending}
          onCancel={(invitationId) => {
            void handleCancelInvitation(invitationId);
          }}
          onResend={(invitationId) => {
            void handleResendInvitation(invitationId);
          }}
        />
      </div>
    </div>
  );
}
