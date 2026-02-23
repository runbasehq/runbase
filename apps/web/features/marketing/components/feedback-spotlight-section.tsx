"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { FancyButton } from "@/components/ui/fancy-button";
import { cn } from "@/lib/utils";

type FeedbackSpotlightSectionProps = {
  className?: string;
};

export function FeedbackSpotlightSection({
  className,
}: FeedbackSpotlightSectionProps) {
  return (
    <section
      className={cn("px-6 pb-14 pt-4 md:px-8 md:pb-20 md:pt-6", className)}
    >
      <div className="mx-auto max-w-[1240px]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-90px" }}
          transition={{ duration: 0.36, ease: "easeOut" }}
          className="relative isolate overflow-hidden border border-black/12"
        >
          <div className="relative min-h-[460px] md:min-h-[620px]">
            <Image
              src="/feedback.webp"
              alt="Product team shipping updates after reviewing feedback"
              fill
              sizes="(min-width: 768px) 1400px, 100vw"
              className="object-cover"
            />

            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(3,7,14,0.9)_6%,rgba(4,8,14,0.74)_42%,rgba(5,8,13,0.34)_70%,rgba(5,8,13,0.5)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(90%_72%_at_14%_86%,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0)_65%)]" />

            <div className="absolute inset-x-0 bottom-0 h-[4px] bg-[linear-gradient(90deg,#CDFF29_0%,#E8B98B_50%,#FF7BCB_100%)]" />

            <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10">
              <RunbaseLogo className="h-[30px] w-auto text-white/96 drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)] md:h-[40px]" />

              <div className="max-w-[840px] pb-1 md:pb-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/68">
                  Feedback Platform
                </p>
                <h2 className="mt-2 max-w-[760px] text-balance [font-family:var(--font-hero-title),var(--font-sans),sans-serif] text-[34px] leading-[1.08] tracking-[-0.03em] text-white md:text-[50px]">
                  Focus on shipping product. We handle the feedback loop.
                </h2>
                <p className="mt-4 max-w-[760px] text-[16px] font-medium leading-[1.5] tracking-[-0.01em] text-white/80 md:text-[20px]">
                  Collect requests, prioritize with AI summaries and statuses,
                  and publish roadmap + changelog updates from one workflow.
                </p>

                <div className="mt-6">
                  <FancyButton.Root asChild size="small" variant="primary">
                    <Link href="/sign-up">Start your first feedback board</Link>
                  </FancyButton.Root>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
