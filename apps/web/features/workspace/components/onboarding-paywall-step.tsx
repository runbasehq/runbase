"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValueEvent, useSpring } from "motion/react";

import { FancyButton } from "@/components/ui/fancy-button";
import { cn, protocol, rootDomain } from "@/lib/utils";
import {
  BILLING_DISCOUNT,
  getHostedBillingPlanByKey,
  getPriceForCycle,
  type BillingCycle,
  type HostedBillingPlanKey,
} from "~/billing/billing-plans";

type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
  isPaymentFormRequired?: boolean | null;
  isPaymentRequired?: boolean | null;
  isPaymentSetupRequired?: boolean | null;
};

const selectablePlans: HostedBillingPlanKey[] = ["growth", "professional"];

function AnimatedPlanPrice({
  billingCycle,
  price,
}: {
  billingCycle: BillingCycle;
  price: number | null;
}) {
  if (typeof price !== "number") {
    return <span>Custom</span>;
  }

  const periodLabel = billingCycle === "monthly" ? "/mo" : "/yr";
  const animatedValue = useSpring(price, {
    stiffness: 240,
    damping: 28,
    mass: 0.7,
  });
  const [displayPrice, setDisplayPrice] = useState(price);

  useEffect(() => {
    animatedValue.set(price);
  }, [animatedValue, price]);

  useMotionValueEvent(animatedValue, "change", (latest) => {
    setDisplayPrice(Math.round(latest));
  });

  return (
    <span className="inline-flex items-baseline tabular-nums leading-none">
      <motion.span
        key={`price-${price}`}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="inline-block min-w-[3.2ch] text-right leading-none"
      >
        ${displayPrice}
      </motion.span>
      <span className="ml-1 leading-none">{periodLabel}</span>
    </span>
  );
}

export function OnboardingPaywallStep({
  workspaceSlug,
}: {
  workspaceSlug: string;
}) {
  const [planKey, setPlanKey] = useState<HostedBillingPlanKey>("growth");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yearlySavingsLabel = `Save ${Math.round(BILLING_DISCOUNT * 100)}%`;

  const dashboardUrl = useMemo(
    () => `${protocol}://${workspaceSlug}.${rootDomain}/dashboard`,
    [workspaceSlug],
  );

  async function handleStartTrial() {
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceSlug)}/billing/checkout`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            planKey,
            billingCycle,
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as CheckoutResponse;

      if (!response.ok || !payload.checkoutUrl) {
        setError(payload.error || "Unable to start trial checkout");
        setIsPending(false);
        return;
      }

      if (payload.isPaymentSetupRequired || payload.isPaymentFormRequired) {
        setError(
          "Checkout is requiring card setup. Configure Polar trial checkout to no-card or skip for now.",
        );
        setIsPending(false);
        return;
      }

      window.location.assign(payload.checkoutUrl);
    } catch {
      setError("Unable to start trial checkout");
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-zinc-950">
          Start your free trial
        </h1>
        <p className="text-sm text-zinc-500">
          Pick a plan for this workspace. Continue to checkout to activate it,
          or skip and go to dashboard.
        </p>
      </div>

      <div className="mx-auto w-fit rounded-[12px] border border-zinc-300 bg-zinc-100 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "relative h-8 min-w-[140px] rounded-[8px] px-3 text-sm font-semibold transition-colors outline-none focus-visible:outline-none focus-visible:ring-0",
              billingCycle === "monthly"
                ? "text-zinc-900"
                : "text-zinc-700 hover:text-zinc-900",
            )}
          >
            {billingCycle === "monthly" ? (
              <motion.span
                layoutId="billing-cycle-indicator"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-[8px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
              />
            ) : null}
            <span className="relative z-10">Monthly</span>
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "relative h-8 min-w-[190px] rounded-[8px] px-3 text-sm font-semibold transition-colors outline-none focus-visible:outline-none focus-visible:ring-0",
              billingCycle === "yearly"
                ? "text-zinc-900"
                : "text-zinc-700 hover:text-zinc-900",
            )}
          >
            {billingCycle === "yearly" ? (
              <motion.span
                layoutId="billing-cycle-indicator"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-[8px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
              />
            ) : null}
            <span className="relative z-10">{`Yearly (${yearlySavingsLabel})`}</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {selectablePlans.map((candidatePlanKey) => {
          const plan = getHostedBillingPlanByKey(candidatePlanKey);
          const isSelected = planKey === candidatePlanKey;
          const price = getPriceForCycle(plan, billingCycle);

          return (
            <button
              key={candidatePlanKey}
              type="button"
              onClick={() => setPlanKey(candidatePlanKey)}
              className={cn(
                "w-full rounded-[14px] border p-4 text-left transition-colors",
                isSelected
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 bg-white hover:bg-zinc-50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-medium text-zinc-900">
                  {plan.name}
                </p>
                <p className="text-sm font-semibold text-zinc-900">
                  <AnimatedPlanPrice
                    billingCycle={billingCycle}
                    price={price}
                  />
                </p>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
            </button>
          );
        })}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <FancyButton.Root
        type="button"
        variant="neutral"
        size="medium"
        onClick={() => {
          void handleStartTrial();
        }}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Opening checkout..." : "Continue to checkout"}
      </FancyButton.Root>

      <p className="text-center text-xs text-zinc-500">
        You&apos;ll be redirected to Polar checkout.
      </p>

      <FancyButton.Root
        type="button"
        variant="basic"
        size="medium"
        className="w-full"
        onClick={() => {
          window.location.assign(dashboardUrl);
        }}
      >
        Continue to free trial
      </FancyButton.Root>
    </div>
  );
}
