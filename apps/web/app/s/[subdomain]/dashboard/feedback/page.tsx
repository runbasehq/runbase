import { Effect } from "effect";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { protocol, rootDomain } from "@/lib/utils";
import { FeedbackService } from "~/feedback/feedback.service";
import { DashboardFeedbackBoardClient } from "./dashboard-feedback-board-client";

type DashboardFeedbackSearchParams = {
  board?: string | string[];
  post?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  status?: string | string[];
  tag?: string | string[];
  view?: string | string[];
};

type DashboardFeedbackSort = "recent" | "top" | "trending";

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeSortMode(
  sortParam: string | undefined,
  viewParam: string | undefined,
): DashboardFeedbackSort {
  const value = (sortParam ?? viewParam ?? "").toLowerCase();

  if (value === "top") {
    return "top";
  }

  if (value === "trending") {
    return "trending";
  }

  return "recent";
}

export default async function DashboardFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<DashboardFeedbackSearchParams>;
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

    console.error("Failed to load dashboard feedback board", {
      workspaceSlug: subdomain,
      userId: session.user.id,
      error,
    });

    return (
      <section className="p-6 md:p-8">
        <div className="w-full max-w-3xl rounded-(--r-md) border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            Feedback
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-900">
            Feedback board unavailable
          </h1>
          <p className="mt-3 text-sm text-amber-800">
            We could not load your feedback data right now.
          </p>
        </div>
      </section>
    );
  }

  const { snapshot } = snapshotResult.right;
  const publicWorkspaceUrl = `${protocol}://${subdomain}.${rootDomain}`;

  return (
    <DashboardFeedbackBoardClient
      snapshot={snapshot}
      workspaceSlug={subdomain}
      publicWorkspaceUrl={publicWorkspaceUrl}
      viewer={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
      initialFilters={{
        q: getSingleParam(resolvedSearchParams.q)?.trim() ?? "",
        sortMode: normalizeSortMode(
          getSingleParam(resolvedSearchParams.sort),
          getSingleParam(resolvedSearchParams.view),
        ),
        statusId: getSingleParam(resolvedSearchParams.status) ?? null,
        boardId: getSingleParam(resolvedSearchParams.board) ?? null,
        tagId: getSingleParam(resolvedSearchParams.tag) ?? null,
        postId: getSingleParam(resolvedSearchParams.post) ?? null,
      }}
    />
  );
}
