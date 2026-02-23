export interface DomainVerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason: string | null;
}

export interface CustomDomain {
  domain: string;
  verificationStatus: "pending" | "verified";
  verificationRecords: DomainVerificationRecord[];
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
