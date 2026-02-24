export const feedbackQueryKeys = {
  comments: (workspaceSlug: string, postId: string) =>
    ["feedback", workspaceSlug, "posts", postId, "comments"] as const,
};
