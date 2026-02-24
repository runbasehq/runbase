import { notFound } from "next/navigation";

import { PublicFeedbackPage } from "~/feedback/components/public-feedback-page";
import { getPublicFeedbackPageData } from "~/feedback/server/get-public-feedback-page-data";

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
      initialPosts={pageData.initialPosts}
      isAuthenticated={pageData.isAuthenticated}
      githubAuthEnabled={pageData.githubAuthEnabled}
      defaultBoard={pageData.defaultBoard}
      defaultStatus={pageData.defaultStatus}
      initialSelectedPostId={postId}
    />
  );
}
