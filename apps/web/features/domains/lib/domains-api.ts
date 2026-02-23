import type { CustomDomain } from "./types";

interface DomainApiError {
  error?: string;
  operation?: string;
}

function toRequestUrl(input: RequestInfo) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T &
    DomainApiError;

  if (!response.ok) {
    console.error("[domains-client] request failed", {
      url: toRequestUrl(input),
      method: init?.method || "GET",
      status: response.status,
      error: payload.error,
      operation: payload.operation,
    });
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export async function fetchDomains(workspaceSlug: string) {
  const response = await requestJson<{ domains: CustomDomain[] }>(
    `/api/domains?workspaceSlug=${encodeURIComponent(workspaceSlug)}`,
  );

  return response.domains;
}

export async function addDomain({
  workspaceSlug,
  domain,
}: {
  workspaceSlug: string;
  domain: string;
}) {
  const response = await requestJson<{ domain: CustomDomain }>("/api/domains", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workspaceSlug, domain }),
  });

  return response.domain;
}

export async function verifyDomain({
  workspaceSlug,
  domain,
}: {
  workspaceSlug: string;
  domain: string;
}) {
  const response = await requestJson<{ domain: CustomDomain }>(
    "/api/domains/verify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceSlug, domain }),
    },
  );

  return response.domain;
}

export async function removeDomain({
  workspaceSlug,
  domain,
}: {
  workspaceSlug: string;
  domain: string;
}) {
  await requestJson<{ success: true; domain: string }>("/api/domains", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workspaceSlug, domain }),
  });
}
