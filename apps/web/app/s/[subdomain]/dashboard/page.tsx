import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import {
  getUserWorkspaceMembershipBySlug,
  getWorkspaceBySlug,
} from "@/lib/workspaces";
import {
  FeedbackDashboardShell,
  getFeedbackSnapshot,
  seedWorkspaceFeedbackDefaults,
} from "~/feedback";
import {
  FEEDBACK_ANON_COOKIE,
  isValidAnonSessionId,
} from "~/feedback/lib/vote-session";

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

  await seedWorkspaceFeedbackDefaults(foundWorkspace.id);

  const cookieStore = await cookies();
  const anonCookie = cookieStore.get(FEEDBACK_ANON_COOKIE)?.value ?? null;
  const snapshot = await getFeedbackSnapshot({
    workspaceId: foundWorkspace.id,
    userId: session.user.id,
    anonSessionId: isValidAnonSessionId(anonCookie) ? anonCookie : null,
  });

  const publicHref = `${protocol}://${foundWorkspace.slug}.${rootDomain}`;
  const dashboardHref = `${publicHref}/dashboard`;
  const signInHref = `${protocol}://${rootDomain}/sign-in?next=${encodeURIComponent(dashboardHref)}`;
  const githubAuthEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );

  return (
    <FeedbackDashboardShell
      mode="dashboard"
      workspaceName={foundWorkspace.name}
      workspaceSlug={`${foundWorkspace.slug}.${rootDomain}`}
      viewerEmail={session.user.email}
      snapshot={snapshot}
      isAuthenticated={true}
      dashboardHref={dashboardHref}
      signInHref={signInHref}
      callbackUrl={dashboardHref}
      githubAuthEnabled={githubAuthEnabled}
      publicHref={publicHref}
    />
  );
}
