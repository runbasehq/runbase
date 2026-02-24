"use client";

import { useEffect } from "react";

import { getSafeAuthRedirect } from "~/auth/lib/safe-auth-redirect";

function isAbsoluteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export default function AuthPopupCallbackPage() {
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const safeNext = getSafeAuthRedirect(currentParams.get("next")) || "/";
    const openerOrigin = currentParams.get("openerOrigin");
    const targetOrigin =
      openerOrigin &&
      getSafeAuthRedirect(`${openerOrigin}/`) &&
      isAbsoluteUrl(openerOrigin)
        ? new URL(openerOrigin).origin
        : window.location.origin;

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "runbase-auth-complete",
          next: safeNext,
        },
        targetOrigin,
      );

      window.close();

      window.setTimeout(() => {
        if (isAbsoluteUrl(safeNext)) {
          window.location.assign(safeNext);
          return;
        }

        window.location.replace(safeNext);
      }, 150);

      return;
    }

    if (isAbsoluteUrl(safeNext)) {
      window.location.assign(safeNext);
      return;
    }

    window.location.replace(safeNext);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6 text-sm text-zinc-600">
      Completing sign in...
    </main>
  );
}
