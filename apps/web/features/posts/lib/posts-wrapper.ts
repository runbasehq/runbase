import type { FeedbackPostItem, FeedbackSnapshot } from "~/feedback/lib/types";

export function getPostsFromSnapshot(
  snapshot: FeedbackSnapshot,
): FeedbackPostItem[] {
  return snapshot.posts;
}

export function applyPostVoteState(
  post: FeedbackPostItem,
  nextHasVoted: boolean,
): FeedbackPostItem {
  if (post.viewerHasVoted === nextHasVoted) {
    return post;
  }

  return {
    ...post,
    viewerHasVoted: nextHasVoted,
    upvoteCount: Math.max(post.upvoteCount + (nextHasVoted ? 1 : -1), 0),
  };
}

export function updatePostsVoteState(
  posts: FeedbackPostItem[],
  postId: string,
  nextHasVoted: boolean,
): FeedbackPostItem[] {
  const updated = posts.map((post) =>
    post.id === postId ? applyPostVoteState(post, nextHasVoted) : post,
  );

  return updated
    .map((post, index) => ({ post, index }))
    .sort((a, b) => {
      if (b.post.upvoteCount !== a.post.upvoteCount) {
        return b.post.upvoteCount - a.post.upvoteCount;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.post);
}
