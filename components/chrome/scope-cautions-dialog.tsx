"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";

interface ScopeCautionsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ScopeCautionsDialog({ open, onClose }: ScopeCautionsDialogProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scope-cautions-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface-elevated p-6 text-foreground shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <h2 id="scope-cautions-title" className="text-lg font-semibold">
              Educational Reference Scope & High-Stakes Procedural Cautions
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close Scope and CUE Cautions dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground">
              1. Not Legal or Medical Advice (No Attorney-Client Relationship)
            </h3>
            <p className="text-muted-foreground">
              VetLawGuide compiles public statutes, point-in-time Federal Register and{" "}
              <code className="font-mono text-xs">38 C.F.R.</code> texts, and precedential
              opinions for educational research. Applying Veterans Law to an individual
              claim requires reviewing the complete VA Claims File (C-file) with an{" "}
              <strong>accredited Veterans Service Organization (VSO), claims agent, or attorney</strong>.
            </p>
            <p>
              <a
                href="https://www.va.gov/get-help-from-accredited-representative/find-rep/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
              >
                Find a VA-Accredited Representative (Official VA.gov Directory)
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground">
              2. Strict Appeal Deadlines (120-Day CAVC & 1-Year AMA Windows)
            </h3>
            <p className="text-muted-foreground">
              Recent VA Regional Office decisions generally carry a{" "}
              <strong>1-year continuous-pursuit window</strong> under{" "}
              <code className="font-mono text-xs">38 C.F.R. § 3.2500</code>, and adverse
              Board of Veterans&apos; Appeals decisions carry a{" "}
              <strong>120-day Notice of Appeal deadline</strong> to the U.S. Court of
              Appeals for Veterans Claims (<code className="font-mono text-xs">38 U.S.C. § 7266</code>).
              Never miss an active appeal deadline while researching historical rules.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground">
              3. Board CUE Finality Rule (<code className="font-mono text-xs">38 C.F.R. § 20.1409(c)</code>)
            </h3>
            <p className="text-muted-foreground">
              Under <code className="font-mono text-xs">38 C.F.R. § 20.1409(c)</code>, once
              there is a <strong>final decision on a motion for Clear and Unmistakable Error (CUE)
              on the merits</strong> regarding a particular issue in a prior Board decision,
              that prior Board issue is <strong>no longer subject to revision on the grounds of CUE</strong>,
              and subsequent CUE motions on that issue are dismissed with prejudice
              (note: pleading dismissals without prejudice under{" "}
              <code className="font-mono text-xs">§ 20.1404</code> are not final merits
              decisions for this purpose). Consult an accredited representative before
              filing a Board CUE motion.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-foreground">
              4. Proposed Rules vs. Enacted Law & Coverage Boundaries
            </h3>
            <p className="text-muted-foreground">
              Proposed Federal Register rules (such as <code className="font-mono text-xs">RIN</code> notices)
              and rescinded Interim Final Rules are quarantined with caution striping and
              have zero binding legal force. Whenever a historical date or VASRD wave is
              marked <strong>Summary Only</strong> or <strong>Not Yet Indexed — Do Not Rely</strong>,
              always verify the official print <code className="font-mono text-xs">38 C.F.R.</code>{" "}
              edition on GovInfo before pleading.
            </p>
          </section>
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Understood — Return to Research Desk
          </button>
        </div>
      </div>
    </div>
  );
}
