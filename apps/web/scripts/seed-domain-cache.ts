import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { workspace, workspaceDomain } from "../lib/db/schema";
import { getRedis } from "../lib/redis";
import {
  getCustomDomainCacheKey,
  normalizeHostname,
} from "../features/domains/lib/domain-cache";

async function main() {
  const rows = await db
    .select({
      domain: workspaceDomain.domain,
      workspaceSlug: workspace.slug,
    })
    .from(workspaceDomain)
    .innerJoin(workspace, eq(workspaceDomain.workspaceId, workspace.id))
    .where(eq(workspaceDomain.verificationStatus, "verified"));

  if (rows.length === 0) {
    process.stdout.write("No verified domains found\n");
    return;
  }

  const redis = getRedis();
  let seededCount = 0;

  for (const row of rows) {
    const hostname = normalizeHostname(row.domain);
    if (!hostname || !row.workspaceSlug) {
      continue;
    }

    await redis.set(getCustomDomainCacheKey(hostname), {
      workspaceSlug: row.workspaceSlug,
    });

    seededCount += 1;
  }

  process.stdout.write(`Seeded ${seededCount} domains in Redis\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});

export {};
