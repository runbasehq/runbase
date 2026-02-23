import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import {
  handleDomainRouteFailure,
  readDomainBodyField,
} from "~/domains/lib/domain-route-logging";
import { decodeDomainManagementInput } from "~/domains/domains.schema";
import { DomainsService } from "~/domains/domains.service";

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

    return yield* DomainsService.verifyDomain({
      workspaceSlug: input.workspaceSlug,
      userId: session.user.id,
      domain: input.domain,
    });
  }).pipe(
    Effect.match({
      onSuccess: (domain) => NextResponse.json({ domain }),
      onFailure: (error) =>
        handleDomainRouteFailure(error, {
          route: "/api/domains/verify",
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
