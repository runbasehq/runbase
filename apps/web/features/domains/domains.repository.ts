import "server-only";

import { Vercel } from "@vercel/sdk";
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
  providerStatusText: string | null;
  providerReasons: string[];
}

interface VercelConfig {
  apiToken: string;
  projectId: string;
  teamId: string | null;
}

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

function parseVerificationRecords(input: unknown): DomainVerificationRecord[] {
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

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function dedupeStrings(values: Array<string | null | undefined>) {
  const unique = new Set<string>();

  values.forEach((value) => {
    if (typeof value === "string" && value.trim().length) {
      unique.add(value.trim());
    }
  });

  return Array.from(unique);
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
    verificationRecords: parseStoredVerificationRecords(
      row.verificationDetails,
    ),
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseProviderDomainStatus(payload: unknown): ProjectDomainStatus {
  if (!payload || typeof payload !== "object") {
    return {
      verified: false,
      verification: [],
      providerStatusText: null,
      providerReasons: [],
    };
  }

  const data = payload as {
    verified?: unknown;
    verification?: unknown;
    status?: unknown;
    configStatus?: unknown;
    message?: unknown;
    misconfigured?: unknown;
  };

  const verification = parseVerificationRecords(data.verification);
  const providerReasons = dedupeStrings([
    ...verification.map((record) => record.reason),
    readOptionalString(data.message),
  ]);

  const providerStatusText =
    readOptionalString(data.configStatus) ||
    readOptionalString(data.status) ||
    (data.misconfigured === true ? "Invalid Configuration" : null);

  return {
    verified: data.verified === true,
    verification,
    providerStatusText,
    providerReasons,
  };
}

function parseProviderError(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      message: "Failed to connect to Vercel API",
      status: 502,
      providerStatusText: null,
      providerReasons: [],
      providerCode: null,
      providerRequestId: null,
    };
  }

  const data = error as {
    error?: { message?: unknown };
    message?: unknown;
    code?: unknown;
    headers?: Record<string, unknown>;
    responseBody?: {
      error?: { message?: unknown; code?: unknown };
      message?: unknown;
      code?: unknown;
      status?: unknown;
      errors?: Array<{ message?: unknown }>;
      verification?: unknown;
    };
    status?: unknown;
    statusCode?: unknown;
  };

  const parsedVerificationRecords = parseVerificationRecords(
    data.responseBody?.verification,
  );
  const verificationReasons = parsedVerificationRecords.map(
    (record) => record.reason,
  );
  const firstProviderArrayMessage = Array.isArray(data.responseBody?.errors)
    ? readOptionalString(
        data.responseBody.errors.find((item) =>
          readOptionalString(item?.message),
        )?.message,
      )
    : null;

  const message =
    readOptionalString(data.responseBody?.error?.message) ||
    firstProviderArrayMessage ||
    readOptionalString(data.responseBody?.message) ||
    readOptionalString(data.error?.message) ||
    readOptionalString(data.message) ||
    "Vercel API request failed";

  const status =
    typeof data.status === "number"
      ? data.status
      : typeof data.statusCode === "number"
        ? data.statusCode
        : 502;

  const providerStatusText =
    readOptionalString(data.responseBody?.status) ||
    (status >= 400 ? "Invalid Configuration" : null);

  const providerCode =
    readOptionalString(data.responseBody?.error?.code) ||
    readOptionalString(data.responseBody?.code) ||
    readOptionalString(data.code);

  const providerRequestId =
    readOptionalString(data.headers?.["x-vercel-id"]) ||
    readOptionalString(data.headers?.["x-request-id"]);

  const providerReasons = dedupeStrings([
    ...verificationReasons,
    readOptionalString(data.responseBody?.message),
    readOptionalString(data.responseBody?.error?.message),
  ]);

  return {
    message,
    status,
    providerStatusText,
    providerReasons,
    providerCode,
    providerRequestId,
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

const createVercelClient = (config: VercelConfig) =>
  new Vercel({ bearerToken: config.apiToken });

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
        }): Effect.Effect<
          WorkspaceMembershipRecord | null,
          DomainPersistenceError
        > =>
          fromPersistencePromise("domains.getWorkspaceMembership", async () => {
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

            return membership ?? null;
          }),
      );

      const listWorkspaceDomains = Effect.fn(
        "DomainsRepository.listWorkspaceDomains",
      )(
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
        }): Effect.Effect<
          WorkspaceDomainRecord | null,
          DomainPersistenceError
        > =>
          fromPersistencePromise(
            "domains.getWorkspaceDomainByName",
            async () => {
              const [row] = await db
                .select()
                .from(workspaceDomain)
                .where(eq(workspaceDomain.domain, normalizeHostname(domain)))
                .limit(1);

              return row ? toWorkspaceDomainRecord(row) : null;
            },
          ),
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
        }): Effect.Effect<
          WorkspaceDomainRecord,
          DomainAlreadyAssigned | DomainPersistenceError
        > =>
          Effect.gen(function* () {
            const normalizedDomain = normalizeHostname(domain);

            const existing = yield* getWorkspaceDomainByName({
              domain: normalizedDomain,
            });

            if (existing && existing.workspaceId !== workspaceId) {
              return yield* new DomainAlreadyAssigned({
                domain: normalizedDomain,
              });
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
                  return new DomainAlreadyAssigned({
                    domain: normalizedDomain,
                  });
                }

                return toPersistenceError(
                  "domains.upsertWorkspaceDomain.insert",
                );
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

      const deleteWorkspaceDomain = Effect.fn(
        "DomainsRepository.deleteWorkspaceDomain",
      )(
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
          fromPersistencePromise(
            "domains.removeCustomDomainRouting",
            async () => {
              await getRedis().del(getCustomDomainCacheKey(domain));
            },
          ),
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
            const vercel = createVercelClient(config);

            const response = yield* Effect.tryPromise({
              try: () =>
                vercel.projects.getProjectDomain({
                  idOrName: config.projectId,
                  teamId: config.teamId || undefined,
                  domain: normalizeHostname(domain),
                }),
              catch: (error) => {
                const parsedError = parseProviderError(error);

                return new DomainProviderError({
                  operation: "domains.getProjectDomainStatus",
                  message: parsedError.message,
                  status: parsedError.status,
                  providerStatusText:
                    parsedError.providerStatusText || undefined,
                  providerReasons:
                    parsedError.providerReasons.length > 0
                      ? parsedError.providerReasons
                      : undefined,
                  providerCode: parsedError.providerCode || undefined,
                  providerRequestId: parsedError.providerRequestId || undefined,
                  domain: normalizeHostname(domain),
                });
              },
            });

            return parseProviderDomainStatus(response);
          }),
      );

      const addDomainToProject = Effect.fn(
        "DomainsRepository.addDomainToProject",
      )(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<
          void,
          DomainProviderNotConfigured | DomainProviderError
        > =>
          Effect.gen(function* () {
            const config = yield* loadVercelConfig();
            const vercel = createVercelClient(config);
            const name = normalizeHostname(domain);

            yield* Effect.tryPromise({
              try: () =>
                vercel.projects.addProjectDomain({
                  idOrName: config.projectId,
                  teamId: config.teamId || undefined,
                  requestBody: { name },
                }),
              catch: (error) => {
                const parsedError = parseProviderError(error);

                return new DomainProviderError({
                  operation: "domains.addDomainToProject",
                  message: parsedError.message,
                  status: parsedError.status,
                  providerStatusText:
                    parsedError.providerStatusText || undefined,
                  providerReasons:
                    parsedError.providerReasons.length > 0
                      ? parsedError.providerReasons
                      : undefined,
                  providerCode: parsedError.providerCode || undefined,
                  providerRequestId: parsedError.providerRequestId || undefined,
                  domain: name,
                });
              },
            });
          }),
      );

      const verifyProjectDomain = Effect.fn(
        "DomainsRepository.verifyProjectDomain",
      )(
        ({
          domain,
        }: {
          domain: string;
        }): Effect.Effect<
          void,
          DomainProviderNotConfigured | DomainProviderError
        > =>
          Effect.gen(function* () {
            const config = yield* loadVercelConfig();
            const vercel = createVercelClient(config);

            yield* Effect.tryPromise({
              try: () =>
                vercel.projects.verifyProjectDomain({
                  idOrName: config.projectId,
                  teamId: config.teamId || undefined,
                  domain: normalizeHostname(domain),
                }),
              catch: (error) => {
                const parsedError = parseProviderError(error);

                return new DomainProviderError({
                  operation: "domains.verifyProjectDomain",
                  message: parsedError.message,
                  status: parsedError.status,
                  providerStatusText:
                    parsedError.providerStatusText || undefined,
                  providerReasons:
                    parsedError.providerReasons.length > 0
                      ? parsedError.providerReasons
                      : undefined,
                  providerCode: parsedError.providerCode || undefined,
                  providerRequestId: parsedError.providerRequestId || undefined,
                  domain: normalizeHostname(domain),
                });
              },
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
        }): Effect.Effect<
          void,
          DomainProviderNotConfigured | DomainProviderError
        > =>
          Effect.gen(function* () {
            const config = yield* loadVercelConfig();
            const vercel = createVercelClient(config);

            const removeEffect = Effect.tryPromise({
              try: () =>
                vercel.projects.removeProjectDomain({
                  idOrName: config.projectId,
                  teamId: config.teamId || undefined,
                  domain: normalizeHostname(domain),
                }),
              catch: (error) => {
                const parsedError = parseProviderError(error);

                return new DomainProviderError({
                  operation: "domains.removeDomainFromProject",
                  message: parsedError.message,
                  status: parsedError.status,
                  providerStatusText:
                    parsedError.providerStatusText || undefined,
                  providerReasons:
                    parsedError.providerReasons.length > 0
                      ? parsedError.providerReasons
                      : undefined,
                  providerCode: parsedError.providerCode || undefined,
                  providerRequestId: parsedError.providerRequestId || undefined,
                  domain: normalizeHostname(domain),
                });
              },
            });

            yield* removeEffect.pipe(
              Effect.catchAll((error) => {
                if (
                  error._tag === "DomainProviderError" &&
                  error.status === 404
                ) {
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
