"use client";

import { useEffect } from "react";

import { isAbsoluteUrl } from "~/auth/lib/url";

interface OAuthLoadingClientProps {
  returnTo: string;
  openerOrigin: string | null;
  authType: string | null;
  oid: string | null;
}

export function OAuthLoadingClient({
  returnTo,
  openerOrigin,
  authType,
  oid,
}: OAuthLoadingClientProps) {
  useEffect(() => {
    if (window.opener && !window.opener.closed && openerOrigin) {
      window.opener.postMessage(
        {
          type: "runbase-auth-complete",
          refreshOnly: true,
          returnTo,
          ...(authType ? { authType } : {}),
          ...(oid ? { oid } : {}),
        },
        openerOrigin,
      );

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

    if (isAbsoluteUrl(returnTo)) {
      window.location.assign(returnTo);
      return;
    }

    window.location.replace(returnTo);
  }, [authType, oid, openerOrigin, returnTo]);

  return <main className="min-h-screen bg-background" aria-hidden />;
}
