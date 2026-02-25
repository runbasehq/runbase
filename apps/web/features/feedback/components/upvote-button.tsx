"use client";

import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLikes } from "~/likes/hooks/use-likes";

interface UpvoteButtonProps {
  workspaceSlug: string;
  postId: string;
  count: number;
  hasVoted: boolean;
  variant?: "default" | "rail";
  className?: string;
}

export function UpvoteButton({
  workspaceSlug,
  postId,
  count,
  hasVoted,
  variant = "default",
  className,
}: UpvoteButtonProps) {
  const { toggleLike, isPending } = useLikes({ workspaceSlug, postId });
  const [optimisticCount, setOptimisticCount] = useState(count);
  const [optimisticHasVoted, setOptimisticHasVoted] = useState(hasVoted);

  useEffect(() => {
    setOptimisticCount(count);
  }, [count]);

  useEffect(() => {
    setOptimisticHasVoted(hasVoted);
  }, [hasVoted]);

  function toggleVote() {
    if (isPending) {
      return;
    }

    const previousCount = optimisticCount;
    const previousHasVoted = optimisticHasVoted;
    const nextHasVoted = !optimisticHasVoted;
    const nextCount = Math.max(optimisticCount + (nextHasVoted ? 1 : -1), 0);

    setOptimisticHasVoted(nextHasVoted);
    setOptimisticCount(nextCount);

    toggleLike(
      { viewerHasVoted: previousHasVoted },
      {
        onError: () => {
          setOptimisticHasVoted(previousHasVoted);
          setOptimisticCount(previousCount);
        },
      },
    );
  }

  return (
    <motion.button
      type="button"
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        toggleVote();
      }}
      disabled={isPending}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "inline-flex cursor-pointer font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
        variant === "rail"
          ? "w-11 flex-col items-center justify-center gap-1 rounded-(--r-sm) border px-1 py-2 text-xs"
          : "items-center gap-2 rounded-(--r-sm) border px-3 py-1.5 text-sm",
        optimisticHasVoted
          ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
          : "border-(--border) bg-(--surface) text-(--muted)",
        className,
      )}
      aria-label={optimisticHasVoted ? "Remove upvote" : "Upvote post"}
    >
      <HugeiconsIcon
        icon={ArrowUp01Icon}
        strokeWidth={2}
        className={variant === "rail" ? "size-3.5" : "size-4"}
      />
      <span>{optimisticCount}</span>
    </motion.button>
  );
}
