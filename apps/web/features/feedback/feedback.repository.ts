import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";

import { db } from "@/lib/db";
import {
  feedbackBoard,
  feedbackPost,
  feedbackStatus,
  feedbackVote,
} from "@/lib/db/schema";
import {
  enforceVotePerPostRateLimit,
  enforceVoteRateLimit,
} from "~/feedback/lib/rate-limit";
import type {
  FeedbackBoardItem,
  FeedbackPostItem,
  FeedbackSnapshot,
  FeedbackStatusItem,
  VoteIdentity,
} from "~/feedback/lib/types";

import type { CreateFeedbackPostInput } from "./feedback.schema";
import {
  FeedbackInvalidBoard,
  FeedbackNoBoardConfigured,
  FeedbackNoStatusConfigured,
  FeedbackPersistenceError,
  FeedbackPostNotFound,
  FeedbackRateLimited,
  FeedbackSlugGenerationFailed,
} from "./feedback.errors";

export interface FeedbackSnapshotParams {
  workspaceId: string;
  userId: string | null;
  anonSessionId: string | null;
}

export interface CreateFeedbackPostParams {
  workspaceId: string;
  authorUserId: string;
  input: CreateFeedbackPostInput;
}

export interface FeedbackVoteParams {
  workspaceId: string;
  postId: string;
  identity: VoteIdentity;
}

export interface FeedbackVoteRateLimitParams {
  workspaceId: string;
  postId: string;
  ip: string;
}

export interface FeedbackVoteResult {
  upvoteCount: number;
  viewerHasVoted: boolean;
  alreadyVoted: boolean;
}

function hasTag(error: unknown, tag: string): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "_tag" in error &&
      (error as { _tag: unknown })._tag === tag,
  );
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

const toPersistenceError = (operation: string) =>
  new FeedbackPersistenceError({ operation });

const fromPersistencePromise = <A>(operation: string, thunk: () => Promise<A>) =>
  Effect.tryPromise({
    try: thunk,
    catch: () => toPersistenceError(operation),
  });

const resolveBoardId = (
  workspaceId: string,
  boardId: string | null,
): Effect.Effect<
  string,
  FeedbackInvalidBoard | FeedbackNoBoardConfigured | FeedbackPersistenceError
> =>
  Effect.gen(function* () {
    if (boardId) {
      const board = yield* fromPersistencePromise(
        "feedback.resolveBoardId",
        async () => {
          const [result] = await db
            .select({ id: feedbackBoard.id })
            .from(feedbackBoard)
            .where(
              and(
                eq(feedbackBoard.workspaceId, workspaceId),
                eq(feedbackBoard.id, boardId),
              ),
            )
            .limit(1);

          return result ?? null;
        },
      );

      if (!board) {
        return yield* Effect.fail(new FeedbackInvalidBoard({ boardId }));
      }

      return board.id;
    }

    const defaultBoard = yield* fromPersistencePromise(
      "feedback.resolveDefaultBoard",
      async () => {
        const [result] = await db
          .select({ id: feedbackBoard.id })
          .from(feedbackBoard)
          .where(eq(feedbackBoard.workspaceId, workspaceId))
          .orderBy(desc(feedbackBoard.isDefault), asc(feedbackBoard.createdAt))
          .limit(1);

        return result ?? null;
      },
    );

    if (!defaultBoard) {
      return yield* Effect.fail(new FeedbackNoBoardConfigured());
    }

    return defaultBoard.id;
  });

const resolveStatusId = (
  workspaceId: string,
): Effect.Effect<string, FeedbackNoStatusConfigured | FeedbackPersistenceError> =>
  Effect.gen(function* () {
    const defaultStatus = yield* fromPersistencePromise(
      "feedback.resolveDefaultStatus",
      async () => {
        const [result] = await db
          .select({ id: feedbackStatus.id })
          .from(feedbackStatus)
          .where(eq(feedbackStatus.workspaceId, workspaceId))
          .orderBy(desc(feedbackStatus.isDefault), asc(feedbackStatus.position))
          .limit(1);

        return result ?? null;
      },
    );

    if (!defaultStatus) {
      return yield* Effect.fail(new FeedbackNoStatusConfigured());
    }

    return defaultStatus.id;
  });

