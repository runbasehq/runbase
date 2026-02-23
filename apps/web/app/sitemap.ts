import type { MetadataRoute } from "next";

import { toAbsoluteUrl } from "@/lib/seo";

const publicRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  {
    path: "/featurebase-alternative",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  { path: "/about-us", changeFrequency: "monthly", priority: 0.8 },
  { path: "/legal", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms-and-conditions", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy-policy", changeFrequency: "monthly", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: toAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
