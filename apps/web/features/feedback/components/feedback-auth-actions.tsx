"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
import { getAuthRootOrigin } from "~/auth/lib/get-auth-root-origin";
import { consumePendingPopupAuthState } from "~/auth/lib/popup-auth-state";
import { startSocialPopupSignIn } from "~/auth/lib/start-social-popup-sign-in";
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
  const router = useRouter();

  useEffect(() => {
    const authRootOrigin = getAuthRootOrigin();

    function handleAuthComplete(event: MessageEvent) {
      if (event.origin !== authRootOrigin) {
        return;
      }

      const payload = event.data as {
        type?: string;
        refreshOnly?: boolean;
        authState?: string;
      } | null;
      if (
        payload?.type !== "runbase-auth-complete" ||
        payload.refreshOnly !== true ||
        !consumePendingPopupAuthState(payload.authState)
      ) {
        return;
      }

      router.refresh();
    }

    window.addEventListener("message", handleAuthComplete);
    return () => window.removeEventListener("message", handleAuthComplete);
  }, [router]);

  async function handleGithubSignIn() {
    const result = await startSocialPopupSignIn({
      provider: "github",
      nextTarget: callbackUrl,
    });

    if (result.error) {
      return;
    }
  }

  return (
    <div className="flex items-center gap-2">
      <CreatePostAuthGate
        isAuthenticated={isAuthenticated}
        signInHref={signInHref}
        onGithubSignIn={handleGithubSignIn}
        githubAuthEnabled={githubAuthEnabled}
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
  workspaceSlug: string;
  defaultBoard: Pick<FeedbackBoardItem, "id" | "name">;
  defaultStatus: Pick<FeedbackStatusItem, "id" | "key" | "label">;
}

function CreatePostAuthGate({
  isAuthenticated,
  signInHref,
  onGithubSignIn,
  githubAuthEnabled,
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
              onClick={onGithubSignIn}
            >
              Continue with GitHub
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
