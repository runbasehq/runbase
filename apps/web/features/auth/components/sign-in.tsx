"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { rootDomain } from "@/lib/utils";
import { type AuthMode, validateSignInInput } from "~/auth/schemas/sign-in";
import {
  normalizeCompanyName,
  validateCreateWorkspaceInput,
} from "~/workspace/schemas/create-workspace";
import { sanitizeWorkspaceSlug } from "~/workspace/schemas/workspace-slug";

type FeedbackAccess = "public" | "private";
type SignUpStep = "goal" | "access" | "account";
type GoalOptionId = (typeof mainGoalOptions)[number]["id"];

const primaryGoal = "capture_manage_feedback" as const;

const mainGoalOptions = [
  {
    id: primaryGoal,
    label: "Capture & manage feedback",
    disabled: false,
  },
  {
    id: "manage_customer_support",
    label: "Manage customer support",
    disabled: true,
  },
  {
    id: "publish_product_updates",
    label: "Publish product updates",
    disabled: true,
  },
  {
    id: "run_surveys",
    label: "Run surveys",
    disabled: true,
  },
  {
    id: "create_help_center",
    label: "Create your help center",
    disabled: true,
  },
] as const;

function toSafeRedirect(target: string | null): string {
  if (!target) {
    return "/onboarding";
  }

  if (target.startsWith("/")) {
    if (target.startsWith("//")) {
      return "/onboarding";
    }

    return target;
  }

  try {
    const parsedUrl = new URL(target);
    const rootHostname = rootDomain.split(":")[0]?.toLowerCase() || "";
    const hostname = parsedUrl.hostname.toLowerCase();
    const isRootDomainHost =
      hostname === rootHostname || hostname.endsWith(`.${rootHostname}`);

    if (isRootDomainHost) {
      return parsedUrl.toString();
    }
  } catch {
    return "/onboarding";
  }

  return "/onboarding";
}

