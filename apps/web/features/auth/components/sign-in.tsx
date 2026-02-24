"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { type AuthMode, validateSignInInput } from "~/auth/schemas/sign-in";
import { getAuthRootOrigin } from "~/auth/lib/get-auth-root-origin";
import { consumePendingPopupAuthState } from "~/auth/lib/popup-auth-state";
import { getSafeAuthRedirect } from "~/auth/lib/safe-auth-redirect";
import { startSocialPopupSignIn } from "~/auth/lib/start-social-popup-sign-in";
import { isAbsoluteUrl } from "~/auth/lib/url";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";

function buildAuthHref({
  pathname,
  nextPath,
  companyName,
}: {
  pathname: "/sign-in" | "/sign-up";
  nextPath: string;
  companyName?: string;
}) {
  const params = new URLSearchParams();

  if (nextPath) {
    params.set("next", nextPath);
  }

  const normalizedCompanyName = normalizeCompanyName(companyName ?? "");
  if (normalizedCompanyName) {
    params.set("companyName", normalizedCompanyName);
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function SignIn({
  githubAuthEnabled,
  googleAuthEnabled,
  mode,
}: {
  githubAuthEnabled: boolean;
  googleAuthEnabled: boolean;
  mode: AuthMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => getSafeAuthRedirect(searchParams.get("next")) || "/sign-up",
    [searchParams],
  );
  const companyNameFromQuery = useMemo(
    () => normalizeCompanyName(searchParams.get("companyName") ?? ""),
    [searchParams],
  );
  const lastLoginMethod = useMemo(
    () => authClient.getLastUsedLoginMethod?.() ?? null,
    [],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isActionPending = isPending;

  useEffect(() => {
    const authRootOrigin = getAuthRootOrigin();
    const trustedOrigins = new Set([window.location.origin, authRootOrigin]);

    function handleAuthComplete(event: MessageEvent) {
      if (!trustedOrigins.has(event.origin)) {
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

  const signInHref = useMemo(
    () =>
      buildAuthHref({
        pathname: "/sign-in",
        nextPath,
        companyName: companyNameFromQuery,
      }),
    [companyNameFromQuery, nextPath],
  );
  const signUpHref = useMemo(
    () =>
      buildAuthHref({
        pathname: "/sign-up",
        nextPath,
        companyName: companyNameFromQuery,
      }),
    [companyNameFromQuery, nextPath],
  );
  const lastUsedBadgeClassName =
    "rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-black/70";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formInput = {
      mode,
      name,
      email,
      password,
    };
    const validationError = validateSignInInput(formInput);

    if (validationError) {
      setError(validationError);
      setIsPending(false);
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    let targetPath = nextPath;

    if (mode === "sign-up") {
      const signUpParams = new URLSearchParams({
        allowExistingMembership: "1",
      });

      if (companyNameFromQuery) {
        signUpParams.set("companyName", companyNameFromQuery);
      }

      targetPath = `/sign-up?${signUpParams.toString()}`;

      const { error: signUpError } = await authClient.signUp.email({
        name: cleanName,
        email: cleanEmail,
        password,
        callbackURL: targetPath,
      });

      if (signUpError) {
        setError(signUpError.message || "Unable to sign up");
        setIsPending(false);
        return;
      }
    } else {
      const { error: signInError } = await authClient.signIn.email({
        email: cleanEmail,
        password,
        callbackURL: targetPath,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        setIsPending(false);
        return;
      }
    }

    if (isAbsoluteUrl(targetPath)) {
      window.location.assign(targetPath);
      return;
    }

    router.replace(targetPath);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);

    const result = await startSocialPopupSignIn({
      provider: "google",
      nextTarget: nextPath,
    });

    if (result.error) {
      setError(result.error || "Unable to sign in with Google");
    }
  }

  async function handleGithubSignIn() {
    setError(null);

    const result = await startSocialPopupSignIn({
      provider: "github",
      nextTarget: nextPath,
    });

    if (result.error) {
      setError(result.error || "Unable to sign in with GitHub");
    }
  }

  if (mode === "sign-up") {
    return (
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-zinc-950">
            Create your account
          </h1>
          <p className="text-sm text-zinc-500">
            Continue to set up your workspace after signup.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Name</span>
          <Input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="h-11 rounded-xl border-zinc-300 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500"
            placeholder="Jane Doe"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="h-11 rounded-xl border-zinc-300 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500"
            placeholder="Enter your email address"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="h-11 rounded-xl border-zinc-300 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500"
            placeholder="Enter a unique password"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <FancyButton.Root
          type="submit"
          variant="neutral"
          size="medium"
          disabled={isActionPending}
          className="w-full"
        >
          {isPending ? "Creating..." : "Create account"}
        </FancyButton.Root>

        <p className="w-full text-center text-sm font-medium text-zinc-500">
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="text-blue-600 transition-colors hover:text-blue-700"
          >
            Sign in
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-zinc-950 sm:text-[30px]">
          <span className="inline-flex items-center gap-2.5 align-middle">
            <span className="leading-none">Log in to</span>
            <RunbaseLogo className="h-[0.92em] w-auto shrink-0 translate-y-px text-zinc-950" />
          </span>
        </h1>
        <p className="text-base text-zinc-500">Connect with Runbase with:</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!googleAuthEnabled || isActionPending}
          className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100/80 disabled:text-zinc-500"
        >
          <Image
            src="/icons/google.svg"
            alt=""
            aria-hidden
            width={16}
            height={16}
            className="h-4 w-4"
          />
          Google
          {lastLoginMethod === "google" ? (
            <span className={lastUsedBadgeClassName}>Last used</span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={handleGithubSignIn}
          disabled={!githubAuthEnabled || isActionPending}
          className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100/80 disabled:text-zinc-500"
        >
          <Image
            src="/icons/github.svg"
            alt=""
            aria-hidden
            width={20}
            height={20}
            className="h-5 w-5"
          />
          GitHub
          {lastLoginMethod === "github" ? (
            <span className={lastUsedBadgeClassName}>Last used</span>
          ) : null}
        </button>
      </div>

      <div className="flex items-center gap-3 py-0.5">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-[10px] font-medium tracking-[0.08em] text-zinc-500 uppercase">
          Or continue with email
        </span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700">Email</span>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="h-11 rounded-xl border-zinc-300 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500"
          placeholder="Enter your email address"
        />
      </label>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">Password</span>
          <button
            type="button"
            className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            Forgot Password?
          </button>
        </div>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="h-11 rounded-xl border-zinc-300 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500"
          placeholder="Enter a unique password"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <FancyButton.Root
        type="submit"
        variant="neutral"
        size="medium"
        disabled={isActionPending}
        className="w-full"
      >
        {isPending ? "Signing in..." : "Log in"}
      </FancyButton.Root>

      <p className="w-full text-center text-sm font-medium text-zinc-500">
        Need an account?{" "}
        <Link
          href={signUpHref}
          className="text-blue-600 transition-colors hover:text-blue-700"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
