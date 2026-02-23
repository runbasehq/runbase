"use client";

import Link from "next/link";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  className?: string;
};

type FooterLink = {
  href: string;
  label: string;
};

const productLinks: readonly FooterLink[] = [
  { href: "/#features", label: "Features" },
  { href: "/featurebase-alternative", label: "Featurebase alternative" },
  { href: "/#ideate", label: "Ideate" },
  { href: "/#prioritize", label: "Prioritize" },
  { href: "/#deliver", label: "Deliver" },
  { href: "/#pricing", label: "Pricing" },
] as const;

const companyLinks: readonly FooterLink[] = [
  { href: "/about-us", label: "About us" },
  { href: "mailto:franciscover99@gmail.com", label: "Contact us" },
  { href: "/#deliver", label: "Resources" },
] as const;

const socialLinks: readonly FooterLink[] = [
  { href: "https://x.com/RunbaseHQ", label: "X" },
] as const;

const legalLinks: readonly FooterLink[] = [
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
] as const;

function FooterColumn({
  links,
  title,
}: {
  links: readonly FooterLink[];
  title: string;
}) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/52">
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-1.5">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              className="text-[15px] font-medium leading-[1.45] tracking-[-0.01em] text-black/64 transition-colors hover:text-black/88"
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={
                link.href.startsWith("http") ? "noreferrer noopener" : undefined
              }
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ className }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-black/10 bg-white", className)}>
      <div className="mx-auto max-w-[1240px] px-6 pb-7 pt-9 md:px-8 md:pb-9 md:pt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="inline-flex w-fit items-center text-black">
            <RunbaseLogo className="h-[24px] w-auto md:h-[26px]" />
          </Link>

          <form
            className="flex w-full max-w-[500px] items-center gap-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="footer-email" className="sr-only">
              Enter your email
            </label>
            <input
              id="footer-email"
              type="email"
              placeholder="Enter your email"
              className="h-11 w-full rounded-[12px] border border-black/12 bg-white/92 px-3.5 text-[14px] font-medium tracking-[-0.01em] text-black outline-none placeholder:text-black/38"
            />
            <Link
              href="mailto:franciscover99@gmail.com?subject=Runbase%20demo"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-[12px] border border-[#a7e865] bg-primary px-4.5 text-[14px] font-semibold tracking-[-0.01em] text-primary-foreground shadow-[0_2px_0_0_rgba(255,255,255,0.3)_inset,0_-2px_0_0_rgba(90,130,42,0.22)_inset,0_8px_16px_-14px_rgba(82,132,35,0.55)] transition-colors hover:bg-primary/90"
            >
              Get a demo
            </Link>
          </form>
        </div>

        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Social media" links={socialLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-8">
          <div
            aria-hidden
            className="h-[2px] w-full rounded-full bg-[linear-gradient(90deg,#CDFF29_0%,#E8B98B_50%,#FF7BCB_100%)]"
          />
        </div>

        <div className="pt-4 text-center text-[12px] font-medium tracking-[0.01em] text-black/42">
          © {year} Runbase
        </div>
      </div>
    </footer>
  );
}
