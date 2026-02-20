"use client";

import {
  Menu01Icon,
  PlusSignIcon,
  RightToLeftListBulletIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { protocol, rootDomain } from "@/lib/utils";
import { DashboardSidebar } from "~/workspace-dashboard/components/dashboard-sidebar";
import { DetailsRail } from "~/workspace-dashboard/components/details-rail";
import { ThreadDetailPane } from "~/workspace-dashboard/components/thread-detail-pane";
import type { DashboardThread } from "~/workspace-dashboard/lib/types";

interface WorkspaceDashboardShellProps {
  workspaceName: string;
  workspaceSlug: string;
  viewerEmail: string;
  threads: DashboardThread[];
}

export function WorkspaceDashboardShell({
  workspaceName,
  workspaceSlug,
  viewerEmail,
  threads,
}: WorkspaceDashboardShellProps) {
  const [selectedThreadId] = useState(threads[0]?.id ?? "");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const selectedThread = useMemo(
    () =>
      threads.find((thread) => thread.id === selectedThreadId) ?? threads[0],
    [selectedThreadId, threads],
  );

  if (!selectedThread) {
    return null;
  }

  return (
    <div
      data-ui-theme="agency-dashboard"
      className="min-h-screen bg-(--bg) text-(--text)"
    >
      <div className="mx-auto px-3 py-3 sm:px-5 sm:py-5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden rounded-(--r-md) border border-(--border) bg-(--surface) shadow-(--shadow-sm)"
        >
          <div className="flex items-center justify-between border-b border-(--border) bg-(--surface) px-4 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--muted) hover:bg-(--surface-2)"
            >
              <HugeiconsIcon
                icon={Menu01Icon}
                strokeWidth={2}
                className="size-4 text-(--muted-2)"
              />
              Menu
            </button>

            <Link
              href={`${protocol}://${workspaceSlug}.${rootDomain}`}
              className="inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--muted) hover:bg-(--surface-2)"
            >
              <HugeiconsIcon
                icon={ViewIcon}
                strokeWidth={2}
                className="size-4 text-(--muted-2)"
              />
              Public page
            </Link>

            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--muted) hover:bg-(--surface-2)"
            >
              <HugeiconsIcon
                icon={RightToLeftListBulletIcon}
                strokeWidth={2}
                className="size-4 text-(--muted-2)"
              />
              Details
            </button>
          </div>

          <div className="grid min-h-[calc(100vh-24px)] xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
            <div className="hidden xl:block">
              <DashboardSidebar
                workspaceName={workspaceName}
                viewerEmail={viewerEmail}
              />
            </div>

            <div className="min-w-0 border-r border-(--border) xl:border-r xl:border-(--border)">
              <div className="hidden items-center justify-end gap-2 border-b border-(--border) px-8 py-3 xl:flex">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--muted) hover:bg-(--surface-2)"
                >
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    strokeWidth={2}
                    className="size-4 text-(--muted-2)"
                  />
                  New note
                </button>
                <Link
                  href={`${protocol}://${workspaceSlug}.${rootDomain}`}
                  className="inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--muted) hover:bg-(--surface-2)"
                >
                  <HugeiconsIcon
                    icon={ViewIcon}
                    strokeWidth={2}
                    className="size-4 text-(--muted-2)"
                  />
                  View public page
                </Link>
              </div>
              <ThreadDetailPane thread={selectedThread} />
            </div>

            <div className="hidden xl:block">
              <DetailsRail thread={selectedThread} />
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isSidebarOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 xl:hidden"
            />
            <motion.div
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-72 overflow-hidden rounded-r-(--r-lg) border-r border-(--border) bg-(--sidebar) xl:hidden"
            >
              <DashboardSidebar
                workspaceName={workspaceName}
                viewerEmail={viewerEmail}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailsOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 xl:hidden"
            />
            <motion.div
              initial={{ x: 28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-y-0 right-0 z-50 w-[22rem] overflow-hidden rounded-l-(--r-lg) border-l border-(--border) xl:hidden"
            >
              <DetailsRail thread={selectedThread} />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
