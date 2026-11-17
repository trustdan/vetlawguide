"use client";

import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { useResearchContext } from "@/components/providers/research-context";
import { resolveCfrAtDate } from "@/lib/corpus/temporal";
import type { CompiledCfrSection } from "@/lib/corpus/types";

export function CfrIndexLiveResolver({
  wave1Sections,
  defaultDate,
}: {
  wave1Sections: CompiledCfrSection[];
  defaultDate: string;
}) {
  const { decisionDate } = useResearchContext();
  const targetDate = decisionDate ?? defaultDate;

  return (
    <section
      aria-label="Live point-in-time decision date snapshot summary"
      className="rounded-lg border border-border bg-surface p-4 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>
            Active Point-in-Time Resolution Across Flagship FR Boundary Sections:{" "}
            <strong className="font-mono text-primary">
              {decisionDate ? `${decisionDate} (Historical T₀)` : `${defaultDate} (Current Law)`}
            </strong>
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Change <strong>Decision Date</strong> in the top bar to test historical transitions
        </span>
      </div>

      <div className="mt-3 grid gap-2.5 md:grid-cols-3">
        {wave1Sections.map((sec) => {
          const res = resolveCfrAtDate(
            [...sec.versions, ...sec.quarantinedWatchlist],
            sec.sectionSlug,
            targetDate,
          );
          return (
            <div
              key={sec.sectionSlug}
              className="flex flex-col justify-between rounded-md border border-border bg-surface-elevated p-3"
            >
              <div>
                <div className="font-semibold text-foreground">{sec.cfrSection}</div>
                {res.governingVersion ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Eff. {res.governingVersion.effective_from} →{" "}
                    {res.governingVersion.effective_to ?? "present"}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-accent">
                    Outside indexed baseline — Do Not Rely
                  </p>
                )}
              </div>
              <div className="mt-2 pt-1.5 border-t border-border/60">
                <Link
                  href={res.governingVersion?.permalink ?? `/cfr/${sec.sectionSlug}`}
                  className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary underline underline-offset-2"
                >
                  <span>
                    {res.governingVersion?.permalink ?? `/cfr/${sec.sectionSlug}`}
                  </span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
