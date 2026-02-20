import {
  HelpCircleIcon,
  NotificationIcon,
  ShieldIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import type { DashboardStatus } from "~/workspace-dashboard/lib/types";

const statusStyles: Record<DashboardStatus, string> = {
  onTrack: "bg-(--success-soft) text-(--success) border-transparent",
  pendingExternal: "bg-(--info-soft) text-[#0369a1] border-transparent",
  atRisk: "bg-(--warning-soft) text-[#b45309] border-transparent",
  blocked: "bg-(--danger-soft) text-(--danger) border-transparent",
};

const statusLabels: Record<DashboardStatus, string> = {
  onTrack: "On track",
  pendingExternal: "Pending external",
  atRisk: "At risk",
  blocked: "Blocked",
};

const statusIcons: Record<DashboardStatus, typeof Tick02Icon> = {
  onTrack: Tick02Icon,
  pendingExternal: NotificationIcon,
  atRisk: HelpCircleIcon,
  blocked: ShieldIcon,
};

export function StatusPill({
  status,
  className,
}: {
  status: DashboardStatus;
  className?: string;
}) {
  const icon = statusIcons[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        statusStyles[status],
        className,
      )}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3" />
      {statusLabels[status]}
    </span>
  );
}
