import "server-only";

import { getWorkspaceBySlug } from "@/lib/workspaces";

import { resolveWorkspaceSlugFromHeaders } from "./host-routing";

export async function resolveWorkspaceFromHeaders(
  headers: Pick<Headers, "get">,
) {
  const workspaceSlug = await resolveWorkspaceSlugFromHeaders(headers);

  if (!workspaceSlug) {
    return null;
  }

  return getWorkspaceBySlug(workspaceSlug);
}
