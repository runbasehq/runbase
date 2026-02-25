import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import { NextResponse } from "next/server";

export class FeedbackInvalidInput extends Data.TaggedError(
  "FeedbackInvalidInput",
)<{
  message: string;
}> {}

export class FeedbackInvalidBoard extends Data.TaggedError(
  "FeedbackInvalidBoard",
)<{
  boardId: string;
}> {}

export class FeedbackInvalidTag extends Data.TaggedError("FeedbackInvalidTag")<{
  tagId: string;
}> {}

export class FeedbackNoBoardConfigured extends Data.TaggedError(
  "FeedbackNoBoardConfigured",
)<Record<string, never>> {}

export class FeedbackNoStatusConfigured extends Data.TaggedError(
  "FeedbackNoStatusConfigured",
)<Record<string, never>> {}

export class FeedbackSlugGenerationFailed extends Data.TaggedError(
  "FeedbackSlugGenerationFailed",
)<Record<string, never>> {}

export class FeedbackPostNotFound extends Data.TaggedError(
  "FeedbackPostNotFound",
)<{
  postId: string;
}> {}

export class FeedbackRateLimited extends Data.TaggedError(
  "FeedbackRateLimited",
)<{
  workspaceRemaining: number | null;
  postRemaining: number | null;
}> {}

export class FeedbackWorkspaceNotFound extends Data.TaggedError(
  "FeedbackWorkspaceNotFound",
)<Record<string, never>> {}

export class FeedbackBoardNotFound extends Data.TaggedError(
  "FeedbackBoardNotFound",
)<{
  boardId: string;
}> {}

export class FeedbackStatusNotFound extends Data.TaggedError(
  "FeedbackStatusNotFound",
)<{
  statusId: string;
}> {}

export class FeedbackTagNotFound extends Data.TaggedError(
  "FeedbackTagNotFound",
)<{
  tagId: string;
}> {}

export class FeedbackConflict extends Data.TaggedError("FeedbackConflict")<{
  message: string;
}> {}

export class FeedbackForbidden extends Data.TaggedError("FeedbackForbidden")<{
  message: string;
}> {}

export class FeedbackPersistenceError extends Data.TaggedError(
  "FeedbackPersistenceError",
)<{
  operation: string;
}> {}

export class FeedbackMediaStorageNotConfigured extends Data.TaggedError(
  "FeedbackMediaStorageNotConfigured",
)<Record<string, never>> {}

export class FeedbackMediaUploadFailed extends Data.TaggedError(
  "FeedbackMediaUploadFailed",
)<{
  operation: string;
}> {}

export type FeedbackRouteError =
  | ParseError
  | FeedbackInvalidInput
  | FeedbackInvalidBoard
  | FeedbackInvalidTag
  | FeedbackNoBoardConfigured
  | FeedbackNoStatusConfigured
  | FeedbackSlugGenerationFailed
  | FeedbackPostNotFound
  | FeedbackRateLimited
  | FeedbackWorkspaceNotFound
  | FeedbackBoardNotFound
  | FeedbackStatusNotFound
  | FeedbackTagNotFound
  | FeedbackConflict
  | FeedbackForbidden
  | FeedbackPersistenceError
  | FeedbackMediaStorageNotConfigured
  | FeedbackMediaUploadFailed;

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
    case "FeedbackInvalidTag":
      return NextResponse.json(
        { error: `Tag ${error.tagId} does not exist` },
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
    case "FeedbackWorkspaceNotFound":
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    case "FeedbackBoardNotFound":
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    case "FeedbackStatusNotFound":
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    case "FeedbackTagNotFound":
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    case "FeedbackConflict":
      return NextResponse.json({ error: error.message }, { status: 409 });
    case "FeedbackForbidden":
      return NextResponse.json({ error: error.message }, { status: 403 });
    case "FeedbackPersistenceError":
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    case "FeedbackMediaStorageNotConfigured":
      return NextResponse.json(
        { error: "Media upload is not configured" },
        { status: 503 },
      );
    case "FeedbackMediaUploadFailed":
      return NextResponse.json(
        { error: "Media upload failed" },
        { status: 502 },
      );
  }
}
