import { NextRequest, NextResponse } from "next/server";

import { protocol, rootDomain } from "@/lib/utils";

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch?.[1]) {
      return fullUrlMatch[1];
    }

    if (hostname.includes(".localhost")) {
      return hostname.split(".")[0];
    }

    return null;
  }

  const rootDomainFormatted = rootDomain.split(":")[0];

  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts[0] || null;
  }

  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);

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
