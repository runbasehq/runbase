import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { auth } from "@/lib/auth";
import { createPageMetadata } from "@/lib/seo";
import { protocol, rootDomain } from "@/lib/utils";
import {
  createWorkspaceForUser,
  getFirstWorkspaceMembershipForUser,
  getUserWorkspaceMembershipBySlug,
} from "@/lib/workspaces";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";
import { OnboardingPaywallStep } from "~/workspace/components/onboarding-paywall-step";
import { validateWorkspaceSlug } from "~/workspace/schemas/workspace-slug";

export const metadata: Metadata = createPageMetadata({
  title: "Onboarding Complete",
  description:
    "Finalize your Runbase setup and launch your feedback workspace.",
  path: "/onboarding/complete",
  noIndex: true,
  keywords: ["runbase onboarding complete", "workspace provisioning"],
});

export const dynamic = "force-dynamic";

type OnboardingCompleteSearchParams = {
  allowExistingMembership?: string | string[];
  companyName?: string | string[];
  feedbackAccess?: string | string[];
  primaryGoal?: string | string[];
  workspaceSlug?: string | string[];
};

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function OnboardingCompletePage({
  searchParams,
}: {
  searchParams: Promise<OnboardingCompleteSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const companyName = normalizeCompanyName(
    readSingleParam(resolvedSearchParams.companyName),
  );
  const feedbackAccessRaw = readSingleParam(
    resolvedSearchParams.feedbackAccess,
  );
  const primaryGoalRaw = readSingleParam(resolvedSearchParams.primaryGoal);
  const workspaceSlugRaw = readSingleParam(resolvedSearchParams.workspaceSlug);
  const workspaceSlug = workspaceSlugRaw.trim().toLowerCase();
  const allowExistingMembershipRaw = readSingleParam(
    resolvedSearchParams.allowExistingMembership,
  );
  const allowExistingMembership =
    allowExistingMembershipRaw === "1" ||
    allowExistingMembershipRaw.toLowerCase() === "true";
  const feedbackAccess = feedbackAccessRaw === "public" ? "public" : "private";
  const primaryGoal =
    primaryGoalRaw === "capture_manage_feedback"
      ? "capture_manage_feedback"
      : "capture_manage_feedback";

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    const nextParams = new URLSearchParams();

    if (workspaceSlug) {
      nextParams.set("workspaceSlug", workspaceSlug);
    } else {
      nextParams.set("companyName", companyName);
      nextParams.set("feedbackAccess", feedbackAccess);
      nextParams.set("primaryGoal", primaryGoal);
    }

    if (allowExistingMembership) {
      nextParams.set("allowExistingMembership", "1");
    }

    const nextPath = `/onboarding/complete?${nextParams.toString()}`;
    const signInSearchParams = new URLSearchParams({
      next: nextPath,
    });

    if (companyName) {
      signInSearchParams.set("companyName", companyName);
    }

    redirect(`/sign-in?${signInSearchParams.toString()}`);
  }

  if (workspaceSlug && !validateWorkspaceSlug(workspaceSlug)) {
    const workspaceMembership = await getUserWorkspaceMembershipBySlug(
      session.user.id,
      workspaceSlug,
    );

    if (workspaceMembership?.workspaceSlug) {
      return (
        <div className="min-h-screen bg-[#f5f6f8]">
          <div className="flex min-h-screen w-full overflow-hidden bg-white">
            <aside className="relative hidden w-[40%] overflow-hidden border-r border-black/10 bg-[#050913] lg:flex">
              <Image
                src="/feedback.webp"
                alt="Product team shipping updates after reviewing feedback"
                fill
                priority
                sizes="40vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(3,7,14,0.92)_8%,rgba(4,8,14,0.76)_44%,rgba(5,8,13,0.42)_74%,rgba(5,8,13,0.56)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(90%_72%_at_14%_86%,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0)_64%)]" />
              <div className="absolute inset-x-0 bottom-0 h-[4px] bg-[linear-gradient(90deg,#CDFF29_0%,#E8B98B_52%,#FF7BCB_100%)]" />

              <div className="relative z-10 flex h-full w-full flex-col items-start justify-center px-14">
                <RunbaseLogo className="h-[24px] w-auto text-white/96 drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]" />
                <h2 className="mt-12 max-w-[470px] text-[46px] font-medium leading-[1.06] tracking-[-0.03em] text-white">
                  Build support and feedback workflows without slowing down.
                </h2>
                <p className="mt-4 max-w-[460px] text-base text-white/80">
                  Keep your support inbox, roadmap feedback, and product updates
                  in one focused workspace.
                </p>
              </div>
            </aside>

            <section className="relative flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10">
              <div className="absolute left-6 top-6 sm:left-10 sm:top-8">
                <Link
                  href="/"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  ← Home
                </Link>
              </div>

              <div className="w-full max-w-[430px]">
                <OnboardingPaywallStep
                  workspaceSlug={workspaceMembership.workspaceSlug}
                />
              </div>
            </section>
          </div>
        </div>
      );
    }
  }

  const existingMembership = await getFirstWorkspaceMembershipForUser(
    session.user.id,
  );

  if (!allowExistingMembership && existingMembership?.workspaceSlug) {
    redirect(
      `${protocol}://${existingMembership.workspaceSlug}.${rootDomain}/dashboard`,
    );
  }

  if (!companyName.trim()) {
    if (allowExistingMembership) {
      redirect("/sign-up?allowExistingMembership=1");
    }
    redirect("/onboarding");
  }

  const result = await createWorkspaceForUser({
    userId: session.user.id,
    companyName,
    feedbackAccess,
    primaryGoal,
  });

  if ("error" in result) {
    if (allowExistingMembership) {
      const retryParams = new URLSearchParams({
        allowExistingMembership: "1",
      });
      if (companyName) {
        retryParams.set("companyName", companyName);
      }
      redirect(`/sign-up?${retryParams.toString()}`);
    }
    redirect("/onboarding");
  }

  const completeParams = new URLSearchParams({
    workspaceSlug: result.slug,
  });
  if (allowExistingMembership) {
    completeParams.set("allowExistingMembership", "1");
  }
  redirect(`/onboarding/complete?${completeParams.toString()}`);
}
