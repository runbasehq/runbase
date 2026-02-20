"use client";

import Link from "next/link";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FancyButton } from "@/components/ui/fancy-button";
import { authClient } from "@/lib/auth-client";
import type {
  FeedbackBoardItem,
  FeedbackStatusItem,
} from "~/feedback/lib/types";

import { CreateFeedbackPostDialog } from "./create-feedback-post-dialog";

interface FeedbackAuthActionsProps {
  isAuthenticated: boolean;
  dashboardHref: string;
  signInHref: string;
  callbackUrl: string;
  githubAuthEnabled: boolean;
  workspaceSlug: string;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name">;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label">;
}

export function FeedbackAuthActions({
  isAuthenticated,
  dashboardHref,
  signInHref,
  callbackUrl,
  githubAuthEnabled,
  workspaceSlug,
  defaultBoard,
  defaultStatus,
}: FeedbackAuthActionsProps) {
  const [isGithubPending, setIsGithubPending] = useState(false);

  async function handleGithubSignIn() {
    setIsGithubPending(true);
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: callbackUrl,
    });

    if (error) {
      setIsGithubPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <CreatePostAuthGate
        isAuthenticated={isAuthenticated}
        signInHref={signInHref}
        onGithubSignIn={handleGithubSignIn}
        githubAuthEnabled={githubAuthEnabled}
        isGithubPending={isGithubPending}
        workspaceSlug={workspaceSlug}
        defaultBoard={defaultBoard}
        defaultStatus={defaultStatus}
      />

      <FancyButton.Root asChild variant="basic" size="small">
        <Link href={isAuthenticated ? dashboardHref : signInHref}>
          {isAuthenticated ? "Dashboard" : "Log in"}
        </Link>
      </FancyButton.Root>
    </div>
  );
}

interface CreatePostAuthGateProps {
  isAuthenticated: boolean;
  signInHref: string;
  onGithubSignIn: () => Promise<void>;
  githubAuthEnabled: boolean;
  isGithubPending: boolean;
  workspaceSlug: string;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name">;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label">;
}

function CreatePostAuthGate({
  isAuthenticated,
  signInHref,
  onGithubSignIn,
  githubAuthEnabled,
  isGithubPending,
  workspaceSlug,
  defaultBoard,
  defaultStatus,
}: CreatePostAuthGateProps) {
  if (isAuthenticated) {
    return (
      <CreateFeedbackPostDialog
        workspaceSlug={workspaceSlug}
        defaultBoard={defaultBoard}
        defaultStatus={defaultStatus}
      />
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<FancyButton.Root variant="neutral" size="medium" />}
      >
        Create new post
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign in to create a post</AlertDialogTitle>
          <AlertDialogDescription>
            You can still upvote anonymously. Creating posts requires an
            account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:grid sm:grid-cols-1">
          {githubAuthEnabled ? (
            <FancyButton.Root
              type="button"
              variant="neutral"
              size="small"
              disabled={isGithubPending}
              onClick={onGithubSignIn}
            >
              {isGithubPending
                ? "Redirecting to GitHub..."
                : "Continue with GitHub"}
            </FancyButton.Root>
          ) : null}

          <FancyButton.Root
            asChild
            variant="basic"
            size="small"
            className="w-full"
          >
            <Link href={signInHref}>Use email and password</Link>
          </FancyButton.Root>

          <AlertDialogCancel variant="outline" size="fancy-sm">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
