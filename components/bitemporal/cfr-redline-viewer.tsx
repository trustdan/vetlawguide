"use client";

import { useMemo, useState } from "react";
import { Columns2, FileDiff, Filter, Layers } from "lucide-react";
import { compareCfrVersions, stripMarkdownSyntax } from "@/lib/corpus/diff";
import type {
  CfrTrapTable,
  CompiledCfrSnapshot,
  RedlineSegment,
} from "@/lib/corpus/types";
import { cn } from "@/lib/utils";
import { LexiconText } from "./lexicon-text";
import { isMarkdownPipeTable, renderPipeTableBlock } from "./verbatim-cfr-block";

function prepareRedlineMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (isMarkdownPipeTable(trimmed)) {
        return trimmed
          .split("\n")
          .map((line, idx) => (idx === 1 ? line : stripMarkdownSyntax(line)))
          .join("\n");
      }
      return trimmed
        .split("\n")
        .map((line) => stripMarkdownSyntax(line.replace(/^\*\s+/, "• ")))
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function InlineSegmentsView({ segments }: { segments: RedlineSegment[] }) {
  return (
    <span className="whitespace-pre-wrap [overflow-wrap:anywhere] font-serif text-sm leading-relaxed">
      {segments.map((seg, idx) => {
        if (seg.kind === "equal") {
          return <span key={idx}>{seg.text}</span>;
        }
        if (seg.kind === "removed") {
          return (
            <del
              key={idx}
              style={{
                backgroundColor: "var(--diff-removed-bg)",
                color: "var(--diff-removed-fg)",
                borderColor: "var(--diff-removed-border)",
              }}
              className="mx-0.5 rounded border px-1 py-0.5 line-through decoration-2"
            >
              <span className="sr-only"> [Removed: </span>
              {seg.text}
              <span className="sr-only">] </span>
            </del>
          );
        }
        return (
          <ins
            key={idx}
            style={{
              backgroundColor: "var(--diff-added-bg)",
              color: "var(--diff-added-fg)",
              borderColor: "var(--diff-added-border)",
            }}
            className="mx-0.5 rounded border px-1 py-0.5 font-semibold underline decoration-2"
          >
            <span className="sr-only"> [Added: </span>
            {seg.text}
            <span className="sr-only">] </span>
          </ins>
        );
      })}
    </span>
  );
}

