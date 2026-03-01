"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconChevronLeft } from "@/components/icons/icon-chevron-left";
import { cn } from "@/lib/utils";
import { settingsNavGroups } from "~/dashboard/lib/settings-nav";

interface SettingsSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

function isActive(pathname: string, href: string) {
  const normalizedPath = pathname.replace(/^\/s\/[^/]+/, "");
  return normalizedPath === href || normalizedPath.startsWith(`${href}/`);
}

export function SettingsSidebar({
  className,
  onNavigate,
}: SettingsSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-screen w-72 shrink-0 border-r border-(--sidebar-border) bg-(--sidebar) text-(--sidebar-foreground)",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="px-3 py-3">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-(--muted) transition-colors hover:text-(--text)"
          >
            <IconChevronLeft aria-hidden className="size-4" />
            <span>Back to app</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {settingsNavGroups.map((group, index) => (
            <div key={group.id} className={cn(index > 0 && "mt-5")}>
              <p className="px-2 text-xs font-medium text-(--muted)">
                {group.label}
              </p>
              <nav className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.id}
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
                            borderColor:
                              "color-mix(in oklab, var(--primary) 90%, black)",
                          }}
                        />
                      ) : null}
                      <item.icon
                        className={cn("size-[17px]", active && "text-(--text)")}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
