import Link from "next/link";

import { BlackLogo } from "@/components/logos/black-logo";

export default function Page() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden text-black [font-family:var(--font-faculty-glyphic),var(--font-sans),sans-serif] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:content-[''] before:bg-[linear-gradient(to_bottom,rgba(247,247,243,0.82)_0%,rgba(247,247,243,0.66)_32%,rgba(247,247,243,0.30)_58%,rgba(247,247,243,0.04)_100%]">
      <div aria-hidden className="absolute inset-0 -z-20 bg-[#f3f2ef]" />
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/landing-bg.png')] bg-cover bg-center bg-no-repeat translate-y-[34%]" />
        <div className="absolute inset-0 bg-[radial-gradient(100%_65%_at_82%_0%,rgba(223,245,120,0.26)_0%,rgba(223,245,120,0)_72%)]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-1/4 -top-[14%] bottom-0 z-[1] opacity-90 mix-blend-lighten [mask-image:linear-gradient(to_top,#000_0%,#000_38%,transparent_69%)] [-webkit-mask-image:linear-gradient(to_top,#000_0%,#000_38%,transparent_69%)]"
      >
        <div className="landing-gradient-flow h-full w-full bg-[linear-gradient(-120deg,_#CDFF29_24%,_#FF9BE7_46%,_#FF45C7_76%,_#BF40FF_100%)] bg-[length:260%_260%]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex min-h-11 items-center bg-black px-4 py-2 text-white">
          <div className="mx-auto flex w-full max-w-[1240px] items-center justify-center">
            <span className="inline-block max-w-[760px] text-center text-[12px] font-normal leading-[140%] tracking-[0]">
              500 Early Access seats in this wave: claim yours now and{" "}
              <span className="text-[#d8ef4e]">ship your MCP</span> with{" "}
              <span className="text-[#ff45c7]">total confidence.</span>
            </span>
          </div>
        </div>

        <header className="mx-auto grid w-full max-w-[1240px] grid-cols-[auto_1fr_auto] items-center px-6 py-6 lg:px-0">
          <Link
            href="/"
            className="inline-flex w-fit items-center"
            aria-label="Runbase home"
          >
            <BlackLogo className="h-[30px] w-auto md:h-[34px]" />
          </Link>

          <nav className="mx-auto hidden items-center gap-16 text-[16px] font-normal leading-[140%] tracking-[0] text-black/90 md:flex">
            <a href="#" className="transition-opacity hover:opacity-65">
              Home
            </a>
            <a href="#" className="transition-opacity hover:opacity-65">
              Technology
            </a>
            <a href="#" className="transition-opacity hover:opacity-65">
              About
            </a>
          </nav>

          <a
            href="#"
            className="justify-self-end rounded-full bg-black px-8 py-3 text-[16px] font-normal leading-none tracking-[0] text-white transition-opacity hover:opacity-90"
          >
            Book a Demo
          </a>
        </header>

        <section className="mx-auto flex w-full max-w-[1520px] flex-1 -translate-y-8 flex-col items-center justify-center px-5 pb-16 pt-10 text-center md:-translate-y-14 md:px-8 md:pb-24 md:pt-12">
          <h1 className="max-w-[1140px] text-balance text-[44px] font-normal leading-[110%] tracking-[-0.04em] md:text-[70px]">
            Unleash continuous MCP testing at scale, powered by AI
          </h1>
          <p className="mt-8 max-w-[1120px] text-pretty text-[14px] font-normal leading-[140%] tracking-[-0.04em] text-black/55 md:text-[16px]">
            Runbase turns MCP testing into a one-click ritual. Our open-source
            engine spins up smart agents that hammer every tool and endpoint,
            schedules tests 24/7, and surfaces crystal-clear results. No code,
            no blind spots.
          </p>
        </section>
      </div>
    </main>
  );
}
