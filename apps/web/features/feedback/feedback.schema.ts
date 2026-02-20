import { Effect, Schema } from "effect";

import { FeedbackInvalidInput } from "./feedback.errors";

const TITLE_MAX_LENGTH = 140;
const CONTENT_MAX_LENGTH = 5000;

export const CreateFeedbackPostBodySchema = Schema.Struct({
  title: Schema.String,
  content: Schema.String,
  boardId: Schema.optional(Schema.String),
});

export interface CreateFeedbackPostInput {
  title: string;
  content: string;
  boardId: string | null;
}

export const decodeCreateFeedbackPostInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(CreateFeedbackPostBodySchema)(
      raw,
    );

    const title = decoded.title.trim();
    const content = decoded.content.trim();
    const boardId =
      typeof decoded.boardId === "string" && decoded.boardId.trim().length
        ? decoded.boardId.trim()
        : null;

    if (!title) {
      return yield* Effect.fail(
        new FeedbackInvalidInput({ message: "Title is required" }),
      );
    }

    if (title.length > TITLE_MAX_LENGTH) {
      return yield* Effect.fail(
        new FeedbackInvalidInput({
          message: `Title must be ${TITLE_MAX_LENGTH} characters or less`,
        }),
      );
    }

    if (!content) {
      return yield* Effect.fail(
        new FeedbackInvalidInput({ message: "Description is required" }),
      );
    }

    if (content.length > CONTENT_MAX_LENGTH) {
      return yield* Effect.fail(
        new FeedbackInvalidInput({
          message: `Description must be ${CONTENT_MAX_LENGTH} characters or less`,
        }),
      );
    }

    return {
      title,
      content,
      boardId,
    } satisfies CreateFeedbackPostInput;
  });
