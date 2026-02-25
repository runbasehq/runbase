import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleFeedbackError } from "~/feedback/feedback.errors";
import {
  decodeFeedbackStatusParams,
  decodeUpdateFeedbackStatusInput,
} from "~/feedback/feedback.schema";
import { FeedbackService } from "~/feedback/feedback.service";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; statusId: string }>;
  },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const program = Effect.gen(function* () {
    const paramsInput = yield* decodeFeedbackStatusParams(rawParams);
    const input = yield* decodeUpdateFeedbackStatusInput(rawBody);

    const status = yield* FeedbackService.updateStatusForWorkspaceAdmin({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      statusId: paramsInput.statusId,
      input,
    });

    return { status };
  }).pipe(
    Effect.match({
      onSuccess: (payload) => NextResponse.json(payload),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; statusId: string }>;
  },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const paramsInput = yield* decodeFeedbackStatusParams(rawParams);
    const deleted = yield* FeedbackService.deleteStatusForWorkspaceAdmin({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      statusId: paramsInput.statusId,
    });

    return {
      success: true as const,
      statusId: deleted.statusId,
    };
  }).pipe(
    Effect.match({
      onSuccess: (payload) => NextResponse.json(payload),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
