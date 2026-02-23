import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import { NextResponse } from "next/server";

export class DomainInvalidInput extends Data.TaggedError("DomainInvalidInput")<{
  message: string;
}> {}

export class DomainWorkspaceNotFound extends Data.TaggedError(
  "DomainWorkspaceNotFound",
)<{
  workspaceSlug: string;
}> {}

export class DomainForbidden extends Data.TaggedError("DomainForbidden")<{
  workspaceSlug: string;
}> {}

export class DomainNotFound extends Data.TaggedError("DomainNotFound")<{
  domain: string;
}> {}

export class DomainAlreadyAssigned extends Data.TaggedError(
  "DomainAlreadyAssigned",
)<{
  domain: string;
}> {}

export class DomainProviderNotConfigured extends Data.TaggedError(
  "DomainProviderNotConfigured",
)<{}> {}

export class DomainProviderError extends Data.TaggedError(
  "DomainProviderError",
)<{
  operation: string;
  message: string;
  status: number;
  providerStatusText?: string;
  providerReasons?: string[];
  providerCode?: string;
  providerRequestId?: string;
  domain?: string;
}> {}

export class DomainPersistenceError extends Data.TaggedError(
  "DomainPersistenceError",
)<{
  operation: string;
}> {}

export type DomainRouteError =
  | ParseError
  | DomainInvalidInput
  | DomainWorkspaceNotFound
  | DomainForbidden
  | DomainNotFound
  | DomainAlreadyAssigned
  | DomainProviderNotConfigured
  | DomainProviderError
  | DomainPersistenceError;

export function handleDomainError(error: DomainRouteError): NextResponse {
  switch (error._tag) {
    case "ParseError":
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    case "DomainInvalidInput":
      return NextResponse.json({ error: error.message }, { status: 400 });
    case "DomainWorkspaceNotFound":
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    case "DomainForbidden":
      return NextResponse.json(
        { error: "Only workspace owners can manage custom domains" },
        { status: 403 },
      );
    case "DomainNotFound":
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    case "DomainAlreadyAssigned":
      return NextResponse.json(
        { error: `${error.domain} is already assigned to another workspace` },
        { status: 409 },
      );
    case "DomainProviderNotConfigured":
      return NextResponse.json(
        {
          error:
            "Custom domains are not configured. Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID.",
        },
        { status: 500 },
      );
    case "DomainProviderError":
      return NextResponse.json(
        {
          error: error.message,
          operation: error.operation,
          providerStatusText: error.providerStatusText,
          providerReasons: error.providerReasons,
          providerCode: error.providerCode,
          providerRequestId: error.providerRequestId,
          domain: error.domain,
        },
        { status: error.status },
      );
    case "DomainPersistenceError":
      return NextResponse.json(
        {
          error: "Internal server error",
          operation: error.operation,
        },
        { status: 500 },
      );
  }
}
