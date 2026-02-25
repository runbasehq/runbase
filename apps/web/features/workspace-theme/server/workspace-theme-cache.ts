import "server-only";

import { Effect } from "effect";
import { revalidateTag, unstable_cache } from "next/cache";

import { appRuntime } from "@/lib/runtime";
import { DEFAULT_WORKSPACE_PUBLIC_THEME } from "~/workspace-theme/lib/theme-defaults";
import type { WorkspacePublicTheme } from "~/workspace-theme/lib/types";
import { WorkspaceThemeService } from "~/workspace-theme/workspace-theme.service";

const WORKSPACE_THEME_CACHE_TAG_PREFIX = "workspace-theme";

export function getWorkspaceThemeCacheTag(workspaceSlug: string) {
  return `${WORKSPACE_THEME_CACHE_TAG_PREFIX}:${workspaceSlug}`;
}

function createWorkspaceThemeLoader(workspaceSlug: string) {
  const cacheKey = ["workspace-public-theme", workspaceSlug];
  const cacheTag = getWorkspaceThemeCacheTag(workspaceSlug);

  return unstable_cache(
    async () => {
      const program = WorkspaceThemeService.getPublicThemeByWorkspaceSlug({
        workspaceSlug,
      }).pipe(
        Effect.match({
          onSuccess: (snapshot) => snapshot.theme,
          onFailure: () => ({ ...DEFAULT_WORKSPACE_PUBLIC_THEME }),
        }),
      );

      return appRuntime.runPromise(
        program as Effect.Effect<WorkspacePublicTheme, never, never>,
      );
    },
    cacheKey,
    {
      revalidate: false,
      tags: [cacheTag],
    },
  );
}

export async function getCachedPublicWorkspaceTheme(workspaceSlug: string) {
  const loader = createWorkspaceThemeLoader(workspaceSlug);
  return loader();
}

export function revalidateWorkspaceThemeCache(workspaceSlug: string) {
  revalidateTag(getWorkspaceThemeCacheTag(workspaceSlug), "max");
}
