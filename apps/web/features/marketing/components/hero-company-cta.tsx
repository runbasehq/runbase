"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  normalizeCompanyName,
  validateCreateWorkspaceInput,
} from "~/workspace/schemas/create-workspace";

type HeroCompanyCtaProps = {
  className?: string;
};

function inferCompanyNameFromWebsite(value: string) {
  const normalizedValue = normalizeCompanyName(value);

  if (!normalizedValue) {
    return "";
  }

  const candidate = normalizedValue.includes("://")
    ? normalizedValue
    : `https://${normalizedValue}`;

  try {
    const parsedUrl = new URL(candidate);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    const [domainLabel] = hostname.split(".");
    const inferredCompanyName = normalizeCompanyName(
      domainLabel.replace(/[-_]+/g, " "),
    );

    if (inferredCompanyName) {
      return inferredCompanyName;
    }
  } catch {
    // Keep the raw value when it is not a valid URL. The sign-up form lets users edit it.
  }

  return normalizedValue;
}

export function HeroCompanyCta({ className }: HeroCompanyCtaProps) {
  const router = useRouter();
  const [websiteValue, setWebsiteValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inferredCompanyName = useMemo(
    () => inferCompanyNameFromWebsite(websiteValue),
    [websiteValue],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateCreateWorkspaceInput({
      companyName: inferredCompanyName,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    const params = new URLSearchParams({
      companyName: inferredCompanyName,
    });

    router.push(`/sign-up?${params.toString()}`);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.06 }}
      onSubmit={handleSubmit}
      className={cn("mx-auto w-full max-w-[280px]", className)}
    >
      <label htmlFor="hero-website" className="sr-only">
        Website or company name
      </label>

      <div className="flex h-11 w-full overflow-hidden rounded-[12px] border border-black/12 bg-white/94 shadow-[0_8px_18px_-16px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="inline-flex w-11 shrink-0 items-center justify-center border-r border-black/10 bg-[#fbfbfb]">
          <span className="inline-flex size-6 items-center justify-center rounded-full border border-black/10 bg-white">
            <Image
              src="/globe.svg"
              alt=""
              width={12}
              height={12}
              className="size-3 opacity-75"
            />
          </span>
        </div>

        <input
          id="hero-website"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={websiteValue}
          onChange={(event) => {
            setWebsiteValue(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="website.com"
          className="h-full w-full bg-transparent px-3 text-[14px] font-medium tracking-[-0.01em] text-black outline-none placeholder:text-black/24"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "hero-website-error" : undefined}
          required
        />
      </div>

      <motion.button
        whileTap={{ scale: 0.995 }}
        whileHover={{ y: -1 }}
        type="submit"
        disabled={isSubmitting || !websiteValue.trim()}
        className="mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#a7e865] bg-primary text-[15px] font-semibold tracking-[-0.01em] text-primary-foreground shadow-[0_2px_0_0_rgba(255,255,255,0.3)_inset,0_-2px_0_0_rgba(90,130,42,0.22)_inset,0_8px_16px_-14px_rgba(82,132,35,0.55)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-65"
      >
        <span>{isSubmitting ? "Opening..." : "Add my website"}</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2.2}
          className="size-[18px]"
        />
      </motion.button>

      <p className="mt-2 text-center text-[12px] font-medium tracking-[-0.01em] text-black/58">
        14-day free trial. No card required
      </p>

      {error ? (
        <p
          id="hero-website-error"
          className="mt-2 text-center text-sm font-medium text-rose-600"
        >
          {error}
        </p>
      ) : null}
    </motion.form>
  );
}
