"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertCircle, Calendar, CheckCircle2, ExternalLink, History } from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import { stripMarkdownSyntax } from "@/lib/corpus/diff";
import { resolveCfrAtDate } from "@/lib/corpus/temporal";
import {
  classifyPrecedentNonprecedential,
  getVasrdSystemLabel,
  type CompiledCfrSection,
  type CompiledCfrSnapshot,
  type CoverageState,
} from "@/lib/corpus/types";
import { cn } from "@/lib/utils";
import { CoverageBanner } from "./coverage-banner";
import { CrossInspectionExpander } from "./cross-inspection-expander";
import { VeteranOverlayCard } from "./veteran-overlay-card";
import { VerbatimCfrBlock } from "./verbatim-cfr-block";
import { TwoPaneTemporalView } from "./two-pane-temporal-view";
import { CfrRedlineViewer } from "./cfr-redline-viewer";
import { SourceProvenancePanel } from "./source-provenance-panel";
import { PlannedModulePlaceholder } from "./planned-module-placeholder";
import { QuarantinedWatchlistCard } from "./quarantined-watchlist-card";
import { LexiconText } from "./lexicon-text";

function subscribeLocationSearch(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getClientDateQueryParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const urlDate = params.get("date");
  return urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate) ? urlDate : null;
}

function getServerDateQueryParam(): string | null {
  return null;
}

const SECTION_QUICK_PROBE_DATES: Readonly<
  Record<string, ReadonlyArray<{ label: string; date: string }>>
> = {
  "38-cfr-4.56": [
    { label: "Vietnam Era (1969-11-15)", date: "1969-11-15" },
    { label: "FR Pub-vs-Eff Trap (1997-06-20)", date: "1997-06-20" },
    { label: "Post-Overhaul (1997-07-03)", date: "1997-07-03" },
  ],
  "38-cfr-4.118": [
    { label: "Pre-2002 Baseline (1995-05-10)", date: "1995-05-10" },
    { label: "2002 8-Feature Era (2005-04-01)", date: "2005-04-01" },
    { label: "2008 Scar-Count Era (2012-06-01)", date: "2012-06-01" },
    { label: "Current 2018 Rule (2024-07-01)", date: "2024-07-01" },
  ],
  "38-cfr-3.156c": [
    { label: "Pre-2006 / Vigil Era (1998-03-10)", date: "1998-03-10" },
    { label: "FR Pub-vs-Eff Trap (2006-09-20)", date: "2006-09-20" },
    { label: "Current Rule (2024-07-01)", date: "2024-07-01" },
  ],
  "38-cfr-3.12a-l": [
    { label: "Pre-2024 COD (2019-06-01)", date: "2019-06-01" },
    { label: "FR Pub-vs-Eff Trap (2024-05-15)", date: "2024-05-15" },
    { label: "2024 COD Overhaul (2024-06-25)", date: "2024-06-25" },
  ],
  "38-cfr-4.110-4.114": [
    { label: "Pre-2024 Digestive (2015-08-01)", date: "2015-08-01" },
    { label: "FR Pub-vs-Eff Trap (2024-04-15)", date: "2024-04-15" },
    { label: "2024 Digestive Rule (2024-05-19)", date: "2024-05-19" },
  ],
  "38-cfr-4.16a-b": [
    { label: "1975 Schedular Base (1985-06-01)", date: "1985-06-01" },
    { label: "FR Pub-vs-Eff Trap (1990-08-15)", date: "1990-08-15" },
    { label: "1990 Marginal-Income Rule (1990-09-04)", date: "1990-09-04" },
  ],
  "38-cfr-4.71a-4.73": [
    { label: "Pre-2002 Spine (1995-04-01)", date: "1995-04-01" },
    { label: "2003 ROM Spine (2010-06-01)", date: "2010-06-01" },
    { label: "FR Pub-vs-Eff Trap (2020-12-15)", date: "2020-12-15" },
    { label: "2021 Overhaul (2021-02-07)", date: "2021-02-07" },
  ],
  "38-cfr-4.100-4.104": [
    { label: "Pre-1998 Heart (1992-05-01)", date: "1992-05-01" },
    { label: "1998 LVEF Era (2010-05-01)", date: "2010-05-01" },
    { label: "FR Pub-vs-Eff Trap (2021-10-15)", date: "2021-10-15" },
    { label: "2021 METs Formula (2021-11-14)", date: "2021-11-14" },
  ],
  "38-cfr-4.124a-dc-8045": [
    { label: "Pre-2008 10% Cap (2004-06-01)", date: "2004-06-01" },
    { label: "FR Pub-vs-Eff Trap (2008-10-01)", date: "2008-10-01" },
    { label: "2008 10-Facet Table (2008-10-23)", date: "2008-10-23" },
  ],
};

