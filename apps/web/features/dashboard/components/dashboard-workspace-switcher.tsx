"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { IconArrowUpDown } from "@/components/icons/icon-arrow-up-down";
import { IconInvite } from "@/components/icons/icon-invite";
import { IconPlusCircle } from "@/components/icons/icon-plus-circle";
import { IconSettings } from "@/components/icons/icon-settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, protocol, rootDomain } from "@/lib/utils";

interface DashboardWorkspaceItem {
  connectedDomain?: string | null;
  name: string;
  role: "admin" | "contributor";
  slug: string;
}

interface DashboardWorkspaceSwitcherProps {
  currentWorkspaceName: string;
  currentWorkspaceSlug: string;
  onNavigate?: () => void;
  workspaces: DashboardWorkspaceItem[];
}

function getWorkspaceInitials(name: string) {
  const normalized = name.trim();

  if (!normalized) {
    return "W";
  }

  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0]?.slice(0, 1).toUpperCase() || "W";
  }

  return `${parts[0]?.slice(0, 1) || ""}${parts[1]?.slice(0, 1) || ""}`.toUpperCase();
}

function normalizeDashboardPath(pathname: string) {
  const normalizedPath = pathname.replace(/^\/s\/[^/]+/, "");

  if (normalizedPath.startsWith("/dashboard")) {
    return normalizedPath;
  }

  return "/dashboard";
}

function getWorkspaceDashboardUrl(
  workspaceSlug: string,
  dashboardPath: string,
) {
  return `${protocol}://${workspaceSlug}.${rootDomain}${dashboardPath}`;
}

function normalizeDomain(domain: string | null | undefined) {
  if (!domain) {
    return null;
  }

  const normalized = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    ?.toLowerCase();

  return normalized || null;
}

function getWorkspaceFaviconUrl(domain: string | null | undefined) {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return null;
  }

  return `https://${normalizedDomain}/favicon.ico`;
}

function WorkspaceAvatar({
  className,
  connectedDomain,
  workspaceName,
}: {
  className?: string;
  connectedDomain?: string | null;
  workspaceName: string;
}) {
  const faviconUrl = getWorkspaceFaviconUrl(connectedDomain);
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(faviconUrl) && !hasImageError;

  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-lg border border-(--sidebar-border) bg-(--sidebar) p-1",
        className,
      )}
    >
      {shouldShowImage ? (
        <img
          src={faviconUrl || undefined}
          alt={`${workspaceName} favicon`}
          className="size-full rounded-sm object-contain"
          onError={() => setHasImageError(true)}
        />
      ) : null}
      {!shouldShowImage ? (
        <span className="text-[10px] font-semibold text-(--muted-2)">
          {getWorkspaceInitials(workspaceName)}
        </span>
      ) : null}
    </span>
  );
}

