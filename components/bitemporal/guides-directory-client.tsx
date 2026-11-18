"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckSquare, Search } from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { cn } from "@/lib/utils";
import type { CompiledDocument } from "@/lib/corpus/types";

type GuideFilterTab = "all" | "playbook" | "doctrine" | "checklist";

export function GuidesDirectoryClient({
  playbooks,
  treatises,
  checklists,
}: {
  playbooks: CompiledDocument[];
  treatises: CompiledDocument[];
  checklists: CompiledDocument[];
}) {
  const [activeTab, setActiveTab] = useState<GuideFilterTab>("all");
  const [query, setQuery] = useState("");

  const allItems = useMemo(
    () => [
      ...playbooks.map((d) => ({ doc: d, kind: "playbook" as const, kindLabel: "Guide" })),
      ...checklists.map((d) => ({ doc: d, kind: "checklist" as const, kindLabel: "Checklist" })),
      ...treatises.map((d) => ({ doc: d, kind: "doctrine" as const, kindLabel: "Treatise" })),
    ],
    [playbooks, checklists, treatises],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeTab !== "all" && item.kind !== activeTab) return false;
      if (!q) return true;
      const haystack = [
        item.doc.title,
        item.doc.veteranOverlay?.plain_english_title ?? "",
        item.doc.veteranOverlay?.what_this_means ?? "",
        ...item.doc.cfrCitations,
        ...item.doc.statutes,
        ...item.doc.diagnosticCodes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allItems, activeTab, query]);

  const tabs: ReadonlyArray<{ id: GuideFilterTab; label: string; count: number }> = [
    { id: "all", label: "All guides", count: allItems.length },
    { id: "playbook", label: "Issue guides", count: playbooks.length },
    { id: "checklist", label: "Checklists", count: checklists.length },
    { id: "doctrine", label: "Legal treatises", count: treatises.length },
  ];

  return (
    <section aria-labelledby="guides-catalog-heading" className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter guides by resource type"
          className="flex flex-wrap items-center gap-1.5"
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="guides-filter-input" className="sr-only">
            Filter guides by topic, code, or citation
          </label>
          <input
            id="guides-filter-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by topic or citation…"
            className="w-full rounded-md border border-border bg-background py-1.5 pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <h2 id="guides-catalog-heading" className="font-serif text-xl font-bold text-foreground">
          Showing {filtered.length} {filtered.length === 1 ? "resource" : "resources"}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(({ doc, kindLabel }) => {
          const overlay = doc.veteranOverlay;

          return (
            <article
              key={doc.id}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 text-sm"
            >
              {/* Veteran Mode Presentation */}
              <div data-persona="veteran-only" className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="rounded border border-border bg-surface px-2 py-0.5 font-medium text-foreground">
                    {kindLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {overlay ? "Plain-English ready" : "Reference + tooltips"}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  <Link href={doc.route} className="hover:text-primary hover:underline">
                    {overlay?.plain_english_title ?? doc.title}
                  </Link>
                </h3>
                {overlay ? (
                  <>
                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      <LexiconText text={overlay.what_this_means} />
                    </p>
                    {overlay.questions_for_representative[0] && (
                      <div className="rounded border border-border bg-surface p-2.5 text-xs">
                        <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <CheckSquare
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span>Question to discuss:</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          <LexiconText
                            text={overlay.questions_for_representative[0]}
                          />
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  doc.cFileTriggers[0] && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      <LexiconText text={doc.cFileTriggers[0]} />
                    </p>
                  )
                )}
              </div>

              {/* Practitioner Mode Presentation */}
              <div data-persona="practitioner-only" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <span className="rounded border border-border bg-surface px-2 py-0.5 font-sans font-medium text-foreground">
                    {kindLabel}
                  </span>
                  {doc.diagnosticCodes.length > 0 && (
                    <span className="rounded bg-surface px-2 py-0.5 text-xs text-muted-foreground">
                      DC {doc.diagnosticCodes.slice(0, 3).join(", ")}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  <Link href={doc.route} className="hover:text-primary hover:underline">
                    {doc.title}
                  </Link>
                </h3>
                {doc.cfrCitations.length > 0 && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {doc.cfrCitations.slice(0, 4).join(" · ")}
                  </p>
                )}
                {doc.statutes.length > 0 && (
                  <p className="font-mono text-xs text-muted-foreground">
                    Statutes: {doc.statutes.slice(0, 3).join(" · ")}
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-border/70 pt-3 text-xs">
                <Link
                  href={doc.route}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>
                    {kindLabel === "Checklist" ? "Open checklist" : "Read the guide"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
