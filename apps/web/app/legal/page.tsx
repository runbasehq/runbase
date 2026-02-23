import Link from "next/link";
import type { Metadata } from "next";

import { RunbaseLogo } from "@/components/logos/runbase-logo";
import { createPageMetadata } from "@/lib/seo";
import { SiteFooter } from "~/marketing/components/site-footer";

export const metadata: Metadata = createPageMetadata({
  title: "Legal",
  description:
    "Browse Runbase legal pages, including Terms & Conditions and Privacy Policy.",
  path: "/legal",
  keywords: [
    "runbase legal",
    "runbase terms",
    "runbase privacy",
    "terms and conditions",
    "privacy policy",
  ],
});

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center text-black">
            <RunbaseLogo className="h-[24px] w-auto md:h-[26px]" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-black/64 transition-colors hover:text-black"
          >
            Back to home
          </Link>
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
          <div className="mt-6 max-w-[560px] space-y-4">
            <Link
              href="/terms-and-conditions"
              className="block text-[38px] font-medium leading-[1.1] tracking-[-0.02em] text-black/62 transition-colors hover:text-black md:text-[46px]"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy-policy"
              className="block text-[38px] font-medium leading-[1.1] tracking-[-0.02em] text-black/62 transition-colors hover:text-black md:text-[46px]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
