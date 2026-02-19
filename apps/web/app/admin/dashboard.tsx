"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  deleteSubdomainAction,
  type DeleteSubdomainState,
} from "@/app/actions";
import { protocol, rootDomain } from "@/lib/utils";

import { SignOutButton } from "./sign-out-button";

type Tenant = {
  subdomain: string;
  emoji: string;
  createdAt: number;
};

const initialState: DeleteSubdomainState = {};

export function AdminDashboard({
  tenants,
  userEmail,
}: {
  tenants: Tenant[];
  userEmail: string;
}) {
  const [state, action, isPending] = useActionState(
    deleteSubdomainAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">
            Subdomain Management
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{userEmail}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`${protocol}://${rootDomain}`}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-700"
          >
            {rootDomain}
          </Link>
          <SignOutButton />
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-zinc-500">
          No subdomains have been created yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.subdomain}
              className="rounded-lg border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {tenant.subdomain}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Created: {new Date(tenant.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <form action={action}>
                  <input
                    type="hidden"
                    name="subdomain"
                    value={tenant.subdomain}
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </form>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-4xl">{tenant.emoji}</span>
                <a
                  href={`${protocol}://${tenant.subdomain}.${rootDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Visit subdomain
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {state?.error ? (
        <div className="fixed bottom-4 right-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div className="fixed bottom-4 right-4 rounded border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {state.success}
        </div>
      ) : null}
    </div>
  );
}
