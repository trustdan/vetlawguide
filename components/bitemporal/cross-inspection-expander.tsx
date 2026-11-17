"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CrossInspectionExpanderProps {
  veteranContent: ReactNode;
  practitionerContent: ReactNode;
}

/**
 * Enforces Rule 03 Cross-Inspection Parity with Zero Duplicate DOM Mounting:
 * - Mounts `veteranContent` once and `practitionerContent` once in a flex-col container
 *   (preventing duplicate heading `id`s or hidden duplicate inputs).
 * - Uses `<html data-mode>` CSS (`data-persona`) for zero-flash SSR visibility,
 *   removing the `data-persona` hide attribute on demand when the user opens the
 *   1-click cross-inspection drawer.
 */
export function CrossInspectionExpander({
  veteranContent,
  practitionerContent,
}: CrossInspectionExpanderProps) {
  const [vetInspectOpen, setVetInspectOpen] = useState(false);
  const [pracInspectOpen, setPracInspectOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Single Veteran Content Mount */}
      <div
        data-persona={pracInspectOpen ? undefined : "veteran-only"}
        className={
          pracInspectOpen
            ? "order-3 rounded-md border border-border bg-surface p-3.5 text-xs"
            : "order-1"
        }
      >
        {veteranContent}
      </div>

      {/* Single Practitioner Content Mount */}
      <div
        data-persona={vetInspectOpen ? undefined : "practitioner-only"}
        className={
          vetInspectOpen
            ? "order-3 rounded-md border border-border bg-surface p-3.5 text-xs"
            : "order-1"
        }
      >
        {practitionerContent}
      </div>

      {/* Veteran-Mode Cross-Inspection Trigger */}
      <div
        data-persona="veteran-only"
        className="order-2 border-t border-border/70 pt-2"
      >
        <button
          type="button"
          aria-expanded={vetInspectOpen}
          onClick={() => setVetInspectOpen((o) => !o)}
          className="inline-flex min-h-6 items-center gap-1.5 py-0.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {vetInspectOpen ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Inspect exact legal authority &amp; practitioner notes</span>
        </button>
      </div>

      {/* Practitioner-Mode Cross-Inspection Trigger */}
      <div
        data-persona="practitioner-only"
        className="order-2 border-t border-border/70 pt-2"
      >
        <button
          type="button"
          aria-expanded={pracInspectOpen}
          onClick={() => setPracInspectOpen((o) => !o)}
          className="inline-flex min-h-6 items-center gap-1.5 py-0.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {pracInspectOpen ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>View plain-English Veteran explanation</span>
        </button>
      </div>
    </div>
  );
}
