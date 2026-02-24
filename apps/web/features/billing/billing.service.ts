import "server-only";

import { Effect } from "effect";

import {
  DEFAULT_HOSTED_PLAN_KEY,
  getHostedBillingPlanByKey,
  type BillingCycle,
  type HostedBillingPlanKey,
} from "~/billing/billing-plans";
import {
  getCycleForPolarProductId,
  getPlanKeyForPolarProductId,
  getPolarProductIdForPlan,
} from "~/billing/billing-polar-map";

import {
  BillingForbidden,
  BillingInvalidInput,
  BillingPlanNotSupported,
  BillingProviderNotConfigured,
  BillingWorkspaceNotFound,
} from "./billing.errors";
import { BillingRepository } from "./billing.repository";

type PolarTrialInterval = "day" | "week" | "month" | "year";

function getAppUrl() {
  const appUrl = process.env.APP_URL?.trim();

  if (!appUrl) {
    return null;
  }

  return appUrl;
}

function decodePolarTrialInterval(
  value: string | undefined,
): PolarTrialInterval {
  const normalized = (value ?? "").trim().toLowerCase();

  if (
    normalized === "day" ||
    normalized === "week" ||
    normalized === "month" ||
    normalized === "year"
  ) {
    return normalized;
  }

  return "month";
}

function decodePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function decodeBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

function getCheckoutTrialConfig() {
  const trialEnabled = decodeBoolean(process.env.POLAR_TRIAL_ENABLED, true);

  if (!trialEnabled) {
    return {
      allowTrial: null,
      trialInterval: null,
      trialIntervalCount: null,
      discountId: process.env.POLAR_TRIAL_DISCOUNT_ID?.trim() || null,
    } as const;
  }

  const trialInterval = decodePolarTrialInterval(
    process.env.POLAR_TRIAL_INTERVAL,
  );
  const trialIntervalCount = decodePositiveInt(
    process.env.POLAR_TRIAL_INTERVAL_COUNT,
    1,
  );

  return {
    allowTrial: true,
    trialInterval,
    trialIntervalCount,
    discountId: process.env.POLAR_TRIAL_DISCOUNT_ID?.trim() || null,
  } as const;
}

function normalizeSubscriptionStatus(value: string) {
  const status = value.trim().toLowerCase();

  if (
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "paused" ||
    status === "unpaid"
  ) {
    return status;
  }

  return "active";
}

