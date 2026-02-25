import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleFeedbackError } from "~/feedback/feedback.errors";
import {
  decodeFeedbackBoardParams,
  decodeUpdateFeedbackBoardInput,
} from "~/feedback/feedback.schema";
import { FeedbackService } from "~/feedback/feedback.service";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; boardId: string }>;
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
    const paramsInput = yield* decodeFeedbackBoardParams(rawParams);
    const input = yield* decodeUpdateFeedbackBoardInput(rawBody);

    const board = yield* FeedbackService.updateBoardForWorkspaceAdmin({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      boardId: paramsInput.boardId,
      input,
    });

    return { board };
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
    params: Promise<{ workspaceSlug: string; boardId: string }>;
  },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

  const program = Effect.gen(function* () {
    const paramsInput = yield* decodeFeedbackBoardParams(rawParams);
    const deleted = yield* FeedbackService.deleteBoardForWorkspaceAdmin({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      boardId: paramsInput.boardId,
    });

    return {
      success: true as const,
      boardId: deleted.boardId,
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
