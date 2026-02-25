import { Layer, ManagedRuntime } from "effect";

import { BillingService } from "~/billing/billing.service";
import { DomainsService } from "~/domains/domains.service";
import { FeedbackService } from "~/feedback/feedback.service";
import { OAuthHandoffService } from "~/oauth-handoff/oauth-handoff.service";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";

const AppLayer = Layer.mergeAll(
  BillingService.Default,
  FeedbackService.Default,
  DomainsService.Default,
  OAuthHandoffService.Default,
  WorkspaceMembersService.Default,
);

export const appRuntime = ManagedRuntime.make(AppLayer);
