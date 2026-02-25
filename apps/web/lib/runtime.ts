import { Layer, ManagedRuntime } from "effect";

import { BillingService } from "~/billing/billing.service";
import { DomainsService } from "~/domains/domains.service";
import { FeedbackService } from "~/feedback/feedback.service";
import { WorkspaceMembersService } from "~/workspace-members/workspace-members.service";
import { WorkspaceThemeService } from "~/workspace-theme/workspace-theme.service";

const AppLayer = Layer.mergeAll(
  BillingService.Default,
  FeedbackService.Default,
  DomainsService.Default,
  WorkspaceMembersService.Default,
  WorkspaceThemeService.Default,
);

export const appRuntime = ManagedRuntime.make(AppLayer);
