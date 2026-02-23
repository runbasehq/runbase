import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import {
  handleDomainRouteFailure,
  readDomainBodyField,
  readDomainContextValue,
} from "~/domains/lib/domain-route-logging";
import {
  decodeDomainListInput,
  decodeDomainManagementInput,
} from "~/domains/domains.schema";
import { DomainsService } from "~/domains/domains.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawQuery = {
    workspaceSlug: request.nextUrl.searchParams.get("workspaceSlug") ?? "",
  };

  const workspaceSlug = readDomainContextValue(rawQuery.workspaceSlug);

  const program = Effect.gen(function* () {
    const input = yield* decodeDomainListInput(rawQuery);

    return yield* DomainsService.listDomains({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
    });
  }).pipe(
    Effect.match({
      onSuccess: (domains) => NextResponse.json({ domains }),
      onFailure: (error) =>
        handleDomainRouteFailure(error, {
          route: "/api/domains",
          method: "GET",
          userId: session.user.id,
          workspaceSlug,
        }),
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
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const workspaceSlug = readDomainBodyField(rawBody, "workspaceSlug");
  const domain = readDomainBodyField(rawBody, "domain");

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
      onFailure: (error) =>
        handleDomainRouteFailure(error, {
          route: "/api/domains",
          method: "POST",
          userId: session.user.id,
          workspaceSlug,
          domain,
        }),
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
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const workspaceSlug = readDomainBodyField(rawBody, "workspaceSlug");
  const domain = readDomainBodyField(rawBody, "domain");

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
      onFailure: (error) =>
        handleDomainRouteFailure(error, {
          route: "/api/domains",
          method: "DELETE",
          userId: session.user.id,
          workspaceSlug,
          domain,
        }),
    }),
  );

  const response = await appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
  return response as NextResponse;
}
