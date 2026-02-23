export const domainsQueryKeys = {
  all: ["domains"] as const,
  byWorkspace: (workspaceSlug: string) =>
    [...domainsQueryKeys.all, workspaceSlug] as const,
};
