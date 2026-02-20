import "server-only";

import { Effect } from "effect";

import { FeedbackRepository } from "./feedback.repository";

export class FeedbackService extends Effect.Service<FeedbackService>()(
  "FeedbackService",
  {
    effect: Effect.gen(function* () {
      const repository = yield* FeedbackRepository;

      return {
        getSnapshot: repository.getSnapshot,
        createPost: repository.createPost,
        voteForPost: (
          input: Parameters<typeof repository.voteForPost>[0] & { ip: string },
        ) =>
          Effect.gen(function* () {
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
          }),
        unvoteForPost: repository.unvoteForPost,
      };
    }),
    dependencies: [FeedbackRepository.Default],
  },
) {}
