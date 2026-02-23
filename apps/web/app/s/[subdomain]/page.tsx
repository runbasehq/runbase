import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getWorkspaceBySlug } from "@/lib/workspaces";
import { rootDomain } from "@/lib/utils";
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

  return {
    title: `${foundWorkspace.name} Feedback | ${foundWorkspace.slug}.${rootDomain}`,
    description: `Public feedback board for ${foundWorkspace.slug}.${rootDomain}`,
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
