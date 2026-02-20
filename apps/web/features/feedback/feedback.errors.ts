import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import { NextResponse } from "next/server";

export class FeedbackInvalidInput extends Data.TaggedError(
  "FeedbackInvalidInput",
)<{
  message: string;
}> { }

export class FeedbackInvalidBoard extends Data.TaggedError(
  "FeedbackInvalidBoard",
)<{
  boardId: string;
}> { }

export class FeedbackNoBoardConfigured extends Data.TaggedError(
  "FeedbackNoBoardConfigured",
)<{}> { }

export class FeedbackNoStatusConfigured extends Data.TaggedError(
  "FeedbackNoStatusConfigured",
)<{}> { }

export class FeedbackSlugGenerationFailed extends Data.TaggedError(
  "FeedbackSlugGenerationFailed",
)<{}> { }

export class FeedbackPostNotFound extends Data.TaggedError(
  "FeedbackPostNotFound",
)<{
  postId: string;
}> { }

export class FeedbackRateLimited extends Data.TaggedError("FeedbackRateLimited")<{
  workspaceRemaining: number | null;
  postRemaining: number | null;
}> { }

export class FeedbackPersistenceError extends Data.TaggedError(
  "FeedbackPersistenceError",
)<{
  operation: string;
}> { }

export type FeedbackRouteError =
  | ParseError
  | FeedbackInvalidInput
  | FeedbackInvalidBoard
  | FeedbackNoBoardConfigured
  | FeedbackNoStatusConfigured
  | FeedbackSlugGenerationFailed
  | FeedbackPostNotFound
  | FeedbackRateLimited
  | FeedbackPersistenceError;

export function handleFeedbackError(error: FeedbackRouteError): NextResponse {
  switch (error._tag) {
    case "ParseError":
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    case "FeedbackInvalidInput":
      return NextResponse.json({ error: error.message }, { status: 400 });
    case "FeedbackInvalidBoard":
      return NextResponse.json(
        { error: `Board ${error.boardId} does not exist` },
        { status: 400 },
      );
    case "FeedbackNoBoardConfigured":
      return NextResponse.json(
        { error: "No board configured for workspace" },
        { status: 400 },
      );
    case "FeedbackNoStatusConfigured":
      return NextResponse.json(
        { error: "No status configured for workspace" },
        { status: 400 },
      );
    case "FeedbackSlugGenerationFailed":
      return NextResponse.json(
        { error: "Unable to generate a unique URL for this post" },
        { status: 409 },
      );
    case "FeedbackPostNotFound":
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    case "FeedbackRateLimited":
      return NextResponse.json(
        {
          error: "Too many votes",
          workspaceRemaining: error.workspaceRemaining,
          postRemaining: error.postRemaining,
        },
        { status: 429 },
      );
    case "FeedbackPersistenceError":
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
  }
}
