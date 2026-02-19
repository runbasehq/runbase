"use client";

import { useActionState, useState } from "react";

import {
  createSubdomainAction,
  type CreateSubdomainState,
} from "@/app/actions";
import { rootDomain } from "@/lib/utils";

const initialState: CreateSubdomainState = {};

export function SubdomainForm() {
  const [icon, setIcon] = useState("");
  const [state, action, isPending] = useActionState(
    createSubdomainAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="subdomain"
          className="text-sm font-medium text-zinc-700"
        >
          Subdomain
        </label>
        <div className="flex items-center">
          <input
            id="subdomain"
            name="subdomain"
            defaultValue={state?.subdomain}
            placeholder="your-subdomain"
            required
            className="w-full rounded-l-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-500"
          />
          <span className="rounded-r-md border border-l-0 border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
            .{rootDomain}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="icon" className="text-sm font-medium text-zinc-700">
          Icon (emoji)
        </label>
        <input
          id="icon"
          name="icon"
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          placeholder="🚀"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-0 focus:border-zinc-500"
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !icon}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create subdomain"}
      </button>
    </form>
  );
}
