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
    <div className="space-y-4">
      <div className="space-y-2">
        {commentsQuery.isLoading ? (
          <p
            role="status"
            aria-live="polite"
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            Loading comments...
          </p>
        ) : null}

        {commentsQuery.data?.map((comment) => (
          <article
            key={comment.id}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <p className="text-sm leading-6 text-slate-900">{comment.body}</p>
            <p className="mt-1 text-xs text-slate-600">
              {comment.authorName || "Runbase user"}
            </p>
          </article>
        ))}

        {!commentsQuery.isLoading && !commentsQuery.data?.length ? (
          <p
            role="status"
            aria-live="polite"
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            No comments yet.
          </p>
        ) : null}
      </div>

      <form
        className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
        onSubmit={handleSubmit}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment"
          maxLength={2000}
          required
          className="min-h-20 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
        />
        <div className="flex justify-end border-t border-slate-200 pt-2">
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
