"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { FancyButton } from "@/components/ui/fancy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

interface FeedbackAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  githubAuthEnabled: boolean;
  onAuthenticated: () => void;
}

export function FeedbackAuthModal({
  open,
  onOpenChange,
  workspaceSlug,
  githubAuthEnabled,
  onAuthenticated,
}: FeedbackAuthModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGithubPending, setIsGithubPending] = useState(false);

  const isScopedWorkspacePath =
    pathname === `/s/${workspaceSlug}` ||
    pathname.startsWith(`/s/${workspaceSlug}/`);

  function getAuthCallbackPath() {
    if (isScopedWorkspacePath) {
      return `/s/${workspaceSlug}`;
    }

    if (pathname === "/" || pathname.startsWith("/p/")) {
      return pathname;
    }

    return "/";
  }

  const callbackURL = getAuthCallbackPath();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const response =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: name.trim() || "Runbase user",
            email: email.trim().toLowerCase(),
            password,
            callbackURL,
          })
        : await authClient.signIn.email({
            email: email.trim().toLowerCase(),
            password,
            callbackURL,
          });

    if (response.error) {
      setError(
        response.error.message ||
          (mode === "sign-up"
            ? "Unable to create account"
            : "Invalid email or password"),
      );
      setIsPending(false);
      return;
    }

    setIsPending(false);
    onOpenChange(false);
    onAuthenticated();
    router.refresh();
  }

  async function handleGithubSignIn() {
    setError(null);
    setIsGithubPending(true);

    const { error: socialSignInError } = await authClient.signIn.social({
      provider: "github",
      callbackURL,
    });

    if (socialSignInError) {
      setError(socialSignInError.message || "Unable to sign in with GitHub");
      setIsGithubPending(false);
    }
  }

  const isActionPending = isPending || isGithubPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border border-slate-200 bg-slate-50 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            {mode === "sign-up" ? "Sign up to publish" : "Sign in to publish"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-700">
            Publishing posts and comments requires a Runbase account.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          onSubmit={handleSubmit}
        >
          {mode === "sign-up" ? (
            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              className="h-10 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              required
            />
          ) : null}

          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="h-10 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            minLength={8}
            className="h-10 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
            required
          />

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <FancyButton.Root
              type="button"
              variant="basic"
              size="small"
              disabled={isActionPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </FancyButton.Root>
            <FancyButton.Root
              type="submit"
              variant="neutral"
              size="small"
              disabled={isActionPending}
            >
              {isPending
                ? mode === "sign-up"
                  ? "Creating..."
                  : "Signing in..."
                : mode === "sign-up"
                  ? "Create account"
                  : "Sign in"}
            </FancyButton.Root>
          </DialogFooter>
        </form>

        <button
          type="button"
          className="text-center text-sm text-slate-700 underline-offset-2 hover:underline"
          onClick={() => {
            setError(null);
            setMode((current) =>
              current === "sign-in" ? "sign-up" : "sign-in",
            );
          }}
        >
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>

        {githubAuthEnabled ? (
          <FancyButton.Root
            type="button"
            variant="basic"
            size="small"
            disabled={isActionPending}
            onClick={handleGithubSignIn}
            className="w-full"
          >
            {isGithubPending ? "Redirecting..." : "Continue with GitHub"}
          </FancyButton.Root>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
