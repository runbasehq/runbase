import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { feedbackPost, feedbackVote } from "@/lib/db/schema";

import { getViewerVoteState } from "./queries";
import type { VoteIdentity } from "./types";

interface VoteMutationInput {
  workspaceId: string;
  postId: string;
  identity: VoteIdentity;
}

interface VoteMutationResult {
  upvoteCount: number;
  viewerHasVoted: boolean;
  alreadyVoted: boolean;
}

async function getPostCount(workspaceId: string, postId: string) {
  const [post] = await db
    .select({ upvoteCount: feedbackPost.upvoteCount })
    .from(feedbackPost)
    .where(
      and(
        eq(feedbackPost.workspaceId, workspaceId),
        eq(feedbackPost.id, postId),
      ),
    )
    .limit(1);

  return post?.upvoteCount ?? null;
}

export async function voteForPost({
  workspaceId,
  postId,
  identity,
}: VoteMutationInput): Promise<VoteMutationResult | null> {
  const existingCount = await getPostCount(workspaceId, postId);

  if (existingCount === null) {
    return null;
  }

  const insertedVotes = await db
    .insert(feedbackVote)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      postId,
      userId: identity.userId,
      anonSessionId: identity.anonSessionId,
    })
    .onConflictDoNothing()
    .returning({ id: feedbackVote.id });

  if (insertedVotes.length) {
    await db
      .update(feedbackPost)
      .set({
        upvoteCount: sql`${feedbackPost.upvoteCount} + 1`,
      })
      .where(
        and(
          eq(feedbackPost.workspaceId, workspaceId),
          eq(feedbackPost.id, postId),
        ),
      );
  }

  const upvoteCount = await getPostCount(workspaceId, postId);

  if (upvoteCount === null) {
    return null;
  }

  return {
    upvoteCount,
    viewerHasVoted: true,
    alreadyVoted: insertedVotes.length === 0,
  };
}

export async function unvoteForPost({
  workspaceId,
  postId,
  identity,
}: VoteMutationInput): Promise<VoteMutationResult | null> {
  const voterPredicate = identity.userId
    ? eq(feedbackVote.userId, identity.userId)
    : eq(feedbackVote.anonSessionId, identity.anonSessionId!);

  const deletedVotes = await db
    .delete(feedbackVote)
    .where(
      and(
        eq(feedbackVote.workspaceId, workspaceId),
        eq(feedbackVote.postId, postId),
        voterPredicate,
      ),
    )
    .returning({ id: feedbackVote.id });

  if (deletedVotes.length) {
    await db
      .update(feedbackPost)
      .set({
        upvoteCount: sql`greatest(${feedbackPost.upvoteCount} - 1, 0)`,
      })
      .where(
        and(
          eq(feedbackPost.workspaceId, workspaceId),
          eq(feedbackPost.id, postId),
        ),
      );
  }

  const upvoteCount = await getPostCount(workspaceId, postId);

  if (upvoteCount === null) {
    return null;
  }

  const viewerHasVoted = await getViewerVoteState(
    workspaceId,
    postId,
    identity.userId,
    identity.anonSessionId,
  );

  return {
    upvoteCount,
    viewerHasVoted,
    alreadyVoted: false,
  };
}
