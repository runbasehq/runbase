"use client";

import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "~/dashboard/components/dashboard-sidebar";

export interface DashboardWorkspaceOption {
  connectedDomain?: string | null;
  name: string;
  role: "admin" | "contributor";
  slug: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  organizationName: string;
  workspaces: DashboardWorkspaceOption[];
  user: {
    email?: string | null;
    image?: string | null;
    name?: string | null;
  };
}

function DashboardShellSidebar({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DashboardShellMain({ children }: { children: React.ReactNode }) {
  return <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>;
}

function DashboardShellRoot({
  children,
  organizationName,
  workspaces,
  user,
}: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div
      className="h-screen overflow-hidden bg-(--bg) text-(--text)"
      data-ui-theme="agency-dashboard"
    >
      <div className="flex h-full overflow-hidden">
        <DashboardSidebar
          className="hidden md:block"
          organizationName={organizationName}
          workspaces={workspaces}
          user={user}
        />

        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 flex h-14 items-center border-b border-(--border) bg-(--bg)/95 px-4 backdrop-blur md:hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
              <span className="sr-only">Open sidebar</span>
            </Button>
            <p className="ml-2 truncate text-sm font-semibold">
              {organizationName}
            </p>
          </header>

          <DashboardShellMain>{children}</DashboardShellMain>
        </div>
      </div>

      <AnimatePresence>
        {mobileSidebarOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-40 md:hidden"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <DashboardSidebar
                className="h-full"
                onNavigate={() => setMobileSidebarOpen(false)}
                organizationName={organizationName}
                workspaces={workspaces}
                user={user}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const DashboardShell = Object.assign(DashboardShellRoot, {
  Main: DashboardShellMain,
  Sidebar: DashboardShellSidebar,
});
