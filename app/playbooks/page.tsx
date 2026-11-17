import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckSquare } from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import {
  getCoverageManifest,
  getPlaybookDocuments,
} from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: "Issue-Spotting Playbooks, Plain-English Guides & Pre-Filing Checklists",
};

export default function PlaybooksIndexPage() {
  const manifest = getCoverageManifest();
  const playbooks = getPlaybookDocuments().sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1
          data-persona="veteran-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Step-by-Step Issue Guides &amp; Representative Preparation Checklists
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          All {playbooks.length} Issue-Spotting Playbooks, Treatises &amp; Pre-Filing Gates
        </h1>
        <p
          data-persona="veteran-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          <LexiconText text="Practical guides explaining common historical rating errors across compensation, survivor DIC, Character of Discharge, Special Monthly Compensation (SMC), toxic exposure, and military retiree offsets—plus record clues and questions for an accredited representative." />
        </p>
        <p
          data-persona="practitioner-only"
          className="max-w-3xl text-sm leading-relaxed text-muted-foreground"
        >
          Bookmark <strong>{manifest.activeBookmarkWave}</strong> active (
          {manifest.totals.upstreamModules} verified corpus modules compiled, checked{" "}
          <span className="font-mono">{manifest.checkedAsOf}</span>). Every playbook below
          opens in the 3-column bitemporal reader with C-file triggers, kill switches, and
          linked <code className="font-mono text-xs">38 C.F.R.</code> snapshots.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
          <Link
            href="/vasrd"
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            15 VASRD Body Systems (/vasrd) →
          </Link>
          <Link
            href="/docs"
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            Legal Doctrine Hub (/docs) →
          </Link>
          <Link
            href="/checklists"
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            Pre-Filing Checklists (/checklists) →
          </Link>
          <Link
            href="/eras"
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            5 Historical Era Lenses (/eras) →
          </Link>
          <Link
            href="/crosswalk"
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            1933–1991 Crosswalk (/crosswalk) →
          </Link>
          <Link
            href="/reference/forms-and-codes"
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-primary hover:bg-muted"
          >
            Forms &amp; Codes Decoder →
          </Link>
        </div>
      </header>

      <section aria-labelledby="live-playbooks-heading" className="space-y-4">
        <h2
          id="live-playbooks-heading"
          data-persona="veteran-only"
          className="font-serif text-xl font-bold"
        >
          Issue-Spotting Guides &amp; Record Clues ({playbooks.length} Topics)
        </h2>
        <h2
          data-persona="practitioner-only"
          className="font-serif text-xl font-bold"
        >
          Complete C-File Screening &amp; Litigation Playbook Catalog ({playbooks.length})
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {playbooks.map((doc) => {
            const overlay = doc.veteranOverlay;

            return (
              <article
                key={doc.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 text-sm"
              >
                {/* Veteran Mode Presentation */}
                <div data-persona="veteran-only" className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-xs">
                    <span className="font-semibold text-primary">
                      Investigation Playbook
                    </span>
                    <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {overlay ? "Plain-English Live" : "Reference + Tooltips"}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    {overlay?.plain_english_title ?? doc.title}
                  </h3>
                  {overlay ? (
                    <>
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        <LexiconText text={overlay.what_this_means} />
                      </p>
                      {overlay.questions_for_representative[0] && (
                        <div className="rounded border border-border bg-surface p-2.5 text-xs">
                          <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <CheckSquare
                              className="h-3.5 w-3.5 text-primary"
                              aria-hidden="true"
                            />
                            <span>Sample Representative Question:</span>
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
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        <LexiconText text={doc.cFileTriggers[0]} />
                      </p>
                    )
                  )}
                </div>

                {/* Practitioner Mode Presentation */}
                <div data-persona="practitioner-only" className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                    <span className="font-semibold text-primary">
                      Investigation Playbook · {doc.waveId}
                    </span>
                    {doc.diagnosticCodes.length > 0 && (
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        DC {doc.diagnosticCodes.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground">{doc.title}</h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {doc.cfrCitations.slice(0, 4).join(" · ")}
                  </p>
                  {doc.statutes.length > 0 && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Statutes: {doc.statutes.slice(0, 3).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-border/70 pt-3 text-xs">
                  <Link
                    href={doc.route}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <span>Open 3-Column Playbook &amp; Provenance Reader</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
