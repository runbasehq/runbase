"use client";

import { createContext, useContext } from "react";

interface DashboardRuntimeContextValue {
  canManageDomains: boolean;
  workspaceName: string;
  workspaceSlug: string;
}

const DashboardRuntimeContext =
  createContext<DashboardRuntimeContextValue | null>(null);

export function DashboardRuntimeProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DashboardRuntimeContextValue;
}) {
  return (
    <DashboardRuntimeContext.Provider value={value}>
      {children}
    </DashboardRuntimeContext.Provider>
  );
}

export function useDashboardRuntime() {
  const context = useContext(DashboardRuntimeContext);

  if (!context) {
    throw new Error(
      "useDashboardRuntime must be used inside DashboardRuntimeProvider",
    );
  }

  return context;
}
