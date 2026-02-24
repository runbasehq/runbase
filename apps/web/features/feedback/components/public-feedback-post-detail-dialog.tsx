"use client";

import { useMemo, useState } from "react";

import { FancyButton } from "@/components/ui/fancy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeedbackPostItem } from "~/feedback/lib/types";

import { FeedbackComments } from "./feedback-comments";
import { UpvoteButton } from "./upvote-button";

interface PublicFeedbackPostDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  post: FeedbackPostItem | null;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

type DetailTab = "comments" | "activity";

export function PublicFeedbackPostDetailDialog({
  open,
  onOpenChange,
  workspaceSlug,
  post,
  isAuthenticated,
  onRequireAuth,
}: PublicFeedbackPostDetailDialogProps) {
  const [tab, setTab] = useState<DetailTab>("comments");

  const createdLabel = useMemo(() => {
    if (!post) {
      return "";
    }

    return post.createdAt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [post]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-0 shadow-xl sm:max-w-5xl"
        showCloseButton
      >
        {post ? (
          <div className="max-h-[90vh] overflow-y-auto">
            <div className="grid min-h-[560px] md:grid-cols-[minmax(0,1fr)_280px]">
              <section className="border-b border-(--border) p-5 md:border-r md:border-b-0">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-xl font-semibold text-(--text)">
                    {post.title}
                  </DialogTitle>
                  <DialogDescription className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base leading-relaxed text-slate-800">
                    {post.content}
                  </DialogDescription>
                </DialogHeader>

                {!isAuthenticated ? (
                  <div className="mt-4 flex items-center justify-between rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 py-2 text-sm">
                    <span className="text-(--muted)">
                      Please authenticate to join the conversation.
                    </span>
                    <button
                      type="button"
                      className="font-medium text-indigo-700 underline-offset-2 hover:underline"
                      onClick={onRequireAuth}
                    >
                      Sign in / Sign up
                    </button>
                  </div>
                ) : null}

                <div
                  className="mt-5 flex items-center gap-2 border-b border-(--border) pb-3"
                  role="tablist"
                  aria-label="Post details"
                >
                  <button
                    type="button"
                    role="tab"
                    id="comments-tab"
                    aria-selected={tab === "comments"}
                    aria-controls="comments-panel"
                    className={`rounded-(--r-xs) px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                      tab === "comments"
                        ? "bg-white text-slate-900"
                        : "text-slate-600"
                    }`}
                    onClick={() => setTab("comments")}
                  >
                    Comments
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="activity-tab"
                    aria-selected={tab === "activity"}
                    aria-controls="activity-panel"
                    className={`rounded-(--r-xs) px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                      tab === "activity"
                        ? "bg-white text-slate-900"
                        : "text-slate-600"
                    }`}
                    onClick={() => setTab("activity")}
                  >
                    Activity
                  </button>
                </div>

                <div className="mt-4">
                  {tab === "comments" ? (
                    <div
                      id="comments-panel"
                      role="tabpanel"
                      aria-labelledby="comments-tab"
                    >
                      <FeedbackComments
                        workspaceSlug={workspaceSlug}
                        postId={post.id}
                        isAuthenticated={isAuthenticated}
                        onRequireAuth={onRequireAuth}
                        enabled={open}
                      />
                    </div>
                  ) : (
                    <div
                      id="activity-panel"
                      role="tabpanel"
                      aria-labelledby="activity-tab"
                      className="rounded-(--r-sm) border border-slate-200 bg-white p-4 text-sm text-slate-600"
                    >
                      Activity feed coming soon.
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-4 p-5">
                <div className="rounded-(--r-sm) border border-(--border) bg-(--bg) p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-(--muted-2)">
                    Upvotes
                  </p>
                  <div className="mt-2">
                    <UpvoteButton
                      workspaceSlug={workspaceSlug}
                      postId={post.id}
                      count={post.upvoteCount}
                      hasVoted={post.viewerHasVoted}
                    />
                  </div>
                </div>

                <div className="rounded-(--r-sm) border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {post.statusLabel}
                  </p>
                  <p className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Board
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {post.boardName}
                  </p>
                  <p className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {createdLabel}
                  </p>
                </div>

                <div className="rounded-(--r-sm) border border-(--border) bg-(--bg) p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Subscribe to post
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Get notified by email when there are changes.
                  </p>
                  <FancyButton.Root
                    type="button"
                    variant="neutral"
                    size="small"
                    className="mt-3 w-full"
                    onClick={() => {
                      if (!isAuthenticated) {
                        onRequireAuth();
                      }
                    }}
                  >
                    Get notified
                  </FancyButton.Root>
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
