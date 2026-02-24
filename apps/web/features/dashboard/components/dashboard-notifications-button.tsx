"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconBell } from "@/components/icons/icon-bell";
import { cn, protocol, rootDomain } from "@/lib/utils";
import {
  useAcceptUserWorkspaceInvitationMutation,
  useRejectUserWorkspaceInvitationMutation,
  useUserWorkspaceInvitations,
} from "~/workspace-members/hooks/use-user-workspace-invitations";

function formatInvitationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function DashboardNotificationsButton({
  className,
}: {
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const invitationsQuery = useUserWorkspaceInvitations();
  const acceptMutation = useAcceptUserWorkspaceInvitationMutation();
  const rejectMutation = useRejectUserWorkspaceInvitationMutation();
  const invitations = invitationsQuery.data?.invitations ?? [];
  const pendingCount = invitations.length;

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  function isActionPending(invitationId: string) {
    const acceptPending =
      acceptMutation.isPending &&
      acceptMutation.variables?.invitationId === invitationId;
    const rejectPending =
      rejectMutation.isPending &&
      rejectMutation.variables?.invitationId === invitationId;

    return acceptPending || rejectPending;
  }

  async function handleAccept(invitationId: string) {
    setActionError(null);

    try {
      const result = await acceptMutation.mutateAsync({ invitationId });
      window.location.assign(
        `${protocol}://${result.workspaceSlug}.${rootDomain}/dashboard`,
      );
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Unable to accept invitation right now"),
      );
    }
  }

  async function handleReject(invitationId: string) {
    setActionError(null);

    try {
      await rejectMutation.mutateAsync({ invitationId });
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Unable to reject invitation right now"),
      );
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Open notifications"
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative ml-auto rounded-md border border-(--sidebar-border) bg-(--sidebar) text-(--muted-2) hover:bg-black/7 hover:text-(--text)",
          className,
        )}
      >
        <IconBell className="size-4" />
        {pendingCount > 0 ? (
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-black">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        ) : null}
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen);

          if (!nextOpen) {
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-[420px] rounded-xl p-4">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>
              {pendingCount > 0
                ? `You have ${pendingCount} pending invitation${pendingCount === 1 ? "" : "s"}.`
                : "No pending notifications right now."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-1 max-h-80 space-y-2 overflow-y-auto pr-1">
            {invitationsQuery.isLoading ? (
              <p className="text-xs text-(--muted-2)">Loading invitations...</p>
            ) : null}

            {!invitationsQuery.isLoading && invitations.length === 0 ? (
              <div className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-xs text-(--muted-2)">
                You are up to date.
              </div>
            ) : null}

            {invitations.map((invitation) => {
              const pending = isActionPending(invitation.id);
              const createdAtLabel = formatInvitationTime(invitation.createdAt);

              return (
                <div
                  key={invitation.id}
                  className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-(--text)">
                    Workspace invitation
                  </p>
                  <p className="mt-0.5 text-xs text-(--muted-2)">
                    You were invited to{" "}
                    <span className="font-semibold text-(--text)">
                      {invitation.workspaceName}
                    </span>{" "}
                    by {invitation.invitedByName} as {invitation.role}
                    {createdAtLabel ? ` · ${createdAtLabel}` : ""}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleAccept(invitation.id)}
                      className="h-7 rounded-md px-2.5 text-xs"
                    >
                      {pending &&
                      acceptMutation.variables?.invitationId === invitation.id
                        ? "Accepting..."
                        : "Accept"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleReject(invitation.id)}
                      className="h-7 rounded-md px-2.5 text-xs"
                    >
                      {pending &&
                      rejectMutation.variables?.invitationId === invitation.id
                        ? "Rejecting..."
                        : "Reject"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {invitationsQuery.error ? (
            <p className="text-xs text-(--danger)">
              {getErrorMessage(
                invitationsQuery.error,
                "Unable to load notifications",
              )}
            </p>
          ) : null}

          {actionError ? (
            <p className="text-xs text-(--danger)">{actionError}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
