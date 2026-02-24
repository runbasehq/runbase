"use client";

import { FormEvent, useState } from "react";

import { FancyButton } from "@/components/ui/fancy-button";
import { Textarea } from "@/components/ui/textarea";

import { useCreateFeedbackComment } from "../hooks/use-create-feedback-comment";
import { useFeedbackComments } from "../hooks/use-feedback-comments";

interface FeedbackCommentsProps {
  workspaceSlug: string;
  postId: string;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  enabled?: boolean;
}

export function FeedbackComments({
  workspaceSlug,
  postId,
  isAuthenticated,
  onRequireAuth,
  enabled = true,
}: FeedbackCommentsProps) {
  const [body, setBody] = useState("");
  const commentsQuery = useFeedbackComments(workspaceSlug, postId, enabled);
  const createComment = useCreateFeedbackComment(
    workspaceSlug,
    postId,
    onRequireAuth,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    await createComment.mutateAsync({ body }).then(() => setBody(""));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {commentsQuery.isLoading ? (
          <p className="text-sm text-(--muted)">Loading comments...</p>
        ) : null}

        {commentsQuery.data?.map((comment) => (
          <article
            key={comment.id}
            className="rounded-(--r-xs) border border-(--border) bg-(--surface) p-3"
          >
            <p className="text-sm text-(--text)">{comment.body}</p>
            <p className="mt-1 text-xs text-(--muted)">
              {comment.authorName || "Runbase user"}
            </p>
          </article>
        ))}

        {!commentsQuery.isLoading && !commentsQuery.data?.length ? (
          <p className="text-sm text-(--muted)">No comments yet.</p>
        ) : null}
      </div>

      <form className="space-y-2" onSubmit={handleSubmit}>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment"
          maxLength={2000}
          required
          className="min-h-20"
        />
        <div className="flex justify-end">
          <FancyButton.Root
            type="submit"
            variant="neutral"
            size="small"
            disabled={createComment.isPending}
          >
            {createComment.isPending ? "Posting..." : "Post comment"}
          </FancyButton.Root>
        </div>
      </form>
    </div>
  );
}
