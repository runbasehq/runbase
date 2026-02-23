import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { defaultKeywords } from "@/lib/seo";
import { rootDomain } from "@/lib/utils";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { DashboardDomainManager } from "~/dashboard/components/dashboard-domain-manager";
import { loadDomainsForWorkspace } from "~/domains/lib/load-domains.server";
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

  const title = `${foundWorkspace.name} Dashboard`;
  const description = `Private dashboard for ${foundWorkspace.slug}.${rootDomain}`;

  return {
    title,
    description,
    keywords: [...defaultKeywords, `${foundWorkspace.name} dashboard`],
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const foundWorkspace = await getWorkspaceBySlug(subdomain);

  if (!foundWorkspace) {
    notFound();
  }

  const initialDomains = await loadDomainsForWorkspace(foundWorkspace.slug);

  return (
    <FeedbackResetPlaceholder
      mode="dashboard"
      workspaceName={foundWorkspace.name}
    >
      <div className="px-0 py-0">
        <DashboardDomainManager initialDomains={initialDomains} />
      </div>
    </FeedbackResetPlaceholder>
  );
}
