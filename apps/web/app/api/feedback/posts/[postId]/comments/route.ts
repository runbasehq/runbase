import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { resolveWorkspaceFromHeaders } from "~/domains/lib/workspace-resolver";
import { handleFeedbackError } from "~/feedback/feedback.errors";
import { decodeCreateFeedbackCommentInput } from "~/feedback/feedback.schema";
import { FeedbackService } from "~/feedback/feedback.service";
import {
  FEEDBACK_ANON_COOKIE,
  getAnonCookieForSync,
  syncAnonymousVotesOnAuthenticatedRequest,
} from "~/feedback/lib/vote-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const workspace = await resolveWorkspaceFromHeaders(request.headers);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const program = FeedbackService.listPublicComments({
    workspaceId: workspace.id,
    postId,
  }).pipe(
    Effect.match({
      onSuccess: (comments) => NextResponse.json({ comments }),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(program);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const workspace = await resolveWorkspaceFromHeaders(request.headers);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const anonCookie = request.cookies.get(FEEDBACK_ANON_COOKIE)?.value ?? null;
  const validAnonSessionId = getAnonCookieForSync(anonCookie);

  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be signed in to comment" },
      { status: 401 },
    );
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

  const program = Effect.gen(function* () {
    yield* syncAnonymousVotesOnAuthenticatedRequest({
      workspaceId: workspace.id,
      userId: session.user.id,
      anonSessionId: validAnonSessionId,
    });

    const input = yield* decodeCreateFeedbackCommentInput(rawBody);
    return yield* FeedbackService.createComment({
      workspaceId: workspace.id,
      postId,
      authorUserId: session.user.id,
      input,
    });
  }).pipe(
    Effect.match({
      onSuccess: (comment) => NextResponse.json({ comment }, { status: 201 }),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(program);
}
