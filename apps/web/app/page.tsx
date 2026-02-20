"use client";

import Link from "next/link";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { FancyButton } from "@/components/ui/fancy-button";

export default function Page() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden text-black [font-family:var(--font-sans),sans-serif] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:content-[''] before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.72)_32%,rgba(255,255,255,0.34)_58%,rgba(255,255,255,0.06)_100%]">
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

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex min-h-12 items-center bg-black px-4 py-2.5 text-white">
          <div className="mx-auto flex w-full max-w-[1240px] items-center justify-center">
            <span className="inline-block max-w-[980px] text-center text-[14px] font-medium leading-[145%] tracking-[0] text-white/95 md:text-[16px]">
              Start with a 30-day free trial for{" "}
              <span className="bg-[linear-gradient(90deg,#CDFF29_0%,#BCFF7A_34%,#FF7BCB_74%,#FF5AAF_100%)] bg-clip-text text-transparent">
                support, feedback, and product updates.
              </span>
            </span>
          </div>
        </div>

        <header className="mt-4 bg-white/72 backdrop-blur-xl">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[auto_1fr_auto] items-center px-6 py-3 md:px-8">
            <Link
              href="/"
              className="inline-flex w-fit items-center text-black"
              aria-label="Runbase home"
            >
              <RunbaseLogo className="h-[24px] w-auto md:h-[26px]" />
            </Link>

            <nav className="mx-auto hidden items-center gap-11 text-[14px] font-medium leading-none tracking-[0] text-black/72 md:flex">
              <a href="#" className="transition-colors hover:text-black">
                Features
              </a>
              <a href="#" className="transition-colors hover:text-black">
                Resources
              </a>
              <a href="#" className="transition-colors hover:text-black">
                Company
              </a>
              <a href="#" className="transition-colors hover:text-black">
                Pricing
              </a>
            </nav>

            <div className="flex items-center gap-5 justify-self-end">
              <Link
                href="/sign-in"
                className="hidden text-[14px] font-medium text-black/70 transition-colors hover:text-black md:inline-flex"
              >
                Login
              </Link>
              <FancyButton.Root
                variant="neutral"
                size="small"
                className="h-10 bg-black px-5 text-[14px] font-semibold text-white"
              >
                <Link href="/sign-in">Sign up</Link>
              </FancyButton.Root>
            </div>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-[1520px] flex-1 -translate-y-8 flex-col items-center justify-center px-5 pb-16 pt-10 text-center md:-translate-y-14 md:px-8 md:pb-24 md:pt-12">
          <h1 className="max-w-[1140px] text-balance [font-family:var(--font-hero-title),var(--font-sans),sans-serif] text-[44px] font-normal leading-[108%] tracking-[-0.035em] md:text-[70px] md:font-medium">
            Modern support &amp; feedback without absurd per-seat pricing
          </h1>
          <p className="mt-8 max-w-[860px] text-pretty text-[15px] font-medium leading-[150%] tracking-[-0.01em] text-black/72 md:text-[18px]">
            Support customers with AI, collect feedback, and ship product
            updates from one tool. Keep your margins and stop bleeding budget on
            overpriced software stacks.
          </p>
        </section>
      </div>
    </main>
  );
}
