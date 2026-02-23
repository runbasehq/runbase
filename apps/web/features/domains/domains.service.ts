import "server-only";

import { Effect, Either } from "effect";

import type {
  CustomDomain,
  DomainDnsConfig,
  DomainDnsInstructionRecord,
  DomainVerificationRecord as DomainVerificationRecordDTO,
} from "~/domains/lib/types";

import {
  DomainAlreadyAssigned,
  DomainForbidden,
  DomainNotFound,
  DomainWorkspaceNotFound,
} from "./domains.errors";
import type {
  DomainVerificationRecord,
  ProjectDomainStatus,
  WorkspaceDomainRecord,
} from "./domains.repository";
import { DomainsRepository } from "./domains.repository";

const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";
const VERCEL_APEX_TARGET = "76.76.21.21";

function inferRootDomain(domain: string) {
  const labels = domain.split(".").filter(Boolean);

  if (labels.length <= 2) {
    return domain;
  }

  return labels.slice(-2).join(".");
}

function toRelativeRecordName(hostname: string, rootDomain: string) {
  const normalizedHost = hostname.trim().toLowerCase().replace(/\.$/, "");
  const normalizedRoot = rootDomain.trim().toLowerCase().replace(/\.$/, "");

  if (!normalizedHost) {
    return "@";
  }

  if (normalizedHost === normalizedRoot) {
    return "@";
  }

  if (normalizedHost.endsWith(`.${normalizedRoot}`)) {
    return normalizedHost.slice(0, -(normalizedRoot.length + 1));
  }

  return normalizedHost;
}

function toDnsInstructionRecord(
  record: DomainVerificationRecord,
  rootDomain: string,
): DomainDnsInstructionRecord {
  const type = record.type.toUpperCase();

  return {
    type: type === "A" || type === "CNAME" || type === "TXT" ? type : "TXT",
    name: toRelativeRecordName(record.domain, rootDomain),
    value: record.value,
  };
}

function buildDnsConfig(
  domain: string,
  verificationRecords: DomainVerificationRecord[],
): DomainDnsConfig {
  const normalizedDomain = domain.trim().toLowerCase().replace(/\.$/, "");
  const labels = normalizedDomain.split(".").filter(Boolean);
  const isApex = labels.length <= 2;
  const rootDomain = inferRootDomain(normalizedDomain);
  const hostLabel = toRelativeRecordName(normalizedDomain, rootDomain);

  const parsedRecords = verificationRecords.map((record) =>
    toDnsInstructionRecord(record, rootDomain),
  );

  const providerCname = parsedRecords.find((record) => record.type === "CNAME");
  const txtRecords = parsedRecords.filter((record) => record.type === "TXT");

  return {
    isApex,
    recommendedType: isApex ? "A" : "CNAME",
    hostLabel,
    cnameRecord: {
      type: "CNAME",
      name: hostLabel,
      value: providerCname?.value || VERCEL_CNAME_TARGET,
    },
    aRecords: [
      {
        type: "A",
        name: "@",
        value: VERCEL_APEX_TARGET,
      },
    ],
    txtRecords,
  };
}

function buildWarnings(
  verificationRecords: DomainVerificationRecord[],
  isVerified: boolean,
) {
  const warningSet = new Set<string>();

  if (!isVerified) {
    warningSet.add(
      "DNS changes can take a few minutes to propagate. Keep existing records until verification succeeds.",
    );
  }

  verificationRecords.forEach((record) => {
    if (record.reason) {
      warningSet.add(record.reason);
    }
  });

  return Array.from(warningSet);
}

