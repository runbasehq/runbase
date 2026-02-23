import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
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
  const googleAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="flex min-h-screen w-full overflow-hidden bg-white">
        <aside className="relative hidden w-[40%] overflow-hidden border-r border-black/10 bg-[#050913] lg:flex">
          <Image
            src="/feedback.webp"
            alt="Product team shipping updates after reviewing feedback"
            fill
            priority
            sizes="40vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(3,7,14,0.92)_8%,rgba(4,8,14,0.76)_44%,rgba(5,8,13,0.42)_74%,rgba(5,8,13,0.56)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_72%_at_14%_86%,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0)_64%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[4px] bg-[linear-gradient(90deg,#CDFF29_0%,#E8B98B_52%,#FF7BCB_100%)]" />

          <div className="relative z-10 flex h-full w-full flex-col items-start justify-center px-14">
            <RunbaseLogo className="h-[24px] w-auto text-white/96 drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]" />
            <h2 className="mt-12 max-w-[470px] text-[46px] font-medium leading-[1.06] tracking-[-0.03em] text-white">
              Build support and feedback workflows without slowing down.
            </h2>
            <p className="mt-4 max-w-[460px] text-base text-white/80">
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
            <SignIn
              githubAuthEnabled={githubAuthEnabled}
              googleAuthEnabled={googleAuthEnabled}
              mode="sign-up"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
