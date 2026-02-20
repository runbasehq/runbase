import {
  Clock01Icon,
  MailIcon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { StatusPill } from "~/workspace-dashboard/components/status-pill";
import type { DashboardThread } from "~/workspace-dashboard/lib/types";

export function DetailsRail({ thread }: { thread: DashboardThread }) {
  return (
    <aside className="h-full border-l border-(--border) bg-[#FCF6DE] [background:var(--details-rail-bg-gradient)] px-3 py-4">
      <div className="inline-flex rounded-(--r-sm) bg-(--surface-2) p-1">
        <button
          type="button"
          className="rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--text) shadow-(--shadow-sm)"
        >
          Details
        </button>
        <button
          type="button"
          className="rounded-(--r-sm) px-3 py-1.5 text-sm text-(--muted) hover:bg-(--surface)"
        >
          Chat
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-3 shadow-(--shadow-sm)">
          <h2 className="text-xs font-medium text-(--muted)">Summary</h2>
          <p className="mt-2 text-sm leading-6 text-(--text)">
            {thread.summary}
          </p>
        </section>

        <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-3 shadow-(--shadow-sm)">
          <h2 className="text-xs font-medium text-(--muted)">Participants</h2>
          <ul className="mt-2 divide-y divide-(--border)">
            {thread.participants.map((participant) => (
              <li
                key={participant.id}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div className="inline-flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-[10px] bg-(--info-soft) text-[#0369a1]">
                    <HugeiconsIcon
                      icon={UserIcon}
                      strokeWidth={2}
                      className="size-4"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-(--text)">
                      {participant.name}
                    </p>
                    <p className="truncate text-xs text-(--muted-2)">
                      {participant.email}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-(--muted-2)">
                  {participant.respondedAt}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-3 shadow-(--shadow-sm)">
          <h2 className="text-xs font-medium text-(--muted)">Notes</h2>
          <div className="mt-2 space-y-2">
            {thread.notes.map((note) => (
              <p
                key={note}
                className="rounded-(--r-sm) border border-(--border) bg-(--surface-2) px-3 py-2 text-sm text-(--text)"
              >
                {note}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-3 shadow-(--shadow-sm)">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium text-(--muted)">Tasks</h2>
            <StatusPill status={thread.status} />
          </div>
          <ul className="mt-2 space-y-2">
            {thread.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface-2) px-2.5 py-2"
              >
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-(--text)">
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2}
                    className="size-3.5 text-(--muted-2)"
                  />
                  <span className="truncate">{task.label}</span>
                </span>
                <span className="text-xs text-(--muted-2)">
                  {task.dueLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-3 shadow-(--shadow-sm)">
          <h2 className="text-xs font-medium text-(--muted)">Activity</h2>
          <ul className="mt-2 space-y-2">
            {thread.activity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 text-sm text-(--text)"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <HugeiconsIcon
                    icon={item.label.includes("email") ? MailIcon : Clock01Icon}
                    strokeWidth={2}
                    className="size-3.5 text-(--muted-2)"
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-xs text-(--muted-2)">{item.when}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
