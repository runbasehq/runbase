"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardRuntime } from "~/dashboard/components/dashboard-runtime-context";
import {
  useCreateFeedbackBoardMutation,
  useCreateFeedbackStatusMutation,
  useCreateFeedbackTagMutation,
  useDeleteFeedbackBoardMutation,
  useDeleteFeedbackStatusMutation,
  useDeleteFeedbackTagMutation,
  useFeedbackSettings,
  useUpdateFeedbackBoardMutation,
  useUpdateFeedbackPublicSettingsMutation,
  useUpdateFeedbackStatusMutation,
  useUpdateFeedbackTagMutation,
} from "~/feedback/hooks/use-feedback-settings";
import { FEEDBACK_DEFAULT_SORT_OPTIONS } from "~/feedback/lib/constants";
import type {
  FeedbackBoardItem,
  FeedbackDefaultSort,
  FeedbackSettingsSnapshot,
  FeedbackStatusItem,
  FeedbackTagItem,
} from "~/feedback/lib/types";

const FEEDBACK_COLOR_OPTIONS = [
  "#f43f5e",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#0ea5e9",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const SETTINGS_DIALOG_CONTENT_CLASS =
  "max-w-[640px] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.5)]";
const SETTINGS_DIALOG_HEADER_CLASS =
  "space-y-1 border-b border-slate-200 px-5 py-4";
const SETTINGS_DIALOG_BODY_CLASS = "space-y-4 px-5 py-4";
const SETTINGS_DIALOG_FOOTER_CLASS =
  "border-t border-slate-200 px-5 py-4 sm:gap-2";
const SETTINGS_FIELD_LABEL_CLASS = "block text-sm font-semibold text-slate-700";
const SETTINGS_INPUT_CLASS =
  "h-10 rounded-xl border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-400";

type BoardDialogState =
  | { mode: "create"; open: boolean; name: string; description: string }
  | {
      mode: "edit";
      open: boolean;
      boardId: string;
      name: string;
      description: string;
    };

type StatusDialogState =
  | {
      mode: "create";
      open: boolean;
      label: string;
      color: string;
      isClosed: boolean;
    }
  | {
      mode: "edit";
      open: boolean;
      statusId: string;
      label: string;
      color: string;
      isClosed: boolean;
    };

type TagDialogState =
  | { mode: "create"; open: boolean; name: string; color: string }
  | { mode: "edit"; open: boolean; tagId: string; name: string; color: string };

function normalizeColorValue(value: string) {
  return value.trim().toLowerCase();
}

function formatSortLabel(value: FeedbackDefaultSort) {
  return value === "new"
    ? "Recent posts"
    : value === "trending"
      ? "Trending"
      : "Top voted";
}

function SwitchRow({
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-(--r-sm) border border-(--border) bg-(--surface-2) px-3 py-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 rounded border-(--border)"
      />
      <span>
        <p className="text-sm font-semibold text-(--text)">{label}</p>
        <p className="mt-1 text-sm text-(--muted)">{description}</p>
      </span>
    </label>
  );
}

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FEEDBACK_COLOR_OPTIONS.map((option) => {
        const selected = normalizeColorValue(color) === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`relative size-8 rounded-md border transition-transform hover:scale-[1.03] ${selected ? "scale-[1.04] border-slate-900 ring-2 ring-slate-300" : "border-slate-200"}`}
            style={{ backgroundColor: option }}
            aria-label={`Pick ${option} color`}
          >
            {selected ? (
              <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-white">
                ✓
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function FeedbackRoadmapSettings({
  initialSnapshot,
}: {
  initialSnapshot: FeedbackSettingsSnapshot;
}) {
  const { workspaceSlug } = useDashboardRuntime();
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useFeedbackSettings({ workspaceSlug, initialSnapshot });
  const updatePublicSettingsMutation =
    useUpdateFeedbackPublicSettingsMutation(workspaceSlug);
  const createBoardMutation = useCreateFeedbackBoardMutation(workspaceSlug);
  const updateBoardMutation = useUpdateFeedbackBoardMutation(workspaceSlug);
  const deleteBoardMutation = useDeleteFeedbackBoardMutation(workspaceSlug);
  const createStatusMutation = useCreateFeedbackStatusMutation(workspaceSlug);
  const updateStatusMutation = useUpdateFeedbackStatusMutation(workspaceSlug);
  const deleteStatusMutation = useDeleteFeedbackStatusMutation(workspaceSlug);
  const createTagMutation = useCreateFeedbackTagMutation(workspaceSlug);
  const updateTagMutation = useUpdateFeedbackTagMutation(workspaceSlug);
  const deleteTagMutation = useDeleteFeedbackTagMutation(workspaceSlug);

  const snapshot = settingsQuery.data ?? initialSnapshot;
  const canManage = snapshot.permissions.canManageFeedbackSettings;
  const [draftSettings, setDraftSettings] = useState(snapshot.settings);
  const [boardDialog, setBoardDialog] = useState<BoardDialogState>({
    mode: "create",
    open: false,
    name: "",
    description: "",
  });
  const [statusDialog, setStatusDialog] = useState<StatusDialogState>({
    mode: "create",
    open: false,
    label: "",
    color: FEEDBACK_COLOR_OPTIONS[6],
    isClosed: false,
  });
  const [tagDialog, setTagDialog] = useState<TagDialogState>({
    mode: "create",
    open: false,
    name: "",
    color: FEEDBACK_COLOR_OPTIONS[5],
  });

  const isSavingPublicSettings = updatePublicSettingsMutation.isPending;
  const isMutatingEntities =
    createBoardMutation.isPending ||
    updateBoardMutation.isPending ||
    deleteBoardMutation.isPending ||
    createStatusMutation.isPending ||
    updateStatusMutation.isPending ||
    deleteStatusMutation.isPending ||
    createTagMutation.isPending ||
    updateTagMutation.isPending ||
    deleteTagMutation.isPending;

  useEffect(() => {
    setDraftSettings(snapshot.settings);
  }, [
    snapshot.settings.allowPublicTagSelection,
    snapshot.settings.defaultSort,
    snapshot.settings.hideAllStatuses,
    snapshot.settings.hideClosedStatuses,
    snapshot.settings.hideLeaderboard,
  ]);

  const hasPendingSettingsChanges = useMemo(
    () => JSON.stringify(draftSettings) !== JSON.stringify(snapshot.settings),
    [draftSettings, snapshot.settings],
  );

  function openCreateBoardDialog() {
    setBoardDialog({ mode: "create", open: true, name: "", description: "" });
  }

  function openEditBoardDialog(board: FeedbackBoardItem) {
    setBoardDialog({
      mode: "edit",
      open: true,
      boardId: board.id,
      name: board.name,
      description: board.description ?? "",
    });
  }

  function openCreateStatusDialog() {
    setStatusDialog({
      mode: "create",
      open: true,
      label: "",
      color: FEEDBACK_COLOR_OPTIONS[6],
      isClosed: false,
    });
  }

  function openEditStatusDialog(status: FeedbackStatusItem) {
    setStatusDialog({
      mode: "edit",
      open: true,
      statusId: status.id,
      label: status.label,
      color: status.color ?? FEEDBACK_COLOR_OPTIONS[6],
      isClosed: status.isClosed,
    });
  }

  function openCreateTagDialog() {
    setTagDialog({
      mode: "create",
      open: true,
      name: "",
      color: FEEDBACK_COLOR_OPTIONS[5],
    });
  }

  function openEditTagDialog(tag: FeedbackTagItem) {
    setTagDialog({
      mode: "edit",
      open: true,
      tagId: tag.id,
      name: tag.name,
      color: tag.color ?? FEEDBACK_COLOR_OPTIONS[5],
    });
  }

  async function handleSavePublicSettings() {
    if (!canManage || !hasPendingSettingsChanges) {
      return;
    }

    setError(null);

    try {
      await updatePublicSettingsMutation.mutateAsync(draftSettings);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save public feedback settings",
      );
    }
  }

  async function handleSubmitBoardDialog() {
    if (!canManage || isMutatingEntities) {
      return;
    }

    const name = boardDialog.name.trim();
    const description = boardDialog.description.trim() || null;

    if (!name.length) {
      setError("Board name is required");
      return;
    }

    setError(null);

    try {
      if (boardDialog.mode === "create") {
        await createBoardMutation.mutateAsync({ name, description });
      } else {
        await updateBoardMutation.mutateAsync({
          boardId: boardDialog.boardId,
          name,
          description,
        });
      }

      setBoardDialog((current) => ({ ...current, open: false }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save board",
      );
    }
  }

  async function handleDeleteBoard(boardId: string) {
    if (!canManage || isMutatingEntities) {
      return;
    }

    setError(null);

    try {
      await deleteBoardMutation.mutateAsync({ boardId });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete board",
      );
    }
  }

  async function handleSubmitStatusDialog() {
    if (!canManage || isMutatingEntities) {
      return;
    }

    const label = statusDialog.label.trim();
    const color = normalizeColorValue(statusDialog.color) || null;

    if (!label.length) {
      setError("Status name is required");
      return;
    }

    setError(null);

    try {
      if (statusDialog.mode === "create") {
        await createStatusMutation.mutateAsync({
          label,
          color,
          isClosed: statusDialog.isClosed,
        });
      } else {
        await updateStatusMutation.mutateAsync({
          statusId: statusDialog.statusId,
          label,
          color,
          isClosed: statusDialog.isClosed,
        });
      }

      setStatusDialog((current) => ({ ...current, open: false }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save status",
      );
    }
  }

  async function handleDeleteStatus(statusId: string) {
    if (!canManage || isMutatingEntities) {
      return;
    }

    setError(null);

    try {
      await deleteStatusMutation.mutateAsync({ statusId });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete status",
      );
    }
  }

  async function handleSubmitTagDialog() {
    if (!canManage || isMutatingEntities) {
      return;
    }

    const name = tagDialog.name.trim();
    const color = normalizeColorValue(tagDialog.color) || null;

    if (!name.length) {
      setError("Tag name is required");
      return;
    }

    setError(null);

    try {
      if (tagDialog.mode === "create") {
        await createTagMutation.mutateAsync({ name, color });
      } else {
        await updateTagMutation.mutateAsync({
          tagId: tagDialog.tagId,
          name,
          color,
        });
      }

      setTagDialog((current) => ({ ...current, open: false }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save tag",
      );
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!canManage || isMutatingEntities) {
      return;
    }

    setError(null);

    try {
      await deleteTagMutation.mutateAsync({ tagId });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete tag",
      );
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-(--r-sm) border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {!canManage ? (
        <p className="rounded-(--r-sm) border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Only workspace admins can modify feedback and roadmap settings.
        </p>
      ) : null}

      <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-(--text)">
              Boards & portal behavior
            </h2>
            <p className="mt-1 text-sm text-(--muted)">
              Control how your feedback portal behaves for public users.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              !canManage || isSavingPublicSettings || !hasPendingSettingsChanges
            }
            onClick={() => {
              void handleSavePublicSettings();
            }}
          >
            {isSavingPublicSettings ? "Saving..." : "Save settings"}
          </Button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-(--text)">
              Default sorting
            </span>
            <select
              value={draftSettings.defaultSort}
              onChange={(event) =>
                setDraftSettings((current) => ({
                  ...current,
                  defaultSort: event.target.value as FeedbackDefaultSort,
                }))
              }
              disabled={!canManage}
              className="h-10 w-full rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 text-sm text-(--text) outline-none focus:border-(--primary)"
            >
              {FEEDBACK_DEFAULT_SORT_OPTIONS.map((sortOption) => (
                <option key={sortOption} value={sortOption}>
                  {formatSortLabel(sortOption)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <SwitchRow
            checked={draftSettings.hideLeaderboard}
            disabled={!canManage}
            label="Hide leaderboard from public portal"
            description="Disable the leaderboard module for all public visitors."
            onChange={(checked) =>
              setDraftSettings((current) => ({
                ...current,
                hideLeaderboard: checked,
              }))
            }
          />
          <SwitchRow
            checked={draftSettings.hideClosedStatuses}
            disabled={!canManage}
            label="Hide completed and canceled posts"
            description="Keep closed feedback items out of the public board listing."
            onChange={(checked) =>
              setDraftSettings((current) => ({
                ...current,
                hideClosedStatuses: checked,
              }))
            }
          />
          <SwitchRow
            checked={draftSettings.hideAllStatuses}
            disabled={!canManage}
            label="Hide all statuses from public board"
            description="Do not display status labels on the public feedback board."
            onChange={(checked) =>
              setDraftSettings((current) => ({
                ...current,
                hideAllStatuses: checked,
              }))
            }
          />
          <SwitchRow
            checked={draftSettings.allowPublicTagSelection}
            disabled={!canManage}
            label="Allow users to add tags when creating a post"
            description="When enabled, non-members can choose from your existing tags."
            onChange={(checked) =>
              setDraftSettings((current) => ({
                ...current,
                allowPublicTagSelection: checked,
              }))
            }
          />
        </div>
      </section>

      <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-(--text)">Boards</h2>
            <p className="mt-1 text-sm text-(--muted)">
              Add, rename, and remove public feedback boards.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canManage || isMutatingEntities}
            onClick={openCreateBoardDialog}
          >
            Add board
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {snapshot.boards.map((board) => (
            <div
              key={board.id}
              className="flex flex-wrap items-center gap-3 rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-(--text)">
                  {board.name}
                </p>
                {board.description ? (
                  <p className="truncate text-xs text-(--muted)">
                    {board.description}
                  </p>
                ) : null}
              </div>
              {board.isDefault ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Default
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManage || isMutatingEntities}
                onClick={() => openEditBoardDialog(board)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!canManage || isMutatingEntities}
                onClick={() => {
                  void handleDeleteBoard(board.id);
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-(--text)">Statuses</h2>
            <p className="mt-1 text-sm text-(--muted)">
              Define lifecycle states shown across your feedback posts.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canManage || isMutatingEntities}
            onClick={openCreateStatusDialog}
          >
            New status
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {snapshot.statuses.map((status) => (
            <div
              key={status.id}
              className="flex flex-wrap items-center gap-3 rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 py-2.5"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: status.color ?? "#94a3b8" }}
              />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-(--text)">
                {status.label}
              </p>
              {status.isDefault ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Default
                </span>
              ) : null}
              {status.isClosed ? (
                <span className="rounded-full border border-(--border) bg-(--surface-2) px-2 py-0.5 text-[11px] font-semibold text-(--muted)">
                  Closed
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManage || isMutatingEntities}
                onClick={() => openEditStatusDialog(status)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!canManage || isMutatingEntities}
                onClick={() => {
                  void handleDeleteStatus(status.id);
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-(--r-md) border border-(--border) bg-(--surface) p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-(--text)">Tags</h2>
            <p className="mt-1 text-sm text-(--muted)">
              Manage tags used to categorize feedback posts.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canManage || isMutatingEntities}
            onClick={openCreateTagDialog}
          >
            New tag
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {snapshot.tags.map((tag) => (
            <div
              key={tag.id}
              className="flex flex-wrap items-center gap-3 rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 py-2.5"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: tag.color ?? "#94a3b8" }}
              />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-(--text)">
                {tag.name}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canManage || isMutatingEntities}
                onClick={() => openEditTagDialog(tag)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!canManage || isMutatingEntities}
                onClick={() => {
                  void handleDeleteTag(tag.id);
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Dialog
        open={boardDialog.open}
        onOpenChange={(open) =>
          setBoardDialog((current) => ({ ...current, open }))
        }
      >
        <DialogContent className={SETTINGS_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={SETTINGS_DIALOG_HEADER_CLASS}>
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
              {boardDialog.mode === "create" ? "Add board" : "Edit board"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define how this board is presented on your public feedback portal.
            </DialogDescription>
          </DialogHeader>

          <div className={SETTINGS_DIALOG_BODY_CLASS}>
            <label className="space-y-1">
              <span className={SETTINGS_FIELD_LABEL_CLASS}>Name</span>
              <Input
                value={boardDialog.name}
                onChange={(event) =>
                  setBoardDialog((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Idea or bug"
                className={SETTINGS_INPUT_CLASS}
              />
            </label>
            <label className="space-y-1">
              <span className={SETTINGS_FIELD_LABEL_CLASS}>Description</span>
              <Input
                value={boardDialog.description}
                onChange={(event) =>
                  setBoardDialog((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional"
                className={SETTINGS_INPUT_CLASS}
              />
            </label>
          </div>

          <DialogFooter className={SETTINGS_DIALOG_FOOTER_CLASS}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setBoardDialog((current) => ({ ...current, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void handleSubmitBoardDialog();
              }}
              disabled={!canManage || isMutatingEntities}
            >
              {boardDialog.mode === "create" ? "Create board" : "Save board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) =>
          setStatusDialog((current) => ({ ...current, open }))
        }
      >
        <DialogContent className={SETTINGS_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={SETTINGS_DIALOG_HEADER_CLASS}>
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
              {statusDialog.mode === "create" ? "Add status" : "Edit status"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Choose a status name and color. Closed statuses can be hidden from
              public board via settings.
            </DialogDescription>
          </DialogHeader>

          <div className={SETTINGS_DIALOG_BODY_CLASS}>
            <label className="space-y-1">
              <span className={SETTINGS_FIELD_LABEL_CLASS}>Name</span>
              <Input
                value={statusDialog.label}
                onChange={(event) =>
                  setStatusDialog((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="In review"
                className={SETTINGS_INPUT_CLASS}
              />
            </label>

            <div className="space-y-2">
              <span className={SETTINGS_FIELD_LABEL_CLASS}>Color</span>
              <ColorPicker
                color={statusDialog.color}
                onChange={(color) =>
                  setStatusDialog((current) => ({ ...current, color }))
                }
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={statusDialog.isClosed}
                onChange={(event) =>
                  setStatusDialog((current) => ({
                    ...current,
                    isClosed: event.target.checked,
                  }))
                }
                className="mt-0.5 size-4 rounded border-slate-300"
              />
              Treat as closed status
            </label>
          </div>

          <DialogFooter className={SETTINGS_DIALOG_FOOTER_CLASS}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setStatusDialog((current) => ({ ...current, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void handleSubmitStatusDialog();
              }}
              disabled={!canManage || isMutatingEntities}
            >
              {statusDialog.mode === "create"
                ? "Create status"
                : "Change status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tagDialog.open}
        onOpenChange={(open) =>
          setTagDialog((current) => ({ ...current, open }))
        }
      >
        <DialogContent className={SETTINGS_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={SETTINGS_DIALOG_HEADER_CLASS}>
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
              {tagDialog.mode === "create" ? "Add tag" : "Edit tag"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Tags are available during post creation for allowed users.
            </DialogDescription>
          </DialogHeader>

          <div className={SETTINGS_DIALOG_BODY_CLASS}>
            <label className="space-y-1">
              <span className={SETTINGS_FIELD_LABEL_CLASS}>Name</span>
              <Input
                value={tagDialog.name}
                onChange={(event) =>
                  setTagDialog((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="High priority"
                className={SETTINGS_INPUT_CLASS}
              />
            </label>

            <div className="space-y-2">
              <span className={SETTINGS_FIELD_LABEL_CLASS}>Color</span>
              <ColorPicker
                color={tagDialog.color}
                onChange={(color) =>
                  setTagDialog((current) => ({ ...current, color }))
                }
              />
            </div>
          </div>

          <DialogFooter className={SETTINGS_DIALOG_FOOTER_CLASS}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setTagDialog((current) => ({ ...current, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void handleSubmitTagDialog();
              }}
              disabled={!canManage || isMutatingEntities}
            >
              {tagDialog.mode === "create" ? "Create tag" : "Save tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
