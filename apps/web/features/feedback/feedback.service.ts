import "server-only";

import { Effect } from "effect";

import { FeedbackRepository } from "./feedback.repository";

export class FeedbackService extends Effect.Service<FeedbackService>()(
  "FeedbackService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repository = yield* FeedbackRepository;
      const getSnapshot = Effect.fn("FeedbackService.getSnapshot")(function* (
        input: Parameters<typeof repository.getSnapshot>[0],
      ) {
        return yield* repository.getSnapshot(input);
      });
      const createPost = Effect.fn("FeedbackService.createPost")(function* (
        input: Parameters<typeof repository.createPost>[0],
      ) {
        return yield* repository.createPost(input);
      });
      const voteForPost = Effect.fn("FeedbackService.voteForPost")(function* (
        input: Parameters<typeof repository.voteForPost>[0] & { ip: string },
      ) {
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
