"use client";

import { useEffect } from "react";

import { getSafeAuthRedirect } from "~/auth/lib/safe-auth-redirect";

function isAbsoluteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function getSafeOrigin(value: string | null) {
  if (!value || !isAbsoluteUrl(value)) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return getSafeAuthRedirect(`${parsed.origin}/`) ? parsed.origin : null;
  } catch {
    return null;
  }
}

export default function OAuthLoadingPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const safeReturnTo =
      getSafeAuthRedirect(params.get("returnTo"), {
        allowExternal: true,
      }) ||
      getSafeAuthRedirect(params.get("next")) ||
      "/";
    const safeOpenerOrigin = getSafeOrigin(params.get("openerOrigin"));
    const type = params.get("type");
    const oid = params.get("oid");

    if (window.opener && !window.opener.closed && safeOpenerOrigin) {
      window.opener.postMessage(
        {
          type: "runbase-auth-complete",
          refreshOnly: true,
          returnTo: safeReturnTo,
          ...(type ? { authType: type } : {}),
          ...(oid ? { oid } : {}),
        },
        safeOpenerOrigin,
      );

      window.close();

      window.setTimeout(() => {
        if (window.closed) {
          return;
        }

        if (isAbsoluteUrl(safeReturnTo)) {
          window.location.assign(safeReturnTo);
          return;
        }

        window.location.replace(safeReturnTo);
      }, 150);

      return;
    }

    if (isAbsoluteUrl(safeReturnTo)) {
      window.location.assign(safeReturnTo);
      return;
    }

    window.location.replace(safeReturnTo);
  }, []);

  return <main className="min-h-screen bg-background" aria-hidden />;
}
