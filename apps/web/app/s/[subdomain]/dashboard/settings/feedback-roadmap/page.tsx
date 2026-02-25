import { Effect } from "effect";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { FeedbackRoadmapSettings } from "~/feedback/components/feedback-roadmap-settings";
import { FeedbackService } from "~/feedback/feedback.service";

export default async function DashboardFeedbackRoadmapSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    notFound();
  }

  const program = FeedbackService.getSettingsSnapshotForWorkspaceMember({
    workspaceSlug: subdomain,
    userId: session.user.id,
  }).pipe(Effect.either);
  const settingsResult = await appRuntime.runPromise(program);

  if (settingsResult._tag === "Left") {
    const error = settingsResult.left as { _tag?: string };

    if (error._tag === "FeedbackWorkspaceNotFound") {
      notFound();
    }

    console.error("Failed to load feedback roadmap settings", {
      workspaceSlug: subdomain,
      userId: session.user.id,
      error,
    });

    return (
      <section className="p-6 md:p-10">
        <div className="w-full max-w-3xl rounded-(--r-md) border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            Settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-900">
            Feedback & roadmap unavailable
          </h1>
          <p className="mt-3 text-sm text-amber-800">
            We could not load feedback settings right now.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Run{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-medium">
              pnpm --filter web run db:migrate
            </code>{" "}
            and refresh this page.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 md:p-10">
      <div className="mb-6 w-full max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Feedback & roadmap
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          Manage tags, boards, statuses, and public board behavior.
        </p>
      </div>

      <FeedbackRoadmapSettings initialSnapshot={settingsResult.right} />
    </section>
  );
}
