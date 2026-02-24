import "server-only";

import { Effect } from "effect";
import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth";
import { appRuntime } from "@/lib/runtime";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { FeedbackService } from "~/feedback/feedback.service";
import {
  FEEDBACK_ANON_COOKIE,
  getAnonCookieForSync,
  syncAnonymousVotesOnAuthenticatedRequest,
} from "~/feedback/lib/vote-sync";

export async function getPublicFeedbackPageData(subdomain: string) {
  const foundWorkspace = await getWorkspaceBySlug(subdomain);

  if (!foundWorkspace) {
    return null;
  }

  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const anonCookie = cookieStore.get(FEEDBACK_ANON_COOKIE)?.value ?? null;
  const anonSessionId = getAnonCookieForSync(anonCookie);

  const snapshot = await appRuntime.runPromise(
    Effect.gen(function* () {
      yield* syncAnonymousVotesOnAuthenticatedRequest({
        workspaceId: foundWorkspace.id,
        userId: session?.user?.id,
        anonSessionId,
      });

      return yield* FeedbackService.getPublicSnapshot({
        workspaceId: foundWorkspace.id,
        userId: session?.user?.id ?? null,
        anonSessionId,
      });
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed({
          boards: [],
          statuses: [],
          posts: [],
        }),
      ),
    ),
  );

  const defaultBoard = snapshot.boards[0]
    ? { id: snapshot.boards[0].id, name: snapshot.boards[0].name }
    : null;
  const defaultStatus = snapshot.statuses[0]
    ? {
        id: snapshot.statuses[0].id,
        key: snapshot.statuses[0].key,
        label: snapshot.statuses[0].label,
      }
    : null;

  const githubAuthEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );

  return {
    workspaceSlug: foundWorkspace.slug,
    workspaceName: foundWorkspace.name,
    initialPosts: snapshot.posts,
    isAuthenticated: Boolean(session?.user),
    githubAuthEnabled,
    defaultBoard,
    defaultStatus,
  };
}
