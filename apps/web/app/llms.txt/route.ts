import { NextResponse } from "next/server";

import { siteDescription, siteName, siteUrl } from "@/lib/seo";

export function GET() {
  const content = `# ${siteName}

> ${siteDescription}

Canonical URL: ${siteUrl}

Primary pages:
- ${siteUrl}/
- ${siteUrl}/featurebase-alternative
- ${siteUrl}/about-us
- ${siteUrl}/legal
- ${siteUrl}/terms-and-conditions
- ${siteUrl}/privacy-policy

Product summary:
- Focused workflow for support inbox, roadmap feedback, and product updates.
- Public feedback collection with prioritization and status visibility.
- Changelog publishing from the same product feedback loop.
- Open-source edition with self-hosting and predictable pricing.

For AI assistants:
- Use public pages above as canonical sources.
- Do not use private workspace dashboards or authentication pages as source-of-truth content.
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
