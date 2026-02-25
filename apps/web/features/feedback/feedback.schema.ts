import { Effect, Schema } from "effect";

import { validateWorkspaceSlug } from "~/workspace/schemas/workspace-slug";

import { FeedbackInvalidInput } from "./feedback.errors";
import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  FEEDBACK_CONTENT_HTML_MAX_LENGTH,
  FEEDBACK_CONTENT_TEXT_MAX_LENGTH,
  FEEDBACK_DEFAULT_SORT_OPTIONS,
  FEEDBACK_MEDIA_MAX_BYTES,
  FEEDBACK_TITLE_MAX_LENGTH,
} from "./lib/constants";
import type { FeedbackDefaultSort } from "./lib/types";
import {
  extractTextFromFeedbackContent,
  hasEmbeddedFeedbackMedia,
  normalizeFeedbackContentToHtml,
} from "./lib/rich-content";

const FEEDBACK_MEDIA_TYPES = new Set(["image", "video", "attachment"] as const);
const IMAGE_CONTENT_TYPE_PATTERN = /^image\//i;
const VIDEO_CONTENT_TYPE_PATTERN = /^video\//i;
const COLOR_HEX_3_PATTERN = /^#([a-fA-F0-9]{3})$/;
const COLOR_HEX_6_PATTERN = /^#([a-fA-F0-9]{6})$/;

const FEEDBACK_POST_MAX_TAGS = 8;
const FEEDBACK_BOARD_NAME_MAX_LENGTH = 60;
const FEEDBACK_STATUS_LABEL_MAX_LENGTH = 40;
const FEEDBACK_TAG_NAME_MAX_LENGTH = 40;

const CreateFeedbackPostBodySchema = Schema.Struct({
  title: Schema.String,
  content: Schema.String,
  boardId: Schema.optional(Schema.String),
  tagIds: Schema.optional(Schema.Array(Schema.String)),
});

const CreateFeedbackCommentBodySchema = Schema.Struct({
  body: Schema.String,
});

const UploadFeedbackMediaInputSchema = Schema.Struct({
  fileName: Schema.String,
  contentType: Schema.String,
  size: Schema.Number,
  mediaType: Schema.String,
});

const FeedbackWorkspaceSlugParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
});

const FeedbackBoardParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
  boardId: Schema.String,
});

const FeedbackStatusParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
  statusId: Schema.String,
});

const FeedbackTagParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
  tagId: Schema.String,
});

const FeedbackPublicSettingsBodySchema = Schema.Struct({
  defaultSort: Schema.String,
  hideLeaderboard: Schema.Boolean,
  hideClosedStatuses: Schema.Boolean,
  hideAllStatuses: Schema.Boolean,
  allowPublicTagSelection: Schema.Boolean,
});

const FeedbackBoardBodySchema = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
});

const FeedbackStatusBodySchema = Schema.Struct({
  label: Schema.String,
  color: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
  isClosed: Schema.optional(Schema.Boolean),
});

const FeedbackTagBodySchema = Schema.Struct({
  name: Schema.String,
  color: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
});

function normalizeColorHex(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }

  if (COLOR_HEX_6_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const short = trimmed.match(COLOR_HEX_3_PATTERN);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return null;
}

function normalizeEntityName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeSort(value: string): FeedbackDefaultSort | null {
  const normalized = value.trim().toLowerCase();

  if (
    FEEDBACK_DEFAULT_SORT_OPTIONS.includes(
      normalized as (typeof FEEDBACK_DEFAULT_SORT_OPTIONS)[number],
    )
  ) {
    return normalized as FeedbackDefaultSort;
  }

  return null;
}

function validateWorkspaceSlugInput(workspaceSlug: string) {
  const normalizedWorkspaceSlug = workspaceSlug.trim().toLowerCase();
  const slugError = validateWorkspaceSlug(normalizedWorkspaceSlug);

  if (slugError) {
    return {
      value: null,
      error: slugError,
    };
  }

  return {
    value: normalizedWorkspaceSlug,
    error: null,
  };
}

function validateNonEmptyId(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized.length) {
    return {
      value: null,
      error: `${label} is required`,
    };
  }

  return {
    value: normalized,
    error: null,
  };
}

function validateNameLength(value: string, label: string, maxLength: number) {
  if (!value.length) {
    return `${label} is required`;
  }

  if (value.length > maxLength) {
    return `${label} must be ${maxLength} characters or less`;
  }

  return null;
}

export type FeedbackMediaInputType = "image" | "video" | "attachment";

