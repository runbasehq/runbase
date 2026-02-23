import { NextRequest, NextResponse } from "next/server";
import { Effect } from "effect";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { resolveWorkspaceFromHeaders } from "~/domains/lib/workspace-resolver";
import { handleFeedbackError } from "~/feedback/feedback.errors";
import { decodeCreateFeedbackPostInput } from "~/feedback/feedback.schema";
import { FeedbackService } from "~/feedback/feedback.service";
import {
  FEEDBACK_ANON_COOKIE,
  isValidAnonSessionId,
} from "~/feedback/lib/vote-session";

export async function GET(request: NextRequest) {
  const workspace = await resolveWorkspaceFromHeaders(request.headers);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const anonCookie = request.cookies.get(FEEDBACK_ANON_COOKIE)?.value ?? null;

  const program = FeedbackService.getSnapshot({
    workspaceId: workspace.id,
    userId: session?.user?.id ?? null,
    anonSessionId: isValidAnonSessionId(anonCookie) ? anonCookie : null,
  }).pipe(
    Effect.match({
      onSuccess: (snapshot) => NextResponse.json({ posts: snapshot.posts }),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(program);
}

export async function POST(request: NextRequest) {
  const workspace = await resolveWorkspaceFromHeaders(request.headers);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be signed in to create a post" },
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
    const input = yield* decodeCreateFeedbackPostInput(rawBody);
    return yield* FeedbackService.createPost({
      workspaceId: workspace.id,
      authorUserId: session.user.id,
      input,
    });
  }).pipe(
    Effect.match({
      onSuccess: (post) => NextResponse.json({ post }, { status: 201 }),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(program);
}
