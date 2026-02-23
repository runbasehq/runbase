import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { defaultKeywords } from "@/lib/seo";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { protocol, rootDomain } from "@/lib/utils";
import { FeedbackResetPlaceholder } from "~/feedback/components/feedback-reset-placeholder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const foundWorkspace = await getWorkspaceBySlug(subdomain);

  if (!foundWorkspace) {
    return { title: rootDomain };
  }

  const workspaceUrl = `${protocol}://${foundWorkspace.slug}.${rootDomain}`;
  const title = `${foundWorkspace.name} Feedback`;
  const description = `Public feedback board for ${foundWorkspace.name}. Share ideas, vote on roadmap priorities, and follow product updates.`;

  return {
    title,
    description,
    alternates: {
      canonical: workspaceUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Runbase",
      title,
      description,
      url: workspaceUrl,
      images: [
        {
          url: "/feedback.webp",
          width: 1600,
          height: 900,
          alt: `${foundWorkspace.name} public feedback board`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/feedback.webp"],
    },
    keywords: [...defaultKeywords, `${foundWorkspace.name} feedback board`],
    robots: {
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

export default async function WorkspacePublicPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const foundWorkspace = await getWorkspaceBySlug(subdomain);

  if (!foundWorkspace) {
    notFound();
  }

  return (
    <FeedbackResetPlaceholder
      mode="public"
      workspaceName={foundWorkspace.name}
    />
  );
}
