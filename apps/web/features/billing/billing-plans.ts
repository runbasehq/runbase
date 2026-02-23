export type BillingCycle = "monthly" | "yearly";

export type BillingPlanKey =
  | "open_source"
  | "growth"
  | "professional"
  | "enterprise";

export type HostedBillingPlanKey = Exclude<BillingPlanKey, "open_source">;

type MarketingFeature = {
  icon:
    | "notification"
    | "file"
    | "mail"
    | "user"
    | "settings"
    | "credit_card"
    | "shield"
    | "help";
  label: string;
};

export type BillingPlanCatalogItem = {
  key: BillingPlanKey;
  name: string;
  accent?: "growth" | "enterprise";
  description: string;
  marketingFeatures: readonly MarketingFeature[];
  footnote: string;
  ctaLabel: string;
  ctaHref: string;
  ctaTarget?: "_blank";
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  priceLabel: string | null;
  seatLimit: number | null;
  checkoutEnabled: boolean;
  includedSeatsLabel: string;
  extraSeatPriceLabel: string | null;
};

export const BILLING_DISCOUNT = 0.2;

export const BILLING_PLAN_CATALOG: readonly BillingPlanCatalogItem[] = [
  {
    key: "open_source",
    name: "Open Source",
    description: "Self-hosted deployment in your own infrastructure.",
    marketingFeatures: [
      { icon: "notification", label: "Feedback board" },
      { icon: "file", label: "Changelog publishing" },
      { icon: "mail", label: "Unlimited conversations" },
      { icon: "user", label: "Unlimited seats" },
      { icon: "settings", label: "Self-hosted deployment" },
    ],
    footnote: "No hosted free tier. Deploy it in your own infrastructure.",
    ctaLabel: "Self deploy",
    ctaHref: "https://github.com/jeresrc/runbase",
    ctaTarget: "_blank",
    monthlyPrice: null,
    yearlyPrice: null,
    priceLabel: "Free",
    seatLimit: null,
    checkoutEnabled: false,
    includedSeatsLabel: "Unlimited seats",
    extraSeatPriceLabel: null,
  },
  {
    key: "growth",
    name: "Growth",
    accent: "growth",
    description: "For teams shipping fast with clear ownership.",
    marketingFeatures: [
      { icon: "notification", label: "Feedback board" },
      { icon: "file", label: "Changelog publishing" },
      { icon: "mail", label: "Unlimited conversations" },
      { icon: "user", label: "2 seats included" },
      { icon: "credit_card", label: "$4 per extra seat / month" },
    ],
    footnote: "Pay monthly. Cancel anytime.",
    ctaLabel: "Start growth trial",
    ctaHref: "/sign-up",
    monthlyPrice: 9,
    yearlyPrice: Math.round(9 * (1 - BILLING_DISCOUNT)),
    priceLabel: null,
    seatLimit: 2,
    checkoutEnabled: true,
    includedSeatsLabel: "2 seats included",
    extraSeatPriceLabel: "$4 per extra seat / month",
  },
  {
    key: "professional",
    name: "Professional",
    description: "For larger teams with higher collaboration volume.",
    marketingFeatures: [
      { icon: "notification", label: "Feedback board" },
      { icon: "file", label: "Changelog publishing" },
      { icon: "mail", label: "Unlimited conversations" },
      { icon: "user", label: "10 seats included" },
      { icon: "credit_card", label: "$4 per extra seat / month" },
    ],
    footnote: "Pay monthly. Cancel anytime.",
    ctaLabel: "Start professional trial",
    ctaHref: "/sign-up",
    monthlyPrice: 19,
    yearlyPrice: Math.round(19 * (1 - BILLING_DISCOUNT)),
    priceLabel: null,
    seatLimit: 10,
    checkoutEnabled: true,
    includedSeatsLabel: "10 seats included",
    extraSeatPriceLabel: "$4 per extra seat / month",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    accent: "enterprise",
    description: "Security, SSO/SAML, migration support, and procurement.",
    marketingFeatures: [
      { icon: "shield", label: "SSO/SAML and role controls" },
      { icon: "help", label: "Dedicated rollout support" },
      { icon: "settings", label: "Migration assistance" },
      { icon: "credit_card", label: "Custom invoicing terms" },
      { icon: "user", label: "Custom seat allocation" },
    ],
    footnote: "Email us for custom contract terms.",
    ctaLabel: "Contact sales",
    ctaHref: "mailto:franciscover99@gmail.com",
    monthlyPrice: null,
    yearlyPrice: null,
    priceLabel: "Custom",
    seatLimit: null,
    checkoutEnabled: false,
    includedSeatsLabel: "Custom seat allocation",
    extraSeatPriceLabel: null,
  },
] as const;

export const DEFAULT_HOSTED_PLAN_KEY: HostedBillingPlanKey = "growth";

export function getBillingPlanByKey(
  planKey: BillingPlanKey,
): BillingPlanCatalogItem | null {
  return BILLING_PLAN_CATALOG.find((plan) => plan.key === planKey) ?? null;
}

export function getHostedBillingPlanByKey(
  planKey: HostedBillingPlanKey,
): BillingPlanCatalogItem {
  const plan = BILLING_PLAN_CATALOG.find((item) => item.key === planKey);

  if (!plan) {
    throw new Error(`missing_billing_plan:${planKey}`);
  }

  return plan;
}

export function isHostedPlanKey(value: string): value is HostedBillingPlanKey {
  return (
    value === "growth" || value === "professional" || value === "enterprise"
  );
}

export function getPriceForCycle(
  plan: BillingPlanCatalogItem,
  billingCycle: BillingCycle,
): number | null {
  if (billingCycle === "monthly") {
    return plan.monthlyPrice;
  }

  return plan.yearlyPrice;
}

export function getPricingSummaryCopy() {
  const growth = getHostedBillingPlanByKey("growth");
  const professional = getHostedBillingPlanByKey("professional");
  const extraSeat =
    growth.extraSeatPriceLabel || professional.extraSeatPriceLabel;

  return `Growth includes ${growth.seatLimit ?? 0} seats. Professional includes ${professional.seatLimit ?? 0} seats. Extra seats are ${extraSeat ?? "custom"}.`;
}
