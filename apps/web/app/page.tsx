import Link from "next/link";

import { SubdomainForm } from "@/app/subdomain-form";
import { rootDomain } from "@/lib/utils";

export default function Page() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="absolute right-4 top-4">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700"
        >
          Admin
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            {rootDomain}
          </h1>
          <p className="mt-3 text-zinc-600">
            Create your own subdomain with a custom emoji
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <SubdomainForm />
        </div>
      </div>
    </div>
  );
}
