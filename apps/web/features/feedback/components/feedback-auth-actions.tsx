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
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface FeedbackAuthActionsProps {
  isAuthenticated: boolean;
  dashboardHref: string;
  signInHref: string;
  callbackUrl: string;
  githubAuthEnabled: boolean;
}

export function FeedbackAuthActions({
  isAuthenticated,
  dashboardHref,
  signInHref,
  callbackUrl,
  githubAuthEnabled,
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
      />

      <Link
        href={isAuthenticated ? dashboardHref : signInHref}
        className={cn(
          buttonVariants({ variant: "fancy-basic", size: "fancy-sm" }),
        )}
      >
        {isAuthenticated ? "Dashboard" : "Log in"}
      </Link>
    </div>
  );
}

interface CreatePostAuthGateProps {
  isAuthenticated: boolean;
  signInHref: string;
  onGithubSignIn: () => Promise<void>;
  githubAuthEnabled: boolean;
  isGithubPending: boolean;
}

function CreatePostAuthGate({
  isAuthenticated,
  signInHref,
  onGithubSignIn,
  githubAuthEnabled,
  isGithubPending,
}: CreatePostAuthGateProps) {
  if (isAuthenticated) {
    return (
      <Button variant="fancy" size="fancy-md" type="button">
        Create new post
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="fancy" size="fancy-md" />}>
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
            <Button
              type="button"
              variant="fancy"
              size="fancy-sm"
              disabled={isGithubPending}
              onClick={onGithubSignIn}
            >
              {isGithubPending
                ? "Redirecting to GitHub..."
                : "Continue with GitHub"}
            </Button>
          ) : null}

          <Link
            href={signInHref}
            className={cn(
              buttonVariants({ variant: "fancy-basic", size: "fancy-sm" }),
              "w-full",
            )}
          >
            Use email and password
          </Link>

          <AlertDialogCancel variant="outline" size="fancy-sm">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
