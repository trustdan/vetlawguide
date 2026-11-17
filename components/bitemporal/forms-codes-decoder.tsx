"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Search, X } from "lucide-react";
import { CANONICAL_VASRD_SYSTEMS, type LexiconEntry } from "@/lib/corpus/types";
import { LexiconText } from "./lexicon-text";

function subscribeLocationSearch(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getClientQueryParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  return q ? q.trim().slice(0, 64) : null;
}

function getServerQueryParam(): string | null {
  return null;
}

function parseDcRangeBounds(rangeStr: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const m of rangeStr.matchAll(/(\d{4})\s*[-–]\s*(\d{4})/g)) {
    const lo = Number.parseInt(m[1]!, 10);
    const hi = Number.parseInt(m[2]!, 10);
    if (lo <= hi) out.push([lo, hi]);
  }
  return out;
}

function decodeAnalogousCode(rawInput: string): {
  valid: boolean;
  prefixCode: string;
  criteriaCode: string;
  systemLabel: string;
  explanation: string;
} | null {
  const cleaned = rawInput.trim();
  if (!cleaned) return null;
  const m = /^(\d{2}99)\s*[-–.]\s*(\d{4})$/.exec(cleaned);
  if (!m) {
    return {
      valid: false,
      prefixCode: "",
      criteriaCode: "",
      systemLabel: "",
      explanation:
        "Enter an 8-digit hyphenated analogous code ending in 99 before the hyphen (for example: 7399-7346, 5399-5313, or 8599-8520).",
    };
  }

  const prefixCode = m[1]!;
  const criteriaCode = m[2]!;
  const criteriaNum = Number.parseInt(criteriaCode, 10);

  let matchedSystem = "Title 38 Part 4 Schedule for Rating Disabilities";
  for (const sys of CANONICAL_VASRD_SYSTEMS) {
    for (const [lo, hi] of parseDcRangeBounds(sys.diagnosticCodeRange)) {
      if (criteriaNum >= lo && criteriaNum <= hi) {
        matchedSystem = sys.label;
        break;
      }
    }
  }

  return {
    valid: true,
    prefixCode,
    criteriaCode,
    systemLabel: matchedSystem,
    explanation: `Under 38 C.F.R. §§ 4.20 & 4.27, "${prefixCode}" indicates an unlisted condition rated by analogy within that anatomical group, and "${criteriaCode}" identifies the exact Diagnostic Code rating formula VA borrowed (${matchedSystem}).`,
  };
}

