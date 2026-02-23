"use client";

import { CustomDomainManager } from "~/domains/components/custom-domain-manager";
import type { CustomDomain } from "~/domains/lib/types";

import { useDashboardRuntime } from "~/dashboard/components/dashboard-runtime-context";

export function DashboardDomainManager({
  initialDomains,
}: {
  initialDomains: CustomDomain[];
}) {
  const { canManageDomains, workspaceSlug } = useDashboardRuntime();

  return (
    <CustomDomainManager
      workspaceSlug={workspaceSlug}
      canManageDomains={canManageDomains}
      initialDomains={initialDomains}
    />
  );
}
