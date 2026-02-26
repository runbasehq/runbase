"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";

import { IconArrowUpRightSquare } from "@/components/icons/icon-arrow-up-right-square";
import { IconCheckmark } from "@/components/icons/icon-checkmark";
import { IconFilter } from "@/components/icons/icon-filter";
import { IconInbox } from "@/components/icons/icon-inbox";
import { IconLightbulb } from "@/components/icons/icon-lightbulb";
import { IconMap } from "@/components/icons/icon-map";
import { IconPlusCircle } from "@/components/icons/icon-plus-circle";
import { IconRoadmap } from "@/components/icons/icon-roadmap";
import { IconSearch } from "@/components/icons/icon-search";
import { IconTrending } from "@/components/icons/icon-trending";
import { cn } from "@/lib/utils";
import { PublicFeedbackPostDetailDialog } from "~/feedback/components/public-feedback-post-detail-dialog";
import type { FeedbackPostItem, FeedbackSnapshot } from "~/feedback/lib/types";

type DashboardRoadmapSort = "top" | "recent";

type RoadmapLaneId = "backlog" | "next_up" | "in_progress" | "done";

interface DashboardRoadmapBoardClientProps {
  initialFilters: {
    postId: string | null;
    sortMode: DashboardRoadmapSort;
  };
  publicWorkspaceUrl: string;
  snapshot: FeedbackSnapshot;
  workspaceSlug: string;
}

interface RoadmapLaneDefinition {
  emptyLabel: string;
  id: RoadmapLaneId;
  iconKind: "backlog" | "next_up" | "in_progress" | "done";
  pillClassName: string;
  title: string;
}

const ROADMAP_LANES: RoadmapLaneDefinition[] = [
  {
    id: "backlog",
    title: "Backlog",
    iconKind: "backlog",
    pillClassName: "border-(--border) bg-(--surface) text-(--muted-2)",
    emptyLabel: "No Backlog posts",
  },
  {
    id: "next_up",
    title: "Next up",
    iconKind: "next_up",
    pillClassName: "border-violet-200 bg-violet-50 text-violet-700",
    emptyLabel: "No Next up posts",
  },
  {
    id: "in_progress",
    title: "In Progress",
    iconKind: "in_progress",
    pillClassName: "border-sky-200 bg-sky-50 text-sky-700",
    emptyLabel: "No In Progress posts",
  },
  {
    id: "done",
    title: "Done",
    iconKind: "done",
    pillClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    emptyLabel: "No Done posts",
  },
] as const;

function normalizeStatusKey(key: string) {
  return key.toLowerCase().replace(/[\s-]+/g, "_");
}

