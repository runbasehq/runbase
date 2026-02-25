"use client";

import { useEffect } from "react";

import { isAbsoluteUrl } from "~/auth/lib/url";

interface OAuthLoadingClientProps {
  returnTo: string;
  openerOrigin: string | null;
  authState: string | null;
  authType: string | null;
  oid: string | null;
}

export function OAuthLoadingClient({
  returnTo,
  openerOrigin,
  authState,
  authType,
  oid,
}: OAuthLoadingClientProps) {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      const payload = {
        type: "runbase-auth-complete",
        refreshOnly: true,
        returnTo,
        ...(authState ? { authState } : {}),
        ...(authType ? { authType } : {}),
        ...(oid ? { oid } : {}),
      };

      try {
        window.opener.postMessage(payload, openerOrigin || "*");
      } catch {
        if (openerOrigin) {
          try {
            window.opener.postMessage(payload, "*");
          } catch {
            // ignore and continue fallback navigation
          }
        }
      }

      window.close();

      window.setTimeout(() => {
        if (window.closed) {
          return;
        }

        if (isAbsoluteUrl(returnTo)) {
          window.location.assign(returnTo);
          return;
        }

        window.location.replace(returnTo);
      }, 150);

      return;
    }

    // No opener — navigate directly
    if (isAbsoluteUrl(returnTo)) {
      window.location.assign(returnTo);
      return;
    }

    window.location.replace(returnTo);
  }, [authState, authType, oid, openerOrigin, returnTo]);

  return <main className="min-h-screen bg-background" aria-hidden />;
}
