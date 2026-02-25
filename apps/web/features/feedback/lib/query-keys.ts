export const feedbackQueryKeys = {
  all: ["feedback"] as const,
  settings: (workspaceSlug: string) =>
    [...feedbackQueryKeys.all, workspaceSlug, "settings"] as const,
  comments: (workspaceSlug: string, postId: string) =>
    [
      ...feedbackQueryKeys.all,
      workspaceSlug,
      "posts",
      postId,
      "comments",
    ] as const,
};
