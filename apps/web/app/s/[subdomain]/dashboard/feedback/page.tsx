import Link from "next/link";

const feedbackViews = [
  {
    href: "/dashboard/feedback?view=trending",
    label: "Trending",
    value: "trending",
  },
  { href: "/dashboard/feedback?view=top", label: "Top", value: "top" },
  { href: "/dashboard/feedback?view=new", label: "New", value: "new" },
] as const;

const feedbackPosts = [
  {
    href: "/dashboard/feedback?post=backlog-cut-35&view=top",
    title: "How we cut support backlog by 35%",
    subtitle: "A draft case study for the next release notes section.",
  },
  {
    href: "/dashboard/feedback?post=sla-alert-routing&view=trending",
    title: "SLA alerts should auto-route by product area",
    subtitle: "Placeholder request from enterprise support workflows.",
  },
  {
    href: "/dashboard/feedback?post=ai-reply-macros&view=new",
    title: "AI reply macros for repetitive tickets",
    subtitle: "Tentative item to validate with pilot customers.",
  },
] as const;

function normalizeFeedbackView(value: string | undefined) {
  if (value === "top" || value === "new") {
    return value;
  }

  return "trending";
}

export default async function DashboardFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string; view?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedView = normalizeFeedbackView(resolvedSearchParams.view);
  const selectedPost = resolvedSearchParams.post;

  return (
    <section className="p-6 md:p-10">
      <div className="w-full max-w-4xl rounded-(--r-md) border border-(--border) bg-(--surface) p-6 shadow-(--shadow-sm)">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Feedback
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Feedback board placeholder
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          This page is tentative, but links are usable and already connected to
          dashboard navigation.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {feedbackViews.map((view) => {
            const isActive = selectedView === view.value;

            return (
              <Link
                key={view.value}
                href={view.href}
                className={
                  isActive
                    ? "rounded-full border border-(--border-strong) bg-(--surface-2) px-3 py-1.5 text-xs font-medium text-(--text)"
                    : "rounded-full border border-(--border) px-3 py-1.5 text-xs font-medium text-(--muted) transition-colors hover:bg-(--surface-2) hover:text-(--text)"
                }
              >
                {view.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-3">
          {feedbackPosts.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="block rounded-(--r-sm) border border-(--border) bg-(--surface-2) px-4 py-3 transition-colors hover:border-(--border-strong)"
            >
              <p className="truncate text-sm font-medium text-(--text)">
                {post.title}
              </p>
              <p className="mt-1 text-xs text-(--muted)">{post.subtitle}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 rounded-(--r-sm) border border-dashed border-(--border) bg-(--surface-2) px-4 py-3">
          <p className="text-xs font-medium text-(--muted-2)">
            Selected post slug
          </p>
          <p className="mt-1 truncate text-sm text-(--text)">
            {selectedPost || "(none selected yet)"}
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard/changelog"
            className="text-sm font-medium text-(--text) underline underline-offset-4"
          >
            Go to changelog placeholder
          </Link>
        </div>
      </div>
    </section>
  );
}
