import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { RunbaseMark } from "@/components/logos/runbase-mark";
import { auth } from "@/lib/auth";
import { protocol, rootDomain } from "@/lib/utils";
import { getFirstWorkspaceMembershipForUser } from "@/lib/workspaces";
import { SignIn } from "~/auth/components/sign-in";
import { normalizeCompanyName } from "~/workspace/schemas/create-workspace";

export const dynamic = "force-dynamic";

type SignUpSearchParams = {
  companyName?: string | string[];
};

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SignUpSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const companyName = normalizeCompanyName(
    readSingleParam(resolvedSearchParams.companyName),
  );

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

    const onboardingPath = companyName
      ? `/onboarding?companyName=${encodeURIComponent(companyName)}`
      : "/onboarding";

    if (companyName) {
      const completeParams = new URLSearchParams({
        companyName,
        feedbackAccess: "public",
        primaryGoal: "capture_manage_feedback",
      });

      redirect(`/onboarding/complete?${completeParams.toString()}`);
    }

    redirect(onboardingPath);
  }

  const githubAuthEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="flex min-h-screen w-full overflow-hidden bg-white">
        <aside className="relative hidden w-[40%] overflow-hidden border-r border-black/10 bg-[#edf2f3] lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(16,24,40,0.15)_1px,transparent_1px)] bg-[size:12px_12px] opacity-65" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_14%_100%,rgba(255,95,162,0.45)_0%,rgba(255,95,162,0)_64%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(22,184,140,0.30)_0%,rgba(22,184,140,0)_62%)]" />
          <div className="relative z-10 flex h-full w-full flex-col justify-center px-14">
            <RunbaseMark className="h-14 w-14" />
            <h2 className="mt-6 max-w-[420px] text-[40px] font-medium leading-[1.06] tracking-[-0.02em] text-black">
              Build support and feedback workflows without slowing down.
            </h2>
            <p className="mt-4 max-w-[350px] text-base text-black/65">
              Keep your support inbox, roadmap feedback, and product updates in
              one focused workspace.
            </p>
          </div>
        </aside>

        <section className="relative flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10">
          <div className="absolute left-6 top-6 sm:left-10 sm:top-8">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              ← Home
            </Link>
          </div>

          <div className="w-full max-w-[430px]">
            <SignIn githubAuthEnabled={githubAuthEnabled} mode="sign-up" />
          </div>
        </section>
      </div>
    </div>
  );
}
