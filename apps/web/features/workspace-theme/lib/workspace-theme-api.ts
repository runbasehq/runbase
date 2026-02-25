import type {
  WorkspacePublicTheme,
  WorkspaceThemeMediaType,
  WorkspaceThemeSnapshot,
  WorkspaceThemeUploadedMedia,
} from "./types";

interface WorkspaceThemeApiError {
  error?: string;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T &
    WorkspaceThemeApiError;

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export async function fetchWorkspaceThemeSnapshot(workspaceSlug: string) {
  return requestJson<WorkspaceThemeSnapshot>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/theme`,
  );
}

export async function updateWorkspaceTheme({
  workspaceSlug,
  theme,
}: {
  workspaceSlug: string;
  theme: WorkspacePublicTheme;
}) {
  return requestJson<WorkspaceThemeSnapshot>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/theme`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(theme),
    },
  );
}

export async function uploadWorkspaceThemeMedia({
  workspaceSlug,
  mediaType,
  file,
}: {
  workspaceSlug: string;
  mediaType: WorkspaceThemeMediaType;
  file: File;
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mediaType", mediaType);

  const response = await requestJson<{ media: WorkspaceThemeUploadedMedia }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/theme/media`,
    {
      method: "POST",
      body: formData,
    },
  );

  return response.media;
}
