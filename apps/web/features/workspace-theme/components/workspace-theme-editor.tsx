"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { FancyButton } from "@/components/ui/fancy-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { protocol, rootDomain } from "@/lib/utils";
import { PublicFeedbackPage } from "~/feedback/components/public-feedback-page";
import type {
  FeedbackBoardItem,
  FeedbackPostItem,
  FeedbackStatusItem,
} from "~/feedback/lib/types";
import {
  DEFAULT_WORKSPACE_PUBLIC_THEME,
  normalizeWorkspacePublicTheme,
} from "~/workspace-theme/lib/theme-defaults";
import {
  useUploadWorkspaceThemeMediaMutation,
  useUpdateWorkspaceThemeMutation,
  useWorkspaceTheme,
} from "~/workspace-theme/hooks/use-workspace-theme";
import type {
  WorkspacePublicTheme,
  WorkspaceThemeMediaType,
  WorkspaceThemeSnapshot,
} from "~/workspace-theme/lib/types";

const COLOR_FIELDS: Array<{
  id: keyof Pick<
    WorkspacePublicTheme,
    | "primaryColor"
    | "backgroundColor"
    | "surfaceColor"
    | "textColor"
    | "borderColor"
  >;
  label: string;
}> = [
  { id: "primaryColor", label: "Primary" },
  { id: "backgroundColor", label: "Background" },
  { id: "surfaceColor", label: "Surface" },
  { id: "textColor", label: "Text" },
  { id: "borderColor", label: "Border" },
];

