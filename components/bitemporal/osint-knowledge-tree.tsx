"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { hierarchy, tree } from "d3-hierarchy";
import { useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderTree,
  ListTree,
  Maximize2,
  Minimize2,
  Search,
  X,
} from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import {
  buildKnowledgeTree,
  flattenKnowledgeTree,
  type BrowseCorpusCatalog,
  type BrowseResourceKind,
  type KnowledgeTreeNode,
} from "@/lib/corpus/knowledge-tree";
import { cn } from "@/lib/utils";
import { LexiconText } from "./lexicon-text";

interface FilteredTreeNode extends KnowledgeTreeNode {
  _hasChildren: boolean;
  _collapsedCount: number;
  children?: FilteredTreeNode[];
}

function collectBranchAndSubBranchIds(branch: KnowledgeTreeNode): string[] {
  const ids: string[] = [branch.id];
  for (const sub of branch.children ?? []) {
    if (sub.children && sub.children.length > 0) {
      ids.push(sub.id);
    }
  }
  return ids;
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

function filterTreeByQuery(
  node: KnowledgeTreeNode,
  rawQuery: string,
): KnowledgeTreeNode | null {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return node;

  const selfMatches = [
    node.label,
    node.shortLabel ?? "",
    node.description,
    node.badge ?? "",
    node.resourceKind ?? "",
    node.edgeRelation ?? "",
    node.href ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);

  const filteredChildren = (node.children ?? [])
    .map((child) => filterTreeByQuery(child, rawQuery))
    .filter((c): c is KnowledgeTreeNode => c !== null);

  if (selfMatches) {
    return {
      ...node,
      children: filteredChildren.length > 0 ? filteredChildren : node.children,
    };
  }

  if (filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
    };
  }

  return null;
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
  { label: "Scars Post-2008 (2012-06-01)", date: "2012-06-01" },
];

const RESOURCE_KIND_STYLES: Record<BrowseResourceKind, string> = {
  Guide: "border-border bg-surface text-foreground",
  Regulation: "border-primary/40 bg-surface text-primary",
  Checklist: "border-border bg-surface text-foreground",
  Case: "border-border bg-surface text-foreground",
  Tool: "border-accent/60 bg-surface text-foreground",
};

