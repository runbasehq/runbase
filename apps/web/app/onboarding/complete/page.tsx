import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import {
  createWorkspaceForUser,
  getFirstWorkspaceMembershipForUser,
} from "@/lib/workspaces";

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
  const companyName = readSingleParam(resolvedSearchParams.companyName);
  const feedbackAccessRaw = readSingleParam(resolvedSearchParams.feedbackAccess);
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
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
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
