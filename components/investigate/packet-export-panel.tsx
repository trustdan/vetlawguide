"use client";

import { useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, Printer, ShieldCheck } from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { useResearchContext } from "@/components/providers/research-context";
import {
  buildPractitionerAuditPacketMarkdown,
  buildVeteranDiscussionPacketMarkdown,
} from "@/lib/screener/export-packet";
import type {
  CorpusStampMetadata,
  InvestigationEvaluationReport,
} from "@/lib/screener/types";

export function PacketExportPanel({
  report,
  stamp,
}: {
  report: InvestigationEvaluationReport;
  stamp: CorpusStampMetadata;
}) {
  const { audienceMode } = useResearchContext();
  const [copiedMode, setCopiedMode] = useState<"veteran" | "practitioner" | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const veteranMarkdown = buildVeteranDiscussionPacketMarkdown(report, stamp);
  const practitionerMarkdown = buildPractitionerAuditPacketMarkdown(report, stamp);

  const activeMarkdown =
    audienceMode === "practitioner" ? practitionerMarkdown : veteranMarkdown;
  const fileDateSuffix = /^\d{4}-\d{2}-\d{2}$/.test(report.intake.decisionDate)
    ? report.intake.decisionDate
    : "unknown-date";
  const activeFilename =
    audienceMode === "practitioner"
      ? `vetlawguide-prefiling-audit-${fileDateSuffix}.md`
      : `vetlawguide-representative-discussion-${fileDateSuffix}.md`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeMarkdown);
      setCopiedMode(audienceMode);
      window.setTimeout(() => setCopiedMode(null), 2500);
    } catch {
      // Clipboard may be blocked in restricted browser contexts; preview remains available
      setPreviewOpen(true);
    }
  }

  function handleDownloadMarkdown() {
    const blob = new Blob([activeMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeFilename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <section
      aria-labelledby="packet-export-heading"
      className="min-w-0 space-y-4 rounded-lg border border-border bg-surface-elevated p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0 space-y-1">
          <h2
            id="packet-export-heading"
            className="font-serif text-lg font-bold text-foreground"
          >
            <span data-persona="veteran-only">
              Export Your Printable Representative Discussion &amp; Records Sheet
            </span>
            <span data-persona="practitioner-only">
              Export Corpus-Stamped Pre-Filing C-File Audit &amp; Gate Packet
            </span>
          </h2>

          <p
            data-persona="veteran-only"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            <LexiconText text="Generated strictly inside your browser memory—no network upload, no saved account, and no personal identifiers. Bring this sheet to an accredited VSO, claims agent, or attorney." />
          </p>
          <p
            data-persona="practitioner-only"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            Generated in local client memory with zero telemetry or URL serialization,
            stamped with corpus release{" "}
            <code className="font-mono text-xs text-foreground">
              {stamp.corpusReleaseId}
            </code>{" "}
            (checked as of{" "}
            <code className="font-mono text-xs text-foreground">
              {stamp.checkedAsOf}
            </code>
            ).
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1 font-mono text-xs text-primary">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{stamp.corpusReleaseId}</span>
        </div>
      </div>

      {/* Zero-PII Safety Notice */}
      <div className="rounded-md border border-border bg-surface p-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Privacy &amp; Scope Reminder:</strong>{" "}
        Educational Reference Only—this packet organizes records to request and legal
        questions to verify, not individualized legal advice. Do not add Social Security
        Numbers or VA file numbers before emailing or sharing unsecured files.
      </div>

      {/* Action Buttons */}
      <div className="no-print flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {copiedMode === audienceMode ? (
            <>
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Copied Markdown Packet</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span data-persona="veteran-only">Copy Discussion Sheet</span>
              <span data-persona="practitioner-only">Copy Audit Packet (.md)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDownloadMarkdown}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span data-persona="veteran-only">Download Discussion Sheet (.md)</span>
          <span data-persona="practitioner-only">Download Pre-Filing Packet (.md)</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Print / Save as PDF</span>
        </button>

        <button
          type="button"
          aria-expanded={previewOpen}
          onClick={() => setPreviewOpen((prev) => !prev)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-2 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          {previewOpen ? (
            <>
              <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Hide Packet Preview</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Preview Exported Markdown</span>
            </>
          )}
        </button>
      </div>

      {previewOpen && (
        <div className="min-w-0 rounded-md border border-border bg-background p-3">
          <pre
            data-testid="packet-markdown-preview"
            tabIndex={0}
            role="region"
            aria-label="Exported Markdown packet preview"
            className="max-h-96 max-w-full overflow-x-auto overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {activeMarkdown}
          </pre>
        </div>
      )}
    </section>
  );
}