function isAbsoluteUrl(path: string) {
  return path.startsWith("http://") || path.startsWith("https://");
}

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
  mode,
}: {
  githubAuthEnabled: boolean;
  mode: AuthMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => toSafeRedirect(searchParams.get("next")),
    [searchParams],
  );
  const companyNameFromQuery = useMemo(
    () => normalizeCompanyName(searchParams.get("companyName") ?? ""),
    [searchParams],
  );

  const [signUpStep, setSignUpStep] = useState<SignUpStep>("goal");
  const [feedbackAccess, setFeedbackAccess] =
    useState<FeedbackAccess>("public");
  const [selectedGoal, setSelectedGoal] = useState<GoalOptionId>(primaryGoal);
  const [companyName, setCompanyName] = useState(companyNameFromQuery);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGithubPending, setIsGithubPending] = useState(false);
  const isActionPending = isPending || isGithubPending;

  const previewSlug = useMemo(
    () => sanitizeWorkspaceSlug(companyName),
    [companyName],
  );
  const signInHref = useMemo(
    () =>
      buildAuthHref({
        pathname: "/sign-in",
        nextPath,
        companyName: companyName || companyNameFromQuery,
      }),
    [companyName, companyNameFromQuery, nextPath],
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
      const companyNameError = validateCreateWorkspaceInput({ companyName });
      if (companyNameError) {
        setError(companyNameError);
        setIsPending(false);
        return;
      }

      const resolvedPrimaryGoal =
        selectedGoal === primaryGoal ? selectedGoal : primaryGoal;

      const signUpParams = new URLSearchParams({
        companyName: companyName.trim(),
        feedbackAccess,
        primaryGoal: resolvedPrimaryGoal,
      });
      targetPath = `/onboarding/complete?${signUpParams.toString()}`;

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

  async function handleGithubSignIn() {
    setError(null);
    setIsGithubPending(true);

    const { error: socialSignInError } = await authClient.signIn.social({
      provider: "github",
      callbackURL: nextPath,
    });

    if (socialSignInError) {
      setError(socialSignInError.message || "Unable to sign in with GitHub");
      setIsGithubPending(false);
    }
  }

  if (mode === "sign-up") {
    if (signUpStep === "goal") {
      return (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-zinc-950">
              What&apos;s your main goal today?
            </h1>
            <p className="text-sm text-zinc-500">
              Select what you&apos;d like to set up first.
            </p>
          </div>

          <div className="space-y-2">
            {mainGoalOptions.map((option) =>
              (() => {
                const isSelected = selectedGoal === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (!option.disabled) {
                        setSelectedGoal(option.id);
                      }
                    }}
                    disabled={option.disabled}
                    className={`flex h-12 w-full items-center justify-between rounded-[14px] border px-4 text-sm font-medium ${
                      option.disabled
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                        : isSelected
                          ? "border-primary bg-primary/5 text-zinc-950 shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                          : "border-zinc-300 bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary text-[11px] leading-none text-primary">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })(),
            )}
          </div>

          <FancyButton.Root
            type="button"
            variant="neutral"
            size="medium"
            onClick={() => {
              setError(null);
              setSignUpStep("access");
            }}
            className="w-full"
          >
            Continue
          </FancyButton.Root>

          <p className="text-center text-sm font-medium text-zinc-500">
            Already have an account?{" "}
            <Link
              href={signInHref}
              className="text-blue-600 transition-colors hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      );
    }

    if (signUpStep === "access") {
      return (
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-zinc-950">
              Who should have access to your feedback module?
            </h1>
            <p className="text-sm text-zinc-500">
              You can always change this later in settings.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setFeedbackAccess("public")}
              className={`w-full rounded-[14px] border p-4 text-left transition-colors ${
                feedbackAccess === "public"
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <p className="text-base font-medium text-zinc-900">
                Publicly accessible
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Everyone can access your feedback portal page and widgets.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFeedbackAccess("private")}
              className={`w-full rounded-[14px] border p-4 text-left transition-colors ${
                feedbackAccess === "private"
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <p className="text-base font-medium text-zinc-900">
                Manage access privately
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Only selected groups can access the portal and widgets.
              </p>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <FancyButton.Root
              type="button"
              variant="basic"
              size="medium"
              onClick={() => {
                setError(null);
                setSignUpStep("goal");
              }}
              className="w-full"
            >
              Back
            </FancyButton.Root>

            <FancyButton.Root
              type="button"
              variant="neutral"
              size="medium"
              onClick={() => {
                setError(null);
                setSignUpStep("account");
              }}
              className="w-full"
            >
              Continue
            </FancyButton.Root>
          </div>
        </div>
      );
    }

    return (
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h1 className="text-[28px] font-medium leading-none tracking-[-0.02em] text-zinc-950">
            Create your account
          </h1>
          <p className="text-sm text-zinc-500">
            Finish this step to create your workspace.
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
          <span className="text-sm font-medium text-zinc-700">
            Company name
          </span>
          <Input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            required
            className="h-11 rounded-xl border-zinc-300 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500"
            placeholder="Acme"
          />
          <p className="text-xs text-zinc-500">
            Workspace URL:{" "}
            <span className="font-medium text-zinc-700">
              {(previewSlug || "subdomain") + "." + rootDomain}
            </span>
          </p>
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

        <div className="grid grid-cols-2 gap-2.5">
          <FancyButton.Root
            type="button"
            variant="basic"
            size="medium"
            onClick={() => setSignUpStep("access")}
            className="w-full"
          >
            Back
          </FancyButton.Root>

          <FancyButton.Root
            type="submit"
            variant="neutral"
            size="medium"
            disabled={isActionPending}
            className="w-full"
          >
            {isPending ? "Creating..." : "Create account"}
          </FancyButton.Root>
        </div>

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
          disabled
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100/80 text-sm font-medium text-zinc-500"
        >
          <span className="text-sm">G</span>
          Google
        </button>
        <button
          type="button"
          onClick={handleGithubSignIn}
          disabled={!githubAuthEnabled || isActionPending}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100/80 disabled:text-zinc-500"
        >
          <span className="text-sm">GitHub</span>
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
