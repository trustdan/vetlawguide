import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckSquare } from "lucide-react";
import { CoverageBanner } from "@/components/bitemporal/coverage-banner";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { getChecklistDocuments, getCoverageManifest } from "@/lib/corpus/loader";

export const metadata: Metadata = {
  title: "Pre-Filing Verification Checklists & Representative Guides",
};

export default function ChecklistsIndexPage() {
  const manifest = getCoverageManifest();
  const checklists = getChecklistDocuments();
  const liveChecklists = checklists.filter((d) => d.status !== "HELD_AT_GATE");
  const heldChecklists = checklists.filter((d) => d.status === "HELD_AT_GATE");
  const overlayCount = liveChecklists.filter((d) => Boolean(d.veteranOverlay)).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1
          data-persona="veteran-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Preparation Checklists Before Filing or Challenging a Board Decision
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-3xl font-bold tracking-tight"
        >
          Pre-Filing Audit Gates &amp; Evidentiary Verification Checklists
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <LexiconText text="Interactive browser-memory checklists guarding high-consequence filings such as Board CUE motions under 38 C.F.R. § 20.1409(c) (one final merits CUE decision per prior Board decision on an issue)." />{" "}
          Checked <span className="font-mono">{manifest.checkedAsOf}</span>.
        </p>
      </header>

      <CoverageBanner
        state={
          overlayCount === liveChecklists.length
            ? "VERBATIM_VERIFIED"
            : "PLAIN_ENGLISH_IN_PROGRESS"
        }
        checkedAsOf={manifest.checkedAsOf}
        corpusReleaseId={manifest.corpusReleaseId}
        detail={`All ${liveChecklists.length} interactive pre-filing and intake checklists are live in browser memory (${overlayCount} dedicated Veteran plain-English companion(s) ready; remaining checklists display inline VA acronym/form tooltips and record clues while plain-English cards are completed).`}
        officialEcfrUrl="https://www.ecfr.gov/current/title-38/chapter-I/part-20/subpart-O"
        officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
      />

      <section aria-labelledby="live-checklists-heading" className="space-y-4">
        <h2 id="live-checklists-heading" className="font-serif text-xl font-bold">
          Interactive Pre-Filing Gates &amp; Intake Worksheets ({liveChecklists.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {liveChecklists.map((doc) => (
            <article
              key={doc.id}
              className="flex flex-col justify-between rounded-lg border border-border bg-surface-elevated p-5 text-sm"
            >
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
                  <CheckSquare className="h-4 w-4" aria-hidden="true" />
                  <span>Interactive Session Checklist</span>
                </div>
                <h3
                  data-persona="veteran-only"
                  className="font-serif text-lg font-bold text-foreground"
                >
                  {doc.veteranOverlay?.plain_english_title ?? doc.title}
                </h3>
                <h3
                  data-persona="practitioner-only"
                  className="font-serif text-lg font-bold text-foreground"
                >
                  {doc.title}
                </h3>
                {doc.veteranOverlay ? (
                  <p
                    data-persona="veteran-only"
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    <LexiconText text={doc.veteranOverlay.what_this_means} />
                  </p>
                ) : (
                  <p
                    data-persona="veteran-only"
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    <LexiconText
                      text={
                        doc.cFileTriggers[0] ??
                        "Interactive preparation worksheet with inline VA acronym and form tooltips; dedicated plain-English companion in progress."
                      }
                    />
                  </p>
                )}
                <p
                  data-persona="practitioner-only"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {doc.cfrCitations.slice(0, 3).join(" · ") ||
                    doc.statutes.slice(0, 2).join(" · ")}
                </p>
              </div>

              <div className="mt-4 border-t border-border/70 pt-3 text-xs">
                <Link
                  href={doc.route}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <span>Open Interactive 3-Column Checklist</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {heldChecklists.length > 0 && (
        <section aria-labelledby="staged-checklists-heading" className="space-y-3">
          <h2 id="staged-checklists-heading" className="font-serif text-lg font-semibold">
            Checklists Held at Ingestion Gate (Waves W2–W5)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {heldChecklists.map((doc) => (
              <Link
                key={doc.id}
                href={doc.route}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-surface/60 p-3.5 text-xs hover:border-primary"
              >
                <span className="font-medium text-foreground">{doc.title}</span>
                <span className="shrink-0 rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {doc.waveId}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
