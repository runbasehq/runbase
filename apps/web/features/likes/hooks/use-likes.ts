"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { FeedbackPostItem } from "~/feedback/lib/types";
import {
  applyPostVoteState,
  updatePostsVoteState,
} from "~/posts/lib/posts-wrapper";
import { postsQueryKeys } from "~/posts/lib/query-keys";

import { togglePostLike, type VoteResponse } from "../lib/likes-wrapper";

interface UseLikesOptions {
  workspaceSlug: string;
  postId: string;
}

interface MutateContext {
  previousPosts?: FeedbackPostItem[];
  previousPost?: FeedbackPostItem;
}

export function useLikes({ workspaceSlug, postId }: UseLikesOptions) {
  const queryClient = useQueryClient();

  const postsKey = postsQueryKeys.byWorkspace(workspaceSlug);
  const postKey = postsQueryKeys.detail(workspaceSlug, postId);

  const mutation = useMutation<
    VoteResponse,
    Error,
    { viewerHasVoted: boolean },
    MutateContext
  >({
    mutationKey: ["likes", workspaceSlug, postId],
    mutationFn: async ({ viewerHasVoted }) =>
      togglePostLike(workspaceSlug, postId, viewerHasVoted),
    onMutate: async ({ viewerHasVoted }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: postsKey }),
        queryClient.cancelQueries({ queryKey: postKey }),
      ]);

      const nextHasVoted = !viewerHasVoted;
      const previousPosts =
        queryClient.getQueryData<FeedbackPostItem[]>(postsKey);
      const previousPost = queryClient.getQueryData<FeedbackPostItem>(postKey);

      if (previousPosts) {
        queryClient.setQueryData(
          postsKey,
          updatePostsVoteState(previousPosts, postId, nextHasVoted),
        );
      }

      if (previousPost) {
        queryClient.setQueryData(
          postKey,
          applyPostVoteState(previousPost, nextHasVoted),
        );
      }

      return { previousPosts, previousPost };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(postsKey, context.previousPosts);
      }

      if (context?.previousPost) {
        queryClient.setQueryData(postKey, context.previousPost);
      }
    },
    onSuccess: (payload) => {
      queryClient.setQueryData<FeedbackPostItem[] | undefined>(
        postsKey,
        (posts) => {
          if (!posts) {
            return posts;
          }

          return updatePostsVoteState(
            posts,
            postId,
            payload.viewerHasVoted,
          ).map((post) =>
            post.id === postId
              ? { ...post, upvoteCount: payload.upvoteCount }
              : post,
          );
        },
      );

      queryClient.setQueryData<FeedbackPostItem | undefined>(
        postKey,
        (post) => {
          if (!post) {
            return post;
          }

          return {
            ...post,
            upvoteCount: payload.upvoteCount,
            viewerHasVoted: payload.viewerHasVoted,
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsKey, exact: true });
      queryClient.invalidateQueries({ queryKey: postKey, exact: true });
    },
  });

  return {
    isPending: mutation.isPending,
    toggleLike: mutation.mutate,
  };
}
