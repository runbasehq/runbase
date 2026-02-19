import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BlackLogo } from "@/components/logos/black-logo";
import { RunbaseMark } from "@/components/logos/runbase-mark";
import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import { getFirstWorkspaceMembershipForUser } from "@/lib/workspaces";
import { SignIn } from "~/auth/components/sign-in";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    const existingMembership = await getFirstWorkspaceMembershipForUser(
      session.user.id,
    );

    if (existingMembership?.workspaceSlug) {
      redirect(
        `${protocol}://${existingMembership.workspaceSlug}.${rootDomain}/dashboard`,
      );
    }

    redirect("/onboarding");
  }

  const githubAuthEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-100 to-zinc-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-4">
          <Link href="/" className="inline-flex" aria-label="Runbase home">
            <BlackLogo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-zinc-900">
              Sign In
            </h1>
            <Link
              href="/"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-700"
            >
              {rootDomain}
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <RunbaseMark className="h-4 w-4 shrink-0" />
            <span>Access your workspace</span>
          </div>
        </div>
        <SignIn githubAuthEnabled={githubAuthEnabled} />
      </div>
    </div>
  );
}
