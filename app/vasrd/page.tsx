import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { ReportPageErrorLink } from "@/components/bitemporal/report-page-error-link";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getCoverageManifest } from "@/lib/corpus/loader";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "VASRD 15-System Disability Rating Schedule Hub (38 C.F.R. Part 4)",
  description:
    "Explore all 15 VASRD body systems (DC 5000–9918) and Part 4 Subpart A general rating policy with point-in-time 38 C.F.R. snapshots, historical overhauls, and record clues.",
  canonicalPath: "/vasrd",
  ogEyebrow: "38 C.F.R. Part 4 · Rating Schedule",
  ogCite: "DC 5000–9918",
});

export default function VasrdHubPage() {
  const manifest = getCoverageManifest();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLdScript
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Ratings (VASRD)", path: "/vasrd" },
        ])}
      />
      <nav aria-label="Breadcrumb" className="text-xs">
        <Link
          href="/cfr"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Point-in-Time 38 C.F.R. Reader</span>
        </Link>
      </nav>

      <header className="flex items-start gap-4 border-b border-border pb-6">
        <div className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xs sm:block">
          <Image
            src="/illustrations/disability-ratings.webp"
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
            VA Disability Rating Schedule by Body System (Diagnostic Codes 5000–9918)
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            38 C.F.R. Part 4 VASRD Hub — Subpart A Policy &amp; All 15 Body Systems
          </h1>
          <p
            data-persona="veteran-only"
            className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
          >
            <LexiconText text="Choose a body system or Diagnostic Code range below to compare how VA rating percentages changed over the decades, spot common rating code-sheet clues, and prepare questions for an accredited representative." />
          </p>
          <p
            data-persona="practitioner-only"
            className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
          >
            Complete index across <code className="font-mono text-xs">38 C.F.R. §§ 4.1–4.31</code>{" "}
            general rating canons and all 15 organ-system schedules (
            <code className="font-mono text-xs">DC 5000–9918</code>), uniting verbatim
            multi-era <code className="font-mono text-xs">Part 4</code> snapshots, Federal
            Register effective-date matrices, anti-pyramiding rules, and issue-spotting
            playbooks.
          </p>
        </div>
      </header>

      <CoverageBanner
        state="PLAIN_ENGLISH_IN_PROGRESS"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail={`All 16 Part 4 VASRD hubs (Subpart A + Body Systems 01–15) are populated from the pinned corpus (${manifest.totals.upstreamModules} modules). Plain-English Veteran companion cards are live on scar and muscle modules and rolling out progressively across remaining body systems.`}
        officialEcfrUrl="https://www.ecfr.gov/current/title-38/chapter-I/part-4"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <section aria-labelledby="vasrd-systems-grid-heading" className="space-y-4">
        <h2 id="vasrd-systems-grid-heading" className="font-serif text-xl font-bold">
          Browse by Body System &amp; Diagnostic Code Range
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {manifest.vasrdSystems.map((sys) => (
            <article
              key={sys.systemId}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 text-sm"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{sys.diagnosticCodeRange}</span>
                  </span>
                  <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-muted-foreground">
                    {sys.moduleIds.length} module{sys.moduleIds.length === 1 ? "" : "s"}
                  </span>
                </div>

                <h3 className="font-serif text-base font-bold text-foreground">
                  <Link
                    href={`/vasrd/${sys.systemId}`}
                    className="hover:text-primary hover:underline"
                  >
                    {sys.label}
                  </Link>
                </h3>

                <p className="text-xs text-muted-foreground">
                  {sys.plainEnglishCount > 0
                    ? `${sys.plainEnglishCount} plain-English companion(s) live · Verbatim CFR & historical overhaul tables included.`
                    : "Verbatim primary-source CFR snapshots & multi-era comparison tables ready; plain-English summary card queued."}
                </p>
              </div>

              <div className="mt-4 border-t border-border/70 pt-3 text-xs">
                <Link
                  href={`/vasrd/${sys.systemId}`}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Open Body-System Hub</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="font-mono">
          Checked as of {manifest.checkedAsOf} · {manifest.corpusReleaseId}
        </span>
        <ReportPageErrorLink
          canonicalPath="/vasrd"
          corpusReleaseId={manifest.corpusReleaseId}
          authority="38 C.F.R. Part 4 VASRD Schedule (DC 5000–9918)"
        />
      </footer>
    </main>
  );
}
