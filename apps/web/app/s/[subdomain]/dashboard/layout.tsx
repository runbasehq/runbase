import { Effect } from "effect";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { protocol, rootDomain } from "@/lib/utils";
import {
  getUserWorkspaceMembershipBySlug,
  getWorkspaceBySlug,
} from "@/lib/workspaces";
import { DashboardRuntimeProvider } from "~/dashboard/components/dashboard-runtime-context";
import { DashboardShell } from "~/dashboard/components/dashboard-shell";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

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

  const membershipsProgram =
    WorkspaceMembersService.listWorkspaceMembershipsForUser({
      userId: session.user.id,
    }).pipe(
      Effect.match({
        onSuccess: (workspaceMemberships) => workspaceMemberships,
        onFailure: (error) => {
          console.error("Failed to list user workspace memberships", error);
          return [];
        },
      }),
    );

  const memberships = await appRuntime.runPromise(membershipsProgram);

  return (
    <DashboardRuntimeProvider
      value={{
        canManageDomains: membership.role === "admin",
        workspaceName: foundWorkspace.name,
        workspaceSlug: foundWorkspace.slug,
      }}
    >
      <DashboardShell
        organizationName={foundWorkspace.name}
        workspaces={memberships.map((currentMembership) => ({
          connectedDomain: currentMembership.connectedDomain,
          name: currentMembership.workspaceName,
          role: currentMembership.role,
          slug: currentMembership.workspaceSlug,
        }))}
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
