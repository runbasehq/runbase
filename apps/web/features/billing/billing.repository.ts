import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import { db } from "@/lib/db";
import {
  billingWebhookEvent,
  workspace,
  workspaceBillingCustomer,
  workspaceInvitation,
  workspaceMember,
  workspaceSubscription,
} from "@/lib/db/schema";
import {
  BillingPersistenceError,
  BillingProviderError,
  BillingProviderNotConfigured,
  BillingWebhookSignatureInvalid,
} from "./billing.errors";

export interface BillingMembershipRecord {
  workspaceId: string;
  workspaceSlug: string;
  role: "admin" | "contributor";
}

export interface WorkspaceSubscriptionRecord {
  id: string;
  workspaceId: string;
  providerSubscriptionId: string;
  status: string;
  planKey: string;
  billingInterval: "monthly" | "yearly";
  seatLimit: number | null;
  currentPeriodEnd: Date | null;
}

export interface VerifiedPolarWebhookEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface ParsedSubscriptionEvent {
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  externalCustomerId: string | null;
  providerProductId: string | null;
  providerPriceId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  periodStart: Date | null;
  periodEnd: Date | null;
  canceledAt: Date | null;
  rawPayload: string;
}

const toPersistenceError = (operation: string) =>
  new BillingPersistenceError({ operation });

const fromPersistencePromise = <A>(
  operation: string,
  thunk: () => Promise<A>,
) =>
  Effect.tryPromise({
    try: thunk,
    catch: () => toPersistenceError(operation),
  });

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getPolarBaseUrl() {
  const explicit = process.env.POLAR_API_BASE_URL?.trim();

  if (explicit) {
    return explicit;
  }

  const environment = process.env.POLAR_ENVIRONMENT?.trim().toLowerCase();

  if (environment === "production") {
    return "https://api.polar.sh";
  }

  return "https://sandbox-api.polar.sh";
}

function getPolarAccessToken() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    return null;
  }

  return accessToken;
}

function getPolarWebhookSecret() {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return null;
  }

  return secret;
}

function getWebhookSecretCandidates(secret: string): Buffer[] {
  if (secret.startsWith("whsec_")) {
    return [Buffer.from(secret.slice("whsec_".length), "base64")];
  }

  if (secret.startsWith("polar_whs_")) {
    return [Buffer.from(secret)];
  }

  return [Buffer.from(secret, "base64"), Buffer.from(secret)];
}

function parseWebhookSignatures(rawHeader: string): string[] {
  return rawHeader
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [version, value] = part.split(",");

      if (version !== "v1") {
        return null;
      }

      return value || null;
    })
    .filter((value): value is string => Boolean(value));
}

function verifyStandardWebhookSignature({
  body,
  headers,
  secret,
}: {
  body: string;
  headers: Record<string, string>;
  secret: string;
}) {
  const webhookId = readString(headers["webhook-id"]);
  const webhookTimestamp = readString(headers["webhook-timestamp"]);
  const webhookSignature = readString(headers["webhook-signature"]);

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return false;
  }

  const toleranceSeconds = Number(
    process.env.POLAR_WEBHOOK_TOLERANCE_SECONDS?.trim() || "300",
  );
  const timestamp = Number(webhookTimestamp);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);

  if (age > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${webhookId}.${webhookTimestamp}.${body}`;
  const signatures = parseWebhookSignatures(webhookSignature);

  return getWebhookSecretCandidates(secret).some((secretCandidate) => {
    const expected = createHmac("sha256", secretCandidate)
      .update(signedPayload)
      .digest("base64");
    const expectedBuffer = Buffer.from(expected);

    return signatures.some((signature) => {
      const candidateBuffer = Buffer.from(signature);

      if (candidateBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(candidateBuffer, expectedBuffer);
    });
  });
}

async function callPolarApi<TResponse>(
  path: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const accessToken = getPolarAccessToken();

  if (!accessToken) {
    throw new BillingProviderNotConfigured({
      provider: "polar",
      missing: "POLAR_ACCESS_TOKEN",
    });
  }

  const response = await fetch(`${getPolarBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new BillingProviderError({
      operation: `polar:${path}`,
      status: response.status,
      message: message || "Polar request failed",
    });
  }

  return (await response.json()) as TResponse;
}

