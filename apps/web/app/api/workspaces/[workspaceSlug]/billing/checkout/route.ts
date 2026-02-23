import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleBillingError } from "~/billing/billing.errors";
import {
  decodeBillingCheckoutInput,
  decodeBillingWorkspaceSlugParams,
} from "~/billing/billing.schema";
import { BillingService } from "~/billing/billing.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
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

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const paramsInput = yield* decodeBillingWorkspaceSlugParams(rawParams);
    const input = yield* decodeBillingCheckoutInput(rawBody);

    return yield* BillingService.createCheckoutSession({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      userEmail:
        typeof session.user.email === "string" ? session.user.email : null,
      userName:
        typeof session.user.name === "string" ? session.user.name : null,
      planKey: input.planKey,
      billingCycle: input.billingCycle,
    });
  }).pipe(
    Effect.match({
      onSuccess: (result) => NextResponse.json(result, { status: 201 }),
      onFailure: handleBillingError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