const getPostCount = (workspaceId: string, postId: string) =>
  fromPersistencePromise("feedback.getPostCount", async () => {
    const [post] = await db
      .select({ upvoteCount: feedbackPost.upvoteCount })
      .from(feedbackPost)
      .where(
        and(eq(feedbackPost.workspaceId, workspaceId), eq(feedbackPost.id, postId)),
      )
      .limit(1);

    return post?.upvoteCount ?? null;
  });

export class FeedbackRepository extends Effect.Service<FeedbackRepository>()(
  "FeedbackRepository",
  {
    effect: Effect.succeed({
      getSnapshot: ({
        workspaceId,
        userId,
        anonSessionId,
      }: FeedbackSnapshotParams): Effect.Effect<
        FeedbackSnapshot,
        FeedbackPersistenceError
      > =>
        Effect.gen(function* () {
          const [boards, statuses, posts] = yield* fromPersistencePromise(
            "feedback.getSnapshot",
            () =>
              Promise.all([
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
                  .orderBy(
                    desc(feedbackBoard.isDefault),
                    asc(feedbackBoard.createdAt),
                  ),
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
                  .orderBy(
                    desc(feedbackPost.upvoteCount),
                    desc(feedbackPost.createdAt),
                  ),
              ]),
          );

          const postIds = posts.map((post) => post.id);
          let votedPostIds = new Set<string>();

          if (postIds.length && (userId || anonSessionId)) {
            const votePredicate = userId
              ? eq(feedbackVote.userId, userId)
              : eq(feedbackVote.anonSessionId, anonSessionId!);

            const viewerVotes = yield* fromPersistencePromise(
              "feedback.getSnapshot.viewerVotes",
              async () =>
                db
                  .select({ postId: feedbackVote.postId })
                  .from(feedbackVote)
                  .where(
                    and(
                      eq(feedbackVote.workspaceId, workspaceId),
                      inArray(feedbackVote.postId, postIds),
                      votePredicate,
                    ),
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
        }),
      createPost: ({
        workspaceId,
        authorUserId,
        input,
      }: CreateFeedbackPostParams): Effect.Effect<
        FeedbackPostItem,
        | FeedbackInvalidBoard
        | FeedbackNoBoardConfigured
        | FeedbackNoStatusConfigured
        | FeedbackSlugGenerationFailed
        | FeedbackPersistenceError
      > =>
        Effect.gen(function* () {
          const boardId = yield* resolveBoardId(workspaceId, input.boardId);
          const statusId = yield* resolveStatusId(workspaceId);
          const baseSlug = slugifyTitle(input.title);

          const createdPostId = yield* Effect.tryPromise({
            try: async () => {
              for (let attempt = 0; attempt < 10; attempt += 1) {
                const slug =
                  attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

                try {
                  const [inserted] = await db
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
                    .returning({ id: feedbackPost.id });

                  return inserted.id;
                } catch (error) {
                  if (isUniqueViolationError(error)) {
                    continue;
                  }

                  throw toPersistenceError("feedback.createPost.insert");
                }
              }

              throw new FeedbackSlugGenerationFailed();
            },
            catch: (cause) => {
              if (hasTag(cause, "FeedbackSlugGenerationFailed")) {
                return cause as FeedbackSlugGenerationFailed;
              }

              if (hasTag(cause, "FeedbackPersistenceError")) {
                return cause as FeedbackPersistenceError;
              }

              return toPersistenceError("feedback.createPost.insert");
            },
          });

          const createdPost = yield* fromPersistencePromise(
            "feedback.createPost.select",
            async () => {
              const [result] = await db
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
                .where(eq(feedbackPost.id, createdPostId))
                .limit(1);

              return result ?? null;
            },
          );

          if (!createdPost) {
            return yield* Effect.fail(
              toPersistenceError("feedback.createPost.createdPostMissing"),
            );
          }

          return {
            ...createdPost,
            viewerHasVoted: false,
          } satisfies FeedbackPostItem;
        }),
      enforceVoteRateLimit: ({
        workspaceId,
        postId,
        ip,
      }: FeedbackVoteRateLimitParams): Effect.Effect<
        void,
        FeedbackRateLimited | FeedbackPersistenceError
      > =>
        Effect.gen(function* () {
          const [workspaceLimit, postLimit] = yield* fromPersistencePromise(
            "feedback.enforceVoteRateLimit",
            () =>
              Promise.all([
                enforceVoteRateLimit(workspaceId, ip),
                enforceVotePerPostRateLimit(workspaceId, ip, postId),
              ]),
          );

          if (!workspaceLimit.success || !postLimit.success) {
            return yield* Effect.fail(
              new FeedbackRateLimited({
                workspaceRemaining:
                  typeof workspaceLimit.remaining === "number"
                    ? workspaceLimit.remaining
                    : null,
                postRemaining:
                  typeof postLimit.remaining === "number"
                    ? postLimit.remaining
                    : null,
              }),
            );
          }

          return;
        }),
      voteForPost: ({
        workspaceId,
        postId,
        identity,
      }: FeedbackVoteParams): Effect.Effect<
        FeedbackVoteResult,
        FeedbackPostNotFound | FeedbackPersistenceError
      > =>
        Effect.gen(function* () {
          const existingCount = yield* getPostCount(workspaceId, postId);

          if (existingCount === null) {
            return yield* Effect.fail(new FeedbackPostNotFound({ postId }));
          }

          const insertedVotes = yield* fromPersistencePromise(
            "feedback.voteForPost.insertVote",
            async () =>
              db
                .insert(feedbackVote)
                .values({
                  id: crypto.randomUUID(),
                  workspaceId,
                  postId,
                  userId: identity.userId,
                  anonSessionId: identity.anonSessionId,
                })
                .onConflictDoNothing()
                .returning({ id: feedbackVote.id }),
          );

          if (insertedVotes.length) {
            yield* fromPersistencePromise("feedback.voteForPost.bumpPostCount", () =>
              db
                .update(feedbackPost)
                .set({
                  upvoteCount: sql`${feedbackPost.upvoteCount} + 1`,
                })
                .where(
                  and(
                    eq(feedbackPost.workspaceId, workspaceId),
                    eq(feedbackPost.id, postId),
                  ),
                ),
            );
          }

          const upvoteCount = yield* getPostCount(workspaceId, postId);

          if (upvoteCount === null) {
            return yield* Effect.fail(new FeedbackPostNotFound({ postId }));
          }

          return {
            upvoteCount,
            viewerHasVoted: true,
            alreadyVoted: insertedVotes.length === 0,
          };
        }),
      unvoteForPost: ({
        workspaceId,
        postId,
        identity,
      }: FeedbackVoteParams): Effect.Effect<
        FeedbackVoteResult,
        FeedbackPostNotFound | FeedbackPersistenceError
      > =>
        Effect.gen(function* () {
          const voterPredicate = identity.userId
            ? eq(feedbackVote.userId, identity.userId)
            : eq(feedbackVote.anonSessionId, identity.anonSessionId!);

          const deletedVotes = yield* fromPersistencePromise(
            "feedback.unvoteForPost.deleteVote",
            async () =>
              db
                .delete(feedbackVote)
                .where(
                  and(
                    eq(feedbackVote.workspaceId, workspaceId),
                    eq(feedbackVote.postId, postId),
                    voterPredicate,
                  ),
                )
                .returning({ id: feedbackVote.id }),
          );

          if (deletedVotes.length) {
            yield* fromPersistencePromise(
              "feedback.unvoteForPost.decrementPostCount",
              () =>
                db
                  .update(feedbackPost)
                  .set({
                    upvoteCount: sql`greatest(${feedbackPost.upvoteCount} - 1, 0)`,
                  })
                  .where(
                    and(
                      eq(feedbackPost.workspaceId, workspaceId),
                      eq(feedbackPost.id, postId),
                    ),
                  ),
            );
          }

          const upvoteCount = yield* getPostCount(workspaceId, postId);

          if (upvoteCount === null) {
            return yield* Effect.fail(new FeedbackPostNotFound({ postId }));
          }

          const [vote] = yield* fromPersistencePromise(
            "feedback.unvoteForPost.viewerVoteState",
            () => {
              const votePredicate = identity.userId
                ? eq(feedbackVote.userId, identity.userId)
                : eq(feedbackVote.anonSessionId, identity.anonSessionId!);

              return db
                .select({ id: feedbackVote.id })
                .from(feedbackVote)
                .where(
                  and(
                    eq(feedbackVote.workspaceId, workspaceId),
                    eq(feedbackVote.postId, postId),
                    votePredicate,
                  ),
                )
                .limit(1);
            },
          );

          return {
            upvoteCount,
            viewerHasVoted: Boolean(vote),
            alreadyVoted: false,
          };
        }),
    }),
  },
) {}
