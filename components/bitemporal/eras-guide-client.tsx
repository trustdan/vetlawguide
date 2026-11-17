"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Filter,
  Scale,
  TriangleAlert,
} from "lucide-react";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { useResearchContext } from "@/components/providers/research-context";
import {
  ERA_DEFINITIONS_GLOSSARY,
  HISTORICAL_ERAS,
  getHistoricalEraById,
} from "@/lib/corpus/eras-and-authorities";
import type { CompiledDocument } from "@/lib/corpus/types";
import { cn } from "@/lib/utils";

export function ErasGuideClient({
  eraDocs,
}: {
  eraDocs: ReadonlyArray<CompiledDocument>;
}) {
  const { activeEraId, selectEra, decisionDate } = useResearchContext();
  const [onlySelectedEra, setOnlySelectedEra] = useState(false);

  const activeEraSpec = getHistoricalEraById(activeEraId);
  const docByModuleId = new Map(eraDocs.map((d) => [d.id, d]));

  const displayedEras =
    activeEraId && onlySelectedEra
      ? HISTORICAL_ERAS.filter((e) => e.eraId === activeEraId)
      : HISTORICAL_ERAS;

  const displayedGlossary =
    activeEraId && onlySelectedEra
      ? ERA_DEFINITIONS_GLOSSARY.filter((term) =>
          term.relatedEraIds.includes(activeEraId),
        )
      : ERA_DEFINITIONS_GLOSSARY;

  return (
    <div className="space-y-10">
      {/* Active Top-Bar Era Filter Synchronization Banner */}
      <section
        aria-label="Active era lens synchronization"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 text-xs"
      >
        <div className="space-y-1">
          {activeEraSpec ? (
            <>
              <div className="inline-flex items-center gap-1.5 font-mono font-semibold text-primary">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Top Timeline Active: {activeEraSpec.fullTitle} (Date:{" "}
                  {decisionDate})
                </span>
              </div>
              <p className="text-muted-foreground">
                The Era you selected in the sticky top bar is highlighted below—and
                is simultaneously filtering{" "}
                <Link
                  href="/cases"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Judicial &amp; VAOPGCPREC Authorities (/cases)
                </Link>{" "}
                and point-in-time{" "}
                <Link
                  href="/cfr"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  38 C.F.R. Regulations (/cfr)
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Viewing All 5 Historical Adjudication Eras (1945–Present)</span>
              </div>
              <p className="text-muted-foreground">
                Click any Era in the sticky bar at the top of the page (or on any
                card below) to lock that historical window across regulations,
                court cases, and definitions.
              </p>
            </>
          )}
        </div>

        {activeEraSpec && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={onlySelectedEra}
              onClick={() => setOnlySelectedEra((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                onlySelectedEra
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface-elevated text-foreground hover:bg-muted",
              )}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {onlySelectedEra
                  ? "Showing Selected Era Only"
                  : "Isolate Selected Era"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOnlySelectedEra(false);
                selectEra(null);
              }}
              className="rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              Reset to All Eras
            </button>
          </div>
        )}
      </section>

      {/* Section 1: Side-by-Side 5-Era Master Comparison Matrix */}
      <section aria-labelledby="era-matrix-heading" className="space-y-3">
        <div className="space-y-1">
          <h2
            id="era-matrix-heading"
            className="font-serif text-xl font-bold tracking-tight"
          >
            Side-by-Side Comparison of All 5 Veterans Law Eras (1945–Present)
          </h2>
          <p className="text-xs text-muted-foreground">
            Compare how statute numbers, informal claims, appeal steps, VA hospital
            record rules, and accredited representation changed at each statutory
            watershed.
          </p>
        </div>

        <div className="max-w-full overflow-x-auto rounded-lg border border-border bg-surface-elevated">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface text-[11px] font-semibold text-foreground">
                <th scope="col" className="p-3">
                  Era &amp; Exact Dates
                </th>
                <th scope="col" className="p-3">
                  Statutory Citations
                </th>
                <th scope="col" className="p-3">
                  How Claims Started
                </th>
                <th scope="col" className="p-3">
                  Appeal Pipeline
                </th>
                <th scope="col" className="p-3">
                  VA Medical Record Scope
                </th>
                <th scope="col" className="p-3">
                  Representation Rules
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {HISTORICAL_ERAS.map((era) => {
                const isSelected = activeEraId === era.eraId;
                return (
                  <tr
                    key={era.eraId}
                    className={cn(
                      "align-top transition-colors",
                      isSelected ? "bg-primary/8" : "hover:bg-surface/70",
                    )}
                  >
                    <th scope="row" className="p-3 font-semibold text-foreground">
                      <button
                        type="button"
                        onClick={() => selectEra(era.eraId)}
                        className="text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span className="block font-mono text-[11px] text-primary">
                          {era.windowLabel}
                        </span>
                        <span className="block font-serif text-sm font-bold">
                          Era {era.eraNumber}: {era.shortLabel}
                        </span>
                      </button>
                      <span className="mt-1 block font-mono text-[10px] font-normal text-muted-foreground">
                        {era.startDate} → {era.endDate ?? "Present"}
                      </span>
                    </th>
                    <td className="p-3 leading-relaxed text-muted-foreground">
                      <LexiconText text={era.matrix.statutorySystem} />
                    </td>
                    <td className="p-3 leading-relaxed text-muted-foreground">
                      <LexiconText text={era.matrix.claimInitiationRule} />
                    </td>
                    <td className="p-3 leading-relaxed text-muted-foreground">
                      <LexiconText text={era.matrix.appealPipeline} />
                    </td>
                    <td className="p-3 leading-relaxed text-muted-foreground">
                      <LexiconText text={era.matrix.recordPossessionRule} />
                    </td>
                    <td className="p-3 leading-relaxed text-muted-foreground">
                      <LexiconText text={era.matrix.representationRule} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Detailed Era-by-Era Deep Dives */}
      <section aria-labelledby="era-deep-dives-heading" className="space-y-5">
        <div className="space-y-1">
          <h2
            id="era-deep-dives-heading"
            className="font-serif text-xl font-bold tracking-tight"
          >
            Detailed Era-by-Era Definitions, Record Clues &amp; Audit Rules (
            {displayedEras.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Each Era guide pairs SHA-256-verified plain-English explanations and
            representative discussion checklists for Veterans with exact statutory
            cutoffs, signature C-file forms, and CUE guardrails for Practitioners.
          </p>
        </div>

        <div className="space-y-6">
          {displayedEras.map((era) => {
            const doc = docByModuleId.get(era.upstreamModuleId);
            const overlay = doc?.veteranOverlay ?? null;
            const isSelected = activeEraId === era.eraId;

            return (
              <article
                key={era.eraId}
                id={era.eraId}
                className={cn(
                  "rounded-xl border bg-surface-elevated p-5 transition-colors sm:p-6",
                  isSelected
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border",
                )}
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="rounded bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                        {era.windowLabel}
                      </span>
                      <span className="text-muted-foreground">
                        Effective Window: {era.startDate} →{" "}
                        {era.endDate ?? "Present"}
                      </span>
                      {isSelected && (
                        <span className="font-semibold text-primary">
                          · Active in Top Bar
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      {overlay?.plain_english_title ?? era.fullTitle}
                    </h3>
                    <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
                      <strong className="font-semibold text-foreground">
                        Why these dates mark a legal boundary:
                      </strong>{" "}
                      <LexiconText text={era.watershedBoundaryWhy} />
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectEra(era.eraId)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-foreground hover:border-primary/60",
                      )}
                    >
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {isSelected ? "Selected in Top Bar" : "Filter Site by This Era"}
                      </span>
                    </button>

                    <Link
                      href={era.eraLensRoute}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span>Full 3-Column Treatise</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                {/* Dual-Persona Body With Cross-Inspection Parity */}
                <div className="mt-4">
                  <CrossInspectionExpander
                    veteranContent={
                      <div className="space-y-4">
                        <p className="text-sm leading-relaxed text-foreground">
                          <LexiconText
                            text={overlay?.what_this_means ?? era.veteranOverview}
                          />
                        </p>

                        {overlay && (
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2 rounded-lg border border-border bg-surface p-3.5 text-xs">
                              <h4 className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                                <FileText
                                  className="h-3.5 w-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                <span>Paperwork &amp; File Clues</span>
                              </h4>
                              <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
                                {overlay.record_clues.map((clue) => (
                                  <li key={clue}>
                                    <LexiconText text={clue} />
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-2 rounded-lg border border-border bg-surface p-3.5 text-xs">
                              <h4 className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                                <TriangleAlert
                                  className="h-3.5 w-3.5 text-accent"
                                  aria-hidden="true"
                                />
                                <span>Important Date Cautions</span>
                              </h4>
                              <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
                                {overlay.important_cautions.map((caution) => (
                                  <li key={caution}>
                                    <LexiconText text={caution} />
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-2 rounded-lg border border-border bg-surface p-3.5 text-xs">
                              <h4 className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                                <CheckCircle2
                                  className="h-3.5 w-3.5 text-primary"
                                  aria-hidden="true"
                                />
                                <span>Questions for Your Representative</span>
                              </h4>
                              <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
                                {overlay.questions_for_representative.map((q) => (
                                  <li key={q}>
                                    <LexiconText text={q} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    }
                    practitionerContent={
                      <div className="space-y-4">
                        <p className="text-sm leading-relaxed text-foreground">
                          {era.practitionerOverview}
                        </p>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1.5 rounded-lg border border-border bg-surface p-3.5 text-xs">
                            <h4 className="font-semibold text-foreground">
                              High-Yield Retroactive Opportunities
                            </h4>
                            <p className="leading-relaxed text-muted-foreground">
                              {era.keyOpportunity}
                            </p>
                          </div>

                          <div className="space-y-1.5 rounded-lg border border-border bg-surface p-3.5 text-xs">
                            <h4 className="font-semibold text-accent">
                              Bitemporal &amp; CUE Kill-Switches
                            </h4>
                            <p className="leading-relaxed text-muted-foreground">
                              {era.keyTrap}
                            </p>
                          </div>
                        </div>

                        {doc && doc.statutes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-semibold text-foreground">
                              Governing Statutes:
                            </span>
                            {doc.statutes.map((st) => (
                              <span
                                key={st}
                                className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-muted-foreground"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>

                {/* Signature Era Forms & Quick Cross-Links */}
                <div className="mt-4 border-t border-border/80 pt-3.5">
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {era.signatureForms.map((f) => (
                      <div
                        key={f.code}
                        className="rounded-md border border-border/80 bg-surface px-3 py-2 text-xs"
                      >
                        <div className="font-mono font-semibold text-primary">
                          {f.code}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                          <LexiconText text={f.meaning} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 3: Era-Bounded Legal & Procedural Definitions Glossary */}
      <section aria-labelledby="era-glossary-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
          <div className="space-y-1">
            <h2
              id="era-glossary-heading"
              className="font-serif text-xl font-bold tracking-tight"
            >
              Core Era-Bounded Definitions &amp; Doctrinal Glossary (
              {displayedGlossary.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Essential Veterans Law concepts whose meaning or availability depends
              on the exact date of the VA decision.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href="/crosswalk"
              className="text-primary underline underline-offset-2 hover:opacity-85"
            >
              1933 ↔ 1958 ↔ 1991 Crosswalk →
            </Link>
            <Link
              href="/reference/forms-and-codes"
              className="text-primary underline underline-offset-2 hover:opacity-85"
            >
              Forms &amp; Code-Sheet Lexicon →
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {displayedGlossary.map((item) => {
            const matchesActiveEra =
              activeEraId !== null && item.relatedEraIds.includes(activeEraId);
            return (
              <article
                key={item.id}
                className={cn(
                  "flex flex-col justify-between rounded-lg border bg-surface-elevated p-4 text-xs",
                  matchesActiveEra
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary">
                      <Scale className="h-3 w-3" aria-hidden="true" />
                      <span>{item.eraWindow}</span>
                    </span>
                    {matchesActiveEra && (
                      <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-foreground">
                        Applies to Selected Era
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    {item.term}
                  </h3>
                  <CrossInspectionExpander
                    veteranContent={
                      <p className="leading-relaxed text-muted-foreground">
                        <LexiconText text={item.veteranDefinition} />
                      </p>
                    }
                    practitionerContent={
                      <p className="leading-relaxed text-muted-foreground">
                        {item.practitionerDefinition}
                      </p>
                    }
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
                  <div className="flex flex-wrap gap-1">
                    {item.relatedEraIds.map((eId) => {
                      const spec = getHistoricalEraById(eId);
                      if (!spec) return null;
                      return (
                        <button
                          key={eId}
                          type="button"
                          onClick={() => selectEra(eId)}
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium focus-visible:outline-2 focus-visible:outline-primary",
                            activeEraId === eId
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-surface text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {spec.windowLabel}
                        </button>
                      );
                    })}
                  </div>
                  <Link
                    href={item.relatedHref}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <span>Inspect Source</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

