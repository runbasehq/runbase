import "server-only";

import { Effect } from "effect";

import {
  FeedbackBoardNotFound,
  FeedbackForbidden,
  FeedbackStatusNotFound,
  FeedbackTagNotFound,
  FeedbackWorkspaceNotFound,
} from "./feedback.errors";
import { FeedbackRepository } from "./feedback.repository";

type FeedbackAccessAction = "read" | "post" | "vote" | "unvote";

export class FeedbackService extends Effect.Service<FeedbackService>()(
  "FeedbackService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repository = yield* FeedbackRepository;
      const assertWorkspaceAccess = Effect.fn(
        "FeedbackService.assertWorkspaceAccess",
      )(
        ({
          workspaceId,
          userId,
          action,
        }: {
          workspaceId: string;
          userId: string | null;
          action: FeedbackAccessAction;
        }) =>
          Effect.gen(function* () {
            const workspaceAccess = yield* repository.getWorkspaceAccess({
              workspaceId,
            });

            if (!workspaceAccess) {
              return yield* new FeedbackWorkspaceNotFound({});
            }

            if (workspaceAccess.feedbackAccess === "public") {
              return;
            }

            if (!userId) {
              return yield* new FeedbackForbidden({
                message:
                  action === "read"
                    ? "This feedback board is private to workspace members"
                    : "Sign in as a workspace member to continue",
              });
            }

            const membership = yield* repository.getWorkspaceMembership({
              workspaceId,
              userId,
            });

            if (!membership) {
              return yield* new FeedbackForbidden({
                message:
                  "Only workspace members can access this feedback board",
              });
            }

            return;
          }),
      );

      const requireWorkspaceMemberBySlug = Effect.fn(
        "FeedbackService.requireWorkspaceMemberBySlug",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* repository.getWorkspaceMemberBySlug({
              workspaceSlug,
              userId,
            });

            if (!membership) {
              return yield* new FeedbackWorkspaceNotFound({});
            }

            return membership;
          }),
      );

      const requireWorkspaceAdminBySlug = Effect.fn(
        "FeedbackService.requireWorkspaceAdminBySlug",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceMemberBySlug({
              workspaceSlug,
              userId,
            });

            if (membership.role !== "admin") {
              return yield* new FeedbackForbidden({
                message: "Only workspace admins can manage feedback settings",
              });
            }

            return membership;
          }),
      );

      const getSnapshot = Effect.fn("FeedbackService.getSnapshot")(function* (
        input: Parameters<typeof repository.getSnapshot>[0],
      ) {
        yield* assertWorkspaceAccess({
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "read",
        });
        yield* repository.seedWorkspaceDefaults({
          workspaceId: input.workspaceId,
        });

        return yield* repository.getSnapshot(input);
      });

      const getPublicSnapshot = Effect.fn("FeedbackService.getPublicSnapshot")(
        function* (input: Parameters<typeof repository.getSnapshot>[0]) {
          yield* repository.seedWorkspaceDefaults({
            workspaceId: input.workspaceId,
          });
          const snapshot = yield* repository.getSnapshot(input);

          if (!snapshot.settings.hideClosedStatuses) {
            return snapshot;
          }

          return {
            ...snapshot,
            posts: snapshot.posts.filter((post) => !post.statusIsClosed),
          };
        },
      );

      const createPost = Effect.fn("FeedbackService.createPost")(function* (
        input: Parameters<typeof repository.createPost>[0],
      ) {
        yield* assertWorkspaceAccess({
          workspaceId: input.workspaceId,
          userId: input.authorUserId,
          action: "post",
        });
        yield* repository.seedWorkspaceDefaults({
          workspaceId: input.workspaceId,
        });

        if (input.input.tagIds.length > 0) {
          const [membership, settings] = yield* Effect.all(
            [
              repository.getWorkspaceMembership({
                workspaceId: input.workspaceId,
                userId: input.authorUserId,
              }),
              repository.getWorkspacePublicSettings({
                workspaceId: input.workspaceId,
              }),
            ],
            { concurrency: "unbounded" },
          );

          if (!membership && !settings.allowPublicTagSelection) {
            return yield* new FeedbackForbidden({
              message:
                "Only workspace members can assign tags to new feedback posts",
            });
          }
        }

        return yield* repository.createPost(input);
      });

      const uploadMedia = Effect.fn("FeedbackService.uploadMedia")(function* (
        input: Parameters<typeof repository.uploadMedia>[0],
      ) {
        yield* assertWorkspaceAccess({
          workspaceId: input.workspaceId,
          userId: input.authorUserId,
          action: "post",
        });

        return yield* repository.uploadMedia(input);
      });

      const listComments = Effect.fn("FeedbackService.listComments")(function* (
        input: Parameters<typeof repository.listComments>[0] & {
          userId: string | null;
        },
      ) {
        yield* assertWorkspaceAccess({
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "read",
        });

        return yield* repository.listComments({
          workspaceId: input.workspaceId,
          postId: input.postId,
        });
      });

      const listPublicComments = Effect.fn(
        "FeedbackService.listPublicComments",
      )(function* (input: Parameters<typeof repository.listComments>[0]) {
        return yield* repository.listComments(input);
      });

      const createComment = Effect.fn("FeedbackService.createComment")(
        function* (input: Parameters<typeof repository.createComment>[0]) {
          yield* assertWorkspaceAccess({
            workspaceId: input.workspaceId,
            userId: input.authorUserId,
            action: "post",
          });

          return yield* repository.createComment(input);
        },
      );

      const voteForPost = Effect.fn("FeedbackService.voteForPost")(function* (
        input: Parameters<typeof repository.voteForPost>[0] & { ip: string },
      ) {
        yield* assertWorkspaceAccess({
          workspaceId: input.workspaceId,
          userId: input.identity.userId,
          action: "vote",
        });

        yield* repository.enforceVoteRateLimit({
          workspaceId: input.workspaceId,
          postId: input.postId,
          ip: input.ip,
        });

        return yield* repository.voteForPost({
          workspaceId: input.workspaceId,
          postId: input.postId,
          identity: input.identity,
        });
      });

      const unvoteForPost = Effect.fn("FeedbackService.unvoteForPost")(
        function* (input: Parameters<typeof repository.unvoteForPost>[0]) {
          yield* assertWorkspaceAccess({
            workspaceId: input.workspaceId,
            userId: input.identity.userId,
            action: "unvote",
          });

          return yield* repository.unvoteForPost(input);
        },
      );

      const claimAnonymousVotes = Effect.fn(
        "FeedbackService.claimAnonymousVotes",
      )(function* (
        input: Parameters<typeof repository.claimAnonymousVotes>[0],
      ) {
        return yield* repository.claimAnonymousVotes(input);
      });

      const seedWorkspaceDefaults = Effect.fn(
        "FeedbackService.seedWorkspaceDefaults",
      )(function* (
        input: Parameters<typeof repository.seedWorkspaceDefaults>[0],
      ) {
        return yield* repository.seedWorkspaceDefaults(input);
      });

      const getSettingsSnapshotForWorkspaceMember = Effect.fn(
        "FeedbackService.getSettingsSnapshotForWorkspaceMember",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceMemberBySlug({
              workspaceSlug,
              userId,
            });

            yield* repository.seedWorkspaceDefaults({
              workspaceId: membership.workspaceId,
            });

            const data = yield* repository.listWorkspaceSettingsData({
              workspaceId: membership.workspaceId,
            });

            return {
              workspaceId: membership.workspaceId,
              workspaceSlug: membership.workspaceSlug,
              workspaceName: membership.workspaceName,
              boards: data.boards,
              statuses: data.statuses,
              tags: data.tags,
              settings: data.settings,
              permissions: {
                canManageFeedbackSettings: membership.role === "admin",
              },
            };
          }),
      );

      const updatePublicSettingsForWorkspaceAdmin = Effect.fn(
        "FeedbackService.updatePublicSettingsForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          input,
        }: {
          workspaceSlug: string;
          userId: string;
          input: Parameters<typeof repository.updateWorkspacePublicSettings>[0]["input"];
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });

            return yield* repository.updateWorkspacePublicSettings({
              workspaceId: membership.workspaceId,
              input,
            });
          }),
      );

      const createBoardForWorkspaceAdmin = Effect.fn(
        "FeedbackService.createBoardForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          input,
        }: {
          workspaceSlug: string;
          userId: string;
          input: Parameters<typeof repository.createBoard>[0]["input"];
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });

            return yield* repository.createBoard({
              workspaceId: membership.workspaceId,
              input,
            });
          }),
      );

      const updateBoardForWorkspaceAdmin = Effect.fn(
        "FeedbackService.updateBoardForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          boardId,
          input,
        }: {
          workspaceSlug: string;
          userId: string;
          boardId: string;
          input: Parameters<typeof repository.updateBoard>[0]["input"];
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });
            const updated = yield* repository.updateBoard({
              workspaceId: membership.workspaceId,
              boardId,
              input,
            });

            if (!updated) {
              return yield* new FeedbackBoardNotFound({ boardId });
            }

            return updated;
          }),
      );

      const deleteBoardForWorkspaceAdmin = Effect.fn(
        "FeedbackService.deleteBoardForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          boardId,
        }: {
          workspaceSlug: string;
          userId: string;
          boardId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });
            const deleted = yield* repository.deleteBoard({
              workspaceId: membership.workspaceId,
              boardId,
            });

            if (!deleted) {
              return yield* new FeedbackBoardNotFound({ boardId });
            }

            return deleted;
          }),
      );

      const createStatusForWorkspaceAdmin = Effect.fn(
        "FeedbackService.createStatusForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          input,
        }: {
          workspaceSlug: string;
          userId: string;
          input: Parameters<typeof repository.createStatus>[0]["input"];
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });

            return yield* repository.createStatus({
              workspaceId: membership.workspaceId,
              input,
            });
          }),
      );

      const updateStatusForWorkspaceAdmin = Effect.fn(
        "FeedbackService.updateStatusForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          statusId,
          input,
        }: {
          workspaceSlug: string;
          userId: string;
          statusId: string;
          input: Parameters<typeof repository.updateStatus>[0]["input"];
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });
            const updated = yield* repository.updateStatus({
              workspaceId: membership.workspaceId,
              statusId,
              input,
            });

            if (!updated) {
              return yield* new FeedbackStatusNotFound({ statusId });
            }

            return updated;
          }),
      );

      const deleteStatusForWorkspaceAdmin = Effect.fn(
        "FeedbackService.deleteStatusForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          statusId,
        }: {
          workspaceSlug: string;
          userId: string;
          statusId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });
            const deleted = yield* repository.deleteStatus({
              workspaceId: membership.workspaceId,
              statusId,
            });

            if (!deleted) {
              return yield* new FeedbackStatusNotFound({ statusId });
            }

            return deleted;
          }),
      );

      const createTagForWorkspaceAdmin = Effect.fn(
        "FeedbackService.createTagForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          input,
        }: {
          workspaceSlug: string;
          userId: string;
          input: Parameters<typeof repository.createTag>[0]["input"];
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });

            return yield* repository.createTag({
              workspaceId: membership.workspaceId,
              input,
            });
          }),
      );

      const updateTagForWorkspaceAdmin = Effect.fn(
        "FeedbackService.updateTagForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          tagId,
          input,
        }: {
          workspaceSlug: string;
          userId: string;
          tagId: string;
          input: Parameters<typeof repository.updateTag>[0]["input"];
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });
            const updated = yield* repository.updateTag({
              workspaceId: membership.workspaceId,
              tagId,
              input,
            });

            if (!updated) {
              return yield* new FeedbackTagNotFound({ tagId });
            }

            return updated;
          }),
      );

      const deleteTagForWorkspaceAdmin = Effect.fn(
        "FeedbackService.deleteTagForWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
          tagId,
        }: {
          workspaceSlug: string;
          userId: string;
          tagId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdminBySlug({
              workspaceSlug,
              userId,
            });
            const deleted = yield* repository.deleteTag({
              workspaceId: membership.workspaceId,
              tagId,
            });

            if (!deleted) {
              return yield* new FeedbackTagNotFound({ tagId });
            }

            return deleted;
          }),
      );

      return {
        assertWorkspaceAccess,
        requireWorkspaceMemberBySlug,
        requireWorkspaceAdminBySlug,
        getSnapshot,
        getPublicSnapshot,
        createPost,
        uploadMedia,
        listComments,
        listPublicComments,
        createComment,
        voteForPost,
        unvoteForPost,
        claimAnonymousVotes,
        seedWorkspaceDefaults,
        getSettingsSnapshotForWorkspaceMember,
        updatePublicSettingsForWorkspaceAdmin,
        createBoardForWorkspaceAdmin,
        updateBoardForWorkspaceAdmin,
        deleteBoardForWorkspaceAdmin,
        createStatusForWorkspaceAdmin,
        updateStatusForWorkspaceAdmin,
        deleteStatusForWorkspaceAdmin,
        createTagForWorkspaceAdmin,
        updateTagForWorkspaceAdmin,
        deleteTagForWorkspaceAdmin,
      };
    }),
    dependencies: [FeedbackRepository.Default],
  },
) {}
