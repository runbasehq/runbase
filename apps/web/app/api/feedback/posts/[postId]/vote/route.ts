import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getWorkspaceFromHeaders } from "@/lib/workspaces";
import {
  enforceVotePerPostRateLimit,
  enforceVoteRateLimit,
} from "~/feedback/lib/rate-limit";
import {
  getAnonVoteCookieConfig,
  getAnonVoteSession,
} from "~/feedback/lib/vote-session";
import type { VoteIdentity } from "~/feedback/lib/types";
import { unvoteForPost, voteForPost } from "~/feedback/lib/vote-service";

function getClientIp(request: NextRequest) {
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
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const workspace = await getWorkspaceFromHeaders(request.headers);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const ip = getClientIp(request);

  const [workspaceLimit, postLimit] = await Promise.all([
    enforceVoteRateLimit(workspace.id, ip),
    enforceVotePerPostRateLimit(workspace.id, ip, postId),
  ]);

  if (!workspaceLimit.success || !postLimit.success) {
    return NextResponse.json(
      {
        error: "Too many votes",
        workspaceRemaining: workspaceLimit.remaining,
        postRemaining: postLimit.remaining,
      },
      { status: 429 },
    );
  }

  const anonSession = session?.user
    ? { anonSessionId: null, isNew: false }
    : getAnonVoteSession(request);
  const identity: VoteIdentity = session?.user
    ? { userId: session.user.id, anonSessionId: null }
    : { userId: null, anonSessionId: anonSession.anonSessionId! };

  const result = await voteForPost({
    workspaceId: workspace.id,
    postId,
    identity,
  });

  if (!result) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const response = NextResponse.json(result, {
    status: result.alreadyVoted ? 200 : 201,
  });

  return withAnonCookie(response, anonSession.anonSessionId, !session?.user);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const workspace = await getWorkspaceFromHeaders(request.headers);

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

  const result = await unvoteForPost({
    workspaceId: workspace.id,
    postId,
    identity,
  });

  if (!result) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const response = NextResponse.json(result);
  return withAnonCookie(response, anonSession.anonSessionId, !session?.user);
}
