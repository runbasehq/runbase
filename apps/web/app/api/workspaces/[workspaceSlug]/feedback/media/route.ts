import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { handleFeedbackError } from "~/feedback/feedback.errors";
import { decodeUploadFeedbackMediaInput } from "~/feedback/feedback.schema";
import { FeedbackService } from "~/feedback/feedback.service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be signed in to upload media" },
      { status: 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form-data payload" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const mediaTypeRaw = formData.get("mediaType");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "File is required" },
      { status: 400 },
    );
  }

  const mediaType = typeof mediaTypeRaw === "string" ? mediaTypeRaw : "attachment";

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "Could not read uploaded file" },
      { status: 400 },
    );
  }

  const program = Effect.gen(function* () {
    const input = yield* decodeUploadFeedbackMediaInput({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      mediaType,
    });

    return yield* FeedbackService.uploadMedia({
      workspaceId: workspace.id,
      authorUserId: session.user.id,
      input,
      bytes,
    });
  }).pipe(
    Effect.match({
      onSuccess: (media) => NextResponse.json({ media }, { status: 201 }),
      onFailure: handleFeedbackError,
    }),
  );

  return appRuntime.runPromise(program);
}
