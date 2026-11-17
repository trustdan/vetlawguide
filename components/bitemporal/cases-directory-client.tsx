"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Scale,
  Search,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { useResearchContext } from "@/components/providers/research-context";
import {
  HISTORICAL_ERAS,
  filterAuthoritiesForSelectedEra,
  getHistoricalEraById,
  type EraAuthorityFilterMode,
} from "@/lib/corpus/eras-and-authorities";
import {
  CANONICAL_PRACTICE_DOMAINS,
  type AuthorityTier,
  type PrecedentEntry,
} from "@/lib/corpus/types";
import { cn } from "@/lib/utils";

type TierFilterId = "all" | AuthorityTier | "nonprecedential-watchlist";

const TIER_FILTERS: ReadonlyArray<{
  id: TierFilterId;
  label: string;
}> = [
  { id: "all", label: "All Authorities" },
  { id: "scotus", label: "U.S. Supreme Court" },
  { id: "fed-cir", label: "Federal Circuit" },
  { id: "cavc-precedential", label: "CAVC Precedential" },
  { id: "vaopgcprec-binding", label: "VAOPGCPREC (Binding)" },
  { id: "vaopgcprec-quarantined", label: "Withdrawn / Invalidated OGC" },
  {
    id: "nonprecedential-watchlist",
    label: "Nonprecedential Watchlist (Rule 30(a) & R. 32.1)",
  },
];

const TIER_BADGE_LABELS: Record<AuthorityTier, string> = {
  scotus: "U.S. Supreme Court",
  "fed-cir": "Fed. Cir. Precedential",
  "cavc-precedential": "CAVC Precedential",
  "vaopgcprec-binding": "VAOPGCPREC · Binding OGC",
  "vaopgcprec-quarantined": "VAOPGCPREC · Quarantined / Withdrawn",
  "cavc-nonprecedential-rule30a": "Nonprecedential · CAVC Rule 30(a)",
  "fed-cir-nonprecedential": "Nonprecedential · Fed. Cir. R. 32.1",
  "district-or-other": "Federal District / Class Order",
};

