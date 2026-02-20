import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MailIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { DashboardThread } from "~/workspace-dashboard/lib/types";

export function ThreadDetailPane({ thread }: { thread: DashboardThread }) {
  return (
    <section className="flex min-w-0 flex-col bg-(--surface) px-5 py-5 sm:px-8 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-(--muted-2)">
            {thread.breadcrumb.join(" > ")}
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-[-0.01em] text-(--text)">
            {thread.title}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-(--muted-2)">Last activity</p>
          <p className="mt-1 text-sm text-(--muted)">{thread.lastActivity}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {thread.messages.map((message) => (
          <article
            key={message.id}
            className="rounded-(--r-md) border border-(--border) bg-(--surface) shadow-(--shadow-sm)"
          >
            <header className="flex items-center justify-between gap-4 border-b border-(--border) px-4 py-3">
              <div className="inline-flex items-center gap-2 text-sm text-(--muted)">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-(--surface-2) text-(--muted-2)">
                  <HugeiconsIcon
                    icon={message.senderType === "you" ? UserIcon : MailIcon}
                    strokeWidth={2}
                    className="size-3"
                  />
                </span>
                {message.sender}
              </div>

              <div className="inline-flex items-center gap-2 text-xs text-(--muted-2)">
                <span>{message.sentAt}</span>
                <button
                  type="button"
                  className="rounded-(--r-sm) p-1 hover:bg-(--surface-2)"
                >
                  <HugeiconsIcon
                    icon={ArrowLeft01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </button>
                <button
                  type="button"
                  className="rounded-(--r-sm) p-1 hover:bg-(--surface-2)"
                >
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                </button>
              </div>
            </header>

            <div className="space-y-4 px-4 py-4 text-sm leading-6 text-(--text)">
              {message.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
