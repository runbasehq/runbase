"use client";

import {
  CreditCardIcon,
  File01Icon,
  HelpCircleIcon,
  MailIcon,
  NotificationIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { FancyButton } from "@/components/ui/fancy-button";
import { cn } from "@/lib/utils";
import {
  BILLING_DISCOUNT,
  BILLING_PLAN_CATALOG,
  getPriceForCycle,
  getPricingSummaryCopy,
  type BillingCycle,
} from "~/billing/billing-plans";

type PricingSectionProps = {
  className?: string;
};

type PlanFeature = {
  icon: typeof NotificationIcon;
  label: string;
};

type PricingPlan = {
  accent?: "enterprise" | "growth";
  ctaHref: string;
  ctaLabel: string;
  ctaTarget?: "_blank";
  description: string;
  features: readonly PlanFeature[];
  footnote: string;
  monthlyPrice?: number;
  name: string;
  priceLabel?: string;
};

const iconByKey = {
  notification: NotificationIcon,
  file: File01Icon,
  mail: MailIcon,
  user: UserIcon,
  settings: SettingsIcon,
  credit_card: CreditCardIcon,
  shield: ShieldIcon,
  help: HelpCircleIcon,
} as const;

const pricingPlans: readonly PricingPlan[] = BILLING_PLAN_CATALOG.map(
  (plan) => ({
    name: plan.name,
    accent: plan.accent,
    monthlyPrice: plan.monthlyPrice ?? undefined,
    description: plan.description,
    ctaLabel: plan.ctaLabel,
    ctaHref: plan.ctaHref,
    ctaTarget: plan.ctaTarget,
    features: plan.marketingFeatures.map((feature) => ({
      icon: iconByKey[feature.icon],
      label: feature.label,
    })),
    footnote: plan.footnote,
    priceLabel: plan.priceLabel ?? undefined,
  }),
);

function getPrice(monthlyPrice: number, billingCycle: BillingCycle) {
  const matchingPlan = BILLING_PLAN_CATALOG.find(
    (plan) => plan.monthlyPrice === monthlyPrice,
  );

  if (!matchingPlan) {
    return monthlyPrice;
  }

  const value = getPriceForCycle(matchingPlan, billingCycle);
  return typeof value === "number" ? value : monthlyPrice;
}

function getCellBorderClasses(index: number, total: number) {
  return cn(
    "border-black/10",
    index < total - 1 && "border-b",
    index < 2 ? "md:border-b" : "md:border-b-0",
    index % 2 === 0 ? "md:border-r" : "md:border-r-0",
    index < total - 1 ? "xl:border-r" : "xl:border-r-0",
    "xl:border-b-0",
  );
}

function PricingCell({
  billingCycle,
  index,
  plan,
  total,
}: {
  billingCycle: BillingCycle;
  index: number;
  plan: PricingPlan;
  total: number;
}) {
  const isPaid = typeof plan.monthlyPrice === "number";

  const price = useMemo(() => {
    if (typeof plan.monthlyPrice !== "number") {
      return null;
    }

    return getPrice(plan.monthlyPrice, billingCycle);
  }, [billingCycle, plan.monthlyPrice]);

  return (
    <article
      className={cn(
        "flex h-full flex-col p-6 md:p-7",
        getCellBorderClasses(index, total),
        plan.accent === "growth" &&
          "bg-[linear-gradient(175deg,rgba(245,255,233,0.9)_0%,rgba(255,255,255,0.95)_100%)]",
        plan.accent === "enterprise" &&
          "bg-[linear-gradient(170deg,rgba(255,238,248,0.82)_0%,rgba(255,255,255,0.95)_100%)]",
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[24px] leading-none tracking-[-0.03em] text-black/92 [font-family:var(--font-hero-title),var(--font-sans),sans-serif] md:text-[24px]">
            {plan.name}
          </h3>
          {plan.accent === "growth" ? (
            <span className="inline-flex items-center rounded-full border border-[#9fd86f]/65 bg-[#d9f3b8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/72">
              Popular
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em] text-black/92 md:text-[24px]">
          {price !== null ? `$${price}` : plan.priceLabel}
          {price !== null ? (
            <span className="ml-1 text-[14px] font-medium tracking-[-0.01em] text-black/62 md:text-[16px]">
              / month
            </span>
          ) : null}
        </p>

        {isPaid ? (
          <div className="mt-3 inline-flex h-8 items-center rounded-full border border-black/10 bg-white/92 px-3 text-[12px] font-semibold tracking-[0.01em] text-black/58">
            Billed {billingCycle}
            {billingCycle === "yearly" ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                Save {Math.round(BILLING_DISCOUNT * 100)}%
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-[14px] font-medium text-black/52">
            {plan.name === "Open Source" ? "Self-hosted only" : "Custom terms"}
          </p>
        )}

        <p className="mt-4 text-[16px] font-medium leading-[1.48] tracking-[-0.01em] text-black/66">
          {plan.description}
        </p>
      </div>

      <div className="mt-5">
        <FancyButton.Root
          asChild
          size="small"
          variant={
            plan.accent === "growth"
              ? "primary"
              : plan.accent === "enterprise"
                ? "basic"
                : plan.monthlyPrice
                  ? "neutral"
                  : "basic"
          }
          className={
            plan.accent === "enterprise"
              ? "border-[#ff7bcb]/70 bg-[#ff7bcb] text-black shadow-[0_2px_0_0_rgba(255,255,255,0.35)_inset,0_-2px_0_0_rgba(167,33,112,0.22)_inset,0_8px_16px_-14px_rgba(167,33,112,0.48)] hover:bg-[#ff6fc4]"
              : undefined
          }
        >
          <Link
            href={plan.ctaHref}
            target={plan.ctaTarget}
            rel={plan.ctaTarget ? "noreferrer noopener" : undefined}
          >
            {plan.ctaLabel}
          </Link>
        </FancyButton.Root>
      </div>

      <ul className="mt-5 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={`${plan.name}-${feature.label}`}
            className="flex items-start gap-2.5 text-[16px] font-medium leading-[1.35] text-black/74"
          >
            <HugeiconsIcon
              icon={feature.icon}
              strokeWidth={2}
              className="mt-0.5 size-4 shrink-0 text-black/58"
            />
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-5 text-[14px] font-medium text-black/52">
        {plan.footnote}
      </p>
    </article>
  );
}

export function PricingSection({ className }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  return (
    <section
      className={cn("px-6 pb-24 pt-8 md:px-8 md:pb-28 md:pt-10", className)}
    >
      <div className="mx-auto max-w-[1240px]">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mx-auto max-w-[980px] text-center text-balance [font-family:var(--font-hero-title),var(--font-sans),sans-serif] text-[34px] leading-[1.08] tracking-[-0.03em] text-black/95 md:text-[50px]"
        >
          Plans with included seats and clear overages
        </motion.h2>

        <p className="mx-auto mt-3 max-w-[980px] text-center text-[15px] font-medium leading-[1.48] tracking-[-0.01em] text-black/62 md:text-[17px]">
          {getPricingSummaryCopy()}
        </p>

        <div className="mt-7 flex justify-center md:mt-8">
          <div className="inline-flex rounded-full border border-black/10 bg-white/90 p-1.5">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "h-10 rounded-full px-5 text-[16px] font-semibold tracking-[-0.01em] transition-colors",
                billingCycle === "monthly"
                  ? "bg-black text-white"
                  : "text-black/54 hover:text-black/75",
              )}
            >
              Pay monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "inline-flex h-10 items-center rounded-full px-5 text-[16px] font-semibold tracking-[-0.01em] transition-colors",
                billingCycle === "yearly"
                  ? "bg-black text-white"
                  : "text-black/54 hover:text-black/75",
              )}
            >
              Pay yearly
              <span className="ml-2 inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[12px] font-semibold text-primary-foreground">
                Save {Math.round(BILLING_DISCOUNT * 100)}%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-7 overflow-hidden border-y border-black/12 bg-white/92">
          <div className="grid md:grid-cols-2 xl:grid-cols-4">
            {pricingPlans.map((plan, index) => (
              <PricingCell
                key={plan.name}
                plan={plan}
                index={index}
                total={pricingPlans.length}
                billingCycle={billingCycle}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
