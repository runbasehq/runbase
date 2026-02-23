"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

interface DomainVerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason: string | null;
}

interface CustomDomain {
  domain: string;
  verificationStatus: "pending" | "verified";
  verificationRecords: DomainVerificationRecord[];
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DomainApiError {
  error?: string;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T & DomainApiError;

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export function CustomDomainManager({
  workspaceSlug,
  canManageDomains,
}: {
  workspaceSlug: string;
  canManageDomains: boolean;
}) {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDomainAction, setActiveDomainAction] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const loadDomains = useCallback(async () => {
    setError(null);

    try {
      setIsLoading(true);
      const response = await requestJson<{ domains: CustomDomain[] }>(
        `/api/domains?workspaceSlug=${encodeURIComponent(workspaceSlug)}`,
      );
      setDomains(response.domains);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load domains",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const pendingDomainCount = useMemo(
    () => domains.filter((domain) => domain.verificationStatus === "pending").length,
    [domains],
  );

  async function handleAddDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageDomains || !domainInput.trim()) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await requestJson<{ domain: CustomDomain }>("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceSlug,
          domain: domainInput,
        }),
      });

      setDomainInput("");
      await loadDomains();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add domain",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVerifyDomain(domain: string) {
    if (!canManageDomains) {
      return;
    }

    setError(null);
    setActiveDomainAction(domain);

    try {
      await requestJson<{ domain: CustomDomain }>("/api/domains/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceSlug, domain }),
      });

      await loadDomains();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to verify domain",
      );
    } finally {
      setActiveDomainAction(null);
    }
  }

  async function handleRemoveDomain(domain: string) {
    if (!canManageDomains) {
      return;
    }

    setError(null);
    setActiveDomainAction(domain);

    try {
      await requestJson<{ success: true; domain: string }>("/api/domains", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceSlug, domain }),
      });

      await loadDomains();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove domain",
      );
    } finally {
      setActiveDomainAction(null);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto mb-8 w-full max-w-2xl rounded-(--r-md) border border-(--border) bg-(--surface) p-8 shadow-(--shadow-sm)"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
            Custom domains
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-(--text)">
            Bring your own domain
          </h2>
        </div>
        <span className="rounded-full border border-(--border) px-3 py-1 text-xs text-(--muted)">
          {pendingDomainCount} pending verification
        </span>
      </div>

      {canManageDomains ? (
        <form onSubmit={handleAddDomain} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder="feedback.example.com"
            className="h-11 flex-1 rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 text-sm text-(--text) outline-none transition-colors focus:border-(--brand)"
          />
          <button
            type="submit"
            disabled={isSaving || !domainInput.trim()}
            className="h-11 rounded-(--r-sm) bg-(--brand) px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Adding..." : "Add domain"}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-(--muted)">
          Only workspace owners can add or remove domains.
        </p>
      )}

      {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-(--muted)">Loading domains...</p>
      ) : domains.length === 0 ? (
        <p className="mt-4 text-sm text-(--muted)">
          No custom domains configured yet.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {domains.map((domain) => {
            const isActionBusy = activeDomainAction === domain.domain;
            const isVerified = domain.verificationStatus === "verified";

            return (
              <div
                key={domain.domain}
                className="rounded-(--r-sm) border border-(--border) bg-(--bg) p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-(--text)">{domain.domain}</p>
                    <p className="mt-1 text-xs text-(--muted)">
                      {isVerified
                        ? "Verified and routing"
                        : "Pending DNS verification"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isVerified
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {isVerified ? "Verified" : "Pending"}
                    </span>

                    {canManageDomains ? (
                      <>
                        {!isVerified ? (
                          <button
                            type="button"
                            onClick={() => handleVerifyDomain(domain.domain)}
                            disabled={isActionBusy}
                            className="h-8 rounded-(--r-sm) border border-(--border) px-3 text-xs text-(--text) transition-colors hover:border-(--brand) disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isActionBusy ? "Verifying..." : "Verify"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleRemoveDomain(domain.domain)}
                          disabled={isActionBusy}
                          className="h-8 rounded-(--r-sm) border border-rose-300 px-3 text-xs text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isActionBusy ? "Removing..." : "Remove"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {!isVerified && domain.verificationRecords.length > 0 ? (
                  <div className="mt-4 rounded-(--r-sm) border border-dashed border-(--border) p-3 text-xs text-(--muted)">
                    <p className="font-medium text-(--text)">DNS record to configure</p>
                    <p className="mt-2">Type: {domain.verificationRecords[0]?.type}</p>
                    <p className="mt-1 break-all">
                      Name: {domain.verificationRecords[0]?.domain}
                    </p>
                    <p className="mt-1 break-all">
                      Value: {domain.verificationRecords[0]?.value}
                    </p>
                    {domain.verificationRecords[0]?.reason ? (
                      <p className="mt-1 text-amber-700">
                        {domain.verificationRecords[0].reason}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
