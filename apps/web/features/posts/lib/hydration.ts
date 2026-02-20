import {
  QueryClient,
  dehydrate,
  type DehydratedState,
} from "@tanstack/react-query";

import type { FeedbackSnapshot } from "~/feedback/lib/types";

import { getPostsFromSnapshot } from "./posts-wrapper";
import { postsQueryKeys } from "./query-keys";

export function buildPostsHydrationState(
  workspaceSlug: string,
  snapshot: FeedbackSnapshot,
): DehydratedState {
  const queryClient = new QueryClient();
  const posts = getPostsFromSnapshot(snapshot);

  queryClient.setQueryData(postsQueryKeys.byWorkspace(workspaceSlug), posts);

  for (const post of posts) {
    queryClient.setQueryData(
      postsQueryKeys.detail(workspaceSlug, post.id),
      post,
    );
  }

  return dehydrate(queryClient);
}
