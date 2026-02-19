import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import {
  getUserWorkspaceMembershipBySlug,
  getWorkspaceBySlug,
} from "@/lib/workspaces";
import { WorkspaceSignOutButton } from "~/workspace/components/workspace-sign-out-button";

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
    <main className="min-h-screen bg-[#060914] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-[#090d1e] p-6 shadow-[0_30px_60px_-40px_rgba(71,106,255,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-400">Private dashboard</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                {foundWorkspace.name}
              </h1>
              <p className="mt-2 text-sm text-zinc-300">
                Signed in as {session.user.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`${protocol}://${foundWorkspace.slug}.${rootDomain}`}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-white/40"
              >
                View public page
              </Link>
              <WorkspaceSignOutButton />
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-[#0a1126] p-8">
          <h2 className="text-xl font-semibold">Workspace access granted</h2>
          <p className="mt-3 text-zinc-300">
            You are a <span className="font-medium text-white">{membership.role}</span>{" "}
            member of <span className="font-medium text-white">{foundWorkspace.name}</span>.
            Only workspace members can access this dashboard.
          </p>
        </section>
      </div>
    </main>
  );
}