export class BillingRepository extends Effect.Service<BillingRepository>()(
  "BillingRepository",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const getWorkspaceMembershipBySlug = Effect.fn(
        "BillingRepository.getWorkspaceMembershipBySlug",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }): Effect.Effect<
          BillingMembershipRecord | null,
          BillingPersistenceError
        > =>
          fromPersistencePromise(
            "billing.getWorkspaceMembershipBySlug",
            async () => {
              const [membership] = await db
                .select({
                  workspaceId: workspace.id,
                  workspaceSlug: workspace.slug,
                  role: workspaceMember.role,
                })
                .from(workspaceMember)
                .innerJoin(
                  workspace,
                  eq(workspaceMember.workspaceId, workspace.id),
                )
                .where(
                  and(
                    eq(workspaceMember.userId, userId),
                    eq(workspace.slug, workspaceSlug),
                  ),
                )
                .limit(1);

              if (!membership) {
                return null;
              }

              return {
                workspaceId: membership.workspaceId,
                workspaceSlug: membership.workspaceSlug,
                role: membership.role === "admin" ? "admin" : "contributor",
              };
            },
          ),
      );

      const getWorkspaceSubscriptionByWorkspaceId = Effect.fn(
        "BillingRepository.getWorkspaceSubscriptionByWorkspaceId",
      )(
        ({
          workspaceId,
        }: {
          workspaceId: string;
        }): Effect.Effect<
          WorkspaceSubscriptionRecord | null,
          BillingPersistenceError
        > =>
          fromPersistencePromise(
            "billing.getWorkspaceSubscriptionByWorkspaceId",
            async () => {
              const [row] = await db
                .select()
                .from(workspaceSubscription)
                .where(eq(workspaceSubscription.workspaceId, workspaceId))
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                workspaceId: row.workspaceId,
                providerSubscriptionId: row.providerSubscriptionId,
                status: row.status,
                planKey: row.planKey,
                billingInterval:
                  row.billingInterval === "yearly" ? "yearly" : "monthly",
                seatLimit: row.seatLimit,
                currentPeriodEnd: row.currentPeriodEnd,
              };
            },
          ),
      );

      const getWorkspaceByExternalCustomerId = Effect.fn(
        "BillingRepository.getWorkspaceByExternalCustomerId",
      )(
        ({
          externalCustomerId,
        }: {
          externalCustomerId: string;
        }): Effect.Effect<string | null, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.getWorkspaceByExternalCustomerId",
            async () => {
              const [row] = await db
                .select({ id: workspace.id })
                .from(workspace)
                .where(eq(workspace.id, externalCustomerId))
                .limit(1);

              return row?.id ?? null;
            },
          ),
      );

      const getWorkspaceByProviderCustomerId = Effect.fn(
        "BillingRepository.getWorkspaceByProviderCustomerId",
      )(
        ({
          providerCustomerId,
        }: {
          providerCustomerId: string;
        }): Effect.Effect<string | null, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.getWorkspaceByProviderCustomerId",
            async () => {
              const [row] = await db
                .select({ workspaceId: workspaceBillingCustomer.workspaceId })
                .from(workspaceBillingCustomer)
                .where(
                  eq(
                    workspaceBillingCustomer.providerCustomerId,
                    providerCustomerId,
                  ),
                )
                .limit(1);

              return row?.workspaceId ?? null;
            },
          ),
      );

      const upsertWorkspaceBillingCustomer = Effect.fn(
        "BillingRepository.upsertWorkspaceBillingCustomer",
      )(
        ({
          workspaceId,
          providerCustomerId,
          email,
        }: {
          workspaceId: string;
          providerCustomerId: string;
          email: string | null;
        }): Effect.Effect<void, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.upsertWorkspaceBillingCustomer",
            async () => {
              await db
                .insert(workspaceBillingCustomer)
                .values({
                  id: crypto.randomUUID(),
                  workspaceId,
                  provider: "polar",
                  providerCustomerId,
                  email,
                })
                .onConflictDoUpdate({
                  target: workspaceBillingCustomer.workspaceId,
                  set: {
                    providerCustomerId,
                    email,
                    updatedAt: new Date(),
                  },
                });
            },
          ),
      );

      const upsertWorkspaceSubscription = Effect.fn(
        "BillingRepository.upsertWorkspaceSubscription",
      )(
        ({
          workspaceId,
          providerSubscriptionId,
          planKey,
          status,
          billingInterval,
          seatLimit,
          cancelAtPeriodEnd,
          currentPeriodStart,
          currentPeriodEnd,
          canceledAt,
          providerProductId,
          providerPriceId,
          rawPayload,
        }: {
          workspaceId: string;
          providerSubscriptionId: string;
          planKey: string;
          status: string;
          billingInterval: "monthly" | "yearly";
          seatLimit: number | null;
          cancelAtPeriodEnd: boolean;
          currentPeriodStart: Date | null;
          currentPeriodEnd: Date | null;
          canceledAt: Date | null;
          providerProductId: string | null;
          providerPriceId: string | null;
          rawPayload: string;
        }): Effect.Effect<void, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.upsertWorkspaceSubscription",
            async () => {
              await db
                .insert(workspaceSubscription)
                .values({
                  id: crypto.randomUUID(),
                  workspaceId,
                  customerId: null,
                  provider: "polar",
                  providerSubscriptionId,
                  planKey,
                  status,
                  billingInterval,
                  seatLimit,
                  cancelAtPeriodEnd,
                  currentPeriodStart,
                  currentPeriodEnd,
                  canceledAt,
                  providerPriceId,
                  providerProductId,
                  rawPayload,
                })
                .onConflictDoUpdate({
                  target: workspaceSubscription.providerSubscriptionId,
                  set: {
                    workspaceId,
                    planKey,
                    status,
                    billingInterval,
                    seatLimit,
                    cancelAtPeriodEnd,
                    currentPeriodStart,
                    currentPeriodEnd,
                    canceledAt,
                    providerPriceId,
                    providerProductId,
                    rawPayload,
                    updatedAt: new Date(),
                  },
                });
            },
          ),
      );

      const countWorkspaceSeatsUsed = Effect.fn(
        "BillingRepository.countWorkspaceSeatsUsed",
      )(
        ({
          workspaceId,
        }: {
          workspaceId: string;
        }): Effect.Effect<number, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.countWorkspaceSeatsUsed",
            async () => {
              const [memberCountRow] = await db
                .select({ count: sql<number>`count(*)` })
                .from(workspaceMember)
                .where(eq(workspaceMember.workspaceId, workspaceId));

              const [pendingInvitesCountRow] = await db
                .select({ count: sql<number>`count(*)` })
                .from(workspaceInvitation)
                .where(
                  and(
                    eq(workspaceInvitation.workspaceId, workspaceId),
                    eq(workspaceInvitation.status, "pending"),
                  ),
                );

              const members = Number(memberCountRow?.count ?? 0);
              const pendingInvitations = Number(
                pendingInvitesCountRow?.count ?? 0,
              );

              return members + pendingInvitations;
            },
          ),
      );

      const insertWebhookEventIfAbsent = Effect.fn(
        "BillingRepository.insertWebhookEventIfAbsent",
      )(
        ({
          providerEventId,
          eventType,
          payload,
        }: {
          providerEventId: string;
          eventType: string;
          payload: string;
        }): Effect.Effect<boolean, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.insertWebhookEventIfAbsent",
            async () => {
              const rows = await db
                .insert(billingWebhookEvent)
                .values({
                  id: crypto.randomUUID(),
                  provider: "polar",
                  providerEventId,
                  eventType,
                  status: "received",
                  payload,
                })
                .onConflictDoNothing()
                .returning({ id: billingWebhookEvent.id });

              return rows.length > 0;
            },
          ),
      );

      const markWebhookEventProcessed = Effect.fn(
        "BillingRepository.markWebhookEventProcessed",
      )(
        ({
          providerEventId,
        }: {
          providerEventId: string;
        }): Effect.Effect<void, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.markWebhookEventProcessed",
            async () => {
              await db
                .update(billingWebhookEvent)
                .set({
                  status: "processed",
                  processedAt: new Date(),
                  lastError: null,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(billingWebhookEvent.provider, "polar"),
                    eq(billingWebhookEvent.providerEventId, providerEventId),
                  ),
                );
            },
          ),
      );

      const markWebhookEventIgnored = Effect.fn(
        "BillingRepository.markWebhookEventIgnored",
      )(
        ({
          providerEventId,
          reason,
        }: {
          providerEventId: string;
          reason: string;
        }): Effect.Effect<void, BillingPersistenceError> =>
          fromPersistencePromise(
            "billing.markWebhookEventIgnored",
            async () => {
              await db
                .update(billingWebhookEvent)
                .set({
                  status: "ignored",
                  processedAt: new Date(),
                  lastError: reason,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(billingWebhookEvent.provider, "polar"),
                    eq(billingWebhookEvent.providerEventId, providerEventId),
                  ),
                );
            },
          ),
      );

      const markWebhookEventFailed = Effect.fn(
        "BillingRepository.markWebhookEventFailed",
      )(
        ({
          providerEventId,
          error,
        }: {
          providerEventId: string;
          error: string;
        }): Effect.Effect<void, BillingPersistenceError> =>
          fromPersistencePromise("billing.markWebhookEventFailed", async () => {
            await db
              .update(billingWebhookEvent)
              .set({
                status: "failed",
                processedAt: null,
                lastError: error,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(billingWebhookEvent.provider, "polar"),
                  eq(billingWebhookEvent.providerEventId, providerEventId),
                ),
              );
          }),
      );

      const createPolarCheckoutSession = Effect.fn(
        "BillingRepository.createPolarCheckoutSession",
      )(
        ({
          productId,
          customerEmail,
          customerName,
          externalCustomerId,
          successUrl,
          returnUrl,
          metadata,
        }: {
          productId: string;
          customerEmail: string | null;
          customerName: string | null;
          externalCustomerId: string;
          successUrl: string;
          returnUrl: string;
          metadata: Record<string, string>;
        }): Effect.Effect<
          string,
          BillingProviderError | BillingProviderNotConfigured
        > =>
          Effect.tryPromise({
            try: async () => {
              const payload: Record<string, unknown> = {
                products: [productId],
                success_url: successUrl,
                return_url: returnUrl,
                external_customer_id: externalCustomerId,
                metadata,
              };

              if (customerEmail) {
                payload.customer_email = customerEmail;
              }

              if (customerName) {
                payload.customer_name = customerName;
              }

              const data = await callPolarApi<{ url?: unknown }>(
                "/v1/checkouts/",
                payload,
              );
              const url = readString(data.url);

              if (!url) {
                throw new BillingProviderError({
                  operation: "polar:/v1/checkouts/",
                  status: 502,
                  message: "Missing checkout URL",
                });
              }

              return url;
            },
            catch: (error) => {
              if (
                error instanceof BillingProviderError ||
                error instanceof BillingProviderNotConfigured
              ) {
                return error;
              }

              return new BillingProviderError({
                operation: "polar:/v1/checkouts/",
                status: 502,
                message:
                  error instanceof Error
                    ? error.message
                    : "Unable to create checkout",
              });
            },
          }),
      );

      const createPolarCustomerPortalSession = Effect.fn(
        "BillingRepository.createPolarCustomerPortalSession",
      )(
        ({
          externalCustomerId,
          returnUrl,
        }: {
          externalCustomerId: string;
          returnUrl: string;
        }): Effect.Effect<
          string,
          BillingProviderError | BillingProviderNotConfigured
        > =>
          Effect.tryPromise({
            try: async () => {
              const data = await callPolarApi<{
                customer_portal_url?: unknown;
              }>("/v1/customer-sessions/", {
                external_customer_id: externalCustomerId,
                return_url: returnUrl,
              });
              const url = readString(data.customer_portal_url);

              if (!url) {
                throw new BillingProviderError({
                  operation: "polar:/v1/customer-sessions/",
                  status: 502,
                  message: "Missing customer portal URL",
                });
              }

              return url;
            },
            catch: (error) => {
              if (
                error instanceof BillingProviderError ||
                error instanceof BillingProviderNotConfigured
              ) {
                return error;
              }

              return new BillingProviderError({
                operation: "polar:/v1/customer-sessions/",
                status: 502,
                message:
                  error instanceof Error
                    ? error.message
                    : "Unable to create customer session",
              });
            },
          }),
      );

      const verifyAndParsePolarWebhook = Effect.fn(
        "BillingRepository.verifyAndParsePolarWebhook",
      )(
        ({
          body,
          headers,
        }: {
          body: string;
          headers: Record<string, string>;
        }): Effect.Effect<
          VerifiedPolarWebhookEvent,
          BillingWebhookSignatureInvalid | BillingProviderNotConfigured
        > =>
          Effect.try({
            try: () => {
              const webhookSecret = getPolarWebhookSecret();

              if (!webhookSecret) {
                throw new BillingProviderNotConfigured({
                  provider: "polar",
                  missing: "POLAR_WEBHOOK_SECRET",
                });
              }

              const isValid = verifyStandardWebhookSignature({
                body,
                headers,
                secret: webhookSecret,
              });

              if (!isValid) {
                throw new BillingWebhookSignatureInvalid({});
              }

              const payload = readRecord(JSON.parse(body));
              const eventType = readString(payload.type) || "unknown";
              const eventId =
                readString(payload.id) ||
                readString(headers["webhook-id"]) ||
                `${eventType}-${Date.now()}`;

              return {
                id: eventId,
                type: eventType,
                payload,
              };
            },
            catch: (error) => {
              if (error instanceof BillingProviderNotConfigured) {
                return error;
              }

              if (error instanceof BillingWebhookSignatureInvalid) {
                return new BillingWebhookSignatureInvalid({});
              }

              return new BillingWebhookSignatureInvalid({});
            },
          }),
      );

      const parseSubscriptionEvent = Effect.fn(
        "BillingRepository.parseSubscriptionEvent",
      )(
        ({
          payload,
        }: {
          payload: Record<string, unknown>;
        }): Effect.Effect<ParsedSubscriptionEvent | null> =>
          Effect.sync(() => {
            const data = readRecord(
              payload.data ?? payload.subscription ?? payload,
            );
            const customer = readRecord(data.customer);
            const product = readRecord(data.product);
            const price = readRecord(data.price);

            const providerSubscriptionId =
              readString(data.id) ||
              readString(data.subscriptionId) ||
              readString(data.subscription_id);

            if (!providerSubscriptionId) {
              return null;
            }

            return {
              providerSubscriptionId,
              providerCustomerId:
                readString(data.customerId) ||
                readString(data.customer_id) ||
                readString(customer.id) ||
                null,
              externalCustomerId:
                readString(data.externalCustomerId) ||
                readString(data.external_customer_id) ||
                readString(customer.externalId) ||
                readString(customer.external_id) ||
                null,
              providerProductId:
                readString(data.productId) ||
                readString(data.product_id) ||
                readString(product.id) ||
                null,
              providerPriceId:
                readString(data.priceId) ||
                readString(data.price_id) ||
                readString(price.id) ||
                null,
              status: readString(data.status) || "active",
              cancelAtPeriodEnd:
                readBoolean(data.cancelAtPeriodEnd) ||
                readBoolean(data.cancelAtPeriodEndRequested) ||
                readBoolean(data.cancel_at_period_end),
              periodStart:
                readDate(data.currentPeriodStart) ||
                readDate(data.current_period_start) ||
                readDate(data.startedAt) ||
                null,
              periodEnd:
                readDate(data.currentPeriodEnd) ||
                readDate(data.current_period_end) ||
                readDate(data.endsAt) ||
                null,
              canceledAt:
                readDate(data.canceledAt) || readDate(data.canceled_at),
              rawPayload: JSON.stringify(payload),
            };
          }),
      );

      return {
        createPolarCheckoutSession,
        createPolarCustomerPortalSession,
        countWorkspaceSeatsUsed,
        getWorkspaceByExternalCustomerId,
        getWorkspaceByProviderCustomerId,
        getWorkspaceMembershipBySlug,
        getWorkspaceSubscriptionByWorkspaceId,
        insertWebhookEventIfAbsent,
        markWebhookEventFailed,
        markWebhookEventIgnored,
        markWebhookEventProcessed,
        parseSubscriptionEvent,
        upsertWorkspaceBillingCustomer,
        upsertWorkspaceSubscription,
        verifyAndParsePolarWebhook,
      };
    }),
  },
) {}
