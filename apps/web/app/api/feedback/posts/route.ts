import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getWorkspaceFromHeaders } from "@/lib/workspaces";
import { getFeedbackSnapshot } from "~/feedback";
import {
  CreateFeedbackPostError,
  createFeedbackPost,
} from "~/feedback/lib/services/create-feedback-post";
import {
  FEEDBACK_ANON_COOKIE,
  isValidAnonSessionId,
} from "~/feedback/lib/vote-session";
import { parseCreateFeedbackPostInput } from "~/feedback/schemas/create-feedback-post";

export async function GET(request: NextRequest) {
  const workspace = await getWorkspaceFromHeaders(request.headers);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const anonCookie = request.cookies.get(FEEDBACK_ANON_COOKIE)?.value ?? null;

  const snapshot = await getFeedbackSnapshot({
    workspaceId: workspace.id,
    userId: session?.user?.id ?? null,
    anonSessionId: isValidAnonSessionId(anonCookie) ? anonCookie : null,
  });

  return NextResponse.json({ posts: snapshot.posts });
}

export async function POST(request: NextRequest) {
  const workspace = await getWorkspaceFromHeaders(request.headers);

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { data, error } = parseCreateFeedbackPostInput(body);

  if (error || !data) {
    return NextResponse.json(
      { error: error || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const post = await createFeedbackPost({
      workspaceId: workspace.id,
      authorUserId: session.user.id,
      input: data,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (createError) {
    if (createError instanceof CreateFeedbackPostError) {
      return NextResponse.json(
        { error: createError.message },
        { status: createError.status },
      );
    }

    throw createError;
  }
}
