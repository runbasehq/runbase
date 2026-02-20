"use client";

import { useQuery } from "@tanstack/react-query";

import type { FeedbackPostItem } from "~/feedback/lib/types";

import { postsQueryKeys } from "../lib/query-keys";

interface UsePostsOptions {
  workspaceSlug: string;
  initialPosts: FeedbackPostItem[];
}

export function usePosts({ workspaceSlug, initialPosts }: UsePostsOptions) {
  return useQuery({
    queryKey: postsQueryKeys.byWorkspace(workspaceSlug),
    queryFn: async () => initialPosts,
    initialData: initialPosts,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
