import { ExternalLink, FileCheck2 } from "lucide-react";

export interface SourceProvenanceProps {
  officialCitation: string;
  publicationDate?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isQuarantinedNonbinding?: boolean;
  transcriptionLevel:
    | "Verbatim Primary Source"
    | "Primary-Source-Cited Analytical Synthesis"
    | "Structured Summary Only";
  checkedAsOf: string;
  corpusReleaseId: string;
  bookmarkWave?: string;
  primarySourceUrl: string;
  limitationsNote?: string;
}

export function SourceProvenancePanel({
  officialCitation,
  publicationDate,
  effectiveFrom,
  effectiveTo,
  isQuarantinedNonbinding = false,
  transcriptionLevel,
  checkedAsOf,
  corpusReleaseId,
  primarySourceUrl,
  limitationsNote,
}: SourceProvenanceProps) {
  return (
    <aside
      aria-label="Sources and limitations"
      className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
    >
      <div className="flex items-center gap-2 border-b border-border pb-2.5 font-semibold text-foreground">
        <FileCheck2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>Sources and limitations</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
        <div className="col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">
            Official Source &amp; Pinpoint
          </dt>
          <dd className="font-mono font-medium text-foreground">{officialCitation}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            FR Publication Date
          </dt>
          <dd className="font-mono text-foreground">
            {publicationDate ?? "See historical note"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            {isQuarantinedNonbinding ? "Enactment Status" : "Effective Interval"}
          </dt>
          <dd className="font-mono font-semibold text-foreground">
            {isQuarantinedNonbinding
              ? "Not Enacted / Quarantined"
              : `${effectiveFrom} → ${effectiveTo ?? "present"}`}
          </dd>
        </div>

        <div className="col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">
            Transcription Granularity
          </dt>
          <dd className="text-foreground">{transcriptionLevel}</dd>
        </div>

        <div className="col-span-2">
          <dt className="text-xs font-medium text-muted-foreground">
            Verification Date &amp; Release
          </dt>
          <dd className="font-mono text-foreground">
            Checked as of {checkedAsOf} · {corpusReleaseId}
          </dd>
        </div>

        {limitationsNote && (
          <div className="col-span-2">
            <dt className="text-xs font-medium text-muted-foreground">
              Scope &amp; Applicability Note
            </dt>
            <dd className="text-muted-foreground">{limitationsNote}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 border-t border-border pt-2.5">
        <a
          href={primarySourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:opacity-80"
        >
          <span>Verify Against Official GovInfo / eCFR Source</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
}
