"use client";

import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

interface UpvoteButtonProps {
  postId: string;
  initialCount: number;
  initialHasVoted: boolean;
}

interface VoteResponse {
  upvoteCount: number;
  viewerHasVoted: boolean;
}

export function UpvoteButton({
  postId,
  initialCount,
  initialHasVoted,
}: UpvoteButtonProps) {
  const [upvoteCount, setUpvoteCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isPending, setIsPending] = useState(false);

  async function toggleVote() {
    if (isPending) {
      return;
    }

    const previousState = { upvoteCount, hasVoted };
    const nextHasVoted = !hasVoted;

    setIsPending(true);
    setHasVoted(nextHasVoted);
    setUpvoteCount((current) => Math.max(current + (nextHasVoted ? 1 : -1), 0));

    try {
      const response = await fetch(`/api/feedback/posts/${postId}/vote`, {
        method: hasVoted ? "DELETE" : "POST",
      });

      if (!response.ok) {
        throw new Error(`Vote request failed with ${response.status}`);
      }

      const payload = (await response.json()) as VoteResponse;
      setHasVoted(payload.viewerHasVoted);
      setUpvoteCount(payload.upvoteCount);
    } catch {
      setHasVoted(previousState.hasVoted);
      setUpvoteCount(previousState.upvoteCount);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleVote}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-(--r-sm) border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        borderColor: hasVoted ? "var(--primary)" : "var(--border)",
        color: hasVoted ? "var(--primary)" : "var(--muted)",
        backgroundColor: hasVoted ? "var(--primary-soft)" : "var(--surface)",
      }}
      aria-label={hasVoted ? "Remove upvote" : "Upvote post"}
    >
      <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-4" />
      <span>{upvoteCount}</span>
    </button>
  );
}
