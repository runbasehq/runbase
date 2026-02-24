"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { IconArrowUpRightSquare } from "@/components/icons/icon-arrow-up-right-square";
import { IconGlobe } from "@/components/icons/icon-globe";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FancyButton } from "@/components/ui/fancy-button";
import { Kbd } from "@/components/ui/kbd";
import { cn, protocol, rootDomain } from "@/lib/utils";
import { DashboardNotificationsButton } from "~/dashboard/components/dashboard-notifications-button";
import { useDashboardRuntime } from "~/dashboard/components/dashboard-runtime-context";
import { DashboardWorkspaceSwitcher } from "~/dashboard/components/dashboard-workspace-switcher";
import type { DashboardWorkspaceOption } from "~/dashboard/components/dashboard-shell";
import {
  type DashboardNavItem,
  feedbackNavItems,
  footerNavItems,
  quickNavItems,
  recentNavItems,
} from "~/dashboard/dashboard-nav";

interface DashboardSidebarProps {
  className?: string;
  organizationName: string;
  workspaces: DashboardWorkspaceOption[];
  user: {
    email?: string | null;
    image?: string | null;
    name?: string | null;
  };
  onNavigate?: () => void;
}

function getInitials(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  const value = (name || email || "U").trim();

  if (!value) {
    return "U";
  }

  if (value.includes("@")) {
    return value.slice(0, 1).toUpperCase();
  }

  const parts = value.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0]?.slice(0, 1).toUpperCase() || "U";
  }

  return `${parts[0]?.slice(0, 1) || ""}${parts[1]?.slice(0, 1) || ""}`.toUpperCase();
}

function isActive(pathname: string, href: string) {
  if (href === "#") {
    return false;
  }

  const normalizedPath = pathname.replace(/^\/s\/[^/]+/, "");
  return normalizedPath === href || normalizedPath.startsWith(`${href}/`);
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: DashboardNavItem;
  active?: boolean;
  onNavigate?: () => void;
}) {
  const subItems = item.subItems;
  const hasSubItems = Boolean(subItems?.length);

  return (
    <div>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/item relative flex h-8 items-center gap-2 rounded-lg border border-transparent pl-3 pr-2 text-[0.86rem] font-medium text-(--muted) outline-none transition-[color,background-color,border-color,transform]",
          "hover:border-transparent hover:bg-black/7 hover:text-(--text)",
          "focus-visible:ring-2 focus-visible:ring-(--sidebar-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--sidebar)",
          active &&
            "border-(--border) bg-(--surface) text-(--text) shadow-[0_1px_0_rgba(17,18,20,0.05)] hover:border-(--border) hover:bg-black/6 hover:text-(--text)",
        )}
      >
        {active ? (
          <span
            className="absolute -left-2 top-1/2 h-8 w-[2px] -translate-y-1/2 rounded-br-full rounded-tr-full border border-l-0 bg-primary [corner-shape:superellipse(0.3)]"
            style={{
              borderColor: "color-mix(in oklab, var(--primary) 90%, black)",
            }}
          />
        ) : null}
        <item.icon className={cn("size-[17px]", active && "text-(--text)")} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.hint ? (
          <Kbd className="ml-auto h-4 min-w-0 rounded-[5px] border-none bg-black/4 px-1.5 text-[10px] font-semibold uppercase tracking-wide group-hover/item:bg-black/6">
            {item.hint}
          </Kbd>
        ) : null}
        {item.badge ? (
          <span className="ml-auto rounded-md bg-rose-500 px-1.5 py-[1px] text-[10px] font-semibold text-white">
            {item.badge}
          </span>
        ) : null}
      </Link>

      {hasSubItems ? (
        <div className="mt-1 space-y-0 pb-1 pl-3">
          {subItems?.map((subItem) => (
            <Link
              key={subItem.id}
              href={subItem.href}
              onClick={onNavigate}
              className="flex h-8 items-center gap-2 overflow-hidden rounded-lg border border-transparent pl-3 pr-2 text-[0.86rem] font-medium text-(--muted) outline-none transition-[color,background-color,border-color] hover:border-transparent hover:bg-black/5 hover:text-(--text) focus-visible:ring-2 focus-visible:ring-(--sidebar-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--sidebar)"
            >
              <subItem.icon
                className={cn("size-[17px]", subItem.colorClassName)}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  subItem.colorClassName,
                )}
              >
                {subItem.label}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardSidebar({
  className,
  onNavigate,
  organizationName,
  workspaces,
  user,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { workspaceSlug } = useDashboardRuntime();
  const publicUrl = `${protocol}://${workspaceSlug}.${rootDomain}`;

  return (
    <aside
      className={cn(
        "h-screen w-72 shrink-0 border-r border-(--sidebar-border) bg-(--sidebar) text-(--sidebar-foreground)",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-(--sidebar-border) px-2 py-3">
          <DashboardWorkspaceSwitcher
            currentWorkspaceName={organizationName}
            currentWorkspaceSlug={workspaceSlug}
            onNavigate={onNavigate}
            workspaces={workspaces}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <nav className="space-y-0.5">
            {quickNavItems.map((item) => (
              <SidebarLink key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </nav>

          <p className="mt-5 px-2 text-xs font-medium text-(--muted)">
            General
          </p>

          <nav className="mt-2 space-y-0.5">
            {feedbackNavItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <SidebarLink
                  key={item.id}
                  item={item}
                  active={active}
                  onNavigate={onNavigate}
                />
              );
            })}
          </nav>

          <div className="mt-5">
            <p className="flex items-center gap-1 px-2 text-xs font-medium text-(--muted)">
              Recent
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                strokeWidth={2.2}
                className="size-[17px]"
              />
            </p>
            <nav className="mt-2 space-y-0.5">
              {recentNavItems.map((item) => (
                <SidebarLink
                  key={item.id}
                  item={item}
                  onNavigate={onNavigate}
                />
              ))}
            </nav>
          </div>
        </div>

        <div className="shrink-0 border-t border-(--sidebar-border) px-2 pb-4 pt-3">
          <FancyButton.Root
            asChild
            size="xsmall"
            variant="primary"
            className="mb-2 w-full justify-start px-3"
          >
            <Link
              href={publicUrl}
              onClick={onNavigate}
              target="_blank"
              rel="noreferrer"
            >
              <IconGlobe className="size-4" />
              <span className="truncate">Public link</span>
              <IconArrowUpRightSquare className="ml-auto size-4" />
            </Link>
          </FancyButton.Root>

          {footerNavItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <SidebarLink
                key={item.id}
                item={item}
                active={active}
                onNavigate={onNavigate}
              />
            );
          })}

          <div className="mt-2 flex items-center gap-2 rounded-lg border border-(--sidebar-border) bg-(--surface) px-2.5 py-1.5">
            <Avatar size="sm">
              <AvatarImage
                src={user.image || undefined}
                alt={user.name || "User avatar"}
              />
              <AvatarFallback>
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 truncate text-xs font-medium text-(--text)">
              {user.name || user.email || "You"}
            </p>
            <DashboardNotificationsButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
