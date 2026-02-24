export const workspaceMembersQueryKeys = {
  all: ["workspace-members"] as const,
  userInvitations: () =>
    [...workspaceMembersQueryKeys.all, "user", "invitations"] as const,
  team: (workspaceSlug: string) =>
    [...workspaceMembersQueryKeys.all, workspaceSlug, "team"] as const,
  invitations: (workspaceSlug: string) =>
    [...workspaceMembersQueryKeys.all, workspaceSlug, "invitations"] as const,
};
