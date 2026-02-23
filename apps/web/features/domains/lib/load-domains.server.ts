import "server-only";

import { Effect } from "effect";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { DomainsService } from "~/domains/domains.service";
import type { CustomDomain } from "~/domains/lib/types";

export async function loadDomainsForWorkspace(workspaceSlug: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return [] as CustomDomain[];
  }

  const program = DomainsService.listDomains({
    workspaceSlug,
    userId: session.user.id,
  }).pipe(
    Effect.match({
      onSuccess: (domains) => domains,
      onFailure: (error) => {
        console.error("Failed to load workspace domains", error);
        return [] as CustomDomain[];
      },
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<CustomDomain[], never, never>,
  );
}
