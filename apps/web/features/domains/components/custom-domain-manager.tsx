"use client";

import { motion } from "motion/react";
import { useMemo, useState, type FormEvent } from "react";

import {
  useAddDomainMutation,
  useDomains,
  useRemoveDomainMutation,
  useVerifyDomainMutation,
} from "~/domains/hooks/use-domains";
import type { CustomDomain } from "~/domains/lib/types";

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

  const domainsQuery = useDomains({ workspaceSlug, initialDomains });
  const addDomainMutation = useAddDomainMutation(workspaceSlug);
  const verifyDomainMutation = useVerifyDomainMutation(workspaceSlug);
  const removeDomainMutation = useRemoveDomainMutation(workspaceSlug);

  const domains = domainsQuery.data ?? [];
  const isLoading = domainsQuery.isLoading;

  const pendingDomainCount = useMemo(
    () =>
      domains.filter((domain) => domain.verificationStatus === "pending")
        .length,
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

  const queryError =
    domainsQuery.error instanceof Error
      ? domainsQuery.error.message
      : domainsQuery.error
        ? "Unable to load domains"
        : null;

  const visibleError = error || queryError;

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
        <form
          onSubmit={handleAddDomain}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder="feedback.example.com"
            className="h-11 flex-1 rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 text-sm text-(--text) outline-none transition-colors focus:border-(--brand)"
          />
          <button
            type="submit"
            disabled={addDomainMutation.isPending || !domainInput.trim()}
            className="h-11 rounded-(--r-sm) bg-(--brand) px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addDomainMutation.isPending ? "Adding..." : "Add domain"}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-(--muted)">
          Only workspace owners can add or remove domains.
        </p>
      )}

      {visibleError ? (
        <p className="mt-4 text-sm text-rose-500">{visibleError}</p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-(--muted)">Loading domains...</p>
      ) : domains.length === 0 ? (
        <p className="mt-4 text-sm text-(--muted)">
          No custom domains configured yet.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {domains.map((domain) => {
            const isVerifyBusy =
              verifyDomainMutation.isPending &&
              verifyDomainMutation.variables === domain.domain;
            const isRemoveBusy =
              removeDomainMutation.isPending &&
              removeDomainMutation.variables === domain.domain;
            const isActionBusy = isVerifyBusy || isRemoveBusy;
            const isVerified = domain.verificationStatus === "verified";

            return (
              <div
                key={domain.domain}
                className="rounded-(--r-sm) border border-(--border) bg-(--bg) p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-(--text)">
                      {domain.domain}
                    </p>
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
                            {isVerifyBusy ? "Verifying..." : "Verify"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleRemoveDomain(domain.domain)}
                          disabled={isActionBusy}
                          className="h-8 rounded-(--r-sm) border border-rose-300 px-3 text-xs text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRemoveBusy ? "Removing..." : "Remove"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {!isVerified && domain.verificationRecords.length > 0 ? (
                  <div className="mt-4 rounded-(--r-sm) border border-dashed border-(--border) p-3 text-xs text-(--muted)">
                    <p className="font-medium text-(--text)">
                      DNS record to configure
                    </p>
                    <p className="mt-2">
                      Type: {domain.verificationRecords[0]?.type}
                    </p>
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
