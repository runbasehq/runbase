import "server-only";

import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { db } from "@/lib/db";
import { workspace, workspaceDomain, workspaceMember } from "@/lib/db/schema";
import { getRedis } from "@/lib/redis";

import {
  DomainAlreadyAssigned,
  DomainPersistenceError,
  DomainProviderError,
  DomainProviderNotConfigured,
} from "./domains.errors";
import { getCustomDomainCacheKey, normalizeHostname } from "./lib/domain-cache";

export type WorkspaceDomainVerificationStatus = "pending" | "verified";

export interface DomainVerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason: string | null;
}

export interface WorkspaceDomainRecord {
  id: string;
  workspaceId: string;
  domain: string;
  verificationStatus: WorkspaceDomainVerificationStatus;
  verificationRecords: DomainVerificationRecord[];
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMembershipRecord {
  workspaceId: string;
  workspaceSlug: string;
  role: string;
}

export interface ProjectDomainStatus {
  verified: boolean;
  verification: DomainVerificationRecord[];
}

interface VercelConfig {
  apiToken: string;
  projectId: string;
  teamId: string | null;
}

const VERCEL_API_BASE_URL = "https://api.vercel.com";

const toPersistenceError = (operation: string) =>
  new DomainPersistenceError({ operation });

const fromPersistencePromise = <A>(
  operation: string,
  thunk: () => Promise<A>,
) =>
  Effect.tryPromise({
    try: thunk,
    catch: () => toPersistenceError(operation),
  });

function isUniqueViolationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && error.code === "23505";
}

function parseVerificationRecords(
  input: unknown,
): DomainVerificationRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => {
      const type =
        typeof item.type === "string" && item.type.trim().length
          ? item.type
          : "unknown";
      const domain =
        typeof item.domain === "string" && item.domain.trim().length
          ? item.domain
          : "";
      const value =
        typeof item.value === "string" && item.value.trim().length
          ? item.value
          : "";
      const reason =
        typeof item.reason === "string" && item.reason.trim().length
          ? item.reason
          : null;

      return {
        type,
        domain,
        value,
        reason,
      };
    })
    .filter((item) => item.domain.length && item.value.length);
}

function parseStoredVerificationRecords(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    return parseVerificationRecords(JSON.parse(value));
  } catch {
    return [];
  }
}

function serializeVerificationRecords(
  records: DomainVerificationRecord[],
): string | null {
  if (!records.length) {
    return null;
  }

  return JSON.stringify(records);
}

function toWorkspaceDomainRecord(
  row: typeof workspaceDomain.$inferSelect,
): WorkspaceDomainRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    domain: row.domain,
    verificationStatus:
      row.verificationStatus === "verified" ? "verified" : "pending",
    verificationRecords: parseStoredVerificationRecords(row.verificationDetails),
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseProviderErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    error?: { message?: unknown; code?: unknown };
    message?: unknown;
  };

  if (typeof data.error?.message === "string") {
    return data.error.message;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return null;
}

function parseProviderDomainStatus(payload: unknown): ProjectDomainStatus {
  if (!payload || typeof payload !== "object") {
    return {
      verified: false,
      verification: [],
    };
  }

  const data = payload as {
    verified?: unknown;
    verification?: unknown;
  };

  return {
    verified: data.verified === true,
    verification: parseVerificationRecords(data.verification),
  };
}

const loadVercelConfig = () =>
  Effect.gen(function* () {
    const apiToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;

    if (!apiToken || !projectId) {
      return yield* new DomainProviderNotConfigured();
    }

    return {
      apiToken,
      projectId,
      teamId: teamId || null,
    } satisfies VercelConfig;
  });

const requestVercel = <A>({
  config,
  operation,
  path,
  method,
  body,
}: {
  config: VercelConfig;
  operation: string;
  path: string;
  method: "GET" | "POST" | "DELETE";
  body?: unknown;
}): Effect.Effect<A, DomainProviderError> =>
  Effect.gen(function* () {
    const url = new URL(`${VERCEL_API_BASE_URL}${path}`);

    if (config.teamId) {
      url.searchParams.set("teamId", config.teamId);
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${config.apiToken}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        }),
      catch: () =>
        new DomainProviderError({
          operation,
          message: "Failed to connect to Vercel API",
          status: 502,
        }),
    });

    const payload = yield* Effect.tryPromise({
      try: async () => {
        const text = await response.text();

        if (!text) {
          return null;
        }

        try {
          return JSON.parse(text) as unknown;
        } catch {
          return null;
        }
      },
      catch: () =>
        new DomainProviderError({
          operation,
          message: "Failed to parse Vercel API response",
          status: 502,
        }),
    });

    if (!response.ok) {
      const message =
        parseProviderErrorMessage(payload) ||
        `Vercel API request failed with status ${response.status}`;

      return yield* new DomainProviderError({
        operation,
        message,
        status: response.status,
      });
    }

    return payload as A;
  });

