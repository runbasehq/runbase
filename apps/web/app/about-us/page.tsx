import Link from "next/link";
import type { Metadata } from "next";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { createPageMetadata } from "@/lib/seo";
import { SiteFooter } from "~/marketing/components/site-footer";

export const metadata: Metadata = createPageMetadata({
  title: "About Runbase",
  description:
    "Learn the Runbase feedback manifesto and how we help teams ship faster with focused feedback workflows.",
  path: "/about-us",
  keywords: [
    "about runbase",
    "feedback manifesto",
    "product feedback workflow",
    "customer feedback loop",
    "runbase founders",
  ],
});

export default function AboutUsPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center text-black">
            <RunbaseLogo className="h-[24px] w-auto md:h-[26px]" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-black/64 transition-colors hover:text-black"
          >
            Back to home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(110%_80%_at_5%_0%,rgba(205,255,41,0.24)_0%,rgba(205,255,41,0)_52%),radial-gradient(95%_70%_at_95%_85%,rgba(255,123,203,0.22)_0%,rgba(255,123,203,0)_58%)]"
        />
        <div className="relative mx-auto w-full max-w-[1240px] px-6 py-16 md:px-8 md:py-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/56">
            About Runbase
          </p>
          <h1 className="mt-4 max-w-[860px] text-balance text-[36px] font-medium leading-[1.06] tracking-[-0.03em] md:text-[58px]">
            Focused feedback workflows for teams that ship.
          </h1>
          <p className="mt-6 max-w-[820px] text-[16px] leading-[1.55] text-black/70 md:text-[20px]">
            Runbase started with one idea: product teams need a single place to
            collect feedback, prioritize work, and publish updates without
            paying per-seat complexity tax.
          </p>
        </div>
      </section>

      <section className="border-t border-black/10">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-14 md:px-8 md:py-16">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/56">
            Feedback Manifesto
          </h2>

          <div className="mt-6 max-w-[980px] space-y-5">
            <p className="text-[20px] leading-[1.38] tracking-[-0.02em] text-black md:text-[30px]">
              Build support and feedback workflows without slowing down.
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              Keep your support inbox, roadmap feedback, and product updates in
              one focused workspace.
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              Collect requests, prioritize with AI summaries and statuses, and
              publish roadmap plus changelog updates from one workflow.
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              Focus on shipping product. We handle the feedback loop.
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              Feedback is a gift. Negative feedback is also a gift. We treat
              both with the same standard: clear context, fast triage, visible
              ownership, and a concrete next step.
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              The best ideas do not only come from inside the team. They come
              from users who care enough to be candid. Our job is to make that
              signal easy to capture, impossible to ignore, and simple to act
              on.
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              Listening is not enough. Feedback becomes useful only when it is
              connected to prioritization, status, and communication. Every
              request should have a place in the system, even when the answer is
              &quot;not now.&quot;
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              We believe in one repeatable loop: collect, synthesize, decide,
              ship, communicate, and listen again. This keeps teams close to
              customers without drowning in tool sprawl.
            </p>
            <p className="text-[16px] leading-[1.65] text-black/74 md:text-[19px]">
              Feedback can expand forever, but focus wins. We help teams keep
              the loop tight so product quality improves every cycle and
              execution speed stays high.
            </p>
          </div>

          <div className="mt-12 border-t border-black/10 pt-8">
            <p className="text-[19px] font-medium tracking-[-0.015em] text-black md:text-[24px]">
              Francisco Veiras & Jeremias Soruco
            </p>
            <p className="mt-2 text-[15px] leading-[1.5] text-black/62 md:text-[17px]">
              Co-founders, Runbase
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
