import Link from "next/link";
import type { Metadata } from "next";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { createPageMetadata } from "@/lib/seo";
import { SiteFooter } from "~/marketing/components/site-footer";

const sections = [
  {
    title: "Use of the service",
    body: "Runbase is provided for teams to collect product feedback, prioritize roadmap decisions, and publish product updates. You agree to use the service lawfully and not attempt to disrupt or abuse the platform.",
  },
  {
    title: "Accounts and access",
    body: "You are responsible for account security and activity under your workspace. Keep credentials safe and notify us promptly if you suspect unauthorized access.",
  },
  {
    title: "Billing and subscriptions",
    body: "Paid plans are billed according to the pricing shown at purchase. Unless otherwise stated, subscriptions renew automatically until canceled.",
  },
  {
    title: "Intellectual property",
    body: "Runbase and its product assets remain the property of Runbase. Your workspace content remains yours; you grant us permission to process it only to operate and improve the service.",
  },
  {
    title: "Availability and changes",
    body: "We continuously improve the product and may update features, limits, or pricing. We aim for reliability but cannot guarantee uninterrupted availability.",
  },
  {
    title: "Liability",
    body: "To the maximum extent permitted by law, Runbase is not liable for indirect, incidental, or consequential damages arising from use of the service.",
  },
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Terms & Conditions",
  description:
    "Read the Terms & Conditions for using Runbase, including service use, account access, billing, and liability.",
  path: "/terms-and-conditions",
  keywords: [
    "runbase terms and conditions",
    "saas terms",
    "feedback software terms",
    "runbase legal terms",
  ],
});

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center text-black">
            <RunbaseLogo className="h-[24px] w-auto md:h-[26px]" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/legal"
              className="text-sm font-medium text-black/64 transition-colors hover:text-black"
            >
              Legal
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-black/64 transition-colors hover:text-black"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-black/10">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(115%_80%_at_6%_2%,rgba(205,255,41,0.2)_0%,rgba(205,255,41,0)_52%),radial-gradient(95%_70%_at_95%_86%,rgba(255,123,203,0.18)_0%,rgba(255,123,203,0)_58%)]"
        />
        <div className="relative mx-auto w-full max-w-[1240px] px-6 py-14 md:px-8 md:py-20">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-black/52">
            Legal
          </p>
          <h1 className="mt-3 text-balance text-[34px] font-medium leading-[1.06] tracking-[-0.03em] md:text-[52px]">
            Terms & Conditions
          </h1>
          <p className="mt-4 max-w-[780px] text-[16px] leading-[1.6] text-black/68 md:text-[19px]">
            Last updated: February 23, 2026. These terms govern your access to
            and use of Runbase.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1240px] px-6 py-12 md:px-8 md:py-14">
          <div className="max-w-[900px] space-y-8">
            {sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-[20px] font-semibold leading-[1.25] tracking-[-0.01em] md:text-[24px]">
                  {section.title}
                </h2>
                <p className="mt-3 text-[15px] leading-[1.68] text-black/74 md:text-[18px]">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
