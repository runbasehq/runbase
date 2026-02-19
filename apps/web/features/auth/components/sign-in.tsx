"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { type AuthMode, validateSignInInput } from "~/auth/schemas/sign-in";

function toSafePath(path: string | null): string {
  if (!path) {
    return "/admin";
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/admin";
  }

  return path;
}

export function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => toSafePath(searchParams.get("next")),
    [searchParams],
  );

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

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

    if (mode === "sign-up") {
      const { error: signUpError } = await authClient.signUp.email({
        name: cleanName,
        email: cleanEmail,
        password,
        callbackURL: nextPath,
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
        callbackURL: nextPath,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        setIsPending(false);
        return;
      }
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {mode === "sign-up" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-500"
            placeholder="Jane Doe"
          />
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-500"
          placeholder="you@example.com"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-500"
          placeholder="••••••••"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending
          ? mode === "sign-up"
            ? "Creating account..."
            : "Signing in..."
          : mode === "sign-up"
            ? "Create account"
            : "Sign in"}
      </button>

      <button
        type="button"
        onClick={() =>
          setMode((currentMode) =>
            currentMode === "sign-in" ? "sign-up" : "sign-in",
          )
        }
        className="w-full text-sm text-zinc-600 underline-offset-2 hover:underline"
      >
        {mode === "sign-in"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
