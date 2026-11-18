"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HelpCircle, Keyboard, X } from "lucide-react";

interface QuickHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function QuickHelpDialog({ open, onClose }: QuickHelpDialogProps) {
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
      aria-labelledby="quick-help-dialog-title"
      data-testid="quick-help-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface-elevated p-5 text-foreground shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <HelpCircle
              className="h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <h2 id="quick-help-dialog-title" className="text-lg font-semibold">
                Quick Guide &amp; Keyboard Shortcuts
              </h2>
              <p className="text-xs text-muted-foreground">
                How to navigate point-in-time VA law, audience modes, and
                private tools
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close quick guide dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-5 text-sm leading-relaxed">
          {/* Keyboard Shortcuts */}
          <section className="space-y-2">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Keyboard Shortcuts</span>
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-xs">
                <span className="text-foreground">Toggle this guide</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono font-semibold text-foreground">
                  ?
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-xs">
                <span className="text-foreground">Search citations &amp; DCs</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono font-semibold text-foreground">
                  ⌘K / Ctrl+K
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-xs">
                <span className="text-foreground">Dismiss open modal</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono font-semibold text-foreground">
                  Esc
                </kbd>
              </div>
            </div>
          </section>

          {/* 4 Core Desk Controls */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface p-3.5">
              <h3 className="text-xs font-semibold text-foreground">
                1. Veterans | Practitioners Switch
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Switches every page instantly between plain-English explanations
                (with decoded acronyms and VSO/attorney checklists) and
                practitioner pin-cites without altering the URL.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface p-3.5">
              <h3 className="text-xs font-semibold text-foreground">
                2. &ldquo;Law as of&rdquo; Decision Date
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Set an exact <code className="font-mono text-xs">YYYY-MM-DD</code>{" "}
                decision date in the sticky bar to resolve{" "}
                <code className="font-mono text-xs">38 C.F.R.</code> text by{" "}
                <strong>Federal Register Effective Date</strong> and compare Law
                Then vs. Review Vehicles Today.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface p-3.5">
              <h3 className="text-xs font-semibold text-foreground">
                3. Honest Coverage &amp; Quarantine Badges
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Badges distinguish verbatim regulations from historical{" "}
                <strong>Summary Only</strong> eras (where you should verify
                official print CFR on GovInfo) and{" "}
                <strong>Quarantined Proposed/Rescinded</strong> rules.
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface p-3.5">
              <h3 className="text-xs font-semibold text-foreground">
                4. Private Investigate vs. Research Chat
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <strong>Investigate</strong> runs strictly in temporary browser
                memory (zero network calls). <strong>Research Chat</strong>{" "}
                queries the indexed corpus (SSNs/claim IDs scrubbed; never enter
                private medical facts).
              </p>
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link
              href="/about"
              prefetch={false}
              onClick={onClose}
              className="font-semibold text-primary underline underline-offset-2 hover:opacity-85"
            >
              About VetLawGuide →
            </Link>
            <span className="text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <Link
              href="/privacy"
              prefetch={false}
              onClick={onClose}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-85"
            >
              Privacy &amp; On-Device Isolation
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
