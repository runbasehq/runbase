import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { rootDomain } from "@/lib/utils";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { DashboardDomainManager } from "~/dashboard/components/dashboard-domain-manager";
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
    title: `${foundWorkspace.name} Dashboard`,
    description: `Private dashboard for ${foundWorkspace.slug}.${rootDomain}`,
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

  return (
    <FeedbackResetPlaceholder
      mode="dashboard"
      workspaceName={foundWorkspace.name}
    >
      <div className="px-0 py-0">
        <DashboardDomainManager />
      </div>
    </FeedbackResetPlaceholder>
  );
}
