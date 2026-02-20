import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { protocol, rootDomain } from "@/lib/utils";
import { FeedbackDashboardShell } from "~/feedback/components/feedback-dashboard-shell";
import {
  getFeedbackSnapshot,
  seedWorkspaceFeedbackDefaults,
} from "~/feedback/lib/queries";
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

  await seedWorkspaceFeedbackDefaults(foundWorkspace.id);

  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const anonCookie = cookieStore.get(FEEDBACK_ANON_COOKIE)?.value ?? null;

  const snapshot = await getFeedbackSnapshot({
    workspaceId: foundWorkspace.id,
    userId: session?.user?.id ?? null,
    anonSessionId: isValidAnonSessionId(anonCookie) ? anonCookie : null,
  });

  const publicHref = `${protocol}://${foundWorkspace.slug}.${rootDomain}`;
  const dashboardHref = `${publicHref}/dashboard`;
  const signInHref = `${protocol}://${rootDomain}/sign-in?next=${encodeURIComponent(publicHref)}`;
  const githubAuthEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );

  return (
    <FeedbackDashboardShell
      mode="public"
      workspaceName={foundWorkspace.name}
      workspaceSlug={`${foundWorkspace.slug}.${rootDomain}`}
      snapshot={snapshot}
      isAuthenticated={Boolean(session?.user)}
      dashboardHref={dashboardHref}
      signInHref={signInHref}
      callbackUrl={publicHref}
      githubAuthEnabled={githubAuthEnabled}
      publicHref={publicHref}
    />
  );
}
