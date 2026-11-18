import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CasesDirectoryClient } from "@/components/bitemporal/cases-directory-client";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { getCompiledPrecedents, getCoverageManifest } from "@/lib/corpus/loader";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Judicial Precedent & VAOPGCPREC Authority Directory (Era-Filterable)",
  description:
    "Explore U.S. Supreme Court, Federal Circuit, CAVC precedential decisions, and binding vs. withdrawn VA General Counsel Precedent Opinions (VAOPGCPREC), organized by adjudication era.",
  canonicalPath: "/cases",
  ogEyebrow: "SCOTUS · Fed. Cir. · CAVC · VAOPGCPREC",
});

export default function CasesDirectoryPage() {
  const manifest = getCoverageManifest();
  const precedents = getCompiledPrecedents();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex items-start gap-4 border-b border-border pb-6">
        <div className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs sm:block">
          <Image
            src="/illustrations/law-and-cases.webp"
            alt=""
            width={72}
            height={72}
            unoptimized
            className="h-18 w-18 object-cover"
          />
        </div>
        <div className="min-w-0 space-y-2">
          <h1
            data-persona="veteran-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Court Decisions &amp; VA Legal Opinions Organized by Era
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Era-Filterable Precedent &amp; VAOPGCPREC Authority Directory
          </h1>
          <p
            data-persona="veteran-only"
            className="editorial-prose text-muted-foreground"
          >
            <LexiconText text="Explore the Supreme Court, Federal Circuit, CAVC, and VA General Counsel rulings that govern VA disability and survivor decisions—and select an Era in the top bar to see which rulings apply to a decision from that decade." />
          </p>
          <p
            data-persona="practitioner-only"
            className="editorial-prose text-muted-foreground"
          >
            Controlling SCOTUS, Federal Circuit, CAVC precedential opinions,{" "}
            <Link
              href="/docs/vaopgcprec-index"
              className="text-primary underline underline-offset-2"
            >
              binding &amp; quarantined VAOPGCPREC digests
            </Link>
            , and CAVC Rule 30(a) nonprecedential guardrails ({precedents.length}{" "}
            deduplicated authorities;{" "}
            <Link
              href="/docs/authority-verification-log"
              className="text-primary underline underline-offset-2"
            >
              Authority Hierarchy &amp; Verification Log
            </Link>
            ). Treatment checked as of{" "}
            <span className="font-mono">{manifest.checkedAsOf}</span>.
          </p>
        </div>
      </header>

      <CasesDirectoryClient
        precedents={precedents}
        checkedAsOf={manifest.checkedAsOf}
        totalModules={manifest.totals.upstreamModules}
      />
    </main>
  );
}
