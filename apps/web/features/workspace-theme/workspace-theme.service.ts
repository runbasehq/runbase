import "server-only";

import { Effect } from "effect";

import {
  WorkspaceThemeForbidden,
  WorkspaceThemeWorkspaceNotFound,
} from "./workspace-theme.errors";
import { WorkspaceThemeRepository } from "./workspace-theme.repository";
import type { WorkspacePublicTheme } from "./lib/types";
import type { WorkspaceThemeMediaUploadInput } from "./workspace-theme.schema";

export class WorkspaceThemeService extends Effect.Service<WorkspaceThemeService>()(
  "WorkspaceThemeService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repository = yield* WorkspaceThemeRepository;

      const requireMembership = Effect.fn(
        "WorkspaceThemeService.requireMembership",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership =
              yield* repository.getWorkspaceThemeMembershipBySlug({
                workspaceSlug,
                userId,
              });

            if (!membership) {
              return yield* new WorkspaceThemeWorkspaceNotFound({
                workspaceSlug,
              });
            }

            return membership;
          }),
      );

      const getThemeForWorkspaceMember = Effect.fn(
        "WorkspaceThemeService.getThemeForWorkspaceMember",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireMembership({
              workspaceSlug,
              userId,
            });

            return {
              workspaceId: membership.workspaceId,
              workspaceSlug: membership.workspaceSlug,
              workspaceName: membership.workspaceName,
              theme: membership.theme,
              permissions: {
                canEditTheme: membership.role === "admin",
              },
            };
          }),
      );

      const updateThemeForWorkspaceMember = Effect.fn(
        "WorkspaceThemeService.updateThemeForWorkspaceMember",
      )(
        ({
          workspaceSlug,
          userId,
          theme,
        }: {
          workspaceSlug: string;
          userId: string;
          theme: WorkspacePublicTheme;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireMembership({
              workspaceSlug,
              userId,
            });

            if (membership.role !== "admin") {
              return yield* new WorkspaceThemeForbidden({
                message: "Only workspace admins can edit theme settings",
              });
            }

            const updated = yield* repository.updateWorkspaceTheme({
              workspaceId: membership.workspaceId,
              theme,
            });

            if (!updated) {
              return yield* new WorkspaceThemeWorkspaceNotFound({
                workspaceSlug,
              });
            }

            return {
              workspaceId: updated.workspaceId,
              workspaceSlug: updated.workspaceSlug,
              workspaceName: updated.workspaceName,
              theme: updated.theme,
              permissions: {
                canEditTheme: true,
              },
            };
          }),
      );

      const uploadThemeMediaForWorkspaceMember = Effect.fn(
        "WorkspaceThemeService.uploadThemeMediaForWorkspaceMember",
      )(
        ({
          workspaceSlug,
          userId,
          input,
          bytes,
        }: {
          workspaceSlug: string;
          userId: string;
          input: WorkspaceThemeMediaUploadInput;
          bytes: Uint8Array;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireMembership({
              workspaceSlug,
              userId,
            });

            if (membership.role !== "admin") {
              return yield* new WorkspaceThemeForbidden({
                message: "Only workspace admins can upload theme media",
              });
            }

            return yield* repository.uploadWorkspaceThemeMedia({
              workspaceId: membership.workspaceId,
              userId,
              input,
              bytes,
            });
          }),
      );

      const getPublicThemeByWorkspaceSlug = Effect.fn(
        "WorkspaceThemeService.getPublicThemeByWorkspaceSlug",
      )(({ workspaceSlug }: { workspaceSlug: string }) =>
        Effect.gen(function* () {
          const workspaceTheme =
            yield* repository.getPublicWorkspaceThemeBySlug({
              workspaceSlug,
            });

          if (!workspaceTheme) {
            return yield* new WorkspaceThemeWorkspaceNotFound({
              workspaceSlug,
            });
          }

          return workspaceTheme;
        }),
      );

      return {
        requireMembership,
        getThemeForWorkspaceMember,
        updateThemeForWorkspaceMember,
        uploadThemeMediaForWorkspaceMember,
        getPublicThemeByWorkspaceSlug,
      };
    }),
    dependencies: [WorkspaceThemeRepository.Default],
  },
) {}