function sortPosts(posts: FeedbackPostItem[], sortMode: DashboardRoadmapSort) {
  if (sortMode === "recent") {
    return [...posts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  return [...posts].sort((a, b) => {
    if (b.upvoteCount !== a.upvoteCount) {
      return b.upvoteCount - a.upvoteCount;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function sortLabel(value: DashboardRoadmapSort) {
  return value === "recent" ? "Most recent" : "Top upvoted";
}

function nextSortMode(value: DashboardRoadmapSort): DashboardRoadmapSort {
  return value === "top" ? "recent" : "top";
}

function badgeLabel(post: FeedbackPostItem) {
  return post.tags[0]?.name || "Idea or bug";
}

function LanePillIcon({
  iconKind,
}: {
  iconKind: RoadmapLaneDefinition["iconKind"];
}) {
  if (iconKind === "backlog") {
    return <IconInbox className="size-3.5" />;
  }

  if (iconKind === "next_up") {
    return (
      <span aria-hidden className="text-[10px] font-black tracking-[-0.04em]">
        ▶▶
      </span>
    );
  }

  if (iconKind === "in_progress") {
    return <IconTrending className="size-3.5" />;
  }

  return (
    <span className="inline-flex size-3.5 items-center justify-center rounded-full border border-current">
      <IconCheckmark className="size-2.5" />
    </span>
  );
}

function getLaneByStatusId(snapshot: FeedbackSnapshot) {
  const sortedStatuses = [...snapshot.statuses].sort(
    (a, b) => a.position - b.position,
  );
  const nonClosedStatusIndexById = new Map(
    sortedStatuses
      .filter((status) => !status.isClosed)
      .map((status, index) => [status.id, index]),
  );

  const backlogKeys = new Set(["open", "backlog", "todo", "ideas", "idea"]);
  const nextUpKeys = new Set([
    "planned",
    "next_up",
    "nextup",
    "next",
    "queued",
  ]);
  const inProgressKeys = new Set([
    "in_progress",
    "inprogress",
    "progress",
    "wip",
    "working",
  ]);
  const doneKeys = new Set(["completed", "done", "closed", "shipped"]);

  const laneByStatusId = new Map<string, RoadmapLaneId>();

  for (const status of sortedStatuses) {
    const normalizedKey = normalizeStatusKey(status.key);

    if (status.isClosed || doneKeys.has(normalizedKey)) {
      laneByStatusId.set(status.id, "done");
      continue;
    }

    if (inProgressKeys.has(normalizedKey)) {
      laneByStatusId.set(status.id, "in_progress");
      continue;
    }

    if (nextUpKeys.has(normalizedKey)) {
      laneByStatusId.set(status.id, "next_up");
      continue;
    }

    if (backlogKeys.has(normalizedKey)) {
      laneByStatusId.set(status.id, "backlog");
      continue;
    }

    const index = nonClosedStatusIndexById.get(status.id) ?? 0;
    if (index === 0) {
      laneByStatusId.set(status.id, "backlog");
      continue;
    }

    if (index === 1) {
      laneByStatusId.set(status.id, "next_up");
      continue;
    }

    laneByStatusId.set(status.id, "in_progress");
  }

  return laneByStatusId;
}

function getStatusIdByLane(snapshot: FeedbackSnapshot) {
  const laneByStatusId = getLaneByStatusId(snapshot);
  const statusIdByLane = new Map<RoadmapLaneId, string>();

  for (const status of [...snapshot.statuses].sort(
    (a, b) => a.position - b.position,
  )) {
    const lane = laneByStatusId.get(status.id);
    if (!lane || statusIdByLane.has(lane)) {
      continue;
    }

    statusIdByLane.set(lane, status.id);
  }

  return statusIdByLane;
}

function getLaneDropId(laneId: RoadmapLaneId) {
  return `lane-drop:${laneId}`;
}

function getLaneIdFromDropId(id: string): RoadmapLaneId | null {
  if (!id.startsWith("lane-drop:")) {
    return null;
  }

  const laneId = id.replace("lane-drop:", "");
  if (
    laneId === "backlog" ||
    laneId === "next_up" ||
    laneId === "in_progress" ||
    laneId === "done"
  ) {
    return laneId;
  }

  return null;
}

function RoadmapCardContent({ post }: { post: FeedbackPostItem }) {
  return (
    <>
      <p className="line-clamp-2 text-sm leading-tight font-semibold tracking-tight text-[#3f4660]">
        {post.title}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-sm font-medium text-(--muted)">
          <IconLightbulb className="mr-1.5 size-3 text-amber-300" />
          {badgeLabel(post)}
        </span>

        <span className="inline-flex items-center gap-1 rounded-full border border-(--border) px-2 py-0.5 text-sm font-semibold text-(--muted-2)">
          <HugeiconsIcon
            icon={ArrowUp01Icon}
            strokeWidth={2.2}
            className="size-3"
          />
          {post.upvoteCount}
        </span>
      </div>
    </>
  );
}

function SortableRoadmapCard({
  post,
  selected,
  onSelect,
}: {
  post: FeedbackPostItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: post.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "w-full cursor-pointer rounded-(--r-sm) border bg-(--surface) px-4 py-3.5 text-left shadow-[0_1px_0_rgba(17,18,20,0.04)] transition-colors hover:border-(--border-strong)",
        selected ? "border-(--border-strong)" : "border-(--border)",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <RoadmapCardContent post={post} />
    </button>
  );
}

function LaneDropZone({
  laneId,
  children,
}: {
  laneId: RoadmapLaneId;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getLaneDropId(laneId),
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 flex-col bg-(--surface-2)/35",
        isOver && "bg-[#f0f2f7]",
      )}
    >
      {children}
    </section>
  );
}

export function DashboardRoadmapBoardClient({
  initialFilters,
  publicWorkspaceUrl,
  snapshot,
  workspaceSlug,
}: DashboardRoadmapBoardClientProps) {
  const pathname = usePathname();
  const isFirstSyncRef = useRef(true);
  const [postsState, setPostsState] = useState<FeedbackPostItem[]>(
    snapshot.posts,
  );
  const [activeDragPostId, setActiveDragPostId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const postById = useMemo(
    () => new Map(postsState.map((post) => [post.id, post])),
    [postsState],
  );
  const laneByStatusId = useMemo(() => getLaneByStatusId(snapshot), [snapshot]);
  const statusIdByLane = useMemo(() => getStatusIdByLane(snapshot), [snapshot]);
  const statusById = useMemo(
    () => new Map(snapshot.statuses.map((status) => [status.id, status])),
    [snapshot.statuses],
  );

  const [sortMode, setSortMode] = useState<DashboardRoadmapSort>(
    initialFilters.sortMode,
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
    if (sortMode !== "top") {
      params.set("sort", sortMode);
    }
    if (selectedPostId) {
      params.set("post", selectedPostId);
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [pathname, selectedPostId, sortMode]);

  const postsByLane = useMemo(() => {
    const grouped: Record<RoadmapLaneId, FeedbackPostItem[]> = {
      backlog: [],
      next_up: [],
      in_progress: [],
      done: [],
    };

    for (const post of postsState) {
      const lane =
        laneByStatusId.get(post.statusId) ??
        (post.statusIsClosed ? "done" : "backlog");
      grouped[lane].push(post);
    }

    return {
      backlog: sortPosts(grouped.backlog, sortMode),
      next_up: sortPosts(grouped.next_up, sortMode),
      in_progress: sortPosts(grouped.in_progress, sortMode),
      done: sortPosts(grouped.done, sortMode),
    };
  }, [laneByStatusId, postsState, sortMode]);

  const selectedPost = selectedPostId
    ? (postById.get(selectedPostId) ?? null)
    : null;
  const activeDragPost = activeDragPostId
    ? (postById.get(activeDragPostId) ?? null)
    : null;

  function findLaneForPostId(postId: string): RoadmapLaneId | null {
    for (const lane of ROADMAP_LANES) {
      if (postsByLane[lane.id].some((post) => post.id === postId)) {
        return lane.id;
      }
    }

    return null;
  }

  function movePostToLane(postId: string, laneId: RoadmapLaneId) {
    const targetStatusId = statusIdByLane.get(laneId);
    if (!targetStatusId) {
      return;
    }

    const targetStatus = statusById.get(targetStatusId);

    setPostsState((current) =>
      current.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        return {
          ...post,
          statusId: targetStatusId,
          statusLabel: targetStatus?.label ?? post.statusLabel,
          statusKey: targetStatus?.key ?? post.statusKey,
          statusIsClosed: targetStatus?.isClosed ?? post.statusIsClosed,
        };
      }),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragPostId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    setActiveDragPostId(null);

    if (!overId) {
      return;
    }

    const sourceLaneId = findLaneForPostId(activeId);
    if (!sourceLaneId) {
      return;
    }

    const targetLaneFromDropZone = getLaneIdFromDropId(overId);
    if (targetLaneFromDropZone) {
      movePostToLane(activeId, targetLaneFromDropZone);
      return;
    }

    const targetLaneFromPost = findLaneForPostId(overId);
    if (!targetLaneFromPost) {
      return;
    }

    movePostToLane(activeId, targetLaneFromPost);
  }

  return (
    <section className="h-full min-h-full bg-(--surface)">
      <div className="grid h-full min-h-full grid-cols-1 md:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="border-b border-(--border) bg-(--surface) md:border-r md:border-b-0">
          <div className="flex h-full flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xl font-semibold tracking-tight text-(--text)">
                Roadmap
              </p>
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
              <p className="text-xs font-semibold text-[#7a8198]">Roadmaps</p>
              <button
                type="button"
                className="mt-2 flex h-9 w-full items-center gap-2 rounded-(--r-sm) bg-black/[0.04] px-3 text-left text-sm font-semibold text-(--text)"
              >
                <IconMap className="size-4 text-(--muted-2)" />
                <span className="truncate">Main Roadmap</span>
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold text-[#7a8198]">Actions</p>
              <Link
                href="/dashboard/settings/feedback-roadmap"
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-(--muted) transition-colors hover:text-(--text)"
              >
                <IconPlusCircle className="size-4 text-(--muted-2)" />
                Create &amp; Edit Roadmaps
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col bg-(--surface)">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) px-4 py-2.5 md:px-5">
            <h1 className="text-xl font-semibold tracking-tight text-(--text)">
              Main Roadmap
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-(--r-sm) border border-(--border) bg-(--surface) text-(--muted)">
                <IconSearch className="size-4" />
              </span>

              <span className="inline-flex h-8 items-center gap-1 rounded-(--r-sm) border border-(--border) bg-(--surface) px-2.5 text-sm font-medium text-(--muted)">
                <IconFilter className="size-3.5" />
                Filters
              </span>

              <button
                type="button"
                onClick={() => setSortMode((current) => nextSortMode(current))}
                className="inline-flex h-8 items-center gap-1 rounded-(--r-sm) border border-(--border) bg-(--surface) px-2.5 text-sm font-medium text-(--muted) transition-colors hover:bg-black/[0.03] hover:text-(--text)"
              >
                {sortLabel(sortMode)}
                <span aria-hidden>▾</span>
              </button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="min-h-0 flex-1 overflow-x-auto">
              <motion.div
                className="grid h-full min-w-[1440px] grid-cols-4 divide-x divide-(--border)"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                {ROADMAP_LANES.map((lane) => {
                  const posts = postsByLane[lane.id];

                  return (
                    <LaneDropZone key={lane.id} laneId={lane.id}>
                      <header className="flex items-center justify-between border-b border-(--border) px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${lane.pillClassName}`}
                          >
                            <LanePillIcon iconKind={lane.iconKind} />
                            <span className="ml-1.5">{lane.title}</span>
                          </span>
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-(--border) px-1.5 py-0.5 text-xs font-semibold text-(--muted-2)">
                            {posts.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="inline-flex size-7 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-base font-medium text-(--muted)"
                          aria-label={`Add ${lane.title} post`}
                        >
                          +
                        </button>
                      </header>

                      <div className="flex min-h-0 flex-1 flex-col p-3">
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
                          {posts.length ? (
                            <SortableContext
                              items={posts.map((post) => post.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {posts.map((post) => (
                                <SortableRoadmapCard
                                  key={post.id}
                                  post={post}
                                  selected={selectedPostId === post.id}
                                  onSelect={() =>
                                    setSelectedPostId((current) =>
                                      current === post.id ? null : post.id,
                                    )
                                  }
                                />
                              ))}
                            </SortableContext>
                          ) : (
                            <div className="flex h-full min-h-[340px] items-center justify-center">
                              <div className="text-center">
                                <IconRoadmap className="mx-auto size-11 text-violet-300" />
                                <p className="mt-3 text-sm font-medium text-[#616b8a]">
                                  {lane.emptyLabel}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </LaneDropZone>
                  );
                })}
              </motion.div>
            </div>

            <DragOverlay dropAnimation={null}>
              {activeDragPost ? (
                <div className="w-full max-w-[340px] rounded-(--r-sm) border border-(--border-strong) bg-(--surface) px-4 py-3.5 text-left shadow-[0_10px_28px_rgba(17,18,20,0.18)]">
                  <RoadmapCardContent post={activeDragPost} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
