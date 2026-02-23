import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { handleFeedbackError } from "~/feedback/feedback.errors";
import type { VoteIdentity } from "~/feedback/lib/types";
import {
  getAnonVoteCookieConfig,
  getAnonVoteSession,
} from "~/feedback/lib/vote-session";
import { FeedbackService } from "~/feedback/feedback.service";

function getClientIp(request: NextRequest) {
  if (process.env.TRUST_PROXY_HEADERS !== "true") {
    return "unknown";
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function withAnonCookie(
  response: NextResponse,
  anonSessionId: string | null,
  shouldSetCookie: boolean,
) {
  if (!anonSessionId || !shouldSetCookie) {
    return response;
  }

  const cookie = getAnonVoteCookieConfig();
  response.cookies.set({ ...cookie, value: anonSessionId });
  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; postId: string }> },
) {
  const { workspaceSlug, postId } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const ip = getClientIp(request);

  const anonSession = session?.user
    ? { anonSessionId: null, isNew: false }
    : getAnonVoteSession(request);
  const identity: VoteIdentity = session?.user
    ? { userId: session.user.id, anonSessionId: null }
    : { userId: null, anonSessionId: anonSession.anonSessionId! };

  const program = FeedbackService.voteForPost({
    workspaceId: workspace.id,
    postId,
    identity,
    ip,
  }).pipe(
    Effect.match({
      onSuccess: (result) => {
        const response = NextResponse.json(result, {
          status: result.alreadyVoted ? 200 : 201,
        });

        return withAnonCookie(
          response,
          anonSession.anonSessionId,
          !session?.user,
        );
      },
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(program);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; postId: string }> },
) {
  const { workspaceSlug, postId } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const anonSession = session?.user
    ? { anonSessionId: null, isNew: false }
    : getAnonVoteSession(request);
  const identity: VoteIdentity = session?.user
    ? { userId: session.user.id, anonSessionId: null }
    : { userId: null, anonSessionId: anonSession.anonSessionId! };

  const program = FeedbackService.unvoteForPost({
    workspaceId: workspace.id,
    postId,
    identity,
  }).pipe(
    Effect.match({
      onSuccess: (result) => {
        const response = NextResponse.json(result);
        return withAnonCookie(
          response,
          anonSession.anonSessionId,
          !session?.user,
        );
      },
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(program);
}
