import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceThemeError } from "~/workspace-theme/workspace-theme.errors";
import {
  decodeWorkspaceThemeMediaUploadInput,
  decodeWorkspaceThemeSlugParams,
} from "~/workspace-theme/workspace-theme.schema";
import { WorkspaceThemeService } from "~/workspace-theme/workspace-theme.service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = await params;

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
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const mediaType = typeof mediaTypeRaw === "string" ? mediaTypeRaw : "";

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
    const paramsInput = yield* decodeWorkspaceThemeSlugParams(rawParams);
    const input = yield* decodeWorkspaceThemeMediaUploadInput({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      mediaType,
    });

    return yield* WorkspaceThemeService.uploadThemeMediaForWorkspaceMember({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      input,
      bytes,
    });
  }).pipe(
    Effect.match({
      onSuccess: (media) => NextResponse.json({ media }, { status: 201 }),
      onFailure: handleWorkspaceThemeError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
