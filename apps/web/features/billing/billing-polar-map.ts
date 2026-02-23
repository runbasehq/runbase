import "server-only";

import type {
  BillingCycle,
  HostedBillingPlanKey,
} from "~/billing/billing-plans";

function readEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    return null;
  }

  return value;
}

export function getPolarProductIdForPlan(
  planKey: HostedBillingPlanKey,
  billingCycle: BillingCycle,
): string | null {
  if (planKey === "growth") {
    return billingCycle === "monthly"
      ? readEnv("POLAR_PRODUCT_ID_GROWTH_MONTHLY")
      : readEnv("POLAR_PRODUCT_ID_GROWTH_YEARLY");
  }

  if (planKey === "professional") {
    return billingCycle === "monthly"
      ? readEnv("POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY")
      : readEnv("POLAR_PRODUCT_ID_PROFESSIONAL_YEARLY");
  }

  return readEnv("POLAR_PRODUCT_ID_ENTERPRISE");
}

export function getPlanKeyForPolarProductId(
  productId: string,
): HostedBillingPlanKey | null {
  const normalized = productId.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized === readEnv("POLAR_PRODUCT_ID_GROWTH_MONTHLY") ||
    normalized === readEnv("POLAR_PRODUCT_ID_GROWTH_YEARLY")
  ) {
    return "growth";
  }

  if (
    normalized === readEnv("POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY") ||
    normalized === readEnv("POLAR_PRODUCT_ID_PROFESSIONAL_YEARLY")
  ) {
    return "professional";
  }

  if (normalized === readEnv("POLAR_PRODUCT_ID_ENTERPRISE")) {
    return "enterprise";
  }

  return null;
}

export function getCycleForPolarProductId(
  productId: string,
): BillingCycle | null {
  const normalized = productId.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized === readEnv("POLAR_PRODUCT_ID_GROWTH_MONTHLY") ||
    normalized === readEnv("POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY")
  ) {
    return "monthly";
  }

  if (
    normalized === readEnv("POLAR_PRODUCT_ID_GROWTH_YEARLY") ||
    normalized === readEnv("POLAR_PRODUCT_ID_PROFESSIONAL_YEARLY")
  ) {
    return "yearly";
  }

  return null;
}
