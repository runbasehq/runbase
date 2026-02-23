"use client";

import { motion } from "motion/react";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createWorkspaceAction,
  type CreateWorkspaceState,
} from "@/app/onboarding/actions";
import { RunbaseMark } from "@/components/logos/runbase-mark";
import { rootDomain } from "@/lib/utils";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";
import { sanitizeWorkspaceSlug } from "~/workspace/schemas/workspace-slug";

const initialState: CreateWorkspaceState = {};

export function OnboardingForm({
  initialCompanyName = "",
  allowExistingMembership = false,
}: {
  allowExistingMembership?: boolean;
  initialCompanyName?: string;
}) {
  const [companyName, setCompanyName] = useState(() =>
    normalizeCompanyName(initialCompanyName),
  );
  const [state, action, isPending] = useActionState(
    createWorkspaceAction,
    initialState,
  );

  useEffect(() => {
    if (typeof state.companyName === "string") {
      setCompanyName(state.companyName);
    }
  }, [state.companyName]);

  const previewSlug = useMemo(
    () => sanitizeWorkspaceSlug(companyName),
    [companyName],
  );

  return (
    <div className="min-h-screen bg-[#070a16] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[86vh] w-full max-w-xl flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full rounded-3xl border border-indigo-500/20 bg-[#090d1e]/90 p-8 shadow-[0_25px_60px_-22px_rgba(54,68,192,0.65)] backdrop-blur"
        >
          <div className="mb-9 flex flex-col items-center gap-5 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <RunbaseMark className="h-6 w-6 text-white/90" />
            </span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              What&apos;s your company&apos;s name?
            </h1>
          </div>

          <form action={action} className="space-y-6">
            <input
              type="hidden"
              name="allowExistingMembership"
              value={allowExistingMembership ? "1" : "0"}
            />
            <label className="block space-y-2">
              <span className="sr-only">Company name</span>
              <input
                id="companyName"
                name="companyName"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                required
                placeholder="Your company name"
                className="h-14 w-full rounded-2xl border border-indigo-400/35 bg-[#0c1227] px-5 text-lg text-white outline-none ring-0 transition-colors placeholder:text-zinc-400/80 focus:border-indigo-300"
              />
            </label>

            <motion.button
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isPending || !companyName.trim()}
              className="h-14 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-indigo-400 text-xl font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isPending ? "Creating workspace..." : "Go to last step"}
            </motion.button>

            {state.error ? (
              <p className="text-center text-sm text-rose-300">{state.error}</p>
            ) : null}
          </form>

          <div className="mt-10 text-center text-zinc-300">
            <p className="text-lg">Your workspace will be available at</p>
            <p className="mt-3 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-2xl font-medium text-zinc-100">
              {previewSlug || "subdomain"}.{rootDomain}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
