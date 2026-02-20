import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { feedbackBoard, feedbackPost, feedbackStatus } from "@/lib/db/schema";

import type { ParsedCreateFeedbackPostInput } from "~/feedback/schemas/create-feedback-post";
import type { FeedbackPostItem } from "~/feedback/lib/types";

export class CreateFeedbackPostError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CreateFeedbackPostError";
    this.status = status;
  }
}

function isUniqueViolationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && error.code === "23505";
}

function slugifyTitle(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return normalized || "post";
}

async function resolveBoardId(workspaceId: string, boardId: string | null) {
  if (boardId) {
    const [board] = await db
      .select({ id: feedbackBoard.id })
      .from(feedbackBoard)
      .where(
        and(
          eq(feedbackBoard.workspaceId, workspaceId),
          eq(feedbackBoard.id, boardId),
        ),
      )
      .limit(1);

    if (!board) {
      throw new CreateFeedbackPostError("Invalid board", 400);
    }

    return board.id;
  }

  const [defaultBoard] = await db
    .select({ id: feedbackBoard.id })
    .from(feedbackBoard)
    .where(eq(feedbackBoard.workspaceId, workspaceId))
    .orderBy(desc(feedbackBoard.isDefault), asc(feedbackBoard.createdAt))
    .limit(1);

  if (!defaultBoard) {
    throw new CreateFeedbackPostError("No board configured for workspace", 400);
  }

  return defaultBoard.id;
}

async function resolveStatusId(workspaceId: string) {
  const [defaultStatus] = await db
    .select({ id: feedbackStatus.id })
    .from(feedbackStatus)
    .where(eq(feedbackStatus.workspaceId, workspaceId))
    .orderBy(desc(feedbackStatus.isDefault), asc(feedbackStatus.position))
    .limit(1);

  if (!defaultStatus) {
    throw new CreateFeedbackPostError(
      "No status configured for workspace",
      400,
    );
  }

  return defaultStatus.id;
}

interface CreateFeedbackPostParams {
  workspaceId: string;
  authorUserId: string;
  input: ParsedCreateFeedbackPostInput;
}

export async function createFeedbackPost({
  workspaceId,
  authorUserId,
  input,
}: CreateFeedbackPostParams) {
  const boardId = await resolveBoardId(workspaceId, input.boardId);
  const statusId = await resolveStatusId(workspaceId);
  const baseSlug = slugifyTitle(input.title);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    try {
      const [post] = await db
        .insert(feedbackPost)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          boardId,
          statusId,
          authorUserId,
          title: input.title,
          slug,
          content: input.content,
          publishedAt: new Date(),
        })
        .returning({
          id: feedbackPost.id,
          boardId: feedbackPost.boardId,
          statusId: feedbackPost.statusId,
        });

      const [createdPost] = await db
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
        .where(eq(feedbackPost.id, post.id))
        .limit(1);

      if (!createdPost) {
        throw new CreateFeedbackPostError(
          "Created post could not be loaded",
          500,
        );
      }

      return {
        ...createdPost,
        viewerHasVoted: false,
      } satisfies FeedbackPostItem;
    } catch (error) {
      if (isUniqueViolationError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new CreateFeedbackPostError(
    "Unable to generate a unique URL for this post",
    409,
  );
}
