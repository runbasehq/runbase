import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createPageMetadata } from "@/lib/seo";
import { protocol, rootDomain } from "@/lib/utils";
import {
  createWorkspaceForUser,
  getFirstWorkspaceMembershipForUser,
} from "@/lib/workspaces";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";

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
  companyName?: string | string[];
  feedbackAccess?: string | string[];
  primaryGoal?: string | string[];
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
  const feedbackAccess = feedbackAccessRaw === "public" ? "public" : "private";
  const primaryGoal =
    primaryGoalRaw === "capture_manage_feedback"
      ? "capture_manage_feedback"
      : "capture_manage_feedback";

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    const nextPath = `/onboarding/complete?companyName=${encodeURIComponent(companyName)}&feedbackAccess=${feedbackAccess}&primaryGoal=${primaryGoal}`;
    const signInSearchParams = new URLSearchParams({
      next: nextPath,
    });

    if (companyName) {
      signInSearchParams.set("companyName", companyName);
    }

    redirect(`/sign-in?${signInSearchParams.toString()}`);
  }

  const existingMembership = await getFirstWorkspaceMembershipForUser(
    session.user.id,
  );

  if (existingMembership?.workspaceSlug) {
    redirect(
      `${protocol}://${existingMembership.workspaceSlug}.${rootDomain}/dashboard`,
    );
  }

  if (!companyName.trim()) {
    redirect("/onboarding");
  }

  const result = await createWorkspaceForUser({
    userId: session.user.id,
    companyName,
    feedbackAccess,
    primaryGoal,
  });

  if ("error" in result) {
    redirect("/onboarding");
  }

  redirect(`${protocol}://${result.slug}.${rootDomain}/dashboard`);
}