export interface CreateFeedbackPostInput {
  title: string;
  content: string;
  boardId: string | null;
  tagIds: string[];
}

export interface CreateFeedbackCommentInput {
  body: string;
}

export interface UploadFeedbackMediaInput {
  fileName: string;
  contentType: string;
  size: number;
  mediaType: FeedbackMediaInputType;
}

export interface FeedbackWorkspaceSlugParamsInput {
  workspaceSlug: string;
}

export interface FeedbackBoardParamsInput {
  workspaceSlug: string;
  boardId: string;
}

export interface FeedbackStatusParamsInput {
  workspaceSlug: string;
  statusId: string;
}

export interface FeedbackTagParamsInput {
  workspaceSlug: string;
  tagId: string;
}

export interface UpdateFeedbackPublicSettingsInput {
  defaultSort: FeedbackDefaultSort;
  hideLeaderboard: boolean;
  hideClosedStatuses: boolean;
  hideAllStatuses: boolean;
  allowPublicTagSelection: boolean;
}

export interface CreateFeedbackBoardInput {
  name: string;
  description: string | null;
}

export interface UpdateFeedbackBoardInput {
  name: string;
  description: string | null;
}

export interface CreateFeedbackStatusInput {
  label: string;
  color: string | null;
  isClosed: boolean;
}

export interface UpdateFeedbackStatusInput {
  label: string;
  color: string | null;
  isClosed: boolean;
}

export interface CreateFeedbackTagInput {
  name: string;
  color: string | null;
}

export interface UpdateFeedbackTagInput {
  name: string;
  color: string | null;
}

export const decodeCreateFeedbackPostInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(CreateFeedbackPostBodySchema)(
      raw,
    );

    const title = decoded.title.trim();
    const content = normalizeFeedbackContentToHtml(decoded.content);
    const textContent = extractTextFromFeedbackContent(content);
    const includesMedia = hasEmbeddedFeedbackMedia(content);
    const boardId =
      typeof decoded.boardId === "string" && decoded.boardId.trim().length
        ? decoded.boardId.trim()
        : null;
    const tagIds = (decoded.tagIds ?? [])
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, FEEDBACK_POST_MAX_TAGS);
    const uniqueTagIds = [...new Set(tagIds)];

    if (!title) {
      return yield* new FeedbackInvalidInput({ message: "Title is required" });
    }

    if (title.length > FEEDBACK_TITLE_MAX_LENGTH) {
      return yield* new FeedbackInvalidInput({
        message: `Title must be ${FEEDBACK_TITLE_MAX_LENGTH} characters or less`,
      });
    }

    if (!textContent.length && !includesMedia) {
      return yield* new FeedbackInvalidInput({
        message: "Description is required",
      });
    }

    if (textContent.length > FEEDBACK_CONTENT_TEXT_MAX_LENGTH) {
      return yield* new FeedbackInvalidInput({
        message: `Description must be ${FEEDBACK_CONTENT_TEXT_MAX_LENGTH} characters or less`,
      });
    }

    if (content.length > FEEDBACK_CONTENT_HTML_MAX_LENGTH) {
      return yield* new FeedbackInvalidInput({
        message: "Description is too long",
      });
    }

    return {
      title,
      content,
      boardId,
      tagIds: uniqueTagIds,
    } satisfies CreateFeedbackPostInput;
  });

export const decodeCreateFeedbackCommentInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(
      CreateFeedbackCommentBodySchema,
    )(raw);

    const body = normalizeFeedbackContentToHtml(decoded.body);
    const textContent = extractTextFromFeedbackContent(body);
    const includesMedia = hasEmbeddedFeedbackMedia(body);

    if (!textContent.length && !includesMedia) {
      return yield* new FeedbackInvalidInput({
        message: "Comment is required",
      });
    }

    if (textContent.length > FEEDBACK_COMMENT_MAX_LENGTH) {
      return yield* new FeedbackInvalidInput({
        message: `Comment must be ${FEEDBACK_COMMENT_MAX_LENGTH} characters or less`,
      });
    }

    if (body.length > FEEDBACK_CONTENT_HTML_MAX_LENGTH) {
      return yield* new FeedbackInvalidInput({
        message: "Comment is too long",
      });
    }

    return {
      body,
    } satisfies CreateFeedbackCommentInput;
  });

export const decodeUploadFeedbackMediaInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(UploadFeedbackMediaInputSchema)(
      raw,
    );

    const fileName = decoded.fileName.trim();
    const contentType = decoded.contentType.trim().toLowerCase();
    const size = Number.isFinite(decoded.size) ? Math.floor(decoded.size) : 0;
    const mediaType = decoded.mediaType.trim().toLowerCase();

    if (!fileName.length) {
      return yield* new FeedbackInvalidInput({
        message: "File name is required",
      });
    }

    if (fileName.length > 220) {
      return yield* new FeedbackInvalidInput({
        message: "File name is too long",
      });
    }

    if (!size) {
      return yield* new FeedbackInvalidInput({
        message: "File is empty",
      });
    }

    if (size > FEEDBACK_MEDIA_MAX_BYTES) {
      return yield* new FeedbackInvalidInput({
        message: "Media must be 10 MB or less",
      });
    }

    if (!contentType.length) {
      return yield* new FeedbackInvalidInput({
        message: "File content type is required",
      });
    }

    if (!FEEDBACK_MEDIA_TYPES.has(mediaType as FeedbackMediaInputType)) {
      return yield* new FeedbackInvalidInput({
        message: "Invalid media type",
      });
    }

    if (
      mediaType === "image" &&
      !IMAGE_CONTENT_TYPE_PATTERN.test(contentType)
    ) {
      return yield* new FeedbackInvalidInput({
        message: "Only image files are allowed for image uploads",
      });
    }

    if (
      mediaType === "video" &&
      !VIDEO_CONTENT_TYPE_PATTERN.test(contentType)
    ) {
      return yield* new FeedbackInvalidInput({
        message: "Only video files are allowed for video uploads",
      });
    }

    if (
      mediaType === "attachment" &&
      !IMAGE_CONTENT_TYPE_PATTERN.test(contentType) &&
      !VIDEO_CONTENT_TYPE_PATTERN.test(contentType) &&
      contentType !== "application/pdf"
    ) {
      return yield* new FeedbackInvalidInput({
        message: "Attachment must be an image, video, or PDF file",
      });
    }

    return {
      fileName,
      contentType,
      size,
      mediaType: mediaType as FeedbackMediaInputType,
    } satisfies UploadFeedbackMediaInput;
  });

export const decodeFeedbackWorkspaceSlugParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(
      FeedbackWorkspaceSlugParamsSchema,
    )(raw);
    const { value: workspaceSlug, error } = validateWorkspaceSlugInput(
      decoded.workspaceSlug,
    );

    if (error || !workspaceSlug) {
      return yield* new FeedbackInvalidInput({
        message: error || "Workspace slug is required",
      });
    }

    return { workspaceSlug } satisfies FeedbackWorkspaceSlugParamsInput;
  });

export const decodeFeedbackBoardParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackBoardParamsSchema)(raw);
    const { value: workspaceSlug, error: slugError } =
      validateWorkspaceSlugInput(decoded.workspaceSlug);
    const { value: boardId, error: boardError } = validateNonEmptyId(
      decoded.boardId,
      "Board id",
    );

    if (slugError || !workspaceSlug) {
      return yield* new FeedbackInvalidInput({
        message: slugError || "Workspace slug is required",
      });
    }

    if (boardError || !boardId) {
      return yield* new FeedbackInvalidInput({
        message: boardError || "Board id is required",
      });
    }

    return { workspaceSlug, boardId } satisfies FeedbackBoardParamsInput;
  });

export const decodeFeedbackStatusParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackStatusParamsSchema)(raw);
    const { value: workspaceSlug, error: slugError } =
      validateWorkspaceSlugInput(decoded.workspaceSlug);
    const { value: statusId, error: statusError } = validateNonEmptyId(
      decoded.statusId,
      "Status id",
    );

    if (slugError || !workspaceSlug) {
      return yield* new FeedbackInvalidInput({
        message: slugError || "Workspace slug is required",
      });
    }

    if (statusError || !statusId) {
      return yield* new FeedbackInvalidInput({
        message: statusError || "Status id is required",
      });
    }

    return { workspaceSlug, statusId } satisfies FeedbackStatusParamsInput;
  });

export const decodeFeedbackTagParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackTagParamsSchema)(raw);
    const { value: workspaceSlug, error: slugError } =
      validateWorkspaceSlugInput(decoded.workspaceSlug);
    const { value: tagId, error: tagError } = validateNonEmptyId(
      decoded.tagId,
      "Tag id",
    );

    if (slugError || !workspaceSlug) {
      return yield* new FeedbackInvalidInput({
        message: slugError || "Workspace slug is required",
      });
    }

    if (tagError || !tagId) {
      return yield* new FeedbackInvalidInput({
        message: tagError || "Tag id is required",
      });
    }

    return { workspaceSlug, tagId } satisfies FeedbackTagParamsInput;
  });

