import { Effect, Schema } from "effect";

import {
  isHostedPlanKey,
  type BillingCycle,
  type HostedBillingPlanKey,
} from "~/billing/billing-plans";
import { validateWorkspaceSlug } from "~/workspace/schemas/workspace-slug";

import { BillingInvalidInput } from "./billing.errors";

const WorkspaceSlugParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
});

const BillingCheckoutBodySchema = Schema.Struct({
  planKey: Schema.String,
  billingCycle: Schema.String,
});

const BillingPortalBodySchema = Schema.Struct({
  returnPath: Schema.optional(Schema.String),
});

export interface BillingWorkspaceSlugParamsInput {
  workspaceSlug: string;
}

export interface BillingCheckoutInput {
  planKey: HostedBillingPlanKey;
  billingCycle: BillingCycle;
}

export interface BillingPortalInput {
  returnPath: string | null;
}

function decodeWorkspaceSlug(workspaceSlug: string): string | null {
  const normalized = workspaceSlug.trim().toLowerCase();
  const error = validateWorkspaceSlug(normalized);

  if (error) {
    return null;
  }

  return normalized;
}

function decodeBillingCycle(value: string): BillingCycle | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "monthly" || normalized === "yearly") {
    return normalized;
  }

  return null;
}

function normalizeReturnPath(returnPath: string | undefined): string | null {
  if (!returnPath) {
    return null;
  }

  const normalized = returnPath.trim();

  if (!normalized.startsWith("/")) {
    return null;
  }

  return normalized;
}

export const decodeBillingWorkspaceSlugParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(WorkspaceSlugParamsSchema)(raw);
    const workspaceSlug = decodeWorkspaceSlug(decoded.workspaceSlug);

    if (!workspaceSlug) {
      return yield* new BillingInvalidInput({
        message: "Workspace slug is invalid",
      });
    }

    return { workspaceSlug } satisfies BillingWorkspaceSlugParamsInput;
  });

export const decodeBillingCheckoutInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(BillingCheckoutBodySchema)(raw);
    const planKey = decoded.planKey.trim().toLowerCase();
    const billingCycle = decodeBillingCycle(decoded.billingCycle);

    if (!isHostedPlanKey(planKey)) {
      return yield* new BillingInvalidInput({
        message: "Plan key must be growth, professional or enterprise",
      });
    }

    if (!billingCycle) {
      return yield* new BillingInvalidInput({
        message: "Billing cycle must be monthly or yearly",
      });
    }

    return {
      planKey,
      billingCycle,
    } satisfies BillingCheckoutInput;
  });

export const decodeBillingPortalInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(BillingPortalBodySchema)(raw);
    const returnPath = normalizeReturnPath(decoded.returnPath);

    if (decoded.returnPath && !returnPath) {
      return yield* new BillingInvalidInput({
        message: "returnPath must start with /",
      });
    }

    return {
      returnPath,
    } satisfies BillingPortalInput;
  });
