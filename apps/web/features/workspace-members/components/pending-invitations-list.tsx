"use client";

import type { WorkspaceInvitationView } from "~/workspace-members/lib/types";

export function PendingInvitationsList({
  canManageMembers,
  invitations,
  isCanceling,
  isResending,
  onCancel,
  onResend,
}: {
  canManageMembers: boolean;
  invitations: WorkspaceInvitationView[];
  isCanceling: boolean;
  isResending: boolean;
  onCancel: (invitationId: string) => void;
  onResend: (invitationId: string) => void;
}) {
  const pending = invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  if (pending.length === 0) {
    return (
      <div className="rounded-(--r-md) border border-dashed border-(--border) bg-(--bg) px-4 py-5 text-sm text-(--muted)">
        No pending invitations.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-(--r-md) border border-(--border)">
      <table className="w-full text-left text-sm">
        <thead className="bg-(--surface)">
          <tr className="text-(--muted)">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Invited by</th>
            <th className="px-4 py-3 font-medium">Expires</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border) bg-(--bg)">
          {pending.map((invitation) => (
            <tr key={invitation.id}>
              <td className="px-4 py-3 text-(--text)">{invitation.email}</td>
              <td className="px-4 py-3 text-(--text)">{invitation.role}</td>
              <td className="px-4 py-3 text-(--muted)">
                {invitation.invitedByName}
              </td>
              <td className="px-4 py-3 text-(--muted)">
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {canManageMembers ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onResend(invitation.id)}
                      disabled={isResending || isCanceling}
                      className="rounded-(--r-sm) border border-(--border) px-2.5 py-1 text-xs font-medium text-(--text) hover:border-(--text)/35 disabled:opacity-60"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancel(invitation.id)}
                      disabled={isResending || isCanceling}
                      className="rounded-(--r-sm) border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
