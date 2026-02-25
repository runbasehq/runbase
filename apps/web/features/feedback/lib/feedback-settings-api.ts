import type {
  FeedbackBoardItem,
  FeedbackPublicSettings,
  FeedbackSettingsSnapshot,
  FeedbackStatusItem,
  FeedbackTagItem,
} from "./types";

interface FeedbackApiError {
  error?: string;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T &
    FeedbackApiError;

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export function fetchFeedbackSettingsSnapshot(workspaceSlug: string) {
  return requestJson<FeedbackSettingsSnapshot>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/settings`,
  );
}

export function updateFeedbackPublicSettings({
  workspaceSlug,
  settings,
}: {
  workspaceSlug: string;
  settings: FeedbackPublicSettings;
}) {
  return requestJson<{ settings: FeedbackPublicSettings }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/settings`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    },
  );
}

export function createFeedbackBoard({
  workspaceSlug,
  name,
  description,
}: {
  workspaceSlug: string;
  name: string;
  description: string | null;
}) {
  return requestJson<{ board: FeedbackBoardItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/boards`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description }),
    },
  );
}

export function updateFeedbackBoard({
  workspaceSlug,
  boardId,
  name,
  description,
}: {
  workspaceSlug: string;
  boardId: string;
  name: string;
  description: string | null;
}) {
  return requestJson<{ board: FeedbackBoardItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/boards/${encodeURIComponent(boardId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description }),
    },
  );
}

export function deleteFeedbackBoard({
  workspaceSlug,
  boardId,
}: {
  workspaceSlug: string;
  boardId: string;
}) {
  return requestJson<{ success: true; boardId: string }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/boards/${encodeURIComponent(boardId)}`,
    { method: "DELETE" },
  );
}

export function createFeedbackStatus({
  workspaceSlug,
  label,
  color,
  isClosed,
}: {
  workspaceSlug: string;
  label: string;
  color: string | null;
  isClosed: boolean;
}) {
  return requestJson<{ status: FeedbackStatusItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/statuses`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, color, isClosed }),
    },
  );
}

export function updateFeedbackStatus({
  workspaceSlug,
  statusId,
  label,
  color,
  isClosed,
}: {
  workspaceSlug: string;
  statusId: string;
  label: string;
  color: string | null;
  isClosed: boolean;
}) {
  return requestJson<{ status: FeedbackStatusItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/statuses/${encodeURIComponent(statusId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, color, isClosed }),
    },
  );
}

export function deleteFeedbackStatus({
  workspaceSlug,
  statusId,
}: {
  workspaceSlug: string;
  statusId: string;
}) {
  return requestJson<{ success: true; statusId: string }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/statuses/${encodeURIComponent(statusId)}`,
    { method: "DELETE" },
  );
}

export function createFeedbackTag({
  workspaceSlug,
  name,
  color,
}: {
  workspaceSlug: string;
  name: string;
  color: string | null;
}) {
  return requestJson<{ tag: FeedbackTagItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/tags`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color }),
    },
  );
}

export function updateFeedbackTag({
  workspaceSlug,
  tagId,
  name,
  color,
}: {
  workspaceSlug: string;
  tagId: string;
  name: string;
  color: string | null;
}) {
  return requestJson<{ tag: FeedbackTagItem }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/tags/${encodeURIComponent(tagId)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color }),
    },
  );
}

export function deleteFeedbackTag({
  workspaceSlug,
  tagId,
}: {
  workspaceSlug: string;
  tagId: string;
}) {
  return requestJson<{ success: true; tagId: string }>(
    `/api/workspaces/${encodeURIComponent(workspaceSlug)}/feedback/tags/${encodeURIComponent(tagId)}`,
    { method: "DELETE" },
  );
}
