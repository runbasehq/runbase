import type { ReactNode } from "react";

interface FeedbackResetPlaceholderProps {
  workspaceName: string;
  mode: "public" | "dashboard";
  children?: ReactNode;
}

export function FeedbackResetPlaceholder({
  workspaceName,
  mode,
  children,
}: FeedbackResetPlaceholderProps) {
  if (mode === "public") {
    return (
      <main
        className="min-h-screen bg-(--bg) px-6 py-16"
        data-ui-theme="agency-dashboard"
      >
        <div className="mx-auto w-full max-w-2xl rounded-(--r-md) border border-(--border) bg-(--surface) p-8 shadow-(--shadow-sm)">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
            Public feedback
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
            {workspaceName}
          </h1>
          <p className="mt-4 text-sm text-(--muted)">
            This page is being rebuilt from scratch.
          </p>
        </div>
      </main>
    );
  }

  return (
    <section className="p-6 md:p-10">
      {children ? <div className="w-full max-w-3xl">{children}</div> : null}

      <div className="mt-6 w-full max-w-3xl rounded-(--r-md) border border-(--border) bg-(--surface) p-8 shadow-(--shadow-sm)">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          {workspaceName}
        </h1>
        <p className="mt-4 text-sm text-(--muted)">
          This page is being rebuilt from scratch.
        </p>
      </div>
    </section>
  );
}
