import type { FeedbackPostItem } from "~/feedback/lib/types";

interface GetPostsResponse {
  posts: Array<Omit<FeedbackPostItem, "createdAt"> & { createdAt: string }>;
}

function normalizePost(
  post: Omit<FeedbackPostItem, "createdAt"> & { createdAt: string },
): FeedbackPostItem {
  return {
    ...post,
    createdAt: new Date(post.createdAt),
  };
}

export async function fetchFeedbackPostsForWorkspace(
  workspaceSlug: string,
): Promise<FeedbackPostItem[]> {
  const response = await fetch(
    `/api/workspaces/${workspaceSlug}/feedback/posts`,
    {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch posts (${response.status})`);
  }

  const payload = (await response.json()) as GetPostsResponse;
  return payload.posts.map(normalizePost);
}
