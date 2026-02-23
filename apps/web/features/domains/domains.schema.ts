import { Effect, Schema } from "effect";

import { rootDomain } from "@/lib/utils";
import { validateWorkspaceSlug } from "~/workspace/schemas/workspace-slug";

import { DomainInvalidInput } from "./domains.errors";

const DomainManagementBodySchema = Schema.Struct({
  workspaceSlug: Schema.String,
  domain: Schema.String,
});

const DomainListQuerySchema = Schema.Struct({
  workspaceSlug: Schema.String,
});

const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?!.*\.\.)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

const RESERVED_SUFFIXES = [".vercel.app"];

function normalizeDomainInput(value: string) {
  const trimmed = value.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? "";
  const withoutQuery = withoutPath.split("?")[0] ?? "";
  const withoutHash = withoutQuery.split("#")[0] ?? "";

  return withoutHash.replace(/\.$/, "");
}

function validateDomain(input: string): string | null {
  if (!input) {
    return "Domain is required";
  }

  if (input.startsWith("*.")) {
    return "Wildcard domains are not supported";
  }

  if (input.includes(":")) {
    return "Domain must not include a port";
  }

  if (!DOMAIN_PATTERN.test(input)) {
    return "Enter a valid domain (for example, feedback.example.com)";
  }

  const rootHostname = rootDomain.split(":")[0]?.toLowerCase() ?? "";

  if (
    rootHostname &&
    (input === rootHostname || input.endsWith(`.${rootHostname}`))
  ) {
    return "Use your workspace subdomain for the root domain";
  }

  if (RESERVED_SUFFIXES.some((suffix) => input.endsWith(suffix))) {
    return "This domain suffix is reserved";
  }

  return null;
}

function validateWorkspaceSlugInput(workspaceSlug: string) {
  const normalizedWorkspaceSlug = workspaceSlug.trim().toLowerCase();
  const slugError = validateWorkspaceSlug(normalizedWorkspaceSlug);

  if (slugError) {
    return {
      value: null,
      error: slugError,
    };
  }

  return {
    value: normalizedWorkspaceSlug,
    error: null,
  };
}

export interface DomainManagementInput {
  workspaceSlug: string;
  domain: string;
}

export interface DomainListInput {
  workspaceSlug: string;
}

export const decodeDomainManagementInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(DomainManagementBodySchema)(raw);

    const { value: workspaceSlug, error: workspaceSlugError } =
      validateWorkspaceSlugInput(decoded.workspaceSlug);

    if (workspaceSlugError || !workspaceSlug) {
      return yield* new DomainInvalidInput({
        message: workspaceSlugError || "Workspace URL is required",
      });
    }

    const domain = normalizeDomainInput(decoded.domain);
    const domainError = validateDomain(domain);

    if (domainError) {
      return yield* new DomainInvalidInput({ message: domainError });
    }

    return {
      workspaceSlug,
      domain,
    } satisfies DomainManagementInput;
  });

export const decodeDomainListInput = (raw: unknown) =>
  Effect.gen(function* () {
    const decoded = yield* Schema.decodeUnknown(DomainListQuerySchema)(raw);

    const { value: workspaceSlug, error: workspaceSlugError } =
      validateWorkspaceSlugInput(decoded.workspaceSlug);

    if (workspaceSlugError || !workspaceSlug) {
      return yield* new DomainInvalidInput({
        message: workspaceSlugError || "Workspace URL is required",
      });
    }

    return {
      workspaceSlug,
    } satisfies DomainListInput;
  });
