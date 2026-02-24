import { Effect, Schema } from "effect";

import { FeedbackInvalidInput } from "./feedback.errors";
import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  FEEDBACK_CONTENT_HTML_MAX_LENGTH,
  FEEDBACK_CONTENT_TEXT_MAX_LENGTH,
  FEEDBACK_MEDIA_MAX_BYTES,
  FEEDBACK_TITLE_MAX_LENGTH,
} from "./lib/constants";
import {
  extractTextFromFeedbackContent,
  hasEmbeddedFeedbackMedia,
  normalizeFeedbackContentToHtml,
} from "./lib/rich-content";

const FEEDBACK_MEDIA_TYPES = new Set(["image", "video", "attachment"] as const);
const IMAGE_CONTENT_TYPE_PATTERN = /^image\//i;
const VIDEO_CONTENT_TYPE_PATTERN = /^video\//i;

export const CreateFeedbackPostBodySchema = Schema.Struct({
  title: Schema.String,
  content: Schema.String,
  boardId: Schema.optional(Schema.String),
});

export interface CreateFeedbackPostInput {
  title: string;
  content: string;
  boardId: string | null;
}

export const CreateFeedbackCommentBodySchema = Schema.Struct({
  body: Schema.String,
});

export interface CreateFeedbackCommentInput {
  body: string;
}

export const UploadFeedbackMediaInputSchema = Schema.Struct({
  fileName: Schema.String,
  contentType: Schema.String,
  size: Schema.Number,
  mediaType: Schema.String,
});

export type FeedbackMediaInputType = "image" | "video" | "attachment";

export interface UploadFeedbackMediaInput {
  fileName: string;
  contentType: string;
  size: number;
  mediaType: FeedbackMediaInputType;
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