export function DashboardWorkspaceSwitcher({
  currentWorkspaceName,
  currentWorkspaceSlug,
  onNavigate,
  workspaces,
}: DashboardWorkspaceSwitcherProps) {
  const pathname = usePathname();
  const dashboardPath = normalizeDashboardPath(pathname);

  const workspaceItems = useMemo(() => {
    const bySlug = new Map<string, DashboardWorkspaceItem>();

    for (const workspace of workspaces) {
      bySlug.set(workspace.slug, workspace);
    }

    if (!bySlug.has(currentWorkspaceSlug)) {
      bySlug.set(currentWorkspaceSlug, {
        connectedDomain: null,
        name: currentWorkspaceName,
        role: "admin",
        slug: currentWorkspaceSlug,
      });
    }

    return [...bySlug.values()];
  }, [currentWorkspaceName, currentWorkspaceSlug, workspaces]);

  const currentWorkspace =
    workspaceItems.find(
      (workspace) => workspace.slug === currentWorkspaceSlug,
    ) || workspaceItems[0];

  function handleWorkspaceNavigation(workspaceSlug: string) {
    if (workspaceSlug === currentWorkspaceSlug) {
      onNavigate?.();
      return;
    }

    onNavigate?.();
    window.location.assign(
      getWorkspaceDashboardUrl(workspaceSlug, dashboardPath),
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "group flex h-10 w-full items-center gap-2 rounded-lg border border-(--sidebar-border) bg-(--sidebar) px-2 text-left outline-none transition-colors",
                "hover:bg-black/4 focus-visible:ring-2 focus-visible:ring-(--sidebar-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--sidebar)",
              )}
            />
          }
        >
          <WorkspaceAvatar
            className="size-6"
            connectedDomain={currentWorkspace?.connectedDomain}
            workspaceName={currentWorkspace?.name || currentWorkspaceName}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-(--text)">
            {currentWorkspace?.name || currentWorkspaceName}
          </span>
          <IconArrowUpDown className="size-4 text-(--muted-2)" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="rounded-xl border border-(--sidebar-border) bg-(--sidebar) p-2 text-(--sidebar-foreground)"
        >
          <div className="rounded-lg border border-(--sidebar-border) bg-(--surface) p-2">
            <div className="flex items-center gap-2">
              <WorkspaceAvatar
                className="size-7"
                connectedDomain={currentWorkspace?.connectedDomain}
                workspaceName={currentWorkspace?.name || currentWorkspaceName}
              />
              <div className="min-w-0 flex flex-1 flex-col justify-center gap-0.5">
                <p className="truncate text-sm font-semibold leading-4.5 text-(--text)">
                  {currentWorkspace?.name || currentWorkspaceName}
                </p>
                <p className="truncate text-[11px] leading-4 text-(--muted-2)">
                  {currentWorkspace?.role === "admin" ? "Owner" : "Member"}
                  {currentWorkspace?.connectedDomain
                    ? ` · ${normalizeDomain(currentWorkspace.connectedDomain)}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Link
                href="/dashboard/settings"
                onClick={onNavigate}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-(--sidebar-border) bg-(--sidebar) px-2 text-xs font-medium text-(--text) transition-colors hover:bg-black/6"
              >
                <IconSettings className="size-3.5" />
                Settings
              </Link>
              <Link
                href="/dashboard/settings/team"
                onClick={onNavigate}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-(--sidebar-border) bg-(--sidebar) px-2 text-xs font-medium text-(--text) transition-colors hover:bg-black/6"
              >
                <IconInvite className="size-3.5" />
                Invite
              </Link>
            </div>
          </div>

          <div className="mt-3 border-t border-(--sidebar-border) pt-3">
            <p className="px-1 text-xs font-medium leading-5 text-(--muted-2)">
              Workspaces
            </p>

            <div className="mt-2 space-y-1.5">
              {workspaceItems.map((workspace) => {
                const isCurrentWorkspace =
                  workspace.slug === currentWorkspaceSlug;

                return (
                  <DropdownMenuItem
                    key={workspace.slug}
                    className={cn(
                      "h-10 cursor-pointer rounded-lg px-2 text-sm text-(--text) focus:bg-black/7",
                      isCurrentWorkspace && "bg-black/6",
                    )}
                    onClick={() => handleWorkspaceNavigation(workspace.slug)}
                  >
                    <WorkspaceAvatar
                      connectedDomain={workspace.connectedDomain}
                      workspaceName={workspace.name}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {workspace.name}
                    </span>
                    {isCurrentWorkspace ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2.2}
                        className="size-4"
                      />
                    ) : null}
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuItem
                className="h-10 cursor-pointer rounded-lg px-2 text-sm text-(--text) focus:bg-black/7"
                onClick={() => {
                  onNavigate?.();
                  window.location.assign(
                    `${protocol}://${rootDomain}/onboarding?allowExistingMembership=1`,
                  );
                }}
              >
                <IconPlusCircle className="size-4 text-(--muted-2)" />
                <span className="font-medium">Create workspace</span>
              </DropdownMenuItem>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
