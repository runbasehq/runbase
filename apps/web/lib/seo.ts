import type { Metadata } from "next";

import { protocol, rootDomain } from "@/lib/utils";

export const siteName = "Runbase";
export const siteTitle =
  "Runbase | Collect feedback, prioritize roadmap, and ship changelog updates";
export const siteDescription =
  "Runbase gives product teams one workflow to collect feedback, prioritize roadmap, and publish changelog updates without per-seat complexity.";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  process.env.BETTER_AUTH_URL ??
  `${protocol}://${rootDomain}`;

export const siteUrl = configuredSiteUrl.replace(/\/+$/, "");

export const defaultKeywords = [
  "feedback management platform",
  "featurebase alternative",
  "open source featurebase alternative",
  "product feedback tool",
  "customer feedback workflow",
  "feedback tool without seat pricing",
  "roadmap prioritization",
  "changelog publishing",
  "feature request tracking",
  "product management software",
  "support inbox",
  "public feedback board",
  "runbase",
] as const;

const defaultOpenGraphImage = {
  url: "/feedback.webp",
  width: 1600,
  height: 900,
  alt: "Runbase feedback workflow platform",
} as const;

export function toAbsoluteUrl(path: string = "/") {
  return new URL(path, `${siteUrl}/`).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  keywords = defaultKeywords,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    keywords: [...keywords],
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName,
      title,
      description,
      url: toAbsoluteUrl(path),
      images: [defaultOpenGraphImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOpenGraphImage.url],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}
