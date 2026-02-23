import "server-only";

import { Effect, Either } from "effect";

import type {
  CustomDomain,
  DomainDisplayStatus,
  DomainDnsConfig,
  DomainDnsInstructionRecord,
  DomainIssueCode,
  DomainStatusDetail,
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

const INVALID_CONFIGURATION_HINT = "invalid configuration";

function dedupeStrings(values: Array<string | null | undefined>) {
  const unique = new Set<string>();

  values.forEach((value) => {
    if (typeof value === "string" && value.trim().length) {
      unique.add(value.trim());
    }
  });

  return Array.from(unique);
}

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
  issueCodes: DomainIssueCode[],
  dnsConfig: DomainDnsConfig,
  isVerified: boolean,
) {
  const warningSet = new Set<string>();

  if (!isVerified) {
    warningSet.add(
      "DNS changes can take a few minutes to propagate. Keep existing records until verification succeeds.",
    );
  }

  issueCodes.forEach((issueCode) => {
    switch (issueCode) {
      case "dns_record_mismatch":
        warningSet.add(
          dnsConfig.isApex
            ? `Set an A record for @ pointing to ${VERCEL_APEX_TARGET}.`
            : `Set a CNAME record for ${dnsConfig.hostLabel} pointing to ${dnsConfig.cnameRecord.value}.`,
        );
        break;
      case "dns_conflict":
        warningSet.add(
          "Remove conflicting DNS records (A/AAAA/CNAME) for the same host before retrying verification.",
        );
        break;
      case "ownership_verification_required":
        warningSet.add(
          "Domain ownership verification is required. Add the requested TXT record and retry.",
        );
        break;
      case "ssl_caa_missing":
        warningSet.add(
          'If CAA records are present, allow Let\'s Encrypt: 0 issue "letsencrypt.org".',
        );
        break;
      case "ssl_challenge_conflict":
        warningSet.add(
          "Remove stale _acme-challenge TXT records from previous providers, then retry.",
        );
        break;
      case "propagation":
        warningSet.add(
          "Wait for DNS propagation before checking again. Nameserver changes can take up to 24-48 hours.",
        );
        break;
      case "unknown":
        warningSet.add(
          "Vercel still reports a configuration issue. Re-check DNS records and verify again.",
        );
        break;
    }
  });

  return Array.from(warningSet);
}

function mapIssueCodes(
  providerStatusText: string | null,
  providerReasons: string[],
): DomainIssueCode[] {
  const issueSet = new Set<DomainIssueCode>();
  const reasonBlob = `${providerStatusText || ""} ${providerReasons.join(" ")}`
    .toLowerCase()
    .trim();

  if (!reasonBlob) {
    return [];
  }

  if (
    reasonBlob.includes("caa") ||
    reasonBlob.includes("letsencrypt") ||
    reasonBlob.includes("certificate")
  ) {
    issueSet.add("ssl_caa_missing");
  }

  if (reasonBlob.includes("_acme-challenge") || reasonBlob.includes("acme")) {
    issueSet.add("ssl_challenge_conflict");
  }

  if (
    reasonBlob.includes("verify") ||
    reasonBlob.includes("ownership") ||
    reasonBlob.includes("txt") ||
    reasonBlob.includes("another vercel account")
  ) {
    issueSet.add("ownership_verification_required");
  }

  if (
    reasonBlob.includes("conflict") ||
    reasonBlob.includes("conflicting") ||
    reasonBlob.includes("aaaa") ||
    reasonBlob.includes("already exists")
  ) {
    issueSet.add("dns_conflict");
  }

  if (
    reasonBlob.includes("cname") ||
    reasonBlob.includes("a record") ||
    reasonBlob.includes("dns") ||
    reasonBlob.includes("points to") ||
    reasonBlob.includes("resolve") ||
    reasonBlob.includes("invalid configuration")
  ) {
    issueSet.add("dns_record_mismatch");
  }

  if (
    reasonBlob.includes("propagat") ||
    reasonBlob.includes("pending") ||
    reasonBlob.includes("wait")
  ) {
    issueSet.add("propagation");
  }

  if (issueSet.size === 0) {
    issueSet.add("unknown");
  }

  return Array.from(issueSet);
}

function resolveDisplayStatus(
  isVerified: boolean,
  providerStatusText: string | null,
  issueCodes: DomainIssueCode[],
): DomainDisplayStatus {
  if (isVerified) {
    return "verified";
  }

  const hasInvalidSignal =
    (providerStatusText || "")
      .toLowerCase()
      .includes(INVALID_CONFIGURATION_HINT) ||
    issueCodes.some((code) => code !== "propagation");

  return hasInvalidSignal ? "invalid_configuration" : "pending";
}

function deriveStatusDetail(
  isVerified: boolean,
  providerStatusText: string | null,
  verificationRecords: DomainVerificationRecordDTO[],
  providerReasonsFromProvider: string[] = [],
): DomainStatusDetail {
  const providerReasons = dedupeStrings([
    ...providerReasonsFromProvider,
    ...verificationRecords.map((record) => record.reason),
  ]);
  const issueCodes = mapIssueCodes(providerStatusText, providerReasons);

  return {
    displayStatus: resolveDisplayStatus(
      isVerified,
      providerStatusText,
      issueCodes,
    ),
    providerStatusText,
    providerReasons,
    issueCodes,
    checkedAt: new Date().toISOString(),
  };
}

function toCustomDomain(
  record: WorkspaceDomainRecord,
  providerStatus: ProjectDomainStatus | null = null,
): CustomDomain {
  const verificationRecords: DomainVerificationRecordDTO[] =
    record.verificationRecords;
  const dnsConfig = buildDnsConfig(record.domain, verificationRecords);
  const statusDetail = deriveStatusDetail(
    record.verificationStatus === "verified",
    providerStatus?.providerStatusText || null,
    verificationRecords,
    providerStatus?.providerReasons || [],
  );

  return {
    domain: record.domain,
    verificationStatus: record.verificationStatus,
    verificationRecords,
    dnsConfig,
    statusDetail,
    warnings: buildWarnings(
      statusDetail.issueCodes,
      dnsConfig,
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
              .map((record) => toCustomDomain(record));
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

            return toCustomDomain(record, providerStatus);
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

            return toCustomDomain(record, providerStatus);
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
