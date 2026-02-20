import { NextRequest, NextResponse } from "next/server";

import { extractSubdomainFromHeaders } from "@/lib/subdomains";
import { protocol, rootDomain } from "@/lib/utils";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomainFromHeaders(request.headers);

  if (subdomain) {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(`${protocol}://${rootDomain}`);
    }

    if (pathname.startsWith("/sign-in") || pathname.startsWith("/onboarding")) {
      const redirectUrl = new URL(request.url);
      redirectUrl.hostname = rootDomain.split(":")[0] || redirectUrl.hostname;

      if (rootDomain.includes(":")) {
        redirectUrl.port = rootDomain.split(":")[1] || redirectUrl.port;
      } else {
        redirectUrl.port = "";
      }

      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/s/")) {
      return NextResponse.next();
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      pathname === "/" ? `/s/${subdomain}` : `/s/${subdomain}${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|[\\w-]+\\.\\w+).*)"],
};
