"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { IconArrowUpRightSquare } from "@/components/icons/icon-arrow-up-right-square";
import { IconFilter } from "@/components/icons/icon-filter";
import { IconSearch } from "@/components/icons/icon-search";
import { PublicFeedbackPostDetailDialog } from "~/feedback/components/public-feedback-post-detail-dialog";
import type { FeedbackPostItem, FeedbackSnapshot } from "~/feedback/lib/types";
import { DashboardFeedbackCreatePostButton } from "./dashboard-feedback-create-post-button";

export type DashboardFeedbackSort = "recent" | "top" | "trending";

interface DashboardFeedbackBoardClientProps {
  initialFilters: {
    boardId: string | null;
    postId: string | null;
    q: string;
    sortMode: DashboardFeedbackSort;
    statusId: string | null;
    tagId: string | null;
  };
  publicWorkspaceUrl: string;
  snapshot: FeedbackSnapshot;
  workspaceSlug: string;
  viewer: {
    email: string | null;
    image: string | null;
    name: string | null;
  };
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(value);
}

function withHexAlpha(color: string | null, alphaHex: string) {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return null;
  }

  return `${color}${alphaHex}`;
}

function getTrendingScore(post: FeedbackPostItem, nowMs: number) {
  const ageHours = Math.max(1, (nowMs - post.createdAt.getTime()) / 3600000);
  return post.upvoteCount / Math.pow(ageHours + 2, 0.65);
}

