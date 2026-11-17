import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { ErasGuideClient } from "@/components/bitemporal/eras-guide-client";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { getCoverageManifest, getEraDocuments } from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: "Veterans Law Era Definitions, Forms & Chronology Guide (1945–Present)",
  description:
    "Comprehensive guide defining all five historical eras of Veterans Law (1945–1961, 1962–1988, 1988–2000, 2000–2018, and 2019–Present), watershed effective dates, legacy forms, and bitemporal CUE rules.",
};

export default function ErasIndexPage() {
  const manifest = getCoverageManifest();
  const eras = getEraDocuments().sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex items-start gap-4 border-b border-border pb-6">
        <div className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs sm:block">
          <Image
            src="/illustrations/timeline.webp"
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
            Veterans Law Era Definitions &amp; Decade-by-Decade Guide (1945–Present)
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Five Historical Era Lenses, Definitions &amp; Statutory Matrix (1945–2026)
          </h1>
          <p className="editorial-prose text-muted-foreground">
            <LexiconText text="Every VA Rating Decision or Board decision is governed by the exact statutes, claim forms, and 38 C.F.R. rules in effect on its date—paired with modern procedural doctrines that determine how old decisions can be reopened or revised today." />
          </p>
        </div>
      </header>

      <CoverageBanner
        state="VERBATIM_VERIFIED"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail={`All ${eras.length} chronological Era Lenses (1945–2026) include SHA-256-locked plain-English Veteran companions, signature form decoders, side-by-side statutory comparisons, and primary-source treatises.`}
        officialEcfrUrl="https://www.ecfr.gov/current/title-38"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-xs">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <History className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Looking for the interactive 4-track milestone chronology and proposed-rulemaking watchlist?
          </span>
        </span>
        <Link
          href="/timeline"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span>Open Multi-Track Law Timeline</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <ErasGuideClient eraDocs={eras} />
    </main>
  );
}
