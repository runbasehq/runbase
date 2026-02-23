import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import {
  type DomainRouteError,
  handleDomainError,
} from "~/domains/domains.errors";
import {
  decodeDomainListInput,
  decodeDomainManagementInput,
} from "~/domains/domains.schema";
import { DomainsService } from "~/domains/domains.service";

function handleUnknownDomainError(error: unknown) {
  if (error && typeof error === "object" && "_tag" in error) {
    return handleDomainError(error as DomainRouteError);
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawQuery = {
    workspaceSlug: request.nextUrl.searchParams.get("workspaceSlug") ?? "",
  };

  const program = Effect.gen(function* () {
    const input = yield* decodeDomainListInput(rawQuery);

    return yield* DomainsService.listDomains({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
    });
  }).pipe(
    Effect.match({
      onSuccess: (domains) => NextResponse.json({ domains }),
      onFailure: handleUnknownDomainError,
    }),
  );

  const response = await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
  return response as NextResponse;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const program = Effect.gen(function* () {
    const input = yield* decodeDomainManagementInput(rawBody);

    return yield* DomainsService.addDomain({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
      domain: input.domain,
    });
  }).pipe(
    Effect.match({
      onSuccess: (domain) => NextResponse.json({ domain }, { status: 201 }),
      onFailure: handleUnknownDomainError,
    }),
  );

  const response = await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
  return response as NextResponse;
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const program = Effect.gen(function* () {
    const input = yield* decodeDomainManagementInput(rawBody);

    return yield* DomainsService.removeDomain({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
      domain: input.domain,
    });
  }).pipe(
    Effect.match({
      onSuccess: ({ domain }) => NextResponse.json({ success: true, domain }),
      onFailure: handleUnknownDomainError,
    }),
  );

  const response = await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
  return response as NextResponse;
}
