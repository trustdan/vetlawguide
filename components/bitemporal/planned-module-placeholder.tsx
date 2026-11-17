import { Bookmark, ExternalLink } from "lucide-react";
import type { PlannedPlaceholderTopic } from "@/content/taxonomy-skeleton";

export function PlannedModulePlaceholder({
  topic,
}: {
  topic: PlannedPlaceholderTopic;
}) {
  return (
    <article className="flex flex-col justify-between rounded-lg border border-dashed border-border bg-surface/60 p-5">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono font-semibold text-muted-foreground">
            <Bookmark className="h-3 w-3 text-accent" aria-hidden="true" />
            Verbatim Transcription In Progress
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            Not Yet Published — Do Not Rely
          </span>
        </div>

        <h3 className="text-base font-semibold text-foreground">{topic.title}</h3>
        <p className="font-mono text-xs text-muted-foreground">
          {topic.authoritySummary}
        </p>

        <p
          data-persona="veteran-only"
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {topic.veteranPreview}
        </p>
        <p
          data-persona="practitioner-only"
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {topic.practitionerPreview}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border/70 pt-3 text-xs font-medium">
        <a
          href={topic.officialFallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80"
        >
          <span>Consult Official eCFR Section</span>
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        <a
          href="https://www.govinfo.gov/app/collection/cfr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          <span>Historical GovInfo CFR</span>
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
