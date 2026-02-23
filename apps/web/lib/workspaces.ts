import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user, workspace, workspaceMember } from "@/lib/db/schema";
import { sendWorkspaceWelcomeEmail } from "@/lib/email/send-workspace-welcome-email";
import { extractSubdomainFromHeaders } from "@/lib/subdomains";
import { protocol, rootDomain } from "@/lib/utils";
import { validateCreateWorkspaceInput } from "~/workspace/schemas/create-workspace";
import {
  sanitizeWorkspaceSlug,
  validateWorkspaceSlug,
} from "~/workspace/schemas/workspace-slug";
export {
  sanitizeWorkspaceSlug,
  validateWorkspaceSlug,
} from "~/workspace/schemas/workspace-slug";

export type WorkspaceFeedbackAccess = "public" | "private";
export type WorkspacePrimaryGoal = "capture_manage_feedback";

type CreateWorkspaceForUserInput = {
  userId: string;
  companyName: string;
  feedbackAccess?: WorkspaceFeedbackAccess;
  primaryGoal?: WorkspacePrimaryGoal;
};

type CreateWorkspaceForUserResult =
  | {
      slug: string;
    }
  | {
      error: string;
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

async function sendWelcomeEmailIfNeeded({
  workspaceId,
  workspaceName,
  workspaceSlug,
  userId,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userId: string;
}) {
  const [claimedWorkspace] = await db
    .update(workspace)
    .set({
      welcomeEmailStatus: "sending",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workspace.id, workspaceId),
        eq(workspace.welcomeEmailStatus, "pending"),
      ),
    )
    .returning({
      id: workspace.id,
    });

  if (!claimedWorkspace) {
    return;
  }

  const [recipient] = await db
    .select({
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!recipient?.email) {
    await db
      .update(workspace)
      .set({
        welcomeEmailStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(workspace.id, workspaceId));
    return;
  }

  try {
    const workspaceUrl = `${protocol}://${workspaceSlug}.${rootDomain}/dashboard`;
    const messageId = await sendWorkspaceWelcomeEmail({
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      workspaceId,
      workspaceName,
      workspaceUrl,
    });

    await db
      .update(workspace)
      .set({
        welcomeEmailStatus: "sent",
        welcomeEmailSentAt: new Date(),
        welcomeEmailMessageId: messageId,
        updatedAt: new Date(),
      })
      .where(eq(workspace.id, workspaceId));
  } catch (error) {
    console.error("Failed to send workspace welcome email", {
      workspaceId,
      userId,
      error,
    });

    await db
      .update(workspace)
      .set({
        welcomeEmailStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(workspace.id, workspaceId));
  }
}

export async function createWorkspaceForUser({
  userId,
  companyName,
  feedbackAccess = "private",
  primaryGoal = "capture_manage_feedback",
}: CreateWorkspaceForUserInput): Promise<CreateWorkspaceForUserResult> {
  const inputError = validateCreateWorkspaceInput({ companyName });
  if (inputError) {
    return { error: inputError };
  }

  const normalizedName = companyName.trim().replace(/\s+/g, " ");
  const slug = sanitizeWorkspaceSlug(normalizedName);
  const slugError = validateWorkspaceSlug(slug);

  if (slugError) {
    return {
      error: slugError,
      suggestedUrl: slug ? `${slug}.${rootDomain}` : undefined,
    };
  }

  const [existingWorkspace] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, slug))
    .limit(1);

  if (existingWorkspace) {
    return {
      error:
        "That workspace URL is already taken. Try a different company name.",
      suggestedUrl: `${slug}.${rootDomain}`,
    };
  }

  const workspaceId = crypto.randomUUID();

  try {
    await db.insert(workspace).values({
      id: workspaceId,
      name: normalizedName,
      slug,
      feedbackAccess,
      primaryGoal,
      onboardingCompletedAt: new Date(),
      createdByUserId: userId,
    });

    await db.insert(workspaceMember).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId,
      role: "admin",
    });

    await sendWelcomeEmailIfNeeded({
      workspaceId,
      workspaceName: normalizedName,
      workspaceSlug: slug,
      userId,
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return {
        error:
          "That workspace URL is already in use. Please choose a different name.",
        suggestedUrl: `${slug}.${rootDomain}`,
      };
    }

    await db.delete(workspace).where(eq(workspace.id, workspaceId));
    throw error;
  }

  return { slug };
}

export async function getWorkspaceBySlug(slug: string) {
  const [foundWorkspace] = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.createdAt,
    })
    .from(workspace)
    .where(eq(workspace.slug, slug))
    .limit(1);

  return foundWorkspace ?? null;
}

export async function getUserWorkspaceMembershipBySlug(
  userId: string,
  slug: string,
) {
  const [membership] = await db
    .select({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(and(eq(workspaceMember.userId, userId), eq(workspace.slug, slug)))
    .limit(1);

  return membership ?? null;
}

export async function getFirstWorkspaceMembershipForUser(userId: string) {
  const [membership] = await db
    .select({
      workspaceSlug: workspace.slug,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, userId))
    .limit(1);

  return membership ?? null;
}

export async function getWorkspaceFromHeaders(headers: Pick<Headers, "get">) {
  const subdomain = extractSubdomainFromHeaders(headers);

  if (!subdomain) {
    return null;
  }

  return getWorkspaceBySlug(subdomain);
}
