import "server-only";

import { randomBytes } from "node:crypto";

import { Effect } from "effect";

import { BillingService } from "~/billing/billing.service";
import type { WorkspaceMemberRole } from "~/workspace-members/lib/types";

import {
  WorkspaceMembersForbidden,
  WorkspaceMembersInvitationAlreadyPending,
  WorkspaceMembersInvitationExpired,
  WorkspaceMembersInvitationInvalidToken,
  WorkspaceMembersInvitationNotFound,
  WorkspaceMembersInvalidInput,
  WorkspaceMembersLastAdminViolation,
  WorkspaceMembersMemberNotFound,
  WorkspaceMembersPersistenceError,
  WorkspaceMembersSeatLimitExceeded,
  WorkspaceMembersWorkspaceNotFound,
} from "./workspace-members.errors";
import {
  hashInvitationToken,
  WorkspaceMembersRepository,
} from "./workspace-members.repository";

const INVITATION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;
const INVITATION_RESEND_COOLDOWN_MS = 1000 * 60;

function buildInvitationExpiryDate() {
  return new Date(Date.now() + INVITATION_EXPIRY_MS);
}

function generateInvitationToken() {
  return randomBytes(32).toString("hex");
}

function isExpired(date: Date) {
  return date.getTime() <= Date.now();
}

