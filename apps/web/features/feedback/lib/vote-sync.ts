import { Effect } from "effect";

import { FEEDBACK_ANON_COOKIE, isValidAnonSessionId } from "./vote-session";
import { FeedbackService } from "../feedback.service";

export function getAnonCookieForSync(raw: string | null | undefined) {
  return isValidAnonSessionId(raw) ? raw : null;
}

export function syncAnonymousVotesOnAuthenticatedRequest(input: {
  workspaceId: string;
  userId: string | null | undefined;
  anonSessionId: string | null;
}) {
  if (!input.userId || !input.anonSessionId) {
    return Effect.succeed({ claimedCount: 0 });
  }

  return FeedbackService.claimAnonymousVotes({
    workspaceId: input.workspaceId,
    userId: input.userId,
    anonSessionId: input.anonSessionId,
  });
}

export { FEEDBACK_ANON_COOKIE };
