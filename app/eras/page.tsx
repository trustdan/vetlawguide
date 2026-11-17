import type { Metadata } from "next";
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
      <header className="space-y-2 border-b border-border pb-6">
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
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <LexiconText text="Every VA Rating Decision or Board decision is governed by the exact statutes, claim forms, and 38 C.F.R. rules in effect on its date—paired with modern procedural doctrines that determine how old decisions can be reopened or revised today." />
        </p>
      </header>

      <CoverageBanner
        state="VERBATIM_VERIFIED"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail={`All ${eras.length} chronological Era Lenses (1945–2026) include SHA-256-locked plain-English Veteran companions, signature form decoders, side-by-side statutory comparisons, and full 3-column primary-source treatises.`}
        officialEcfrUrl="https://www.ecfr.gov/current/title-38"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <ErasGuideClient eraDocs={eras} />
    </main>
  );
}
