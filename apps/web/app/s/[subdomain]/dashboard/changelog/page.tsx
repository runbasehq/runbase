import Link from "next/link";

const changelogEntries = [
  {
    href: "/dashboard/changelog?entry=inbox-automation-milestones",
    title: "Roadmap: inbox automation milestones",
    summary:
      "Planned rollout for routing rules, templates, and SLA escalations.",
    tag: "Roadmap",
  },
  {
    href: "/dashboard/changelog?entry=smarter-triage-rules",
    title: "New release notes: smarter triage rules",
    summary:
      "Placeholder release note focused on auto-labeling and ownership hints.",
    tag: "Release",
  },
  {
    href: "/dashboard/changelog?entry=feedback-board-refresh",
    title: "Feedback board visual refresh",
    summary:
      "Tentative UI update for sorting, ranking, and moderation actions.",
    tag: "Design",
  },
] as const;

export default async function DashboardChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedEntry = resolvedSearchParams.entry;

  return (
    <section className="p-6 md:p-10">
      <div className="w-full max-w-4xl rounded-(--r-md) border border-(--border) bg-(--surface) p-6 shadow-(--shadow-sm)">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Changelog
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Changelog placeholder
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          Early version of the release stream. Entries are placeholders but
          links are wired and shareable.
        </p>

        <div className="mt-6 space-y-3">
          {changelogEntries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="block rounded-(--r-sm) border border-(--border) bg-(--surface-2) px-4 py-3 transition-colors hover:border-(--border-strong)"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-(--surface) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--muted-2)">
                  {entry.tag}
                </span>
                <p className="truncate text-sm font-medium text-(--text)">
                  {entry.title}
                </p>
              </div>
              <p className="mt-1 text-xs text-(--muted)">{entry.summary}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-(--r-sm) border border-dashed border-(--border) bg-(--surface-2) px-4 py-3">
          <p className="text-xs font-medium text-(--muted-2)">
            Selected changelog entry
          </p>
          <p className="mt-1 truncate text-sm text-(--text)">
            {selectedEntry || "(none selected yet)"}
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard/feedback"
            className="text-sm font-medium text-(--text) underline underline-offset-4"
          >
            Go to feedback placeholder
          </Link>
        </div>
      </div>
    </section>
  );
}
