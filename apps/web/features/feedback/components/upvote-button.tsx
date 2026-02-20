"use client";

import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLikes } from "~/likes/hooks/use-likes";

interface UpvoteButtonProps {
  workspaceSlug: string;
  postId: string;
  initialCount: number;
  initialHasVoted: boolean;
}

export function UpvoteButton({
  workspaceSlug,
  postId,
  initialCount,
  initialHasVoted,
}: UpvoteButtonProps) {
  const { toggleLike, isPending } = useLikes({ workspaceSlug, postId });

  function toggleVote() {
    if (isPending) {
      return;
    }

    toggleLike({ viewerHasVoted: initialHasVoted });
  }

  return (
    <button
      type="button"
      onClick={toggleVote}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-(--r-sm) border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        borderColor: initialHasVoted ? "var(--primary)" : "var(--border)",
        color: initialHasVoted ? "var(--primary)" : "var(--muted)",
        backgroundColor: initialHasVoted
          ? "var(--primary-soft)"
          : "var(--surface)",
      }}
      aria-label={initialHasVoted ? "Remove upvote" : "Upvote post"}
    >
      <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-4" />
      <span>{initialCount}</span>
    </button>
  );
}
