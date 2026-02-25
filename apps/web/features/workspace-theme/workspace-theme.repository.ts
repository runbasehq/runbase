import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import { db } from "@/lib/db";
import { workspace, workspaceMember } from "@/lib/db/schema";
import {
  parseWorkspacePublicThemeFromStorage,
  serializeWorkspacePublicTheme,
} from "~/workspace-theme/lib/theme-defaults";
import type {
  WorkspacePublicTheme,
  WorkspaceThemeMediaType,
  WorkspaceThemeUploadedMedia,
} from "~/workspace-theme/lib/types";

import type { WorkspaceThemeMediaUploadInput } from "./workspace-theme.schema";
import {
  WorkspaceThemeMediaInvalidDimensions,
  WorkspaceThemeMediaStorageNotConfigured,
  WorkspaceThemeMediaUploadFailed,
  WorkspaceThemePersistenceError,
} from "./workspace-theme.errors";

export interface WorkspaceThemeMembershipRecord {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  role: "admin" | "contributor";
  theme: WorkspacePublicTheme;
}

export interface WorkspacePublicThemeRecord {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  theme: WorkspacePublicTheme;
}

export interface UploadWorkspaceThemeMediaParams {
  workspaceId: string;
  userId: string;
  input: WorkspaceThemeMediaUploadInput;
  bytes: Uint8Array;
}

