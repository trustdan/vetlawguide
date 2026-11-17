import Link from "next/link";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ArrowRight } from "lucide-react";
import { CORE_SITUATION_CARDS } from "@/content/situations";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { FisheyeTimelineRail } from "@/components/bitemporal/fisheye-timeline-rail";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { OsintKnowledgeTree } from "@/components/bitemporal/osint-knowledge-tree";
import { SourceProvenancePanel } from "@/components/bitemporal/source-provenance-panel";
import { HomeSearchLauncher } from "@/components/chrome/home-search-launcher";
import { getCoverageManifest } from "@/lib/corpus/loader";
import type { CoverageState, VeteranOverlay } from "@/lib/corpus/types";

function loadPlaybook01Overlay(): VeteranOverlay {
  const p = resolve(
    process.cwd(),
    "content",
    "overlays",
    "veteran",
    "playbook-01-penetrating-wounds-scars-vs-muscles.json",
  );
  return JSON.parse(readFileSync(p, "utf8")) as VeteranOverlay;
}

const BADGE_LABELS: Record<CoverageState, string> = {
  VERBATIM_VERIFIED: "Verbatim Primary Text + Plain-English Ready",
  SUMMARY_ONLY: "Summary Only — Pull Print CFR Before Pleading CUE",
  PLAIN_ENGLISH_IN_PROGRESS: "Primary Sources Live — Plain-English Companion In Progress",
  CORPUS_GAP_OR_QUEUED_WAVE: "Placeholder — Queued for Later Wave",
};

const FEATURED_UNLOCKED_GUIDES: ReadonlyArray<{
  title: string;
  href: string;
  waveId: string;
  veteranSummary: string;
  practitionerSummary: string;
}> = [
  {
    title: "Agent Orange, Nehmer Retroactive Effective Dates & Blue Water Navy",
    href: "/playbooks/06-nehmer-herbicide-presumptions-crsc",
    waveId: "W3",
    veteranSummary:
      "How newly recognized Agent Orange and herbicide conditions under 38 C.F.R. § 3.816 can unlock earlier effective dates—or survivor benefits—when an older claim or medical diagnosis already existed in your VA records.",
    practitionerSummary:
      "Audits Nehmer class membership, Footnote 1 diagnostic-code vs. clinical-manifestation triggers under 38 C.F.R. § 3.816(c)–(f), Pub. L. 116-23 Blue Water Navy deck-log rules, and PACT Act hypertension/MGUS transitions.",
  },
  {
    title: "Unadjudicated TDIU, Former § 3.157(b) Hospital Reports & Inferred Claims",
    href: "/playbooks/04-unadjudicated-tdiu-informal-claims-smc",
    waveId: "W2",
    veteranSummary:
      "How 100% Individual Unemployability (TDIU) and pre-2015 VA hospital or examination reports work when service-connected conditions prevented steady, substantially gainful employment.",
    practitionerSummary:
      "Tracks 38 C.F.R. § 4.16(a)–(b) 1975/1990 thresholds, Rice v. Shinseki inferred TDIU scope, Roberson v. Principi, and pre-March 24, 2015 former § 3.157(b) examination-report informal claims.",
  },
  {
    title: "Aid and Attendance, Housebound & TBI Special Monthly Compensation (SMC l–r.2 & t)",
    href: "/playbooks/12-aid-and-attendance-smc-l-r1-r2-and-smc-t",
    waveId: "W4",
    veteranSummary:
      "When severe service-connected disabilities, housebound limits, regular Aid and Attendance, or Traumatic Brain Injury (TBI) care needs qualify for Special Monthly Compensation above the standard 100% rate.",
    practitionerSummary:
      "Covers 38 U.S.C. § 1114(l)–(t), Barry v. McDonough incremental § 3.350(f)(3)–(4) step increases, Laska v. McDonough TBI SMC(t) invalidation of § 3.352(b)(2), and George v. McDonough CUE boundaries.",
  },
];

