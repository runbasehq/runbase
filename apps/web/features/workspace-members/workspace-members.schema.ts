import { Effect, Schema } from "effect";

import { validateWorkspaceSlug } from "~/workspace/schemas/workspace-slug";
import type { WorkspaceMemberRole } from "~/workspace-members/lib/types";

import { WorkspaceMembersInvalidInput } from "./workspace-members.errors";

const WorkspaceSlugParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
});

const MemberParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
  memberId: Schema.String,
});

const InvitationParamsSchema = Schema.Struct({
  workspaceSlug: Schema.String,
  invitationId: Schema.String,
});

const UserInvitationParamsSchema = Schema.Struct({
  invitationId: Schema.String,
});

const UpdateMemberRoleBodySchema = Schema.Struct({
  role: Schema.String,
});

const CreateInvitationBodySchema = Schema.Struct({
  email: Schema.String,
  role: Schema.String,
});

const AcceptInvitationBodySchema = Schema.Struct({
  token: Schema.String,
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validateEmail(value: string): string | null {
  if (!value) {
    return "Email is required";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(value)) {
    return "Enter a valid email address";
  }

  return null;
}

function normalizeRole(value: string): WorkspaceMemberRole | null {
  const role = value.trim().toLowerCase();

  if (role === "admin" || role === "contributor") {
    return role;
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

  if (!normalized) {
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

export interface WorkspaceSlugParamsInput {
  workspaceSlug: string;
}

export interface MemberParamsInput {
  workspaceSlug: string;
  memberId: string;
}

export interface InvitationParamsInput {
  workspaceSlug: string;
  invitationId: string;
}

export interface UserInvitationParamsInput {
  invitationId: string;
}

export interface UpdateMemberRoleInput {
  role: WorkspaceMemberRole;
}

export interface CreateInvitationInput {
  email: string;
  role: WorkspaceMemberRole;
}

export interface AcceptInvitationInput {
  token: string;
}

export const decodeWorkspaceSlugParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(WorkspaceSlugParamsSchema)(raw);
    const { value: workspaceSlug, error } = validateWorkspaceSlugInput(
      decoded.workspaceSlug,
    );

    if (error || !workspaceSlug) {
      return yield* new WorkspaceMembersInvalidInput({
        message: error || "Workspace slug is required",
      });
    }

    return { workspaceSlug } satisfies WorkspaceSlugParamsInput;
  });

export const decodeMemberParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(MemberParamsSchema)(raw);
    const { value: workspaceSlug, error: slugError } =
      validateWorkspaceSlugInput(decoded.workspaceSlug);
    const { value: memberId, error: memberError } = validateNonEmptyId(
      decoded.memberId,
      "Member id",
    );

    if (slugError || !workspaceSlug) {
      return yield* new WorkspaceMembersInvalidInput({
        message: slugError || "Workspace slug is required",
      });
    }

    if (memberError || !memberId) {
      return yield* new WorkspaceMembersInvalidInput({
        message: memberError || "Member id is required",
      });
    }

    return { workspaceSlug, memberId } satisfies MemberParamsInput;
  });

export const decodeInvitationParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(InvitationParamsSchema)(raw);
    const { value: workspaceSlug, error: slugError } =
      validateWorkspaceSlugInput(decoded.workspaceSlug);
    const { value: invitationId, error: invitationError } = validateNonEmptyId(
      decoded.invitationId,
      "Invitation id",
    );

    if (slugError || !workspaceSlug) {
      return yield* new WorkspaceMembersInvalidInput({
        message: slugError || "Workspace slug is required",
      });
    }

    if (invitationError || !invitationId) {
      return yield* new WorkspaceMembersInvalidInput({
        message: invitationError || "Invitation id is required",
      });
    }

    return { workspaceSlug, invitationId } satisfies InvitationParamsInput;
  });

export const decodeUserInvitationParams = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(UserInvitationParamsSchema)(
      raw,
    );
    const { value: invitationId, error: invitationError } = validateNonEmptyId(
      decoded.invitationId,
      "Invitation id",
    );

    if (invitationError || !invitationId) {
      return yield* new WorkspaceMembersInvalidInput({
        message: invitationError || "Invitation id is required",
      });
    }

    return { invitationId } satisfies UserInvitationParamsInput;
  });

export const decodeUpdateMemberRoleInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(UpdateMemberRoleBodySchema)(
      raw,
    );
    const role = normalizeRole(decoded.role);

    if (!role) {
      return yield* new WorkspaceMembersInvalidInput({
        message: "Role must be admin or contributor",
      });
    }

    return { role } satisfies UpdateMemberRoleInput;
  });

export const decodeCreateInvitationInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(CreateInvitationBodySchema)(
      raw,
    );
    const email = normalizeEmail(decoded.email);
    const emailError = validateEmail(email);
    const role = normalizeRole(decoded.role);

    if (emailError) {
      return yield* new WorkspaceMembersInvalidInput({ message: emailError });
    }

    if (!role) {
      return yield* new WorkspaceMembersInvalidInput({
        message: "Role must be admin or contributor",
      });
    }

    return { email, role } satisfies CreateInvitationInput;
  });

export const decodeAcceptInvitationInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(AcceptInvitationBodySchema)(
      raw,
    );
    const token = decoded.token.trim();

    if (!token) {
      return yield* new WorkspaceMembersInvalidInput({
        message: "Invitation token is required",
      });
    }

    return { token } satisfies AcceptInvitationInput;
  });
