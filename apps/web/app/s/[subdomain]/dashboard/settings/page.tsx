import Link from "next/link";

import { IconGlobe } from "@/components/icons/icon-globe";
import { IconPeople } from "@/components/icons/icon-people";

const settingsItems = [
  {
    href: "/dashboard/settings/custom-domain",
    title: "Custom domain",
    description: "Connect and verify your domain.",
    icon: IconGlobe,
  },
  {
    href: "/dashboard/settings/team",
    title: "Team",
    description: "Invite members and manage permissions.",
    icon: IconPeople,
  },
];

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

      <div className="grid w-full max-w-3xl gap-3 md:grid-cols-2">
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-(--r-md) border border-(--border) bg-(--surface) p-4 transition-colors hover:border-(--text)/20 hover:bg-black/2"
          >
            <item.icon className="size-5 text-(--text)" />
            <p className="mt-3 text-sm font-semibold text-(--text)">
              {item.title}
            </p>
            <p className="mt-1 text-sm text-(--muted)">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
