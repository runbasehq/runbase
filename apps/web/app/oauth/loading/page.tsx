"use client";

import { useEffect } from "react";
import { getSafeOrigin, isAbsoluteUrl } from "~/auth/lib/url";

function getSafeClientTarget(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("/")) {
    return value.startsWith("//") ? null : value;
  }

  try {
    const parsed = new URL(value);
    if (!isAbsoluteUrl(parsed.toString())) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export default function OAuthLoadingPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const safeReturnTo =
      getSafeClientTarget(params.get("returnTo")) ||
      getSafeClientTarget(params.get("next")) ||
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
