import { AlertCircle, CheckCircle2, Clock, FileWarning } from "lucide-react";
import type { CoverageState } from "@/lib/corpus/types";

interface CoverageBannerProps {
  state: CoverageState;
  checkedAsOf: string;
  corpusReleaseId: string;
  detail?: string;
  officialEcfrUrl?: string;
  officialGovInfoUrl?: string;
}

const STATE_META: Record<
  CoverageState,
  {
    headline: string;
    defaultDetail: string;
    cssPrefix: "verified" | "summary" | "pending" | "gap";
  }
> = {
  VERBATIM_VERIFIED: {
    headline: "Verbatim Primary Text Verified",
    defaultDetail:
      "Checked directly against official Federal Register / GovInfo editions with plain-English companion locked by SHA-256.",
    cssPrefix: "verified",
  },
  SUMMARY_ONLY: {
    headline: "Summary Only — Pull Official Print CFR Edition Before Pleading CUE",
    defaultDetail:
      "Regulatory effective interval is indexed, but full historical print wording is summarized. Verify word-for-word print text before filing a CUE motion.",
    cssPrefix: "summary",
  },
  PLAIN_ENGLISH_IN_PROGRESS: {
    headline: "Primary-Source Verified — Plain-English Guide in Progress",
    defaultDetail:
      "Practitioner legal references are verified; Veteran plain-English summary is queued while inline acronym tooltips remain active.",
    cssPrefix: "pending",
  },
  CORPUS_GAP_OR_QUEUED_WAVE: {
    headline: "Gap / Not Yet Indexed on VetLawGuide — Do Not Rely",
    defaultDetail:
      "Held behind an upcoming Ingestion Wave or outside current snapshot dates. VetLawGuide never silently substitutes today's eCFR text.",
    cssPrefix: "gap",
  },
};

export function CoverageBanner({
  state,
  checkedAsOf,
  corpusReleaseId,
  detail,
  officialEcfrUrl,
  officialGovInfoUrl,
}: CoverageBannerProps) {
  const meta = STATE_META[state];

  const styleVars = {
    backgroundColor: `var(--status-${meta.cssPrefix}-bg)`,
    color: `var(--status-${meta.cssPrefix}-fg)`,
    borderColor: `var(--status-${meta.cssPrefix}-border)`,
  };

  return (
    <div
      role="status"
      style={styleVars}
      className="rounded-md border px-4 py-3 text-xs leading-relaxed"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 font-semibold">
          {state === "VERBATIM_VERIFIED" && (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {state === "SUMMARY_ONLY" && (
            <FileWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {state === "PLAIN_ENGLISH_IN_PROGRESS" && (
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {state === "CORPUS_GAP_OR_QUEUED_WAVE" && (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{meta.headline}</span>
        </div>
        <span className="font-mono text-[11px] opacity-90">
          Checked as of {checkedAsOf} · {corpusReleaseId}
        </span>
      </div>

      <p className="mt-1.5 opacity-95">{detail ?? meta.defaultDetail}</p>

      {(officialEcfrUrl || officialGovInfoUrl) && (
        <div className="mt-2 flex flex-wrap gap-3 font-medium">
          {officialEcfrUrl && (
            <a
              href={officialEcfrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Consult Current Official eCFR ↗
            </a>
          )}
          {officialGovInfoUrl && (
            <a
              href={officialGovInfoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              Pull Historical Annual CFR on GovInfo ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
