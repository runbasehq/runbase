import Link from "next/link";
import type { Metadata } from "next";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { createPageMetadata } from "@/lib/seo";
import { FancyButtonRoot } from "@/components/ui/fancy-button";
import { HeroCompanyCta } from "~/marketing/components/hero-company-cta";
import { HeroMarquee } from "~/marketing/components/hero-marquee";
import { HowItWorksSection } from "~/marketing/components/how-it-works-section";
import { FeedbackSpotlightSection } from "~/marketing/components/feedback-spotlight-section";
import { FaqSection } from "~/marketing/components/faq-section";
import { PricingSection } from "~/marketing/components/pricing-section";
import { SiteFooter } from "~/marketing/components/site-footer";
import { ToolsCompatibilitySection } from "~/marketing/components/tools-compatibility-section";

export const metadata: Metadata = createPageMetadata({
  title: "Product feedback platform",
  description:
    "Collect feedback, prioritize roadmap, and publish changelog updates in one focused workflow.",
  path: "/",
  keywords: [
    "product feedback platform",
    "featurebase alternative",
    "open source feedback platform",
    "feedback tool no per-seat pricing",
    "feedback board",
    "roadmap management",
    "changelog software",
    "feature request tool",
    "customer feedback",
    "runbase",
  ],
});

export default function Page() {
  return (
    <main className="relative isolate overflow-x-hidden text-black [font-family:var(--font-sans),sans-serif]">
      <section
        id="features"
        className="relative scroll-mt-24 overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-0 before:content-[''] before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.72)_32%,rgba(255,255,255,0.34)_58%,rgba(255,255,255,0.06)_100%]"
      >
        <div aria-hidden className="absolute inset-0 -z-20 bg-white" />
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/landing-bg.png')] bg-cover bg-center bg-no-repeat translate-y-[34%]" />
          <div className="absolute inset-0 bg-[radial-gradient(100%_65%_at_82%_0%,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0)_72%)]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-1/4 -top-[14%] bottom-0 z-[1] opacity-90 mix-blend-lighten [mask-image:linear-gradient(to_top,#000_0%,#000_38%,transparent_69%)] [-webkit-mask-image:linear-gradient(to_top,#000_0%,#000_38%,transparent_69%)]"
        >
          <div className="landing-gradient-flow h-full w-full bg-[linear-gradient(-120deg,_#CDFF29_24%,_#FF9BE7_46%,_#FF45C7_76%,_#BF40FF_100%)] bg-[length:260%_260%]" />
        </div>

        <div className="relative z-10 flex h-[830px] flex-col md:h-[830px]">
          <div className="flex min-h-12 items-center bg-black px-4 py-2.5 text-white">
            <div className="mx-auto flex w-full max-w-[1240px] items-center justify-center">
              <span className="inline-block max-w-[980px] text-center text-[14px] font-medium leading-[145%] tracking-[0] text-white/95 md:text-[16px]">
                30-day trial for feedback board, prioritization, and changelog.{" "}
                <span className="bg-[linear-gradient(90deg,#CDFF29_0%,#BCFF7A_34%,#FF7BCB_74%,#FF5AAF_100%)] bg-clip-text text-transparent">
                  No absurd per-seat pricing.
                </span>
              </span>
            </div>
          </div>

          <header className="relative z-30 mt-4 bg-white/72 backdrop-blur-xl">
            <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[auto_1fr_auto] items-center px-6 py-3 md:px-8">
              <Link
                href="/"
                className="inline-flex w-fit items-center text-black"
                aria-label="Runbase home"
              >
                <RunbaseLogo className="h-[24px] w-auto md:h-[26px]" />
              </Link>

              <nav className="mx-auto hidden items-center gap-11 text-[14px] font-medium leading-none tracking-[0] text-black/72 md:flex">
                <Link
                  href="/#ideate"
                  className="transition-colors hover:text-black"
                >
                  How it works
                </Link>
                <Link
                  href="/#prioritize"
                  className="transition-colors hover:text-black"
                >
                  Integrations
                </Link>
                <Link
                  href="/#pricing"
                  className="transition-colors hover:text-black"
                >
                  Pricing
                </Link>
                <Link
                  href="/#deliver"
                  className="transition-colors hover:text-black"
                >
                  FAQ
                </Link>
              </nav>

              <div className="flex items-center gap-5 justify-self-end">
                <Link
                  href="/sign-in"
                  className="hidden text-[14px] font-medium text-black/70 transition-colors hover:text-black md:inline-flex"
                >
                  Login
                </Link>
                <FancyButtonRoot asChild variant="neutral" size="small">
                  <Link href="/sign-up">Sign up</Link>
                </FancyButtonRoot>
              </div>
            </div>
          </header>

          <section className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 -translate-y-8 flex-col items-center justify-center px-6 pb-14 pt-10 text-center md:-translate-y-14 md:px-8 md:pb-16 md:pt-12">
            <h1 className="max-w-[1140px] text-balance [font-family:var(--font-hero-title),var(--font-sans),sans-serif] text-[44px] font-normal leading-[108%] tracking-[-0.035em] md:text-[70px] md:font-medium">
              Collect feedback, prioritize roadmap, and ship changelog updates
            </h1>
            <p className="mt-8 max-w-[860px] text-pretty text-[15px] font-medium leading-[150%] tracking-[-0.01em] text-black/72 md:text-[18px]">
              Runbase gives your team one workflow for feedback collection,
              prioritization, and product updates, without absurd per-seat
              pricing.
            </p>
            <p className="mt-4 text-[14px] font-semibold leading-[1.45] tracking-[0.01em] text-black/62 md:text-[15px]">
              Looking for a Featurebase alternative?{" "}
              <Link
                href="/featurebase-alternative"
                className="text-black underline decoration-black/35 underline-offset-4 transition-colors hover:text-black/72"
              >
                Compare Runbase here.
              </Link>
            </p>
            <HeroCompanyCta className="mt-10 md:mt-12" />
          </section>
        </div>
      </section>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 right-0 z-30 hidden xl:block"
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-[620px] bg-black/8" />
          <div className="absolute inset-y-0 left-1/2 w-px translate-x-[620px] bg-black/8" />
        </div>

        <section className="relative z-20 pb-10 pt-4 md:pb-14 md:pt-6">
          <div className="mx-auto w-full max-w-[1240px]">
            <HeroMarquee />
          </div>
        </section>

        <div id="ideate" className="scroll-mt-24">
          <HowItWorksSection className="pt-10 md:pt-14" />
        </div>
        <div id="prioritize" className="scroll-mt-24">
          <ToolsCompatibilitySection />
        </div>

        <section className="px-6 pt-12 pb-20 md:px-8 md:pt-16 md:pb-24">
          <HeroCompanyCta className="mx-auto" />
        </section>

        <div id="pricing" className="scroll-mt-24">
          <PricingSection />
        </div>
        <FeedbackSpotlightSection />
        <div id="deliver" className="scroll-mt-24">
          <FaqSection />
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
