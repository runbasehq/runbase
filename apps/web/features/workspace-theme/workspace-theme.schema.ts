import { Effect, Schema } from "effect";

import { validateWorkspaceSlug } from "~/workspace/schemas/workspace-slug";
import {
  isWorkspaceThemeFontFamily,
  normalizeHexColor,
  normalizeWorkspaceThemeImageUrl,
} from "~/workspace-theme/lib/theme-defaults";
import type { WorkspacePublicTheme } from "~/workspace-theme/lib/types";
import type { WorkspaceThemeMediaType } from "~/workspace-theme/lib/types";

import { WorkspaceThemeInvalidInput } from "./workspace-theme.errors";

const WorkspaceThemeSlugParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
});

const WorkspaceThemeUpdateBodySchema = Schema.Struct({
  primaryColor: Schema.String,
  backgroundColor: Schema.String,
  surfaceColor: Schema.String,
  surfaceAccentColor: Schema.String,
  textColor: Schema.String,
  mutedColor: Schema.String,
  borderColor: Schema.String,
  cornerRadius: Schema.Number,
  fontFamily: Schema.String,
  logoUrl: Schema.Union(Schema.String, Schema.Null),
  bannerUrl: Schema.Union(Schema.String, Schema.Null),
});

const WorkspaceThemeMediaUploadBodySchema = Schema.Struct({
  fileName: Schema.String,
  contentType: Schema.String,
  size: Schema.Number,
  mediaType: Schema.String,
});

const WORKSPACE_THEME_ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const WORKSPACE_THEME_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const WORKSPACE_THEME_BANNER_MAX_BYTES = 8 * 1024 * 1024;

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

function validateThemeColor(value: string, label: string) {
  const normalized = normalizeHexColor(value);

  if (!normalized) {
    return {
      value: null,
      error: `${label} must be a valid hex color`,
    };
  }

  return {
    value: normalized,
    error: null,
  };
}

function validateCornerRadius(value: number) {
  if (!Number.isFinite(value)) {
    return {
      value: null,
      error: "Corner radius must be a number",
    };
  }

  const rounded = Math.round(value);

  if (rounded < 8 || rounded > 28) {
    return {
      value: null,
      error: "Corner radius must be between 8 and 28",
    };
  }

  return {
    value: rounded,
    error: null,
  };
}

function validateThemeImage(
  value: string | null,
  label: "Logo image" | "Banner image",
) {
  if (value === null) {
    return {
      value: null,
      error: null,
    };
  }

  const trimmed = value.trim();

  if (!trimmed.length) {
    return {
      value: null,
      error: null,
    };
  }

  const normalized = normalizeWorkspaceThemeImageUrl(trimmed);

  if (!normalized) {
    return {
      value: null,
      error: `${label} must be an http(s) URL or root-relative path`,
    };
  }

  return {
    value: normalized,
    error: null,
  };
}

export interface WorkspaceThemeSlugParamsInput {
  workspaceSlug: string;
}

export interface WorkspaceThemeUpdateInput {
  theme: WorkspacePublicTheme;
}

export interface WorkspaceThemeMediaUploadInput {
  fileName: string;
  contentType: string;
  size: number;
  mediaType: WorkspaceThemeMediaType;
}

export const decodeWorkspaceThemeSlugParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(WorkspaceThemeSlugParamsSchema)(
      raw,
    );
    const { value: workspaceSlug, error } = validateWorkspaceSlugInput(
      decoded.workspaceSlug,
    );

    if (error || !workspaceSlug) {
      return yield* new WorkspaceThemeInvalidInput({
        message: error || "Workspace slug is required",
      });
    }

    return { workspaceSlug } satisfies WorkspaceThemeSlugParamsInput;
  });

export const decodeWorkspaceThemeUpdateInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(WorkspaceThemeUpdateBodySchema)(
      raw,
    );
    const primaryColor = validateThemeColor(decoded.primaryColor, "Primary");
    const backgroundColor = validateThemeColor(
      decoded.backgroundColor,
      "Background",
    );
    const surfaceColor = validateThemeColor(decoded.surfaceColor, "Surface");
    const surfaceAccentColor = validateThemeColor(
      decoded.surfaceAccentColor,
      "Surface accent",
    );
    const textColor = validateThemeColor(decoded.textColor, "Text");
    const mutedColor = validateThemeColor(decoded.mutedColor, "Muted text");
    const borderColor = validateThemeColor(decoded.borderColor, "Border");
    const cornerRadius = validateCornerRadius(decoded.cornerRadius);
    const logoUrl = validateThemeImage(decoded.logoUrl, "Logo image");
    const bannerUrl = validateThemeImage(decoded.bannerUrl, "Banner image");
    const normalizedFontFamily = decoded.fontFamily.trim().toLowerCase();

    if (primaryColor.error || !primaryColor.value) {
      return yield* new WorkspaceThemeInvalidInput({
        message: primaryColor.error || "Primary color is required",
      });
    }

    if (backgroundColor.error || !backgroundColor.value) {
      return yield* new WorkspaceThemeInvalidInput({
        message: backgroundColor.error || "Background color is required",
      });
    }

    if (surfaceColor.error || !surfaceColor.value) {
      return yield* new WorkspaceThemeInvalidInput({
        message: surfaceColor.error || "Surface color is required",
      });
    }

    if (surfaceAccentColor.error || !surfaceAccentColor.value) {
      return yield* new WorkspaceThemeInvalidInput({
        message: surfaceAccentColor.error || "Surface accent color is required",
      });
    }

    if (textColor.error || !textColor.value) {
      return yield* new WorkspaceThemeInvalidInput({
        message: textColor.error || "Text color is required",
      });
    }

    if (mutedColor.error || !mutedColor.value) {
      return yield* new WorkspaceThemeInvalidInput({
        message: mutedColor.error || "Muted text color is required",
      });
    }

    if (borderColor.error || !borderColor.value) {
      return yield* new WorkspaceThemeInvalidInput({
        message: borderColor.error || "Border color is required",
      });
    }

    if (cornerRadius.error || cornerRadius.value === null) {
      return yield* new WorkspaceThemeInvalidInput({
        message: cornerRadius.error || "Corner radius is required",
      });
    }

    if (!isWorkspaceThemeFontFamily(normalizedFontFamily)) {
      return yield* new WorkspaceThemeInvalidInput({
        message: "Font family is invalid",
      });
    }

    if (logoUrl.error) {
      return yield* new WorkspaceThemeInvalidInput({
        message: logoUrl.error,
      });
    }

    if (bannerUrl.error) {
      return yield* new WorkspaceThemeInvalidInput({
        message: bannerUrl.error,
      });
    }

    return {
      theme: {
        primaryColor: primaryColor.value,
        backgroundColor: backgroundColor.value,
        surfaceColor: surfaceColor.value,
        surfaceAccentColor: surfaceAccentColor.value,
        textColor: textColor.value,
        mutedColor: mutedColor.value,
        borderColor: borderColor.value,
        cornerRadius: cornerRadius.value,
        fontFamily: normalizedFontFamily,
        logoUrl: logoUrl.value,
        bannerUrl: bannerUrl.value,
      },
    } satisfies WorkspaceThemeUpdateInput;
  });

export const decodeWorkspaceThemeMediaUploadInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(
      WorkspaceThemeMediaUploadBodySchema,
    )(raw);

    const fileName = decoded.fileName.trim();
    const contentType = decoded.contentType.trim().toLowerCase();
    const mediaType = decoded.mediaType.trim().toLowerCase();
    const size = Number.isFinite(decoded.size) ? Math.floor(decoded.size) : 0;

    if (!fileName.length) {
      return yield* new WorkspaceThemeInvalidInput({
        message: "Image file name is required",
      });
    }

    if (fileName.length > 220) {
      return yield* new WorkspaceThemeInvalidInput({
        message: "Image file name is too long",
      });
    }

    if (!size) {
      return yield* new WorkspaceThemeInvalidInput({
        message: "Image file is empty",
      });
    }

    if (mediaType !== "logo" && mediaType !== "banner") {
      return yield* new WorkspaceThemeInvalidInput({
        message: "Media type must be logo or banner",
      });
    }

    if (!WORKSPACE_THEME_ALLOWED_CONTENT_TYPES.has(contentType)) {
      return yield* new WorkspaceThemeInvalidInput({
        message: "Only PNG, JPEG, and WEBP images are supported",
      });
    }

    const maxBytes =
      mediaType === "logo"
        ? WORKSPACE_THEME_LOGO_MAX_BYTES
        : WORKSPACE_THEME_BANNER_MAX_BYTES;

    if (size > maxBytes) {
      return yield* new WorkspaceThemeInvalidInput({
        message:
          mediaType === "logo"
            ? "Logo image must be 2 MB or smaller"
            : "Banner image must be 8 MB or smaller",
      });
    }

    return {
      fileName,
      contentType,
      size,
      mediaType,
    } satisfies WorkspaceThemeMediaUploadInput;
  });
