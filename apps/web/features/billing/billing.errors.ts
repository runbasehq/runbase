import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import { NextResponse } from "next/server";

export class BillingInvalidInput extends Data.TaggedError(
  "BillingInvalidInput",
)<{ message: string }> {}

export class BillingWorkspaceNotFound extends Data.TaggedError(
  "BillingWorkspaceNotFound",
)<{ workspaceSlug: string }> {}

export class BillingForbidden extends Data.TaggedError("BillingForbidden")<{
  message: string;
}> {}

export class BillingPlanNotSupported extends Data.TaggedError(
  "BillingPlanNotSupported",
)<{ planKey: string }> {}

export class BillingProviderNotConfigured extends Data.TaggedError(
  "BillingProviderNotConfigured",
)<{ provider: "polar"; missing: string }> {}

export class BillingWebhookSignatureInvalid extends Data.TaggedError(
  "BillingWebhookSignatureInvalid",
)<Record<string, never>> {}

export class BillingProviderError extends Data.TaggedError(
  "BillingProviderError",
)<{
  operation: string;
  status: number;
  message: string;
}> {}

export class BillingPersistenceError extends Data.TaggedError(
  "BillingPersistenceError",
)<{ operation: string }> {}

export type BillingRouteError =
  | ParseError
  | BillingInvalidInput
  | BillingWorkspaceNotFound
  | BillingForbidden
  | BillingPlanNotSupported
  | BillingProviderNotConfigured
  | BillingWebhookSignatureInvalid
  | BillingProviderError
  | BillingPersistenceError;

export function handleBillingError(error: BillingRouteError): NextResponse {
  switch (error._tag) {
    case "ParseError":
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    case "BillingInvalidInput":
      return NextResponse.json({ error: error.message }, { status: 400 });
    case "BillingWorkspaceNotFound":
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    case "BillingForbidden":
      return NextResponse.json({ error: error.message }, { status: 403 });
    case "BillingPlanNotSupported":
      return NextResponse.json(
        { error: "Plan is not available for self-serve checkout" },
        { status: 400 },
      );
    case "BillingProviderNotConfigured":
      return NextResponse.json(
        { error: `Missing ${error.missing}` },
        { status: 500 },
      );
    case "BillingWebhookSignatureInvalid":
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    case "BillingProviderError":
      return NextResponse.json(
        { error: "Billing provider request failed" },
        { status: error.status >= 400 ? error.status : 502 },
      );
    case "BillingPersistenceError":
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
  }
}