const FONT_OPTIONS: Array<{
  value: WorkspacePublicTheme["fontFamily"];
  label: string;
}> = [
  { value: "inter", label: "Inter" },
  { value: "system", label: "System Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

const RADIUS_OPTIONS = [
  { label: "Small", value: 10 },
  { label: "Medium", value: 14 },
  { label: "Large", value: 18 },
  { label: "XL", value: 24 },
] as const;

const THEME_MEDIA_ACCEPT = "image/png,image/jpeg,image/webp";
const THEME_MEDIA_ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const THEME_MEDIA_MAX_BYTES: Record<WorkspaceThemeMediaType, number> = {
  logo: 2 * 1024 * 1024,
  banner: 8 * 1024 * 1024,
};

function getThemeMediaLabel(mediaType: WorkspaceThemeMediaType) {
  return mediaType === "logo" ? "Logo" : "Banner";
}

function getThemeMediaHint(mediaType: WorkspaceThemeMediaType) {
  return mediaType === "logo" ? "500x500 rec." : "1200x300+";
}

function getThemeMediaRuleText(mediaType: WorkspaceThemeMediaType) {
  return mediaType === "logo"
    ? "Logo must be square and at least 256x256 px (500x500 recommended)."
    : "Banner must be wide, between 1200x300 and 2600x1000 px.";
}

function validateThemeMediaFile(
  mediaType: WorkspaceThemeMediaType,
  file: File,
): string | null {
  if (!THEME_MEDIA_ALLOWED_CONTENT_TYPES.has(file.type)) {
    return "Only PNG, JPEG, and WEBP images are supported.";
  }

  const maxBytes = THEME_MEDIA_MAX_BYTES[mediaType];
  if (file.size > maxBytes) {
    return mediaType === "logo"
      ? "Logo image must be 2 MB or smaller."
      : "Banner image must be 8 MB or smaller.";
  }

  return null;
}

interface WorkspaceThemePreviewData {
  initialPosts: FeedbackPostItem[];
  isAuthenticated: boolean;
  viewer: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  isWorkspaceOwner: boolean;
  githubAuthEnabled: boolean;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name"> | null;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label"> | null;
}

function CompactColorControl({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-2 py-1.5"
    >
      <input
        id={id}
        type="color"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="size-5 cursor-pointer rounded border border-(--border) bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-xs font-medium text-(--muted)">{label}</span>
    </label>
  );
}

export function WorkspaceThemeEditor({
  workspaceSlug,
  workspaceName,
  initialSnapshot,
  previewData,
}: {
  workspaceSlug: string;
  workspaceName: string;
  initialSnapshot: WorkspaceThemeSnapshot;
  previewData: WorkspaceThemePreviewData;
}) {
  const publicWorkspaceUrl = `${protocol}://${workspaceSlug}.${rootDomain}`;
  const themeQuery = useWorkspaceTheme({
    workspaceSlug,
    initialSnapshot,
  });
  const updateThemeMutation = useUpdateWorkspaceThemeMutation(workspaceSlug);
  const uploadThemeMediaMutation =
    useUploadWorkspaceThemeMediaMutation(workspaceSlug);
  const persistedTheme = themeQuery.data?.theme ?? initialSnapshot.theme;
  const persistedSerialized = useMemo(
    () => JSON.stringify(persistedTheme),
    [persistedTheme],
  );
  const [draftThemeOverride, setDraftThemeOverride] =
    useState<WorkspacePublicTheme | null>(null);
  const [editorToolbarHeight, setEditorToolbarHeight] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const editorToolbarRef = useRef<HTMLDivElement | null>(null);
  const draftTheme = draftThemeOverride ?? persistedTheme;

  const draftSerialized = useMemo(
    () => JSON.stringify(draftTheme),
    [draftTheme],
  );
  const isDirty = draftSerialized !== persistedSerialized;
  const canEdit = themeQuery.data?.permissions.canEditTheme ?? false;
  const isUploadingLogo =
    uploadThemeMediaMutation.isPending &&
    uploadThemeMediaMutation.variables?.mediaType === "logo";
  const isUploadingBanner =
    uploadThemeMediaMutation.isPending &&
    uploadThemeMediaMutation.variables?.mediaType === "banner";
  const isBusy =
    updateThemeMutation.isPending || uploadThemeMediaMutation.isPending;
  const previewTheme = useMemo(
    () => normalizeWorkspacePublicTheme(draftTheme),
    [draftTheme],
  );

  function updateThemeField<Key extends keyof WorkspacePublicTheme>(
    key: Key,
    value: WorkspacePublicTheme[Key],
  ) {
    setSubmitError(null);
    setSubmitSuccess(null);
    setDraftThemeOverride((currentThemeState) => {
      const currentTheme = currentThemeState ?? persistedTheme;
      return {
        ...currentTheme,
        [key]: value,
      };
    });
  }

  useEffect(() => {
    const toolbarNode = editorToolbarRef.current;

    if (!toolbarNode) {
      return;
    }

    const updateToolbarHeight = () => {
      const nextValue = Math.max(
        0,
        Math.round(toolbarNode.getBoundingClientRect().height),
      );
      setEditorToolbarHeight((currentValue) =>
        currentValue === nextValue ? currentValue : nextValue,
      );
    };

    updateToolbarHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateToolbarHeight();
    });

    observer.observe(toolbarNode);

    return () => {
      observer.disconnect();
    };
  }, []);

  function clearThemeMedia(mediaType: WorkspaceThemeMediaType) {
    setSubmitError(null);
    setSubmitSuccess(null);
    const field: "logoUrl" | "bannerUrl" =
      mediaType === "logo" ? "logoUrl" : "bannerUrl";

    setDraftThemeOverride((currentThemeState) => {
      const currentTheme = currentThemeState ?? persistedTheme;
      return {
        ...currentTheme,
        [field]: null,
      };
    });
  }

  function openThemeMediaFileDialog(mediaType: WorkspaceThemeMediaType) {
    if (mediaType === "logo") {
      logoFileInputRef.current?.click();
      return;
    }

    bannerFileInputRef.current?.click();
  }

  async function handleThemeMediaUpload(
    mediaType: WorkspaceThemeMediaType,
    file: File,
  ) {
    if (!canEdit || isBusy) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);

    const validationError = validateThemeMediaFile(mediaType, file);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    try {
      const uploadedMedia = await uploadThemeMediaMutation.mutateAsync({
        mediaType,
        file,
      });
      const field: "logoUrl" | "bannerUrl" =
        mediaType === "logo" ? "logoUrl" : "bannerUrl";

      setDraftThemeOverride((currentThemeState) => {
        const currentTheme = currentThemeState ?? persistedTheme;
        return {
          ...currentTheme,
          [field]: uploadedMedia.url,
        };
      });
      setSubmitSuccess(
        `${getThemeMediaLabel(mediaType)} uploaded (${uploadedMedia.width}x${uploadedMedia.height}). Save to publish.`,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not upload media",
      );
    }
  }

  function onThemeMediaInputChange(
    mediaType: WorkspaceThemeMediaType,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    void handleThemeMediaUpload(mediaType, file);
  }

  function resetToSavedTheme() {
    setSubmitError(null);
    setSubmitSuccess(null);
    setDraftThemeOverride(null);
  }

  function resetToDefaultTheme() {
    setSubmitError(null);
    setSubmitSuccess(null);
    setDraftThemeOverride({ ...DEFAULT_WORKSPACE_PUBLIC_THEME });
  }

  async function handleSaveTheme() {
    if (!canEdit) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await updateThemeMutation.mutateAsync(draftTheme);
      setDraftThemeOverride(null);
      setSubmitSuccess("Saved. Public page updated.");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not save theme",
      );
    }
  }

  return (
    <section className="flex min-h-screen flex-col">
      <motion.div
        ref={editorToolbarRef}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="sticky top-0 z-30 border-b border-(--border) bg-(--surface)/95 backdrop-blur"
      >
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:px-4">
          <span className="rounded-lg border border-(--border) bg-(--surface-2) px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-(--muted)">
            Editor mode
          </span>

          {COLOR_FIELDS.map((field) => (
            <CompactColorControl
              key={field.id}
              id={`theme-${field.id}`}
              label={field.label}
              value={previewTheme[field.id]}
              disabled={!canEdit || isBusy}
              onChange={(value) => updateThemeField(field.id, value)}
            />
          ))}

          <Select
            value={String(previewTheme.cornerRadius)}
            onValueChange={(value) =>
              updateThemeField("cornerRadius", Number(value))
            }
            disabled={!canEdit || isBusy}
          >
            <SelectTrigger className="h-8 min-w-[112px] rounded-lg border-(--border) bg-(--surface) px-2 text-xs">
              <SelectValue placeholder="Radius" />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={previewTheme.fontFamily}
            onValueChange={(value) =>
              updateThemeField(
                "fontFamily",
                value as WorkspacePublicTheme["fontFamily"],
              )
            }
            disabled={!canEdit || isBusy}
          >
            <SelectTrigger className="h-8 min-w-[118px] rounded-lg border-(--border) bg-(--surface) px-2 text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface) px-1.5 py-1">
            <span className="text-xs font-medium text-(--muted)">Logo</span>
            <span className="text-[11px] text-(--muted)">
              {getThemeMediaHint("logo")}
            </span>
            <FancyButton.Root
              type="button"
              variant="basic"
              size="xsmall"
              className="h-7 rounded-md px-2 text-[11px]"
              onClick={() => openThemeMediaFileDialog("logo")}
              disabled={!canEdit || isBusy}
            >
              {isUploadingLogo
                ? "Uploading..."
                : draftTheme.logoUrl
                  ? "Replace"
                  : "Upload"}
            </FancyButton.Root>
            <FancyButton.Root
              type="button"
              variant="basic"
              size="xsmall"
              className="h-7 rounded-md px-2 text-[11px]"
              onClick={() => clearThemeMedia("logo")}
              disabled={!canEdit || isBusy || !draftTheme.logoUrl}
            >
              Clear
            </FancyButton.Root>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-(--border) bg-(--surface) px-1.5 py-1">
            <span className="text-xs font-medium text-(--muted)">Banner</span>
            <span className="text-[11px] text-(--muted)">
              {getThemeMediaHint("banner")}
            </span>
            <FancyButton.Root
              type="button"
              variant="basic"
              size="xsmall"
              className="h-7 rounded-md px-2 text-[11px]"
              onClick={() => openThemeMediaFileDialog("banner")}
              disabled={!canEdit || isBusy}
            >
              {isUploadingBanner
                ? "Uploading..."
                : draftTheme.bannerUrl
                  ? "Replace"
                  : "Upload"}
            </FancyButton.Root>
            <FancyButton.Root
              type="button"
              variant="basic"
              size="xsmall"
              className="h-7 rounded-md px-2 text-[11px]"
              onClick={() => clearThemeMedia("banner")}
              disabled={!canEdit || isBusy || !draftTheme.bannerUrl}
            >
              Clear
            </FancyButton.Root>
          </div>

          <FancyButton.Root
            asChild
            variant="basic"
            size="xsmall"
            className="h-8 rounded-lg px-3"
          >
            <Link href={publicWorkspaceUrl} target="_blank" rel="noreferrer">
              Open public
            </Link>
          </FancyButton.Root>

          <FancyButton.Root
            type="button"
            variant="basic"
            size="xsmall"
            className="h-8 rounded-lg px-3"
            onClick={resetToSavedTheme}
            disabled={!isDirty || isBusy}
          >
            Discard
          </FancyButton.Root>

          <FancyButton.Root
            type="button"
            variant="basic"
            size="xsmall"
            className="h-8 rounded-lg px-3"
            onClick={resetToDefaultTheme}
            disabled={!canEdit || isBusy}
          >
            Reset
          </FancyButton.Root>

          <FancyButton.Root
            type="button"
            variant="primary"
            size="xsmall"
            className="h-8 rounded-lg px-3"
            onClick={handleSaveTheme}
            disabled={!canEdit || !isDirty || isBusy}
          >
            {updateThemeMutation.isPending
              ? "Saving..."
              : uploadThemeMediaMutation.isPending
                ? "Uploading..."
                : "Save"}
          </FancyButton.Root>

          <input
            ref={logoFileInputRef}
            type="file"
            accept={THEME_MEDIA_ACCEPT}
            className="hidden"
            disabled={!canEdit || isBusy}
            onChange={(event) => onThemeMediaInputChange("logo", event)}
          />

          <input
            ref={bannerFileInputRef}
            type="file"
            accept={THEME_MEDIA_ACCEPT}
            className="hidden"
            disabled={!canEdit || isBusy}
            onChange={(event) => onThemeMediaInputChange("banner", event)}
          />
        </div>

        <div className="border-t border-(--border) px-3 py-1 text-[11px] text-(--muted) md:px-4">
          {getThemeMediaRuleText("logo")} {getThemeMediaRuleText("banner")}
        </div>

        {submitError ? (
          <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
            {submitError}
          </div>
        ) : null}

        {submitSuccess ? (
          <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
            {submitSuccess}
          </div>
        ) : null}

        {!canEdit ? (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Only workspace admins can save theme changes.
          </div>
        ) : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.06 }}
        className="min-h-0 flex-1"
      >
        <PublicFeedbackPage
          workspaceSlug={workspaceSlug}
          workspaceName={workspaceName}
          workspaceTheme={previewTheme}
          editorMode
          editorTopOffsetPx={editorToolbarHeight}
          initialPosts={previewData.initialPosts}
          isAuthenticated={previewData.isAuthenticated}
          viewer={previewData.viewer}
          isWorkspaceOwner={previewData.isWorkspaceOwner}
          githubAuthEnabled={previewData.githubAuthEnabled}
          defaultBoard={previewData.defaultBoard}
          defaultStatus={previewData.defaultStatus}
        />
      </motion.div>
    </section>
  );
}
