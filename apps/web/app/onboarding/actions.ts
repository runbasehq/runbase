"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import {
  createWorkspaceForUser,
  getFirstWorkspaceMembershipForUser,
} from "@/lib/workspaces";
import {
  type CreateWorkspaceInput,
  normalizeCompanyName,
  validateCreateWorkspaceInput,
} from "~/workspace/schemas/create-workspace";

export type CreateWorkspaceState = {
  error?: string;
  companyName?: string;
  suggestedUrl?: string;
};

export async function createWorkspaceAction(
  _prevState: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const companyName = (formData.get("companyName") as string | null) ?? "";
  const normalizedCompanyName = normalizeCompanyName(companyName);
  const allowExistingMembershipRaw =
    (formData.get("allowExistingMembership") as string | null) ?? "0";
  const allowExistingMembership =
    allowExistingMembershipRaw === "1" ||
    allowExistingMembershipRaw.toLowerCase() === "true";
  const redirectToPaywallRaw =
    (formData.get("redirectToPaywall") as string | null) ?? "0";
  const redirectToPaywall =
    redirectToPaywallRaw === "1" ||
    redirectToPaywallRaw.toLowerCase() === "true";

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    const signUpParams = new URLSearchParams({
      allowExistingMembership: "1",
    });

    if (normalizedCompanyName) {
      signUpParams.set("companyName", normalizedCompanyName);
    }

    const nextPath = `/sign-up?${signUpParams.toString()}`;

    const signInSearchParams = new URLSearchParams({ next: nextPath });

    if (normalizedCompanyName) {
      signInSearchParams.set("companyName", normalizedCompanyName);
    }

    redirect(`/sign-in?${signInSearchParams.toString()}`);
  }

  const feedbackAccessRaw =
    (formData.get("feedbackAccess") as string | null) ?? "private";
  const feedbackAccess = feedbackAccessRaw === "public" ? "public" : "private";
  const input: CreateWorkspaceInput = { companyName };

  const inputError = validateCreateWorkspaceInput(input);
  if (inputError) {
    return { error: inputError, companyName };
  }

  const existingMembership = await getFirstWorkspaceMembershipForUser(
    session.user.id,
  );

  if (!allowExistingMembership && existingMembership?.workspaceSlug) {
    redirect(
      `${protocol}://${existingMembership.workspaceSlug}.${rootDomain}/dashboard`,
    );
  }

  const result = await createWorkspaceForUser({
    userId: session.user.id,
    companyName,
    feedbackAccess,
    primaryGoal: "capture_manage_feedback",
  });

  if ("error" in result) {
    return {
      error: result.error,
      companyName,
      suggestedUrl: result.suggestedUrl,
    };
  }

  if (redirectToPaywall) {
    const completeParams = new URLSearchParams({
      workspaceSlug: result.slug,
    });

    if (allowExistingMembership) {
      completeParams.set("allowExistingMembership", "1");
    }

    redirect(`/onboarding/complete?${completeParams.toString()}`);
  }

  redirect(`${protocol}://${result.slug}.${rootDomain}/dashboard`);
}