export function CfrSectionWorkspace({
  section,
  pinnedVersion,
  checkedAsOf,
  corpusReleaseId,
  activeBookmarkWave,
}: {
  section: CompiledCfrSection;
  pinnedVersion?: CompiledCfrSnapshot | null;
  checkedAsOf: string;
  corpusReleaseId: string;
  activeBookmarkWave: string;
}) {
  const { decisionDate, setDecisionDate } = useResearchContext();
  const queryDateOverride = useSyncExternalStore(
    subscribeLocationSearch,
    getClientDateQueryParam,
    getServerDateQueryParam,
  );

  const latestEnacted = section.versions[section.versions.length - 1] ?? null;
  const isSupersededOrRepealedSection = Boolean(
    latestEnacted &&
      latestEnacted.effective_to &&
      latestEnacted.effective_to !== "present",
  );
  const successorLink = section.successorSection
    ? {
        cfrSection: section.successorSection.cfrSection,
        permalink: section.successorSection.permalink,
      }
    : section.relatedComparisonSnapshots?.[0]
      ? {
          cfrSection: `${section.relatedComparisonSnapshots[0].cfr_section} (Eff. ${section.relatedComparisonSnapshots[0].effective_from})`,
          permalink: section.relatedComparisonSnapshots[0].permalink,
        }
      : null;

  const userSelectedDate = decisionDate ?? queryDateOverride;
  const defaultSectionDate = isSupersededOrRepealedSection
    ? latestEnacted!.effective_to!
    : checkedAsOf;
  const effectiveDecisionDate =
    userSelectedDate ?? pinnedVersion?.effective_from ?? defaultSectionDate;

  const allRecords = [...section.versions, ...section.quarantinedWatchlist];
  const resolved = resolveCfrAtDate(
    allRecords,
    section.sectionSlug,
    effectiveDecisionDate,
  );

  // Strict Rule 01 & Rule 02 Resolution: NEVER fall back to modern eCFR when resolved.governingVersion is null!
  const activeSnapshot: CompiledCfrSnapshot | null = userSelectedDate
    ? (section.versions.find(
        (v) => v.version_id === resolved.governingVersion?.version_id,
      ) ?? null)
    : (pinnedVersion ??
      section.versions.find(
        (v) => v.version_id === resolved.governingVersion?.version_id,
      ) ??
      null);

  const isQuarantinedView =
    section.bookmarkStatus === "QUARANTINED_NONBINDING" ||
    activeSnapshot?.bookmarkStatus === "QUARANTINED_NONBINDING" ||
    activeSnapshot?.regulatory_status === "proposed-nonbinding" ||
    activeSnapshot?.regulatory_status === "interim-final-rescinded";

  const isOutOfRangeGap = !isQuarantinedView && activeSnapshot === null;
  const isPostRepealDateQuery = Boolean(
    isOutOfRangeGap &&
      isSupersededOrRepealedSection &&
      latestEnacted?.effective_to &&
      effectiveDecisionDate > latestEnacted.effective_to,
  );

  let bannerState: CoverageState;
  let bannerDetail: string | undefined;

  if (isQuarantinedView) {
    bannerState = "SUMMARY_ONLY";
    bannerDetail =
      "Quarantined Watchlist Entry — Proposed / Unfinalized or Rescinded Rulemaking (Not Enacted Law). Never cite this notice as an active 38 C.F.R. regulation.";
  } else if (isOutOfRangeGap) {
    bannerState = "CORPUS_GAP_OR_QUEUED_WAVE";
    bannerDetail = isPostRepealDateQuery
      ? `${section.cfrSection} ended or was consolidated on ${latestEnacted?.effective_to}. Open the successor regulatory snapshot linked below for decisions on or after that transition.`
      : resolved.explanation;
  } else if (section.bookmarkStatus === "HELD_AT_BOOKMARK_GATE") {
    bannerState = "CORPUS_GAP_OR_QUEUED_WAVE";
    bannerDetail = `Structured Federal Register transition dates are shown below, while full verbatim text is queued for an upcoming corpus release (${section.heldWaveId ?? "W4"}). Consult official eCFR / GovInfo before relying on exact wording.`;
  } else {
    const hasPersonaOverlay = Boolean(
      section.veteranOverlay || section.diffVeteranOverlay,
    );
    const rawSnapCoverage = activeSnapshot?.coverageState ?? section.coverageState;
    bannerState =
      rawSnapCoverage === "VERBATIM_VERIFIED" && !hasPersonaOverlay
        ? "PLAIN_ENGLISH_IN_PROGRESS"
        : rawSnapCoverage;
    bannerDetail =
      bannerState === "SUMMARY_ONLY"
        ? "Structured Summary Only for this interval — pull the official print 38 C.F.R. or eCFR edition before pleading CUE."
        : bannerState === "PLAIN_ENGLISH_IN_PROGRESS"
          ? "Verbatim 38 C.F.R. primary text and deterministic redline diffs are live below; inline acronym tooltips and plain-English context notes are active while dedicated Veteran companion cards continue expanding."
          : undefined;
  }

  const quickDates = SECTION_QUICK_PROBE_DATES[section.sectionSlug] ?? [];

  return (
    <div className="space-y-8">
      <CoverageBanner
        state={bannerState}
        checkedAsOf={checkedAsOf}
        corpusReleaseId={corpusReleaseId}
        detail={bannerDetail}
        officialEcfrUrl={section.officialEcfrUrl}
        officialGovInfoUrl={section.officialGovInfoUrl}
      />

      {/* Version Chain Bar & Boundary Probe Presets */}
      {section.versions.length > 0 && (
        <section
          aria-label="Enacted regulatory version chain"
          className="space-y-3 rounded-lg border border-border bg-surface-elevated p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <History className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Enacted Version Chain ({section.versions.length} Snapshots)</span>
            </h2>

            {quickDates.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span>Test Decision Date:</span>
                </span>
                {quickDates.map((probe) => {
                  const active = effectiveDecisionDate === probe.date && !isQuarantinedView;
                  return (
                    <button
                      key={probe.date}
                      type="button"
                      onClick={() => {
                        setDecisionDate(probe.date);
                      }}
                      className={cn(
                        "rounded border px-2 py-0.5 font-mono transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                        active
                          ? "border-primary bg-primary font-semibold text-primary-foreground"
                          : "border-border bg-surface text-foreground hover:bg-muted",
                      )}
                    >
                      {probe.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {section.versions.map((ver) => {
              const isSelected =
                !isQuarantinedView && activeSnapshot?.version_id === ver.version_id;
              return (
                <Link
                  key={ver.version_id}
                  href={ver.permalink}
                  aria-current={isSelected ? "page" : undefined}
                  className={cn(
                    "flex flex-col justify-between rounded-md border p-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                    isSelected
                      ? "border-primary bg-surface shadow-xs"
                      : "border-border bg-background hover:bg-surface/70",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 font-mono text-[11px]">
                      <span className="font-semibold text-primary">
                        Eff. {ver.effective_from}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden="true" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 font-medium text-foreground">
                      {ver.heading ?? ver.cfr_section}
                    </p>
                  </div>
                  <p className="mt-2 border-t border-border/60 pt-1.5 font-mono text-[10px] text-muted-foreground">
                    Pub: {ver.publication_date ?? "Baseline"} · Ends:{" "}
                    {ver.effective_to ?? "present"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Primary Dual-Persona Content + Source Provenance Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {isSupersededOrRepealedSection && !isOutOfRangeGap && !isQuarantinedView && latestEnacted && (
            <div className="space-y-2 rounded-lg border border-primary/35 bg-surface-elevated p-4 text-xs leading-relaxed">
              <div className="font-semibold text-foreground">
                Historical / Superseded Regulatory Provision (Ended {latestEnacted.effective_to})
              </div>
              <p className="text-muted-foreground">
                This snapshot chain governed decisions through{" "}
                <span className="font-mono font-semibold text-foreground">
                  {latestEnacted.effective_to}
                </span>
                . Showing the final enacted historical snapshot by default rather than
                substituting modern post-consolidation text.
              </p>
              {successorLink && (
                <div>
                  <Link
                    href={successorLink.permalink}
                    className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    <span>Open Successor Provision: {successorLink.cfrSection} →</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {isQuarantinedView ? (
            <QuarantinedWatchlistCard
              items={activeSnapshot ? [activeSnapshot] : section.quarantinedWatchlist}
            />
          ) : isOutOfRangeGap ? (
            <section
              aria-label="Unindexed historical date warning"
              style={{
                backgroundColor: "var(--status-gap-bg)",
                color: "var(--status-gap-fg)",
                borderColor: "var(--status-gap-border)",
              }}
              className="space-y-3 rounded-lg border p-5 text-sm leading-relaxed"
            >
              <div className="inline-flex items-center gap-2 font-bold">
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h2>
                  {isPostRepealDateQuery
                    ? `Provision Repealed or Consolidated Before ${effectiveDecisionDate} (Ended ${latestEnacted?.effective_to})`
                    : `No Indexed Snapshot Covers ${effectiveDecisionDate} — Do Not Rely`}
                </h2>
              </div>
              <p>
                {isPostRepealDateQuery
                  ? `${section.cfrSection} ended or was consolidated on ${latestEnacted?.effective_to}. Decisions rendered on ${effectiveDecisionDate} are governed by the successor regulatory provision.`
                  : resolved.explanation}
              </p>
              <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold">
                {successorLink && (
                  <Link
                    href={successorLink.permalink}
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Open Successor Provision ({successorLink.cfrSection}) →</span>
                  </Link>
                )}
                <a
                  href={section.officialGovInfoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  <span>Pull Contemporaneous Annual CFR on GovInfo</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => setDecisionDate(null)}
                  className="underline underline-offset-2"
                >
                  Reset Decision Date
                </button>
              </div>
            </section>
          ) : section.bookmarkStatus !== "HELD_AT_BOOKMARK_GATE" && activeSnapshot ? (
            <div className="space-y-4">
              <CrossInspectionExpander
                veteranContent={
                  section.veteranOverlay || section.diffVeteranOverlay ? (
                    <div className="space-y-4">
                      {section.veteranOverlay && (
                        <VeteranOverlayCard overlay={section.veteranOverlay} />
                      )}
                      {section.diffVeteranOverlay && (
                        <VeteranOverlayCard overlay={section.diffVeteranOverlay} />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
                      <div className="font-serif text-base font-bold text-foreground">
                        Point-in-Time Effective Dates &amp; Linked Primary Regulation Guides
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <LexiconText
                          text={stripMarkdownSyntax(
                            activeSnapshot.eraNote ?? section.summary,
                          )}
                        />
                      </p>
                      {(section.companionModules ?? []).length > 0 && (
                        <div className="space-y-2 rounded-md border border-border bg-surface-elevated p-3 text-xs">
                          <div className="font-semibold text-foreground">
                            Open Full Verbatim Regulation &amp; Historical Comparison Guides:
                          </div>
                          <ul className="space-y-1.5">
                            {(section.companionModules ?? []).map((mod) => (
                              <li key={mod.id}>
                                <Link
                                  href={mod.route}
                                  className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                                >
                                  {mod.title} →
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                }
                practitionerContent={
                  <section
                    aria-label={`Regulatory authority effective ${activeSnapshot.effective_from}`}
                    className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                      <div>
                        <span className="font-mono text-xs font-semibold text-primary">
                          {activeSnapshot.federal_register_citation ??
                            "Historical CFR Baseline"}
                        </span>
                        <h2 className="font-serif text-xl font-bold text-foreground">
                          {activeSnapshot.cfr_section} — {activeSnapshot.heading}
                        </h2>
                      </div>
                      <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                        Effective {activeSnapshot.effective_from} →{" "}
                        {activeSnapshot.effective_to ?? "present"}
                      </span>
                    </div>

                    {activeSnapshot.verbatimMarkdown || activeSnapshot.eraNote ? (
                      <VerbatimCfrBlock
                        verbatimMarkdown={activeSnapshot.verbatimMarkdown}
                        eraNote={activeSnapshot.eraNote}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        <LexiconText
                          text={activeSnapshot.applicability_and_transition_notes ?? ""}
                        />
                      </p>
                    )}

                    {(section.companionModules ?? []).length > 0 && (
                      <div className="space-y-2 rounded-md border border-border bg-surface-elevated p-3.5 text-xs">
                        <h3 className="font-semibold text-foreground">
                          Full Multi-Section Verbatim Snapshots &amp; Redline Modules
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(section.companionModules ?? []).map((mod) => (
                            <Link
                              key={mod.id}
                              href={mod.route}
                              className="rounded border border-border bg-surface p-2.5 font-medium text-primary hover:bg-muted"
                            >
                              {mod.title} →
                            </Link>
                          ))}
                        </div>
                        {section.vasrdSystem && (
                          <div className="pt-1">
                            <Link
                              href={`/vasrd/${section.vasrdSystem}`}
                              className="font-mono text-[11px] font-semibold text-primary underline underline-offset-2"
                            >
                              Open VASRD Hub: {getVasrdSystemLabel(section.vasrdSystem)} →
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {section.keyPrecedents.length > 0 && (
                      <div className="rounded-md border border-border bg-surface-elevated p-3.5 text-xs">
                        <h3 className="font-semibold text-foreground">
                          Governing Judicial Authorities Cited in Snapshot
                        </h3>
                        <ul className="mt-1.5 list-disc space-y-1.5 pl-4 font-mono text-[11px] text-muted-foreground">
                          {section.keyPrecedents.map((cite) => {
                            const nonprec = classifyPrecedentNonprecedential(cite);
                            return (
                              <li key={cite}>
                                <span>{cite}</span>
                                {nonprec.isRule30a && (
                                  <span className="ml-2 inline-block rounded border border-accent/60 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                    Nonprecedential — CAVC Rule 30(a)
                                  </span>
                                )}
                                {nonprec.isFedCirNonprecedential && (
                                  <span className="ml-2 inline-block rounded border border-accent/60 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                    Nonprecedential — Fed. Cir. R. 32.1
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </section>
                }
              />
            </div>
          ) : (
            <PlannedModulePlaceholder
              topic={{
                slug: section.sectionSlug,
                route: `/cfr/${section.sectionSlug}`,
                title: `${section.cfrSection} — ${section.title}`,
                category: "cfr",
                waveId:
                  (section.heldWaveId as "W2" | "W3" | "W4" | "W5" | null) ?? "W4",
                authoritySummary:
                  activeSnapshot?.federal_register_citation ?? section.cfrSection,
                veteranPreview:
                  "Structured Federal Register effective dates are indexed below, while full verbatim text and plain-English Veteran companions are scheduled for an upcoming corpus release. Consult the official eCFR / GovInfo links before relying on exact wording.",
                practitionerPreview: section.summary,
                officialFallbackUrl: section.officialEcfrUrl,
              }}
            />
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {activeSnapshot && (
            <SourceProvenancePanel
              officialCitation={
                activeSnapshot.federal_register_citation ?? activeSnapshot.cfr_section
              }
              publicationDate={activeSnapshot.publication_date}
              effectiveFrom={activeSnapshot.effective_from}
              effectiveTo={activeSnapshot.effective_to}
              isQuarantinedNonbinding={isQuarantinedView}
              transcriptionLevel={
                !isQuarantinedView &&
                activeSnapshot.coverageState === "VERBATIM_VERIFIED" &&
                Boolean(activeSnapshot.verbatimMarkdown)
                  ? "Verbatim Primary Source"
                  : "Structured Summary Only"
              }
              checkedAsOf={checkedAsOf}
              corpusReleaseId={corpusReleaseId}
              bookmarkWave={activeBookmarkWave}
              primarySourceUrl={section.officialEcfrUrl}
              limitationsNote={activeSnapshot.applicability_and_transition_notes}
            />
          )}

          {section.cFileTriggers.length > 0 && (
            <aside
              aria-label="Claims file audit triggers"
              className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
            >
              <h3 className="border-b border-border pb-2 font-semibold text-foreground">
                When to Audit This Section in a C-File
              </h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-muted-foreground">
                {section.cFileTriggers.map((trig, idx) => (
                  <li key={idx}>
                    <LexiconText text={trig} />
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>

      {/* Two-Pane Bitemporal View (Law Then vs. Vehicles Today + Quarantined Watchlist) */}
      <TwoPaneTemporalView
        section={section}
        effectiveDecisionDate={effectiveDecisionDate}
      />

      {/* Deterministic Side-by-Side & Inline Redline Diffs + Upstream Trap Matrices */}
      {(section.bookmarkStatus === "WAVE_1_LIVE_VERBATIM" ||
        section.trapTables.length > 0) && (
        <CfrRedlineViewer
          versions={section.versions}
          relatedComparisonSnapshots={section.relatedComparisonSnapshots}
          trapTables={section.trapTables}
        />
      )}
    </div>
  );
}