export class DomainsRepository extends Effect.Service<DomainsRepository>()(
  "DomainsRepository",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const getWorkspaceMembership = Effect.fn(
        "DomainsRepository.getWorkspaceMembership",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }): Effect.Effect<WorkspaceMembershipRecord | null, DomainPersistenceError> =>
          fromPersistencePromise("domains.getWorkspaceMembership", async () => {
            const [membership] = await db
              .select({
                workspaceId: workspace.id,
                workspaceSlug: workspace.slug,
                role: workspaceMember.role,
              })
              .from(workspaceMember)
              .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
              .where(
                and(
                  eq(workspaceMember.userId, userId),
                  eq(workspace.slug, workspaceSlug),
                ),
              )
              .limit(1);

            return membership ?? null;
          }),
      );

      const listWorkspaceDomains = Effect.fn("DomainsRepository.listWorkspaceDomains")(
        ({
          workspaceId,
        }: {
          workspaceId: string;
        }): Effect.Effect<WorkspaceDomainRecord[], DomainPersistenceError> =>
          fromPersistencePromise("domains.listWorkspaceDomains", async () => {
            const rows = await db
              .select()
              .from(workspaceDomain)
              .where(eq(workspaceDomain.workspaceId, workspaceId));

            return rows.map(toWorkspaceDomainRecord);
          }),
      );

      const getWorkspaceDomainByName = Effect.fn(
        "DomainsRepository.getWorkspaceDomainByName",
      )(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<WorkspaceDomainRecord | null, DomainPersistenceError> =>
          fromPersistencePromise("domains.getWorkspaceDomainByName", async () => {
            const [row] = await db
              .select()
              .from(workspaceDomain)
              .where(eq(workspaceDomain.domain, normalizeHostname(domain)))
              .limit(1);

            return row ? toWorkspaceDomainRecord(row) : null;
          }),
      );

      const upsertWorkspaceDomain = Effect.fn(
        "DomainsRepository.upsertWorkspaceDomain",
      )(
        ({
          workspaceId,
          domain,
          verificationStatus,
          verificationRecords,
        }: {
          workspaceId: string;
          domain: string;
          verificationStatus: WorkspaceDomainVerificationStatus;
          verificationRecords: DomainVerificationRecord[];
        }): Effect.Effect<WorkspaceDomainRecord, DomainAlreadyAssigned | DomainPersistenceError> =>
          Effect.gen(function* () {
            const normalizedDomain = normalizeHostname(domain);

            const existing = yield* getWorkspaceDomainByName({
              domain: normalizedDomain,
            });

            if (existing && existing.workspaceId !== workspaceId) {
              return yield* new DomainAlreadyAssigned({ domain: normalizedDomain });
            }

            const storedVerificationRecords =
              serializeVerificationRecords(verificationRecords);
            const verifiedAt =
              verificationStatus === "verified" ? new Date() : null;

            if (existing) {
              const row = yield* fromPersistencePromise(
                "domains.upsertWorkspaceDomain.update",
                async () => {
                  const [updated] = await db
                    .update(workspaceDomain)
                    .set({
                      verificationStatus,
                      verificationDetails: storedVerificationRecords,
                      verifiedAt,
                      updatedAt: new Date(),
                    })
                    .where(eq(workspaceDomain.id, existing.id))
                    .returning();

                  return updated ?? null;
                },
              );

              if (!row) {
                return yield* toPersistenceError(
                  "domains.upsertWorkspaceDomain.update.missing",
                );
              }

              return toWorkspaceDomainRecord(row);
            }

            const inserted = yield* Effect.tryPromise({
              try: async () => {
                const [row] = await db
                  .insert(workspaceDomain)
                  .values({
                    id: crypto.randomUUID(),
                    workspaceId,
                    domain: normalizedDomain,
                    verificationStatus,
                    verificationDetails: storedVerificationRecords,
                    verifiedAt,
                  })
                  .returning();

                return row ?? null;
              },
              catch: (error) => {
                if (isUniqueViolationError(error)) {
                  return new DomainAlreadyAssigned({ domain: normalizedDomain });
                }

                return toPersistenceError("domains.upsertWorkspaceDomain.insert");
              },
            });

            if (!inserted) {
              return yield* toPersistenceError(
                "domains.upsertWorkspaceDomain.insert.missing",
              );
            }

            return toWorkspaceDomainRecord(inserted);
          }),
      );

      const deleteWorkspaceDomain = Effect.fn("DomainsRepository.deleteWorkspaceDomain")(
        ({
          workspaceId,
          domain,
        }: {
          workspaceId: string;
          domain: string;
        }): Effect.Effect<boolean, DomainPersistenceError> =>
          fromPersistencePromise("domains.deleteWorkspaceDomain", async () => {
            const deleted = await db
              .delete(workspaceDomain)
              .where(
                and(
                  eq(workspaceDomain.workspaceId, workspaceId),
                  eq(workspaceDomain.domain, normalizeHostname(domain)),
                ),
              )
              .returning({ id: workspaceDomain.id });

            return deleted.length > 0;
          }),
      );

      const setCustomDomainRouting = Effect.fn(
        "DomainsRepository.setCustomDomainRouting",
      )(
        ({
          domain,
          workspaceSlug,
        }: {
          domain: string;
          workspaceSlug: string;
        }): Effect.Effect<void, DomainPersistenceError> =>
          fromPersistencePromise("domains.setCustomDomainRouting", async () => {
            await getRedis().set(getCustomDomainCacheKey(domain), {
              workspaceSlug,
            });
          }),
      );

      const removeCustomDomainRouting = Effect.fn(
        "DomainsRepository.removeCustomDomainRouting",
      )(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<void, DomainPersistenceError> =>
          fromPersistencePromise("domains.removeCustomDomainRouting", async () => {
            await getRedis().del(getCustomDomainCacheKey(domain));
          }),
      );

      const getProjectDomainStatus = Effect.fn(
        "DomainsRepository.getProjectDomainStatus",
      )(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<
          ProjectDomainStatus,
          DomainProviderNotConfigured | DomainProviderError
        > =>
          Effect.gen(function* () {
            const config = yield* loadVercelConfig();
            const payload = yield* requestVercel<unknown>({
              config,
              operation: "domains.getProjectDomainStatus",
              method: "GET",
              path: `/v9/projects/${config.projectId}/domains/${encodeURIComponent(
                normalizeHostname(domain),
              )}`,
            });

            return parseProviderDomainStatus(payload);
          }),
      );

      const addDomainToProject = Effect.fn("DomainsRepository.addDomainToProject")(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<void, DomainProviderNotConfigured | DomainProviderError> =>
          Effect.gen(function* () {
            const config = yield* loadVercelConfig();

            yield* requestVercel<unknown>({
              config,
              operation: "domains.addDomainToProject",
              method: "POST",
              path: `/v10/projects/${config.projectId}/domains`,
              body: {
                name: normalizeHostname(domain),
              },
            });
          }),
      );

      const verifyProjectDomain = Effect.fn("DomainsRepository.verifyProjectDomain")(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<void, DomainProviderNotConfigured | DomainProviderError> =>
          Effect.gen(function* () {
            const config = yield* loadVercelConfig();

            yield* requestVercel<unknown>({
              config,
              operation: "domains.verifyProjectDomain",
              method: "POST",
              path: `/v9/projects/${config.projectId}/domains/${encodeURIComponent(
                normalizeHostname(domain),
              )}/verify`,
            });
          }),
      );

      const removeDomainFromProject = Effect.fn(
        "DomainsRepository.removeDomainFromProject",
      )(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<void, DomainProviderNotConfigured | DomainProviderError> =>
          Effect.gen(function* () {
            const config = yield* loadVercelConfig();

            const removeEffect = requestVercel<unknown>({
              config,
              operation: "domains.removeDomainFromProject",
              method: "DELETE",
              path: `/v9/projects/${config.projectId}/domains/${encodeURIComponent(
                normalizeHostname(domain),
              )}`,
            });

            yield* removeEffect.pipe(
              Effect.catchAll((error) => {
                if (error._tag === "DomainProviderError" && error.status === 404) {
                  return Effect.void;
                }

                return Effect.fail(error);
              }),
            );
          }),
      );

      return {
        getWorkspaceMembership,
        listWorkspaceDomains,
        getWorkspaceDomainByName,
        upsertWorkspaceDomain,
        deleteWorkspaceDomain,
        setCustomDomainRouting,
        removeCustomDomainRouting,
        getProjectDomainStatus,
        addDomainToProject,
        verifyProjectDomain,
        removeDomainFromProject,
      };
    }),
  },
) {}
