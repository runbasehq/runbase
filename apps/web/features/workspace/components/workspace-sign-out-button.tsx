"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { protocol, rootDomain } from "@/lib/utils";

export function WorkspaceSignOutButton({
  className,
  errorClassName,
  label = "Sign out",
}: {
  className?: string;
  errorClassName?: string;
  label?: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsPending(true);
    setError(null);

    const { error: signOutError } = await authClient.signOut();

    if (signOutError) {
      setError(signOutError.message || "Unable to sign out");
      setIsPending(false);
      return;
    }

    window.location.assign(`${protocol}://${rootDomain}/sign-in`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className={cn(
          "inline-flex items-center rounded-(--r-sm) border border-(--border) bg-(--surface) px-3 py-1.5 text-sm text-(--text) transition-colors hover:bg-(--surface-2) disabled:opacity-60",
          className,
        )}
      >
        {isPending ? "Signing out..." : label}
      </button>
      {error ? (
        <p className={cn("text-xs text-(--danger)", errorClassName)}>{error}</p>
      ) : null}
    </div>
  );
}
