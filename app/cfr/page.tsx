import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bookmark, FileDiff, FileSearch } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { QuarantinedWatchlistCard } from "@/components/bitemporal/quarantined-watchlist-card";
import { CfrIndexLiveResolver } from "@/components/bitemporal/cfr-index-live-resolver";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import {
  DOCUMENT_CATEGORY_LABELS,
  getCfrModuleDocuments,
  getCompiledCfrSections,
  getCoverageManifest,
} from "@/lib/corpus/loader";
import type { CompiledCfrSection } from "@/lib/corpus/types";

export const metadata: Metadata = {
  title: "Point-in-Time 38 C.F.R. Reader & Redline Index",
};

const FLAGSHIP_RESOLVER_SLUGS = new Set([
  "38-cfr-4.56",
  "38-cfr-4.118",
  "38-cfr-3.156c",
  "38-cfr-3.12a-l",
  "38-cfr-4.110-4.114",
  "38-cfr-4.124a-dc-8045",
]);

function countComparableSnapshots(sec: CompiledCfrSection): number {
  return (
    sec.versions.filter((v) => Boolean(v.verbatimMarkdown)).length +
    (sec.relatedComparisonSnapshots?.length ?? 0)
  );
}

export default function CfrIndexPage() {
  const manifest = getCoverageManifest();
  const sections = getCompiledCfrSections();
  const cfrModules = getCfrModuleDocuments();

  const liveVerbatimSections = sections.filter(
    (s) => s.bookmarkStatus === "WAVE_1_LIVE_VERBATIM",
  );
  const multiEraRedlineSections = liveVerbatimSections.filter(
    (s) => countComparableSnapshots(s) >= 2,
  );
  const singleEraVerbatimSections = liveVerbatimSections.filter(
    (s) => countComparableSnapshots(s) < 2,
  );
  const flagshipResolverSections = liveVerbatimSections.filter((s) =>
    FLAGSHIP_RESOLVER_SLUGS.has(s.sectionSlug),
  );
  const heldOrSummarySections = sections.filter(
    (s) =>
      s.bookmarkStatus === "HELD_AT_BOOKMARK_GATE" ||
      s.bookmarkStatus === "SUMMARY_ONLY",
  );
  const seenQuarantinedKeys = new Set<string>();
  const orderedForQuarantine = [
    ...sections.filter((s) => s.bookmarkStatus === "QUARANTINED_NONBINDING"),
    ...sections.filter((s) => s.bookmarkStatus !== "QUARANTINED_NONBINDING"),
  ];
  const allQuarantined = orderedForQuarantine
    .flatMap((s) => s.quarantinedWatchlist)
    .filter((q) => {
      const frTokens = Array.from(
        (q.federal_register_citation ?? "").matchAll(/\b\d+\s+FR\s+\d+\b/gi),
      ).map((m) => m[0].replace(/\s+/g, " ").toLowerCase());
      const dedupeKey =
        frTokens.length > 0
          ? frTokens.join("|")
          : (q.federal_register_citation ?? q.version_id).trim().toLowerCase();
      if (seenQuarantinedKeys.has(dedupeKey)) return false;
      seenQuarantinedKeys.add(dedupeKey);
      return true;
    });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1
          data-persona="veteran-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Plain-English VA Regulation Guides &amp; Historical Rule Comparisons
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Point-in-Time 38 C.F.R. Reader, Redline Diffs &amp; Two-Pane View
        </h1>
        <p
          data-persona="veteran-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          See how VA rating rules for wounds, scars, joints, heart conditions, mental
          health, character of discharge, and missing military records read on the date
          of an older decision—with everyday explanations and record clues.
        </p>
        <p
          data-persona="practitioner-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          Permanent per-version regulatory snapshots strictly separating Federal Register{" "}
          <strong>Publication Date</strong> from <strong>Effective Date</strong>, paired
          with word-level deterministic redlines, Two-Pane historical-vs-modern
          collateral analysis, and quarantined proposed/rescinded rule alerts.
        </p>
      </header>

      <CoverageBanner
        state="PLAIN_ENGLISH_IN_PROGRESS"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail={`${multiEraRedlineSections.length} multi-era verbatim redline families, ${singleEraVerbatimSections.length} single-era verbatim snapshots, ${cfrModules.length} full multi-section regulation & diff treatises, 16 Part 4 VASRD hubs, and ${heldOrSummarySections.length} structured Federal Register transition chains compiled (plain-English Veteran companions and inline acronym tooltips live across flagship sections; dedicated companions for additional sections continue expanding).`}
        officialEcfrUrl="https://www.ecfr.gov/current/title-38"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <Link
          href="/vasrd"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
        >
          <span>Browse All 15 VASRD Body Systems (DC 5000–9918)</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/crosswalk"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-primary hover:bg-muted"
        >
          1933 ↔ 1958 ↔ 1991 Statutory Crosswalk →
        </Link>
        <Link
          href="/eras"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-primary hover:bg-muted"
        >
          5 Historical Era Lenses (1945–2026) →
        </Link>
      </div>

      <CfrIndexLiveResolver
        wave1Sections={flagshipResolverSections}
        defaultDate={manifest.checkedAsOf}
      />

      {/* Multi-Era Verbatim & Side-by-Side Redline Families */}
      <section aria-labelledby="wave1-cfr-heading" className="space-y-4">
        <h2
          id="wave1-cfr-heading"
          data-persona="veteran-only"
          className="font-serif text-xl font-bold"
        >
          Historical VA Rules With Before-and-After Comparisons (
          {multiEraRedlineSections.length} Sections)
        </h2>
        <h2
          data-persona="practitioner-only"
          className="font-serif text-xl font-bold"
        >
          Multi-Era Verbatim Snapshots &amp; Side-by-Side Redline Comparisons (
          {multiEraRedlineSections.length} Sections)
        </h2>

        <div className="grid gap-4">
          {multiEraRedlineSections.map((sec) => (
            <article
              key={sec.sectionSlug}
              className="space-y-3 rounded-lg border border-border bg-surface-elevated p-5"
            >
              {/* VETERAN CARD PRESENTATION */}
              <div data-persona="veteran-only" className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {sec.cfrSection}
                      {sec.diagnosticCodes.length > 0
                        ? ` · Diagnostic Codes ${sec.diagnosticCodes.join(", ")}`
                        : ""}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-foreground">
                      <Link
                        href={`/cfr/${sec.sectionSlug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {sec.veteranOverlay?.plain_english_title ?? sec.title}
                      </Link>
                    </h3>
                    <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
                      <LexiconText
                        text={sec.veteranOverlay?.what_this_means ?? sec.summary}
                      />
                    </p>
                  </div>

                  <Link
                    href={`/cfr/${sec.sectionSlug}`}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <span>
                      {sec.veteranOverlay ? "Open Plain-English Guide" : "Open Era Comparison"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>

                {sec.veteranOverlay && sec.veteranOverlay.record_clues.length > 0 && (
                  <div className="rounded-md border border-border bg-surface p-3 text-xs">
                    <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <FileSearch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <span>Paperwork Clues Covered in This Guide:</span>
                    </div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted-foreground">
                      {sec.veteranOverlay.record_clues.slice(0, 2).map((clue, idx) => (
                        <li key={idx}>
                          <LexiconText text={clue} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* PRACTITIONER CARD PRESENTATION */}
              <div data-persona="practitioner-only" className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Link
                      href={`/cfr/${sec.sectionSlug}`}
                      className="font-serif text-lg font-bold text-foreground hover:text-primary hover:underline"
                    >
                      {sec.cfrSection} — {sec.title}
                    </Link>
                    <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
                      <LexiconText text={sec.summary} />
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/cfr/${sec.sectionSlug}`}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <span>Open Two-Pane Reader</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <Link
                      href={`/cfr/${sec.sectionSlug}#redline-diff`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <FileDiff className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <span>Compare Redline</span>
                    </Link>
                  </div>
                </div>

                <div className="grid gap-2 border-t border-border/70 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  {sec.versions.map((ver) => (
                    <Link
                      key={ver.version_id}
                      href={ver.permalink}
                      className="rounded border border-border bg-background p-2.5 text-xs hover:bg-surface"
                    >
                      <div className="font-mono text-xs font-semibold text-primary">
                        {ver.permalink}
                      </div>
                      <div className="mt-0.5 line-clamp-1 font-medium text-foreground">
                        {ver.heading}
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        Pub: {ver.publication_date ?? "Baseline"} · Eff:{" "}
                        {ver.effective_from} → {ver.effective_to ?? "present"}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Single-Era Verbatim Primary-Source Snapshots */}
      {singleEraVerbatimSections.length > 0 && (
        <section aria-labelledby="single-era-verbatim-heading" className="space-y-3">
          <div className="space-y-1">
            <h2
              id="single-era-verbatim-heading"
              className="font-serif text-xl font-bold"
            >
              Single-Era Verbatim 38 C.F.R. Snapshots ({singleEraVerbatimSections.length}{" "}
              Sections)
            </h2>
            <p className="text-xs text-muted-foreground">
              Verbatim regulatory text, statutory/regulatory lag notes, and Two-Pane
              collateral finality guidance for continuous-baseline and post-enactment
              sections across Parts 3, 4, 14, 20, and 71.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {singleEraVerbatimSections.map((sec) => {
              const headVer = sec.versions[sec.versions.length - 1];
              return (
                <Link
                  key={sec.sectionSlug}
                  href={`/cfr/${sec.sectionSlug}`}
                  className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-4 text-xs hover:border-primary"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 font-mono text-xs">
                      <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                        Verbatim Primary Text
                      </span>
                      <span className="text-muted-foreground">
                        Eff. {headVer?.effective_from ?? "Baseline"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground">{sec.cfrSection}</h3>
                    <p className="line-clamp-2 text-muted-foreground">{sec.title}</p>
                  </div>
                  <span className="mt-3 font-mono text-xs font-semibold text-primary">
                    /cfr/{sec.sectionSlug} →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Quarantined Watchlist */}
      <QuarantinedWatchlistCard items={allQuarantined} />

      {/* Point-in-Time Transition Chains + Multi-Section Verbatim Snapshot Catalog */}
      <section aria-labelledby="held-cfr-heading" className="space-y-3">
        <div className="space-y-1">
          <h2 id="held-cfr-heading" className="font-serif text-xl font-bold">
            Structured Federal Register Transition Summaries ({heldOrSummarySections.length}{" "}
            Sections)
          </h2>
          <p className="text-xs text-muted-foreground">
            <LexiconText text="Federal Register publication dates, effective intervals, and transition notes where full print CFR verification is required before pleading CUE." />
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {heldOrSummarySections.map((sec) => (
            <Link
              key={sec.sectionSlug}
              href={`/cfr/${sec.sectionSlug}`}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface p-4 text-xs hover:border-primary"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                    <Bookmark className="h-3 w-3 text-primary" aria-hidden="true" />
                    {(sec.companionModules ?? []).length > 0
                      ? `${(sec.companionModules ?? []).length} Companion Guide(s)`
                      : "Transition Summary"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {sec.versions.length} snapshot{sec.versions.length === 1 ? "" : "s"}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{sec.cfrSection}</h3>
                <p className="line-clamp-2 text-muted-foreground">{sec.title}</p>
              </div>
              <span className="mt-3 font-mono text-xs font-semibold text-primary">
                /cfr/{sec.sectionSlug} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="multi-section-cfr-modules-heading" className="space-y-3">
        <div className="space-y-1">
          <h2 id="multi-section-cfr-modules-heading" className="font-serif text-xl font-bold">
            Multi-Section Verbatim Snapshots &amp; Historical Redline Guides (
            {cfrModules.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Complete verbatim <code className="font-mono">38 C.F.R.</code> snapshots and
            era-by-era percentage comparison treatises across Parts 1, 3, 4, 14, 17, 19,
            20, 21, and 71.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cfrModules.map((mod) => (
            <Link
              key={mod.id}
              href={mod.route}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-4 text-xs hover:border-primary"
            >
              <div className="space-y-1">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {DOCUMENT_CATEGORY_LABELS[mod.category]}
                </span>
                <h3 className="font-semibold text-foreground">{mod.title}</h3>
              </div>
              <span className="mt-3 font-mono text-xs font-semibold text-primary">
                Read guide →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