function DirectoryDestinationRow({
  node,
  onSelect,
}: {
  node: KnowledgeTreeNode;
  onSelect: (node: KnowledgeTreeNode) => void;
}) {
  const isQuarantined = node.nodeStatus === "quarantined";
  const isSummary = node.nodeStatus === "summary";

  return (
    <li
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border px-3.5 py-3 text-sm transition-colors sm:flex-row sm:items-start sm:justify-between",
        isQuarantined
          ? "quarantine-stripe border-accent/60 bg-surface"
          : "border-border/80 bg-background hover:border-primary/50",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {node.resourceKind && (
            <span
              className={cn(
                "rounded border px-2 py-0.5 font-mono text-xs font-semibold",
                RESOURCE_KIND_STYLES[node.resourceKind],
              )}
            >
              {node.resourceKind}
            </span>
          )}

          {node.href ? (
            <Link
              href={node.href}
              prefetch={node.href === "/investigate" ? false : undefined}
              onClick={() => onSelect(node)}
              className="font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {node.label}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">{node.label}</span>
          )}

          {node.badge && (
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-xs",
                isQuarantined
                  ? "border-accent/60 bg-surface font-semibold text-accent"
                  : isSummary
                    ? "border-border bg-surface font-medium text-muted-foreground"
                    : "border-border bg-surface text-muted-foreground",
              )}
            >
              {node.badge}
            </span>
          )}

          {node.edgeRelation && (
            <span className="rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {node.edgeRelation}
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          <LexiconText text={node.description} />
        </p>
      </div>

      {node.href && (
        <Link
          href={node.href}
          prefetch={node.href === "/investigate" ? false : undefined}
          onClick={() => onSelect(node)}
          className="inline-flex min-h-7 shrink-0 items-center gap-1 self-start rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span>Open</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </li>
  );
}

function DirectorySubGroup({
  node,
  expandedIds,
  onToggleSubBranch,
  onSelectLeaf,
}: {
  node: KnowledgeTreeNode;
  expandedIds: ReadonlySet<string>;
  onToggleSubBranch: (node: KnowledgeTreeNode) => void;
  onSelectLeaf: (node: KnowledgeTreeNode) => void;
}) {
  const children = node.children ?? [];
  if (children.length === 0) {
    return <DirectoryDestinationRow node={node} onSelect={onSelectLeaf} />;
  }

  const isExpanded = expandedIds.has(node.id);

  return (
    <li className="space-y-2 rounded-lg border border-border/80 bg-surface p-3">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => onToggleSubBranch(node)}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="flex min-w-0 items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          )}
          <span className="font-serif text-base font-bold text-foreground">
            {node.label}
          </span>
        </div>
        {node.badge && (
          <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {node.badge}
          </span>
        )}
      </button>

      <p className="pl-6 text-xs leading-relaxed text-muted-foreground">
        <LexiconText text={node.description} />
      </p>

      {isExpanded && (
        <ul className="space-y-2 pt-1 sm:pl-6">
          {children.map((leaf) => (
            <DirectoryDestinationRow
              key={leaf.id}
              node={leaf}
              onSelect={onSelectLeaf}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OsintKnowledgeTree({
  defaultDate,
  catalog,
  compact = false,
}: {
  defaultDate: string;
  catalog: BrowseCorpusCatalog;
  compact?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { audienceMode, decisionDate, setDecisionDate } = useResearchContext();

  const effectiveDate = decisionDate ?? defaultDate;

  const fullTree = useMemo(
    () => buildKnowledgeTree(audienceMode, effectiveDate, catalog),
    [audienceMode, effectiveDate, catalog],
  );

  const allNodesById = useMemo(() => {
    const map = new Map<string, KnowledgeTreeNode>();
    for (const n of flattenKnowledgeTree(fullTree)) {
      map.set(n.id, n);
    }
    return map;
  }, [fullTree]);

  const allBranchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const n of allNodesById.values()) {
      if (n.children && n.children.length > 0) {
        ids.add(n.id);
      }
    }
    return ids;
  }, [allNodesById]);

  // Directory is the default presentation mode on /explore
  const [viewMode, setViewMode] = useState<"directory" | "map">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const firstBranch = fullTree.children?.[0];
    const seed = new Set<string>([fullTree.id]);
    if (firstBranch) {
      for (const id of collectBranchAndSubBranchIds(firstBranch)) {
        seed.add(id);
      }
    }
    return seed;
  });
  const [selectedId, setSelectedId] = useState<string>(fullTree.id);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Synchronize deep-linked #anchor hash (e.g., /explore#survivor-benefits) to expand that branch
  useEffect(() => {
    function syncAnchorFromHash() {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace(/^#/, "").trim();
      if (!hash) return;
      const matchedBranch = (fullTree.children ?? []).find(
        (b) => b.anchorId === hash || b.id === hash,
      );
      if (matchedBranch) {
        const next = new Set<string>([fullTree.id]);
        for (const id of collectBranchAndSubBranchIds(matchedBranch)) {
          next.add(id);
        }
        setExpandedIds(next);
        setSelectedId(matchedBranch.id);
      }
    }
    syncAnchorFromHash();
    window.addEventListener("hashchange", syncAnchorFromHash);
    return () => window.removeEventListener("hashchange", syncAnchorFromHash);
  }, [fullTree]);

  const filteredTree = useMemo(
    () => filterTreeByQuery(fullTree, searchQuery),
    [fullTree, searchQuery],
  );

  const effectiveExpandedIds = useMemo(() => {
    if (searchQuery.trim().length > 0 && filteredTree) {
      const allFilteredIds = new Set<string>();
      for (const n of flattenKnowledgeTree(filteredTree)) {
        if (n.children && n.children.length > 0) {
          allFilteredIds.add(n.id);
        }
      }
      return allFilteredIds;
    }
    return expandedIds;
  }, [searchQuery, filteredTree, expandedIds]);

  const isAllExpanded = useMemo(() => {
    if (allBranchIds.size === 0) return false;
    for (const id of allBranchIds) {
      if (!effectiveExpandedIds.has(id)) return false;
    }
    return true;
  }, [allBranchIds, effectiveExpandedIds]);

  const selectedNode = allNodesById.get(selectedId) ?? fullTree;

  // One top-level branch at a time in Directory mode unless Expand All was clicked
  function handleToggleTopBranch(branch: KnowledgeTreeNode) {
    setSelectedId(branch.id);
    setExpandedIds((prev) => {
      if (prev.has(branch.id)) {
        const next = new Set(prev);
        next.delete(branch.id);
        return next;
      }
      // Expand this top-level branch and its sub-groups while collapsing sibling top-level folders
      const next = new Set<string>([fullTree.id]);
      for (const id of collectBranchAndSubBranchIds(branch)) {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleNodeGeneric(node: KnowledgeTreeNode) {
    setSelectedId(node.id);
    if (!node.children || node.children.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }

  function toggleExpandCollapseAll() {
    if (isAllExpanded) {
      setExpandedIds(new Set([fullTree.id]));
    } else {
      setExpandedIds(new Set(allBranchIds));
    }
  }

  // Deterministic horizontal tree layout using short <=4-word labels at top two levels + semantic edge space
  const layout = useMemo(() => {
    const activeRoot = filteredTree ?? fullTree;
    const pruned = pruneCollapsedTree(activeRoot, effectiveExpandedIds);
    const root = hierarchy<FilteredTreeNode>(pruned);
    const dy = compact ? 44 : 48;
    const dx = compact ? 300 : 340;
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
    const padLeft = 24;
    const padRight = 280;
    const height = Math.max(240, maxX - minX + padTop + padBottom);
    const width = Math.max(680, maxY + padLeft + padRight);
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
  }, [filteredTree, fullTree, effectiveExpandedIds, compact]);

  const visibleTopBranches = filteredTree?.children ?? [];

  return (
    <section
      aria-label="Browse topics directory and interactive map"
      className="space-y-4 rounded-xl border border-border bg-surface-elevated p-4 shadow-2xs sm:p-5"
    >
      {/* Controls Bar: Search + Directory/Map Toggle + Expand/Collapse */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="browse-directory-search" className="sr-only">
            Filter topics, guides, diagnostic codes, or regulations
          </label>
          <Search
            className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="browse-directory-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter topics, guides, codes, or regulations…"
            className="min-h-9 w-full rounded-md border border-border bg-background py-1.5 pr-8 pl-9 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear topic filter"
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
            aria-label="Browse presentation mode"
            className="inline-flex rounded-md border border-border bg-surface p-0.5"
          >
            <button
              type="button"
              aria-pressed={viewMode === "directory"}
              onClick={() => setViewMode("directory")}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded px-3 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                viewMode === "directory"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Directory</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "map"}
              onClick={() => setViewMode("map")}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded px-3 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                viewMode === "map"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Map</span>
            </button>
          </div>

          <button
            type="button"
            aria-pressed={isAllExpanded}
            onClick={toggleExpandCollapseAll}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-3 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
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
        </div>
      </div>

      {/* Quick Decision-Date Preset Strip */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Show the law as of:</span>
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
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          Active date: <strong className="text-foreground">{effectiveDate}</strong>
        </span>
      </div>

      {/* Primary View: Collapsible Folder Directory OR Secondary Short-Label Map */}
      {viewMode === "directory" ? (
        filteredTree === null ? (
          <div className="rounded-lg border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            No topics or guides matched <strong>&ldquo;{searchQuery}&rdquo;</strong>.{" "}
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="font-semibold text-primary underline underline-offset-2"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleTopBranches.map((branch) => {
              const isExpanded = effectiveExpandedIds.has(branch.id);
              return (
                <section
                  key={branch.id}
                  id={branch.anchorId ?? branch.id}
                  aria-labelledby={`heading-${branch.id}`}
                  className={cn(
                    "scroll-mt-36 rounded-xl border transition-colors",
                    isExpanded
                      ? "border-primary/50 bg-background shadow-2xs"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <div className="p-4">
                    <h2
                      id={`heading-${branch.id}`}
                      className="font-serif text-lg font-bold text-foreground sm:text-xl"
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => handleToggleTopBranch(branch)}
                        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {branch.illustrationSrc ? (
                            <span className="hidden shrink-0 overflow-hidden rounded-lg border border-border/80 bg-surface sm:block">
                              <Image
                                src={branch.illustrationSrc}
                                alt=""
                                width={52}
                                height={52}
                                unoptimized
                                className="h-13 w-13 object-cover"
                              />
                            </span>
                          ) : isExpanded ? (
                            <FolderOpen
                              className="h-5 w-5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : (
                            <Folder
                              className="h-5 w-5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          )}
                          <span>{branch.label}</span>
                        </span>

                        <span className="flex shrink-0 items-center gap-2 font-sans text-xs font-normal">
                          {branch.badge && (
                            <span className="hidden rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs text-muted-foreground md:inline-block">
                              {branch.badge}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown
                              className="h-5 w-5 text-primary"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronRight
                              className="h-5 w-5 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </button>
                    </h2>

                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:pl-8">
                      <LexiconText text={branch.description} />
                    </p>
                  </div>

                  {isExpanded && branch.children && branch.children.length > 0 && (
                    <div className="border-t border-border px-4 pt-3 pb-4">
                      <ul className="space-y-3">
                        {branch.children.map((sub) => (
                          <DirectorySubGroup
                            key={sub.id}
                            node={sub}
                            expandedIds={effectiveExpandedIds}
                            onToggleSubBranch={handleToggleNodeGeneric}
                            onSelectLeaf={(leaf) => setSelectedId(leaf.id)}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {/* Semantic Edge Relationship Legend */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-surface px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              Relationship edges:
            </span>
            {(
              ["pierces finality", "amends", "interprets", "limits"] as const
            ).map((rel) => (
              <span
                key={rel}
                className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs text-foreground"
              >
                {rel}
              </span>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              Click or press Enter on any branch node to expand/collapse
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-background p-2">
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="group"
              aria-label={fullTree.label}
              className="block min-w-[680px] select-none"
            >
              <g fill="none">
                {layout.links.map((lnk) => {
                  const sx = lnk.source.y + layout.offsetX;
                  const sy = lnk.source.x + layout.offsetY;
                  const tx = lnk.target.y + layout.offsetX;
                  const ty = lnk.target.x + layout.offsetY;
                  const midX = (sx + tx) / 2;
                  const dPath = `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`;
                  const targetStatus = lnk.target.data.nodeStatus;
                  const edgeRel = lnk.target.data.edgeRelation;
                  const isDashed =
                    targetStatus === "quarantined" || edgeRel === "limits";
                  const pillWidth = edgeRel
                    ? Math.max(64, Math.round(edgeRel.length * 7.4 + 14))
                    : 0;
                  const pillCenterX = tx - pillWidth / 2 - 12;

                  return (
                    <g key={`${lnk.source.data.id}->${lnk.target.data.id}`}>
                      <path
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
                      {edgeRel && (
                        <g aria-hidden="true">
                          <rect
                            x={pillCenterX - pillWidth / 2}
                            y={ty - 10}
                            width={pillWidth}
                            height={20}
                            rx={4}
                            fill="var(--surface)"
                            stroke="var(--border)"
                            strokeWidth={1}
                          />
                          <text
                            x={pillCenterX}
                            y={ty}
                            dy="0.34em"
                            textAnchor="middle"
                            fill="var(--muted-foreground)"
                            className="font-mono text-xs"
                          >
                            {edgeRel}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              <g>
                {layout.nodes.map((d) => {
                  const cx = d.y + layout.offsetX;
                  const cy = d.x + layout.offsetY;
                  const node = d.data;
                  const isCollapsedBranch = node._collapsedCount > 0;
                  const isSelected = selectedNode.id === node.id;
                  const isFocused = focusedNodeId === node.id;
                  const isDashed = node.nodeStatus === "quarantined";

                  const circleFill = isCollapsedBranch
                    ? node.nodeStatus === "quarantined"
                      ? "var(--accent)"
                      : "var(--primary)"
                    : "var(--surface-elevated)";

                  const circleStroke =
                    node.nodeStatus === "quarantined"
                      ? "var(--accent)"
                      : "var(--primary)";

                  // Top two levels (depth <= 2) always use concise <= 4-word shortLabel
                  const rawLabel =
                    d.depth <= 2 ? (node.shortLabel ?? node.label) : node.label;
                  const displayLabel = truncateSvgLabel(
                    rawLabel,
                    d.depth <= 2 ? 24 : 38,
                  );

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${cx},${cy})`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${node.label}${node.edgeRelation ? ` [${node.edgeRelation}]` : ""}${node.badge ? ` (${node.badge})` : ""}${
                        isCollapsedBranch
                          ? ` — collapsed branch with ${node._collapsedCount} items, press Enter to expand`
                          : node._hasChildren
                            ? " — expanded branch, press Enter to collapse"
                            : ""
                      }`}
                      onFocus={() => setFocusedNodeId(node.id)}
                      onBlur={() =>
                        setFocusedNodeId((prev) => (prev === node.id ? null : prev))
                      }
                      onClick={() => {
                        const raw = allNodesById.get(node.id);
                        if (raw) handleToggleNodeGeneric(raw);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const raw = allNodesById.get(node.id);
                          if (raw) handleToggleNodeGeneric(raw);
                        }
                      }}
                      className="cursor-pointer focus:outline-none"
                    >
                      {isFocused && (
                        <circle
                          data-testid={`map-focus-ring-${node.id}`}
                          r={13.5}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          strokeDasharray="3 2"
                        />
                      )}

                      {isSelected && (
                        <circle
                          r={11}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth={1.5}
                          strokeOpacity={0.45}
                        />
                      )}

                      <circle
                        r={6.5}
                        fill={circleFill}
                        stroke={circleStroke}
                        strokeWidth={2}
                        strokeDasharray={isDashed ? "2.5 2" : undefined}
                      />

                      <text
                        x={13}
                        dy="0.32em"
                        fill="var(--foreground)"
                        className={cn(
                          "text-xs",
                          isSelected ? "font-bold" : "font-medium",
                        )}
                      >
                        <title>{node.label}</title>
                        {displayLabel}
                        {isCollapsedBranch ? ` [+${node._collapsedCount}]` : ""}
                        {node.href && !node._hasChildren ? " ↗" : ""}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Selected Node Inspector Drawer (Shows Full Title, Semantic Relation & Description on Selection in Map Mode) */}
          <div
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
          >
            <div className="max-w-3xl space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {selectedNode.resourceKind && (
                  <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {selectedNode.resourceKind}
                  </span>
                )}
                <span className="font-semibold text-foreground">
                  {selectedNode.label}
                </span>
                {selectedNode.badge && (
                  <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {selectedNode.badge}
                  </span>
                )}
                {selectedNode.edgeRelation && (
                  <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {selectedNode.edgeRelation}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                <LexiconText text={selectedNode.description} />
              </p>
            </div>

            {selectedNode.href && (
              <Link
                href={selectedNode.href}
                prefetch={selectedNode.href === "/investigate" ? false : undefined}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span>Open Reference Page</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
