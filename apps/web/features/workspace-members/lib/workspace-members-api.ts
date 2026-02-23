import type {
  WorkspaceInvitationView,
  WorkspaceMemberRole,
  WorkspaceMemberView,
  WorkspaceTeamPermissions,
  WorkspaceTeamSnapshot,
} from "~/workspace-members/lib/types";

interface WorkspaceMembersApiError {
  error?: string;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T &
    WorkspaceMembersApiError;

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export async function fetchWorkspaceTeam(workspaceSlug: string) {
  return requestJson<WorkspaceTeamSnapshot>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members`,
  );
}

export async function fetchWorkspaceInvitations(workspaceSlug: string) {
  return requestJson<{
    invitations: WorkspaceInvitationView[];
    permissions: WorkspaceTeamPermissions;
  }>(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/invitations`);
}

export async function inviteWorkspaceMember({
  workspaceSlug,
  email,
  role,
}: {
  workspaceSlug: string;
  email: string;
  role: WorkspaceMemberRole;
}) {
  return requestJson<{ invitation: WorkspaceInvitationView }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/invitations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    },
  );
}

export async function updateWorkspaceMemberRole({
  workspaceSlug,
  memberId,
  role,
}: {
  workspaceSlug: string;
  memberId: string;
  role: WorkspaceMemberRole;
}) {
  return requestJson<{ member: WorkspaceMemberView }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
  );
}

export async function removeWorkspaceMember({
  workspaceSlug,
  memberId,
}: {
  workspaceSlug: string;
  memberId: string;
}) {
  return requestJson<{ success: true; memberId: string }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function cancelWorkspaceInvitation({
  workspaceSlug,
  invitationId,
}: {
  workspaceSlug: string;
  invitationId: string;
}) {
  return requestJson<{ success: true; invitationId: string }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/invitations/${encodeURIComponent(invitationId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function resendWorkspaceInvitation({
  workspaceSlug,
  invitationId,
}: {
  workspaceSlug: string;
  invitationId: string;
}) {
  return requestJson<{ invitation: WorkspaceInvitationView }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/invitations/${encodeURIComponent(invitationId)}/resend`,
    {
      method: "POST",
    },
  );
}
