import { OctagonAlert } from "lucide-react";
import type { CompiledCfrSnapshot } from "@/lib/corpus/types";

export function QuarantinedWatchlistCard({
  items,
}: {
  items: CompiledCfrSnapshot[];
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Quarantined unfinalized or rescinded rulemaking watchlist"
      className="quarantine-stripe rounded-lg border-2 border-accent p-4 text-xs leading-relaxed"
    >
      <div className="rounded-md border border-border bg-surface-elevated/95 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <h3 className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <OctagonAlert className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              Quarantined Watchlist — Proposed / Unfinalized or Rescinded (Not Enacted Law)
            </span>
          </h3>
          <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
            Do Not Cite as Active Regulation
          </span>
        </div>

        <div className="mt-2.5 space-y-2.5">
          {items.map((item) => {
            const statusLabel =
              item.regulatory_status === "interim-final-rescinded"
                ? "Rescinded Interim Final Rule"
                : "Proposed Rule — Unfinalized / Not Enacted";

            return (
              <div key={item.version_id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {item.cfr_section} — {item.heading}
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent">
                    {statusLabel}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Source: {item.federal_register_citation ?? item.version_id} · Notice Date:{" "}
                  {item.publication_date ?? item.effective_from}
                </p>
                {item.applicability_and_transition_notes && (
                  <p className="text-muted-foreground">
                    {item.applicability_and_transition_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
