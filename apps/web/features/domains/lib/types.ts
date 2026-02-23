export interface DomainVerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason: string | null;
}

export interface DomainDnsInstructionRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
}

export interface DomainDnsConfig {
  isApex: boolean;
  recommendedType: "A" | "CNAME";
  hostLabel: string;
  cnameRecord: DomainDnsInstructionRecord;
  aRecords: DomainDnsInstructionRecord[];
  txtRecords: DomainDnsInstructionRecord[];
}

export type DomainDisplayStatus =
  | "verified"
  | "pending"
  | "invalid_configuration";

export type DomainIssueCode =
  | "dns_record_mismatch"
  | "dns_conflict"
  | "ownership_verification_required"
  | "ssl_caa_missing"
  | "ssl_challenge_conflict"
  | "propagation"
  | "unknown";

export interface DomainStatusDetail {
  displayStatus: DomainDisplayStatus;
  providerStatusText: string | null;
  providerReasons: string[];
  issueCodes: DomainIssueCode[];
  checkedAt: string;
}

export interface CustomDomain {
  domain: string;
  verificationStatus: "pending" | "verified";
  verificationRecords: DomainVerificationRecord[];
  dnsConfig: DomainDnsConfig;
  statusDetail: DomainStatusDetail;
  warnings: string[];
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
