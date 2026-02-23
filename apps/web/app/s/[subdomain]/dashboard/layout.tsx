import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import {
  getUserWorkspaceMembershipBySlug,
  getWorkspaceBySlug,
} from "@/lib/workspaces";
import { DashboardRuntimeProvider } from "~/dashboard/components/dashboard-runtime-context";
import { DashboardShell } from "~/dashboard/components/dashboard-shell";

export default async function WorkspaceDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    <DashboardRuntimeProvider
      value={{
        canManageDomains: membership.role === "owner",
        workspaceName: foundWorkspace.name,
        workspaceSlug: foundWorkspace.slug,
      }}
    >
      <DashboardShell
        organizationName={foundWorkspace.name}
        user={{
          email: session.user.email,
          image: session.user.image,
          name: session.user.name,
        }}
      >
        {children}
      </DashboardShell>
    </DashboardRuntimeProvider>
  );
}
