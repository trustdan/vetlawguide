"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { hierarchy, tree } from "d3-hierarchy";
import { useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Calendar,
  FolderTree,
  ListTree,
  Maximize2,
  Minimize2,
  Scale,
  Shield,
} from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import {
  buildKnowledgeTree,
  flattenKnowledgeTree,
  type KnowledgeTreeNode,
} from "@/lib/corpus/knowledge-tree";
import { cn } from "@/lib/utils";
import { LexiconText } from "./lexicon-text";

interface FilteredTreeNode extends KnowledgeTreeNode {
  _hasChildren: boolean;
  _collapsedCount: number;
  children?: FilteredTreeNode[];
}

function collectDefaultExpandedIds(node: KnowledgeTreeNode): Set<string> {
  const set = new Set<string>();
  function walk(n: KnowledgeTreeNode) {
    if (n.defaultExpanded && n.children && n.children.length > 0) {
      set.add(n.id);
    }
    for (const c of n.children ?? []) {
      walk(c);
    }
  }
  walk(node);
  return set;
}

function pruneCollapsedTree(
  node: KnowledgeTreeNode,
  expandedIds: ReadonlySet<string>,
): FilteredTreeNode {
  const rawChildren = node.children ?? [];
  const hasChildren = rawChildren.length > 0;
  const isExpanded = expandedIds.has(node.id);

  if (!hasChildren) {
    return {
      ...node,
      _hasChildren: false,
      _collapsedCount: 0,
      children: undefined,
    };
  }

  if (!isExpanded) {
    return {
      ...node,
      _hasChildren: true,
      _collapsedCount: rawChildren.length,
      children: undefined,
    };
  }

  return {
    ...node,
    _hasChildren: true,
    _collapsedCount: 0,
    children: rawChildren.map((c) => pruneCollapsedTree(c, expandedIds)),
  };
}

function truncateSvgLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

const TREE_QUICK_DATES: ReadonlyArray<{ label: string; date: string | null }> = [
  { label: "Current Law", date: null },
  { label: "Korea (1954-06-15)", date: "1954-06-15" },
  { label: "Vietnam (1969-11-15)", date: "1969-11-15" },
  { label: "§ 4.56 Gap Trap (1997-06-20)", date: "1997-06-20" },
  { label: "Scars Era 3 (2012-06-01)", date: "2012-06-01" },
];

