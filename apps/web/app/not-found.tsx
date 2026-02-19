"use client";

import Link from "next/link";

import { protocol, rootDomain } from "@/lib/utils";

export default function NotFound() {
  const subdomain = (() => {
    if (typeof window === "undefined") {
      return null;
    }

    const hostname = window.location.hostname;
    const rootDomainWithoutPort = rootDomain.split(":")[0];

    if (!hostname.endsWith(`.${rootDomainWithoutPort}`)) {
      return null;
    }

    const extractedSubdomain = hostname.replace(
      `.${rootDomainWithoutPort}`,
      "",
    );
    if (!extractedSubdomain || extractedSubdomain === "www") {
      return null;
    }

    return extractedSubdomain;
  })();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          {subdomain ? (
            <>
              <span className="text-blue-600">{subdomain}</span>.{rootDomain}{" "}
              does not exist
            </>
          ) : (
            "Subdomain Not Found"
          )}
        </h1>
        <p className="mt-3 text-zinc-600">
          This subdomain has not been created yet.
        </p>
        <div className="mt-6">
          <Link
            href={`${protocol}://${rootDomain}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {subdomain ? `Create ${subdomain}` : `Go to ${rootDomain}`}
          </Link>
        </div>
      </div>
    </div>
  );
}
