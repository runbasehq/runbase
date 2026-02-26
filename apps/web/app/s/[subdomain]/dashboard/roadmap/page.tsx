import { Effect } from "effect";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { protocol, rootDomain } from "@/lib/utils";
import { FeedbackService } from "~/feedback/feedback.service";
import { DashboardRoadmapBoardClient } from "./dashboard-roadmap-board-client";

type DashboardRoadmapSort = "top" | "recent";

type DashboardRoadmapSearchParams = {
  post?: string | string[];
  sort?: string | string[];
};

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeSortMode(value: string | undefined): DashboardRoadmapSort {
  return value?.toLowerCase() === "recent" ? "recent" : "top";
}

export default async function DashboardRoadmapPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<DashboardRoadmapSearchParams>;
}) {
  const { subdomain } = await params;
  const resolvedSearchParams = await searchParams;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    notFound();
  }

  const snapshotProgram = Effect.gen(function* () {
    const settingsSnapshot =
      yield* FeedbackService.getSettingsSnapshotForWorkspaceMember({
        workspaceSlug: subdomain,
        userId: session.user.id,
      });

    const snapshot = yield* FeedbackService.getSnapshot({
      workspaceId: settingsSnapshot.workspaceId,
      userId: session.user.id,
      anonSessionId: null,
    });

    return {
      snapshot,
    };
  }).pipe(Effect.either);

  const snapshotResult = await appRuntime.runPromise(snapshotProgram);

  if (snapshotResult._tag === "Left") {
    const error = snapshotResult.left as { _tag?: string };

    if (
      error._tag === "FeedbackWorkspaceNotFound" ||
      error._tag === "FeedbackForbidden"
    ) {
      notFound();
    }

    console.error("Failed to load dashboard roadmap", {
      workspaceSlug: subdomain,
      userId: session.user.id,
      error,
    });

    return (
      <section className="p-6 md:p-8">
        <div className="w-full max-w-3xl rounded-(--r-md) border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            Roadmap
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-900">
            Roadmap unavailable
          </h1>
          <p className="mt-3 text-sm text-amber-800">
            We could not load your roadmap data right now.
          </p>
        </div>
      </section>
    );
  }

  const { snapshot } = snapshotResult.right;
  const publicWorkspaceUrl = `${protocol}://${subdomain}.${rootDomain}`;

  return (
    <DashboardRoadmapBoardClient
      snapshot={snapshot}
      workspaceSlug={subdomain}
      publicWorkspaceUrl={publicWorkspaceUrl}
      initialFilters={{
        sortMode: normalizeSortMode(getSingleParam(resolvedSearchParams.sort)),
        postId: getSingleParam(resolvedSearchParams.post) ?? null,
      }}
    />
  );
}
