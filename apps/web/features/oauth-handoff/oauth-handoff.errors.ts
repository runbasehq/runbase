import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import { NextResponse } from "next/server";

export class OAuthHandoffInvalidInput extends Data.TaggedError(
  "OAuthHandoffInvalidInput",
)<{ message: string }> {}

export class OAuthHandoffUnauthorized extends Data.TaggedError(
  "OAuthHandoffUnauthorized",
)<Record<string, never>> {}

export class OAuthHandoffForbidden extends Data.TaggedError(
  "OAuthHandoffForbidden",
)<{ message: string }> {}

export class OAuthHandoffCodeNotFound extends Data.TaggedError(
  "OAuthHandoffCodeNotFound",
)<Record<string, never>> {}

export class OAuthHandoffPersistenceError extends Data.TaggedError(
  "OAuthHandoffPersistenceError",
)<{ operation: string }> {}

export type OAuthHandoffRouteError =
  | ParseError
  | OAuthHandoffInvalidInput
  | OAuthHandoffUnauthorized
  | OAuthHandoffForbidden
  | OAuthHandoffCodeNotFound
  | OAuthHandoffPersistenceError;

export function handleOAuthHandoffError(
  error: OAuthHandoffRouteError,
): NextResponse {
  switch (error._tag) {
    case "ParseError":
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    case "OAuthHandoffInvalidInput":
      return NextResponse.json({ error: error.message }, { status: 400 });
    case "OAuthHandoffUnauthorized":
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    case "OAuthHandoffForbidden":
      return NextResponse.json({ error: error.message }, { status: 403 });
    case "OAuthHandoffCodeNotFound":
      return NextResponse.json(
        { error: "OAuth handoff code is invalid or expired" },
        { status: 404 },
      );
    case "OAuthHandoffPersistenceError":
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
  }
}
