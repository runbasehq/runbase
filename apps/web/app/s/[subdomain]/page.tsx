import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getWorkspaceBySlug } from "@/lib/workspaces";
import { protocol, rootDomain } from "@/lib/utils";

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
    title: `${foundWorkspace.name} | ${foundWorkspace.slug}.${rootDomain}`,
    description: `Public workspace page for ${foundWorkspace.slug}.${rootDomain}`,
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
    <main className="min-h-screen bg-[#070a16] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex min-h-[88vh] w-full max-w-4xl flex-col justify-between rounded-3xl border border-white/10 bg-[#090d1e] p-8 shadow-[0_40px_80px_-44px_rgba(61,95,255,0.7)]">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <Link
            href={`${protocol}://${rootDomain}`}
            className="transition-colors hover:text-zinc-200"
          >
            {rootDomain}
          </Link>
          <Link
            href={`${protocol}://${foundWorkspace.slug}.${rootDomain}/dashboard`}
            className="rounded-full border border-white/20 px-4 py-2 font-medium text-zinc-100 transition-colors hover:border-white/40"
          >
            Open dashboard
          </Link>
        </div>

        <div className="space-y-5 py-14 text-center sm:py-20">
          <p className="inline-flex rounded-full border border-indigo-300/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100">
            Public workspace page
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            {foundWorkspace.name}
          </h1>
          <p className="mx-auto max-w-xl text-lg text-zinc-300">
            Welcome to {foundWorkspace.slug}.{rootDomain}. This page is public.
          </p>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Created on {new Date(foundWorkspace.createdAt).toLocaleDateString()}
        </p>
      </div>
    </main>
  );
}
