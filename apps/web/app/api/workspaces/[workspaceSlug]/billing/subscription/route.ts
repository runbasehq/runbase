import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleBillingError } from "~/billing/billing.errors";
import { decodeBillingWorkspaceSlugParams } from "~/billing/billing.schema";
import { BillingService } from "~/billing/billing.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const paramsInput = yield* decodeBillingWorkspaceSlugParams(rawParams);

    return yield* BillingService.getWorkspaceSubscription({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
    });
  }).pipe(
    Effect.match({
      onSuccess: (result) => NextResponse.json(result),
      onFailure: handleBillingError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
