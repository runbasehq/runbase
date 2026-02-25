"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchWorkspaceThemeSnapshot,
  uploadWorkspaceThemeMedia,
  updateWorkspaceTheme,
} from "~/workspace-theme/lib/workspace-theme-api";
import { workspaceThemeQueryKeys } from "~/workspace-theme/lib/query-keys";
import type {
  WorkspaceThemeMediaType,
  WorkspacePublicTheme,
  WorkspaceThemeSnapshot,
} from "~/workspace-theme/lib/types";

interface UseWorkspaceThemeOptions {
  workspaceSlug: string;
  initialSnapshot: WorkspaceThemeSnapshot;
}

export function useWorkspaceTheme({
  workspaceSlug,
  initialSnapshot,
}: UseWorkspaceThemeOptions) {
  return useQuery({
    queryKey: workspaceThemeQueryKeys.byWorkspace(workspaceSlug),
    queryFn: () => fetchWorkspaceThemeSnapshot(workspaceSlug),
    initialData: initialSnapshot,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateWorkspaceThemeMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const key = workspaceThemeQueryKeys.byWorkspace(workspaceSlug);

  return useMutation({
    mutationKey: [...workspaceThemeQueryKeys.all, workspaceSlug, "update"],
    mutationFn: (theme: WorkspacePublicTheme) =>
      updateWorkspaceTheme({ workspaceSlug, theme }),
    onSuccess: async (snapshot) => {
      queryClient.setQueryData(key, snapshot);
      await queryClient.invalidateQueries({ queryKey: key, exact: true });
    },
  });
}

export function useUploadWorkspaceThemeMediaMutation(workspaceSlug: string) {
  return useMutation({
    mutationKey: [
      ...workspaceThemeQueryKeys.all,
      workspaceSlug,
      "upload-media",
    ],
    mutationFn: ({
      mediaType,
      file,
    }: {
      mediaType: WorkspaceThemeMediaType;
      file: File;
    }) => uploadWorkspaceThemeMedia({ workspaceSlug, mediaType, file }),
  });
}
