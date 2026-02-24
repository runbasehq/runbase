import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { defaultKeywords } from "@/lib/seo";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { protocol, rootDomain } from "@/lib/utils";
import { PublicFeedbackPage } from "~/feedback/components/public-feedback-page";
import { getPublicFeedbackPageData } from "~/feedback/server/get-public-feedback-page-data";

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
  const pageData = await getPublicFeedbackPageData(subdomain);
  if (!pageData) {
    notFound();
  }

  return (
    <PublicFeedbackPage
      workspaceSlug={pageData.workspaceSlug}
      workspaceName={pageData.workspaceName}
      initialPosts={pageData.initialPosts}
      isAuthenticated={pageData.isAuthenticated}
      viewer={pageData.viewer}
      isWorkspaceOwner={pageData.isWorkspaceOwner}
      githubAuthEnabled={pageData.githubAuthEnabled}
      defaultBoard={pageData.defaultBoard}
      defaultStatus={pageData.defaultStatus}
    />
  );
}
