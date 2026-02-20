export const postsQueryKeys = {
  all: ["posts"] as const,
  byWorkspace: (workspaceSlug: string) =>
    [...postsQueryKeys.all, workspaceSlug] as const,
  detail: (workspaceSlug: string, postId: string) =>
    [...postsQueryKeys.byWorkspace(workspaceSlug), "detail", postId] as const,
};
