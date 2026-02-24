"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  FeedbackCommentItem,
  FeedbackPostItem,
} from "~/feedback/lib/types";
import { postsQueryKeys } from "~/posts/lib/query-keys";

import { feedbackQueryKeys } from "../lib/query-keys";

interface CreateCommentResponse {
  comment: Omit<FeedbackCommentItem, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  };
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

interface Context {
  previousComments?: FeedbackCommentItem[];
  previousPosts?: FeedbackPostItem[];
}

export function useCreateFeedbackComment(
  workspaceSlug: string,
  postId: string,
  onUnauthorized: () => void,
) {
  const queryClient = useQueryClient();
  const commentsKey = feedbackQueryKeys.comments(workspaceSlug, postId);
  const postsKey = postsQueryKeys.byWorkspace(workspaceSlug);

  return useMutation<FeedbackCommentItem, Error, { body: string }, Context>({
    mutationKey: ["feedback", workspaceSlug, postId, "comment-create"],
    mutationFn: async ({ body }) => {
      const response = await fetch(
        `/api/workspaces/${workspaceSlug}/feedback/posts/${postId}/comments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );

      if (response.status === 401) {
        onUnauthorized();
        throw new Error("Please sign in to comment");
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Could not create comment");
      }

      const payload = (await response.json()) as CreateCommentResponse;
      return normalizeComment(payload.comment);
    },
    onMutate: async ({ body }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: commentsKey, exact: true }),
        queryClient.cancelQueries({ queryKey: postsKey, exact: true }),
      ]);

      const previousComments =
        queryClient.getQueryData<FeedbackCommentItem[]>(commentsKey);
      const previousPosts =
        queryClient.getQueryData<FeedbackPostItem[]>(postsKey);

      const optimisticComment: FeedbackCommentItem = {
        id: `optimistic:${crypto.randomUUID()}`,
        postId,
        body,
        createdAt: new Date(),
        updatedAt: new Date(),
        authorUserId: null,
        authorName: "You",
        authorImage: null,
      };

      queryClient.setQueryData<FeedbackCommentItem[]>(
        commentsKey,
        (current = []) => [...current, optimisticComment],
      );

      queryClient.setQueryData<FeedbackPostItem[]>(postsKey, (current = []) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, commentCount: post.commentCount + 1 }
            : post,
        ),
      );

      return { previousComments, previousPosts };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(commentsKey, context.previousComments);
      }

      if (context?.previousPosts) {
        queryClient.setQueryData(postsKey, context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey, exact: true });
      queryClient.invalidateQueries({ queryKey: postsKey, exact: true });
    },
  });
}
