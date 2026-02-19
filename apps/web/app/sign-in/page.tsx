import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { rootDomain } from "@/lib/utils";
import { SignIn } from "~/auth/components/sign-in";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-100 to-zinc-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Admin Sign In</h1>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-700"
          >
            {rootDomain}
          </Link>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
