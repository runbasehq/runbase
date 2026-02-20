import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import {
  getUserWorkspaceMembershipBySlug,
  getWorkspaceBySlug,
} from "@/lib/workspaces";
import {
  dashboardThreads,
  WorkspaceDashboardShell,
} from "~/workspace-dashboard";

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
    <WorkspaceDashboardShell
      workspaceName={foundWorkspace.name}
      workspaceSlug={foundWorkspace.slug}
      viewerEmail={session.user.email}
      threads={dashboardThreads}
    />
  );
}
