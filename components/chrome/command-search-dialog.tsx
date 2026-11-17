"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { BookOpen, Clock, FileText, Search, Sparkles, X } from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import {
  executeExplainableSearch,
  type SearchEngineCatalog,
} from "@/lib/corpus/search-engine";
import type { SearchableItem } from "@/lib/corpus/types";

export function CommandSearchDialog({
  catalog,
}: {
  catalog: SearchEngineCatalog;
}) {
  const router = useRouter();
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery } =
    useResearchContext();

  const matches = useMemo(
    () => executeExplainableSearch(searchQuery, catalog),
    [searchQuery, catalog],
  );

  if (!searchOpen) return null;

  const groups: SearchableItem["group"][] = [
    "Verbatim 38 C.F.R. & VASRD Hubs",
    "Playbooks, Treatises & Checklists",
    "Lexicon, Crosswalk & Era Lenses",
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search authorities, diagnostic codes, statutes, forms, and guides"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSearchOpen(false);
      }}
    >
      <Command
        shouldFilter={false}
        label="Unified Deterministic & Explainable Search"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setSearchOpen(false);
          }
        }}
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface-elevated text-foreground shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Command.Input
            autoFocus
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Try DC 5313, former 38 U.S.C. § 3010, § 4.56, VA Form 10-7131, or shrapnel scar..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 bg-surface px-3.5 py-1.5 text-[11px]">
          <span className="font-semibold text-muted-foreground">Try lookup:</span>
          {[
            "5313",
            "former 38 U.S.C. § 3010",
            "38 C.F.R. § 3.156(c)",
            "10-7131",
            "7399-7346",
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setSearchQuery(sample)}
              className="rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono text-foreground hover:bg-muted"
            >
              {sample}
            </button>
          ))}
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          {matches.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No matching Diagnostic Code, statutory crosswalk section, form, or guide
              found for <span className="font-mono font-semibold">{searchQuery}</span>.
            </div>
          ) : (
            groups.map((groupName) => {
              const groupMatches = matches.filter((m) => m.item.group === groupName);
              if (groupMatches.length === 0) return null;

              return (
                <Command.Group
                  key={groupName}
                  heading={groupName}
                  className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {groupMatches.map(({ item, matchKind, matchReason }) => (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        setSearchOpen(false);
                        router.push(item.href);
                      }}
                      className="flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-sm aria-selected:bg-muted"
                    >
                      {groupName === "Lexicon, Crosswalk & Era Lenses" ? (
                        <Clock
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      ) : groupName === "Verbatim 38 C.F.R. & VASRD Hubs" ? (
                        <FileText
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      ) : (
                        <BookOpen
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="truncate font-medium text-foreground">
                          {item.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </div>
                        <div className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                          {matchKind !== "keyword" && (
                            <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                          )}
                          <span>{matchReason}</span>
                        </div>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })
          )}
        </Command.List>
      </Command>
    </div>
  );
}