function sortPosts(posts: FeedbackPostItem[], sortMode: DashboardFeedbackSort) {
  if (sortMode === "top") {
    return [...posts].sort((a, b) => {
      if (b.upvoteCount !== a.upvoteCount) {
        return b.upvoteCount - a.upvoteCount;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  if (sortMode === "trending") {
    const nowMs = Date.now();

    return [...posts].sort((a, b) => {
      const scoreDelta =
        getTrendingScore(b, nowMs) - getTrendingScore(a, nowMs);

      if (Math.abs(scoreDelta) > 0.001) {
        return scoreDelta;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  return [...posts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

function sortLabel(value: DashboardFeedbackSort) {
  if (value === "top") {
    return "Top posts";
  }

  if (value === "trending") {
    return "Trending";
  }

  return "Recent posts";
}

function nextSortMode(value: DashboardFeedbackSort): DashboardFeedbackSort {
  if (value === "recent") {
    return "top";
  }

  if (value === "top") {
    return "trending";
  }

  return "recent";
}

function getScoreTone(post: FeedbackPostItem) {
  if (post.upvoteCount >= 3) {
    return "text-sky-500";
  }

  if (post.upvoteCount > 0) {
    return "text-rose-400";
  }

  return "text-(--muted-2)";
}

export function DashboardFeedbackBoardClient({
  initialFilters,
  publicWorkspaceUrl,
  snapshot,
  workspaceSlug,
  viewer,
}: DashboardFeedbackBoardClientProps) {
  const pathname = usePathname();
  const isFirstSyncRef = useRef(true);

  const statusById = useMemo(
    () => new Map(snapshot.statuses.map((status) => [status.id, status])),
    [snapshot.statuses],
  );
  const boardById = useMemo(
    () => new Map(snapshot.boards.map((board) => [board.id, board])),
    [snapshot.boards],
  );
  const tagById = useMemo(
    () => new Map(snapshot.tags.map((tag) => [tag.id, tag])),
    [snapshot.tags],
  );
  const postById = useMemo(
    () => new Map(snapshot.posts.map((post) => [post.id, post])),
    [snapshot.posts],
  );

  const [q, setQ] = useState(initialFilters.q);
  const [sortMode, setSortMode] = useState<DashboardFeedbackSort>(
    initialFilters.sortMode,
  );
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(
    initialFilters.statusId && statusById.has(initialFilters.statusId)
      ? initialFilters.statusId
      : null,
  );
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    initialFilters.boardId && boardById.has(initialFilters.boardId)
      ? initialFilters.boardId
      : null,
  );
  const [selectedTagId, setSelectedTagId] = useState<string | null>(
    initialFilters.tagId && tagById.has(initialFilters.tagId)
      ? initialFilters.tagId
      : null,
  );
  const [selectedPostId, setSelectedPostId] = useState<string | null>(
    initialFilters.postId && postById.has(initialFilters.postId)
      ? initialFilters.postId
      : null,
  );

  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }

    const params = new URLSearchParams();
    const trimmedQuery = q.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }
    if (sortMode !== "recent") {
      params.set("sort", sortMode);
    }
    if (selectedStatusId) {
      params.set("status", selectedStatusId);
    }
    if (selectedBoardId) {
      params.set("board", selectedBoardId);
    }
    if (selectedTagId) {
      params.set("tag", selectedTagId);
    }
    if (selectedPostId) {
      params.set("post", selectedPostId);
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [pathname, q, selectedBoardId, selectedPostId, selectedStatusId, selectedTagId, sortMode]);

  const normalizedSearchQuery = q.trim().toLowerCase();

  const filteredPosts = useMemo(
    () =>
      snapshot.posts
        .filter((post) => {
          if (!normalizedSearchQuery.length) {
            return true;
          }

          const haystack = `${post.title} ${stripHtml(post.content)}`.toLowerCase();
          return haystack.includes(normalizedSearchQuery);
        })
        .filter((post) => {
          if (selectedBoardId && post.boardId !== selectedBoardId) {
            return false;
          }

          if (
            selectedTagId &&
            !post.tags.some((tag) => tag.id === selectedTagId)
          ) {
            return false;
          }

          if (selectedStatusId && post.statusId !== selectedStatusId) {
            return false;
          }

          return true;
        }),
    [normalizedSearchQuery, selectedBoardId, selectedStatusId, selectedTagId, snapshot.posts],
  );

  const sortedPosts = useMemo(
    () => sortPosts(filteredPosts, sortMode),
    [filteredPosts, sortMode],
  );

  const selectedStatus = selectedStatusId
    ? statusById.get(selectedStatusId)
    : null;
  const selectedBoard = selectedBoardId ? boardById.get(selectedBoardId) : null;
  const selectedTag = selectedTagId ? tagById.get(selectedTagId) : null;
  const selectedPost = selectedPostId ? (postById.get(selectedPostId) ?? null) : null;

  const defaultBoard =
    snapshot.boards.find((board) => board.isDefault) ?? snapshot.boards[0] ?? null;
  const defaultStatus =
    snapshot.statuses.find((status) => status.isDefault && !status.isClosed) ??
    snapshot.statuses.find((status) => !status.isClosed) ??
    snapshot.statuses[0] ??
    null;

  const activeFilterCount = [
    normalizedSearchQuery.length > 0,
    Boolean(selectedStatusId),
    Boolean(selectedBoardId),
    Boolean(selectedTagId),
  ].filter(Boolean).length;

  const boardPostCountById = useMemo(() => {
    const countById = new Map<string, number>();
    for (const post of snapshot.posts) {
      countById.set(post.boardId, (countById.get(post.boardId) ?? 0) + 1);
    }

    return countById;
  }, [snapshot.posts]);

  const tagPostCountById = useMemo(() => {
    const countById = new Map<string, number>();
    for (const post of snapshot.posts) {
      for (const tag of post.tags) {
        countById.set(tag.id, (countById.get(tag.id) ?? 0) + 1);
      }
    }

    return countById;
  }, [snapshot.posts]);

  return (
    <section className="h-full bg-(--surface)">
      <div className="grid min-h-full grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="border-b border-(--border) bg-(--surface) md:border-r md:border-b-0">
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xl font-semibold tracking-tight text-(--text)">
                  Feedback
                </p>
              </div>
              <Link
                href={publicWorkspaceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-7 items-center justify-center rounded-(--r-sm) border border-(--border) bg-(--surface) text-(--muted) transition-colors hover:bg-black/[0.03] hover:text-(--text)"
                aria-label="Open public feedback board"
              >
                <IconArrowUpRightSquare className="size-4" />
              </Link>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold text-(--muted-2)">Statuses</p>
              <div className="mt-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedStatusId(null)}
                  className={`flex w-full items-center gap-2 rounded-(--r-sm) px-2 py-1.5 text-left text-sm font-medium transition-colors ${selectedStatusId ? "text-(--muted) hover:bg-black/[0.03] hover:text-(--text)" : "bg-black/[0.035] text-(--text)"}`}
                >
                  <span className="size-2 rounded-full bg-(--muted-2)" />
                  All statuses
                </button>
                {snapshot.statuses.map((status) => (
                  <button
                    key={status.id}
                    type="button"
                    onClick={() =>
                      setSelectedStatusId((current) =>
                        current === status.id ? null : status.id,
                      )
                    }
                    className={`flex w-full items-center gap-2 rounded-(--r-sm) px-2 py-1.5 text-left text-sm font-medium transition-colors ${selectedStatusId === status.id ? "bg-black/[0.035] text-(--text)" : "text-(--muted) hover:bg-black/[0.03] hover:text-(--text)"}`}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: status.color ?? "#9aa0a8" }}
                    />
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold text-(--muted-2)">
                Quick Filters
              </p>
              <div className="mt-2 space-y-3">
                <div>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted-2)">
                    Boards
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedBoardId(null)}
                      className={`flex w-full items-center gap-2 rounded-(--r-sm) px-2 py-1.5 text-left text-sm font-medium transition-colors ${selectedBoardId ? "text-(--muted) hover:bg-black/[0.03] hover:text-(--text)" : "bg-black/[0.035] text-(--text)"}`}
                    >
                      <span className="min-w-0 flex-1 truncate">All boards</span>
                      <span className="text-xs text-(--muted-2)">
                        {snapshot.posts.length}
                      </span>
                    </button>
                    {snapshot.boards.map((board) => (
                      <button
                        key={board.id}
                        type="button"
                        onClick={() =>
                          setSelectedBoardId((current) =>
                            current === board.id ? null : board.id,
                          )
                        }
                        className={`flex w-full items-center gap-2 rounded-(--r-sm) px-2 py-1.5 text-left text-sm font-medium transition-colors ${selectedBoardId === board.id ? "bg-black/[0.035] text-(--text)" : "text-(--muted) hover:bg-black/[0.03] hover:text-(--text)"}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{board.name}</span>
                        <span className="text-xs text-(--muted-2)">
                          {boardPostCountById.get(board.id) ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted-2)">
                    Tags
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTagId(null)}
                      className={`flex w-full items-center gap-2 rounded-(--r-sm) px-2 py-1.5 text-left text-sm font-medium transition-colors ${selectedTagId ? "text-(--muted) hover:bg-black/[0.03] hover:text-(--text)" : "bg-black/[0.035] text-(--text)"}`}
                    >
                      <span className="min-w-0 flex-1 truncate">All tags</span>
                      <span className="text-xs text-(--muted-2)">
                        {snapshot.posts.length}
                      </span>
                    </button>
                    {snapshot.tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setSelectedTagId((current) =>
                            current === tag.id ? null : tag.id,
                          )
                        }
                        className={`flex w-full items-center gap-2 rounded-(--r-sm) px-2 py-1.5 text-left text-sm font-medium transition-colors ${selectedTagId === tag.id ? "bg-black/[0.035] text-(--text)" : "text-(--muted) hover:bg-black/[0.03] hover:text-(--text)"}`}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: tag.color ?? "#9aa0a8" }}
                        />
                        <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                        <span className="text-xs text-(--muted-2)">
                          {tagPostCountById.get(tag.id) ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 bg-(--surface)">
          <div className="flex items-center justify-between border-b border-(--border) px-4 py-2.5 md:px-5">
            <h1 className="text-xl font-semibold tracking-tight text-(--text)">
              Posts ({sortedPosts.length})
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-(--r-sm) border border-(--border) bg-(--surface) text-(--muted)">
                <IconSearch className="size-4" />
              </span>

              <span className="inline-flex h-8 items-center gap-1 rounded-(--r-sm) border border-(--border) bg-(--surface) px-2.5 text-sm font-medium text-(--muted)">
                <IconFilter className="size-3.5" />
                Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </span>

              <button
                type="button"
                onClick={() => setSortMode((current) => nextSortMode(current))}
                className="inline-flex h-8 items-center gap-1 rounded-(--r-sm) border border-(--border) bg-(--surface) px-2.5 text-sm font-medium text-(--muted) transition-colors hover:bg-black/[0.03] hover:text-(--text)"
              >
                {sortLabel(sortMode)}
                <span aria-hidden>▾</span>
              </button>

              {defaultBoard && defaultStatus ? (
                <DashboardFeedbackCreatePostButton
                  workspaceSlug={workspaceSlug}
                  defaultBoard={{
                    id: defaultBoard.id,
                    name: defaultBoard.name,
                  }}
                  defaultStatus={{
                    id: defaultStatus.id,
                    key: defaultStatus.key,
                    label: defaultStatus.label,
                    isClosed: defaultStatus.isClosed,
                  }}
                  availableTags={snapshot.tags}
                  viewer={viewer}
                />
              ) : (
                <span className="inline-flex h-8 items-center rounded-(--r-sm) border border-(--border) px-3 text-sm font-semibold text-(--muted)">
                  Create post unavailable
                </span>
              )}
            </div>
          </div>

          {selectedStatus || selectedBoard || selectedTag || q.trim().length ? (
            <div className="border-b border-(--border) bg-(--surface-2) px-4 py-2 text-xs text-(--muted) md:px-5">
              {selectedStatus ? (
                <span className="mr-3">Status: {selectedStatus.label}</span>
              ) : null}
              {selectedBoard ? (
                <span className="mr-3">Board: {selectedBoard.name}</span>
              ) : null}
              {selectedTag ? <span className="mr-3">Tag: {selectedTag.name}</span> : null}
              {q.trim().length ? <span className="mr-3">Search: {q}</span> : null}
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setSortMode("recent");
                  setSelectedStatusId(null);
                  setSelectedBoardId(null);
                  setSelectedTagId(null);
                  setSelectedPostId(null);
                }}
                className="font-medium text-(--text) underline underline-offset-4"
              >
                Clear
              </button>
            </div>
          ) : null}

          <div className="divide-y divide-(--border)">
            {sortedPosts.length ? (
              sortedPosts.map((post) => {
                const status = statusById.get(post.statusId);
                const statusBackground = withHexAlpha(
                  status?.color ?? "#0ea5e9",
                  "14",
                );
                const statusBorder = withHexAlpha(status?.color ?? "#0ea5e9", "66");
                const statusText = withHexAlpha(status?.color ?? "#0ea5e9", "D6");
                const rowIsSelected = selectedPostId === post.id;

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() =>
                      setSelectedPostId((current) =>
                        current === post.id ? null : post.id,
                      )
                    }
                    className={`grid w-full grid-cols-[44px_minmax(0,1fr)_72px_150px_108px] items-center gap-3 px-4 py-2.5 text-left transition-colors md:px-5 ${rowIsSelected ? "bg-black/[0.035]" : "hover:bg-black/[0.02]"}`}
                  >
                    <div className="flex items-center gap-1 text-xs font-semibold text-(--muted-2)">
                      <HugeiconsIcon
                        icon={ArrowUp01Icon}
                        strokeWidth={2.4}
                        className={`size-3 ${getScoreTone(post)}`}
                      />
                      <span>{post.upvoteCount}</span>
                    </div>

                    <p className="truncate text-sm font-semibold text-(--text)">
                      {post.title}
                    </p>

                    <p className="text-right text-xs font-medium text-(--muted-2)">
                      {formatShortDate(post.createdAt)}
                    </p>

                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full border border-(--border) bg-(--surface-2) px-2.5 py-1 text-xs font-medium text-(--muted)">
                        {post.boardName}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: statusBackground ?? "#e7f6ff",
                          borderColor: statusBorder ?? "#9ccde7",
                          color: statusText ?? "#0f6fa3",
                        }}
                      >
                        {post.statusLabel}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center md:px-5">
                <p className="text-sm font-medium text-(--text)">No posts found</p>
                <p className="mt-1 text-sm text-(--muted)">
                  Adjust filters or create a new post.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PublicFeedbackPostDetailDialog
        open={Boolean(selectedPost)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPostId(null);
          }
        }}
        workspaceSlug={workspaceSlug}
        post={selectedPost}
        isAuthenticated
        onRequireAuth={() => {}}
      />
    </section>
  );
}
