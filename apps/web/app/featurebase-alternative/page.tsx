import Link from "next/link";
import type { Metadata } from "next";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { FancyButtonRoot } from "@/components/ui/fancy-button";
import { createPageMetadata } from "@/lib/seo";
import { SiteFooter } from "~/marketing/components/site-footer";

export const metadata: Metadata = createPageMetadata({
  title: "Featurebase Alternative",
  description:
    "Runbase is an open-source Featurebase alternative with predictable pricing, focused feedback workflows, and fast product update publishing.",
  path: "/featurebase-alternative",
  keywords: [
    "featurebase alternative",
    "open source featurebase alternative",
    "feedback tool without seat pricing",
    "roadmap and changelog software",
    "runbase vs featurebase",
  ],
});

const faqSchema = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Runbase open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Runbase has an open-source edition you can self-host.",
      },
    },
    {
      "@type": "Question",
      name: "Does Runbase force expensive seat-based pricing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Runbase focuses on transparent pricing with included seats, clear overages, and a free open-source self-hosted option.",
      },
    },
    {
      "@type": "Question",
      name: "What makes Runbase a Featurebase alternative?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Runbase combines feedback collection, roadmap prioritization, and changelog publishing in one workflow, with an open-source path and predictable pricing.",
      },
    },
  ],
});

export default function FeaturebaseAlternativePage() {
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

      <section className="relative overflow-hidden border-b border-black/10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqSchema }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(110%_80%_at_5%_0%,rgba(205,255,41,0.24)_0%,rgba(205,255,41,0)_52%),radial-gradient(95%_70%_at_95%_85%,rgba(255,123,203,0.22)_0%,rgba(255,123,203,0)_58%)]"
        />
        <div className="relative mx-auto w-full max-w-[1240px] px-6 py-16 md:px-8 md:py-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/56">
            Featurebase Alternative
          </p>
          <h1 className="mt-4 max-w-[980px] text-balance text-[38px] font-medium leading-[1.05] tracking-[-0.03em] md:text-[60px]">
            Runbase is the open-source alternative built for teams that ship.
          </h1>
          <p className="mt-6 max-w-[860px] text-[17px] leading-[1.56] text-black/72 md:text-[22px]">
            Collect feedback, prioritize roadmap decisions, and publish
            changelog updates from one focused workflow, without absurd seat
            pricing pressure.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <FancyButtonRoot asChild size="small" variant="primary">
              <Link href="/sign-up">Start free trial</Link>
            </FancyButtonRoot>
            <FancyButtonRoot asChild size="small" variant="basic">
              <Link
                href="https://github.com/jeresrc/runbase"
                target="_blank"
                rel="noreferrer noopener"
              >
                View open source
              </Link>
            </FancyButtonRoot>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10">
        <div className="mx-auto grid w-full max-w-[1240px] gap-0 px-6 py-12 md:px-8 md:py-14 lg:grid-cols-2">
          <article className="border-b border-black/10 py-6 lg:border-b-0 lg:border-r lg:pr-8">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/56">
              Why teams switch to Runbase
            </h2>
            <ul className="mt-5 space-y-3 text-[16px] leading-[1.6] text-black/76 md:text-[18px]">
              <li>Open-source edition you can self-host in your own infra.</li>
              <li>Pricing with included seats and clear overages.</li>
              <li>One system for feedback board, roadmap, and changelog.</li>
              <li>Fast setup for product and support teams.</li>
            </ul>
          </article>

          <article className="py-6 lg:pl-8">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/56">
              What we optimize for
            </h2>
            <ul className="mt-5 space-y-3 text-[16px] leading-[1.6] text-black/76 md:text-[18px]">
              <li>Clear ownership of every request and feedback thread.</li>
              <li>Prioritization with status visibility for your users.</li>
              <li>Shipping updates fast without tool sprawl.</li>
              <li>Predictable economics as your team grows.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="border-b border-black/10">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-12 md:px-8 md:py-14">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/56">
            Quick FAQ
          </h2>
          <div className="mt-6 max-w-[900px] space-y-6">
            <article>
              <h3 className="text-[20px] font-semibold tracking-[-0.02em] md:text-[24px]">
                Is Runbase open source?
              </h3>
              <p className="mt-2 text-[16px] leading-[1.62] text-black/72 md:text-[18px]">
                Yes. You can self-host Runbase using the open-source edition.
              </p>
            </article>
            <article>
              <h3 className="text-[20px] font-semibold tracking-[-0.02em] md:text-[24px]">
                Does pricing depend entirely on seat count?
              </h3>
              <p className="mt-2 text-[16px] leading-[1.62] text-black/72 md:text-[18px]">
                No. Runbase plans include seats and provide explicit overages, so
                costs stay understandable as your team grows.
              </p>
            </article>
            <article>
              <h3 className="text-[20px] font-semibold tracking-[-0.02em] md:text-[24px]">
                Can I replace my current feedback + roadmap + changelog stack?
              </h3>
              <p className="mt-2 text-[16px] leading-[1.62] text-black/72 md:text-[18px]">
                That is exactly what Runbase is designed for: one focused
                workflow from inbound feedback to shipped updates.
              </p>
            </article>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