export class BillingService extends Effect.Service<BillingService>()(
  "BillingService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repository = yield* BillingRepository;

      const requireWorkspaceMembership = Effect.fn(
        "BillingService.requireWorkspaceMembership",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* repository.getWorkspaceMembershipBySlug({
              workspaceSlug,
              userId,
            });

            if (!membership) {
              return yield* new BillingWorkspaceNotFound({ workspaceSlug });
            }

            return membership;
          }),
      );

      const requireWorkspaceAdmin = Effect.fn(
        "BillingService.requireWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceMembership({
              workspaceSlug,
              userId,
            });

            if (membership.role !== "admin") {
              return yield* new BillingForbidden({
                message: "Only workspace admins can manage billing",
              });
            }

            return membership;
          }),
      );

      const getWorkspaceSubscription = Effect.fn(
        "BillingService.getWorkspaceSubscription",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceMembership({
              workspaceSlug,
              userId,
            });
            const seatsUsed = yield* repository.countWorkspaceSeatsUsed({
              workspaceId: membership.workspaceId,
            });
            const subscription =
              yield* repository.getWorkspaceSubscriptionByWorkspaceId({
                workspaceId: membership.workspaceId,
              });

            if (!subscription) {
              return {
                subscription: null,
                seatsUsed,
                seatsRemaining: null,
              };
            }

            const seatsRemaining =
              typeof subscription.seatLimit === "number"
                ? Math.max(subscription.seatLimit - seatsUsed, 0)
                : null;

            return {
              subscription: {
                planKey: subscription.planKey,
                status: subscription.status,
                billingCycle: subscription.billingInterval,
                seatLimit: subscription.seatLimit,
                periodEnd: subscription.currentPeriodEnd
                  ? subscription.currentPeriodEnd.toISOString()
                  : null,
              },
              seatsUsed,
              seatsRemaining,
            };
          }),
      );

      const createCheckoutSession = Effect.fn(
        "BillingService.createCheckoutSession",
      )(
        ({
          workspaceSlug,
          userId,
          userEmail,
          userName,
          planKey,
          billingCycle,
        }: {
          workspaceSlug: string;
          userId: string;
          userEmail: string | null;
          userName: string | null;
          planKey: HostedBillingPlanKey;
          billingCycle: BillingCycle;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdmin({
              workspaceSlug,
              userId,
            });

            if (planKey === "enterprise") {
              return yield* new BillingPlanNotSupported({ planKey });
            }

            const productId = getPolarProductIdForPlan(planKey, billingCycle);

            if (!productId) {
              return yield* new BillingProviderNotConfigured({
                provider: "polar",
                missing:
                  planKey === "growth"
                    ? billingCycle === "monthly"
                      ? "POLAR_PRODUCT_ID_GROWTH_MONTHLY"
                      : "POLAR_PRODUCT_ID_GROWTH_YEARLY"
                    : billingCycle === "monthly"
                      ? "POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY"
                      : "POLAR_PRODUCT_ID_PROFESSIONAL_YEARLY",
              });
            }

            const appUrl = getAppUrl();

            if (!appUrl) {
              return yield* new BillingInvalidInput({
                message: "APP_URL is not configured",
              });
            }

            const successUrl = `${appUrl}/admin/${membership.workspaceSlug}/settings/billing?checkout=success`;
            const returnUrl = `${appUrl}/admin/${membership.workspaceSlug}/settings/billing`;
            const checkoutUrl = yield* repository.createPolarCheckoutSession({
              productId,
              customerEmail: userEmail,
              customerName: userName,
              externalCustomerId: membership.workspaceId,
              successUrl,
              returnUrl,
              metadata: {
                workspaceSlug: membership.workspaceSlug,
                workspaceId: membership.workspaceId,
                planKey,
                billingCycle,
              },
              ...getCheckoutTrialConfig(),
            });

            return checkoutUrl;
          }),
      );

      const createPortalSession = Effect.fn(
        "BillingService.createPortalSession",
      )(
        ({
          workspaceSlug,
          userId,
          returnPath,
        }: {
          workspaceSlug: string;
          userId: string;
          returnPath: string | null;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdmin({
              workspaceSlug,
              userId,
            });
            const appUrl = getAppUrl();

            if (!appUrl) {
              return yield* new BillingInvalidInput({
                message: "APP_URL is not configured",
              });
            }

            const returnUrl = returnPath
              ? `${appUrl}${returnPath}`
              : `${appUrl}/admin/${membership.workspaceSlug}/settings/billing`;

            const portalUrl =
              yield* repository.createPolarCustomerPortalSession({
                externalCustomerId: membership.workspaceId,
                returnUrl,
              });

            return { portalUrl };
          }),
      );

      const resolveSeatAllowance = Effect.fn(
        "BillingService.resolveSeatAllowance",
      )(({ workspaceId }: { workspaceId: string }) =>
        Effect.gen(function* () {
          const subscription =
            yield* repository.getWorkspaceSubscriptionByWorkspaceId({
              workspaceId,
            });

          if (!subscription) {
            return {
              planKey: null,
              seatLimit: null,
            };
          }

          return {
            planKey: subscription.planKey,
            seatLimit: subscription.seatLimit,
          };
        }),
      );

      const assertSeatCapacity = Effect.fn("BillingService.assertSeatCapacity")(
        ({
          workspaceId,
          additionalSeats,
        }: {
          workspaceId: string;
          additionalSeats: number;
        }) =>
          Effect.gen(function* () {
            const allowance = yield* resolveSeatAllowance({ workspaceId });

            if (typeof allowance.seatLimit !== "number") {
              return {
                allowed: true,
                seatLimit: null,
                seatsUsed: null,
                seatsRequested: additionalSeats,
              };
            }

            const seatsUsed = yield* repository.countWorkspaceSeatsUsed({
              workspaceId,
            });
            const requestedTotal = seatsUsed + Math.max(additionalSeats, 0);

            if (requestedTotal > allowance.seatLimit) {
              return {
                allowed: false,
                seatLimit: allowance.seatLimit,
                seatsUsed,
                seatsRequested: additionalSeats,
              };
            }

            return {
              allowed: true,
              seatLimit: allowance.seatLimit,
              seatsUsed,
              seatsRequested: additionalSeats,
            };
          }),
      );

      const processPolarWebhook = Effect.fn(
        "BillingService.processPolarWebhook",
      )(
        ({
          rawBody,
          headers,
        }: {
          rawBody: string;
          headers: Record<string, string>;
        }) =>
          Effect.gen(function* () {
            const event = yield* repository.verifyAndParsePolarWebhook({
              body: rawBody,
              headers,
            });

            const inserted = yield* repository.insertWebhookEventIfAbsent({
              providerEventId: event.id,
              eventType: event.type,
              payload: rawBody,
            });

            if (!inserted) {
              return {
                processed: true,
                duplicate: true,
                eventId: event.id,
                eventType: event.type,
              };
            }

            const isSubscriptionEvent =
              event.type.startsWith("subscription.") ||
              event.type === "customer.state_changed";

            if (!isSubscriptionEvent) {
              yield* repository.markWebhookEventIgnored({
                providerEventId: event.id,
                reason: `Unsupported event type: ${event.type}`,
              });

              return {
                processed: true,
                duplicate: false,
                ignored: true,
                eventId: event.id,
                eventType: event.type,
              };
            }

            const processing = yield* Effect.either(
              Effect.gen(function* () {
                const parsed = yield* repository.parseSubscriptionEvent({
                  payload: event.payload,
                });

                if (!parsed) {
                  yield* repository.markWebhookEventIgnored({
                    providerEventId: event.id,
                    reason: "Unable to parse subscription payload",
                  });

                  return {
                    processed: true,
                    duplicate: false,
                    ignored: true,
                    eventId: event.id,
                    eventType: event.type,
                  };
                }

                const resolvedWorkspaceId = parsed.externalCustomerId
                  ? yield* repository.getWorkspaceByExternalCustomerId({
                      externalCustomerId: parsed.externalCustomerId,
                    })
                  : parsed.providerCustomerId
                    ? yield* repository.getWorkspaceByProviderCustomerId({
                        providerCustomerId: parsed.providerCustomerId,
                      })
                    : null;

                if (!resolvedWorkspaceId) {
                  yield* repository.markWebhookEventIgnored({
                    providerEventId: event.id,
                    reason:
                      "Workspace not found for incoming subscription event",
                  });

                  return {
                    processed: true,
                    duplicate: false,
                    ignored: true,
                    eventId: event.id,
                    eventType: event.type,
                  };
                }

                const planKey = parsed.providerProductId
                  ? getPlanKeyForPolarProductId(parsed.providerProductId)
                  : null;
                const billingCycle = parsed.providerProductId
                  ? getCycleForPolarProductId(parsed.providerProductId)
                  : null;

                const resolvedPlanKey = planKey || DEFAULT_HOSTED_PLAN_KEY;
                const resolvedCycle = billingCycle || "monthly";
                const plan = getHostedBillingPlanByKey(resolvedPlanKey);

                if (parsed.providerCustomerId) {
                  yield* repository.upsertWorkspaceBillingCustomer({
                    workspaceId: resolvedWorkspaceId,
                    providerCustomerId: parsed.providerCustomerId,
                    email: null,
                  });
                }

                yield* repository.upsertWorkspaceSubscription({
                  workspaceId: resolvedWorkspaceId,
                  providerSubscriptionId: parsed.providerSubscriptionId,
                  planKey: resolvedPlanKey,
                  status: normalizeSubscriptionStatus(parsed.status),
                  billingInterval: resolvedCycle,
                  seatLimit: plan.seatLimit,
                  cancelAtPeriodEnd: parsed.cancelAtPeriodEnd,
                  currentPeriodStart: parsed.periodStart,
                  currentPeriodEnd: parsed.periodEnd,
                  canceledAt: parsed.canceledAt,
                  providerProductId: parsed.providerProductId,
                  providerPriceId: parsed.providerPriceId,
                  rawPayload: parsed.rawPayload,
                });

                yield* repository.markWebhookEventProcessed({
                  providerEventId: event.id,
                });

                return {
                  processed: true,
                  duplicate: false,
                  eventId: event.id,
                  eventType: event.type,
                };
              }),
            );

            if (processing._tag === "Left") {
              yield* repository.markWebhookEventFailed({
                providerEventId: event.id,
                error:
                  processing.left instanceof Error
                    ? processing.left.message
                    : "Unhandled webhook processing error",
              });

              return yield* Effect.fail(processing.left);
            }

            return processing.right;
          }),
      );

      return {
        assertSeatCapacity,
        createCheckoutSession,
        createPortalSession,
        getWorkspaceSubscription,
        processPolarWebhook,
        resolveSeatAllowance,
      };
    }),
    dependencies: [BillingRepository.Default],
  },
) {}
