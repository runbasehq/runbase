import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { handleWorkspaceThemeError } from "~/workspace-theme/workspace-theme.errors";
import {
  decodeWorkspaceThemeSlugParams,
  decodeWorkspaceThemeUpdateInput,
} from "~/workspace-theme/workspace-theme.schema";
import { WorkspaceThemeService } from "~/workspace-theme/workspace-theme.service";
import { revalidateWorkspaceThemeCache } from "~/workspace-theme/server/workspace-theme-cache";

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
    const paramsInput = yield* decodeWorkspaceThemeSlugParams(rawParams);

    return yield* WorkspaceThemeService.getThemeForWorkspaceMember({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
    });
  }).pipe(
    Effect.match({
      onSuccess: (snapshot) => NextResponse.json(snapshot),
      onFailure: handleWorkspaceThemeError,
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
    const paramsInput = yield* decodeWorkspaceThemeSlugParams(rawParams);
    const bodyInput = yield* decodeWorkspaceThemeUpdateInput(rawBody);

    return yield* WorkspaceThemeService.updateThemeForWorkspaceMember({
      workspaceSlug: paramsInput.workspaceSlug,
      userId: session.user.id,
      theme: bodyInput.theme,
    });
  }).pipe(
    Effect.match({
      onSuccess: (snapshot) => {
        revalidateWorkspaceThemeCache(snapshot.workspaceSlug);
        return NextResponse.json(snapshot);
      },
      onFailure: handleWorkspaceThemeError,
    }),
  );

  return appRuntime.runPromise(
    program as Effect.Effect<NextResponse, never, never>,
  );
}
