"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  useAddDomainMutation,
  useDomains,
  useRemoveDomainMutation,
  useVerifyDomainMutation,
} from "~/domains/hooks/use-domains";
import type {
  CustomDomain,
  DomainDnsInstructionRecord,
} from "~/domains/lib/types";

type DomainRecordTab = "CNAME" | "A";

function StatusChip({
  displayStatus,
}: {
  displayStatus: CustomDomain["statusDetail"]["displayStatus"];
}) {
  if (displayStatus === "verified") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
        Verified
      </span>
    );
  }

  if (displayStatus === "invalid_configuration") {
    return (
      <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700">
        Invalid config
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700">
      Pending
    </span>
  );
}

function RecordRow({
  domainKey,
  record,
  copiedKey,
  onCopy,
}: {
  domainKey: string;
  record: DomainDnsInstructionRecord;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  const nameKey = `${domainKey}:${record.type}:name`;
  const valueKey = `${domainKey}:${record.type}:value`;

  return (
    <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--text)">
      <span className="font-semibold text-(--muted)">{record.type}</span>
      <div className="space-y-1 overflow-hidden">
        <p className="truncate font-medium">{record.name}</p>
        <p className="truncate text-(--muted)">{record.value}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onCopy(nameKey, record.name)}
          className="rounded-md border border-(--border) px-2 py-1 text-[11px] text-(--muted) hover:border-(--text)/30 hover:text-(--text)"
        >
          {copiedKey === nameKey ? "Copied" : "Copy name"}
        </button>
        <button
          type="button"
          onClick={() => onCopy(valueKey, record.value)}
          className="rounded-md border border-(--border) px-2 py-1 text-[11px] text-(--muted) hover:border-(--text)/30 hover:text-(--text)"
        >
          {copiedKey === valueKey ? "Copied" : "Copy value"}
        </button>
      </div>
    </div>
  );
}

