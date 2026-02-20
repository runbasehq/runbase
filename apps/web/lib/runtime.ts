import { Layer, ManagedRuntime } from "effect";

import { FeedbackService } from "~/feedback/feedback.service";

const AppLayer = Layer.mergeAll(FeedbackService.Default);

export const appRuntime = ManagedRuntime.make(AppLayer);
