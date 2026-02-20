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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in?next=/onboarding");
  }

  const companyName = (formData.get("companyName") as string | null) ?? "";
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

  if (existingMembership?.workspaceSlug) {
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

  redirect(`${protocol}://${result.slug}.${rootDomain}/dashboard`);
}
