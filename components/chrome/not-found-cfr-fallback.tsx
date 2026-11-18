"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, History } from "lucide-react";
import {
  extractCfrSectionFallbackFromPath,
  type CfrSectionSummaryRef,
} from "@/lib/support-links";

export function NotFoundCfrFallback({
  sections,
}: {
  sections: ReadonlyArray<CfrSectionSummaryRef>;
}) {
  const pathname = usePathname();
  const match = extractCfrSectionFallbackFromPath(pathname, sections);
  if (!match) return null;

  return (
    <section
      aria-label="Matching regulation section"
      data-testid="not-found-cfr-fallback"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-surface-elevated p-4 text-sm"
    >
      <div className="min-w-0 space-y-1">
        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
          <History className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{match.cfrSection}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          No snapshot permalink is indexed at{" "}
          <code className="font-mono text-foreground">
            {match.requestedSegment}
          </code>
          . Open the section page to inspect every indexed effective date or test
          a specific decision date.
        </p>
      </div>

      <Link
        href={match.href}
        prefetch={false}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span>See all versions of this section</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
