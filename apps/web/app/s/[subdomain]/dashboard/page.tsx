import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import {
  getUserWorkspaceMembershipBySlug,
  getWorkspaceBySlug,
} from "@/lib/workspaces";
import { CustomDomainManager } from "~/domains/components/custom-domain-manager";
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

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    const nextUrl = `${protocol}://${foundWorkspace.slug}.${rootDomain}/dashboard`;
    redirect(
      `${protocol}://${rootDomain}/sign-in?next=${encodeURIComponent(nextUrl)}`,
    );
  }

  const membership = await getUserWorkspaceMembershipBySlug(
    session.user.id,
    foundWorkspace.slug,
  );

  if (!membership) {
    notFound();
  }

  return (
    <FeedbackResetPlaceholder
      mode="dashboard"
      workspaceName={foundWorkspace.name}
    >
      <div className="px-0 py-0">
        <CustomDomainManager
          workspaceSlug={foundWorkspace.slug}
          canManageDomains={membership.role === "owner"}
        />
      </div>
    </FeedbackResetPlaceholder>
  );
}
