import { Effect } from "effect";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { WorkspaceThemeEditor } from "~/workspace-theme/components/workspace-theme-editor";
import type { WorkspaceThemeSnapshot } from "~/workspace-theme/lib/types";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { WorkspaceThemeService } from "~/workspace-theme/workspace-theme.service";
import { getPublicFeedbackPageData } from "~/feedback/server/get-public-feedback-page-data";

export default async function DashboardThemePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const workspace = await getWorkspaceBySlug(subdomain);

  if (!workspace) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    notFound();
  }

  const program = WorkspaceThemeService.getThemeForWorkspaceMember({
    workspaceSlug: subdomain,
    userId: session.user.id,
  }).pipe(Effect.either);
  const themeResult = await appRuntime.runPromise(program);

  if (themeResult._tag === "Left") {
    const error = themeResult.left as { _tag?: string };

    if (error._tag === "WorkspaceThemeWorkspaceNotFound") {
      notFound();
    }

    console.error("Failed to load workspace theme snapshot", {
      workspaceSlug: subdomain,
      userId: session.user.id,
      error,
    });

    return (
      <section className="p-6 md:p-10">
        <div className="w-full max-w-2xl rounded-(--r-md) border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            Workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-900">
            Theme editor unavailable
          </h1>
          <p className="mt-3 text-sm text-amber-800">
            We could not load theme settings right now.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            If you just pulled new code, run{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-medium">
              pnpm --filter web run db:migrate
            </code>{" "}
            and refresh this page.
          </p>
        </div>
      </section>
    );
  }

  const initialSnapshot = themeResult.right as WorkspaceThemeSnapshot;
  const pageData = await getPublicFeedbackPageData(subdomain);

  if (!pageData) {
    notFound();
  }

  return (
    <WorkspaceThemeEditor
      workspaceSlug={workspace.slug}
      workspaceName={workspace.name}
      initialSnapshot={initialSnapshot}
      previewData={{
        initialPosts: pageData.initialPosts,
        isAuthenticated: pageData.isAuthenticated,
        viewer: pageData.viewer,
        isWorkspaceOwner: pageData.isWorkspaceOwner,
        githubAuthEnabled: pageData.githubAuthEnabled,
        defaultBoard: pageData.defaultBoard,
        defaultStatus: pageData.defaultStatus,
      }}
    />
  );
}
