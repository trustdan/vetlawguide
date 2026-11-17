"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  GitBranch,
  ListOrdered,
  ShieldAlert,
} from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import {
  buildPiercingFinalityFlowchart,
  type PiercingFinalityGate,
  type PiercingFinalityGateId,
} from "@/lib/corpus/piercing-finality-flowchart";
import { cn } from "@/lib/utils";
import { LexiconText } from "./lexicon-text";

const FLOWCHART_QUICK_DATES: ReadonlyArray<{
  label: string;
  date: string | null;
}> = [
  { label: "Current Law", date: null },
  { label: "Korea (1954-06-15)", date: "1954-06-15" },
  { label: "Pre-Bell (1992-07-20)", date: "1992-07-20" },
  { label: "Post-Bell (1992-07-21)", date: "1992-07-21" },
  { label: "§ 3.156(c) FR Gap (2006-09-20)", date: "2006-09-20" },
  { label: "AMA Hamill (2021-05-01)", date: "2021-05-01" },
];

function truncateSvgText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

export function PiercingFinalityFlowchart({
  defaultDate,
}: {
  defaultDate: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { audienceMode, decisionDate, setDecisionDate } = useResearchContext();

  const effectiveDate = decisionDate ?? defaultDate;

  const model = useMemo(
    () => buildPiercingFinalityFlowchart(audienceMode, effectiveDate),
    [audienceMode, effectiveDate],
  );

  const [presentationMode, setPresentationMode] = useState<
    "flowchart" | "outline"
  >("flowchart");
  const [selectedGateId, setSelectedGateId] =
    useState<PiercingFinalityGateId>("void-reduction");
  const [focusedGateId, setFocusedGateId] =
    useState<PiercingFinalityGateId | null>(null);

  const gateRefs = useRef<Record<string, SVGGElement | null>>({});

  const selectedGate: PiercingFinalityGate =
    model.gates.find((g) => g.id === selectedGateId) ?? model.gates[0]!;

  function moveFocusToIndex(nextIdx: number) {
    const clamped = Math.max(0, Math.min(model.gates.length - 1, nextIdx));
    const target = model.gates[clamped];
    if (!target) return;
    setSelectedGateId(target.id);
    gateRefs.current[target.id]?.focus();
  }

  return (
    <section
      aria-label="Piercing-Finality 6-Gate Decision Flowchart and Synchronized Outline"
      className="space-y-5 rounded-xl border border-border bg-surface-elevated p-4 shadow-2xs sm:p-6"
    >
      {/* Top Toolbar: Presentation Mode Toggle + Decision Date Presets */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-bold text-foreground">
            Six-Gate Finality &amp; Effective-Date Audit Sequence
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Always check non-CUE reopeners and pending-claim doctrines (Steps 1–4)
            before pleading Regional Office CUE (Step 5) or Board CUE (Step 6).
          </p>
        </div>

        <div
          role="group"
          aria-label="Flowchart presentation mode"
          className="inline-flex shrink-0 self-start rounded-md border border-border bg-surface p-0.5 text-xs lg:self-auto"
        >
          <button
            type="button"
            aria-pressed={presentationMode === "flowchart"}
            onClick={() => setPresentationMode("flowchart")}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded px-3 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary",
              presentationMode === "flowchart"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Interactive Flowchart</span>
          </button>
          <button
            type="button"
            aria-pressed={presentationMode === "outline"}
            onClick={() => setPresentationMode("outline")}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded px-3 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-primary",
              presentationMode === "outline"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
            <span>1:1 Accessible Outline</span>
          </button>
        </div>
      </div>

      {/* Quick Decision-Date Preset Strip */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Test decision date boundaries:</span>
        </span>
        {FLOWCHART_QUICK_DATES.map((preset) => {
          const isActive =
            preset.date === null
              ? decisionDate === null
              : decisionDate === preset.date;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => setDecisionDate(preset.date)}
              className={cn(
                "rounded border px-2 py-0.5 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                isActive
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-muted",
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          Active date: <strong className="text-foreground">{effectiveDate}</strong>
        </span>
      </div>

      {presentationMode === "flowchart" ? (
        <div className="space-y-5">
          {/* Hand-Laid-Out Interactive SVG Flowchart */}
          <div className="overflow-x-auto rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Select any gate (click, tap, or press{" "}
              <kbd className="rounded border border-border bg-surface px-1 font-mono text-xs">
                ↑
              </kbd>{" "}
              /{" "}
              <kbd className="rounded border border-border bg-surface px-1 font-mono text-xs">
                ↓
              </kbd>{" "}
              and{" "}
              <kbd className="rounded border border-border bg-surface px-1 font-mono text-xs">
                Enter
              </kbd>
              ) to inspect its record clues, temporal cutoffs, and kill-switches below.
            </p>
            <svg
              width={model.svgViewBox.width}
              height={model.svgViewBox.height}
              viewBox={`0 0 ${model.svgViewBox.width} ${model.svgViewBox.height}`}
              role="group"
              aria-label={`Six-gate piercing-finality decision sequence for ${effectiveDate}`}
              className="block min-w-[760px] select-none"
            >
              <defs>
                <marker
                  id="flowchart-arrow-border"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--muted-foreground)" />
                </marker>
                <marker
                  id="flowchart-arrow-primary"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--primary)" />
                </marker>
              </defs>

              {/* Vertical "If No -> Next Gate" Spine Connectors */}
              <g fill="none">
                {model.gates.slice(0, -1).map((gate, idx) => {
                  const nextGate = model.gates[idx + 1]!;
                  const yStart = gate.svgY + 46;
                  const yEnd = nextGate.svgY - 48;
                  const midY = (yStart + yEnd) / 2;
                  return (
                    <g key={`no-edge-${gate.id}`}>
                      <line
                        x1={256}
                        y1={yStart}
                        x2={256}
                        y2={yEnd}
                        stroke="var(--border)"
                        strokeWidth={2}
                        markerEnd="url(#flowchart-arrow-border)"
                      />
                      <rect
                        x={208}
                        y={midY - 10}
                        width={96}
                        height={20}
                        rx={4}
                        fill="var(--surface)"
                        stroke="var(--border)"
                        strokeWidth={1}
                      />
                      <text
                        x={256}
                        y={midY}
                        dy="0.34em"
                        textAnchor="middle"
                        fill="var(--muted-foreground)"
                        className="font-mono text-xs font-medium"
                      >
                        No → Step {nextGate.stepNumber}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Gate Nodes (Left Spine) + "If Yes" Vehicle Outcome Cards (Right Branch) */}
              <g>
                {model.gates.map((gate, idx) => {
                  const isSelected = selectedGate.id === gate.id;
                  const isFocused = focusedGateId === gate.id;
                  const hasAlert = Boolean(gate.dateBoundaryAlert);
                  const isBoardCue = gate.id === "board-cue-7111";

                  const gateTop = gate.svgY - 44;
                  const gateLeft = 24;
                  const gateWidth = 464;
                  const gateHeight = 88;

                  const outLeft = 568;
                  const outWidth = 328;

                  return (
                    <g
                      key={gate.id}
                      ref={(el) => {
                        gateRefs.current[gate.id] = el;
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`Step ${gate.stepNumber}: ${gate.shortTitle} (${gate.dateStatusBadge}) — If Yes: ${gate.ifYesTitle}`}
                      onFocus={() => setFocusedGateId(gate.id)}
                      onBlur={() =>
                        setFocusedGateId((prev) => (prev === gate.id ? null : prev))
                      }
                      onClick={() => setSelectedGateId(gate.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedGateId(gate.id);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          moveFocusToIndex(idx + 1);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          moveFocusToIndex(idx - 1);
                        } else if (e.key === "Home") {
                          e.preventDefault();
                          moveFocusToIndex(0);
                        } else if (e.key === "End") {
                          e.preventDefault();
                          moveFocusToIndex(model.gates.length - 1);
                        }
                      }}
                      className={cn(
                        "cursor-pointer focus:outline-none",
                        prefersReducedMotion ? undefined : "transition-opacity duration-150",
                      )}
                    >
                      {/* Horizontal "If Yes ->" Connector */}
                      <line
                        x1={gateLeft + gateWidth}
                        y1={gate.svgY}
                        x2={outLeft - 4}
                        y2={gate.svgY}
                        stroke={isSelected ? "var(--primary)" : "var(--border)"}
                        strokeWidth={isSelected ? 2.25 : 1.75}
                        markerEnd="url(#flowchart-arrow-primary)"
                      />
                      <rect
                        x={gateLeft + gateWidth + 14}
                        y={gate.svgY - 10}
                        width={50}
                        height={20}
                        rx={4}
                        fill="var(--surface)"
                        stroke={isSelected ? "var(--primary)" : "var(--border)"}
                        strokeWidth={1}
                      />
                      <text
                        x={gateLeft + gateWidth + 39}
                        y={gate.svgY}
                        dy="0.34em"
                        textAnchor="middle"
                        fill="var(--primary)"
                        className="font-mono text-xs font-bold"
                      >
                        Yes →
                      </text>

                      {isFocused && (
                        <rect
                          data-testid={`flowchart-focus-ring-${gate.id}`}
                          x={gateLeft - 4}
                          y={gateTop - 4}
                          width={gateWidth + 8}
                          height={gateHeight + 8}
                          rx={12}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth={2.25}
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Left Gate Box */}
                      <rect
                        x={gateLeft}
                        y={gateTop}
                        width={gateWidth}
                        height={gateHeight}
                        rx={10}
                        fill={
                          isSelected ? "var(--surface-elevated)" : "var(--surface)"
                        }
                        stroke={
                          isSelected
                            ? "var(--primary)"
                            : hasAlert || isBoardCue
                              ? "var(--accent)"
                              : "var(--border)"
                        }
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />

                      {/* Step Number Badge */}
                      <circle
                        cx={gateLeft + 26}
                        cy={gateTop + 26}
                        r={14}
                        fill={isSelected ? "var(--primary)" : "var(--muted)"}
                      />
                      <text
                        x={gateLeft + 26}
                        y={gateTop + 26}
                        dy="0.35em"
                        textAnchor="middle"
                        fill={
                          isSelected
                            ? "var(--primary-foreground)"
                            : "var(--foreground)"
                        }
                        className="font-mono text-xs font-bold"
                      >
                        {gate.stepNumber}
                      </text>

                      {/* Short Title + Date Status Pill */}
                      <text
                        x={gateLeft + 50}
                        y={gateTop + 26}
                        dy="0.32em"
                        fill="var(--foreground)"
                        className="font-serif text-sm font-bold"
                      >
                        {gate.shortTitle}
                      </text>

                      <text
                        x={gateLeft + gateWidth - 14}
                        y={gateTop + 26}
                        dy="0.32em"
                        textAnchor="end"
                        fill={hasAlert ? "var(--accent)" : "var(--muted-foreground)"}
                        className="font-mono text-xs font-semibold"
                      >
                        {truncateSvgText(gate.dateStatusBadge, 28)}
                      </text>

                      {/* Evidentiary Standard Subtitle */}
                      <text
                        x={gateLeft + 50}
                        y={gateTop + 56}
                        dy="0.32em"
                        fill="var(--muted-foreground)"
                        className="font-sans text-xs"
                      >
                        {truncateSvgText(gate.evidentiaryStandard, 54)}
                      </text>

                      {/* Right Outcome Box ("If Yes") */}
                      <rect
                        x={outLeft}
                        y={gateTop + 6}
                        width={outWidth}
                        height={gateHeight - 12}
                        rx={8}
                        fill="var(--background)"
                        stroke={
                          isSelected
                            ? "var(--primary)"
                            : isBoardCue
                              ? "var(--accent)"
                              : "var(--border)"
                        }
                        strokeDasharray={isBoardCue ? "4 3" : undefined}
                        strokeWidth={isSelected ? 2 : 1.25}
                      />
                      <text
                        x={outLeft + 14}
                        y={gateTop + 31}
                        dy="0.32em"
                        fill="var(--foreground)"
                        className="font-sans text-xs font-bold"
                      >
                        {truncateSvgText(gate.ifYesTitle, 40)}
                      </text>
                      <text
                        x={outLeft + 14}
                        y={gateTop + 55}
                        dy="0.32em"
                        fill="var(--primary)"
                        className="font-mono text-xs"
                      >
                        {truncateSvgText(gate.primaryCitation, 40)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Synchronized Step Inspector Card (Touch / Keyboard / Click Accessible) */}
          <article
            data-testid="flowchart-step-inspector"
            aria-live="polite"
            className="space-y-4 rounded-xl border border-primary/40 bg-background p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
                    Step {selectedGate.stepNumber} of 6
                  </span>
                  <span className="font-mono text-xs font-semibold text-primary">
                    {selectedGate.primaryCitation}
                  </span>
                  <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {selectedGate.dateStatusBadge}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground sm:text-xl">
                  {selectedGate.gateQuestion}
                </h3>
              </div>

              <Link
                href={selectedGate.primaryHref}
                prefetch={
                  selectedGate.primaryHref === "/investigate" ? false : undefined
                }
                className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span>Open Primary Guide</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {selectedGate.dateBoundaryAlert && (
              <div className="flex items-start gap-2.5 rounded-lg border border-accent/60 bg-surface p-3 text-xs leading-relaxed text-foreground">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <div>
                  <span className="font-semibold">
                    Decision Date Boundary ({effectiveDate}):{" "}
                  </span>
                  <LexiconText text={selectedGate.dateBoundaryAlert} />
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border bg-surface p-3.5 text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>If Yes: {selectedGate.ifYesTitle}</span>
                </div>
                <p className="text-muted-foreground">
                  <LexiconText text={selectedGate.ifYesSummary} />
                </p>
                <div className="pt-1 font-semibold text-foreground">
                  Record clues to verify:
                </div>
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  {selectedGate.recordClues.map((clue) => (
                    <li key={clue}>
                      <LexiconText text={clue} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-surface p-3.5 text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldAlert
                    className="h-4 w-4 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span>Kill-Switches &amp; Doctrinal Limits</span>
                </div>
                <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
                  {selectedGate.killSwitches.map((ks) => (
                    <li key={ks}>
                      <LexiconText text={ks} />
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border pt-2 font-mono text-xs text-muted-foreground">
                  {selectedGate.ifNoAdvanceLabel}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-muted-foreground">
                  Related authorities:
                </span>
                {selectedGate.secondaryLinks.map((lnk) => (
                  <Link
                    key={lnk.href}
                    href={lnk.href}
                    prefetch={lnk.href === "/investigate" ? false : undefined}
                    className="rounded border border-border bg-surface px-2.5 py-1 font-medium text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {lnk.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {model.gates.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-label={`Jump to Step ${g.stepNumber}: ${g.shortTitle}`}
                    aria-pressed={selectedGate.id === g.id}
                    onClick={() => setSelectedGateId(g.id)}
                    className={cn(
                      "min-h-7 rounded border px-2 py-0.5 font-mono text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                      selectedGate.id === g.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-muted",
                    )}
                  >
                    {g.stepNumber}
                  </button>
                ))}
              </div>
            </div>
          </article>
        </div>
      ) : (
        /* Synchronized 1:1 Accessible Outline View */
        <ol
          data-testid="flowchart-accessible-outline"
          className="space-y-4"
        >
          {model.gates.map((gate) => (
            <li
              key={gate.id}
              className="space-y-3 rounded-xl border border-border bg-background p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
                      Step {gate.stepNumber}
                    </span>
                    <span className="font-serif text-base font-bold text-foreground">
                      {gate.shortTitle}
                    </span>
                    <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {gate.dateStatusBadge}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {gate.gateQuestion}
                  </h3>
                  <div className="font-mono text-xs text-primary">
                    {gate.primaryCitation} · {gate.evidentiaryStandard}
                  </div>
                </div>

                <Link
                  href={gate.primaryHref}
                  prefetch={gate.primaryHref === "/investigate" ? false : undefined}
                  className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-3 py-1 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span>Open Guide</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              {gate.dateBoundaryAlert && (
                <div className="rounded-lg border border-accent/60 bg-surface p-3 text-xs leading-relaxed text-foreground">
                  <strong>Date Boundary ({effectiveDate}): </strong>
                  <LexiconText text={gate.dateBoundaryAlert} />
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 rounded-lg border border-border/80 bg-surface p-3 text-xs leading-relaxed">
                  <div className="font-semibold text-foreground">
                    If Yes → {gate.ifYesTitle}
                  </div>
                  <p className="text-muted-foreground">
                    <LexiconText text={gate.ifYesSummary} />
                  </p>
                  <ul className="list-disc space-y-1 pt-1 pl-4 text-muted-foreground">
                    {gate.recordClues.map((clue) => (
                      <li key={clue}>
                        <LexiconText text={clue} />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 rounded-lg border border-border/80 bg-surface p-3 text-xs leading-relaxed">
                  <div className="font-semibold text-foreground">
                    Kill-Switches &amp; Next Gate
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {gate.killSwitches.map((ks) => (
                      <li key={ks}>
                        <LexiconText text={ks} />
                      </li>
                    ))}
                  </ul>
                  <div className="pt-1 font-mono text-xs text-muted-foreground">
                    {gate.ifNoAdvanceLabel}
                  </div>
                </div>
              </div>

              {gate.secondaryLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2.5 text-xs">
                  <span className="font-medium text-muted-foreground">
                    Related authorities:
                  </span>
                  {gate.secondaryLinks.map((lnk) => (
                    <Link
                      key={lnk.href}
                      href={lnk.href}
                      prefetch={lnk.href === "/investigate" ? false : undefined}
                      className="rounded border border-border bg-surface px-2.5 py-1 font-medium text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {lnk.label}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
