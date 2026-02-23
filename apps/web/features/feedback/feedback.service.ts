import "server-only";

import { Effect } from "effect";

import {
  FeedbackForbidden,
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
      const getSnapshot = Effect.fn("FeedbackService.getSnapshot")(function* (
        input: Parameters<typeof repository.getSnapshot>[0],
      ) {
        yield* assertWorkspaceAccess({
          workspaceId: input.workspaceId,
          userId: input.userId,
          action: "read",
        });

        return yield* repository.getSnapshot(input);
      });
      const createPost = Effect.fn("FeedbackService.createPost")(function* (
        input: Parameters<typeof repository.createPost>[0],
      ) {
        yield* assertWorkspaceAccess({
          workspaceId: input.workspaceId,
          userId: input.authorUserId,
          action: "post",
        });

        return yield* repository.createPost(input);
      });
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
      const seedWorkspaceDefaults = Effect.fn(
        "FeedbackService.seedWorkspaceDefaults",
      )(function* (
        input: Parameters<typeof repository.seedWorkspaceDefaults>[0],
      ) {
        return yield* repository.seedWorkspaceDefaults(input);
      });

      return {
        assertWorkspaceAccess,
        getSnapshot,
        createPost,
        voteForPost,
        unvoteForPost,
        seedWorkspaceDefaults,
      };
    }),
    dependencies: [FeedbackRepository.Default],
  },
) {}
