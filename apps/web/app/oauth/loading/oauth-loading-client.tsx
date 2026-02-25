"use client";

import { useEffect } from "react";

import { rootDomain } from "@/lib/utils";
import { isAbsoluteUrl } from "~/auth/lib/url";

interface OAuthLoadingClientProps {
  returnTo: string;
  openerOrigin: string | null;
  authState: string | null;
  authType: string | null;
  oid: string | null;
  handoffDone: boolean;
}

export function OAuthLoadingClient({
  returnTo,
  openerOrigin,
  authState,
  authType,
  oid,
  handoffDone,
}: OAuthLoadingClientProps) {
  useEffect(() => {
    if (isAbsoluteUrl(returnTo)) {
      try {
        const targetUrl = new URL(returnTo);
        if (targetUrl.origin !== window.location.origin) {
          const currentHost = window.location.hostname.toLowerCase();
          const targetHost = targetUrl.hostname.toLowerCase();
          const rootHost = rootDomain.split(":")[0]?.toLowerCase() || "";

          const isRootFamilyHost = (host: string) =>
            host === rootHost || host.endsWith(`.${rootHost}`);
          const isLocalDevFamilyHost = (host: string) =>
            host === "localhost" ||
            host.endsWith(".localhost") ||
            host === "127.0.0.1" ||
            host === "lvh.me" ||
            host.endsWith(".lvh.me");

          const isRootFamilyCrossOrigin =
            isRootFamilyHost(currentHost) && isRootFamilyHost(targetHost);
          const isLocalDevCrossOrigin =
            isLocalDevFamilyHost(currentHost) &&
            isLocalDevFamilyHost(targetHost);
          const shouldUseHandoff =
            !handoffDone && !isRootFamilyCrossOrigin && !isLocalDevCrossOrigin;

          if (shouldUseHandoff) {
            void (async () => {
              try {
                const response = await fetch("/api/auth/oauth-handoff/start", {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({
                    returnTo,
                    openerOrigin,
                    authState,
                    type: authType,
                    oid,
                  }),
                });

                if (response.ok) {
                  const payload = (await response.json()) as {
                    handoffUrl?: unknown;
                  };

                  if (
                    typeof payload.handoffUrl === "string" &&
                    payload.handoffUrl
                  ) {
                    window.location.replace(payload.handoffUrl);
                    return;
                  }
                }
              } catch {
                // ignore and continue fallback navigation
              }

              window.location.replace(returnTo);
            })();
            return;
          }

          window.location.replace(returnTo);
          return;
        }
      } catch {
        // ignore and continue with normal flow
      }
    }

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

    if (isAbsoluteUrl(returnTo)) {
      window.location.assign(returnTo);
      return;
    }

    window.location.replace(returnTo);
  }, [authState, authType, handoffDone, oid, openerOrigin, returnTo]);

  return <main className="min-h-screen bg-background" aria-hidden />;
}
