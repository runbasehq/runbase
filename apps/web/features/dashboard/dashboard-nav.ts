import type { ComponentType, SVGProps } from "react";

import { IconAssistant } from "@/components/icons/icon-assistant";
import { IconHelp } from "@/components/icons/icon-help";
import { IconInbox } from "@/components/icons/icon-inbox";
import { IconMap } from "@/components/icons/icon-map";
import { IconNew } from "@/components/icons/icon-new";
import { IconPost } from "@/components/icons/icon-post";
import { IconRoadmap } from "@/components/icons/icon-roadmap";
import { IconSearch } from "@/components/icons/icon-search";
import { IconSettings } from "@/components/icons/icon-settings";
import { IconTop } from "@/components/icons/icon-top";
import { IconTrending } from "@/components/icons/icon-trending";

type SvgIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface DashboardNavItemBase {
  badge?: number;
  hint?: string;
  id: string;
  href: string;
  label: string;
}

interface DashboardSubNavItem {
  colorClassName: string;
  href: string;
  icon: SvgIconComponent;
  id: string;
  label: string;
}

interface DashboardSvgNavItem extends DashboardNavItemBase {
  iconType: "svg";
  icon: SvgIconComponent;
  subItems?: DashboardSubNavItem[];
}

export type DashboardNavItem = DashboardSvgNavItem;

export const feedbackNavItems: DashboardNavItem[] = [
  {
    id: "feedback",
    href: "/dashboard/feedback",
    iconType: "svg",
    icon: IconInbox,
    label: "Feedback",
    subItems: [
      {
        colorClassName: "text-amber-500",
        href: "/dashboard/feedback?view=trending",
        icon: IconTrending,
        id: "feedback-trending",
        label: "Trending",
      },
      {
        colorClassName: "text-sky-500",
        href: "/dashboard/feedback?view=top",
        icon: IconTop,
        id: "feedback-top",
        label: "Top",
      },
      {
        colorClassName: "text-emerald-500",
        href: "/dashboard/feedback?view=new",
        icon: IconNew,
        id: "feedback-new",
        label: "New",
      },
    ],
  },
  {
    id: "changelog",
    href: "/dashboard/changelog",
    iconType: "svg",
    icon: IconMap,
    label: "Changelog",
  },
];

export const quickNavItems: DashboardNavItem[] = [
  {
    hint: "cmd+k",
    id: "search",
    href: "#",
    iconType: "svg",
    icon: IconSearch,
    label: "Search",
  },
  {
    hint: "cmd+l",
    id: "assistant",
    href: "#",
    iconType: "svg",
    icon: IconAssistant,
    label: "Assistant",
  },
];

export const recentNavItems: DashboardNavItem[] = [
  {
    id: "recent-1",
    href: "/dashboard/feedback?post=backlog-cut-35",
    iconType: "svg",
    icon: IconPost,
    label: "How we cut support backlog by 35%",
  },
  {
    id: "recent-2",
    href: "/dashboard/changelog?entry=inbox-automation-milestones",
    iconType: "svg",
    icon: IconRoadmap,
    label: "Roadmap: inbox automation milestones",
  },
  {
    id: "recent-3",
    href: "/dashboard/changelog?entry=smarter-triage-rules",
    iconType: "svg",
    icon: IconPost,
    label: "New release notes: smarter triage rules",
  },
];

export const footerNavItems: DashboardNavItem[] = [
  {
    id: "help",
    href: "#",
    iconType: "svg",
    icon: IconHelp,
    label: "Help",
  },
  {
    id: "settings",
    href: "/dashboard/settings/custom-domain",
    iconType: "svg",
    icon: IconSettings,
    label: "Settings",
  },
];
