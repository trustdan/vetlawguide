import { AlertTriangle, CheckSquare, FileSearch, Lock } from "lucide-react";
import type { VeteranOverlay } from "@/lib/corpus/types";
import { LexiconText } from "./lexicon-text";

export function VeteranOverlayCard({ overlay }: { overlay: VeteranOverlay }) {
  return (
    <section
      aria-label={`Plain-English Veteran guide: ${overlay.plain_english_title}`}
      className="space-y-4 rounded-lg border border-border bg-surface-elevated p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Plain-English Companion · SHA-256 Locked ({overlay.upstream_sha256.slice(0, 10)})
          </span>
          <h2 className="font-serif text-xl font-bold text-foreground">
            {overlay.plain_english_title}
          </h2>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          Reviewed {overlay.reviewed_at}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-foreground">
        <LexiconText text={overlay.what_this_means} />
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-3.5">
          <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileSearch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Clues to Check in Your Records</span>
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
            {overlay.record_clues.map((clue, idx) => (
              <li key={idx}>
                <LexiconText text={clue} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-surface p-3.5">
          <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Important Date &amp; Scope Cautions</span>
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
            {overlay.important_cautions.map((caution, idx) => (
              <li key={idx}>
                <LexiconText text={caution} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-md border border-border bg-background p-4">
        <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CheckSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>
            Questions &amp; Records to Discuss With an Accredited VSO, Claims Agent, or Attorney
          </span>
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Educational discussion checklist only—bring your decision letters and Rating Code Sheets to an accredited representative.
        </p>
        <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-foreground">
          {overlay.questions_for_representative.map((q, idx) => (
            <li key={idx}>
              <LexiconText text={q} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
