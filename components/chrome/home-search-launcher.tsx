"use client";

import { Search } from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";

const HERO_QUERY_CHIPS: ReadonlyArray<{ label: string; query: string }> = [
  { label: "DC 5313 (Hamstrings)", query: "5313" },
  { label: "former 38 U.S.C. § 3010", query: "former 38 U.S.C. § 3010" },
  { label: "38 C.F.R. § 3.156(c)", query: "38 C.F.R. § 3.156(c)" },
  { label: "VA Form 10-7131", query: "10-7131" },
  { label: "Analogous 7399-7346", query: "7399-7346" },
];

export function HomeSearchLauncher() {
  const { openSearchWithQuery } = useResearchContext();

  return (
    <div className="max-w-3xl space-y-2.5 pt-1">
      <button
        type="button"
        onClick={() => openSearchWithQuery("")}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-left text-sm text-muted-foreground shadow-2xs transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="inline-flex items-center gap-2.5 truncate">
          <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Search Diagnostic Codes (5313, 7804), 38 C.F.R. / former U.S.C., forms
            (8-526, 10-7131), or symptoms…
          </span>
        </span>
        <kbd className="shrink-0 rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-medium text-muted-foreground">Instant lookup:</span>
        {HERO_QUERY_CHIPS.map((chip) => (
          <button
            key={chip.query}
            type="button"
            onClick={() => openSearchWithQuery(chip.query)}
            className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
