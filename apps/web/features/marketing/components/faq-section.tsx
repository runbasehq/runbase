"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type FaqSectionProps = {
  className?: string;
};

type FaqItem = {
  answer: string;
  question: string;
};

const faqItems: readonly FaqItem[] = [
  {
    question: "Can I connect my own domain?",
    answer:
      "Yes. Hosted workspaces can use a custom domain on paid plans, and the Open Source edition can be mapped to any domain through your own reverse proxy setup.",
  },
  {
    question: "Do you support feedback boards and changelog in one place?",
    answer:
      "Yes. Runbase includes feedback collection, status-driven roadmap workflows, and changelog publishing so customers can track what shipped without switching tools.",
  },
  {
    question: "Can I migrate from Featurebase or another feedback tool?",
    answer:
      "Yes. You can import existing feedback data and recreate statuses/tags so your team can move without losing historical context.",
  },
  {
    question: "How does seat pricing work?",
    answer:
      "Growth includes 2 seats and Professional includes 10 seats. After included seats, each additional seat is billed at $4 per seat per month.",
  },
  {
    question: "Is there a free hosted plan?",
    answer:
      "There is no free hosted tier. If you want a free option, use the Open Source self-hosted plan and deploy it in your own infrastructure.",
  },
  {
    question: "Does Runbase include unlimited conversations?",
    answer:
      "Yes. Unlimited conversations are included in paid plans. Help center is not available yet and is currently on the roadmap.",
  },
] as const;

function FaqRow({
  index,
  item,
  total,
}: {
  index: number;
  item: FaqItem;
  total: number;
}) {
  return (
    <details
      className={cn(
        "group bg-white/92 px-5 transition-colors open:bg-[#f7fde9] [&_summary::-webkit-details-marker]:hidden",
        index < total - 1 && "border-b border-black/10",
      )}
    >
      <summary className="flex list-none cursor-pointer items-center gap-3 py-5 text-black/88">
        <span
          aria-hidden
          className="inline-flex items-center justify-center text-black/58 transition-transform duration-200 group-open:rotate-180"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-[18px]" />
        </span>
        <span className="text-[18px] font-semibold leading-[1.35] tracking-[-0.01em] md:text-[22px]">
          {item.question}
        </span>
      </summary>

      <p className="pb-4 pl-9 pr-2 text-[15px] font-medium leading-[1.52] tracking-[-0.01em] text-black/66 md:text-[17px]">
        {item.answer}
      </p>
    </details>
  );
}

export function FaqSection({ className }: FaqSectionProps) {
  return (
    <section
      className={cn("px-6 pb-20 pt-4 md:px-8 md:pb-24 md:pt-6", className)}
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="px-2 md:px-3">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-balance [font-family:var(--font-hero-title),var(--font-sans),sans-serif] text-[34px] leading-[1.08] tracking-[-0.03em] text-black/95 md:text-[50px]"
          >
            Frequently Asked Questions
          </motion.h2>

          <p className="mt-3 max-w-[880px] text-[15px] font-medium leading-[1.52] tracking-[-0.01em] text-black/64 md:text-[17px]">
            Common questions about domains, feedback workflows, changelog, and
            migration from tools like Featurebase.
          </p>
        </div>

        <div className="mt-6 overflow-hidden border-y border-black/10 md:mt-7">
          {faqItems.map((item, index) => (
            <FaqRow
              key={item.question}
              item={item}
              index={index}
              total={faqItems.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
