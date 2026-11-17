"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { BookOpen, Calendar, ChevronDown, ChevronUp, History, X } from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import {
  HISTORICAL_ERAS,
  WATERSHED_TIMELINE_TICKS,
  getHistoricalEraById,
} from "@/lib/corpus/eras-and-authorities";
import { useResearchContext } from "@/components/providers/research-context";
import { cn } from "@/lib/utils";

function isDesktopTemporalRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/cfr") ||
    pathname.startsWith("/cases") ||
    pathname.startsWith("/eras") ||
    pathname.startsWith("/vasrd") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/timeline")
  );
}

export function StickyEraTimelineBar() {
  const pathname = usePathname() ?? "/";
  const prefersReducedMotion = useReducedMotion();
  const {
    audienceMode,
    decisionDate,
    setDecisionDate,
    activeEraId,
    selectEra,
  } = useResearchContext();

  const [hoveredEraIdx, setHoveredEraIdx] = useState<number | null>(null);
  const [ticksExpanded, setTicksExpanded] = useState(false);
  const [hoveredTickIdx, setHoveredTickIdx] = useState<number | null>(null);
  const [eraSheetOpen, setEraSheetOpen] = useState(false);

  const inlineDesktop = isDesktopTemporalRoute(pathname);
  const activeEraSpec = getHistoricalEraById(activeEraId);
  const focusedTick =
    hoveredTickIdx !== null
      ? WATERSHED_TIMELINE_TICKS[hoveredTickIdx] ?? null
      : WATERSHED_TIMELINE_TICKS.find((t) => t.isoDate === decisionDate) ?? null;

  useEffect(() => {
    if (!eraSheetOpen && !ticksExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEraSheetOpen(false);
        setTicksExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [eraSheetOpen, ticksExpanded]);

  const chipSummaryLabel = decisionDate
    ? activeEraSpec
      ? `${decisionDate} (${activeEraSpec.windowLabel})`
      : decisionDate
    : "Today (All Eras)";

  return (
    <div
      data-testid="sticky-era-timeline-bar"
      role="region"
      aria-label="Global Veterans Law Era and Decision Date timeline filter"
      className="border-t border-border/80 bg-surface/95"
    >
      <div className="mx-auto max-w-6xl px-2 py-0.5 sm:px-4 sm:py-1">
        {/* Compact "Law as of" Chip Bar (Always on <lg mobile; also default on non-temporal desktop gateway routes) */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2",
            inlineDesktop ? "lg:hidden" : "flex",
          )}
        >
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="era-chip-trigger"
              aria-expanded={eraSheetOpen}
              aria-controls="sticky-era-selector-panel"
              onClick={() => setEraSheetOpen((prev) => !prev)}
              className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:px-2.5 sm:py-1",
                decisionDate || eraSheetOpen
                  ? "border-primary bg-surface-elevated font-semibold text-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/60",
              )}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">
                Law as of:{" "}
                <span className="font-mono font-semibold">{chipSummaryLabel}</span>
              </span>
              {eraSheetOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
            </button>

            {decisionDate && (
              <button
                type="button"
                onClick={() => {
                  selectEra(null);
                  setEraSheetOpen(false);
                }}
                aria-label="Reset decision date to Today (All Eras)"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <Link
            href="/eras"
            className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:inline-flex"
          >
            <span>Historical eras</span>
          </Link>
        </div>

        {/* Full 5-Era + Date + Milestones Ribbon (Inline on lg+ temporal routes; expandable sheet when chip clicked) */}
        <div
          id="sticky-era-selector-panel"
          className={cn(
            eraSheetOpen
              ? "mt-2 block rounded-lg border border-border bg-background p-2.5 shadow-sm"
              : inlineDesktop
                ? "hidden lg:block"
                : "hidden",
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap">
            {/* All Eras / Current Reset Pill */}
            <button
              type="button"
              aria-pressed={activeEraId === null}
              onClick={() => selectEra(null)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                activeEraId === null
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
              )}
            >
              <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>All Eras</span>
            </button>

            {/* Proportional 5-Era Fisheye Timeline Ribbon */}
            <div
              role="group"
              aria-label="Select a historical Veterans Law adjudication era (1945 to Present)"
              onMouseLeave={() => setHoveredEraIdx(null)}
              className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:w-auto lg:flex-1 lg:items-stretch"
            >
              {HISTORICAL_ERAS.map((era, idx) => {
                const isSelected = activeEraId === era.eraId;
                const dist =
                  hoveredEraIdx === null ? 99 : Math.abs(hoveredEraIdx - idx);
                const scale =
                  prefersReducedMotion || hoveredEraIdx === null
                    ? 1
                    : dist === 0
                      ? 1.025
                      : dist === 1
                        ? 1.01
                        : 1;

                return (
                  <button
                    key={era.eraId}
                    type="button"
                    aria-pressed={isSelected}
                    onMouseEnter={() => setHoveredEraIdx(idx)}
                    onFocus={() => setHoveredEraIdx(idx)}
                    onBlur={() => setHoveredEraIdx(null)}
                    onClick={() => selectEra(era.eraId)}
                    style={{
                      flexGrow: era.proportionWeight,
                      flexBasis: 0,
                      transform: prefersReducedMotion ? undefined : `scale(${scale})`,
                    }}
                    title={`${era.fullTitle} — Click to filter site by this era (click again to reset)`}
                    className={cn(
                      "flex min-w-0 flex-col justify-center rounded-md border px-2 py-1 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/90 bg-background text-foreground hover:border-primary/60 hover:bg-surface-elevated",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-bold leading-none">
                        {era.windowLabel}
                      </span>
                      {isSelected && (
                        <span className="rounded border border-primary-foreground/60 px-1 font-mono text-xs font-semibold text-primary-foreground">
                          Active
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 truncate text-xs leading-tight font-medium",
                        isSelected ? "text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {era.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Inline Exact YYYY-MM-DD Decision Date + Expandable Watershed Ticks + Era Guide Link */}
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 lg:shrink-0">
              <div className="relative inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <label htmlFor="sticky-decision-date-input" className="sr-only">
                  Exact Challenged Decision Date (YYYY-MM-DD)
                </label>
                <input
                  id="sticky-decision-date-input"
                  type="date"
                  min="1933-03-20"
                  max="2026-12-31"
                  value={decisionDate ?? ""}
                  onChange={(e) => setDecisionDate(e.target.value || null)}
                  className="w-[126px] bg-transparent font-mono text-xs text-foreground focus:outline-none"
                />
                {decisionDate && (
                  <button
                    type="button"
                    onClick={() => setDecisionDate(null)}
                    aria-label="Clear decision date and show all eras"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-expanded={ticksExpanded}
                aria-controls="sticky-watershed-ticks-drawer"
                onClick={() => setTicksExpanded((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  ticksExpanded
                    ? "border-primary bg-surface-elevated font-semibold text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Milestones</span>
                {ticksExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              <Link
                href="/timeline"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Timeline</span>
              </Link>

              <Link
                href="/eras"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Era Guide</span>
              </Link>
            </div>
          </div>

          {/* Expandable Watershed Year Ticks Drawer (1946–2026) */}
          {ticksExpanded && (
            <div
              id="sticky-watershed-ticks-drawer"
              onMouseLeave={() => setHoveredTickIdx(null)}
              className="mt-2 space-y-1.5 rounded-lg border border-border bg-background p-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-foreground">
                  Watershed Effective-Date Ticks (1946–2026):{" "}
                  <span className="font-normal text-muted-foreground">
                    Click any tick to lock its exact effective date across 38 C.F.R., Cases &amp; Eras.
                  </span>
                </span>
                {activeEraSpec && (
                  <span className="font-mono text-xs text-primary">
                    Active Era: {activeEraSpec.windowLabel} ({decisionDate})
                  </span>
                )}
              </div>

              <div
                role="list"
                aria-label="Watershed Veterans Law effective-date ticks"
                className="grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-13"
              >
                {WATERSHED_TIMELINE_TICKS.map((tick, idx) => {
                  const isSelected = decisionDate === tick.isoDate;
                  const dist =
                    hoveredTickIdx === null ? 99 : Math.abs(hoveredTickIdx - idx);
                  const scale =
                    prefersReducedMotion || hoveredTickIdx === null
                      ? 1
                      : dist === 0
                        ? 1.05
                        : dist === 1
                          ? 1.02
                          : 1;

                  return (
                    <div key={tick.id} role="listitem" className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onMouseEnter={() => setHoveredTickIdx(idx)}
                        onFocus={() => setHoveredTickIdx(idx)}
                        onBlur={() => setHoveredTickIdx(null)}
                        onClick={() => setDecisionDate(tick.isoDate)}
                        style={
                          prefersReducedMotion
                            ? undefined
                            : { transform: `scale(${scale})` }
                        }
                        className={cn(
                          "flex w-full flex-col items-center rounded border px-1.5 py-1 text-center transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-border/80 bg-surface text-foreground hover:border-primary/60",
                        )}
                      >
                        <span className="font-mono text-xs font-bold">
                          {tick.yearLabel}
                        </span>
                        <span
                          className={cn(
                            "line-clamp-1 text-xs",
                            isSelected
                              ? "text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {tick.shortTitle}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {focusedTick && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/80 bg-surface px-2.5 py-1.5 text-xs">
                  <div>
                    <span className="font-mono font-semibold text-primary">
                      {focusedTick.isoDate} ({focusedTick.track}):
                    </span>{" "}
                    <span className="text-foreground">
                      <LexiconText
                        text={
                          audienceMode === "veteran"
                            ? focusedTick.veteranSummary
                            : focusedTick.practitionerSummary
                        }
                      />
                    </span>
                  </div>
                  <Link
                    href={focusedTick.href}
                    className="shrink-0 font-semibold text-primary underline underline-offset-2 hover:opacity-85"
                  >
                    Open Source →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