export default function HomePage() {
  const manifest = getCoverageManifest();
  const pb01 = loadPlaybook01Overlay();

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      {/* Hero & Provenance Strip */}
      <section className="space-y-4 border-b border-border pb-8">
        <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-1 font-mono text-xs text-muted-foreground">
          <span>Active Bookmark: {manifest.activeBookmarkWave}</span>
          <span aria-hidden="true">·</span>
          <span>{manifest.totals.upstreamModules} Live Modules Pulled</span>
          <span aria-hidden="true">·</span>
          <span>{manifest.totals.heldAtGateModules} Held as Placeholders</span>
          <span aria-hidden="true">·</span>
          <span>Checked {manifest.checkedAsOf}</span>
        </div>

        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Connect a VA Decision, the Exact Law in Force, and the Records That Matter
        </h1>
        <p
          data-persona="veteran-only"
          className="max-w-3xl text-base leading-relaxed text-muted-foreground"
        >
          <LexiconText text="Plain-English guides for Veterans and Survivors—explaining what rating codes and historical VA rules mean, which service or hospital records to request, and concrete questions to discuss with an accredited VSO, claims agent, or attorney." />
        </p>
        <p
          data-persona="practitioner-only"
          className="max-w-3xl text-base leading-relaxed text-muted-foreground"
        >
          Point-in-time <code className="font-mono text-sm">38 C.F.R.</code>{" "}
          snapshots, Federal Register publication-vs.-effective dates,{" "}
          <code className="font-mono text-sm">1933–1991</code> Title 38 statutory
          crosswalks, bitemporal <em>George v. McDonough</em> /{" "}
          <code className="font-mono text-sm">§ 20.1403(e)</code> scope analysis,
          and pre-filing C-file audit gates.
        </p>

        {/* Prominent Unified Explainable Search Launcher */}
        <HomeSearchLauncher />

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium">
          <Link
            href="/vasrd"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            <span>All 15 VASRD Body-System Hubs</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            href="/eras"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            <span>5 Historical Era Lenses (1945–2026)</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            href="/crosswalk"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            <span>1933 ↔ 1958 ↔ 1991 Statutory Crosswalk</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            href="/reference/forms-and-codes"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            <span>Legacy Forms &amp; Code-Sheet Decoder</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            href="/checklists/board-cue-pre-filing-gate"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            <span>Board CUE Pre-Filing Gate</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Five Core Situation Entry Cards */}
      <section aria-labelledby="situations-heading" className="space-y-4">
        <h2
          id="situations-heading"
          className="font-serif text-xl font-semibold tracking-tight"
        >
          Start With Your Research Question
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_SITUATION_CARDS.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="space-y-2">
                <h3 className="flex items-center justify-between gap-2 text-base font-semibold text-foreground">
                  <span>{card.title}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </h3>
                <p
                  data-persona="veteran-only"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  <LexiconText text={card.veteranSummary} />
                </p>
                <p
                  data-persona="practitioner-only"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {card.practitionerSummary}
                </p>
              </div>
              <p className="mt-4 font-mono text-xs text-muted-foreground">
                {card.exampleQueries.join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Interactive Fisheye Chronology Rail + Decision-Date-Reactive Pathway / Law Tree */}
      <FisheyeTimelineRail />
      <OsintKnowledgeTree defaultDate={manifest.checkedAsOf} compact />

      {/* Live Wave 1 Provenance & Cross-Inspection Preview */}
      <section aria-labelledby="wave1-heading" className="space-y-4">
        <h2
          id="wave1-heading"
          className="font-serif text-xl font-semibold tracking-tight"
        >
          Live Wave 1 Tracer Bullet: Combat &amp; Scar Ratings vs. Muscle Group Injuries
        </h2>

        <CoverageBanner
          state="VERBATIM_VERIFIED"
          checkedAsOf={manifest.checkedAsOf}
          corpusReleaseId={manifest.corpusReleaseId}
          detail="Wave 1 starter slice active: 38 C.F.R. § 4.56 (1946–1997 vs. 1997–present), § 4.118 Scars (2002/2008/2018 + quarantined 90 FR 46542 proposal), § 3.156(c) Service Records, and Playbook 01."
          officialEcfrUrl="https://www.ecfr.gov/current/title-38/chapter-I/part-4/section-4.56"
          officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-elevated p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {pb01.plain_english_title}
              </h3>
              <Link
                href="/playbooks/01-penetrating-wounds-scars-vs-muscles"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Open Full 3-Column Playbook 01</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-3">
              <CrossInspectionExpander
                veteranContent={
                  <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      <LexiconText text={pb01.what_this_means} />
                    </p>
                    <div>
                      <strong className="font-semibold text-foreground">
                        Questions to Discuss With an Accredited Representative:
                      </strong>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5">
                        {pb01.questions_for_representative.slice(0, 2).map((q) => (
                          <li key={q}>
                            <LexiconText text={q} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                }
                practitionerContent={
                  <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      <strong className="font-semibold text-foreground">
                        Substantive &amp; Bitemporal Scope:
                      </strong>{" "}
                      Under <em>Esteban v. Brown</em>, 6 Vet. App. 259 (1994) (construing
                      plain text of <code className="font-mono text-xs">38 C.F.R. § 4.14</code>{" "}
                      since 1946 — no <code className="font-mono text-xs">§ 20.1403(e)</code>{" "}
                      change-in-interpretation bar), cutaneous scar tenderness (
                      <code className="font-mono text-xs">DC 7800–7805</code>), muscle-group
                      impairment (<code className="font-mono text-xs">DC 5301–5323</code>,{" "}
                      <code className="font-mono text-xs">§ 4.56</code>), and peripheral
                      nerve deficits (<code className="font-mono text-xs">DC 8510–8730</code>)
                      represent distinct manifestations.
                    </p>
                    <p>
                      <strong className="font-semibold text-foreground">
                        Critical Effective-Date Trap:
                      </strong>{" "}
                      <code className="font-mono text-xs">62 FR 30235</code> was published{" "}
                      <code className="font-mono text-xs">1997-06-03</code>,{" "}
                      <strong>effective 1997-07-03</strong>. Pre-July 3, 1997 CUE motions
                      must cite the 1946–1997 print text, and must verify manifest payment
                      change under <code className="font-mono text-xs">38 C.F.R. § 4.25</code>.
                    </p>
                  </div>
                }
              />
            </div>
          </div>

          <SourceProvenancePanel
            officialCitation="38 C.F.R. § 4.56 · 29 FR 6718 (eff. 1946-04-01) & 62 FR 30235 (pub. 1997-06-03, eff. 1997-07-03)"
            publicationDate="1997-06-03"
            effectiveFrom="1997-07-03"
            effectiveTo="present"
            transcriptionLevel="Verbatim Primary Source"
            checkedAsOf={manifest.checkedAsOf}
            corpusReleaseId={manifest.corpusReleaseId}
            bookmarkWave={manifest.activeBookmarkWave}
            primarySourceUrl="https://www.ecfr.gov/current/title-38/chapter-I/part-4/section-4.56"
            limitationsNote="Sept. 29, 2025 painful-scars notice (90 FR 46542) is a proposed rule only and is quarantined from enacted criteria."
          />
        </div>
      </section>

      {/* Newly Unlocked Corpus Guides (Waves W2–W5) */}
      <section aria-labelledby="unlocked-waves-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="unlocked-waves-heading"
            className="font-serif text-xl font-semibold tracking-tight"
          >
            Featured Primary-Source Investigation Playbooks (Bookmark {manifest.activeBookmarkWave})
          </h2>
          <p className="text-sm text-muted-foreground">
            All {manifest.totals.upstreamModules} primary-source-verified playbooks,
            regulatory snapshots, redlines, checklists, and era lenses are live and
            cross-linked across the library, with dedicated plain-English Veteran
            companions expanding wave by wave.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_UNLOCKED_GUIDES.map((guide) => (
            <article
              key={guide.href}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 text-sm"
            >
              <div className="space-y-2">
                <div className="font-mono text-[11px] font-semibold text-primary">
                  Wave {guide.waveId} Primary-Source Playbook
                </div>
                <h3 className="font-serif text-base font-bold text-foreground">
                  <Link href={guide.href} className="hover:text-primary hover:underline">
                    {guide.title}
                  </Link>
                </h3>
                <p
                  data-persona="veteran-only"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  <LexiconText text={guide.veteranSummary} />
                </p>
                <p
                  data-persona="practitioner-only"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {guide.practitionerSummary}
                </p>
              </div>
              <div className="mt-4 border-t border-border/70 pt-3 text-xs">
                <Link
                  href={guide.href}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Open 3-Column Playbook</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 15 VASRD Systems + Subpart A Policy Coverage Matrix */}
      <section aria-labelledby="coverage-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="coverage-heading"
            className="font-serif text-xl font-semibold tracking-tight"
          >
            15-System VASRD &amp; Subpart A Policy Coverage Matrix
          </h2>
          <Link
            href="/vasrd"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Open Full VASRD Directory</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {manifest.vasrdSystems.map((sys) => (
            <div
              key={sys.systemId}
              className="flex flex-col justify-between gap-2 rounded-md border border-border bg-surface-elevated p-4 text-sm"
            >
              <div>
                <Link
                  href={`/vasrd/${sys.systemId}`}
                  className="font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {sys.label} →
                </Link>
                <div className="font-mono text-xs text-muted-foreground">
                  {sys.diagnosticCodeRange} · {sys.moduleIds.length} verified module(s)
                  live
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="font-medium text-primary">
                  {BADGE_LABELS[sys.coverageState]}
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/vasrd/${sys.systemId}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    Open Hub →
                  </Link>
                  <a
                    href={sys.officialEcfrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 text-muted-foreground hover:text-foreground"
                  >
                    Official eCFR ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
