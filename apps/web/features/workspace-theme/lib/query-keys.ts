export const workspaceThemeQueryKeys = {
  all: ["workspace-theme"] as const,
  byWorkspace: (workspaceSlug: string) =>
    [...workspaceThemeQueryKeys.all, workspaceSlug] as const,
};
