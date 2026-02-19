"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { workspace, workspaceMember } from "@/lib/db/schema";
import { protocol, rootDomain } from "@/lib/utils";
import {
  sanitizeWorkspaceSlug,
  validateWorkspaceSlug,
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

function isUniqueViolationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  if ("code" in error && error.code === "23505") {
    return true;
  }

  return false;
}

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
  const input: CreateWorkspaceInput = { companyName };

  const inputError = validateCreateWorkspaceInput(input);
  if (inputError) {
    return { error: inputError, companyName };
  }

  const normalizedName = companyName.trim().replace(/\s+/g, " ");
  const slug = sanitizeWorkspaceSlug(normalizedName);
  const slugError = validateWorkspaceSlug(slug);

  if (slugError) {
    return {
      error: slugError,
      companyName,
      suggestedUrl: slug ? `${slug}.${rootDomain}` : undefined,
    };
  }

  const [existingMembership] = await db
    .select({ workspaceSlug: workspace.slug })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, session.user.id))
    .limit(1);

  if (existingMembership?.workspaceSlug) {
    redirect(
      `${protocol}://${existingMembership.workspaceSlug}.${rootDomain}/dashboard`,
    );
  }

  const [existingWorkspace] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, slug))
    .limit(1);

  if (existingWorkspace) {
    return {
      error: "That workspace URL is already taken. Try a different company name.",
      companyName,
      suggestedUrl: `${slug}.${rootDomain}`,
    };
  }

  const workspaceId = crypto.randomUUID();

  try {
    await db.insert(workspace).values({
      id: workspaceId,
      name: normalizedName,
      slug,
      createdByUserId: session.user.id,
    });
    await db.insert(workspaceMember).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId: session.user.id,
      role: "owner",
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return {
        error:
          "That workspace URL is already in use. Please choose a different name.",
        companyName,
        suggestedUrl: `${slug}.${rootDomain}`,
      };
    }

    await db.delete(workspace).where(eq(workspace.id, workspaceId));
    throw error;
  }

  redirect(`${protocol}://${slug}.${rootDomain}/dashboard`);
}
