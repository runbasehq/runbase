import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

const disallowPaths = [
  "/admin",
  "/api/",
  "/onboarding",
  "/onboarding/complete",
  "/sign-in",
  "/sign-up",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowPaths,
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot"],
        allow: ["/", "/about-us", "/legal", "/terms-and-conditions", "/privacy-policy"],
        disallow: disallowPaths,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