interface CloudflareR2Config {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const WORKSPACE_THEME_LOGO_MIN_PIXELS = 256;

let cachedR2Config: CloudflareR2Config | null | undefined;
let cachedR2Client: S3Client | null = null;

const toPersistenceError = (operation: string) =>
  new WorkspaceThemePersistenceError({ operation });

const fromPersistencePromise = <A>(
  operation: string,
  thunk: () => Promise<A>,
) =>
  Effect.tryPromise({
    try: thunk,
    catch: () => toPersistenceError(operation),
  });

function toWorkspaceMemberRole(role: string): "admin" | "contributor" {
  return role === "admin" ? "admin" : "contributor";
}

function normalizeFontFamily(value: WorkspacePublicTheme["fontFamily"]) {
  if (
    value === "inter" ||
    value === "system" ||
    value === "serif" ||
    value === "mono"
  ) {
    return value;
  }

  return "inter";
}

function normalizeTheme(theme: WorkspacePublicTheme): WorkspacePublicTheme {
  return {
    ...theme,
    fontFamily: normalizeFontFamily(theme.fontFamily),
  };
}

function readCloudflareR2Config() {
  if (cachedR2Config !== undefined) {
    return cachedR2Config;
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicUrl) {
    cachedR2Config = null;
    return cachedR2Config;
  }

  cachedR2Config = {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };

  return cachedR2Config;
}

function getCloudflareR2Client(config: CloudflareR2Config) {
  if (!cachedR2Client) {
    cachedR2Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return cachedR2Client;
}

function sanitizeFileName(value: string) {
  const normalized = value
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");

  return normalized || "file";
}

function extractFileExtension(value: string) {
  const fileName = sanitizeFileName(value);
  const match = fileName.match(/\.([a-zA-Z0-9]{1,10})$/);
  return match ? match[1].toLowerCase() : "";
}

function buildThemeMediaKey(input: {
  workspaceId: string;
  userId: string;
  mediaType: WorkspaceThemeMediaType;
  fileName: string;
}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = extractFileExtension(input.fileName);
  const suffix = extension.length ? `.${extension}` : "";

  return `themes/${input.workspaceId}/${input.userId}/${input.mediaType}/${year}/${month}/${crypto.randomUUID()}${suffix}`;
}

function readUint16BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] << 24) >>> 0) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  );
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null;
  }

  const width = readUint32BE(bytes, 16);
  const height = readUint32BE(bytes, 20);

  if (!width || !height) {
    return null;
  }

  return { width, height };
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    let markerOffset = offset + 1;
    while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) {
      markerOffset += 1;
    }

    if (markerOffset >= bytes.length) {
      break;
    }

    const marker = bytes[markerOffset];
    offset = markerOffset + 1;

    if (marker === 0xd8 || marker === 0x01) {
      continue;
    }

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 1 >= bytes.length) {
      break;
    }

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2) {
      break;
    }

    const segmentStart = offset + 2;
    const segmentEnd = offset + segmentLength;

    if (segmentEnd > bytes.length) {
      break;
    }

    if (SOF_MARKERS.has(marker)) {
      if (segmentStart + 6 > bytes.length) {
        break;
      }

      const height = readUint16BE(bytes, segmentStart + 1);
      const width = readUint16BE(bytes, segmentStart + 3);

      if (!width || !height) {
        return null;
      }

      return { width, height };
    }

    offset = segmentEnd;
  }

  return null;
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 30 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = String.fromCharCode(...bytes.slice(12, 16));

  if (chunkType === "VP8X") {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (chunkType === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    const width = 1 + (b0 | ((b1 & 0x3f) << 8));
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (
    chunkType === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }

  return null;
}

function readImageDimensions(
  bytes: Uint8Array,
  contentType: string,
): ImageDimensions | null {
  if (contentType === "image/png") {
    return readPngDimensions(bytes);
  }

  if (contentType === "image/jpeg") {
    return readJpegDimensions(bytes);
  }

  if (contentType === "image/webp") {
    return readWebpDimensions(bytes);
  }

  return null;
}

const assertThemeMediaDimensions = (
  mediaType: WorkspaceThemeMediaType,
  dimensions: ImageDimensions,
): Effect.Effect<void, WorkspaceThemeMediaInvalidDimensions> =>
  Effect.gen(function* () {
    if (mediaType === "logo") {
      if (dimensions.width !== dimensions.height) {
        return yield* new WorkspaceThemeMediaInvalidDimensions({
          message:
            "Logo image must be square (same width and height). 500x500 pixels is recommended.",
        });
      }

      if (
        dimensions.width < WORKSPACE_THEME_LOGO_MIN_PIXELS ||
        dimensions.height < WORKSPACE_THEME_LOGO_MIN_PIXELS
      ) {
        return yield* new WorkspaceThemeMediaInvalidDimensions({
          message:
            "Logo image is too small. Upload at least 256x256 pixels (500x500 recommended).",
        });
      }

      return;
    }

    if (
      dimensions.width < 1200 ||
      dimensions.height < 300 ||
      dimensions.width > 2600 ||
      dimensions.height > 1000
    ) {
      return yield* new WorkspaceThemeMediaInvalidDimensions({
        message: "Banner image must be between 1200x300 and 2600x1000 pixels.",
      });
    }

    const ratio = dimensions.width / dimensions.height;
    if (ratio < 2.2 || ratio > 4.5) {
      return yield* new WorkspaceThemeMediaInvalidDimensions({
        message:
          "Banner image must be wide (aspect ratio between 2.2:1 and 4.5:1).",
      });
    }
  });

export class WorkspaceThemeRepository extends Effect.Service<WorkspaceThemeRepository>()(
  "WorkspaceThemeRepository",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const getWorkspaceThemeMembershipBySlug = Effect.fn(
        "WorkspaceThemeRepository.getWorkspaceThemeMembershipBySlug",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }): Effect.Effect<
          WorkspaceThemeMembershipRecord | null,
          WorkspaceThemePersistenceError
        > =>
          fromPersistencePromise(
            "workspaceTheme.getWorkspaceThemeMembershipBySlug",
            async () => {
              const [membership] = await db
                .select({
                  workspaceId: workspace.id,
                  workspaceSlug: workspace.slug,
                  workspaceName: workspace.name,
                  role: workspaceMember.role,
                  publicTheme: workspace.publicTheme,
                })
                .from(workspaceMember)
                .innerJoin(
                  workspace,
                  eq(workspaceMember.workspaceId, workspace.id),
                )
                .where(
                  and(
                    eq(workspaceMember.userId, userId),
                    eq(workspace.slug, workspaceSlug),
                  ),
                )
                .limit(1);

              if (!membership) {
                return null;
              }

              return {
                workspaceId: membership.workspaceId,
                workspaceSlug: membership.workspaceSlug,
                workspaceName: membership.workspaceName,
                role: toWorkspaceMemberRole(membership.role),
                theme: parseWorkspacePublicThemeFromStorage(
                  membership.publicTheme,
                ),
              };
            },
          ),
      );

      const getPublicWorkspaceThemeBySlug = Effect.fn(
        "WorkspaceThemeRepository.getPublicWorkspaceThemeBySlug",
      )(
        ({
          workspaceSlug,
        }: {
          workspaceSlug: string;
        }): Effect.Effect<
          WorkspacePublicThemeRecord | null,
          WorkspaceThemePersistenceError
        > =>
          fromPersistencePromise(
            "workspaceTheme.getPublicWorkspaceThemeBySlug",
            async () => {
              const [workspaceRow] = await db
                .select({
                  workspaceId: workspace.id,
                  workspaceSlug: workspace.slug,
                  workspaceName: workspace.name,
                  publicTheme: workspace.publicTheme,
                })
                .from(workspace)
                .where(eq(workspace.slug, workspaceSlug))
                .limit(1);

              if (!workspaceRow) {
                return null;
              }

              return {
                workspaceId: workspaceRow.workspaceId,
                workspaceSlug: workspaceRow.workspaceSlug,
                workspaceName: workspaceRow.workspaceName,
                theme: parseWorkspacePublicThemeFromStorage(
                  workspaceRow.publicTheme,
                ),
              };
            },
          ),
      );

      const updateWorkspaceTheme = Effect.fn(
        "WorkspaceThemeRepository.updateWorkspaceTheme",
      )(
        ({
          workspaceId,
          theme,
        }: {
          workspaceId: string;
          theme: WorkspacePublicTheme;
        }): Effect.Effect<
          WorkspacePublicThemeRecord | null,
          WorkspaceThemePersistenceError
        > =>
          fromPersistencePromise(
            "workspaceTheme.updateWorkspaceTheme",
            async () => {
              const normalizedTheme = normalizeTheme(theme);
              const [updatedWorkspace] = await db
                .update(workspace)
                .set({
                  publicTheme: serializeWorkspacePublicTheme(normalizedTheme),
                  updatedAt: new Date(),
                })
                .where(eq(workspace.id, workspaceId))
                .returning({
                  workspaceId: workspace.id,
                  workspaceSlug: workspace.slug,
                  workspaceName: workspace.name,
                  publicTheme: workspace.publicTheme,
                });

              if (!updatedWorkspace) {
                return null;
              }

              return {
                workspaceId: updatedWorkspace.workspaceId,
                workspaceSlug: updatedWorkspace.workspaceSlug,
                workspaceName: updatedWorkspace.workspaceName,
                theme: parseWorkspacePublicThemeFromStorage(
                  updatedWorkspace.publicTheme,
                ),
              };
            },
          ),
      );

      const uploadWorkspaceThemeMedia = Effect.fn(
        "WorkspaceThemeRepository.uploadWorkspaceThemeMedia",
      )(
        ({
          workspaceId,
          userId,
          input,
          bytes,
        }: UploadWorkspaceThemeMediaParams): Effect.Effect<
          WorkspaceThemeUploadedMedia,
          | WorkspaceThemeMediaStorageNotConfigured
          | WorkspaceThemeMediaUploadFailed
          | WorkspaceThemeMediaInvalidDimensions
        > =>
          Effect.gen(function* () {
            const config = readCloudflareR2Config();

            if (!config) {
              return yield* new WorkspaceThemeMediaStorageNotConfigured({});
            }

            const dimensions = readImageDimensions(bytes, input.contentType);

            if (!dimensions) {
              return yield* new WorkspaceThemeMediaInvalidDimensions({
                message:
                  "Could not read image dimensions. Upload PNG, JPEG, or WEBP.",
              });
            }

            yield* assertThemeMediaDimensions(input.mediaType, dimensions);

            const key = buildThemeMediaKey({
              workspaceId,
              userId,
              mediaType: input.mediaType,
              fileName: input.fileName,
            });

            const client = getCloudflareR2Client(config);

            yield* Effect.tryPromise({
              try: () =>
                client.send(
                  new PutObjectCommand({
                    Bucket: config.bucket,
                    Key: key,
                    Body: bytes,
                    ContentType: input.contentType,
                    ContentLength: input.size,
                    CacheControl: "public, max-age=31536000, immutable",
                  }),
                ),
              catch: () =>
                new WorkspaceThemeMediaUploadFailed({
                  operation:
                    "workspaceTheme.uploadWorkspaceThemeMedia.putObject",
                }),
            });

            return {
              key,
              url: `${config.publicUrl}/${key}`,
              fileName: input.fileName,
              contentType: input.contentType,
              size: input.size,
              width: dimensions.width,
              height: dimensions.height,
              mediaType: input.mediaType,
            } satisfies WorkspaceThemeUploadedMedia;
          }),
      );

      return {
        getWorkspaceThemeMembershipBySlug,
        getPublicWorkspaceThemeBySlug,
        updateWorkspaceTheme,
        uploadWorkspaceThemeMedia,
      };
    }),
  },
) {}
