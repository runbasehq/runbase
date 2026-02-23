import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Effect, Either } from "effect";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { protocol, rootDomain } from "@/lib/utils";
import { decodeAcceptInvitationInput } from "~/workspace-members/workspace-members.schema";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

type AcceptInviteSearchParams = {
  token?: string | string[];
};

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<AcceptInviteSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = readSingleParam(resolvedSearchParams.token).trim();

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] px-4 py-8">
        <section className="w-full max-w-lg rounded-(--r-md) border border-(--border) bg-white p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
            Invitation
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
            Invalid invitation link
          </h1>
          <p className="mt-3 text-sm text-(--muted)">
            We could not find an invitation token in this URL.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center rounded-(--r-sm) border border-black/70 bg-black px-4 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-(--r-sm) border border-(--border) px-4 text-sm font-medium text-(--text)"
            >
              Go home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    const nextPath = `/accept-invite?token=${encodeURIComponent(token)}`;
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  const program = Effect.gen(function* () {
    const input = yield* decodeAcceptInvitationInput({ token });

    return yield* WorkspaceMembersService.acceptInvitation({
      token: input.token,
      userId: session.user.id,
      userEmail: session.user.email,
    });
  }).pipe(Effect.either);

  const result = await appRuntime.runPromise(program);

  if (Either.isRight(result)) {
    redirect(
      `${protocol}://${result.right.workspaceSlug}.${rootDomain}/dashboard`,
    );
  }

  const error = result.left;
  const nextPath = `/accept-invite?token=${encodeURIComponent(token)}`;

  let title = "Could not accept invitation";
  let description =
    "Try again from the latest invitation email, or ask your workspace admin to send a new one.";

  if (error._tag === "WorkspaceMembersInvitationExpired") {
    title = "Invitation expired";
    description =
      "This invitation has expired. Ask a workspace admin to send you a new invitation.";
  } else if (error._tag === "WorkspaceMembersInvitationInvalidToken") {
    title = "Invitation is invalid";
    description =
      "This invitation link is invalid or has already been used. Request a fresh invitation from your admin.";
  } else if (error._tag === "WorkspaceMembersForbidden") {
    title = "Wrong account";
    description = error.message;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] px-4 py-8">
      <section className="w-full max-w-lg rounded-(--r-md) border border-(--border) bg-white p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Invitation
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          {title}
        </h1>
        <p className="mt-3 text-sm text-(--muted)">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/sign-in?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex h-10 items-center rounded-(--r-sm) border border-black/70 bg-black px-4 text-sm font-semibold text-white"
          >
            Try another account
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-(--r-sm) border border-(--border) px-4 text-sm font-medium text-(--text)"
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
