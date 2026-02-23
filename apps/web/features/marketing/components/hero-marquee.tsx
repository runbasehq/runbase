"use client";

import { Marquee } from "@joycostudio/marquee/react";
import { motion } from "motion/react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type HeroMarqueeProps = {
  className?: string;
};

type HeroMarqueeRowProps = {
  cards: readonly HeroSocialCard[];
  direction: 1 | -1;
  speed: number;
};

type HeroSocialCard = {
  avatarSrc?: string;
  body: string;
  handle: string;
  metric: string;
  name: string;
};

const topRowCards: readonly HeroSocialCard[] = [
  {
    name: "Guillermo Rauch",
    handle: "@rauchg",
    body: "Feedback is a gift",
    metric: "May 24, 2021",
    avatarSrc: "/marquee/rauchg.jpg",
  },
  {
    name: "Brendan Iribe",
    handle: "@brendaniribe",
    body: "Community feedback is one of the most rewarding aspects of building product. I especially love constructive critical thoughts and insights from passionate users. Some of the best ideas come from the community.",
    metric: "x.com/brendaniribe",
    avatarSrc: "/marquee/brendaniribe.jpg",
  },
  {
    name: "Patrick Collison",
    handle: "@patrickc",
    body: "Every other week, we have a customer join for the first 30 minutes of our management team meeting: they share their candid feedback, and ~40 leaders from across Stripe listen. Even though we already have a lot of customer feedback mechanisms, it somehow always spurs new thoughts and investigations.",
    metric: "x.com/patrickc",
    avatarSrc: "/marquee/patrickc.jpg",
  },
  {
    name: "Tobi Lutke",
    handle: "@tobi",
    body: "Keep that feedback coming. We'll fix all of this",
    metric: "x.com/tobi",
    avatarSrc: "/marquee/toby.jpg",
  },
] as const;

const bottomRowCards: readonly HeroSocialCard[] = [
  {
    name: "Sahil Lavingia",
    handle: "@shl",
    body: "Negative feedback is one of the greatest gifts",
    metric: "x.com/shl",
    avatarSrc: "/marquee/sahil.jpg",
  },
  {
    name: "Brian Chesky",
    handle: "@bchesky",
    body: "None of this would have been possible without your feedback. Thank you! We will never stop improving Airbnb",
    metric: "x.com/bchesky",
    avatarSrc: "/marquee/brianc.jpg",
  },
  {
    name: "Sam Altman",
    handle: "@sama",
    body: "we really do try to listen to feedback! we would love to be able to do even more; we continue to have to make very hard tradeoffs between rate limits, new feature launches, and latency.",
    metric: "x.com/sama",
    avatarSrc: "/marquee/sama.jpg",
  },
  {
    name: "Dharmesh Shah",
    handle: "@dharmesh",
    body: "Feedback is the breakfast of champions, but focus is the dinner of winners.",
    metric: "x.com/dharmesh",
    avatarSrc: "/marquee/dharmesh.jpg",
  },
] as const;

function HeroSocialCard({ card }: { card: HeroSocialCard }) {
  const initials = card.name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="flex h-[228px] w-[300px] shrink-0 flex-col border-y border-r border-black/10 bg-white/95 p-3 backdrop-blur-sm">
      <header className="flex items-center gap-2.5">
        {card.avatarSrc ? (
          <Image
            src={card.avatarSrc}
            alt={`${card.name} avatar`}
            width={36}
            height={36}
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-black/6 text-[12px] font-semibold text-black/80">
            {initials}
          </span>
        )}
        <div>
          <p className="text-[16px] font-semibold leading-[1.1] text-black/95">
            {card.name}
          </p>
          <p className="text-[12px] font-medium text-black/58">{card.handle}</p>
        </div>
      </header>

      <p className="mt-2.5 text-[14px] font-medium leading-[1.3] tracking-[-0.01em] text-black/84 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6] overflow-hidden">
        {card.body}
      </p>

      <p className="mt-auto pt-2 text-[13px] font-medium text-black/50">
        {card.metric}
      </p>
    </article>
  );
}

function HeroMarqueeRow({ cards, direction, speed }: HeroMarqueeRowProps) {
  return (
    <Marquee
      speed={speed}
      speedFactor={1}
      direction={direction}
      rootClassName="w-full"
      marqueeClassName="py-0"
    >
      <div className="flex w-max items-stretch gap-0 pr-0">
        {cards.map((card, index) => (
          <HeroSocialCard key={`${card.name}-${index}`} card={card} />
        ))}
      </div>
    </Marquee>
  );
}

export function HeroMarquee({ className }: HeroMarqueeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
      className={cn("w-full", className)}
    >
      <div className="relative mt-8 flex w-full flex-col gap-0 max-md:mt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-14 bg-[linear-gradient(90deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.98)_30%,rgba(255,255,255,0.7)_58%,rgba(255,255,255,0)_100%)] md:w-28"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-14 bg-[linear-gradient(270deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.98)_30%,rgba(255,255,255,0.7)_58%,rgba(255,255,255,0)_100%)] md:w-28"
        />

        <HeroMarqueeRow direction={1} cards={topRowCards} speed={32} />
        <div className="-mt-px">
          <HeroMarqueeRow direction={-1} cards={bottomRowCards} speed={28} />
        </div>
      </div>
    </motion.div>
  );
}
