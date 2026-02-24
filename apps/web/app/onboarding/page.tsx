import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createPageMetadata } from "@/lib/seo";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";

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
  const redirectParams = new URLSearchParams();

  if (allowExistingMembership) {
    redirectParams.set("allowExistingMembership", "1");
  }

  if (companyName) {
    redirectParams.set("companyName", companyName);
  }

  const queryString = redirectParams.toString();
  redirect(queryString ? `/sign-up?${queryString}` : "/sign-up");
}
