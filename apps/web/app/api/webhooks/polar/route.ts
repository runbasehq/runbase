import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { appRuntime } from "@/lib/runtime";
import { handleBillingError } from "~/billing/billing.errors";
import { BillingService } from "~/billing/billing.service";

function headersToObject(headers: Headers) {
  const record: Record<string, string> = {};

  headers.forEach((value, key) => {
    record[key] = value;
  });

  return record;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = headersToObject(request.headers);

  const program = Effect.gen(function* () {
    return yield* BillingService.processPolarWebhook({
      rawBody,
      headers,
    });
  }).pipe(
    Effect.match({
      onSuccess: () => NextResponse.json({ ok: true }),
      onFailure: handleBillingError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
