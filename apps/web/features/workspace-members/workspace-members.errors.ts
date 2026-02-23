import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";
import { NextResponse } from "next/server";

export class WorkspaceMembersInvalidInput extends Data.TaggedError(
  "WorkspaceMembersInvalidInput",
)<{ message: string }> {}

export class WorkspaceMembersWorkspaceNotFound extends Data.TaggedError(
  "WorkspaceMembersWorkspaceNotFound",
)<{ workspaceSlug: string }> {}

export class WorkspaceMembersForbidden extends Data.TaggedError(
  "WorkspaceMembersForbidden",
)<{ message: string }> {}

export class WorkspaceMembersMemberNotFound extends Data.TaggedError(
  "WorkspaceMembersMemberNotFound",
)<{ memberId: string }> {}

export class WorkspaceMembersInvitationNotFound extends Data.TaggedError(
  "WorkspaceMembersInvitationNotFound",
)<{ invitationId: string }> {}

export class WorkspaceMembersInvitationAlreadyPending extends Data.TaggedError(
  "WorkspaceMembersInvitationAlreadyPending",
)<{ email: string }> {}

export class WorkspaceMembersInvitationInvalidToken extends Data.TaggedError(
  "WorkspaceMembersInvitationInvalidToken",
)<Record<string, never>> {}

export class WorkspaceMembersInvitationExpired extends Data.TaggedError(
  "WorkspaceMembersInvitationExpired",
)<Record<string, never>> {}

export class WorkspaceMembersLastAdminViolation extends Data.TaggedError(
  "WorkspaceMembersLastAdminViolation",
)<Record<string, never>> {}

export class WorkspaceMembersEmailDeliveryFailed extends Data.TaggedError(
  "WorkspaceMembersEmailDeliveryFailed",
)<{ message: string }> {}

export class WorkspaceMembersPersistenceError extends Data.TaggedError(
  "WorkspaceMembersPersistenceError",
)<{ operation: string }> {}

export type WorkspaceMembersRouteError =
  | ParseError
  | WorkspaceMembersInvalidInput
  | WorkspaceMembersWorkspaceNotFound
  | WorkspaceMembersForbidden
  | WorkspaceMembersMemberNotFound
  | WorkspaceMembersInvitationNotFound
  | WorkspaceMembersInvitationAlreadyPending
  | WorkspaceMembersInvitationInvalidToken
  | WorkspaceMembersInvitationExpired
  | WorkspaceMembersLastAdminViolation
  | WorkspaceMembersEmailDeliveryFailed
  | WorkspaceMembersPersistenceError;

export function handleWorkspaceMembersError(
  error: WorkspaceMembersRouteError,
): NextResponse {
  switch (error._tag) {
    case "ParseError":
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    case "WorkspaceMembersInvalidInput":
      return NextResponse.json({ error: error.message }, { status: 400 });
    case "WorkspaceMembersWorkspaceNotFound":
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    case "WorkspaceMembersForbidden":
      return NextResponse.json({ error: error.message }, { status: 403 });
    case "WorkspaceMembersMemberNotFound":
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    case "WorkspaceMembersInvitationNotFound":
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    case "WorkspaceMembersInvitationAlreadyPending":
      return NextResponse.json(
        { error: `${error.email} already has a pending invitation` },
        { status: 409 },
      );
    case "WorkspaceMembersInvitationInvalidToken":
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 400 },
      );
    case "WorkspaceMembersInvitationExpired":
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 410 },
      );
    case "WorkspaceMembersLastAdminViolation":
      return NextResponse.json(
        { error: "Workspace must have at least one admin" },
        { status: 409 },
      );
    case "WorkspaceMembersEmailDeliveryFailed":
      return NextResponse.json({ error: error.message }, { status: 502 });
    case "WorkspaceMembersPersistenceError":
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
  }
}
