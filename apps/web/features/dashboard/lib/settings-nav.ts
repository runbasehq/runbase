import type { ComponentType, SVGProps } from "react";

import { IconBilling } from "@/components/icons/icon-billing";
import { IconGlobe } from "@/components/icons/icon-globe";
import { IconPeople } from "@/components/icons/icon-people";
import { IconRoadmap } from "@/components/icons/icon-roadmap";

type SvgIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface SettingsNavItem {
  description: string;
  href: string;
  icon: SvgIconComponent;
  id: string;
  label: string;
}

export interface SettingsNavGroup {
  id: string;
  items: SettingsNavItem[];
  label: string;
}

const workspaceSettingsNavItems: SettingsNavItem[] = [
  {
    id: "custom-domains",
    href: "/dashboard/settings/custom-domain",
    label: "Custom domains",
    description: "Connect and verify your domain.",
    icon: IconGlobe,
  },
  {
    id: "feedback-roadmap",
    href: "/dashboard/settings/feedback-roadmap",
    label: "Feedback & Roadmap",
    description: "Manage tags, boards, statuses, and public board behavior.",
    icon: IconRoadmap,
  },
  {
    id: "billing",
    href: "/dashboard/settings/billing",
    label: "Billing",
    description: "Manage plan, invoices, and billing contact details.",
    icon: IconBilling,
  },
];

const administrationSettingsNavItems: SettingsNavItem[] = [
  {
    id: "team",
    href: "/dashboard/settings/team",
    label: "Team",
    description: "Invite members and manage permissions.",
    icon: IconPeople,
  },
];

export const settingsNavGroups: SettingsNavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: workspaceSettingsNavItems,
  },
  {
    id: "administration",
    label: "Administration",
    items: administrationSettingsNavItems,
  },
];

export const settingsNavItems: SettingsNavItem[] = settingsNavGroups.flatMap(
  (group) => group.items,
);
