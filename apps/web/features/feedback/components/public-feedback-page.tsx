"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FancyButton } from "@/components/ui/fancy-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconFilter } from "@/components/icons/icon-filter";
import { IconPlusCircle } from "@/components/icons/icon-plus-circle";
import { IconSearch } from "@/components/icons/icon-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import type {
  FeedbackBoardItem,
  FeedbackPostItem,
  FeedbackStatusItem,
} from "~/feedback/lib/types";
import { UpvoteButton } from "~/feedback/components/upvote-button";
import { usePosts } from "~/posts/hooks/use-posts";
import { postsQueryKeys } from "~/posts/lib/query-keys";

import { CreateFeedbackPostDialog } from "./create-feedback-post-dialog";
import { FeedbackAuthModal } from "./feedback-auth-modal";
import { PublicFeedbackPostDetailDialog } from "./public-feedback-post-detail-dialog";

interface PublicFeedbackPageProps {
  workspaceSlug: string;
  workspaceName: string;
  initialPosts: FeedbackPostItem[];
  isAuthenticated: boolean;
  viewer: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  isWorkspaceOwner: boolean;
  githubAuthEnabled: boolean;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name"> | null;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label"> | null;
  initialSelectedPostId?: string | null;
}

export function PublicFeedbackPage({
  workspaceSlug,
  workspaceName,
  initialPosts,
  isAuthenticated,
  viewer,
  isWorkspaceOwner,
  githubAuthEnabled,
  defaultBoard,
  defaultStatus,
  initialSelectedPostId = null,
}: PublicFeedbackPageProps) {
  const [authOpen, setAuthOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortView, setSortView] = useState<"new" | "top" | "trending">("top");
  const [viewerIsAuthenticated, setViewerIsAuthenticated] =
    useState(isAuthenticated);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const postsQuery = usePosts({ workspaceSlug, initialPosts });
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isScopedWorkspacePath =
    pathname === `/s/${workspaceSlug}` ||
    pathname.startsWith(`/s/${workspaceSlug}/`);

  const posts = postsQuery.data ?? initialPosts;
  const legacyQueryPostId = searchParams.get("post");
  const pathPostId = useMemo(() => {
    const match = pathname.match(/\/p\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);
  const selectedPostId =
    pathPostId ?? initialSelectedPostId ?? legacyQueryPostId;

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const searched = normalizedSearch
      ? posts.filter((post) => {
          const haystack = `${post.title} ${post.content}`.toLowerCase();
          return haystack.includes(normalizedSearch);
        })
      : posts;

    const sorted = [...searched];

    if (sortView === "new") {
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return sorted;
    }

    if (sortView === "trending") {
      sorted.sort((a, b) => {
        const aScore = a.upvoteCount * 2 + a.commentCount;
        const bScore = b.upvoteCount * 2 + b.commentCount;
        if (bScore !== aScore) {
          return bScore - aScore;
        }

        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      return sorted;
    }

    sorted.sort((a, b) => b.upvoteCount - a.upvoteCount);
    return sorted;
  }, [posts, searchTerm, sortView]);

  function handleAuthenticated() {
    setViewerIsAuthenticated(true);
    queryClient.invalidateQueries({
      queryKey: postsQueryKeys.byWorkspace(workspaceSlug),
      exact: true,
    });
    queryClient.invalidateQueries({ queryKey: ["feedback", workspaceSlug] });
  }

  function getPostPath(postId: string) {
    if (isScopedWorkspacePath) {
      return `/s/${workspaceSlug}/p/${postId}`;
    }

    return `/p/${postId}`;
  }

  function getListPath() {
    if (isScopedWorkspacePath) {
      return `/s/${workspaceSlug}`;
    }

    return "/";
  }

  function getDashboardPath() {
    if (isScopedWorkspacePath) {
      return `/s/${workspaceSlug}/dashboard`;
    }

    return "/dashboard";
  }

  function openPost(postId: string) {
    const targetPath = getPostPath(postId);
    if (pathname !== targetPath) {
      router.push(targetPath, { scroll: false });
    }
  }

  function prefetchPost(postId: string) {
    void router.prefetch(getPostPath(postId));
  }

  function closePostDialog() {
    const targetPath = getListPath();
    if (pathname !== targetPath) {
      router.replace(targetPath, { scroll: false });
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    const { error } = await authClient.signOut();

    if (error) {
      setIsSigningOut(false);
      return;
    }

    setViewerIsAuthenticated(false);
    setIsSigningOut(false);
    router.replace(getListPath(), { scroll: false });
    router.refresh();
  }

  function getViewerInitials() {
    const source = viewer?.name || viewer?.email || "User";
    const parts = source.trim().split(/\s+/).filter(Boolean);

    if (!parts.length) {
      return "U";
    }

    if (parts.length === 1) {
      return parts[0]?.slice(0, 1).toUpperCase() || "U";
    }

    return `${parts[0]?.slice(0, 1) || ""}${parts[1]?.slice(0, 1) || ""}`.toUpperCase();
  }

  function excerpt(value: string) {
    if (value.length <= 160) {
      return value;
    }

    return `${value.slice(0, 157)}...`;
  }

  useEffect(() => {
    if (!pathPostId && legacyQueryPostId) {
      router.replace(getPostPath(legacyQueryPostId), { scroll: false });
    }
  }, [legacyQueryPostId, pathPostId, router, workspaceSlug]);

  return (
    <main className="min-h-screen bg-(--bg)" data-ui-theme="agency-dashboard">
      <div className="flex min-h-screen flex-col">
        <section className="border-b border-(--border) bg-(--surface)">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <header className="flex items-center justify-between gap-4 py-4 sm:py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#4a22b7] text-xs font-semibold text-white">
                  {workspaceName.slice(0, 1).toUpperCase()}
                </div>
                <h1 className="text-3xl font-semibold leading-none text-(--text)">
                  {workspaceName}
                </h1>
              </div>

              {!viewerIsAuthenticated ? (
                <FancyButton.Root
                  type="button"
                  variant="basic"
                  size="small"
                  className="rounded-full px-4"
                  onClick={() => setAuthOpen(true)}
                >
                  Sign in / Sign up
                </FancyButton.Root>
              ) : viewer ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex items-center justify-center rounded-full border border-(--border) bg-(--surface) p-0.5"
                    aria-label="Account menu"
                  >
                    <Avatar size="sm">
                      <AvatarImage
                        src={viewer.image || undefined}
                        alt={viewer.name || "User avatar"}
                      />
                      <AvatarFallback>{getViewerInitials()}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="truncate">
                        {viewer.name || viewer.email || "Account"}
                      </DropdownMenuLabel>
                      {isWorkspaceOwner ? (
                        <DropdownMenuItem
                          onClick={() => router.push(getDashboardPath())}
                        >
                          Dashboard
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      variant="destructive"
                    >
                      {isSigningOut ? "Signing out..." : "Log out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </header>

            <div className="flex items-end pt-1">
              <button
                type="button"
                className="relative rounded-t-(--r-sm) border border-b-0 border-(--border) bg-(--bg) px-4 py-2 text-sm font-semibold text-(--text)"
              >
                Ideas + Bugs
                <div
                  className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-(--bg)"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </section>

        <section className="flex-1 bg-(--bg)">
          <div className="mx-auto h-full w-full max-w-6xl px-4 py-6 sm:px-6">
            <section className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`rounded-(--r-sm) border px-4 py-2 text-sm font-medium transition ${
                  sortView === "new"
                    ? "border-indigo-500 bg-white text-slate-900"
                    : "border-(--border) bg-(--surface) text-(--muted)"
                }`}
                onClick={() => setSortView("new")}
              >
                New
              </button>
              <button
                type="button"
                className={`rounded-(--r-sm) border px-4 py-2 text-sm font-medium transition ${
                  sortView === "top"
                    ? "border-indigo-500 bg-white text-slate-900"
                    : "border-(--border) bg-(--surface) text-(--muted)"
                }`}
                onClick={() => setSortView("top")}
              >
                Top
              </button>
              <button
                type="button"
                className={`rounded-(--r-sm) border px-4 py-2 text-sm font-medium transition ${
                  sortView === "trending"
                    ? "border-indigo-500 bg-white text-slate-900"
                    : "border-(--border) bg-(--surface) text-(--muted)"
                }`}
                onClick={() => setSortView("trending")}
              >
                Trending
              </button>

              <div className="relative ml-auto w-full sm:w-56">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--muted)" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search"
                  className="h-9 rounded-(--r-sm) border-(--border) bg-(--surface) pr-3 pl-9 text-sm text-(--text) placeholder:text-(--muted) focus-visible:border-indigo-500 focus-visible:ring-indigo-400/30"
                />
              </div>

              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-(--r-sm) border border-(--border) bg-(--surface) text-(--muted)"
                aria-label="Filter options"
              >
                <IconFilter className="size-4" />
              </button>

              {viewerIsAuthenticated && defaultBoard && defaultStatus ? (
                <CreateFeedbackPostDialog
                  workspaceSlug={workspaceSlug}
                  defaultBoard={defaultBoard}
                  defaultStatus={defaultStatus}
                  onUnauthorized={() => setAuthOpen(true)}
                />
              ) : (
                <FancyButton.Root
                  type="button"
                  variant="neutral"
                  size="xsmall"
                  onClick={() => setAuthOpen(true)}
                >
                  <IconPlusCircle className="size-4" />
                  Create post
                </FancyButton.Root>
              )}
            </section>

            <div className="h-full">
              <section className="overflow-hidden rounded-(--r-md) border border-(--border) bg-(--surface)">
                {filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="grid grid-cols-[minmax(0,1fr)_64px] border-b border-(--border) last:border-b-0"
                  >
                    <button
                      type="button"
                      className="block w-full p-5 text-left focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
                      onClick={() => openPost(post.id)}
                      onMouseEnter={() => prefetchPost(post.id)}
                      onFocus={() => prefetchPost(post.id)}
                    >
                      <h3 className="text-xl leading-tight font-semibold tracking-tight text-(--text)">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-base leading-relaxed text-[#4a5686]">
                        {excerpt(post.content)}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-(--muted)">
                        <span>{post.statusLabel}</span>
                        <span>{post.commentCount} comments</span>
                        <span>{post.createdAt.toLocaleDateString()}</span>
                      </div>
                    </button>

                    <div className="border-l border-(--border) bg-(--surface)">
                      <UpvoteButton
                        workspaceSlug={workspaceSlug}
                        postId={post.id}
                        count={post.upvoteCount}
                        hasVoted={post.viewerHasVoted}
                        variant="rail"
                        className="h-full w-full rounded-none border-0"
                      />
                    </div>
                  </article>
                ))}

                {!filteredPosts.length ? (
                  <div className="p-6 text-sm text-(--muted)">
                    No posts found.
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </section>
      </div>

      <FeedbackAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        workspaceSlug={workspaceSlug}
        githubAuthEnabled={githubAuthEnabled}
        onAuthenticated={handleAuthenticated}
      />

      <PublicFeedbackPostDetailDialog
        open={Boolean(selectedPost)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closePostDialog();
          }
        }}
        workspaceSlug={workspaceSlug}
        post={selectedPost}
        isAuthenticated={viewerIsAuthenticated}
        onRequireAuth={() => setAuthOpen(true)}
      />
    </main>
  );
}