export const decodeUpdateFeedbackPublicSettingsInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackPublicSettingsBodySchema)(
      raw,
    );
    const defaultSort = normalizeSort(decoded.defaultSort);

    if (!defaultSort) {
      return yield* new FeedbackInvalidInput({
        message: "Default sorting must be new, top, or trending",
      });
    }

    return {
      defaultSort,
      hideLeaderboard: decoded.hideLeaderboard,
      hideClosedStatuses: decoded.hideClosedStatuses,
      hideAllStatuses: decoded.hideAllStatuses,
      allowPublicTagSelection: decoded.allowPublicTagSelection,
    } satisfies UpdateFeedbackPublicSettingsInput;
  });

export const decodeCreateFeedbackBoardInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackBoardBodySchema)(raw);
    const name = normalizeEntityName(decoded.name);
    const nameError = validateNameLength(
      name,
      "Board name",
      FEEDBACK_BOARD_NAME_MAX_LENGTH,
    );

    if (nameError) {
      return yield* new FeedbackInvalidInput({ message: nameError });
    }

    return {
      name,
      description: normalizeOptionalText(decoded.description),
    } satisfies CreateFeedbackBoardInput;
  });

export const decodeUpdateFeedbackBoardInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackBoardBodySchema)(raw);
    const name = normalizeEntityName(decoded.name);
    const nameError = validateNameLength(
      name,
      "Board name",
      FEEDBACK_BOARD_NAME_MAX_LENGTH,
    );

    if (nameError) {
      return yield* new FeedbackInvalidInput({ message: nameError });
    }

    return {
      name,
      description: normalizeOptionalText(decoded.description),
    } satisfies UpdateFeedbackBoardInput;
  });

export const decodeCreateFeedbackStatusInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackStatusBodySchema)(raw);
    const label = normalizeEntityName(decoded.label);
    const labelError = validateNameLength(
      label,
      "Status name",
      FEEDBACK_STATUS_LABEL_MAX_LENGTH,
    );
    const color = normalizeColorHex(decoded.color);

    if (labelError) {
      return yield* new FeedbackInvalidInput({ message: labelError });
    }

    if (decoded.color && !color) {
      return yield* new FeedbackInvalidInput({
        message: "Status color must be a valid hex color",
      });
    }

    return {
      label,
      color,
      isClosed: decoded.isClosed ?? false,
    } satisfies CreateFeedbackStatusInput;
  });

export const decodeUpdateFeedbackStatusInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackStatusBodySchema)(raw);
    const label = normalizeEntityName(decoded.label);
    const labelError = validateNameLength(
      label,
      "Status name",
      FEEDBACK_STATUS_LABEL_MAX_LENGTH,
    );
    const color = normalizeColorHex(decoded.color);

    if (labelError) {
      return yield* new FeedbackInvalidInput({ message: labelError });
    }

    if (decoded.color && !color) {
      return yield* new FeedbackInvalidInput({
        message: "Status color must be a valid hex color",
      });
    }

    return {
      label,
      color,
      isClosed: decoded.isClosed ?? false,
    } satisfies UpdateFeedbackStatusInput;
  });

export const decodeCreateFeedbackTagInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackTagBodySchema)(raw);
    const name = normalizeEntityName(decoded.name);
    const nameError = validateNameLength(
      name,
      "Tag name",
      FEEDBACK_TAG_NAME_MAX_LENGTH,
    );
    const color = normalizeColorHex(decoded.color);

    if (nameError) {
      return yield* new FeedbackInvalidInput({ message: nameError });
    }

    if (decoded.color && !color) {
      return yield* new FeedbackInvalidInput({
        message: "Tag color must be a valid hex color",
      });
    }

    return {
      name,
      color,
    } satisfies CreateFeedbackTagInput;
  });

export const decodeUpdateFeedbackTagInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(FeedbackTagBodySchema)(raw);
    const name = normalizeEntityName(decoded.name);
    const nameError = validateNameLength(
      name,
      "Tag name",
      FEEDBACK_TAG_NAME_MAX_LENGTH,
    );
    const color = normalizeColorHex(decoded.color);

    if (nameError) {
      return yield* new FeedbackInvalidInput({ message: nameError });
    }

    if (decoded.color && !color) {
      return yield* new FeedbackInvalidInput({
        message: "Tag color must be a valid hex color",
      });
    }

    return {
      name,
      color,
    } satisfies UpdateFeedbackTagInput;
  });
