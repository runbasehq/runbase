import "server-only";

import { createHash } from "node:crypto";

import { render } from "@react-email/render";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import { Resend } from "resend";

import { db } from "@/lib/db";
import {
  user,
  workspace,
  workspaceDomain,
  workspaceInvitation,
  workspaceMember,
} from "@/lib/db/schema";
import { WorkspaceInviteEmail } from "~/workspace-members/email/workspace-invite-email";
import type {
  UserWorkspaceInvitationView,
  WorkspaceInvitationView,
  WorkspaceMemberRole,
  WorkspaceMemberView,
} from "~/workspace-members/lib/types";

import {
  WorkspaceMembersEmailDeliveryFailed,
  WorkspaceMembersPersistenceError,
} from "./workspace-members.errors";

export interface WorkspaceMembershipRecord {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  connectedDomain: string | null;
  role: WorkspaceMemberRole;
}

export interface WorkspaceInvitationRecord {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  role: WorkspaceMemberRole;
  tokenHash: string;
  status: "pending" | "accepted" | "canceled" | "expired";
  expiresAt: Date;
  invitedByUserId: string;
  invitedByName: string;
  createdAt: Date;
  lastSentAt: Date | null;
}

const toPersistenceError = (operation: string) =>
  new WorkspaceMembersPersistenceError({ operation });

const fromPersistencePromise = <A>(
  operation: string,
  thunk: () => Promise<A>,
) =>
  Effect.tryPromise({
    try: thunk,
    catch: () => toPersistenceError(operation),
  });

function toMemberRole(value: string): WorkspaceMemberRole {
  return value === "admin" ? "admin" : "contributor";
}

