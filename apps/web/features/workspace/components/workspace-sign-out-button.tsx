"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { protocol, rootDomain } from "@/lib/utils";

export function WorkspaceSignOutButton() {
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
        className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-white/40 disabled:opacity-60"
      >
        {isPending ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
