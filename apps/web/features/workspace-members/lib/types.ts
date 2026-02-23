export type WorkspaceMemberRole = "admin" | "contributor";

export type WorkspaceInvitationStatus =
  | "pending"
  | "accepted"
  | "canceled"
  | "expired";

export interface WorkspaceMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceMemberRole;
  joinedAt: string;
}

export interface WorkspaceInvitationView {
  id: string;
  email: string;
  role: WorkspaceMemberRole;
  status: WorkspaceInvitationStatus;
  expiresAt: string;
  invitedByName: string;
  createdAt: string;
  lastSentAt: string | null;
}

export interface WorkspaceTeamPermissions {
  canManageMembers: boolean;
  currentRole: WorkspaceMemberRole;
  currentUserId: string;
}

export interface WorkspaceTeamSnapshot {
  members: WorkspaceMemberView[];
  invitations: WorkspaceInvitationView[];
  permissions: WorkspaceTeamPermissions;
}