export function CustomDomainManager({
  workspaceSlug,
  canManageDomains,
  initialDomains,
}: {
  workspaceSlug: string;
  canManageDomains: boolean;
  initialDomains: CustomDomain[];
}) {
  const [domainInput, setDomainInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recordTabByDomain, setRecordTabByDomain] = useState<
    Record<string, DomainRecordTab>
  >({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const domainsQuery = useDomains({ workspaceSlug, initialDomains });
  const addDomainMutation = useAddDomainMutation(workspaceSlug);
  const verifyDomainMutation = useVerifyDomainMutation(workspaceSlug);
  const removeDomainMutation = useRemoveDomainMutation(workspaceSlug);

  const domains = domainsQuery.data ?? [];
  const isLoading = domainsQuery.isLoading;

  const pendingDomainCount = useMemo(
    () =>
      domains.filter(
        (domain) => domain.statusDetail.displayStatus !== "verified",
      ).length,
    [domains],
  );

  async function handleAddDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageDomains || !domainInput.trim()) {
      return;
    }

    setError(null);

    try {
      await addDomainMutation.mutateAsync(domainInput);
      setDomainInput("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add domain",
      );
    }
  }

  async function handleVerifyDomain(domain: string) {
    if (!canManageDomains) {
      return;
    }

    setError(null);

    try {
      await verifyDomainMutation.mutateAsync(domain);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to verify domain",
      );
    }
  }

  async function handleRemoveDomain(domain: string) {
    if (!canManageDomains) {
      return;
    }

    setError(null);

    try {
      await removeDomainMutation.mutateAsync(domain);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove domain",
      );
    }
  }

  function handleTabChange(domain: string, tab: DomainRecordTab) {
    setRecordTabByDomain((current) => ({
      ...current,
      [domain]: tab,
    }));
  }

  async function handleCopy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1400);
    } catch {
      setError("Unable to copy value");
    }
  }

  const queryError =
    domainsQuery.error instanceof Error
      ? domainsQuery.error.message
      : domainsQuery.error
        ? "Unable to load domains"
        : null;

  const visibleError = error || queryError;

  return (
    <section className="mx-auto mb-8 w-full max-w-3xl rounded-(--r-md) border border-(--border) bg-(--surface) p-6 shadow-(--shadow-sm) md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
            Web portal custom domain
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-(--text)">
            Bring your own domain
          </h2>
          <p className="mt-2 text-sm text-(--muted)">
            This domain is used for your public feedback pages. Add it, set DNS,
            then verify.
          </p>
        </div>

        <span className="rounded-full border border-(--border) px-3 py-1 text-xs font-medium text-(--muted)">
          {pendingDomainCount} pending
        </span>
      </div>

      {canManageDomains ? (
        <form onSubmit={handleAddDomain} className="mt-5 space-y-2">
          <label
            htmlFor="custom-domain-input"
            className="text-sm font-medium text-(--text)"
          >
            What website are you pointing here?
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="custom-domain-input"
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              placeholder="feedback.example.com"
              className="h-11 flex-1 rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 text-sm text-(--text) outline-none transition-colors focus:border-(--primary)"
            />
            <button
              type="submit"
              disabled={addDomainMutation.isPending || !domainInput.trim()}
              className="h-11 rounded-(--r-sm) border border-black/70 bg-black px-5 text-sm font-semibold text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addDomainMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-5 text-sm text-(--muted)">
          Only workspace owners can save, verify, or remove domains.
        </p>
      )}

      {visibleError ? (
        <p className="mt-4 rounded-(--r-sm) border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {visibleError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-5 text-sm text-(--muted)">Loading domains...</p>
      ) : domains.length === 0 ? (
        <p className="mt-5 text-sm text-(--muted)">
          No custom domains configured yet.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {domains.map((domain) => {
            const isVerifyBusy =
              verifyDomainMutation.isPending &&
              verifyDomainMutation.variables === domain.domain;
            const isRemoveBusy =
              removeDomainMutation.isPending &&
              removeDomainMutation.variables === domain.domain;
            const isActionBusy = isVerifyBusy || isRemoveBusy;
            const displayStatus = domain.statusDetail.displayStatus;
            const isVerified = displayStatus === "verified";
            const isInvalidConfiguration =
              displayStatus === "invalid_configuration";
            const selectedTab =
              recordTabByDomain[domain.domain] ||
              domain.dnsConfig.recommendedType;
            const primaryRecords =
              selectedTab === "CNAME"
                ? [domain.dnsConfig.cnameRecord]
                : domain.dnsConfig.aRecords;

            return (
              <article
                key={domain.domain}
                className="rounded-(--r-md) border border-(--border) bg-(--bg) p-4 md:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-(--text)">
                      {domain.domain}
                    </p>
                    <p className="mt-1 text-xs text-(--muted)">
                      {isVerified
                        ? "Domain is active and routing."
                        : isInvalidConfiguration
                          ? "Domain is not correctly configured on DNS or SSL."
                          : "Pending DNS verification."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusChip displayStatus={displayStatus} />

                    {canManageDomains && !isVerified ? (
                      <button
                        type="button"
                        onClick={() => handleVerifyDomain(domain.domain)}
                        disabled={isActionBusy}
                        className="h-8 rounded-(--r-sm) border border-(--border) px-3 text-xs font-medium text-(--text) transition-colors hover:border-(--text)/35 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isVerifyBusy ? "Checking..." : "Check status"}
                      </button>
                    ) : null}

                    {canManageDomains ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(domain.domain)}
                        disabled={isActionBusy}
                        className="h-8 rounded-(--r-sm) border border-rose-300 px-3 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRemoveBusy ? "Removing..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {!isVerified ? (
                  <div className="mt-4 space-y-4">
                    <div
                      className={`rounded-(--r-sm) px-3 py-2 text-xs ${
                        isInvalidConfiguration
                          ? "border border-rose-200 bg-rose-50 text-rose-800"
                          : "border border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <p className="font-semibold">
                        {isInvalidConfiguration
                          ? "Invalid configuration"
                          : "DNS setup required"}
                      </p>
                      {isInvalidConfiguration ? (
                        <p className="mt-1">
                          Vercel cannot verify this domain yet. Fix DNS/SSL
                          settings, then run Check status.
                        </p>
                      ) : null}

                      {domain.warnings.map((warning) => (
                        <p key={`${domain.domain}:${warning}`} className="mt-1">
                          {warning}
                        </p>
                      ))}

                      {domain.statusDetail.providerStatusText ? (
                        <p className="mt-2 rounded bg-black/5 px-2 py-1 text-[11px] font-medium text-(--text)">
                          Vercel status:{" "}
                          {domain.statusDetail.providerStatusText}
                        </p>
                      ) : null}

                      {domain.statusDetail.providerReasons.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] font-semibold text-(--text)">
                            Provider details
                          </p>
                          {domain.statusDetail.providerReasons.map((reason) => (
                            <p
                              key={`${domain.domain}:provider-reason:${reason}`}
                              className="text-[11px]"
                            >
                              - {reason}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 border-b border-(--border) pb-2">
                        <button
                          type="button"
                          onClick={() => handleTabChange(domain.domain, "A")}
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            selectedTab === "A"
                              ? "bg-(--surface) text-(--text)"
                              : "text-(--muted)"
                          }`}
                        >
                          A record
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleTabChange(domain.domain, "CNAME")
                          }
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            selectedTab === "CNAME"
                              ? "bg-(--surface) text-(--text)"
                              : "text-(--muted)"
                          }`}
                        >
                          CNAME record (recommended)
                        </button>
                      </div>

                      <p className="mt-3 text-xs text-(--muted)">
                        Configure these DNS records for
                        <span className="mx-1 rounded bg-black/5 px-1.5 py-0.5 font-semibold text-(--text)">
                          {domain.domain}
                        </span>
                        on your DNS provider.
                      </p>

                      <div className="mt-3 space-y-2">
                        {primaryRecords.map((record) => (
                          <RecordRow
                            key={`${domain.domain}:${selectedTab}:${record.name}:${record.value}`}
                            domainKey={domain.domain}
                            record={record}
                            copiedKey={copiedKey}
                            onCopy={handleCopy}
                          />
                        ))}
                      </div>
                    </div>

                    {domain.dnsConfig.txtRecords.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-(--text)">
                          Verification TXT record
                        </p>
                        <div className="mt-2 space-y-2">
                          {domain.dnsConfig.txtRecords.map((record) => (
                            <RecordRow
                              key={`${domain.domain}:TXT:${record.name}:${record.value}`}
                              domainKey={domain.domain}
                              record={record}
                              copiedKey={copiedKey}
                              onCopy={handleCopy}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
