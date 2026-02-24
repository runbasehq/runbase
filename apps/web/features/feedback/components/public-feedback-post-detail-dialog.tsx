"use client";

import { useMemo, useState } from "react";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { IconCheckmark } from "@/components/icons/icon-checkmark";
import { IconClaude } from "@/components/icons/icon-claude";
import { IconCopy } from "@/components/icons/icon-copy";
import { IconMarkdown } from "@/components/icons/icon-markdown";
import { IconOpenAI } from "@/components/icons/icon-openai";
import { FancyButton } from "@/components/ui/fancy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [didCopyMarkdown, setDidCopyMarkdown] = useState(false);

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

  const markdownValue = useMemo(() => {
    if (!post) {
      return "";
    }

    return [
      `# ${post.title}`,
      "",
      post.content,
      "",
      `- Status: ${post.statusLabel}`,
      `- Board: ${post.boardName}`,
      `- Date: ${createdLabel}`,
    ].join("\n");
  }, [createdLabel, post]);

  function getPageUrl() {
    if (typeof window === "undefined") {
      return "";
    }

    return window.location.href;
  }

  function openExternal(url: string) {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleCopyPage() {
    if (!navigator.clipboard || !markdownValue) {
      return;
    }

    await navigator.clipboard.writeText(markdownValue);
    setDidCopyMarkdown(true);
    window.setTimeout(() => setDidCopyMarkdown(false), 1500);
  }

  function handleViewAsMarkdown() {
    if (!markdownValue) {
      return;
    }

    const blob = new Blob([markdownValue], {
      type: "text/markdown;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    openExternal(objectUrl);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function handleOpenInChatGPT() {
    const prompt = encodeURIComponent(
      `${markdownValue}\n\nSource: ${getPageUrl()}`,
    );
    openExternal(`https://chatgpt.com/?q=${prompt}`);
  }

  function handleOpenInClaude() {
    const prompt = encodeURIComponent(
      `${markdownValue}\n\nSource: ${getPageUrl()}`,
    );
    openExternal(`https://claude.ai/new?q=${prompt}`);
  }

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
                  <div className="flex items-center justify-between gap-3">
                    <DialogTitle className="text-xl font-semibold text-(--text)">
                      {post.title}
                    </DialogTitle>
                    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-white">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        onClick={handleCopyPage}
                      >
                        {didCopyMarkdown ? (
                          <IconCheckmark className="size-3.5" />
                        ) : (
                          <IconCopy className="size-3.5" />
                        )}
                        {didCopyMarkdown ? "Copied" : "Copy Page"}
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center border-l border-slate-700 px-2 py-1.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            strokeWidth={2}
                            className="size-3"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={handleViewAsMarkdown}>
                              <IconMarkdown className="size-4" />
                              View as Markdown
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleOpenInChatGPT}>
                              <IconOpenAI className="size-4" />
                              Open in ChatGPT
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleOpenInClaude}>
                              <IconClaude className="size-4" />
                              Open in Claude
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <DialogDescription className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base leading-relaxed text-slate-800">
                    {post.content}
                  </DialogDescription>
                </DialogHeader>

                {!isAuthenticated ? (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className="text-slate-700">
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
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
                      tab === "comments"
                        ? "border-slate-300 bg-white text-slate-900"
                        : "border-transparent text-slate-700 hover:bg-white/70"
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
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${
                      tab === "activity"
                        ? "border-slate-300 bg-white text-slate-900"
                        : "border-transparent text-slate-700 hover:bg-white/70"
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
                      className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700"
                    >
                      Activity feed coming soon.
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-4 p-5">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
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

                <div className="rounded-xl border border-slate-200 bg-white p-3">
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

                <div className="rounded-xl border border-slate-200 bg-white p-3">
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
