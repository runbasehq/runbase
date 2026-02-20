import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  feedbackBoard,
  feedbackPost,
  feedbackStatus,
  feedbackVote,
} from "@/lib/db/schema";

import type {
  FeedbackBoardItem,
  FeedbackPostItem,
  FeedbackSnapshot,
  FeedbackStatusItem,
} from "./types";

interface FeedbackSnapshotOptions {
  workspaceId: string;
  userId?: string | null;
  anonSessionId?: string | null;
}

export async function getFeedbackSnapshot({
  workspaceId,
  userId,
  anonSessionId,
}: FeedbackSnapshotOptions): Promise<FeedbackSnapshot> {
  const [boards, statuses, posts] = await Promise.all([
    db
      .select({
        id: feedbackBoard.id,
        name: feedbackBoard.name,
        slug: feedbackBoard.slug,
        description: feedbackBoard.description,
        isDefault: feedbackBoard.isDefault,
      })
      .from(feedbackBoard)
      .where(eq(feedbackBoard.workspaceId, workspaceId))
      .orderBy(desc(feedbackBoard.isDefault), asc(feedbackBoard.createdAt)),
    db
      .select({
        id: feedbackStatus.id,
        key: feedbackStatus.key,
        label: feedbackStatus.label,
        color: feedbackStatus.color,
        position: feedbackStatus.position,
        isClosed: feedbackStatus.isClosed,
      })
      .from(feedbackStatus)
      .where(eq(feedbackStatus.workspaceId, workspaceId))
      .orderBy(asc(feedbackStatus.position)),
    db
      .select({
        id: feedbackPost.id,
        boardId: feedbackPost.boardId,
        statusId: feedbackPost.statusId,
        title: feedbackPost.title,
        slug: feedbackPost.slug,
        content: feedbackPost.content,
        upvoteCount: feedbackPost.upvoteCount,
        commentCount: feedbackPost.commentCount,
        createdAt: feedbackPost.createdAt,
        statusLabel: feedbackStatus.label,
        statusKey: feedbackStatus.key,
        boardName: feedbackBoard.name,
      })
      .from(feedbackPost)
      .innerJoin(
        feedbackStatus,
        and(
          eq(feedbackPost.workspaceId, feedbackStatus.workspaceId),
          eq(feedbackPost.statusId, feedbackStatus.id),
        ),
      )
      .innerJoin(
        feedbackBoard,
        and(
          eq(feedbackPost.workspaceId, feedbackBoard.workspaceId),
          eq(feedbackPost.boardId, feedbackBoard.id),
        ),
      )
      .where(eq(feedbackPost.workspaceId, workspaceId))
      .orderBy(desc(feedbackPost.upvoteCount), desc(feedbackPost.createdAt)),
  ]);

  const postIds = posts.map((post) => post.id);

  let votedPostIds = new Set<string>();

  if (postIds.length && (userId || anonSessionId)) {
    const votePredicate = userId
      ? eq(feedbackVote.userId, userId)
      : eq(feedbackVote.anonSessionId, anonSessionId!);

    const viewerVotes = await db
      .select({ postId: feedbackVote.postId })
      .from(feedbackVote)
      .where(
        and(
          eq(feedbackVote.workspaceId, workspaceId),
          inArray(feedbackVote.postId, postIds),
          votePredicate,
        ),
      );

    votedPostIds = new Set(viewerVotes.map((vote) => vote.postId));
  }

  return {
    boards: boards satisfies FeedbackBoardItem[],
    statuses: statuses satisfies FeedbackStatusItem[],
    posts: posts.map((post) => ({
      ...post,
      viewerHasVoted: votedPostIds.has(post.id),
    })) satisfies FeedbackPostItem[],
  };
}

export async function seedWorkspaceFeedbackDefaults(workspaceId: string) {
  const [existingBoard] = await db
    .select({ id: feedbackBoard.id })
    .from(feedbackBoard)
    .where(eq(feedbackBoard.workspaceId, workspaceId))
    .limit(1);

  if (!existingBoard) {
    await db.insert(feedbackBoard).values({
      id: crypto.randomUUID(),
      workspaceId,
      name: "Feature requests",
      slug: "feature-requests",
      description: "Tell us what we should build next.",
      isDefault: true,
    });
  }

  const [existingStatus] = await db
    .select({ id: feedbackStatus.id })
    .from(feedbackStatus)
    .where(eq(feedbackStatus.workspaceId, workspaceId))
    .limit(1);

  if (existingStatus) {
    return;
  }

  await db.insert(feedbackStatus).values([
    {
      id: crypto.randomUUID(),
      workspaceId,
      key: "open",
      label: "Open",
      color: "#0ea5e9",
      position: 0,
      isDefault: true,
      isClosed: false,
    },
    {
      id: crypto.randomUUID(),
      workspaceId,
      key: "planned",
      label: "Planned",
      color: "#f59e0b",
      position: 1,
      isDefault: false,
      isClosed: false,
    },
    {
      id: crypto.randomUUID(),
      workspaceId,
      key: "in_progress",
      label: "In progress",
      color: "#2563eb",
      position: 2,
      isDefault: false,
      isClosed: false,
    },
    {
      id: crypto.randomUUID(),
      workspaceId,
      key: "completed",
      label: "Completed",
      color: "#16a34a",
      position: 3,
      isDefault: false,
      isClosed: true,
    },
  ]);
}