function TrapTablesSection({ trapTables }: { trapTables: CfrTrapTable[] }) {
  if (trapTables.length === 0) return null;
  return (
    <div className="space-y-4 border-t border-border pt-4">
      {trapTables.map((tbl) => (
        <div key={tbl.id} className="space-y-2">
          <h3 className="font-serif text-base font-bold text-foreground">
            {tbl.title}
          </h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-border bg-surface">
                <tr>
                  {tbl.headers.map((hdr, hIdx) => (
                    <th
                      key={hIdx}
                      scope="col"
                      className="px-3 py-2 font-semibold text-foreground"
                    >
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {tbl.rows.map((cells, rIdx) => (
                  <tr key={rIdx} className="align-top">
                    {cells.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={cn(
                          "px-3 py-2 leading-relaxed",
                          cIdx === 0
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <LexiconText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CfrRedlineViewer({
  versions,
  relatedComparisonSnapshots,
  trapTables,
}: {
  versions: CompiledCfrSnapshot[];
  relatedComparisonSnapshots?: CompiledCfrSnapshot[];
  trapTables: CfrTrapTable[];
}) {
  const primaryIds = useMemo(
    () => new Set(versions.map((v) => v.version_id)),
    [versions],
  );

  const comparableSnapshots = useMemo(() => {
    const primary = versions.filter((v) => Boolean(v.verbatimMarkdown));
    const seen = new Set(primary.map((v) => v.version_id));
    const related = (relatedComparisonSnapshots ?? []).filter(
      (v) => Boolean(v.verbatimMarkdown) && !seen.has(v.version_id),
    );
    return [...primary, ...related].sort((a, b) => {
      const cmp = a.effective_from.localeCompare(b.effective_from);
      if (cmp !== 0) return cmp;
      const aPrimary = primaryIds.has(a.version_id) ? 0 : 1;
      const bPrimary = primaryIds.has(b.version_id) ? 0 : 1;
      return aPrimary - bPrimary;
    });
  }, [versions, relatedComparisonSnapshots, primaryIds]);

  const [beforeId, setBeforeId] = useState<string>(
    () => comparableSnapshots[0]?.version_id ?? "",
  );
  const [afterId, setAfterId] = useState<string>(
    () =>
      comparableSnapshots[comparableSnapshots.length - 1]?.version_id ??
      comparableSnapshots[0]?.version_id ??
      "",
  );
  const [layoutMode, setLayoutMode] = useState<"side-by-side" | "inline">("side-by-side");
  const [onlyChanges, setOnlyChanges] = useState(false);

  const beforeSnap =
    comparableSnapshots.find((v) => v.version_id === beforeId) ??
    comparableSnapshots[0];
  const afterSnap =
    comparableSnapshots.find((v) => v.version_id === afterId) ??
    comparableSnapshots[comparableSnapshots.length - 1];

  const scopeResolution = useMemo(() => {
    if (!beforeSnap?.verbatimMarkdown || !afterSnap?.verbatimMarkdown) {
      return null;
    }

    const bKey = beforeSnap.excerptScopeKey ?? null;
    const aKey = afterSnap.excerptScopeKey ?? null;

    const incompatibleCrossScope =
      (bKey && !aKey && !afterSnap.scopedExcerpts?.[bKey]) ||
      (aKey && !bKey && !beforeSnap.scopedExcerpts?.[aKey]) ||
      (bKey &&
        aKey &&
        bKey !== aKey &&
        !beforeSnap.scopedExcerpts?.[aKey] &&
        !afterSnap.scopedExcerpts?.[bKey]);

    if (incompatibleCrossScope) {
      return {
        disjoint: true as const,
        beforeScopeLabel:
          beforeSnap.excerptScopeLabel ?? bKey ?? beforeSnap.cfr_section,
        afterScopeLabel:
          afterSnap.excerptScopeLabel ?? aKey ?? afterSnap.cfr_section,
      };
    }

    let matchedScopeKey: string | null = null;
    let matchedScopeLabel: string | null = null;

    if (bKey && (afterSnap.scopedExcerpts?.[bKey] || aKey === bKey)) {
      matchedScopeKey = bKey;
      matchedScopeLabel =
        beforeSnap.excerptScopeLabel ?? afterSnap.excerptScopeLabel ?? bKey;
    } else if (aKey && (beforeSnap.scopedExcerpts?.[aKey] || bKey === aKey)) {
      matchedScopeKey = aKey;
      matchedScopeLabel =
        afterSnap.excerptScopeLabel ?? beforeSnap.excerptScopeLabel ?? aKey;
    }

    const rawBefore = matchedScopeKey
      ? (beforeSnap.scopedExcerpts?.[matchedScopeKey] ?? beforeSnap.verbatimMarkdown)
      : beforeSnap.verbatimMarkdown;
    const rawAfter = matchedScopeKey
      ? (afterSnap.scopedExcerpts?.[matchedScopeKey] ?? afterSnap.verbatimMarkdown)
      : afterSnap.verbatimMarkdown;

    return {
      disjoint: false as const,
      scopeKey: matchedScopeKey,
      scopeLabel: matchedScopeLabel,
      comparison: compareCfrVersions(
        `${beforeSnap.cfr_section} (Eff. ${beforeSnap.effective_from})`,
        prepareRedlineMarkdown(rawBefore),
        `${afterSnap.cfr_section} (Eff. ${afterSnap.effective_from})`,
        prepareRedlineMarkdown(rawAfter),
      ),
    };
  }, [beforeSnap, afterSnap]);

  const comparison =
    scopeResolution && !scopeResolution.disjoint ? scopeResolution.comparison : null;

  if (comparableSnapshots.length < 2 || !scopeResolution || !beforeSnap || !afterSnap) {
    if (trapTables.length === 0) return null;
    return (
      <section
        id="redline-diff"
        aria-labelledby="redline-diff-heading"
        className="scroll-mt-28 space-y-4 rounded-lg border border-border bg-surface-elevated p-4 sm:p-5"
      >
        <h2
          id="redline-diff-heading"
          className="inline-flex items-center gap-2 font-serif text-lg font-bold text-foreground"
        >
          <FileDiff className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Historical Comparison Matrices &amp; Transition Traps</span>
        </h2>
        <TrapTablesSection trapTables={trapTables} />
      </section>
    );
  }

  const visibleRows = comparison
    ? onlyChanges
      ? comparison.alignedRows.filter((r) => r.changeKind !== "unchanged")
      : comparison.alignedRows
    : [];

  function formatOptionLabel(snap: CompiledCfrSnapshot): string {
    if (primaryIds.has(snap.version_id)) {
      return `Eff. ${snap.effective_from} → ${snap.effective_to ?? "present"}`;
    }
    return `Related: ${snap.cfr_section} (Eff. ${snap.effective_from})`;
  }

  return (
    <section
      id="redline-diff"
      aria-labelledby="redline-diff-heading"
      className="min-w-0 scroll-mt-28 space-y-5 rounded-lg border border-border bg-surface-elevated p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <h2
            id="redline-diff-heading"
            className="inline-flex items-center gap-2 font-serif text-lg font-bold text-foreground"
          >
            <FileDiff className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Deterministic Verbatim Redline Comparison</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Word-and-clause diff with non-color strikethrough (<del>removed</del>) and
            underlined (<ins>added</ins>) semantics.
          </p>
        </div>

        {comparison && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              style={{
                backgroundColor: "var(--diff-removed-bg)",
                color: "var(--diff-removed-fg)",
                borderColor: "var(--diff-removed-border)",
              }}
              className="rounded border px-2 py-0.5 font-mono font-semibold"
            >
              −{comparison.stats.removedTokens} words removed
            </span>
            <span
              style={{
                backgroundColor: "var(--diff-added-bg)",
                color: "var(--diff-added-fg)",
                borderColor: "var(--diff-added-border)",
              }}
              className="rounded border px-2 py-0.5 font-mono font-semibold"
            >
              +{comparison.stats.addedTokens} words added
            </span>
            <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-muted-foreground">
              {comparison.stats.changedParagraphs} changed clauses
            </span>
          </div>
        )}
      </div>

      {/* Controls: Prior Version vs. Subsequent Version + Layout Mode */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <label
            htmlFor="redline-before-select"
            className="block text-xs font-semibold text-muted-foreground"
          >
            Prior Era Snapshot (Baseline A)
          </label>
          <select
            id="redline-before-select"
            value={beforeSnap.version_id}
            onChange={(e) => setBeforeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {comparableSnapshots.map((v) => (
              <option key={v.version_id} value={v.version_id}>
                {formatOptionLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="redline-after-select"
            className="block text-xs font-semibold text-muted-foreground"
          >
            Subsequent Era Snapshot (Comparison B)
          </label>
          <select
            id="redline-after-select"
            value={afterSnap.version_id}
            onChange={(e) => setAfterId(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {comparableSnapshots.map((v) => (
              <option key={v.version_id} value={v.version_id}>
                {formatOptionLabel(v)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <span className="block text-xs font-semibold text-muted-foreground">
            Comparison Layout
          </span>
          <div
            role="group"
            aria-label="Redline layout mode"
            className="mt-1 inline-flex w-full rounded-md border border-border bg-surface p-0.5 text-xs"
          >
            <button
              type="button"
              aria-pressed={layoutMode === "side-by-side"}
              onClick={() => setLayoutMode("side-by-side")}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1 rounded px-2 py-1 font-semibold",
                layoutMode === "side-by-side"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              aria-pressed={layoutMode === "inline"}
              onClick={() => setLayoutMode("inline")}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1 rounded px-2 py-1 font-semibold",
                layoutMode === "inline"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileDiff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Unified Inline</span>
            </button>
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            aria-pressed={onlyChanges}
            onClick={() => setOnlyChanges((prev) => !prev)}
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold",
              onlyChanges
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{onlyChanges ? "Showing Changed Clauses" : "Filter Changed Only"}</span>
          </button>
        </div>
      </div>

      {!scopeResolution.disjoint && scopeResolution.scopeLabel && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-surface px-3 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Scoped Symmetric Redline Target:</span>
          </span>
          <span className="font-mono font-semibold text-primary">
            {scopeResolution.scopeLabel}
          </span>
          <span>
            — Both snapshots are aligned to the exact shared subsection or Diagnostic Code
            scope so neighboring clauses are never mislabeled removed or added.
            {comparison?.stats.changedParagraphs === 0 &&
            beforeSnap.version_id !== afterSnap.version_id
              ? " This scoped subsection carried forward verbatim without change between these two snapshots (only neighboring subsections or Diagnostic Codes in the broader section changed)."
              : ""}
          </span>
        </div>
      )}

      {scopeResolution.disjoint ? (
        <div className="rounded-md border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">
            Separate Sub-Schedule Excerpts Selected:
          </strong>{" "}
          Baseline A covers{" "}
          <span className="font-mono font-semibold text-foreground">
            {scopeResolution.beforeScopeLabel}
          </span>{" "}
          while Comparison B covers{" "}
          <span className="font-mono font-semibold text-foreground">
            {scopeResolution.afterScopeLabel}
          </span>
          . Select the post-overhaul full snapshot to compare matching sub-schedules
          symmetrically.
        </div>
      ) : layoutMode === "inline" ? (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          {visibleRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Identical verbatim text across the selected snapshots.
            </p>
          ) : (
            visibleRows.map((row) => {
              const beforeIsTable = Boolean(
                row.beforeParagraph && isMarkdownPipeTable(row.beforeParagraph),
              );
              const afterIsTable = Boolean(
                row.afterParagraph && isMarkdownPipeTable(row.afterParagraph),
              );
              if (beforeIsTable || afterIsTable) {
                return (
                  <div key={row.rowIndex} className="space-y-2">
                    {row.beforeParagraph && row.changeKind !== "unchanged" && (
                      <div>
                        <span
                          style={{
                            backgroundColor: "var(--diff-removed-bg)",
                            color: "var(--diff-removed-fg)",
                            borderColor: "var(--diff-removed-border)",
                          }}
                          className="inline-block rounded border px-1.5 py-0.5 font-mono text-xs font-semibold line-through"
                        >
                          Prior Table ({beforeSnap.effective_from})
                        </span>
                        {beforeIsTable ? (
                          renderPipeTableBlock(row.beforeParagraph, `in-b-${row.rowIndex}`)
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] font-serif text-sm">
                            {row.beforeParagraph}
                          </p>
                        )}
                      </div>
                    )}
                    {row.afterParagraph && (
                      <div>
                        {row.changeKind !== "unchanged" && (
                          <span
                            style={{
                              backgroundColor: "var(--diff-added-bg)",
                              color: "var(--diff-added-fg)",
                              borderColor: "var(--diff-added-border)",
                            }}
                            className="inline-block rounded border px-1.5 py-0.5 font-mono text-xs font-semibold underline"
                          >
                            Added / Amended Table ({afterSnap.effective_from})
                          </span>
                        )}
                        {afterIsTable ? (
                          renderPipeTableBlock(row.afterParagraph, `in-a-${row.rowIndex}`)
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] font-serif text-sm">
                            {row.afterParagraph}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div key={row.rowIndex}>
                  <InlineSegmentsView segments={row.inlineSegments} />
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRows.length === 0 ? (
            <p className="rounded-md border border-border bg-surface p-4 text-xs text-muted-foreground">
              Identical verbatim text across the selected snapshots.
            </p>
          ) : (
            visibleRows.map((row) => {
              const beforeIsTable = Boolean(
                row.beforeParagraph && isMarkdownPipeTable(row.beforeParagraph),
              );
              const afterIsTable = Boolean(
                row.afterParagraph && isMarkdownPipeTable(row.afterParagraph),
              );
              const anyTable = beforeIsTable || afterIsTable;

              return (
                <div
                  key={row.rowIndex}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-1.5 font-mono text-xs">
                    <span className="text-muted-foreground">Clause #{row.rowIndex + 1}</span>
                    <span className="font-semibold text-foreground uppercase">
                      {row.changeKind}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="min-w-0 overflow-x-auto rounded border border-border/70 bg-surface/50 p-3">
                      <div className="mb-1 [overflow-wrap:anywhere] font-mono text-xs font-semibold text-muted-foreground">
                        Baseline A ({beforeSnap.cfr_section} · Eff. {beforeSnap.effective_from})
                      </div>
                      {row.beforeParagraph ? (
                        beforeIsTable ? (
                          renderPipeTableBlock(row.beforeParagraph, `sbs-b-${row.rowIndex}`)
                        ) : row.changeKind === "modified" && !anyTable ? (
                          <InlineSegmentsView
                            segments={row.inlineSegments.filter((s) => s.kind !== "added")}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap [overflow-wrap:anywhere] font-serif text-sm leading-relaxed text-foreground">
                            {row.beforeParagraph}
                          </p>
                        )
                      ) : (
                        <p className="font-mono text-xs italic text-muted-foreground">
                          [Not present in {beforeSnap.effective_from} edition]
                        </p>
                      )}
                    </div>

                    <div className="min-w-0 overflow-x-auto rounded border border-border/70 bg-surface/50 p-3">
                      <div className="mb-1 [overflow-wrap:anywhere] font-mono text-xs font-semibold text-muted-foreground">
                        Comparison B ({afterSnap.cfr_section} · Eff. {afterSnap.effective_from})
                      </div>
                      {row.afterParagraph ? (
                        afterIsTable ? (
                          renderPipeTableBlock(row.afterParagraph, `sbs-a-${row.rowIndex}`)
                        ) : row.changeKind === "modified" && !anyTable ? (
                          <InlineSegmentsView
                            segments={row.inlineSegments.filter((s) => s.kind !== "removed")}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap [overflow-wrap:anywhere] font-serif text-sm leading-relaxed text-foreground">
                            {row.afterParagraph}
                          </p>
                        )
                      ) : (
                        <p className="font-mono text-xs italic text-muted-foreground">
                          [Removed / consolidated in {afterSnap.effective_from} edition]
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Upstream Historical Diff & Diagnostic Code Reference Tables */}
      <TrapTablesSection trapTables={trapTables} />
    </section>
  );
}
