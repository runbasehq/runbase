"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { FancyButton } from "@/components/ui/fancy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  FeedbackBoardItem,
  FeedbackPostItem,
  FeedbackStatusItem,
} from "~/feedback/lib/types";
import { postsQueryKeys } from "~/posts/lib/query-keys";

interface CreateFeedbackPostDialogProps {
  workspaceSlug: string;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name">;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label">;
}

interface CreatePostResponse {
  post: Omit<FeedbackPostItem, "createdAt"> & { createdAt: string | Date };
}

function normalizePost(
  post: Omit<FeedbackPostItem, "createdAt"> & { createdAt: string | Date },
): FeedbackPostItem {
  return {
    ...post,
    createdAt:
      post.createdAt instanceof Date
        ? post.createdAt
        : new Date(post.createdAt),
  };
}

function slugifyTitle(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return normalized || "post";
}

export function CreateFeedbackPostDialog({
  workspaceSlug,
  defaultBoard,
  defaultStatus,
}: CreateFeedbackPostDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const postsKey = postsQueryKeys.byWorkspace(workspaceSlug);

  const createPost = useMutation<
    FeedbackPostItem,
    Error,
    { title: string; content: string },
    { previousPosts?: FeedbackPostItem[]; optimisticId: string }
  >({
    mutationKey: ["posts", workspaceSlug, "create"],
    mutationFn: async (input) => {
      const response = await fetch("/api/feedback/posts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Could not create post");
      }

      const payload = (await response.json()) as CreatePostResponse;
      return normalizePost(payload.post);
    },
    onMutate: async (input) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: postsKey, exact: true });

      const previousPosts =
        queryClient.getQueryData<FeedbackPostItem[]>(postsKey);
      const optimisticId = `optimistic:${crypto.randomUUID()}`;
      const optimisticPost: FeedbackPostItem = {
        id: optimisticId,
        boardId: defaultBoard.id,
        statusId: defaultStatus.id,
        title: input.title,
        slug: slugifyTitle(input.title),
        content: input.content,
        upvoteCount: 0,
        commentCount: 0,
        createdAt: new Date(),
        statusLabel: defaultStatus.label,
        statusKey: defaultStatus.key,
        boardName: defaultBoard.name,
        viewerHasVoted: false,
      };

      queryClient.setQueryData<FeedbackPostItem[]>(postsKey, (posts = []) => [
        optimisticPost,
        ...posts,
      ]);

      return { previousPosts, optimisticId };
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(postsKey, context.previousPosts);
      }

      setError(mutationError.message || "Could not create post");
    },
    onSuccess: (post, _variables, context) => {
      queryClient.setQueryData<FeedbackPostItem[]>(postsKey, (posts = []) => {
        let replaced = false;
        const nextPosts = posts.map((currentPost) => {
          if (currentPost.id !== context.optimisticId) {
            return currentPost;
          }

          replaced = true;
          return post;
        });

        const mergedPosts = replaced ? nextPosts : [post, ...nextPosts];
        const unique = new Map<string, FeedbackPostItem>();
        for (const currentPost of mergedPosts) {
          if (!unique.has(currentPost.id)) {
            unique.set(currentPost.id, currentPost);
          }
        }

        return [...unique.values()];
      });

      queryClient.setQueryData(
        postsQueryKeys.detail(workspaceSlug, post.id),
        post,
      );

      setTitle("");
      setContent("");
      setIsOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postsKey, exact: true });
    },
  });

  const isPending = createPost.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    await createPost.mutateAsync({ title, content }).catch(() => undefined);
  }

  return (
    <>
      <FancyButton.Root
        variant="neutral"
        size="medium"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Create new post
      </FancyButton.Root>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new post</DialogTitle>
            <DialogDescription>
              Share a bug, request, or idea with the team.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="feedback-title">Title</FieldLabel>
                <Input
                  id="feedback-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Short summary"
                  maxLength={140}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="feedback-content">Description</FieldLabel>
                <Textarea
                  id="feedback-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Describe the problem or request"
                  className="min-h-28"
                  maxLength={5000}
                  required
                />
              </Field>

              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>

            <DialogFooter>
              <FancyButton.Root
                type="button"
                variant="basic"
                size="small"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Cancel
              </FancyButton.Root>
              <FancyButton.Root
                type="submit"
                variant="neutral"
                size="small"
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create post"}
              </FancyButton.Root>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
