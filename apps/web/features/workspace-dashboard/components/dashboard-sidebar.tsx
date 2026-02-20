import {
  CalendarIcon,
  File01Icon,
  FolderIcon,
  HelpCircleIcon,
  Home01Icon,
  MailIcon,
  PlusSignIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";

import { WorkspaceSignOutButton } from "~/workspace/components/workspace-sign-out-button";

const navGroups = [
  {
    label: "Main",
    items: [
      { id: "home", label: "Home", icon: Home01Icon, active: false },
      { id: "inbox", label: "Inbox", icon: MailIcon, active: true },
      { id: "contacts", label: "Contacts", icon: UserIcon, active: false },
      { id: "tasks", label: "Tasks", icon: FolderIcon, active: false },
      { id: "documents", label: "Documents", icon: File01Icon, active: false },
      { id: "calendar", label: "Calendar", icon: CalendarIcon, active: false },
    ],
  },
];

export function DashboardSidebar({
  workspaceName,
  viewerEmail,
}: {
  workspaceName: string;
  viewerEmail: string;
}) {
  return (
    <aside className="flex h-full flex-col border-r border-(--border) bg-(--sidebar) px-3 py-4">
      <div className="rounded-(--r-sm) border border-(--border) bg-(--surface) px-2.5 py-2 shadow-(--shadow-sm)">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-(--text)">
            <span className="inline-flex size-6 items-center justify-center rounded-[8px] bg-(--primary-soft) text-(--primary)">
              <HugeiconsIcon
                icon={MailIcon}
                strokeWidth={2}
                className="size-4"
              />
            </span>
            {workspaceName}
          </div>
          <button
            type="button"
            className="rounded-(--r-sm) border border-(--border) bg-(--surface) px-1.5 py-0.5 text-xs text-(--muted-2) hover:bg-(--surface-2)"
          >
            v
          </button>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text) shadow-(--shadow-sm) hover:bg-(--surface-2)"
      >
        <HugeiconsIcon
          icon={PlusSignIcon}
          strokeWidth={2}
          className="size-4 text-(--muted)"
        />
        Compose
      </button>

      {navGroups.map((group) => (
        <div key={group.label} className="mt-6">
          <p className="px-3 text-xs font-medium text-(--muted-2)">
            {group.label}
          </p>
          <nav className="mt-2 space-y-1">
            {group.items.map((item, index) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * 0.03,
                  duration: 0.2,
                  ease: "easeOut",
                }}
                className={[
                  "flex w-full items-center gap-3 rounded-(--r-sm) px-3 py-2 text-sm transition-colors",
                  item.active
                    ? "border border-(--border) bg-(--surface) text-(--text) shadow-(--shadow-sm)"
                    : "text-(--muted) hover:bg-(--surface-2)",
                ].join(" ")}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  strokeWidth={2}
                  className={
                    item.active
                      ? "size-5 text-(--text)"
                      : "size-5 text-(--muted-2)"
                  }
                />
                {item.label}
              </motion.button>
            ))}
          </nav>
        </div>
      ))}

      <div className="mt-auto space-y-2 px-2">
        <p className="text-xs text-(--muted-2)">Signed in as</p>
        <p className="truncate text-sm text-(--muted)">{viewerEmail}</p>
        <WorkspaceSignOutButton className="w-full justify-center rounded-(--r-sm) border-(--border) bg-(--surface) text-(--text) hover:bg-(--surface-2)" />
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-(--r-sm) px-3 py-2 text-sm text-(--muted) hover:bg-(--surface-2)"
        >
          <HugeiconsIcon
            icon={HelpCircleIcon}
            strokeWidth={2}
            className="size-4 text-(--muted-2)"
          />
          Help
        </button>
      </div>
    </aside>
  );
}
