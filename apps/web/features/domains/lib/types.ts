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

export interface CustomDomain {
  domain: string;
  verificationStatus: "pending" | "verified";
  verificationRecords: DomainVerificationRecord[];
  dnsConfig: DomainDnsConfig;
  warnings: string[];
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
