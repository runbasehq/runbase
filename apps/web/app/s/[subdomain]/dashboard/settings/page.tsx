import Link from "next/link";

import { settingsNavGroups } from "~/dashboard/lib/settings-nav";

export default function DashboardSettingsPage() {
  return (
    <section className="p-6 md:p-10">
      <div className="mb-6 w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--muted-2)">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--text)">
          Configuration
        </h1>
        <p className="mt-3 text-sm text-(--muted)">
          Manage your workspace preferences and configuration.
        </p>
      </div>

      <div className="w-full max-w-4xl space-y-7">
        {settingsNavGroups.map((group) => (
          <section key={group.id}>
            <p className="px-1 text-xs font-medium text-(--muted)">
              {group.label}
            </p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-(--r-md) border border-(--border) bg-(--surface) p-4 transition-colors hover:border-(--text)/20 hover:bg-black/2"
                >
                  <item.icon className="size-5 text-(--text)" />
                  <p className="mt-3 text-sm font-semibold text-(--text)">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm text-(--muted)">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
