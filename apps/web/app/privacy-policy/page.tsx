import Link from "next/link";
import type { Metadata } from "next";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { createPageMetadata } from "@/lib/seo";
import { SiteFooter } from "~/marketing/components/site-footer";

const sections = [
  {
    title: "Information we collect",
    body: "We collect information you provide directly, such as account details, workspace data, and feedback content submitted through Runbase.",
  },
  {
    title: "How we use information",
    body: "We use data to provide the service, secure your account, process support requests, improve product quality, and communicate important updates.",
  },
  {
    title: "Data sharing",
    body: "We do not sell personal information. We may share data with trusted service providers that help us operate Runbase, under contractual safeguards.",
  },
  {
    title: "Data retention",
    body: "We retain information for as long as needed to provide the service and comply with legal obligations. You can request deletion subject to applicable requirements.",
  },
  {
    title: "Security",
    body: "We use reasonable technical and organizational measures to protect data, though no system can be guaranteed as fully secure.",
  },
  {
    title: "Your rights",
    body: "Depending on your jurisdiction, you may have rights to access, correct, or delete personal data. Contact us to submit a request.",
  },
] as const;

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Read how Runbase collects, uses, stores, and protects personal and workspace data.",
  path: "/privacy-policy",
  keywords: [
    "runbase privacy policy",
    "data privacy",
    "saas privacy policy",
    "feedback platform privacy",
  ],
});

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-[780px] text-[16px] leading-[1.6] text-black/68 md:text-[19px]">
            Last updated: February 23, 2026. This policy explains how Runbase
            collects, uses, and protects your information.
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