export function FormsCodesDecoder({ entries }: { entries: LexiconEntry[] }) {
  const urlQuery = useSyncExternalStore(
    subscribeLocationSearch,
    getClientQueryParam,
    getServerQueryParam,
  );
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<
    "all" | "form" | "acronym" | "codesheet"
  >("all");
  const [analogousInput, setAnalogousInput] = useState("7399-7346");

  const activeQuery = userQuery ?? urlQuery ?? "";
  const normalized = activeQuery.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    if (kindFilter !== "all" && entry.kind !== kindFilter) return false;
    if (!normalized) return true;
    const hay = `${entry.key} ${entry.label} ${entry.plainEnglish} ${entry.practitionerNote}`.toLowerCase();
    return hay.includes(normalized);
  });

  const decodedAnalogous = decodeAnalogousCode(analogousInput);

  return (
    <div className="space-y-8">
      {/* Interactive Analogous Code (xx99-xxxx) & Pre-2015 Informal Claim Callout */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="analogous-decoder-heading"
          className="space-y-3 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
        >
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="analogous-decoder-heading" className="text-sm font-bold">
              Hyphenated Analogous Code Decoder (<code className="font-mono">xx99-xxxx</code>)
            </h2>
          </div>
          <p className="text-muted-foreground">
            Decode two-part Rating Code Sheet numbers under{" "}
            <code className="font-mono">38 C.F.R. §§ 4.20 &amp; 4.27</code>:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="analogous-code-input" className="sr-only">
              Hyphenated analogous diagnostic code
            </label>
            <input
              id="analogous-code-input"
              type="text"
              value={analogousInput}
              onChange={(e) => setAnalogousInput(e.target.value)}
              placeholder="e.g., 7399-7346"
              className="w-44 rounded border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
            {["7399-7346", "5399-5313", "7899-7804"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAnalogousInput(preset)}
                className="inline-flex min-h-6 items-center rounded border border-border bg-surface-elevated px-2.5 py-1 font-mono text-[11px] text-foreground hover:bg-muted"
              >
                {preset}
              </button>
            ))}
          </div>
          {decodedAnalogous && (
            <div className="rounded border border-border bg-surface-elevated p-3 text-foreground">
              {decodedAnalogous.explanation}
            </div>
          )}
        </section>

        <section
          aria-labelledby="march-2015-cutoff-heading"
          className="space-y-2.5 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
        >
          <h2
            id="march-2015-cutoff-heading"
            className="font-mono text-xs font-bold text-primary"
          >
            March 24, 2015 Informal Claim Cutoff (79 FR 57660)
          </h2>
          <p data-persona="veteran-only" className="text-muted-foreground">
            <LexiconText text="Before March 24, 2015, signed statements (such as VA Form 21-4138) and VA hospital admission reports (VA Form 10-7131) for an already service-connected condition could count as informal claims that stayed open if VA never decided them. On and after March 24, 2015, VA requires standardized forms (VA Form 21-0966 Intent to File / 21-526EZ)." />
          </p>
          <p data-persona="practitioner-only" className="text-muted-foreground">
            <code className="font-mono">79 FR 57660</code> (eff. Mar. 24, 2015) repealed
            former <code className="font-mono">38 C.F.R. §§ 3.155(a) &amp; 3.157(b)</code>{" "}
            prospectively only; pre-cutoff informal claims and hospital reports remain
            governed by <em>Shea v. Wilkie</em>, 926 F.3d 1362 (Fed. Cir. 2019), and{" "}
            <em> Pacheco v. Gibson</em>, 27 Vet. App. 21 (2014) (en banc).
          </p>
          <Link
            href="/docs/forms-and-codesheet-lexicon"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <span>Open Full 3-Column Forms &amp; Code-Sheet Treatise</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>
      </div>

      {/* Filter & Kind Tabs */}
      <div className="space-y-3 rounded-lg border border-border bg-surface-elevated p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <label htmlFor="lexicon-search-input" className="sr-only">
              Search VA forms, military records, and rating code-sheet terms
            </label>
            <Search
              className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="lexicon-search-input"
              type="search"
              value={activeQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Filter forms & terms (8-526, 10-7131, DD 1380, K-1, VASRD, CUE, SOC)…"
              className="w-full rounded-md border border-border bg-background py-2 pr-8 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
            {activeQuery && (
              <button
                type="button"
                aria-label="Clear decoder filter"
                onClick={() => setUserQuery("")}
                className="absolute top-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter lexicon by entry category"
            className="inline-flex flex-wrap rounded-md border border-border bg-surface p-0.5 text-xs"
          >
            {(
              [
                { id: "all", label: `All (${entries.length})` },
                {
                  id: "form",
                  label: `Forms (${entries.filter((e) => e.kind === "form").length})`,
                },
                {
                  id: "acronym",
                  label: `Acronyms (${entries.filter((e) => e.kind === "acronym").length})`,
                },
                {
                  id: "codesheet",
                  label: `Code Sheet (${entries.filter((e) => e.kind === "codesheet").length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={kindFilter === tab.id}
                onClick={() => setKindFilter(tab.id)}
                className={
                  kindFilter === tab.id
                    ? "rounded bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                    : "rounded px-2.5 py-1 font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered Decoder Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No forms, acronyms, or code-sheet notations matched &ldquo;{activeQuery}&rdquo;.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((term) => (
            <article
              key={term.key}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{term.label}</span>
                  <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                    {term.kind}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  <LexiconText text={term.plainEnglish} />
                </p>
              </div>
              <details
                data-persona="veteran-only"
                className="mt-2.5 border-t border-border/70 pt-2"
              >
                <summary className="cursor-pointer py-0.5 font-semibold text-primary hover:underline">
                  Inspect exact legal citation &amp; code-sheet note
                </summary>
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                  {term.practitionerNote}
                </p>
              </details>
              <p
                data-persona="practitioner-only"
                className="mt-2.5 border-t border-border/70 pt-2 font-mono text-[11px] text-muted-foreground"
              >
                {term.practitionerNote}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
