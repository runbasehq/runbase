"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addDomain,
  fetchDomains,
  removeDomain,
  verifyDomain,
} from "~/domains/lib/domains-api";
import { domainsQueryKeys } from "~/domains/lib/query-keys";
import type { CustomDomain } from "~/domains/lib/types";

interface UseDomainsOptions {
  workspaceSlug: string;
  initialDomains: CustomDomain[];
}

export function useDomains({
  workspaceSlug,
  initialDomains,
}: UseDomainsOptions) {
  return useQuery({
    queryKey: domainsQueryKeys.byWorkspace(workspaceSlug),
    queryFn: () => fetchDomains(workspaceSlug),
    initialData: initialDomains,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAddDomainMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const key = domainsQueryKeys.byWorkspace(workspaceSlug);

  return useMutation({
    mutationKey: ["domains", "add", workspaceSlug],
    mutationFn: (domain: string) => addDomain({ workspaceSlug, domain }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key, exact: true });
    },
  });
}

export function useVerifyDomainMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const key = domainsQueryKeys.byWorkspace(workspaceSlug);

  return useMutation({
    mutationKey: ["domains", "verify", workspaceSlug],
    mutationFn: (domain: string) => verifyDomain({ workspaceSlug, domain }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key, exact: true });
    },
  });
}

export function useRemoveDomainMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const key = domainsQueryKeys.byWorkspace(workspaceSlug);

  return useMutation({
    mutationKey: ["domains", "remove", workspaceSlug],
    mutationFn: (domain: string) => removeDomain({ workspaceSlug, domain }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key, exact: true });
    },
  });
}
