"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { feedbackQueryKeys } from "~/feedback/lib/query-keys";
import type {
  FeedbackPublicSettings,
  FeedbackSettingsSnapshot,
} from "~/feedback/lib/types";

import {
  createFeedbackBoard,
  createFeedbackStatus,
  createFeedbackTag,
  deleteFeedbackBoard,
  deleteFeedbackStatus,
  deleteFeedbackTag,
  fetchFeedbackSettingsSnapshot,
  updateFeedbackBoard,
  updateFeedbackPublicSettings,
  updateFeedbackStatus,
  updateFeedbackTag,
} from "../lib/feedback-settings-api";

interface UseFeedbackSettingsOptions {
  workspaceSlug: string;
  initialSnapshot: FeedbackSettingsSnapshot;
}

export function useFeedbackSettings({
  workspaceSlug,
  initialSnapshot,
}: UseFeedbackSettingsOptions) {
  return useQuery({
    queryKey: feedbackQueryKeys.settings(workspaceSlug),
    queryFn: () => fetchFeedbackSettingsSnapshot(workspaceSlug),
    initialData: initialSnapshot,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

function useInvalidateFeedbackSettings(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const key = feedbackQueryKeys.settings(workspaceSlug);

  return async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: key, exact: true });
  };
}

export function useUpdateFeedbackPublicSettingsMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "update-public"],
    mutationFn: (settings: FeedbackPublicSettings) =>
      updateFeedbackPublicSettings({ workspaceSlug, settings }),
    onSuccess: invalidate,
  });
}

export function useCreateFeedbackBoardMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "create-board"],
    mutationFn: (input: { name: string; description: string | null }) =>
      createFeedbackBoard({ workspaceSlug, ...input }),
    onSuccess: invalidate,
  });
}

export function useUpdateFeedbackBoardMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "update-board"],
    mutationFn: (input: {
      boardId: string;
      name: string;
      description: string | null;
    }) => updateFeedbackBoard({ workspaceSlug, ...input }),
    onSuccess: invalidate,
  });
}

export function useDeleteFeedbackBoardMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "delete-board"],
    mutationFn: (input: { boardId: string }) =>
      deleteFeedbackBoard({ workspaceSlug, boardId: input.boardId }),
    onSuccess: invalidate,
  });
}

export function useCreateFeedbackStatusMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "create-status"],
    mutationFn: (input: {
      label: string;
      color: string | null;
      isClosed: boolean;
    }) => createFeedbackStatus({ workspaceSlug, ...input }),
    onSuccess: invalidate,
  });
}

export function useUpdateFeedbackStatusMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "update-status"],
    mutationFn: (input: {
      statusId: string;
      label: string;
      color: string | null;
      isClosed: boolean;
    }) => updateFeedbackStatus({ workspaceSlug, ...input }),
    onSuccess: invalidate,
  });
}

export function useDeleteFeedbackStatusMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "delete-status"],
    mutationFn: (input: { statusId: string }) =>
      deleteFeedbackStatus({ workspaceSlug, statusId: input.statusId }),
    onSuccess: invalidate,
  });
}

export function useCreateFeedbackTagMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "create-tag"],
    mutationFn: (input: { name: string; color: string | null }) =>
      createFeedbackTag({ workspaceSlug, ...input }),
    onSuccess: invalidate,
  });
}

export function useUpdateFeedbackTagMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "update-tag"],
    mutationFn: (input: {
      tagId: string;
      name: string;
      color: string | null;
    }) => updateFeedbackTag({ workspaceSlug, ...input }),
    onSuccess: invalidate,
  });
}

export function useDeleteFeedbackTagMutation(workspaceSlug: string) {
  const invalidate = useInvalidateFeedbackSettings(workspaceSlug);

  return useMutation({
    mutationKey: [...feedbackQueryKeys.settings(workspaceSlug), "delete-tag"],
    mutationFn: (input: { tagId: string }) =>
      deleteFeedbackTag({ workspaceSlug, tagId: input.tagId }),
    onSuccess: invalidate,
  });
}