function toCustomDomain(record: WorkspaceDomainRecord): CustomDomain {
  const verificationRecords: DomainVerificationRecordDTO[] =
    record.verificationRecords;
  const dnsConfig = buildDnsConfig(record.domain, verificationRecords);

  return {
    domain: record.domain,
    verificationStatus: record.verificationStatus,
    verificationRecords,
    dnsConfig,
    warnings: buildWarnings(
      verificationRecords,
      record.verificationStatus === "verified",
    ),
    verifiedAt: record.verifiedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function resolveVerificationStatus(verified: boolean): "pending" | "verified" {
  return verified ? "verified" : "pending";
}

export class DomainsService extends Effect.Service<DomainsService>()(
  "DomainsService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repository = yield* DomainsRepository;

      const requireWorkspaceMembership = Effect.fn(
        "DomainsService.requireWorkspaceMembership",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* repository.getWorkspaceMembership({
              workspaceSlug,
              userId,
            });

            if (!membership) {
              return yield* new DomainWorkspaceNotFound({ workspaceSlug });
            }

            return membership;
          }),
      );

      const requireWorkspaceOwner = Effect.fn(
        "DomainsService.requireWorkspaceOwner",
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

            if (membership.role !== "owner") {
              return yield* new DomainForbidden({ workspaceSlug });
            }

            return membership;
          }),
      );

      const listDomains = Effect.fn("DomainsService.listDomains")(
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

            const domains = yield* repository.listWorkspaceDomains({
              workspaceId: membership.workspaceId,
            });

            return domains
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map(toCustomDomain);
          }),
      );

      const addDomain = Effect.fn("DomainsService.addDomain")(
        ({
          workspaceSlug,
          userId,
          domain,
        }: {
          workspaceSlug: string;
          userId: string;
          domain: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceOwner({
              workspaceSlug,
              userId,
            });

            const existingDomain = yield* repository.getWorkspaceDomainByName({
              domain,
            });

            if (
              existingDomain &&
              existingDomain.workspaceId !== membership.workspaceId
            ) {
              return yield* new DomainAlreadyAssigned({ domain });
            }

            const existingProviderStatusResult = yield* Effect.either(
              repository.getProjectDomainStatus({ domain }),
            );
            let existingProviderStatus: ProjectDomainStatus | null = null;

            if (Either.isRight(existingProviderStatusResult)) {
              existingProviderStatus = existingProviderStatusResult.right;
            } else {
              const error = existingProviderStatusResult.left;

              if (
                error._tag === "DomainProviderError" &&
                error.status === 404
              ) {
                existingProviderStatus = null;
              } else {
                return yield* Effect.fail(error);
              }
            }

            if (!existingProviderStatus) {
              const addDomainResult = yield* Effect.either(
                repository.addDomainToProject({ domain }),
              );

              if (Either.isLeft(addDomainResult)) {
                const error = addDomainResult.left;

                if (
                  error._tag === "DomainProviderError" &&
                  error.status === 409
                ) {
                  return yield* new DomainAlreadyAssigned({ domain });
                }

                return yield* Effect.fail(error);
              }
            }

            const providerStatus =
              existingProviderStatus ||
              (yield* repository.getProjectDomainStatus({ domain }));

            const record = yield* repository.upsertWorkspaceDomain({
              workspaceId: membership.workspaceId,
              domain,
              verificationStatus: resolveVerificationStatus(
                providerStatus.verified,
              ),
              verificationRecords: providerStatus.verification,
            });

            if (providerStatus.verified) {
              yield* repository.setCustomDomainRouting({
                domain,
                workspaceSlug: membership.workspaceSlug,
              });
            } else {
              yield* repository.removeCustomDomainRouting({ domain });
            }

            return toCustomDomain(record);
          }),
      );

      const verifyDomain = Effect.fn("DomainsService.verifyDomain")(
        ({
          workspaceSlug,
          userId,
          domain,
        }: {
          workspaceSlug: string;
          userId: string;
          domain: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceOwner({
              workspaceSlug,
              userId,
            });

            const existingDomain = yield* repository.getWorkspaceDomainByName({
              domain,
            });

            if (
              !existingDomain ||
              existingDomain.workspaceId !== membership.workspaceId
            ) {
              return yield* new DomainNotFound({ domain });
            }

            const verifyResult = yield* Effect.either(
              repository.verifyProjectDomain({ domain }),
            );

            if (Either.isLeft(verifyResult)) {
              const error = verifyResult.left;

              if (
                error._tag === "DomainProviderError" &&
                error.status === 404
              ) {
                return yield* new DomainNotFound({ domain });
              }

              return yield* Effect.fail(error);
            }

            const providerStatus = yield* repository.getProjectDomainStatus({
              domain,
            });

            const record = yield* repository.upsertWorkspaceDomain({
              workspaceId: membership.workspaceId,
              domain,
              verificationStatus: resolveVerificationStatus(
                providerStatus.verified,
              ),
              verificationRecords: providerStatus.verification,
            });

            if (providerStatus.verified) {
              yield* repository.setCustomDomainRouting({
                domain,
                workspaceSlug: membership.workspaceSlug,
              });
            } else {
              yield* repository.removeCustomDomainRouting({ domain });
            }

            return toCustomDomain(record);
          }),
      );

      const removeDomain = Effect.fn("DomainsService.removeDomain")(
        ({
          workspaceSlug,
          userId,
          domain,
        }: {
          workspaceSlug: string;
          userId: string;
          domain: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceOwner({
              workspaceSlug,
              userId,
            });

            const existingDomain = yield* repository.getWorkspaceDomainByName({
              domain,
            });

            if (
              !existingDomain ||
              existingDomain.workspaceId !== membership.workspaceId
            ) {
              return yield* new DomainNotFound({ domain });
            }

            const removeResult = yield* Effect.either(
              repository.removeDomainFromProject({ domain }),
            );

            if (Either.isLeft(removeResult)) {
              const error = removeResult.left;

              if (
                !(error._tag === "DomainProviderError" && error.status === 404)
              ) {
                return yield* Effect.fail(error);
              }
            }

            yield* repository.deleteWorkspaceDomain({
              workspaceId: membership.workspaceId,
              domain,
            });
            yield* repository.removeCustomDomainRouting({ domain });

            return { domain };
          }),
      );

      return {
        listDomains,
        addDomain,
        verifyDomain,
        removeDomain,
      };
    }),
    dependencies: [DomainsRepository.Default],
  },
) {}
