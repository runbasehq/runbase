import { NextRequest, NextResponse } from "next/server";

import { getAuthRootOrigin } from "~/auth/lib/get-auth-root-origin";
import {
  getPreferredWorkspaceOrigin,
  getSafeServerAuthRedirect,
  getSafeServerOrigin,
  getWorkspaceSlugFromAllowedOrigin,
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
  const nextParam = request.nextUrl.searchParams.get("next");
  const returnToParam = request.nextUrl.searchParams.get("returnTo");
  const typeParam = request.nextUrl.searchParams.get("type");
  const oidParam = request.nextUrl.searchParams.get("oid");
  const openerOriginParam = request.nextUrl.searchParams.get("openerOrigin");

  const safeOpenerOrigin = await getSafeServerOrigin(openerOriginParam);
  const safeReturnTo = await getSafeServerAuthRedirect(returnToParam);
  const safeNext = await getSafeServerAuthRedirect(nextParam);
  const effectiveReturnTo = safeReturnTo || safeNext || "/";

  const openerWorkspaceSlug =
    await getWorkspaceSlugFromAllowedOrigin(safeOpenerOrigin);
  const targetWorkspaceSlug =
    openerWorkspaceSlug ||
    (isAbsoluteUrl(effectiveReturnTo)
      ? await getWorkspaceSlugFromAllowedOrigin(effectiveReturnTo)
      : null);
  const preferredWorkspaceOrigin = targetWorkspaceSlug
    ? await getPreferredWorkspaceOrigin(targetWorkspaceSlug)
    : null;

  const absoluteReturnTo = isAbsoluteUrl(effectiveReturnTo)
    ? (() => {
        const parsed = new URL(effectiveReturnTo);
        if (!preferredWorkspaceOrigin) {
          return parsed.toString();
        }

        return new URL(
          `${parsed.pathname}${parsed.search}${parsed.hash}`,
          preferredWorkspaceOrigin,
        ).toString();
      })()
    : new URL(
        effectiveReturnTo,
        preferredWorkspaceOrigin || safeOpenerOrigin || authRootOrigin,
      ).toString();

  const callbackUrl = new URL("/oauth/loading", authRootOrigin);
  callbackUrl.searchParams.set("returnTo", absoluteReturnTo);
  callbackUrl.searchParams.set("next", absoluteReturnTo);
  if (typeParam) {
    callbackUrl.searchParams.set("type", typeParam);
  }
  if (oidParam) {
    callbackUrl.searchParams.set("oid", oidParam);
  }
  if (safeOpenerOrigin) {
    callbackUrl.searchParams.set("openerOrigin", safeOpenerOrigin);
  }

  const authStartUrl = new URL("/api/auth/sign-in/social", authRootOrigin);
  const incomingCookies = request.headers.get("cookie");
  const startResponse = await fetch(authStartUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(incomingCookies ? { cookie: incomingCookies } : {}),
    },
    body: JSON.stringify({
      provider,
      callbackURL: callbackUrl.toString(),
      disableRedirect: true,
    }),
    redirect: "manual",
  });

  const redirectLocation = startResponse.headers.get("location");
  const payload = (await startResponse.json().catch(() => null)) as unknown;
  const providerUrl =
    readProviderRedirectUrl(payload) ||
    (typeof redirectLocation === "string" && redirectLocation.length > 0
      ? redirectLocation
      : null);

  if (!providerUrl) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const response = NextResponse.redirect(
    toAbsoluteProviderUrl(providerUrl, authRootOrigin),
  );
  const setCookies = (
    startResponse.headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie?.();

  if (setCookies?.length) {
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
