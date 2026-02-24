import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspace, workspaceDomain } from "@/lib/db/schema";
import { getRedis } from "@/lib/redis";

import { getCustomDomainCacheKey, normalizeHostname } from "./domain-cache";

async function readWorkspaceSlugFromCache(hostname: string) {
  const cached = await getRedis().get<{ workspaceSlug?: string } | string>(
    getCustomDomainCacheKey(hostname),
  );

  if (typeof cached === "string") {
    return cached;
  }

  if (cached && typeof cached.workspaceSlug === "string") {
    return cached.workspaceSlug;
  }

  return null;
}

async function readWorkspaceSlugFromDatabase(hostname: string) {
  const [row] = await db
    .select({ workspaceSlug: workspace.slug })
    .from(workspaceDomain)
    .innerJoin(workspace, eq(workspaceDomain.workspaceId, workspace.id))
    .where(
      and(
        eq(workspaceDomain.domain, hostname),
        eq(workspaceDomain.verificationStatus, "verified"),
      ),
    )
    .limit(1);

  return row?.workspaceSlug ?? null;
}

export async function getVerifiedWorkspaceSlugForDomain(rawHostname: string) {
  const hostname = normalizeHostname(rawHostname);
  if (!hostname) {
    return null;
  }

  try {
    const cachedWorkspaceSlug = await readWorkspaceSlugFromCache(hostname);
    if (cachedWorkspaceSlug) {
      return cachedWorkspaceSlug;
    }
  } catch {
    return null;
  }

  try {
    const databaseWorkspaceSlug = await readWorkspaceSlugFromDatabase(hostname);
    if (!databaseWorkspaceSlug) {
      return null;
    }

    await getRedis().set(getCustomDomainCacheKey(hostname), {
      workspaceSlug: databaseWorkspaceSlug,
    });

    return databaseWorkspaceSlug;
  } catch {
    return null;
  }
}

export async function isVerifiedCustomDomain(rawHostname: string) {
  const workspaceSlug = await getVerifiedWorkspaceSlugForDomain(rawHostname);
  return typeof workspaceSlug === "string" && workspaceSlug.length > 0;
}
