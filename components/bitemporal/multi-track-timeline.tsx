"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Columns4,
  Eye,
  EyeOff,
  List,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import {
  HISTORICAL_ERAS,
  getHistoricalEraById,
} from "@/lib/corpus/eras-and-authorities";
import {
  ALL_ENACTED_TIMELINE_TRACKS,
  type CompiledTimelineBundle,
  type EnactedTimelineTrack,
  type QuarantinedTimelineWatchItem,
  type TimelineChronologyEvent,
} from "@/lib/corpus/timeline";
import { cn } from "@/lib/utils";
import { LexiconText } from "./lexicon-text";

function matchesEventQuery(ev: TimelineChronologyEvent, q: string): boolean {
  if (!q) return true;
  const hay = [
    ev.dateLabel,
    ev.isoDate,
    ev.publicationDate ?? "",
    ev.track,
    ev.title,
    ev.shortTitle,
    ev.primaryCitation,
    ev.veteranSummary,
    ev.practitionerSummary,
    ev.retroactiveOpportunity,
    ev.temporalTrap,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function matchesWatchItemQuery(
  item: QuarantinedTimelineWatchItem,
  q: string,
): boolean {
  if (!q) return true;
  const hay = [
    item.identifier,
    item.federalRegisterCitation,
    item.noticeDate,
    item.rescindedDate ?? "",
    item.statusBadge,
    item.targetCfr,
    item.title,
    item.veteranSummary,
    item.practitionerSummary,
    item.activeLawBaseline,
    item.auditGuardrail,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function SplitMilestoneDetailCard({
  event,
  decisionDate,
  onLockDate,
}: {
  event: TimelineChronologyEvent;
  decisionDate: string | null;
  onLockDate: (isoDate: string) => void;
}) {
  const hasPubGap =
    Boolean(event.publicationDate) && event.publicationDate !== event.isoDate;
  const isDateLocked = decisionDate === event.isoDate;

  return (
    <article
      data-testid="timeline-selected-split-card"
      aria-live="polite"
      className="space-y-4 rounded-xl border border-primary/40 bg-background p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
              {event.dateLabel}
            </span>
            <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              {event.track}
            </span>
            {hasPubGap && event.publicationDate && (
              <span className="rounded border border-accent/60 bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                {event.publicationDate > event.isoDate
                  ? `Eff. ${event.isoDate} (FR Repub. ${event.publicationDate})`
                  : `Pub. ${event.publicationDate} → Eff. ${event.isoDate}`}
              </span>
            )}
          </div>
          <h3 className="font-serif text-lg font-bold text-foreground sm:text-xl">
            {event.title}
          </h3>
          <div className="font-mono text-xs text-primary">
            {event.primaryCitation}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onLockDate(event.isoDate)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-3 py-1 font-mono font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              isDateLocked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {isDateLocked
                ? `Locked: ${event.isoDate}`
                : `Lock Date (${event.isoDate})`}
            </span>
          </button>

          <Link
            href={event.href}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>Open Authority</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <p
        data-persona="veteran-only"
        className="text-sm leading-relaxed text-muted-foreground"
      >
        <LexiconText text={event.veteranSummary} />
      </p>
      <p
        data-persona="practitioner-only"
        className="text-sm leading-relaxed text-muted-foreground"
      >
        <LexiconText text={event.practitionerSummary} />
      </p>

      {/* Split Card: Retroactive Opportunity vs. Temporal Trap */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5 rounded-lg border border-border bg-surface p-3.5 text-xs leading-relaxed">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>Retroactive Opportunity</span>
          </div>
          <p className="text-muted-foreground">
            <LexiconText text={event.retroactiveOpportunity} />
          </p>
        </div>

        <div className="space-y-1.5 rounded-lg border border-border bg-surface p-3.5 text-xs leading-relaxed">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-accent"
              aria-hidden="true"
            />
            <span>Temporal Trap &amp; CUE Guardrail</span>
          </div>
          <p className="text-muted-foreground">
            <LexiconText text={event.temporalTrap} />
          </p>
        </div>
      </div>
    </article>
  );
}

export function MultiTrackTimeline({
  bundle,
}: {
  bundle: CompiledTimelineBundle;
}) {
  const { activeEraId, selectEra, decisionDate, setDecisionDate } =
    useResearchContext();

  const [layoutMode, setLayoutMode] = useState<"swimlanes" | "stream">(
    "swimlanes",
  );
  const [selectedTrack, setSelectedTrack] = useState<
    EnactedTimelineTrack | "ALL"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("tl-1997-muscles");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const eraFilteredEvents = useMemo(() => {
    return bundle.events.filter((ev) => {
      if (activeEraId && ev.eraId !== activeEraId) return false;
      if (!matchesEventQuery(ev, normalizedQuery)) return false;
      return true;
    });
  }, [bundle.events, activeEraId, normalizedQuery]);

  const visibleEvents = useMemo(() => {
    if (selectedTrack === "ALL") return eraFilteredEvents;
    return eraFilteredEvents.filter((ev) => ev.track === selectedTrack);
  }, [eraFilteredEvents, selectedTrack]);

  const matchingWatchItems = useMemo(() => {
    return bundle.quarantinedWatchlist.filter((item) =>
      matchesWatchItemQuery(item, normalizedQuery),
    );
  }, [bundle.quarantinedWatchlist, normalizedQuery]);

  // Auto-reveal watchlist when a search query matches a quarantined RIN / FR citation
  const effectiveWatchlistOpen =
    watchlistOpen || (normalizedQuery.length > 0 && matchingWatchItems.length > 0);

  const selectedEvent =
    visibleEvents.find((ev) => ev.id === selectedEventId) ??
    visibleEvents[0] ??
    bundle.events[0]!;

  const activeEraSpec = getHistoricalEraById(activeEraId);

  const visibleEras = useMemo(() => {
    return HISTORICAL_ERAS.filter((era) => {
      if (activeEraId && era.eraId !== activeEraId) return false;
      return visibleEvents.some((ev) => ev.eraId === era.eraId);
    });
  }, [activeEraId, visibleEvents]);

  return (
    <section
      aria-label="Multi-track Veterans Law chronology and quarantined rulemaking watchlist"
      className="space-y-6 rounded-xl border border-border bg-surface-elevated p-4 shadow-2xs sm:p-6"
    >
      {/* Controls Bar: Search + Swimlanes/Stream Toggle + Watchlist Toggle */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="timeline-search-input" className="sr-only">
            Filter timeline milestones, statutes, 38 C.F.R. changes, precedents, or RIN notices
          </label>
          <Search
            className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="timeline-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter milestones, FR citations, precedents, or RIN watchlist…"
            className="min-h-9 w-full rounded-md border border-border bg-background py-1.5 pr-8 pl-9 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear timeline filter"
              onClick={() => setSearchQuery("")}
              className="absolute top-2 right-2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div
            role="group"
            aria-label="Timeline layout mode"
            className="inline-flex rounded-md border border-border bg-surface p-0.5"
          >
            <button
              type="button"
              aria-pressed={layoutMode === "swimlanes"}
              onClick={() => setLayoutMode("swimlanes")}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded px-3 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                layoutMode === "swimlanes"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Columns4 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>4-Track Matrix</span>
            </button>
            <button
              type="button"
              aria-pressed={layoutMode === "stream"}
              onClick={() => setLayoutMode("stream")}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded px-3 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                layoutMode === "stream"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chronological Stream</span>
            </button>
          </div>

          <button
            type="button"
            data-testid="toggle-quarantined-watchlist"
            aria-expanded={effectiveWatchlistOpen}
            aria-controls={
              effectiveWatchlistOpen
                ? "quarantined-rulemaking-watchlist"
                : undefined
            }
            onClick={() => setWatchlistOpen((prev) => !prev)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-3 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              effectiveWatchlistOpen
                ? "border-accent bg-surface font-bold text-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            {effectiveWatchlistOpen ? (
              <EyeOff className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            )}
            <span>
              Quarantined Watchlist ({bundle.quarantinedWatchlist.length})
            </span>
          </button>
        </div>
      </div>

      {/* 4-Track Filter Strip + Sticky Era Sync Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div
          role="group"
          aria-label="Filter enacted law tracks"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            aria-pressed={selectedTrack === "ALL"}
            onClick={() => setSelectedTrack("ALL")}
            className={cn(
              "rounded-md border px-2.5 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              selectedTrack === "ALL"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            All 4 Enacted Tracks ({eraFilteredEvents.length})
          </button>

          {ALL_ENACTED_TIMELINE_TRACKS.map((track) => {
            const count = eraFilteredEvents.filter(
              (ev) => ev.track === track,
            ).length;
            const isSelected = selectedTrack === track;
            return (
              <button
                key={track}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedTrack(track)}
                className={cn(
                  "rounded-md border px-2.5 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:bg-muted",
                )}
              >
                {track} ({count})
              </button>
            );
          })}
        </div>

        {activeEraSpec && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-primary">
              Filtered by Era: <strong>{activeEraSpec.windowLabel}</strong>
            </span>
            <button
              type="button"
              onClick={() => selectEra(null)}
              className="rounded border border-border bg-surface px-2 py-0.5 font-sans font-semibold text-foreground hover:bg-muted"
            >
              Show All Eras
            </button>
          </div>
        )}
      </div>

      {/* Toggleable Quarantined Proposals & Rescinded Rules Watchlist */}
      {effectiveWatchlistOpen && (
        <section
          id="quarantined-rulemaking-watchlist"
          data-testid="quarantined-watchlist-panel"
          aria-labelledby="quarantined-watchlist-heading"
          className="quarantine-stripe space-y-4 rounded-xl border border-accent/70 bg-surface p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
            <div className="space-y-1">
              <h2
                id="quarantined-watchlist-heading"
                className="flex items-center gap-2 font-serif text-lg font-bold text-foreground sm:text-xl"
              >
                <ShieldAlert
                  className="h-5 w-5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <span>
                  Quarantined Proposals &amp; Rescinded Rules Watchlist (Not Enacted Law)
                </span>
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The {matchingWatchItems.length} Federal Register notices below are{" "}
                <strong>proposed / unfinalized</strong> or{" "}
                <strong>formally rescinded</strong> (checked{" "}
                <span className="font-mono">{bundle.checkedAsOf}</span>). Never
                cite them as enacted rating criteria or historical CUE authority.
              </p>
            </div>
          </div>

          <ul className="grid gap-3 md:grid-cols-2">
            {matchingWatchItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-accent/50 bg-background p-4 text-xs leading-relaxed"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-accent/70 bg-surface px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                      {item.identifier}
                    </span>
                    <span className="rounded border border-accent/60 bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                      {item.statusBadge}
                    </span>
                  </div>

                  <h3 className="font-serif text-base font-bold text-foreground">
                    {item.title}
                  </h3>

                  <div className="font-mono text-xs text-muted-foreground">
                    {item.targetCfr} · {item.federalRegisterCitation}
                  </div>

                  <p data-persona="veteran-only" className="text-muted-foreground">
                    <LexiconText text={item.veteranSummary} />
                  </p>
                  <p
                    data-persona="practitioner-only"
                    className="text-muted-foreground"
                  >
                    <LexiconText text={item.practitionerSummary} />
                  </p>

                  <div className="rounded border border-border bg-surface p-2.5">
                    <div className="font-semibold text-foreground">
                      Active governing law today:
                    </div>
                    <p className="mt-0.5 text-muted-foreground">
                      <LexiconText text={item.activeLawBaseline} />
                    </p>
                  </div>

                  <div className="text-muted-foreground">
                    <strong className="text-foreground">Audit check: </strong>
                    <LexiconText text={item.auditGuardrail} />
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span>Inspect Enacted Section &amp; Provenance</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Enacted Chronology Body */}
      {visibleEvents.length === 0 ? (
        <div className="rounded-lg border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          No enacted milestones matched your active filter.{" "}
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedTrack("ALL");
              selectEra(null);
            }}
            className="font-semibold text-primary underline underline-offset-2"
          >
            Reset timeline filters
          </button>
        </div>
      ) : layoutMode === "swimlanes" ? (
        <div className="space-y-6">
          {/* Active Selected Milestone Opportunity vs. Trap Split Card */}
          <SplitMilestoneDetailCard
            event={selectedEvent}
            decisionDate={decisionDate}
            onLockDate={(iso) => setDecisionDate(iso)}
          />

          {/* Era-Grouped 4-Track Parallel Swimlanes */}
          <div className="space-y-6">
            {visibleEras.map((era) => {
              const eraEvents = visibleEvents.filter(
                (ev) => ev.eraId === era.eraId,
              );
              const tracksToRender =
                selectedTrack === "ALL"
                  ? ALL_ENACTED_TIMELINE_TRACKS
                  : [selectedTrack];

              return (
                <section
                  key={era.eraId}
                  aria-labelledby={`timeline-era-${era.eraId}`}
                  className="space-y-3 rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                    <div>
                      <h2
                        id={`timeline-era-${era.eraId}`}
                        className="font-serif text-lg font-bold text-foreground"
                      >
                        {era.fullTitle}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {era.watershedBoundaryWhy}
                      </p>
                    </div>
                    <Link
                      href={era.eraLensRoute}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>Read Era {era.eraNumber} Guide</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  <div
                    className={cn(
                      "grid grid-cols-1 gap-3",
                      tracksToRender.length === 4
                        ? "lg:grid-cols-4"
                        : "lg:grid-cols-1",
                    )}
                  >
                    {tracksToRender.map((track) => {
                      const trackItems = eraEvents.filter(
                        (ev) => ev.track === track,
                      );
                      return (
                        <div
                          key={track}
                          className="space-y-2 rounded-lg border border-border/80 bg-surface p-3"
                        >
                          <div className="flex items-center justify-between border-b border-border/70 pb-1.5 font-mono text-xs font-bold text-foreground">
                            <span>{track}</span>
                            <span className="text-muted-foreground">
                              {trackItems.length}
                            </span>
                          </div>

                          {trackItems.length === 0 ? (
                            <p className="py-2 text-xs text-muted-foreground">
                              No indexed {track.toLowerCase()} watershed in this window.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {trackItems.map((ev) => {
                                const isSelected = selectedEvent.id === ev.id;
                                const hasPubGap =
                                  Boolean(ev.publicationDate) &&
                                  ev.publicationDate !== ev.isoDate;
                                return (
                                  <li key={ev.id}>
                                    <button
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() => setSelectedEventId(ev.id)}
                                      className={cn(
                                        "w-full space-y-1 rounded-md border p-2.5 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                                        isSelected
                                          ? "border-primary bg-surface-elevated shadow-2xs"
                                          : "border-border/80 bg-background hover:border-primary/50",
                                      )}
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-1">
                                        <span className="font-mono text-xs font-bold text-primary">
                                          {ev.dateLabel}
                                        </span>
                                        {hasPubGap && (
                                          <span className="rounded border border-accent/60 bg-surface px-1.5 py-0.5 font-mono text-xs text-accent">
                                            Pub≠Eff
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-semibold text-foreground">
                                        {ev.shortTitle}
                                      </div>
                                      <div className="line-clamp-2 text-muted-foreground">
                                        {ev.title}
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        /* Chronological Stream View (All Split Cards Expanded Inline) */
        <div className="space-y-4">
          {visibleEvents.map((ev) => (
            <SplitMilestoneDetailCard
              key={ev.id}
              event={ev}
              decisionDate={decisionDate}
              onLockDate={(iso) => setDecisionDate(iso)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
