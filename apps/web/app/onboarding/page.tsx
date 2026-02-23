import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import { getFirstWorkspaceMembershipForUser } from "@/lib/workspaces";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";
import { OnboardingForm } from "~/workspace/components/onboarding-form";

export const dynamic = "force-dynamic";

type OnboardingSearchParams = {
  companyName?: string | string[];
};

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<OnboardingSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const companyName = normalizeCompanyName(
    readSingleParam(resolvedSearchParams.companyName),
  );

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    const nextPath = companyName
      ? `/onboarding?companyName=${encodeURIComponent(companyName)}`
      : "/onboarding";

    const signInSearchParams = new URLSearchParams({ next: nextPath });
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

  return <OnboardingForm initialCompanyName={companyName} />;
}
