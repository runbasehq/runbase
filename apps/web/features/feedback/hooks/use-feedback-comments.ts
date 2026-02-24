"use client";

import { useQuery } from "@tanstack/react-query";

import type { FeedbackCommentItem } from "~/feedback/lib/types";

import { feedbackQueryKeys } from "../lib/query-keys";

interface GetCommentsResponse {
  comments: Array<
    Omit<FeedbackCommentItem, "createdAt" | "updatedAt"> & {
      createdAt: string;
      updatedAt: string;
    }
  >;
}

function normalizeComment(
  comment: Omit<FeedbackCommentItem, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  },
): FeedbackCommentItem {
  return {
    ...comment,
    createdAt: new Date(comment.createdAt),
    updatedAt: new Date(comment.updatedAt),
  };
}

async function fetchComments(workspaceSlug: string, postId: string) {
  const response = await fetch(
    `/api/workspaces/${workspaceSlug}/feedback/posts/${postId}/comments`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch comments (${response.status})`);
  }

  const payload = (await response.json()) as GetCommentsResponse;
  return payload.comments.map(normalizeComment);
}

export function useFeedbackComments(
  workspaceSlug: string,
  postId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: feedbackQueryKeys.comments(workspaceSlug, postId),
    queryFn: () => fetchComments(workspaceSlug, postId),
    staleTime: 60_000,
    enabled,
  });
}
