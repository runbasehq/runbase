"use client";

import { useRouter } from "next/navigation";

import { CreateFeedbackPostDialog } from "~/feedback/components/create-feedback-post-dialog";
import type {
  FeedbackBoardItem,
  FeedbackStatusItem,
  FeedbackTagItem,
} from "~/feedback/lib/types";

interface DashboardFeedbackCreatePostButtonProps {
  workspaceSlug: string;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name">;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label" | "isClosed">;
  availableTags: FeedbackTagItem[];
  viewer: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function DashboardFeedbackCreatePostButton({
  workspaceSlug,
  defaultBoard,
  defaultStatus,
  availableTags,
  viewer,
}: DashboardFeedbackCreatePostButtonProps) {
  const router = useRouter();

  return (
    <CreateFeedbackPostDialog
      workspaceSlug={workspaceSlug}
      defaultBoard={defaultBoard}
      defaultStatus={defaultStatus}
      availableTags={availableTags}
      canAssignTags
      viewer={viewer}
      onPostCreated={() => {
        router.refresh();
      }}
    />
  );
}
