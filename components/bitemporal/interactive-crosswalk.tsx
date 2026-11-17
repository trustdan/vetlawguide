"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import type { StatutoryCrosswalkEntry } from "@/lib/corpus/types";
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

const SAMPLE_FILTERS: ReadonlyArray<{ label: string; query: string }> = [
  { label: "§ 3010 → § 5110 (Effective Dates)", query: "3010" },
  { label: "§ 310 → § 1110 (Wartime Comp.)", query: "310" },
  { label: "§ 4004 → § 7104 (Board Jurisdiction)", query: "4004" },
  { label: "Vet. Reg. No. 1(a)", query: "Vet. Reg." },
  { label: "§ 211(a) → § 511(a)", query: "211" },
];

export function InteractiveCrosswalk({
  rows,
}: {
  rows: StatutoryCrosswalkEntry[];
}) {
  const urlQuery = useSyncExternalStore(
    subscribeLocationSearch,
    getClientQueryParam,
    getServerQueryParam,
  );
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const activeQuery = userQuery ?? urlQuery ?? "";
  const normalized = activeQuery.trim().toLowerCase();

  const filtered = normalized
    ? rows.filter((r) => {
        const hay = `${r.subject} ${r.eraAAuthority} ${r.eraBSection} ${r.eraCSection} ${r.notes}`.toLowerCase();
        return hay.includes(normalized);
      })
    : rows;

  return (
    <div className="space-y-6">
      {/* Split-Date 1991 Codification & Savings Clause Callout */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed">
          <div className="font-mono font-bold text-primary">
            1991 Split-Date Trap (91-Day Window: May 7 vs. Aug. 6, 1991)
          </div>
          <p data-persona="veteran-only" className="mt-1.5 text-muted-foreground">
            <LexiconText text="Congress renumbered claims, effective-date, and appeal laws on May 7, 1991 (Pub. L. 102-40, turning § 3010 into § 5110 and § 4004 into § 7104), and then renumbered disability and survivor benefit chapters three months later on August 6, 1991 (Pub. L. 102-83, turning § 310 into § 1110 and § 410 into § 1310). A June or July 1991 VA or COVA decision legitimately mixes § 5110 / § 7104 with old § 310 / § 314 numbers." />
          </p>
          <p data-persona="practitioner-only" className="mt-1.5 text-muted-foreground">
            <code className="font-mono">Pub. L. 102-40, § 402</code> (105 Stat. 187,
            238, May 7, 1991) renumbered Parts IV–VI (
            <code className="font-mono">Chapters 51–85</code>:{" "}
            <code className="font-mono">§ 3010 → § 5110</code>,{" "}
            <code className="font-mono">§ 3404 → § 5904</code>,{" "}
            <code className="font-mono">§ 4004 → § 7104</code>);{" "}
            <code className="font-mono">Pub. L. 102-83, §§ 2, 4, 5</code> (105 Stat.
            378, 406, Aug. 6, 1991) restated/renumbered Parts I–III (
            <code className="font-mono">Chapters 1–42</code>:{" "}
            <code className="font-mono">§ 211(a) → § 511</code>,{" "}
            <code className="font-mono">§ 310 → § 1110</code>,{" "}
            <code className="font-mono">§ 314 → § 1114</code>). Decisions between May 7
            and Aug. 5, 1991 properly pair Era C Ch. 51/71 cites with Era B Ch. 11/13
            cites.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed">
          <div className="font-mono font-bold text-primary">
            1959 Savings Clauses &amp; Full Doctrine Reference
          </div>
          <p className="mt-1.5 text-muted-foreground">
            <code className="font-mono">Pub. L. 85-857</code> §§ 10–11 (eff. Jan. 1,
            1959) and <code className="font-mono">38 C.F.R. § 3.953</code> shield awards
            in force on Dec. 31, 1958 unless clear and unmistakable error is shown under
            the pre-1959 Veterans&apos; Regulation text.
          </p>
          <Link
            href="/docs/title-38-statutory-crosswalk"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <span>Read the statutory crosswalk treatise</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Live Search & Quick Filter Bar */}
      <div className="space-y-3 rounded-lg border border-border bg-surface-elevated p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="crosswalk-filter-input" className="sr-only">
            Filter Title 38 statutory crosswalk by section number, Veterans Regulation, or subject
          </label>
          <div className="relative flex-1 min-w-[240px]">
            <Search
              className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="crosswalk-filter-input"
              type="search"
              value={activeQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Filter by old/modern section (310, 3010, 5110, 7111), Vet. Reg. No. 1(a), or topic…"
              className="w-full rounded-md border border-border bg-background py-2 pr-8 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
            {activeQuery && (
              <button
                type="button"
                aria-label="Clear crosswalk filter"
                onClick={() => setUserQuery("")}
                className="absolute top-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length} statutory mappings
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground">Quick lookup:</span>
          {SAMPLE_FILTERS.map((chip) => (
            <button
              key={chip.query}
              type="button"
              onClick={() => setUserQuery(chip.query)}
              className="inline-flex min-h-6 items-center rounded border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground hover:bg-muted"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Full Three-Era Crosswalk Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full text-left text-xs leading-relaxed">
          <thead className="border-b border-border bg-surface text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Subject / Doctrine
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Era A (1933–1958 Vet. Regs.)
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Era B (1959–1991 Pub. L. 85-857)
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Era C (1991–Present)
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Transition &amp; Practice Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No statutory crosswalk rows matched &ldquo;{activeQuery}&rdquo;. Try a
                  3- or 4-digit section number (such as 310, 3010, or 5110).
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={`${row.eraCSection}-${idx}`} className="align-top">
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {row.subject}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">
                    {row.eraAAuthority}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground">
                    {row.eraBSection}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                    {row.eraCSection}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {row.notes ? <LexiconText text={row.notes} /> : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
