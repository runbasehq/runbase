import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspace, workspaceMember } from "@/lib/db/schema";
import { extractSubdomainFromHeaders } from "@/lib/subdomains";
export {
  sanitizeWorkspaceSlug,
  validateWorkspaceSlug,
} from "~/workspace/schemas/workspace-slug";

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
