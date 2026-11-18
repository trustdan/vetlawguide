import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { FisheyeTimelineRail } from "@/components/bitemporal/fisheye-timeline-rail";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { MultiTrackTimeline } from "@/components/bitemporal/multi-track-timeline";
import { VeteranOverlayCard } from "@/components/bitemporal/veteran-overlay-card";
import {
  getCompiledTimelineBundle,
  getCoverageManifest,
  getVeteranOverlaysById,
} from "@/lib/corpus/loader";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Multi-Track Veterans Law Timeline & Rulemaking Watchlist (1945–2026)",
  description:
    "Interactive 4-track Veterans Law chronology (Statutes, Part 3 Adjudication, Part 4 VASRD, Landmark Precedents) with Retroactive Opportunity vs. Temporal Trap cards and quarantined rulemaking watchlist.",
  canonicalPath: "/timeline",
  ogEyebrow: "Four-Track Chronology · 1945–2026",
  ogCite: "Statutes · Part 3 · VASRD · Cases",
});

export default function TimelinePage() {
  const manifest = getCoverageManifest();
  const timelineBundle = getCompiledTimelineBundle();
  const overlaysById = getVeteranOverlaysById();
  const matrixOverlay = overlaysById["doctrine-master-chronological-matrix"];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-10">
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
            How VA Disability Laws &amp; Rating Rules Changed (1945–Present)
          </h1>
          <h1
            data-persona="practitioner-only"
            className="font-serif text-3xl font-bold tracking-tight"
          >
            Multi-Track Veterans Law Timeline &amp; Rulemaking Watchlist (1945–2026)
          </h1>

          <p
            data-persona="veteran-only"
            className="editorial-prose text-muted-foreground"
          >
            <LexiconText text="Explore major acts of Congress, VA claim and appeal rules, body-system rating updates, and court rulings side by side—plus a separate watchlist of proposed rules that are NOT enacted law." />
          </p>
          <p
            data-persona="practitioner-only"
            className="editorial-prose text-muted-foreground"
          >
            Compiled across <strong>{timelineBundle.events.length}</strong>{" "}
            enacted milestones in four parallel tracks (
            <code className="font-mono text-sm">Statutes</code> ·{" "}
            <code className="font-mono text-sm">Part 3 Adjudication</code> ·{" "}
            <code className="font-mono text-sm">Part 4 VASRD</code> ·{" "}
            <code className="font-mono text-sm">Landmark Precedents</code>) with
            Federal Register publication-vs-effective date flags and{" "}
            <strong>{timelineBundle.quarantinedWatchlist.length}</strong>{" "}
            quarantined proposed/rescinded notices (checked{" "}
            <span className="font-mono">{manifest.checkedAsOf}</span>).
          </p>
        </div>
      </header>

      <CoverageBanner
        state="VERBATIM_VERIFIED"
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail="Compiled from the Master Chronological Matrix and Federal Register version chains; unfinalized RIN proposals and rescinded rules are strictly quarantined."
        officialEcfrUrl="https://www.ecfr.gov/current/title-38"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/fr"
      />

      {/* Single Canonical Home for Interactive Fisheye Milestone Rail */}
      <FisheyeTimelineRail />

      {/* 4-Track Interactive Chronology + Toggleable Quarantined Watchlist */}
      <MultiTrackTimeline bundle={timelineBundle} />

      {matrixOverlay && (
        <CrossInspectionExpander
          veteranContent={<VeteranOverlayCard overlay={matrixOverlay} />}
          practitionerContent={
            <div className="space-y-2 rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed text-muted-foreground">
              <div className="font-semibold text-foreground">
                Practitioner Bitemporal Audit Protocol (Publication vs. Effective Date)
              </div>
              <p>
                Always separate the Federal Register{" "}
                <strong>publication date</strong> from the{" "}
                <strong>effective date</strong> (e.g.,{" "}
                <code className="font-mono">62 FR 30235</code>{" "}
                <code className="font-mono">§ 4.56</code> published{" "}
                <code className="font-mono">1997-06-03</code>, effective{" "}
                <code className="font-mono">1997-07-03</code>;{" "}
                <code className="font-mono">89 FR 32361</code>{" "}
                <code className="font-mono">§ 3.12</code> published{" "}
                <code className="font-mono">2024-04-26</code>, effective{" "}
                <code className="font-mono">2024-06-25</code>), and verify that
                quarantined proposals (<code className="font-mono">RIN 2900-AQ72</code>,{" "}
                <code className="font-mono">AQ73</code>,{" "}
                <code className="font-mono">AQ82</code>,{" "}
                <code className="font-mono">AR96</code>,{" "}
                <code className="font-mono">AS39</code>,{" "}
                <code className="font-mono">90 FR 46542</code>) and rescinded{" "}
                <code className="font-mono">91 FR 7118</code> are never cited as
                enacted law.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  href="/docs/master-chronological-matrix"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Read Master Chronological Matrix treatise</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/eras"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Compare all 5 Historical Era definitions</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          }
        />
      )}
    </main>
  );
}
