export interface VoteResponse {
  upvoteCount: number;
  viewerHasVoted: boolean;
}

export async function togglePostLike(
  postId: string,
  viewerHasVoted: boolean,
): Promise<VoteResponse> {
  const response = await fetch(`/api/feedback/posts/${postId}/vote`, {
    method: viewerHasVoted ? "DELETE" : "POST",
  });

  if (!response.ok) {
    throw new Error(`Vote request failed with ${response.status}`);
  }

  return (await response.json()) as VoteResponse;
}
