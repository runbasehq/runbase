import { Layer, ManagedRuntime } from "effect";

import { DomainsService } from "~/domains/domains.service";
import { FeedbackService } from "~/feedback/feedback.service";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

const AppLayer = Layer.mergeAll(
  FeedbackService.Default,
  DomainsService.Default,
  WorkspaceMembersService.Default,
);

export const appRuntime = ManagedRuntime.make(AppLayer);
