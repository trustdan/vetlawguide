"use client";

import { Search } from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";

const HERO_QUERY_CHIPS: ReadonlyArray<{ label: string; query: string }> = [
  { label: "DC 5313 (Hamstrings)", query: "5313" },
  { label: "former 38 U.S.C. § 3010", query: "former 38 U.S.C. § 3010" },
  { label: "38 C.F.R. § 3.156(c)", query: "38 C.F.R. § 3.156(c)" },
  { label: "VA Form 10-7131", query: "10-7131" },
];

export function HomeSearchLauncher() {
  const { openSearchWithQuery } = useResearchContext();

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => openSearchWithQuery("")}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3.5 py-2.5 text-left text-sm text-muted-foreground shadow-2xs transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary sm:px-4 sm:py-3"
        >
          <span className="inline-flex min-w-0 items-center gap-2.5 truncate">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">
              Search codes (5313, 7804), 38 C.F.R., old statutes (§ 3010), or forms…
            </span>
          </span>
          <kbd className="hidden shrink-0 rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-foreground sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Single bronze/ochre primary CTA on the home page */}
        <button
          type="button"
          onClick={() => openSearchWithQuery("")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-2xs transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>Search</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Try:</span>
        {HERO_QUERY_CHIPS.map((chip) => (
          <button
            key={chip.query}
            type="button"
            onClick={() => openSearchWithQuery(chip.query)}
            className="rounded-md border border-border bg-surface px-2.5 py-0.5 font-mono text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