function AccessibleOutlineBranch({
  node,
  selectedId,
  expandedIds,
  onToggleNode,
}: {
  node: KnowledgeTreeNode;
  selectedId: string;
  expandedIds: ReadonlySet<string>;
  onToggleNode: (node: KnowledgeTreeNode) => void;
}) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <li className="space-y-1.5">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs",
          isSelected
            ? "border-primary bg-surface shadow-2xs"
            : "border-border bg-background",
        )}
      >
        <button
          type="button"
          aria-expanded={hasChildren ? isExpanded : undefined}
          onClick={() => onToggleNode(node)}
          className="text-left font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {hasChildren && (
            <span className="mr-1.5 font-mono text-primary">
              {isExpanded ? "▾" : "▸"}
            </span>
          )}
          <span>{node.label}</span>
          {hasChildren && !isExpanded && (
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
              [+{node.children!.length}]
            </span>
          )}
          {node.badge && (
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
              {node.badge}
            </span>
          )}
        </button>

        {node.href && (
          <Link
            href={node.href}
            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary underline underline-offset-2"
          >
            <span>Open</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul className="ml-4 space-y-1.5 border-l-2 border-border pl-3">
          {node.children!.map((child) => (
            <AccessibleOutlineBranch
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggleNode={onToggleNode}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OsintKnowledgeTree({
  defaultDate,
  compact = false,
}: {
  defaultDate: string;
  compact?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { audienceMode, setAudienceMode, decisionDate, setDecisionDate } =
    useResearchContext();

  const effectiveDate = decisionDate ?? defaultDate;

  const fullTree = useMemo(
    () => buildKnowledgeTree(audienceMode, effectiveDate),
    [audienceMode, effectiveDate],
  );

  const allNodesById = useMemo(() => {
    const map = new Map<string, KnowledgeTreeNode>();
    for (const n of flattenKnowledgeTree(fullTree)) {
      map.set(n.id, n);
    }
    return map;
  }, [fullTree]);

  // Track user-toggled node overrides relative to defaultExpanded
  const [customExpandedByMode, setCustomExpandedByMode] = useState<
    Record<string, Set<string> | null>
  >({
    veteran: null,
    practitioner: null,
  });

  const [viewMode, setViewMode] = useState<"tree" | "outline">("tree");
  const [selectedIdByMode, setSelectedIdByMode] = useState<Record<string, string>>({
    veteran: "root-veteran",
    practitioner: "root-practitioner",
  });

  const allBranchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const n of allNodesById.values()) {
      if (n.children && n.children.length > 0) {
        ids.add(n.id);
      }
    }
    return ids;
  }, [allNodesById]);

  const activeExpandedSet = useMemo(() => {
    const custom = customExpandedByMode[audienceMode];
    if (custom) return custom;
    // Start cleanly collapsed: only root expanded so top-level category circles appear collapsed ([+N])
    return collectDefaultExpandedIds(fullTree);
  }, [audienceMode, customExpandedByMode, fullTree]);

  const isAllExpanded = useMemo(() => {
    if (allBranchIds.size === 0) return false;
    for (const id of allBranchIds) {
      if (!activeExpandedSet.has(id)) return false;
    }
    return true;
  }, [allBranchIds, activeExpandedSet]);

  const selectedNode =
    allNodesById.get(selectedIdByMode[audienceMode] ?? fullTree.id) ?? fullTree;

  function toggleNodeByRaw(node: KnowledgeTreeNode) {
    setSelectedIdByMode((prev) => ({ ...prev, [audienceMode]: node.id }));
    if (!node.children || node.children.length === 0) return;

    const next = new Set(activeExpandedSet);
    if (next.has(node.id)) {
      next.delete(node.id);
    } else {
      next.add(node.id);
    }
    setCustomExpandedByMode((prev) => ({ ...prev, [audienceMode]: next }));
  }

  function toggleExpandCollapseAll() {
    if (isAllExpanded) {
      // Collapse All back to top-level collapsed category circles
      setCustomExpandedByMode((prev) => ({
        ...prev,
        [audienceMode]: new Set([fullTree.id]),
      }));
    } else {
      setCustomExpandedByMode((prev) => ({
        ...prev,
        [audienceMode]: new Set(allBranchIds),
      }));
    }
  }

  // Compute deterministic d3.tree() horizontal layout (osintframework.com style)
  const layout = useMemo(() => {
    const pruned = pruneCollapsedTree(fullTree, activeExpandedSet);
    const root = hierarchy<FilteredTreeNode>(pruned);
    const dy = compact ? 42 : 46;
    const dx = compact ? 275 : 300;
    const treeGen = tree<FilteredTreeNode>().nodeSize([dy, dx]);
    const laidOut = treeGen(root);

    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = 0;

    laidOut.each((d) => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y > maxY) maxY = d.y;
    });

    const padTop = 36;
    const padBottom = 36;
    const padLeft = 28;
    const padRight = 350;
    const height = Math.max(240, maxX - minX + padTop + padBottom);
    const width = Math.max(760, maxY + padLeft + padRight);
    const offsetY = -minX + padTop;
    const offsetX = padLeft;

    return {
      nodes: laidOut.descendants(),
      links: laidOut.links(),
      width,
      height,
      offsetX,
      offsetY,
    };
  }, [fullTree, activeExpandedSet, compact]);

  return (
    <section
      aria-label={
        audienceMode === "veteran"
          ? "Interactive Veteran situation and pathway explorer tree"
          : "Interactive Title 38 point-in-time legal authority tree"
      }
      className="space-y-4 rounded-xl border border-border bg-surface-elevated p-4 shadow-2xs sm:p-5"
    >
      {/* Tree Header & Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              {audienceMode === "veteran" ? (
                <>
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Veteran Pathway Explorer Tree</span>
                </>
              ) : (
                <>
                  <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Practitioner Point-in-Time Law Tree</span>
                </>
              )}
            </span>
            <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              Decision Date: <strong className="text-foreground">{effectiveDate}</strong>
            </span>
          </div>

          <h2 className="font-serif text-lg font-bold text-foreground sm:text-xl">
            {audienceMode === "veteran"
              ? "Click Any Branch to Explore Situations, Paperwork Clues & Review Options"
              : "Click Any Branch to Inspect Governing Statutes, 38 C.F.R. Eras & Finality Vehicles"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Filled circles (<span className="font-mono font-bold text-primary">●</span>)
            expand hidden sub-branches; dashed rings mark queued Waves 2–4 or quarantined
            notices. Switch{" "}
            <button
              type="button"
              onClick={() =>
                setAudienceMode(
                  audienceMode === "veteran" ? "practitioner" : "veteran",
                )
              }
              className="font-semibold text-primary underline underline-offset-2"
            >
              {audienceMode === "veteran"
                ? "switch to Law Tree"
                : "switch to Pathway Tree"}
            </button>{" "}
            or change <strong>Decision Date</strong> below to watch the tree adapt.
          </p>
        </div>

        {/* View Toggle (SVG Tree vs. 1:1 Accessible Outline) + Single Expand/Collapse All Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            aria-pressed={isAllExpanded}
            onClick={toggleExpandCollapseAll}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              isAllExpanded
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            {isAllExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Expand All</span>
              </>
            )}
          </button>

          <div
            role="group"
            aria-label="Knowledge tree presentation mode"
            className="inline-flex rounded-md border border-border bg-surface p-0.5"
          >
            <button
              type="button"
              aria-pressed={viewMode === "tree"}
              onClick={() => setViewMode("tree")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 font-semibold",
                viewMode === "tree"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Interactive Tree</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "outline"}
              onClick={() => setViewMode("outline")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 font-semibold",
                viewMode === "outline"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
              <span>1:1 Outline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Decision-Date Morph Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Morph Tree by Decision Date:</span>
        </span>
        {TREE_QUICK_DATES.map((preset) => {
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
                "rounded border px-2 py-0.5 font-mono transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                isActive
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-muted",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Tree Canvas OR Synchronized 1:1 Accessible Outline */}
      {viewMode === "tree" ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-background p-2">
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="group"
            aria-label={fullTree.label}
            className="block min-w-[720px] select-none"
          >
            {/* Cubic Bézier Branch Links */}
            <g fill="none">
              {layout.links.map((lnk) => {
                const sx = lnk.source.y + layout.offsetX;
                const sy = lnk.source.x + layout.offsetY;
                const tx = lnk.target.y + layout.offsetX;
                const ty = lnk.target.x + layout.offsetY;
                const midX = (sx + tx) / 2;
                const dPath = `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`;
                const targetStatus = lnk.target.data.nodeStatus;
                const isDashed =
                  targetStatus === "placeholder" || targetStatus === "quarantined";

                return (
                  <path
                    key={`${lnk.source.data.id}->${lnk.target.data.id}`}
                    d={dPath}
                    stroke={
                      targetStatus === "quarantined"
                        ? "var(--accent)"
                        : "var(--border)"
                    }
                    strokeWidth={1.75}
                    strokeDasharray={isDashed ? "4 3" : undefined}
                    className={
                      prefersReducedMotion ? undefined : "transition-all duration-200"
                    }
                  />
                );
              })}
            </g>

            {/* Interactive OSINT-Framework Nodes */}
            <g>
              {layout.nodes.map((d) => {
                const cx = d.y + layout.offsetX;
                const cy = d.x + layout.offsetY;
                const node = d.data;
                const isCollapsedBranch = node._collapsedCount > 0;
                const isSelected = selectedNode.id === node.id;
                const isDashed =
                  node.nodeStatus === "placeholder" ||
                  node.nodeStatus === "quarantined";

                const circleFill = isCollapsedBranch
                  ? node.nodeStatus === "quarantined"
                    ? "var(--accent)"
                    : "var(--primary)"
                  : "var(--surface-elevated)";

                const circleStroke =
                  node.nodeStatus === "quarantined"
                    ? "var(--accent)"
                    : "var(--primary)";

                const maxLabelChars = d.children ? 34 : 48;
                const displayLabel = truncateSvgLabel(node.label, maxLabelChars);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${cx},${cy})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label}${node.badge ? ` (${node.badge})` : ""}${
                      isCollapsedBranch
                        ? ` — collapsed branch with ${node._collapsedCount} items, press Enter to expand`
                        : node._hasChildren
                          ? " — expanded branch, press Enter to collapse"
                          : ""
                    }`}
                    onClick={() => {
                      const raw = allNodesById.get(node.id);
                      if (raw) toggleNodeByRaw(raw);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const raw = allNodesById.get(node.id);
                        if (raw) toggleNodeByRaw(raw);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {/* Selection Halo */}
                    {isSelected && (
                      <circle
                        r={11}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth={1.5}
                        strokeOpacity={0.45}
                      />
                    )}

                    {/* OSINT-Framework Node Circle */}
                    <circle
                      r={6.5}
                      fill={circleFill}
                      stroke={circleStroke}
                      strokeWidth={2}
                      strokeDasharray={isDashed ? "2.5 2" : undefined}
                    />

                    {/* Node Label + Status Badge */}
                    <text
                      x={13}
                      dy="0.32em"
                      fill="var(--foreground)"
                      className={cn(
                        "text-[12px]",
                        isSelected ? "font-bold" : "font-medium",
                      )}
                    >
                      <title>{node.label}</title>
                      {displayLabel}
                      {isCollapsedBranch ? ` [+${node._collapsedCount}]` : ""}
                      {node.href && !node._hasChildren ? " ↗" : ""}
                    </text>

                    {node.badge && !d.children && (
                      <text
                        x={13}
                        dy="1.55em"
                        fill={
                          node.nodeStatus === "quarantined"
                            ? "var(--accent)"
                            : "var(--muted-foreground)"
                        }
                        className="font-mono text-[10px]"
                      >
                        [{node.badge}]
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background p-4">
          <ul className="space-y-2">
            <AccessibleOutlineBranch
              node={fullTree}
              selectedId={selectedNode.id}
              expandedIds={activeExpandedSet}
              onToggleNode={toggleNodeByRaw}
            />
          </ul>
        </div>
      )}

      {/* Selected Node Inspector Drawer */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed">
        <div className="max-w-3xl space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{selectedNode.label}</span>
            {selectedNode.badge && (
              <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {selectedNode.badge}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            <LexiconText text={selectedNode.description} />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedNode.href && (
            <Link
              href={selectedNode.href}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90"
            >
              <span>Open Reference Page</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          {compact && (
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-3 py-1.5 font-semibold text-foreground hover:bg-muted"
            >
              <span>Open Full-Screen Tree (/explore)</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
