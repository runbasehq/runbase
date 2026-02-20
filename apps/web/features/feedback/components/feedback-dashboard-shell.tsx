"use client";

import {
  Menu01Icon,
  RightToLeftListBulletIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import type { FeedbackSnapshot } from "~/feedback/lib/types";
import { usePosts } from "~/posts/hooks/use-posts";

import { FeedbackAuthActions } from "./feedback-auth-actions";
import { UpvoteButton } from "./upvote-button";

interface FeedbackDashboardShellProps {
  workspaceName: string;
  workspaceSlug: string;
  snapshot: FeedbackSnapshot;
  viewerEmail?: string;
  mode: "public" | "dashboard";
  isAuthenticated: boolean;
  dashboardHref: string;
  signInHref: string;
  callbackUrl: string;
  githubAuthEnabled: boolean;
  publicHref: string;
}

export function FeedbackDashboardShell({
  workspaceName,
  workspaceSlug,
  snapshot,
  viewerEmail,
  mode,
  isAuthenticated,
  dashboardHref,
  signInHref,
  callbackUrl,
  githubAuthEnabled,
  publicHref,
}: FeedbackDashboardShellProps) {
  const [activeBoardId, setActiveBoardId] = useState<string | null>(
    snapshot.boards.find((board) => board.isDefault)?.id ??
      snapshot.boards[0]?.id ??
      null,
  );
  const [activeStatusId, setActiveStatusId] = useState<string>("all");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(
    snapshot.posts[0]?.id ?? null,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { data: posts = snapshot.posts } = usePosts({
    workspaceSlug,
    initialPosts: snapshot.posts,
  });

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const boardMatch = activeBoardId ? post.boardId === activeBoardId : true;
      const statusMatch =
        activeStatusId === "all" ? true : post.statusId === activeStatusId;
      return boardMatch && statusMatch;
    });
  }, [activeBoardId, activeStatusId, posts]);

  const selectedPost =
    filteredPosts.find((post) => post.id === selectedPostId) ??
    filteredPosts[0] ??
    null;

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
              href={mode === "dashboard" ? publicHref : dashboardHref}
              className="inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--muted) hover:bg-(--surface-2)"
            >
              <HugeiconsIcon
                icon={ViewIcon}
                strokeWidth={2}
                className="size-4 text-(--muted-2)"
              />
              {mode === "dashboard" ? "Public page" : "Dashboard"}
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

          <div className="grid min-h-[calc(100vh-24px)] xl:grid-cols-[15rem_minmax(0,1fr)_22rem]">
            <aside className="hidden border-r border-(--border) bg-(--sidebar) p-4 xl:block">
              <SidePanel
                workspaceName={workspaceName}
                workspaceSlug={workspaceSlug}
                viewerEmail={viewerEmail}
                activeBoardId={activeBoardId}
                setActiveBoardId={setActiveBoardId}
                activeStatusId={activeStatusId}
                setActiveStatusId={setActiveStatusId}
                snapshot={snapshot}
              />
            </aside>

            <section className="min-w-0 border-r border-(--border)">
              <div className="hidden items-center justify-between gap-3 border-b border-(--border) px-6 py-3 xl:flex">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-(--muted-2)">
                    {mode === "dashboard"
                      ? "Workspace dashboard"
                      : "Public feedback"}
                  </p>
                  <h1 className="text-lg font-semibold text-(--text)">
                    {workspaceName}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={mode === "dashboard" ? publicHref : dashboardHref}
                    className="inline-flex items-center gap-2 rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--muted) hover:bg-(--surface-2)"
                  >
                    <HugeiconsIcon
                      icon={ViewIcon}
                      strokeWidth={2}
                      className="size-4 text-(--muted-2)"
                    />
                    {mode === "dashboard"
                      ? "View public page"
                      : "Open dashboard"}
                  </Link>

                  <FeedbackAuthActions
                    isAuthenticated={isAuthenticated}
                    dashboardHref={dashboardHref}
                    signInHref={signInHref}
                    callbackUrl={callbackUrl}
                    githubAuthEnabled={githubAuthEnabled}
                  />
                </div>
              </div>

              <div className="border-b border-(--border) px-4 py-3 sm:px-6">
                <h2 className="text-sm font-semibold text-(--text)">
                  Top requests
                </h2>
              </div>

              <div className="space-y-2 p-3 sm:p-4">
                <AnimatePresence initial={false} mode="popLayout">
                  {filteredPosts.map((post) => (
                    <motion.article
                      key={post.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="cursor-pointer rounded-(--r-sm) border border-(--border) bg-(--surface) p-4 transition hover:border-(--border-strong)"
                      onClick={() => setSelectedPostId(post.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-(--text)">
                            {post.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-(--muted)">
                            {post.content}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-(--muted-2)">
                            <span>{post.boardName}</span>
                            <span>-</span>
                            <span>{post.statusLabel}</span>
                          </div>
                        </div>
                        <UpvoteButton
                          workspaceSlug={workspaceSlug}
                          postId={post.id}
                          initialCount={post.upvoteCount}
                          initialHasVoted={post.viewerHasVoted}
                        />
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>

                {!filteredPosts.length ? (
                  <div className="rounded-(--r-sm) border border-dashed border-(--border) bg-(--surface-2) p-6 text-center">
                    <p className="text-sm font-medium text-(--text)">
                      No posts yet
                    </p>
                    <p className="mt-1 text-sm text-(--muted)">
                      Start collecting feedback from users on this board.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="hidden bg-(--surface-2) p-4 sm:p-6 xl:block">
              <DetailsPanel
                workspaceSlug={workspaceSlug}
                selectedPost={selectedPost}
              />
            </aside>
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
              className="fixed inset-y-0 left-0 z-50 w-72 overflow-hidden rounded-r-(--r-lg) border-r border-(--border) bg-(--sidebar) p-4 xl:hidden"
            >
              <SidePanel
                workspaceName={workspaceName}
                workspaceSlug={workspaceSlug}
                viewerEmail={viewerEmail}
                activeBoardId={activeBoardId}
                setActiveBoardId={setActiveBoardId}
                activeStatusId={activeStatusId}
                setActiveStatusId={setActiveStatusId}
                snapshot={snapshot}
                footer={
                  <FeedbackAuthActions
                    isAuthenticated={isAuthenticated}
                    dashboardHref={dashboardHref}
                    signInHref={signInHref}
                    callbackUrl={callbackUrl}
                    githubAuthEnabled={githubAuthEnabled}
                  />
                }
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
              className="fixed inset-y-0 right-0 z-50 w-[22rem] overflow-hidden rounded-l-(--r-lg) border-l border-(--border) bg-(--surface-2) p-4 xl:hidden"
            >
              <DetailsPanel
                workspaceSlug={workspaceSlug}
                selectedPost={selectedPost}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SidePanel({
  workspaceName,
  workspaceSlug,
  viewerEmail,
  activeBoardId,
  setActiveBoardId,
  activeStatusId,
  setActiveStatusId,
  snapshot,
  footer,
}: {
  workspaceName: string;
  workspaceSlug: string;
  viewerEmail?: string;
  activeBoardId: string | null;
  setActiveBoardId: (value: string) => void;
  activeStatusId: string;
  setActiveStatusId: (value: string) => void;
  snapshot: FeedbackSnapshot;
  footer?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-(--muted-2)">
          {workspaceSlug}
        </p>
        <h2 className="mt-1 text-sm font-semibold text-(--text)">
          {workspaceName}
        </h2>
        {viewerEmail ? (
          <p className="mt-1 text-xs text-(--muted-2)">{viewerEmail}</p>
        ) : (
          <p className="mt-1 text-xs text-(--muted-2)">
            Anonymous voting enabled
          </p>
        )}
      </div>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
        Boards
      </p>
      <div className="space-y-1">
        {snapshot.boards.map((board) => (
          <button
            key={board.id}
            type="button"
            onClick={() => setActiveBoardId(board.id)}
            className="w-full rounded-(--r-sm) px-3 py-2 text-left text-sm transition"
            style={{
              backgroundColor:
                activeBoardId === board.id
                  ? "var(--primary-soft)"
                  : "transparent",
              color:
                activeBoardId === board.id ? "var(--primary)" : "var(--muted)",
            }}
          >
            {board.name}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
        Status
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveStatusId("all")}
          className="rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            borderColor:
              activeStatusId === "all" ? "var(--primary)" : "var(--border)",
            color: activeStatusId === "all" ? "var(--primary)" : "var(--muted)",
            backgroundColor:
              activeStatusId === "all"
                ? "var(--primary-soft)"
                : "var(--surface)",
          }}
        >
          All
        </button>
        {snapshot.statuses.map((status) => (
          <button
            key={status.id}
            type="button"
            onClick={() => setActiveStatusId(status.id)}
            className="rounded-full border px-3 py-1 text-xs font-medium"
            style={{
              borderColor:
                activeStatusId === status.id
                  ? "var(--primary)"
                  : "var(--border)",
              color:
                activeStatusId === status.id
                  ? "var(--primary)"
                  : "var(--muted)",
              backgroundColor:
                activeStatusId === status.id
                  ? "var(--primary-soft)"
                  : "var(--surface)",
            }}
          >
            {status.label}
          </button>
        ))}
      </div>

      {footer ? <div className="mt-auto pt-5">{footer}</div> : null}
    </div>
  );
}

function DetailsPanel({
  workspaceSlug,
  selectedPost,
}: {
  workspaceSlug: string;
  selectedPost: FeedbackSnapshot["posts"][number] | null;
}) {
  if (!selectedPost) {
    return (
      <div className="rounded-(--r-sm) border border-dashed border-(--border) bg-(--surface) p-6">
        <p className="text-sm text-(--muted)">Select a post to see details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Post details
        </p>
        <h3 className="text-xl font-semibold tracking-tight text-(--text)">
          {selectedPost.title}
        </h3>
        <p className="text-sm leading-6 text-(--muted)">
          {selectedPost.content}
        </p>
      </div>

      <div className="space-y-2 rounded-(--r-sm) border border-(--border) bg-(--surface) p-4">
        <p className="text-xs uppercase tracking-[0.1em] text-(--muted-2)">
          Status
        </p>
        <p className="text-sm font-medium text-(--text)">
          {selectedPost.statusLabel}
        </p>
      </div>

      <div className="space-y-2 rounded-(--r-sm) border border-(--border) bg-(--surface) p-4">
        <p className="text-xs uppercase tracking-[0.1em] text-(--muted-2)">
          Votes
        </p>
        <UpvoteButton
          workspaceSlug={workspaceSlug}
          postId={selectedPost.id}
          initialCount={selectedPost.upvoteCount}
          initialHasVoted={selectedPost.viewerHasVoted}
        />
      </div>
    </div>
  );
}
