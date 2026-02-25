import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import { NextResponse } from "next/server";

export class WorkspaceThemeInvalidInput extends Data.TaggedError(
  "WorkspaceThemeInvalidInput",
)<{ message: string }> {}

export class WorkspaceThemeWorkspaceNotFound extends Data.TaggedError(
  "WorkspaceThemeWorkspaceNotFound",
)<{ workspaceSlug: string }> {}

export class WorkspaceThemeForbidden extends Data.TaggedError(
  "WorkspaceThemeForbidden",
)<{ message: string }> {}

export class WorkspaceThemePersistenceError extends Data.TaggedError(
  "WorkspaceThemePersistenceError",
)<{ operation: string }> {}

export class WorkspaceThemeMediaStorageNotConfigured extends Data.TaggedError(
  "WorkspaceThemeMediaStorageNotConfigured",
)<Record<string, never>> {}

export class WorkspaceThemeMediaUploadFailed extends Data.TaggedError(
  "WorkspaceThemeMediaUploadFailed",
)<{ operation: string }> {}

export class WorkspaceThemeMediaInvalidDimensions extends Data.TaggedError(
  "WorkspaceThemeMediaInvalidDimensions",
)<{ message: string }> {}

export type WorkspaceThemeRouteError =
  | ParseError
  | WorkspaceThemeInvalidInput
  | WorkspaceThemeWorkspaceNotFound
  | WorkspaceThemeForbidden
  | WorkspaceThemePersistenceError
  | WorkspaceThemeMediaStorageNotConfigured
  | WorkspaceThemeMediaUploadFailed
  | WorkspaceThemeMediaInvalidDimensions;

export function handleWorkspaceThemeError(
  error: WorkspaceThemeRouteError,
): NextResponse {
  switch (error._tag) {
    case "ParseError":
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    case "WorkspaceThemeInvalidInput":
      return NextResponse.json({ error: error.message }, { status: 400 });
    case "WorkspaceThemeWorkspaceNotFound":
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    case "WorkspaceThemeForbidden":
      return NextResponse.json({ error: error.message }, { status: 403 });
    case "WorkspaceThemePersistenceError":
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    case "WorkspaceThemeMediaStorageNotConfigured":
      return NextResponse.json(
        { error: "Theme media upload is not configured" },
        { status: 503 },
      );
    case "WorkspaceThemeMediaUploadFailed":
      return NextResponse.json(
        { error: "Theme media upload failed" },
        { status: 502 },
      );
    case "WorkspaceThemeMediaInvalidDimensions":
      return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