function toInvitationStatus(
  value: string,
): "pending" | "accepted" | "canceled" | "expired" {
  if (value === "accepted") {
    return "accepted";
  }

  if (value === "canceled") {
    return "canceled";
  }

  if (value === "expired") {
    return "expired";
  }

  return "pending";
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function toInvitationView(row: {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  invitedByName: string;
  createdAt: Date;
  lastSentAt: Date | null;
}): WorkspaceInvitationView {
  return {
    id: row.id,
    email: row.email,
    role: toMemberRole(row.role),
    status: toInvitationStatus(row.status),
    expiresAt: row.expiresAt.toISOString(),
    invitedByName: row.invitedByName,
    createdAt: row.createdAt.toISOString(),
    lastSentAt: row.lastSentAt ? row.lastSentAt.toISOString() : null,
  };
}

function toUserInvitationView(row: {
  id: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  invitedByName: string;
  createdAt: Date;
  expiresAt: Date;
}): UserWorkspaceInvitationView {
  return {
    id: row.id,
    workspaceName: row.workspaceName,
    workspaceSlug: row.workspaceSlug,
    role: toMemberRole(row.role),
    invitedByName: row.invitedByName,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export class WorkspaceMembersRepository extends Effect.Service<WorkspaceMembersRepository>()(
  "WorkspaceMembersRepository",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const getWorkspaceMembershipBySlug = Effect.fn(
        "WorkspaceMembersRepository.getWorkspaceMembershipBySlug",
      )(
        ({
          userId,
          workspaceSlug,
        }: {
          userId: string;
          workspaceSlug: string;
        }): Effect.Effect<
          WorkspaceMembershipRecord | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.getWorkspaceMembershipBySlug",
            async () => {
              const [membership] = await db
                .select({
                  workspaceId: workspace.id,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  role: workspaceMember.role,
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
                workspaceName: membership.workspaceName,
                workspaceSlug: membership.workspaceSlug,
                connectedDomain: null,
                role: toMemberRole(membership.role),
              };
            },
          ),
      );

      const listWorkspaceMembershipsForUser = Effect.fn(
        "WorkspaceMembersRepository.listWorkspaceMembershipsForUser",
      )(
        ({
          userId,
        }: {
          userId: string;
        }): Effect.Effect<
          WorkspaceMembershipRecord[],
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.listWorkspaceMembershipsForUser",
            async () => {
              const rows = await db
                .select({
                  workspaceId: workspace.id,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  role: workspaceMember.role,
                })
                .from(workspaceMember)
                .innerJoin(
                  workspace,
                  eq(workspaceMember.workspaceId, workspace.id),
                )
                .where(eq(workspaceMember.userId, userId))
                .orderBy(asc(workspaceMember.createdAt));

              const workspaceIds = rows.map((row) => row.workspaceId);

              if (workspaceIds.length === 0) {
                return [];
              }

              const domainRows = await db
                .select({
                  workspaceId: workspaceDomain.workspaceId,
                  domain: workspaceDomain.domain,
                })
                .from(workspaceDomain)
                .where(
                  and(
                    inArray(workspaceDomain.workspaceId, workspaceIds),
                    eq(workspaceDomain.verificationStatus, "verified"),
                  ),
                )
                .orderBy(
                  asc(workspaceDomain.workspaceId),
                  asc(workspaceDomain.createdAt),
                );

              const domainByWorkspaceId = new Map<string, string>();
              for (const domainRow of domainRows) {
                if (!domainByWorkspaceId.has(domainRow.workspaceId)) {
                  domainByWorkspaceId.set(
                    domainRow.workspaceId,
                    domainRow.domain,
                  );
                }
              }

              return rows.map((row) => ({
                workspaceId: row.workspaceId,
                workspaceName: row.workspaceName,
                workspaceSlug: row.workspaceSlug,
                connectedDomain:
                  domainByWorkspaceId.get(row.workspaceId) || null,
                role: toMemberRole(row.role),
              }));
            },
          ),
      );

      const listWorkspaceMembers = Effect.fn(
        "WorkspaceMembersRepository.listWorkspaceMembers",
      )(
        ({
          workspaceId,
        }: {
          workspaceId: string;
        }): Effect.Effect<
          WorkspaceMemberView[],
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.listWorkspaceMembers",
            async () => {
              const rows = await db
                .select({
                  id: workspaceMember.id,
                  userId: user.id,
                  name: user.name,
                  email: user.email,
                  role: workspaceMember.role,
                  joinedAt: workspaceMember.createdAt,
                })
                .from(workspaceMember)
                .innerJoin(user, eq(workspaceMember.userId, user.id))
                .where(eq(workspaceMember.workspaceId, workspaceId))
                .orderBy(
                  sql`case when ${workspaceMember.role} = 'admin' then 0 else 1 end`,
                  workspaceMember.createdAt,
                );

              return rows.map((row) => ({
                id: row.id,
                userId: row.userId,
                name: row.name,
                email: row.email,
                role: toMemberRole(row.role),
                joinedAt: row.joinedAt.toISOString(),
              }));
            },
          ),
      );

      const getWorkspaceMemberById = Effect.fn(
        "WorkspaceMembersRepository.getWorkspaceMemberById",
      )(
        ({
          workspaceId,
          memberId,
        }: {
          workspaceId: string;
          memberId: string;
        }): Effect.Effect<
          WorkspaceMemberView | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.getWorkspaceMemberById",
            async () => {
              const [row] = await db
                .select({
                  id: workspaceMember.id,
                  userId: user.id,
                  name: user.name,
                  email: user.email,
                  role: workspaceMember.role,
                  joinedAt: workspaceMember.createdAt,
                })
                .from(workspaceMember)
                .innerJoin(user, eq(workspaceMember.userId, user.id))
                .where(
                  and(
                    eq(workspaceMember.workspaceId, workspaceId),
                    eq(workspaceMember.id, memberId),
                  ),
                )
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                userId: row.userId,
                name: row.name,
                email: row.email,
                role: toMemberRole(row.role),
                joinedAt: row.joinedAt.toISOString(),
              };
            },
          ),
      );

      const findWorkspaceMemberByEmail = Effect.fn(
        "WorkspaceMembersRepository.findWorkspaceMemberByEmail",
      )(
        ({
          workspaceId,
          email,
        }: {
          workspaceId: string;
          email: string;
        }): Effect.Effect<
          WorkspaceMemberView | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.findWorkspaceMemberByEmail",
            async () => {
              const [row] = await db
                .select({
                  id: workspaceMember.id,
                  userId: user.id,
                  name: user.name,
                  email: user.email,
                  role: workspaceMember.role,
                  joinedAt: workspaceMember.createdAt,
                })
                .from(workspaceMember)
                .innerJoin(user, eq(workspaceMember.userId, user.id))
                .where(
                  and(
                    eq(workspaceMember.workspaceId, workspaceId),
                    eq(user.email, email),
                  ),
                )
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                userId: row.userId,
                name: row.name,
                email: row.email,
                role: toMemberRole(row.role),
                joinedAt: row.joinedAt.toISOString(),
              };
            },
          ),
      );

      const countWorkspaceAdmins = Effect.fn(
        "WorkspaceMembersRepository.countWorkspaceAdmins",
      )(
        ({
          workspaceId,
        }: {
          workspaceId: string;
        }): Effect.Effect<number, WorkspaceMembersPersistenceError> =>
          fromPersistencePromise(
            "workspaceMembers.countWorkspaceAdmins",
            async () => {
              const [row] = await db
                .select({
                  count: sql<number>`count(*)`,
                })
                .from(workspaceMember)
                .where(
                  and(
                    eq(workspaceMember.workspaceId, workspaceId),
                    eq(workspaceMember.role, "admin"),
                  ),
                );

              return Number(row?.count ?? 0);
            },
          ),
      );

      const updateWorkspaceMemberRole = Effect.fn(
        "WorkspaceMembersRepository.updateWorkspaceMemberRole",
      )(
        ({
          workspaceId,
          memberId,
          role,
        }: {
          workspaceId: string;
          memberId: string;
          role: WorkspaceMemberRole;
        }): Effect.Effect<
          WorkspaceMemberView | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.updateWorkspaceMemberRole",
            async () => {
              const [updated] = await db
                .update(workspaceMember)
                .set({
                  role,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(workspaceMember.workspaceId, workspaceId),
                    eq(workspaceMember.id, memberId),
                  ),
                )
                .returning({ id: workspaceMember.id });

              if (!updated) {
                return null;
              }

              const [row] = await db
                .select({
                  id: workspaceMember.id,
                  userId: user.id,
                  name: user.name,
                  email: user.email,
                  role: workspaceMember.role,
                  joinedAt: workspaceMember.createdAt,
                })
                .from(workspaceMember)
                .innerJoin(user, eq(workspaceMember.userId, user.id))
                .where(eq(workspaceMember.id, updated.id))
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                userId: row.userId,
                name: row.name,
                email: row.email,
                role: toMemberRole(row.role),
                joinedAt: row.joinedAt.toISOString(),
              };
            },
          ),
      );

      const removeWorkspaceMember = Effect.fn(
        "WorkspaceMembersRepository.removeWorkspaceMember",
      )(
        ({
          workspaceId,
          memberId,
        }: {
          workspaceId: string;
          memberId: string;
        }): Effect.Effect<boolean, WorkspaceMembersPersistenceError> =>
          fromPersistencePromise(
            "workspaceMembers.removeWorkspaceMember",
            async () => {
              const rows = await db
                .delete(workspaceMember)
                .where(
                  and(
                    eq(workspaceMember.workspaceId, workspaceId),
                    eq(workspaceMember.id, memberId),
                  ),
                )
                .returning({ id: workspaceMember.id });

              return rows.length > 0;
            },
          ),
      );

      const listWorkspaceInvitations = Effect.fn(
        "WorkspaceMembersRepository.listWorkspaceInvitations",
      )(
        ({
          workspaceId,
        }: {
          workspaceId: string;
        }): Effect.Effect<
          WorkspaceInvitationView[],
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.listWorkspaceInvitations",
            async () => {
              const rows = await db
                .select({
                  id: workspaceInvitation.id,
                  email: workspaceInvitation.email,
                  role: workspaceInvitation.role,
                  status: workspaceInvitation.status,
                  expiresAt: workspaceInvitation.expiresAt,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  lastSentAt: workspaceInvitation.lastSentAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(eq(workspaceInvitation.workspaceId, workspaceId))
                .orderBy(desc(workspaceInvitation.createdAt));

              return rows.map(toInvitationView);
            },
          ),
      );

      const listPendingInvitationsForEmail = Effect.fn(
        "WorkspaceMembersRepository.listPendingInvitationsForEmail",
      )(
        ({
          email,
        }: {
          email: string;
        }): Effect.Effect<
          UserWorkspaceInvitationView[],
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.listPendingInvitationsForEmail",
            async () => {
              const rows = await db
                .select({
                  id: workspaceInvitation.id,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  role: workspaceInvitation.role,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  expiresAt: workspaceInvitation.expiresAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  workspace,
                  eq(workspaceInvitation.workspaceId, workspace.id),
                )
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(
                  and(
                    eq(workspaceInvitation.email, email),
                    eq(workspaceInvitation.status, "pending"),
                    sql`${workspaceInvitation.expiresAt} > now()`,
                  ),
                )
                .orderBy(desc(workspaceInvitation.createdAt));

              return rows.map(toUserInvitationView);
            },
          ),
      );

      const getPendingInvitationForEmailById = Effect.fn(
        "WorkspaceMembersRepository.getPendingInvitationForEmailById",
      )(
        ({
          email,
          invitationId,
        }: {
          email: string;
          invitationId: string;
        }): Effect.Effect<
          WorkspaceInvitationRecord | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.getPendingInvitationForEmailById",
            async () => {
              const [row] = await db
                .select({
                  id: workspaceInvitation.id,
                  workspaceId: workspaceInvitation.workspaceId,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  email: workspaceInvitation.email,
                  role: workspaceInvitation.role,
                  tokenHash: workspaceInvitation.tokenHash,
                  status: workspaceInvitation.status,
                  expiresAt: workspaceInvitation.expiresAt,
                  invitedByUserId: workspaceInvitation.invitedByUserId,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  lastSentAt: workspaceInvitation.lastSentAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  workspace,
                  eq(workspaceInvitation.workspaceId, workspace.id),
                )
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(
                  and(
                    eq(workspaceInvitation.id, invitationId),
                    eq(workspaceInvitation.email, email),
                    eq(workspaceInvitation.status, "pending"),
                  ),
                )
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                workspaceId: row.workspaceId,
                workspaceName: row.workspaceName,
                workspaceSlug: row.workspaceSlug,
                email: row.email,
                role: toMemberRole(row.role),
                tokenHash: row.tokenHash,
                status: toInvitationStatus(row.status),
                expiresAt: row.expiresAt,
                invitedByUserId: row.invitedByUserId,
                invitedByName: row.invitedByName,
                createdAt: row.createdAt,
                lastSentAt: row.lastSentAt,
              };
            },
          ),
      );

      const getWorkspaceInvitationById = Effect.fn(
        "WorkspaceMembersRepository.getWorkspaceInvitationById",
      )(
        ({
          workspaceId,
          invitationId,
        }: {
          workspaceId: string;
          invitationId: string;
        }): Effect.Effect<
          WorkspaceInvitationRecord | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.getWorkspaceInvitationById",
            async () => {
              const [row] = await db
                .select({
                  id: workspaceInvitation.id,
                  workspaceId: workspaceInvitation.workspaceId,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  email: workspaceInvitation.email,
                  role: workspaceInvitation.role,
                  tokenHash: workspaceInvitation.tokenHash,
                  status: workspaceInvitation.status,
                  expiresAt: workspaceInvitation.expiresAt,
                  invitedByUserId: workspaceInvitation.invitedByUserId,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  lastSentAt: workspaceInvitation.lastSentAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  workspace,
                  eq(workspaceInvitation.workspaceId, workspace.id),
                )
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(
                  and(
                    eq(workspaceInvitation.workspaceId, workspaceId),
                    eq(workspaceInvitation.id, invitationId),
                  ),
                )
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                workspaceId: row.workspaceId,
                workspaceName: row.workspaceName,
                workspaceSlug: row.workspaceSlug,
                email: row.email,
                role: toMemberRole(row.role),
                tokenHash: row.tokenHash,
                status: toInvitationStatus(row.status),
                expiresAt: row.expiresAt,
                invitedByUserId: row.invitedByUserId,
                invitedByName: row.invitedByName,
                createdAt: row.createdAt,
                lastSentAt: row.lastSentAt,
              };
            },
          ),
      );

      const getPendingWorkspaceInvitationByEmail = Effect.fn(
        "WorkspaceMembersRepository.getPendingWorkspaceInvitationByEmail",
      )(
        ({
          workspaceId,
          email,
        }: {
          workspaceId: string;
          email: string;
        }): Effect.Effect<
          WorkspaceInvitationRecord | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.getPendingWorkspaceInvitationByEmail",
            async () => {
              const [row] = await db
                .select({
                  id: workspaceInvitation.id,
                  workspaceId: workspaceInvitation.workspaceId,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  email: workspaceInvitation.email,
                  role: workspaceInvitation.role,
                  tokenHash: workspaceInvitation.tokenHash,
                  status: workspaceInvitation.status,
                  expiresAt: workspaceInvitation.expiresAt,
                  invitedByUserId: workspaceInvitation.invitedByUserId,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  lastSentAt: workspaceInvitation.lastSentAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  workspace,
                  eq(workspaceInvitation.workspaceId, workspace.id),
                )
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(
                  and(
                    eq(workspaceInvitation.workspaceId, workspaceId),
                    eq(workspaceInvitation.email, email),
                    eq(workspaceInvitation.status, "pending"),
                  ),
                )
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                workspaceId: row.workspaceId,
                workspaceName: row.workspaceName,
                workspaceSlug: row.workspaceSlug,
                email: row.email,
                role: toMemberRole(row.role),
                tokenHash: row.tokenHash,
                status: toInvitationStatus(row.status),
                expiresAt: row.expiresAt,
                invitedByUserId: row.invitedByUserId,
                invitedByName: row.invitedByName,
                createdAt: row.createdAt,
                lastSentAt: row.lastSentAt,
              };
            },
          ),
      );

      const createWorkspaceInvitation = Effect.fn(
        "WorkspaceMembersRepository.createWorkspaceInvitation",
      )(
        ({
          workspaceId,
          email,
          role,
          invitedByUserId,
          tokenHash,
          expiresAt,
        }: {
          workspaceId: string;
          email: string;
          role: WorkspaceMemberRole;
          invitedByUserId: string;
          tokenHash: string;
          expiresAt: Date;
        }): Effect.Effect<
          WorkspaceInvitationRecord,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.createWorkspaceInvitation",
            async () => {
              const [row] = await db
                .insert(workspaceInvitation)
                .values({
                  id: crypto.randomUUID(),
                  workspaceId,
                  email,
                  role,
                  invitedByUserId,
                  tokenHash,
                  status: "pending",
                  expiresAt,
                  sendCount: 0,
                })
                .returning({ id: workspaceInvitation.id });

              const [created] = await db
                .select({
                  id: workspaceInvitation.id,
                  workspaceId: workspaceInvitation.workspaceId,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  email: workspaceInvitation.email,
                  role: workspaceInvitation.role,
                  tokenHash: workspaceInvitation.tokenHash,
                  status: workspaceInvitation.status,
                  expiresAt: workspaceInvitation.expiresAt,
                  invitedByUserId: workspaceInvitation.invitedByUserId,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  lastSentAt: workspaceInvitation.lastSentAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  workspace,
                  eq(workspaceInvitation.workspaceId, workspace.id),
                )
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(eq(workspaceInvitation.id, row.id))
                .limit(1);

              if (!created) {
                throw new Error("missing_created_invitation");
              }

              return {
                id: created.id,
                workspaceId: created.workspaceId,
                workspaceName: created.workspaceName,
                workspaceSlug: created.workspaceSlug,
                email: created.email,
                role: toMemberRole(created.role),
                tokenHash: created.tokenHash,
                status: toInvitationStatus(created.status),
                expiresAt: created.expiresAt,
                invitedByUserId: created.invitedByUserId,
                invitedByName: created.invitedByName,
                createdAt: created.createdAt,
                lastSentAt: created.lastSentAt,
              };
            },
          ),
      );

      const refreshWorkspaceInvitationToken = Effect.fn(
        "WorkspaceMembersRepository.refreshWorkspaceInvitationToken",
      )(
        ({
          invitationId,
          tokenHash,
          role,
          expiresAt,
        }: {
          invitationId: string;
          tokenHash: string;
          role: WorkspaceMemberRole;
          expiresAt: Date;
        }): Effect.Effect<
          WorkspaceInvitationRecord | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.refreshWorkspaceInvitationToken",
            async () => {
              const [updated] = await db
                .update(workspaceInvitation)
                .set({
                  tokenHash,
                  role,
                  status: "pending",
                  expiresAt,
                  acceptedAt: null,
                  canceledAt: null,
                  updatedAt: new Date(),
                })
                .where(eq(workspaceInvitation.id, invitationId))
                .returning({ id: workspaceInvitation.id });

              if (!updated) {
                return null;
              }

              const [row] = await db
                .select({
                  id: workspaceInvitation.id,
                  workspaceId: workspaceInvitation.workspaceId,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  email: workspaceInvitation.email,
                  role: workspaceInvitation.role,
                  tokenHash: workspaceInvitation.tokenHash,
                  status: workspaceInvitation.status,
                  expiresAt: workspaceInvitation.expiresAt,
                  invitedByUserId: workspaceInvitation.invitedByUserId,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  lastSentAt: workspaceInvitation.lastSentAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  workspace,
                  eq(workspaceInvitation.workspaceId, workspace.id),
                )
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(eq(workspaceInvitation.id, invitationId))
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                workspaceId: row.workspaceId,
                workspaceName: row.workspaceName,
                workspaceSlug: row.workspaceSlug,
                email: row.email,
                role: toMemberRole(row.role),
                tokenHash: row.tokenHash,
                status: toInvitationStatus(row.status),
                expiresAt: row.expiresAt,
                invitedByUserId: row.invitedByUserId,
                invitedByName: row.invitedByName,
                createdAt: row.createdAt,
                lastSentAt: row.lastSentAt,
              };
            },
          ),
      );

      const markWorkspaceInvitationCanceled = Effect.fn(
        "WorkspaceMembersRepository.markWorkspaceInvitationCanceled",
      )(
        ({
          invitationId,
        }: {
          invitationId: string;
        }): Effect.Effect<boolean, WorkspaceMembersPersistenceError> =>
          fromPersistencePromise(
            "workspaceMembers.markWorkspaceInvitationCanceled",
            async () => {
              const rows = await db
                .update(workspaceInvitation)
                .set({
                  status: "canceled",
                  canceledAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(workspaceInvitation.id, invitationId))
                .returning({ id: workspaceInvitation.id });

              return rows.length > 0;
            },
          ),
      );

      const markWorkspaceInvitationExpired = Effect.fn(
        "WorkspaceMembersRepository.markWorkspaceInvitationExpired",
      )(
        ({
          invitationId,
        }: {
          invitationId: string;
        }): Effect.Effect<boolean, WorkspaceMembersPersistenceError> =>
          fromPersistencePromise(
            "workspaceMembers.markWorkspaceInvitationExpired",
            async () => {
              const rows = await db
                .update(workspaceInvitation)
                .set({
                  status: "expired",
                  updatedAt: new Date(),
                })
                .where(eq(workspaceInvitation.id, invitationId))
                .returning({ id: workspaceInvitation.id });

              return rows.length > 0;
            },
          ),
      );

      const markWorkspaceInvitationAccepted = Effect.fn(
        "WorkspaceMembersRepository.markWorkspaceInvitationAccepted",
      )(
        ({
          invitationId,
        }: {
          invitationId: string;
        }): Effect.Effect<boolean, WorkspaceMembersPersistenceError> =>
          fromPersistencePromise(
            "workspaceMembers.markWorkspaceInvitationAccepted",
            async () => {
              const now = new Date();
              const rows = await db
                .update(workspaceInvitation)
                .set({
                  status: "accepted",
                  acceptedAt: now,
                  updatedAt: now,
                })
                .where(eq(workspaceInvitation.id, invitationId))
                .returning({ id: workspaceInvitation.id });

              return rows.length > 0;
            },
          ),
      );

      const recordWorkspaceInvitationEmailSent = Effect.fn(
        "WorkspaceMembersRepository.recordWorkspaceInvitationEmailSent",
      )(
        ({
          invitationId,
          emailMessageId,
        }: {
          invitationId: string;
          emailMessageId: string | null;
        }): Effect.Effect<boolean, WorkspaceMembersPersistenceError> =>
          fromPersistencePromise(
            "workspaceMembers.recordWorkspaceInvitationEmailSent",
            async () => {
              const now = new Date();
              const rows = await db
                .update(workspaceInvitation)
                .set({
                  lastSentAt: now,
                  emailMessageId,
                  sendCount: sql`${workspaceInvitation.sendCount} + 1`,
                  updatedAt: now,
                })
                .where(eq(workspaceInvitation.id, invitationId))
                .returning({ id: workspaceInvitation.id });

              return rows.length > 0;
            },
          ),
      );

      const getWorkspaceInvitationByTokenHash = Effect.fn(
        "WorkspaceMembersRepository.getWorkspaceInvitationByTokenHash",
      )(
        ({
          tokenHash,
        }: {
          tokenHash: string;
        }): Effect.Effect<
          WorkspaceInvitationRecord | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.getWorkspaceInvitationByTokenHash",
            async () => {
              const [row] = await db
                .select({
                  id: workspaceInvitation.id,
                  workspaceId: workspaceInvitation.workspaceId,
                  workspaceName: workspace.name,
                  workspaceSlug: workspace.slug,
                  email: workspaceInvitation.email,
                  role: workspaceInvitation.role,
                  tokenHash: workspaceInvitation.tokenHash,
                  status: workspaceInvitation.status,
                  expiresAt: workspaceInvitation.expiresAt,
                  invitedByUserId: workspaceInvitation.invitedByUserId,
                  invitedByName: user.name,
                  createdAt: workspaceInvitation.createdAt,
                  lastSentAt: workspaceInvitation.lastSentAt,
                })
                .from(workspaceInvitation)
                .innerJoin(
                  workspace,
                  eq(workspaceInvitation.workspaceId, workspace.id),
                )
                .innerJoin(
                  user,
                  eq(workspaceInvitation.invitedByUserId, user.id),
                )
                .where(eq(workspaceInvitation.tokenHash, tokenHash))
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                workspaceId: row.workspaceId,
                workspaceName: row.workspaceName,
                workspaceSlug: row.workspaceSlug,
                email: row.email,
                role: toMemberRole(row.role),
                tokenHash: row.tokenHash,
                status: toInvitationStatus(row.status),
                expiresAt: row.expiresAt,
                invitedByUserId: row.invitedByUserId,
                invitedByName: row.invitedByName,
                createdAt: row.createdAt,
                lastSentAt: row.lastSentAt,
              };
            },
          ),
      );

      const addWorkspaceMemberIfMissing = Effect.fn(
        "WorkspaceMembersRepository.addWorkspaceMemberIfMissing",
      )(
        ({
          workspaceId,
          userId,
          role,
        }: {
          workspaceId: string;
          userId: string;
          role: WorkspaceMemberRole;
        }): Effect.Effect<
          WorkspaceMemberView | null,
          WorkspaceMembersPersistenceError
        > =>
          fromPersistencePromise(
            "workspaceMembers.addWorkspaceMemberIfMissing",
            async () => {
              await db
                .insert(workspaceMember)
                .values({
                  id: crypto.randomUUID(),
                  workspaceId,
                  userId,
                  role,
                })
                .onConflictDoNothing();

              const [row] = await db
                .select({
                  id: workspaceMember.id,
                  userId: user.id,
                  name: user.name,
                  email: user.email,
                  role: workspaceMember.role,
                  joinedAt: workspaceMember.createdAt,
                })
                .from(workspaceMember)
                .innerJoin(user, eq(workspaceMember.userId, user.id))
                .where(
                  and(
                    eq(workspaceMember.workspaceId, workspaceId),
                    eq(workspaceMember.userId, userId),
                  ),
                )
                .limit(1);

              if (!row) {
                return null;
              }

              return {
                id: row.id,
                userId: row.userId,
                name: row.name,
                email: row.email,
                role: toMemberRole(row.role),
                joinedAt: row.joinedAt.toISOString(),
              };
            },
          ),
      );

      const sendWorkspaceInvitationEmail = Effect.fn(
        "WorkspaceMembersRepository.sendWorkspaceInvitationEmail",
      )(
        ({
          acceptUrl,
          email,
          idempotencyKey,
          inviterName,
          role,
          workspaceName,
        }: {
          acceptUrl: string;
          email: string;
          idempotencyKey: string;
          inviterName: string;
          role: WorkspaceMemberRole;
          workspaceName: string;
        }): Effect.Effect<string | null, WorkspaceMembersEmailDeliveryFailed> =>
          Effect.tryPromise({
            try: async () => {
              const resend = getResend();
              const from = process.env.RESEND_FROM_EMAIL;

              if (!resend || !from) {
                throw new Error(
                  "Missing RESEND_API_KEY or RESEND_FROM_EMAIL environment variables",
                );
              }

              const reactBody = WorkspaceInviteEmail({
                acceptUrl,
                inviterName,
                role,
                workspaceName,
              });
              const html = await render(reactBody);
              const text = `${inviterName} invited you to join ${workspaceName} as ${role}. Accept invitation: ${acceptUrl}`;

              const { data, error } = await resend.emails.send(
                {
                  from,
                  to: [email],
                  subject: `${inviterName} invited you to ${workspaceName}`,
                  html,
                  text,
                },
                {
                  idempotencyKey,
                },
              );

              if (error) {
                throw new Error(error.message || "Email delivery failed");
              }

              return data?.id ?? null;
            },
            catch: (error) =>
              new WorkspaceMembersEmailDeliveryFailed({
                message:
                  error instanceof Error
                    ? error.message
                    : "Unable to send workspace invitation",
              }),
          }),
      );

      return {
        addWorkspaceMemberIfMissing,
        countWorkspaceAdmins,
        createWorkspaceInvitation,
        findWorkspaceMemberByEmail,
        getPendingInvitationForEmailById,
        getPendingWorkspaceInvitationByEmail,
        getWorkspaceInvitationById,
        getWorkspaceInvitationByTokenHash,
        getWorkspaceMemberById,
        getWorkspaceMembershipBySlug,
        listPendingInvitationsForEmail,
        listWorkspaceMembershipsForUser,
        listWorkspaceInvitations,
        listWorkspaceMembers,
        markWorkspaceInvitationAccepted,
        markWorkspaceInvitationCanceled,
        markWorkspaceInvitationExpired,
        recordWorkspaceInvitationEmailSent,
        refreshWorkspaceInvitationToken,
        removeWorkspaceMember,
        sendWorkspaceInvitationEmail,
        updateWorkspaceMemberRole,
      };
    }),
  },
) {}
