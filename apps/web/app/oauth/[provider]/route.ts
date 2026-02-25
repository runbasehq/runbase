import { NextRequest, NextResponse } from "next/server";

import { getAuthRootOrigin } from "~/auth/lib/get-auth-root-origin";
import {
  getSafeServerAuthRedirect,
  getSafeServerOrigin,
} from "~/auth/lib/safe-auth-redirect.server";
import { isAbsoluteUrl } from "~/auth/lib/url";

type SocialProvider = "google" | "github";

function isSocialProvider(value: string): value is SocialProvider {
  return value === "google" || value === "github";
}

function toAbsoluteProviderUrl(value: string, authRootOrigin: string) {
  if (isAbsoluteUrl(value)) {
    return value;
  }

  return new URL(value, authRootOrigin).toString();
}

function readProviderRedirectUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as { url?: unknown; data?: unknown };
  if (typeof root.url === "string" && root.url.length > 0) {
    return root.url;
  }

  if (!root.data || typeof root.data !== "object") {
    return null;
  }

  const data = root.data as { url?: unknown };
  if (typeof data.url === "string" && data.url.length > 0) {
    return data.url;
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!isSocialProvider(provider)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const authRootOrigin = getAuthRootOrigin();
  const openerOriginParam = request.nextUrl.searchParams.get("openerOrigin");
  const authStateParam = request.nextUrl.searchParams.get("authState");
  const nextParam = request.nextUrl.searchParams.get("next");
  const returnToParam = request.nextUrl.searchParams.get("returnTo");
  const typeParam = request.nextUrl.searchParams.get("type");
  const oidParam = request.nextUrl.searchParams.get("oid");

  const safeOpenerOrigin = await getSafeServerOrigin(openerOriginParam);
  if (!safeOpenerOrigin) {
    return NextResponse.redirect(new URL("/sign-in", authRootOrigin));
  }

  const safeNext = await getSafeServerAuthRedirect(returnToParam || nextParam);
  const effectiveNext = safeNext || "/";

  // Build session-transfer/init URL as the callbackURL for better-auth.
  // After OAuth completes, better-auth redirects the popup here (on root domain).
  const initUrl = new URL("/api/auth/session-transfer/init", authRootOrigin);
  initUrl.searchParams.set("target", safeOpenerOrigin);
  if (authStateParam) {
    initUrl.searchParams.set("authState", authStateParam);
  }
  initUrl.searchParams.set("next", effectiveNext);
  if (typeParam) {
    initUrl.searchParams.set("type", typeParam);
  }
  if (oidParam) {
    initUrl.searchParams.set("oid", oidParam);
  }

  // Server-side signIn.social to get provider redirect URL
  const authStartUrl = new URL("/api/auth/sign-in/social", authRootOrigin);
  const incomingCookies = request.headers.get("cookie");

  const startResponse = await fetch(authStartUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: authRootOrigin,
      referer: `${authRootOrigin}/oauth/${provider}`,
      ...(incomingCookies ? { cookie: incomingCookies } : {}),
    },
    body: JSON.stringify({
      provider,
      callbackURL: initUrl.toString(),
      disableRedirect: true,
    }),
    redirect: "manual",
  });

  if (startResponse.status >= 400) {
    return NextResponse.redirect(
      new URL("/sign-in?error=auth_start_failed", authRootOrigin),
    );
  }

  // Extract provider URL from response
  const redirectLocation = startResponse.headers.get("location");
  const payload = (await startResponse.json().catch(() => null)) as unknown;
  const providerUrl =
    readProviderRedirectUrl(payload) ||
    (typeof redirectLocation === "string" && redirectLocation.length > 0
      ? redirectLocation
      : null);

  if (!providerUrl) {
    return NextResponse.redirect(
      new URL("/sign-in?error=provider_url_missing", authRootOrigin),
    );
  }

  // Redirect popup to provider, forwarding set-cookie headers (OAuth state cookie)
  const response = NextResponse.redirect(
    toAbsoluteProviderUrl(providerUrl, authRootOrigin),
  );

  const setCookies =
    (
      startResponse.headers as Headers & {
        getSetCookie?: () => string[];
      }
    ).getSetCookie?.() || [];

  if (setCookies.length) {
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }
  } else {
    const rawSetCookie = startResponse.headers.get("set-cookie");
    if (rawSetCookie) {
      response.headers.set("set-cookie", rawSetCookie);
    }
  }

  return response;
}
