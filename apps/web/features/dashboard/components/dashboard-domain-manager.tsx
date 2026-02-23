"use client";

import { CustomDomainManager } from "~/domains/components/custom-domain-manager";

import { useDashboardRuntime } from "~/dashboard/components/dashboard-runtime-context";

export function DashboardDomainManager() {
  const { canManageDomains, workspaceSlug } = useDashboardRuntime();

  return (
    <CustomDomainManager
      workspaceSlug={workspaceSlug}
      canManageDomains={canManageDomains}
    />
  );
}
