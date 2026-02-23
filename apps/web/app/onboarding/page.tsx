import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createPageMetadata } from "@/lib/seo";
import { protocol, rootDomain } from "@/lib/utils";
import { getFirstWorkspaceMembershipForUser } from "@/lib/workspaces";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";
import { OnboardingForm } from "~/workspace/components/onboarding-form";

export const metadata: Metadata = createPageMetadata({
  title: "Workspace Onboarding",
  description: "Complete onboarding to create your Runbase workspace.",
  path: "/onboarding",
  noIndex: true,
  keywords: ["runbase onboarding", "workspace setup"],
});

export const dynamic = "force-dynamic";

type OnboardingSearchParams = {
  allowExistingMembership?: string | string[];
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
  const allowExistingMembershipRaw = readSingleParam(
    resolvedSearchParams.allowExistingMembership,
  );
  const allowExistingMembership =
    allowExistingMembershipRaw === "1" ||
    allowExistingMembershipRaw.toLowerCase() === "true";

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    const nextParams = new URLSearchParams();

    if (companyName) {
      nextParams.set("companyName", companyName);
    }

    if (allowExistingMembership) {
      nextParams.set("allowExistingMembership", "1");
    }

    const nextPath = nextParams.size
      ? `/onboarding?${nextParams.toString()}`
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

  if (!allowExistingMembership && existingMembership?.workspaceSlug) {
    redirect(
      `${protocol}://${existingMembership.workspaceSlug}.${rootDomain}/dashboard`,
    );
  }

  return (
    <OnboardingForm
      initialCompanyName={companyName}
      allowExistingMembership={allowExistingMembership}
    />
  );
}
