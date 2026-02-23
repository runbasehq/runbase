"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { FancyButton } from "@/components/ui/fancy-button";
import { cn } from "@/lib/utils";

type HowItWorksSectionProps = {
  className?: string;
};

type HowItWorksStep = {
  description: string;
  details: readonly string[];
  id: string;
  title: string;
};

const steps: readonly HowItWorksStep[] = [
  {
    id: "01",
    title: "Collect feedback in one board",
    description:
      "Collect requests from users, sales, and support in one inbox.",
    details: [
      "Public and private boards",
      "Voting and duplicate merging",
      "Internal notes and tags",
    ],
  },
  {
    id: "02",
    title: "Prioritize with confidence",
    description:
      "Use impact signals, AI summaries, and workflow stages to prioritize.",
    details: [
      "AI clustering and summaries",
      "Status workflows by stage",
      "Team-level prioritization views",
    ],
  },
  {
    id: "03",
    title: "Ship updates and close the loop",
    description:
      "Publish roadmap and changelog updates, then notify customers.",
    details: [
      "Roadmap visibility",
      "Changelog publishing",
      "Automatic customer follow-ups",
    ],
  },
] as const;

function HowItWorksCard({
  step,
  index,
}: {
  index: number;
  step: HowItWorksStep;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.38, ease: "easeOut", delay: index * 0.06 }}
      className={cn(
        "group relative bg-white/88 p-5 backdrop-blur-md transition-colors duration-200 hover:bg-[#fbfef4] md:p-6",
        index < steps.length - 1 &&
          "border-b border-black/10 md:border-b-0 md:border-r",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-black/12 bg-black/4 px-2 text-[12px] font-semibold tracking-[0.02em] text-black/70">
          {step.id}
        </span>
        <span className="inline-flex h-8 items-center rounded-full border border-[#9fd86f]/40 bg-[#d9f3b8]/70 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75">
          Feedback flow
        </span>
      </div>

      <h3 className="text-[23px] font-semibold leading-[1.12] tracking-[-0.02em] text-black/95">
        {step.title}
      </h3>
      <p className="mt-3 text-[15px] font-medium leading-[1.45] tracking-[-0.01em] text-black/70">
        {step.description}
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {step.details.map((detail) => (
          <li key={detail} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-[6px] inline-flex size-1.5 rounded-full bg-black/35"
            />
            <span className="text-[14px] font-medium leading-[1.35] text-black/72">
              {detail}
            </span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export function HowItWorksSection({ className }: HowItWorksSectionProps) {
  return (
    <section className={cn("relative px-6 pb-16 md:px-8 md:pb-24", className)}>
      <div className="mx-auto max-w-[1240px]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-90px" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col gap-6 px-2 md:flex-row md:items-end md:justify-between md:px-3"
          >
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/52">
                How it works
              </p>
              <h2 className="mt-2 max-w-[760px] text-balance [font-family:var(--font-hero-title),var(--font-sans),sans-serif] text-[34px] leading-[1.08] tracking-[-0.03em] text-black/95 md:text-[50px]">
                From request to release in 3 steps
              </h2>
              <p className="mt-4 max-w-[760px] text-[15px] font-medium leading-[1.52] tracking-[-0.01em] text-black/68 md:text-[17px]">
                One board for collection, one workflow for prioritization, one
                changelog for updates.
              </p>
            </div>

            <FancyButton.Root asChild variant="neutral" size="small">
              <Link href="/sign-up">Start with your first feedback board</Link>
            </FancyButton.Root>
          </motion.div>

          <div className="mt-8 overflow-hidden border-y border-black/10 bg-white/90 md:mt-10">
            <div className="grid md:grid-cols-3">
              {steps.map((step, index) => (
                <HowItWorksCard key={step.id} step={step} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