function matchesAuthoritySearch(entry: PrecedentEntry, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    entry.citation,
    entry.shortTitle ?? "",
    entry.federalRegisterCitation ?? "",
    entry.coreHolding ?? "",
    entry.litigationUtility ?? "",
    entry.veteranPlainSummary ?? "",
    entry.validityLabel ?? "",
    ...(entry.citedByModules?.map((m) => m.title) ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function AuthorityCard({
  entry,
  activeEraSelected,
}: {
  entry: PrecedentEntry;
  activeEraSelected: boolean;
}) {
  const [modulesOpen, setModulesOpen] = useState(false);

  const tier = entry.authorityTier ?? "cavc-precedential";
  const isQuarantinedOrNonprec =
    tier === "vaopgcprec-quarantined" ||
    entry.validityStatus === "withdrawn" ||
    entry.validityStatus === "invalidated-or-superseded" ||
    entry.isNonprecedentialRule30a ||
    Boolean(entry.isNonprecedentialFedCir);

  const citedModules = entry.citedByModules ?? [];
  const previewModules = modulesOpen ? citedModules : citedModules.slice(0, 3);
  const applicableEras = entry.applicableDecisionEras ?? [];

  return (
    <article
      className={cn(
        "flex min-w-0 max-w-full flex-col justify-between rounded-lg border bg-surface-elevated p-4 text-xs break-words transition-colors",
        isQuarantinedOrNonprec
          ? "quarantine-stripe border-accent/60"
          : "border-border",
      )}
    >
      <div className="space-y-2.5">
        {/* Top Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[10px] font-semibold",
                isQuarantinedOrNonprec
                  ? "border border-accent/50 bg-surface font-bold text-accent"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {TIER_BADGE_LABELS[tier]}
            </span>

            {entry.issuanceYear && (
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                Issued {entry.issuanceDateLabel ?? entry.issuanceYear}
              </span>
            )}

            {entry.eraGovernanceScope === "cross-era" ? (
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                Cross-Era Doctrine (1945–Present)
              </span>
            ) : (
              <span className="rounded border border-primary/40 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                Era-Bounded ({applicableEras.length} Era
                {applicableEras.length === 1 ? "" : "s"})
              </span>
            )}
          </div>

          <span className="font-mono text-[10px] text-muted-foreground">
            Checked {entry.checkedAsOf}
          </span>
        </div>

        {/* Citation Heading */}
        <div>
          <h3 className="font-serif text-base font-bold text-foreground">
            {entry.citation}
          </h3>
          {entry.validityLabel && (
            <p
              className={cn(
                "mt-0.5 font-mono text-[11px]",
                isQuarantinedOrNonprec
                  ? "font-semibold text-accent"
                  : "text-muted-foreground",
              )}
            >
              Status: {entry.validityLabel}
            </p>
          )}
        </div>

        {/* Nonprecedential / Quarantined Explicit Guardrails (Rule 02) */}
        {entry.isNonprecedentialRule30a && (
          <div className="rounded border border-accent/40 bg-surface p-2 text-[11px] font-semibold text-accent">
            Nonprecedential single-judge memorandum decision (CAVC Rule 30(a)) —
            do not cite as binding precedent.
          </div>
        )}
        {entry.isNonprecedentialFedCir && (
          <div className="rounded border border-accent/40 bg-surface p-2 text-[11px] font-semibold text-accent">
            Nonprecedential Federal Circuit disposition (Fed. Cir. R. 32.1).
          </div>
        )}
        {tier === "vaopgcprec-quarantined" && (
          <div className="rounded border border-accent/40 bg-surface p-2 text-[11px] font-semibold text-accent">
            Quarantined / Withdrawn or Invalidated OGC Opinion — never cite as
            active binding law (relevant only when auditing historical pre-withdrawal
            decisions under 38 C.F.R. § 20.1403(e)).
          </div>
        )}

        {/* Dual-Persona Holding, Plain-English Summary & Litigation Scope With Cross-Inspection */}
        {entry.coreHolding && (
          <p className="leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Holding: </strong>
            <LexiconText text={entry.coreHolding} />
          </p>
        )}

        {(entry.veteranPlainSummary || entry.litigationUtility) && (
          <CrossInspectionExpander
            veteranContent={
              entry.veteranPlainSummary ? (
                <p className="rounded-md border border-border/80 bg-surface p-2.5 leading-relaxed text-foreground">
                  <strong className="font-semibold text-primary">
                    Plain-English Meaning:{" "}
                  </strong>
                  <LexiconText text={entry.veteranPlainSummary} />
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <LexiconText
                    text={`Referenced across ${citedModules.length} guide(s) below. Expand practitioner notes for technical audit & pleading scope.`}
                  />
                </p>
              )
            }
            practitionerContent={
              entry.litigationUtility ? (
                <p className="rounded-md border border-border/80 bg-surface p-2.5 leading-relaxed text-muted-foreground">
                  <strong className="font-semibold text-foreground">
                    Audit &amp; Pleading Scope:{" "}
                  </strong>
                  <LexiconText text={entry.litigationUtility} />
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {`Controlling ${TIER_BADGE_LABELS[tier]} authority cited across ${citedModules.length} corpus module(s).`}
                </p>
              )
            }
          />
        )}

        {/* Applicable Decision Eras Pills */}
        {applicableEras.length > 0 && applicableEras.length < 5 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground">
              Governs Decisions In:
            </span>
            {applicableEras.map((eId) => {
              const spec = getHistoricalEraById(eId);
              if (!spec) return null;
              return (
                <span
                  key={eId}
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[10px]",
                    activeEraSelected
                      ? "border-primary/40 bg-surface font-semibold text-foreground"
                      : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  {spec.windowLabel}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Reverse "Cited In" Corpus Module Links */}
      {citedModules.length > 0 && (
        <div className="mt-3 border-t border-border/70 pt-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold text-muted-foreground">
              Cited in {citedModules.length} Corpus Module
              {citedModules.length === 1 ? "" : "s"}:
            </span>
            {citedModules.length > 3 && (
              <button
                type="button"
                aria-expanded={modulesOpen}
                onClick={() => setModulesOpen((prev) => !prev)}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span>
                  {modulesOpen
                    ? "Show fewer"
                    : `+${citedModules.length - 3} more`}
                </span>
                {modulesOpen ? (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {previewModules.map((mod) => (
              <Link
                key={mod.id}
                href={mod.route}
                className="inline-flex max-w-full items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="truncate">{mod.title}</span>
                <ArrowRight className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export function CasesDirectoryClient({
  precedents,
  checkedAsOf,
  totalModules,
}: {
  precedents: ReadonlyArray<PrecedentEntry>;
  checkedAsOf: string;
  totalModules: number;
}) {
  const { activeEraId, selectEra, decisionDate } = useResearchContext();

  const [filterMode, setFilterMode] =
    useState<EraAuthorityFilterMode>("decision-governance");
  const [showCrossEraWhenFiltered, setShowCrossEraWhenFiltered] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierFilterId>("all");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [query, setQuery] = useState("");

  const activeEraSpec = getHistoricalEraById(activeEraId);

  // 1. Apply non-era facet filters (Tier, Domain, Text Search)
  const facetFiltered = useMemo(() => {
    return precedents.filter((entry) => {
      if (selectedTier === "nonprecedential-watchlist") {
        if (
          entry.authorityTier !== "cavc-nonprecedential-rule30a" &&
          entry.authorityTier !== "fed-cir-nonprecedential"
        ) {
          return false;
        }
      } else if (selectedTier !== "all" && entry.authorityTier !== selectedTier) {
        return false;
      }
      if (
        selectedDomain !== "all" &&
        !(entry.practiceDomains ?? []).includes(selectedDomain)
      ) {
        return false;
      }
      return matchesAuthoritySearch(entry, query);
    });
  }, [precedents, selectedTier, selectedDomain, query]);

  // 2. Apply Bitemporal Era Filter synchronized to Sticky Top Era Bar
  const eraPartition = useMemo(
    () =>
      filterAuthoritiesForSelectedEra({
        authorities: facetFiltered,
        selectedEraId: activeEraId,
        filterMode,
      }),
    [facetFiltered, activeEraId, filterMode],
  );

  // Sort curated landmarks & VAOPGCPREC digests to the top within each bucket so high-signal cards lead
  const sortedPrimary = useMemo(() => {
    return [...eraPartition.eraSpecificAuthorities].sort((a, b) => {
      const aCur = a.isCuratedLandmark ? 1 : 0;
      const bCur = b.isCuratedLandmark ? 1 : 0;
      if (aCur !== bCur) return bCur - aCur;
      return b.citedByModuleIds.length - a.citedByModuleIds.length || a.citation.localeCompare(b.citation);
    });
  }, [eraPartition.eraSpecificAuthorities]);

  const sortedCrossEra = useMemo(() => {
    return [...eraPartition.crossEraAuthorities].sort((a, b) => {
      const aCur = a.isCuratedLandmark ? 1 : 0;
      const bCur = b.isCuratedLandmark ? 1 : 0;
      if (aCur !== bCur) return bCur - aCur;
      return b.citedByModuleIds.length - a.citedByModuleIds.length || a.citation.localeCompare(b.citation);
    });
  }, [eraPartition.crossEraAuthorities]);

  return (
    <div className="space-y-6">
      {/* Sticky Top Era Synchronization & Bitemporal Lens Control */}
      <section
        aria-label="Era authority filter status and bitemporal mode"
        className="space-y-3 rounded-xl border border-border bg-surface p-4 text-xs sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {activeEraSpec ? (
              <>
                <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {`Filtered by Top Era Bar: ${activeEraSpec.fullTitle} (${decisionDate})`}
                  </span>
                </div>
                <p className="max-w-3xl leading-relaxed text-muted-foreground">
                  Because federal Veterans Law court review began November 18, 1988
                  (VJRA) and binding VAOPGCPREC opinions began in 1989, VetLawGuide
                  separates{" "}
                  <strong className="text-foreground">
                    authorities governing decisions from {activeEraSpec.windowLabel}
                  </strong>{" "}
                  (default) from{" "}
                  <strong className="text-foreground">
                    opinions issued during {activeEraSpec.windowLabel}
                  </strong>
                  —without guessing single-era tags for cross-era doctrines.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>
                    {`Showing All ${facetFiltered.length} Judicial & VA OGC Authorities Across ${totalModules} Corpus Modules (Checked ${checkedAsOf})`}
                  </span>
                </div>
                <p className="max-w-3xl leading-relaxed text-muted-foreground">
                  Click any of the{" "}
                  <strong className="text-foreground">5 Historical Eras</strong> in
                  the sticky bar at the top of the page (or below) to immediately
                  filter court decisions and General Counsel opinions for that era.
                </p>
              </>
            )}
          </div>

          {activeEraSpec && (
            <button
              type="button"
              onClick={() => selectEra(null)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Show All Eras ({facetFiltered.length})</span>
            </button>
          )}
        </div>

        {/* Quick Era Selector Strip (Mirrors Top Sticky Bar) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            aria-pressed={activeEraId === null}
            onClick={() => selectEra(null)}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-primary",
              activeEraId === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground",
            )}
          >
            All Eras ({facetFiltered.length})
          </button>
          {HISTORICAL_ERAS.map((era) => {
            const isSelected = activeEraId === era.eraId;
            return (
              <button
                key={era.eraId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectEra(era.eraId)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-primary",
                  isSelected
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-border bg-surface-elevated text-foreground hover:border-primary/60",
                )}
              >
                <span className="font-mono font-semibold">{era.windowLabel}</span>{" "}
                <span
                  className={
                    isSelected ? "text-primary-foreground" : "text-muted-foreground"
                  }
                >
                  · {era.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bitemporal Era Lens Switcher (Visible Whenever an Era Is Selected) */}
        {activeEraSpec && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3">
            <div
              role="group"
              aria-label="How to match authorities to the selected era"
              className="flex min-w-0 max-w-full flex-wrap items-center gap-1 rounded-md border border-border bg-background p-0.5"
            >
              <button
                type="button"
                aria-pressed={filterMode === "decision-governance"}
                onClick={() => setFilterMode("decision-governance")}
                className={cn(
                  "max-w-full rounded px-2.5 py-1 text-left text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                  filterMode === "decision-governance"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Governs {activeEraSpec.windowLabel} VA Decisions (
                {sortedPrimary.length} Era-Specific + {sortedCrossEra.length}{" "}
                Cross-Era)
              </button>
              <button
                type="button"
                aria-pressed={filterMode === "issuance-year"}
                onClick={() => setFilterMode("issuance-year")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                  filterMode === "issuance-year"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Opinion Issued During {activeEraSpec.windowLabel}
              </button>
            </div>

            <Link
              href={activeEraSpec.eraLensRoute}
              className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:opacity-85"
            >
              <span>Read {activeEraSpec.windowLabel} Era Guide</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      {/* Search, Authority Tier & Practice Domain Facet Controls */}
      <section
        aria-label="Search and filter judicial and OGC authorities"
        className="space-y-3 rounded-lg border border-border bg-surface-elevated p-4 text-xs"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="min-w-0 md:col-span-2">
            <label
              htmlFor="cases-search-input"
              className="mb-1 block font-semibold text-foreground"
            >
              Search Case Name, Citation, VAOPGCPREC Number, or Holding
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="cases-search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., George, Hamill, Bell, VAOPGCPREC 23-97, knee instability, 3.156(c)..."
                className="w-full min-w-0 rounded-md border border-border bg-background py-1.5 pr-3 pl-8 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="cases-domain-select"
              className="mb-1 block font-semibold text-foreground"
            >
              Filter by Practice Domain
            </label>
            <select
              id="cases-domain-select"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="all">All 13 Practice Domains</option>
              {CANONICAL_PRACTICE_DOMAINS.map((dom) => (
                <option key={dom.domainId} value={dom.domainId}>
                  {dom.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Authority Tier Pills */}
        <div
          role="group"
          aria-label="Filter by court or VA General Counsel authority tier"
          className="flex flex-wrap gap-1.5 pt-1"
        >
          {TIER_FILTERS.map((tf) => {
            const isSelected = selectedTier === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedTier(tf.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  isSelected
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Pre-VJRA Empty Issuance Note (When 1945–1961 or 1962–1988 + Opinion Issuance Mode Selected) */}
      {eraPartition.preVjraIssuanceEmptyNote && (
        <section
          aria-label="Pre-1988 judicial review explanation"
          className="rounded-lg border border-accent/50 bg-surface p-4 text-xs leading-relaxed"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              aria-hidden="true"
            />
            <div className="space-y-2">
              <p className="text-foreground">
                <LexiconText text={eraPartition.preVjraIssuanceEmptyNote} />
              </p>
              <button
                type="button"
                onClick={() => setFilterMode("decision-governance")}
                className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
              >
                Switch to Decision Era Governance
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Temporal Cutoffs & Inapplicable Doctrines Alert Strip for Selected Era */}
      {activeEraSpec && eraPartition.eraCutoffWarnings.length > 0 && (
        <section
          aria-labelledby="era-cutoff-warnings-heading"
          className="space-y-2.5 rounded-lg border border-accent/50 bg-surface p-4 text-xs"
        >
          <h2
            id="era-cutoff-warnings-heading"
            className="inline-flex items-center gap-1.5 font-serif text-base font-bold text-foreground"
          >
            <TriangleAlert className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>
              Temporal Cutoffs &amp; Inapplicable Doctrines for{" "}
              {activeEraSpec.windowLabel} Decisions (
              {eraPartition.eraCutoffWarnings.length})
            </span>
          </h2>
          <p className="text-muted-foreground">
            The following authorities have strict statutory or regulatory effective
            dates that limit or bar their use on {activeEraSpec.windowLabel}{" "}
            decisions:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {eraPartition.eraCutoffWarnings.slice(0, 6).map(({ entry, caution }) => (
              <div
                key={entry.slug}
                className="min-w-0 rounded border border-border bg-surface-elevated p-2.5 break-words"
              >
                <div className="font-semibold text-foreground">
                  {entry.shortTitle ?? entry.citation}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  <LexiconText text={caution} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Primary Authorities Grid */}
      <section aria-labelledby="primary-authorities-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="primary-authorities-heading"
            className="font-serif text-lg font-bold"
          >
            {activeEraSpec
              ? filterMode === "decision-governance"
                ? `Era-Defining & Bounded Authorities Governing ${activeEraSpec.windowLabel} Decisions (${sortedPrimary.length})`
                : `Judicial & OGC Authorities Issued During ${activeEraSpec.windowLabel} (${sortedPrimary.length})`
              : `Judicial & VA General Counsel Authorities (${sortedPrimary.length})`}
          </h2>
          <Link
            href="/docs/vaopgcprec-index"
            className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-85"
          >
            Open Full VAOPGCPREC Master Digest →
          </Link>
        </div>

        {sortedPrimary.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center text-xs text-muted-foreground">
            No authorities matched the current combination of filters. Try clearing
            the search box or resetting Tier / Domain filters.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedPrimary.map((entry) => (
              <AuthorityCard
                key={entry.slug}
                entry={entry}
                activeEraSelected={activeEraId !== null}
              />
            ))}
          </div>
        )}
      </section>

      {/* Cross-Era Foundational Authorities Section (When an Era Is Active in Decision-Governance Mode) */}
      {activeEraSpec &&
        filterMode === "decision-governance" &&
        sortedCrossEra.length > 0 && (
          <section
            aria-labelledby="cross-era-authorities-heading"
            className="space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2
                  id="cross-era-authorities-heading"
                  className="font-serif text-base font-bold text-foreground"
                >
                  Cross-Era Foundational Doctrines Also Applicable to{" "}
                  {activeEraSpec.windowLabel} ({sortedCrossEra.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  <LexiconText text="Substantive and evidentiary authorities (such as equipoise, CUE elements, anti-pyramiding, § 3.156(c) service records, and George's § 20.1403(e) rule) cited across 1945–Present modules without a single-era restriction." />
                </p>
              </div>
              <button
                type="button"
                aria-expanded={showCrossEraWhenFiltered}
                onClick={() => setShowCrossEraWhenFiltered((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span>
                  {showCrossEraWhenFiltered
                    ? "Hide Cross-Era Doctrines"
                    : `Show All ${sortedCrossEra.length} Cross-Era Doctrines`}
                </span>
                {showCrossEraWhenFiltered ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            {showCrossEraWhenFiltered && (
              <div className="grid gap-4 pt-2 md:grid-cols-2">
                {sortedCrossEra.map((entry) => (
                  <AuthorityCard
                    key={entry.slug}
                    entry={entry}
                    activeEraSelected
                  />
                ))}
              </div>
            )}
          </section>
        )}
    </div>
  );
}
