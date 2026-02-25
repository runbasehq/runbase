import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { defaultKeywords } from "@/lib/seo";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { protocol, rootDomain } from "@/lib/utils";
import { PublicFeedbackPage } from "~/feedback/components/public-feedback-page";
import { getPublicFeedbackPageData } from "~/feedback/server/get-public-feedback-page-data";
import { getCachedPublicWorkspaceTheme } from "~/workspace-theme/server/workspace-theme-cache";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string; postId: string }>;
}): Promise<Metadata> {
  const { subdomain, postId } = await params;
  const foundWorkspace = await getWorkspaceBySlug(subdomain);

  if (!foundWorkspace) {
    return { title: rootDomain };
  }

  const workspaceTheme = await getCachedPublicWorkspaceTheme(
    foundWorkspace.slug,
  );
  const faviconUrl = workspaceTheme.logoUrl;
  const workspaceUrl = `${protocol}://${foundWorkspace.slug}.${rootDomain}/p/${postId}`;
  const title = `${foundWorkspace.name} Feedback`;

  return {
    title,
    description: `Feedback post on ${foundWorkspace.name}`,
    alternates: {
      canonical: workspaceUrl,
    },
    icons: faviconUrl
      ? {
          icon: [{ url: faviconUrl }],
          shortcut: [{ url: faviconUrl }],
          apple: [{ url: faviconUrl }],
        }
      : undefined,
    keywords: [...defaultKeywords, `${foundWorkspace.name} feedback post`],
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function WorkspacePublicPostPage({
  params,
}: {
  params: Promise<{ subdomain: string; postId: string }>;
}) {
  const { subdomain, postId } = await params;
  const pageData = await getPublicFeedbackPageData(subdomain);

  if (!pageData) {
    notFound();
  }

  return (
    <PublicFeedbackPage
      workspaceSlug={pageData.workspaceSlug}
      workspaceName={pageData.workspaceName}
      workspaceTheme={pageData.workspaceTheme}
      initialPosts={pageData.initialPosts}
      isAuthenticated={pageData.isAuthenticated}
      isWorkspaceMember={pageData.isWorkspaceMember}
      viewer={pageData.viewer}
      isWorkspaceOwner={pageData.isWorkspaceOwner}
      githubAuthEnabled={pageData.githubAuthEnabled}
      defaultBoard={pageData.defaultBoard}
      defaultStatus={pageData.defaultStatus}
      tags={pageData.tags}
      settings={pageData.settings}
      initialSelectedPostId={postId}
    />
  );
}
