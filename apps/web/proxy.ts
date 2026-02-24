import { NextRequest, NextResponse } from "next/server";

import { protocol, rootDomain } from "@/lib/utils";
import { resolveWorkspaceSlugFromHeaders } from "~/domains/lib/host-routing";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const workspaceSlug = await resolveWorkspaceSlugFromHeaders(request.headers);
  const isOAuthProviderPath =
    pathname.startsWith("/oauth/") && pathname !== "/oauth/loading";

  if (workspaceSlug) {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(`${protocol}://${rootDomain}`);
    }

    if (pathname === "/loading") {
      return NextResponse.next();
    }

    if (pathname === "/oauth/loading") {
      return NextResponse.next();
    }

    if (
      isOAuthProviderPath ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/accept-invite")
    ) {
      const redirectUrl = new URL(request.url);
      redirectUrl.hostname = rootDomain.split(":")[0] || redirectUrl.hostname;

      if (rootDomain.includes(":")) {
        redirectUrl.port = rootDomain.split(":")[1] || redirectUrl.port;
      } else {
        redirectUrl.port = "";
      }

      if (
        pathname.startsWith("/sign-in") &&
        !redirectUrl.searchParams.has("next")
      ) {
        const compactNext = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        redirectUrl.searchParams.set(
          "next",
          compactNext.length > 1024 ? "/" : compactNext,
        );
      }

      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/s/")) {
      return NextResponse.next();
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      pathname === "/"
        ? `/s/${workspaceSlug}`
        : `/s/${workspaceSlug}${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|[\\w-]+\\.\\w+).*)"],
};
