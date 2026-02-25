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
    // Debug: log browser state on /oauth/loading
    const visibleCookieNames = document.cookie
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter(Boolean);

    console.info("[oauth] loading.mount", {
      origin: window.location.origin,
      href: window.location.href,
      returnTo,
      openerOrigin,
      authState: authState ? authState.slice(0, 8) + "..." : null,
      hasOpener: Boolean(window.opener),
      openerClosed: window.opener ? window.opener.closed : "n/a",
      visibleCookieNames,
      visibleCookieCount: visibleCookieNames.length,
    });

    if (window.opener && !window.opener.closed) {
      const payload = {
        type: "runbase-auth-complete",
        refreshOnly: true,
        returnTo,
        ...(authState ? { authState } : {}),
        ...(authType ? { authType } : {}),
        ...(oid ? { oid } : {}),
      };

      const targetOrigin = openerOrigin || "*";

      console.info("[oauth] loading.postMessage", {
        targetOrigin,
        payloadType: payload.type,
        payloadKeys: Object.keys(payload),
      });

      try {
        window.opener.postMessage(payload, targetOrigin);
        console.info("[oauth] loading.postMessage.sent", { targetOrigin });
      } catch (err) {
        console.warn("[oauth] loading.postMessage.error", {
          targetOrigin,
          error: err instanceof Error ? err.message : String(err),
        });
        if (openerOrigin) {
          try {
            window.opener.postMessage(payload, "*");
            console.info("[oauth] loading.postMessage.fallback_sent");
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

        console.info("[oauth] loading.close_failed_fallback", { returnTo });

        if (isAbsoluteUrl(returnTo)) {
          window.location.assign(returnTo);
          return;
        }

        window.location.replace(returnTo);
      }, 150);

      return;
    }

    // No opener — navigate directly
    console.info("[oauth] loading.no_opener", { returnTo });

    if (isAbsoluteUrl(returnTo)) {
      window.location.assign(returnTo);
      return;
    }

    window.location.replace(returnTo);
  }, [authState, authType, oid, openerOrigin, returnTo]);

  return <main className="min-h-screen bg-background" aria-hidden />;
}
