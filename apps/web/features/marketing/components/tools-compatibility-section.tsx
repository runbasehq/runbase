"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type ToolsCompatibilitySectionProps = {
  className?: string;
};

type ToolLogo = {
  label: string;
  src: string;
};

const codeTools: readonly ToolLogo[] = [
  { src: "/code/bolt.webp", label: "Bolt" },
  { src: "/code/cursor.webp", label: "Cursor" },
  { src: "/code/lovable.webp", label: "Lovable" },
  { src: "/code/replit.webp", label: "Replit" },
  { src: "/code/v0.webp", label: "v0" },
] as const;

const noCodeTools: readonly ToolLogo[] = [
  { src: "/no-code/monday.webp", label: "ClickUp" },
  { src: "/no-code/trello.webp", label: "Trello" },
  { src: "/no-code/notion.webp", label: "Notion" },
  { src: "/no-code/linear.webp", label: "Linear" },
  { src: "/no-code/jira.webp", label: "Jira" },
] as const;

function ToolsPanel({
  className,
  title,
  tools,
}: {
  className?: string;
  title: "CODE" | "NO-CODE";
  tools: readonly ToolLogo[];
}) {
  const isCode = title === "CODE";

  return (
    <div className={cn("p-4 md:p-5", className)}>
      <div className="mb-4 flex h-12 items-center justify-center">
        <p
          className={cn(
            "text-center leading-none text-black/56",
            isCode
              ? "text-[29px] font-semibold tracking-[0.16em] [font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace]"
              : "text-[36px] font-normal tracking-[0.08em] [font-family:var(--font-hero-title),var(--font-sans),cursive] -translate-y-0.5",
          )}
        >
          {title}
        </p>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-5 md:gap-x-4 md:gap-y-5">
          {tools.map((tool) => (
            <div
              key={tool.src}
              className="flex flex-col items-center p-1 text-center"
            >
              <Image
                src={tool.src}
                alt={tool.label}
                width={92}
                height={92}
                className="size-[82px] rounded-[20px] object-cover shadow-[0_14px_24px_-20px_rgba(0,0,0,0.45)] md:size-[92px]"
              />
              <p className="mt-2 text-[14px] font-semibold leading-none tracking-[-0.01em] text-black/72 md:text-[15px]">
                {tool.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ToolsCompatibilitySection({
  className,
}: ToolsCompatibilitySectionProps) {
  return (
    <section className={cn("px-6 py-10 md:px-8 md:py-14", className)}>
      <div className="mx-auto max-w-[1240px]">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-center text-balance [font-family:var(--font-hero-title),var(--font-sans),sans-serif] text-[34px] leading-[1.08] tracking-[-0.03em] text-black/95 md:text-[50px]"
        >
          Works with your favorite tools
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.06 }}
          className="mt-8 overflow-hidden border-y border-black/10 bg-white/90 md:mt-10"
        >
          <div className="grid md:grid-cols-2">
            <ToolsPanel
              title="CODE"
              tools={codeTools}
              className="border-b border-black/10 md:border-b-0 md:border-r"
            />
            <ToolsPanel title="NO-CODE" tools={noCodeTools} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
