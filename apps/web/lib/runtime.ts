import { Layer, ManagedRuntime } from "effect";

import { DomainsService } from "~/domains/domains.service";
import { FeedbackService } from "~/feedback/feedback.service";

const AppLayer = Layer.mergeAll(FeedbackService.Default, DomainsService.Default);

export const appRuntime = ManagedRuntime.make(AppLayer);