function isWithinCooldown(lastSentAt: Date | null) {
  if (!lastSentAt) {
    return false;
  }

  return Date.now() - lastSentAt.getTime() < INVITATION_RESEND_COOLDOWN_MS;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export class WorkspaceMembersService extends Effect.Service<WorkspaceMembersService>()(
  "WorkspaceMembersService",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repository = yield* WorkspaceMembersRepository;

      const requireWorkspaceMembership = Effect.fn(
        "WorkspaceMembersService.requireWorkspaceMembership",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* repository.getWorkspaceMembershipBySlug({
              workspaceSlug,
              userId,
            });

            if (!membership) {
              return yield* new WorkspaceMembersWorkspaceNotFound({
                workspaceSlug,
              });
            }

            return membership;
          }),
      );

      const requireWorkspaceAdmin = Effect.fn(
        "WorkspaceMembersService.requireWorkspaceAdmin",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceMembership({
              workspaceSlug,
              userId,
            });

            if (membership.role !== "admin") {
              return yield* new WorkspaceMembersForbidden({
                message: "Only workspace admins can manage members",
              });
            }

            return membership;
          }),
      );

      const listTeamSnapshot = Effect.fn(
        "WorkspaceMembersService.listTeamSnapshot",
      )(
        ({
          workspaceSlug,
          userId,
        }: {
          workspaceSlug: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceMembership({
              workspaceSlug,
              userId,
            });

            const members = yield* repository.listWorkspaceMembers({
              workspaceId: membership.workspaceId,
            });
            const invitations = yield* repository.listWorkspaceInvitations({
              workspaceId: membership.workspaceId,
            });

            return {
              members,
              invitations,
              permissions: {
                canManageMembers: membership.role === "admin",
                currentRole: membership.role,
                currentUserId: userId,
              },
            };
          }),
      );

      const listWorkspaceMembershipsForUser = Effect.fn(
        "WorkspaceMembersService.listWorkspaceMembershipsForUser",
      )(({ userId }: { userId: string }) =>
        repository.listWorkspaceMembershipsForUser({
          userId,
        }),
      );

      const listPendingInvitationsForUser = Effect.fn(
        "WorkspaceMembersService.listPendingInvitationsForUser",
      )(({ userEmail }: { userEmail: string }) => {
        const email = normalizeEmail(userEmail);

        if (!email) {
          return Effect.fail(
            new WorkspaceMembersInvalidInput({
              message: "User email is required",
            }),
          );
        }

        return repository.listPendingInvitationsForEmail({ email });
      });

      const inviteMember = Effect.fn("WorkspaceMembersService.inviteMember")(
        ({
          workspaceSlug,
          userId,
          email,
          role,
        }: {
          workspaceSlug: string;
          userId: string;
          email: string;
          role: WorkspaceMemberRole;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdmin({
              workspaceSlug,
              userId,
            });
            const existingMember = yield* repository.findWorkspaceMemberByEmail(
              {
                workspaceId: membership.workspaceId,
                email,
              },
            );

            if (existingMember) {
              return yield* new WorkspaceMembersInvalidInput({
                message: "That user is already a workspace member",
              });
            }

            const pendingInvite =
              yield* repository.getPendingWorkspaceInvitationByEmail({
                workspaceId: membership.workspaceId,
                email,
              });

            if (pendingInvite) {
              if (isExpired(pendingInvite.expiresAt)) {
                yield* repository.markWorkspaceInvitationExpired({
                  invitationId: pendingInvite.id,
                });
              } else {
                return yield* new WorkspaceMembersInvitationAlreadyPending({
                  email,
                });
              }
            }

            const seatCapacity = yield* BillingService.assertSeatCapacity({
              workspaceId: membership.workspaceId,
              additionalSeats: 1,
            }).pipe(
              Effect.catchAll(() =>
                Effect.fail(
                  new WorkspaceMembersPersistenceError({
                    operation: "workspaceMembers.assertSeatCapacity",
                  }),
                ),
              ),
            );

            if (
              !seatCapacity.allowed &&
              typeof seatCapacity.seatLimit === "number" &&
              typeof seatCapacity.seatsUsed === "number"
            ) {
              return yield* new WorkspaceMembersSeatLimitExceeded({
                seatLimit: seatCapacity.seatLimit,
                seatsUsed: seatCapacity.seatsUsed,
                seatsRequested: seatCapacity.seatsRequested,
              });
            }

            const rawToken = generateInvitationToken();
            const tokenHash = hashInvitationToken(rawToken);
            const invitation = yield* repository.createWorkspaceInvitation({
              workspaceId: membership.workspaceId,
              email,
              role,
              invitedByUserId: userId,
              tokenHash,
              expiresAt: buildInvitationExpiryDate(),
            });
            const appUrl = process.env.APP_URL?.trim();

            if (!appUrl) {
              return yield* new WorkspaceMembersInvalidInput({
                message: "APP_URL is not configured",
              });
            }

            const invitationUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(rawToken)}`;
            const emailMessageId =
              yield* repository.sendWorkspaceInvitationEmail({
                acceptUrl: invitationUrl,
                email: invitation.email,
                idempotencyKey: `workspace-invite/${invitation.id}`,
                inviterName: invitation.invitedByName,
                role: invitation.role,
                workspaceName: invitation.workspaceName,
              });
            yield* repository.recordWorkspaceInvitationEmailSent({
              invitationId: invitation.id,
              emailMessageId,
            });

            return invitation;
          }),
      );

      const resendInvitation = Effect.fn(
        "WorkspaceMembersService.resendInvitation",
      )(
        ({
          workspaceSlug,
          userId,
          invitationId,
        }: {
          workspaceSlug: string;
          userId: string;
          invitationId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdmin({
              workspaceSlug,
              userId,
            });
            const invitation = yield* repository.getWorkspaceInvitationById({
              workspaceId: membership.workspaceId,
              invitationId,
            });

            if (!invitation) {
              return yield* new WorkspaceMembersInvitationNotFound({
                invitationId,
              });
            }

            if (invitation.status !== "pending") {
              return yield* new WorkspaceMembersInvitationNotFound({
                invitationId,
              });
            }

            if (isWithinCooldown(invitation.lastSentAt)) {
              return yield* new WorkspaceMembersInvitationAlreadyPending({
                email: invitation.email,
              });
            }

            if (isExpired(invitation.expiresAt)) {
              yield* repository.markWorkspaceInvitationExpired({
                invitationId,
              });
              return yield* new WorkspaceMembersInvitationExpired({});
            }

            const rawToken = generateInvitationToken();
            const tokenHash = hashInvitationToken(rawToken);
            const refreshed = yield* repository.refreshWorkspaceInvitationToken(
              {
                invitationId,
                tokenHash,
                role: invitation.role,
                expiresAt: buildInvitationExpiryDate(),
              },
            );

            if (!refreshed) {
              return yield* new WorkspaceMembersInvitationNotFound({
                invitationId,
              });
            }

            const appUrl = process.env.APP_URL?.trim();

            if (!appUrl) {
              return yield* new WorkspaceMembersInvalidInput({
                message: "APP_URL is not configured",
              });
            }

            const invitationUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(rawToken)}`;
            const emailMessageId =
              yield* repository.sendWorkspaceInvitationEmail({
                acceptUrl: invitationUrl,
                email: refreshed.email,
                idempotencyKey: `workspace-invite/${refreshed.id}/${Date.now()}`,
                inviterName: refreshed.invitedByName,
                role: refreshed.role,
                workspaceName: refreshed.workspaceName,
              });
            yield* repository.recordWorkspaceInvitationEmailSent({
              invitationId: refreshed.id,
              emailMessageId,
            });

            return refreshed;
          }),
      );

      const cancelInvitation = Effect.fn(
        "WorkspaceMembersService.cancelInvitation",
      )(
        ({
          workspaceSlug,
          userId,
          invitationId,
        }: {
          workspaceSlug: string;
          userId: string;
          invitationId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdmin({
              workspaceSlug,
              userId,
            });
            const invitation = yield* repository.getWorkspaceInvitationById({
              workspaceId: membership.workspaceId,
              invitationId,
            });

            if (!invitation) {
              return yield* new WorkspaceMembersInvitationNotFound({
                invitationId,
              });
            }

            yield* repository.markWorkspaceInvitationCanceled({ invitationId });

            return { invitationId };
          }),
      );

      const updateMemberRole = Effect.fn(
        "WorkspaceMembersService.updateMemberRole",
      )(
        ({
          workspaceSlug,
          userId,
          memberId,
          role,
        }: {
          workspaceSlug: string;
          userId: string;
          memberId: string;
          role: WorkspaceMemberRole;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdmin({
              workspaceSlug,
              userId,
            });
            const member = yield* repository.getWorkspaceMemberById({
              workspaceId: membership.workspaceId,
              memberId,
            });

            if (!member) {
              return yield* new WorkspaceMembersMemberNotFound({ memberId });
            }

            if (member.role === "admin" && role === "contributor") {
              const adminCount = yield* repository.countWorkspaceAdmins({
                workspaceId: membership.workspaceId,
              });

              if (adminCount <= 1) {
                return yield* new WorkspaceMembersLastAdminViolation({});
              }
            }

            const updated = yield* repository.updateWorkspaceMemberRole({
              workspaceId: membership.workspaceId,
              memberId,
              role,
            });

            if (!updated) {
              return yield* new WorkspaceMembersMemberNotFound({ memberId });
            }

            return updated;
          }),
      );

      const removeMember = Effect.fn("WorkspaceMembersService.removeMember")(
        ({
          workspaceSlug,
          userId,
          memberId,
        }: {
          workspaceSlug: string;
          userId: string;
          memberId: string;
        }) =>
          Effect.gen(function* () {
            const membership = yield* requireWorkspaceAdmin({
              workspaceSlug,
              userId,
            });
            const member = yield* repository.getWorkspaceMemberById({
              workspaceId: membership.workspaceId,
              memberId,
            });

            if (!member) {
              return yield* new WorkspaceMembersMemberNotFound({ memberId });
            }

            if (member.role === "admin") {
              const adminCount = yield* repository.countWorkspaceAdmins({
                workspaceId: membership.workspaceId,
              });

              if (adminCount <= 1) {
                return yield* new WorkspaceMembersLastAdminViolation({});
              }
            }

            yield* repository.removeWorkspaceMember({
              workspaceId: membership.workspaceId,
              memberId,
            });

            return { memberId };
          }),
      );

      const acceptInvitation = Effect.fn(
        "WorkspaceMembersService.acceptInvitation",
      )(
        ({
          token,
          userEmail,
          userId,
        }: {
          token: string;
          userEmail: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const tokenHash = hashInvitationToken(token);
            const invitation =
              yield* repository.getWorkspaceInvitationByTokenHash({
                tokenHash,
              });

            if (!invitation || invitation.status !== "pending") {
              return yield* new WorkspaceMembersInvitationInvalidToken({});
            }

            if (invitation.email !== userEmail.trim().toLowerCase()) {
              return yield* new WorkspaceMembersForbidden({
                message:
                  "This invitation was sent to a different email address",
              });
            }

            if (isExpired(invitation.expiresAt)) {
              yield* repository.markWorkspaceInvitationExpired({
                invitationId: invitation.id,
              });
              return yield* new WorkspaceMembersInvitationExpired({});
            }

            const seatCapacity = yield* BillingService.assertSeatCapacity({
              workspaceId: invitation.workspaceId,
              additionalSeats: 0,
            }).pipe(
              Effect.catchAll(() =>
                Effect.fail(
                  new WorkspaceMembersPersistenceError({
                    operation: "workspaceMembers.assertSeatCapacity",
                  }),
                ),
              ),
            );

            if (
              !seatCapacity.allowed &&
              typeof seatCapacity.seatLimit === "number" &&
              typeof seatCapacity.seatsUsed === "number"
            ) {
              return yield* new WorkspaceMembersSeatLimitExceeded({
                seatLimit: seatCapacity.seatLimit,
                seatsUsed: seatCapacity.seatsUsed,
                seatsRequested: seatCapacity.seatsRequested,
              });
            }

            const member = yield* repository.addWorkspaceMemberIfMissing({
              workspaceId: invitation.workspaceId,
              userId,
              role: invitation.role,
            });
            yield* repository.markWorkspaceInvitationAccepted({
              invitationId: invitation.id,
            });

            if (!member) {
              return yield* new WorkspaceMembersInvitationInvalidToken({});
            }

            return {
              member,
              workspaceName: invitation.workspaceName,
              workspaceSlug: invitation.workspaceSlug,
            };
          }),
      );

      const acceptPendingInvitation = Effect.fn(
        "WorkspaceMembersService.acceptPendingInvitation",
      )(
        ({
          invitationId,
          userEmail,
          userId,
        }: {
          invitationId: string;
          userEmail: string;
          userId: string;
        }) =>
          Effect.gen(function* () {
            const email = normalizeEmail(userEmail);

            if (!email) {
              return yield* new WorkspaceMembersInvalidInput({
                message: "User email is required",
              });
            }

            const invitation =
              yield* repository.getPendingInvitationForEmailById({
                email,
                invitationId,
              });

            if (!invitation) {
              return yield* new WorkspaceMembersInvitationNotFound({
                invitationId,
              });
            }

            if (isExpired(invitation.expiresAt)) {
              yield* repository.markWorkspaceInvitationExpired({
                invitationId: invitation.id,
              });
              return yield* new WorkspaceMembersInvitationExpired({});
            }

            const seatCapacity = yield* BillingService.assertSeatCapacity({
              workspaceId: invitation.workspaceId,
              additionalSeats: 0,
            }).pipe(
              Effect.catchAll(() =>
                Effect.fail(
                  new WorkspaceMembersPersistenceError({
                    operation: "workspaceMembers.assertSeatCapacity",
                  }),
                ),
              ),
            );

            if (
              !seatCapacity.allowed &&
              typeof seatCapacity.seatLimit === "number" &&
              typeof seatCapacity.seatsUsed === "number"
            ) {
              return yield* new WorkspaceMembersSeatLimitExceeded({
                seatLimit: seatCapacity.seatLimit,
                seatsUsed: seatCapacity.seatsUsed,
                seatsRequested: seatCapacity.seatsRequested,
              });
            }

            const member = yield* repository.addWorkspaceMemberIfMissing({
              workspaceId: invitation.workspaceId,
              userId,
              role: invitation.role,
            });
            yield* repository.markWorkspaceInvitationAccepted({
              invitationId: invitation.id,
            });

            if (!member) {
              return yield* new WorkspaceMembersInvitationNotFound({
                invitationId,
              });
            }

            return {
              member,
              workspaceName: invitation.workspaceName,
              workspaceSlug: invitation.workspaceSlug,
            };
          }),
      );

      const rejectPendingInvitation = Effect.fn(
        "WorkspaceMembersService.rejectPendingInvitation",
      )(
        ({
          invitationId,
          userEmail,
        }: {
          invitationId: string;
          userEmail: string;
        }) =>
          Effect.gen(function* () {
            const email = normalizeEmail(userEmail);

            if (!email) {
              return yield* new WorkspaceMembersInvalidInput({
                message: "User email is required",
              });
            }

            const invitation =
              yield* repository.getPendingInvitationForEmailById({
                email,
                invitationId,
              });

            if (!invitation) {
              return yield* new WorkspaceMembersInvitationNotFound({
                invitationId,
              });
            }

            if (isExpired(invitation.expiresAt)) {
              yield* repository.markWorkspaceInvitationExpired({
                invitationId: invitation.id,
              });
              return { invitationId: invitation.id };
            }

            yield* repository.markWorkspaceInvitationCanceled({ invitationId });

            return { invitationId };
          }),
      );

      return {
        acceptPendingInvitation,
        acceptInvitation,
        cancelInvitation,
        inviteMember,
        listPendingInvitationsForUser,
        listWorkspaceMembershipsForUser,
        listTeamSnapshot,
        rejectPendingInvitation,
        removeMember,
        resendInvitation,
        updateMemberRole,
      };
    }),
    dependencies: [WorkspaceMembersRepository.Default],
  },
) {}
