import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleFeedbackError } from "~/feedback/feedback.errors";
import {
  decodeFeedbackWorkspaceSlugParams,
  decodeUpdateFeedbackPublicSettingsInput,
} from "~/feedback/feedback.schema";
import { FeedbackService } from "~/feedback/feedback.service";

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
    const paramsInput = yield* decodeFeedbackWorkspaceSlugParams(rawParams);
    return yield* FeedbackService.getSettingsSnapshotForWorkspaceMember({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
    });
  }).pipe(
    Effect.match({
      onSuccess: (snapshot) => NextResponse.json(snapshot),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
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
    const paramsInput = yield* decodeFeedbackWorkspaceSlugParams(rawParams);
    const input = yield* decodeUpdateFeedbackPublicSettingsInput(rawBody);

    const settings =
      yield* FeedbackService.updatePublicSettingsForWorkspaceAdmin({
        workspaceSlug: paramsInput.workspaceSlug,
        userId: session.user.id,
        input,
      });

    return { settings };
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
