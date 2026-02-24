"use client";

import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
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

  function toggleVote() {
    if (isPending) {
      return;
    }

    toggleLike({ viewerHasVoted: hasVoted });
  }

  return (
    <motion.button
      type="button"
      onClick={toggleVote}
      disabled={isPending}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "inline-flex font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
        variant === "rail"
          ? "w-11 flex-col items-center justify-center gap-1 rounded-(--r-sm) border px-1 py-2 text-xs"
          : "items-center gap-2 rounded-(--r-sm) border px-3 py-1.5 text-sm",
        hasVoted
          ? "border-indigo-500 bg-indigo-50 text-indigo-600"
          : "border-slate-300 bg-white text-slate-500",
        className,
      )}
      aria-label={hasVoted ? "Remove upvote" : "Upvote post"}
    >
      <HugeiconsIcon
        icon={ArrowUp01Icon}
        strokeWidth={2}
        className={variant === "rail" ? "size-3.5" : "size-4"}
      />
      <span>{count}</span>
    </motion.button>
  );
}
