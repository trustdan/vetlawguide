import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { OsintKnowledgeTree } from "@/components/bitemporal/osint-knowledge-tree";
import {
  getCompiledLexicon,
  getCoverageManifest,
  getStatutoryCrosswalk,
} from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: "Explore Pathways Tree, Title 38 Law Map & Crosswalk",
};

export default function ExplorePage() {
  const manifest = getCoverageManifest();
  const crosswalk = getStatutoryCrosswalk();
  const lexicon = getCompiledLexicon();

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1
          data-persona="veteran-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Interactive VA Pathway Explorer, Record Clues &amp; Term Decoder
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Point-in-Time Title 38 Law Tree, Statutory Crosswalk &amp; Code-Sheet Lexicon
        </h1>

        <p
          data-persona="veteran-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          Branch step by step from your situation into concrete military and VA paperwork
          clues, rules in effect on your <strong>Decision Date</strong>, and decoded VA
          acronyms and historical forms.
        </p>
        <p
          data-persona="practitioner-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          Interactive <code className="font-mono text-xs">d3-hierarchy</code> bitemporal
          law graph (paired 1:1 with the Accessible Outline View) morphing live by{" "}
          <strong>Decision Date</strong>, followed by the compiled Three-Era Title 38
          Statutory Crosswalk ({crosswalk.length} rows) and Code-Sheet Lexicon (
          {lexicon.length} entries, checked{" "}
          <span className="font-mono">{manifest.checkedAsOf}</span>).
        </p>
      </header>

      {/* Interactive Dual-Mode & Decision-Date-Reactive OSINT-Framework Tree */}
      <OsintKnowledgeTree defaultDate={manifest.checkedAsOf} />

      <section
        id="crosswalk-heading"
        aria-labelledby="crosswalk-section-title"
        className="scroll-mt-28 space-y-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h2
              id="crosswalk-section-title"
              data-persona="veteran-only"
              className="font-serif text-lg font-semibold"
            >
              Why Old VA Letters Use Different Law Numbers (1933 ↔ 1958 ↔ 1991 Crosswalk)
            </h2>
            <h2
              data-persona="practitioner-only"
              className="font-serif text-lg font-semibold"
            >
              Three-Era Title 38 Statutory Crosswalk (1933 ↔ 1958 ↔ 1991)
            </h2>
          </div>
          <Link
            href="/crosswalk"
            className="inline-flex min-h-6 items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
          >
            <span>Open Full Interactive Crosswalk ({crosswalk.length} Rows)</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <CrossInspectionExpander
          veteranContent={
            <p className="text-xs leading-relaxed text-muted-foreground">
              <LexiconText text="Congress renumbered Veterans laws in 1958 and again in May and August 1991. Use this table when an older WWII, Korea, or Vietnam rating sheet cites Vet. Reg. No. 1(a) or old § 310 / § 355 / § 3010 numbers." />
            </p>
          }
          practitionerContent={
            <p className="text-xs leading-relaxed text-muted-foreground">
              <code className="font-mono">Pub. L. 85-857</code> (eff. Jan. 1, 1959),{" "}
              <code className="font-mono">Pub. L. 102-40, § 402</code> (May 7, 1991, Chs.
              51–85), and <code className="font-mono">Pub. L. 102-83, § 5(a)</code> (Aug.
              6, 1991, Chs. 1–42) bidirectional statutory conversion preview.
            </p>
          }
        />

        <div className="overflow-x-auto rounded-lg border border-border bg-surface-elevated">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Subject / Chapter
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Era A (1933–1958)
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Era B (1959–1991)
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Era C (1991–Present)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {crosswalk.slice(0, 14).map((row, idx) => (
                <tr key={`${row.eraCSection}-${idx}`}>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {row.subject}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {row.eraAAuthority}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {row.eraBSection}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-primary">
                    {row.eraCSection}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="lexicon-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="lexicon-heading"
              data-persona="veteran-only"
              className="font-serif text-lg font-semibold"
            >
              Plain-English Decoder: VA Acronyms, Old Claim Forms &amp; Rating Sheet Codes
            </h2>
            <h2
              data-persona="practitioner-only"
              className="font-serif text-lg font-semibold"
            >
              Decoded VA Acronyms, Legacy Forms &amp; Code-Sheet Shorthand
            </h2>
          </div>
          <Link
            href="/reference/forms-and-codes"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
          >
            <span>Open Interactive Forms &amp; Analogous Code Decoder</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {lexicon.map((term) => (
            <article
              key={term.key}
              className="rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed"
            >
              <div className="font-semibold text-foreground">{term.label}</div>
              <p className="mt-1 text-muted-foreground">
                <LexiconText text={term.plainEnglish} />
              </p>
              <details
                data-persona="veteran-only"
                className="mt-1.5 border-t border-border/70 pt-1.5"
              >
                <summary className="cursor-pointer py-0.5 font-semibold text-primary hover:underline">
                  Inspect exact legal citation &amp; code-sheet note
                </summary>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {term.practitionerNote}
                </p>
              </details>
              <p
                data-persona="practitioner-only"
                className="mt-1.5 border-t border-border/70 pt-1.5 font-mono text-[11px] text-muted-foreground"
              >
                {term.practitionerNote}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
