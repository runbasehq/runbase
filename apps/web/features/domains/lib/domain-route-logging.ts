import { NextResponse } from "next/server";

import {
  type DomainRouteError,
  handleDomainError,
} from "~/domains/domains.errors";

type DomainRouteContext = {
  route: string;
  method: string;
  userId: string;
  workspaceSlug?: string;
  domain?: string;
};

function readOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : undefined;
}

export function readDomainBodyField(rawBody: unknown, field: string) {
  if (!rawBody || typeof rawBody !== "object") {
    return undefined;
  }

  return readOptionalString((rawBody as Record<string, unknown>)[field]);
}

function toErrorLogData(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const value = error as {
      _tag?: unknown;
      message?: unknown;
      operation?: unknown;
      status?: unknown;
      stack?: unknown;
      providerStatusText?: unknown;
      providerReasons?: unknown;
      providerCode?: unknown;
      providerRequestId?: unknown;
      domain?: unknown;
    };

    const providerReasons = Array.isArray(value.providerReasons)
      ? value.providerReasons.filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        )
      : undefined;

    return {
      tag: typeof value._tag === "string" ? value._tag : undefined,
      message: typeof value.message === "string" ? value.message : undefined,
      operation:
        typeof value.operation === "string" ? value.operation : undefined,
      status: typeof value.status === "number" ? value.status : undefined,
      providerStatusText:
        typeof value.providerStatusText === "string"
          ? value.providerStatusText
          : undefined,
      providerReasons,
      providerCode:
        typeof value.providerCode === "string" ? value.providerCode : undefined,
      providerRequestId:
        typeof value.providerRequestId === "string"
          ? value.providerRequestId
          : undefined,
      providerDomain:
        typeof value.domain === "string" ? value.domain : undefined,
      stack: typeof value.stack === "string" ? value.stack : undefined,
      raw: error,
    };
  }

  return { raw: error };
}

function logDomainRouteFailure(
  context: DomainRouteContext,
  error: unknown,
  status: number,
) {
  const payload = {
    ...context,
    status,
    error: toErrorLogData(error),
  };

  if (status >= 500) {
    console.error("[domains-api] request failed", payload);
    return;
  }

  console.warn("[domains-api] request rejected", payload);
}

export function handleDomainRouteFailure(
  error: unknown,
  context: DomainRouteContext,
) {
  if (error && typeof error === "object" && "_tag" in error) {
    const response = handleDomainError(error as DomainRouteError);
    logDomainRouteFailure(context, error, response.status);
    return response;
  }

  logDomainRouteFailure(context, error, 500);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function readDomainContextValue(value: unknown) {
  return readOptionalString(value);
}
