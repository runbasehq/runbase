"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
import { getSafeAuthRedirect } from "~/auth/lib/safe-auth-redirect";
import { startSocialPopupSignIn } from "~/auth/lib/start-social-popup-sign-in";

interface FeedbackAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  githubAuthEnabled: boolean;
  onAuthenticated: () => void;
}

export function FeedbackAuthModal({
  open,
  onOpenChange,
  githubAuthEnabled,
  onAuthenticated,
}: FeedbackAuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGithubPending, setIsGithubPending] = useState(false);

  useEffect(() => {
    function handleAuthComplete(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data as { type?: string; next?: string } | null;
      if (payload?.type !== "runbase-auth-complete") {
        return;
      }

      const nextTarget =
        getSafeAuthRedirect(
          typeof payload.next === "string" ? payload.next : null,
        ) || "/";

      setIsGithubPending(false);
      onOpenChange(false);
      onAuthenticated();

      if (
        nextTarget.startsWith("http://") ||
        nextTarget.startsWith("https://")
      ) {
        window.location.assign(nextTarget);
        return;
      }

      router.replace(nextTarget);
      router.refresh();
    }

    window.addEventListener("message", handleAuthComplete);
    return () => window.removeEventListener("message", handleAuthComplete);
  }, [onAuthenticated, onOpenChange, router]);

  function getAuthCallbackPath() {
    if (typeof window === "undefined") {
      return "/";
    }

    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    return getSafeAuthRedirect(currentPath) || "/";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const callbackURL = getAuthCallbackPath();

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
    const result = await startSocialPopupSignIn({
      provider: "github",
      nextTarget: getAuthCallbackPath(),
    });

    if (result.error) {
      setError(result.error || "Unable to sign in with GitHub");
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
