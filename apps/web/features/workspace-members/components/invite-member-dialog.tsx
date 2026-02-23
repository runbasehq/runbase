"use client";

import { useState, type FormEvent } from "react";

import { IconPlusCircle } from "@/components/icons/icon-plus-circle";

import type { WorkspaceMemberRole } from "~/workspace-members/lib/types";

export function InviteMemberDialog({
  canManageMembers,
  isSubmitting,
  onSubmit,
}: {
  canManageMembers: boolean;
  isSubmitting: boolean;
  onSubmit: (input: {
    email: string;
    role: WorkspaceMemberRole;
  }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceMemberRole>("contributor");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageMembers || !email.trim()) {
      return;
    }

    await onSubmit({
      email,
      role,
    });
    setEmail("");
    setRole("contributor");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-(--r-md) border border-(--border) bg-(--surface) p-4 md:p-5"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-(--muted-2)">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            disabled={!canManageMembers || isSubmitting}
            className="h-10 w-full rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 text-sm text-(--text) outline-none focus:border-(--primary) disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-(--muted-2)">
            Role
          </span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as WorkspaceMemberRole)
            }
            disabled={!canManageMembers || isSubmitting}
            className="h-10 w-full rounded-(--r-sm) border border-(--border) bg-(--bg) px-3 text-sm text-(--text) outline-none focus:border-(--primary) disabled:opacity-60"
          >
            <option value="contributor">Contributor</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={!canManageMembers || !email.trim() || isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-(--r-sm) border border-black/70 bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconPlusCircle className="size-4" />
          {isSubmitting ? "Sending..." : "Send invite"}
        </button>
      </div>
    </form>
  );
}
