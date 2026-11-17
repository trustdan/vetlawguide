"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { CrossInspectionExpander } from "@/components/bitemporal/cross-inspection-expander";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import type { EvaluatedInvestigationPathway } from "@/lib/screener/types";

export function PathwayRankCard({
  pathway,
}: {
  pathway: EvaluatedInvestigationPathway;
}) {
  const isSupported = pathway.disposition === "supported-to-investigate";
  const isUnresolved = pathway.disposition === "unresolved-records-needed";

  const statusStyles = isSupported
    ? {
        backgroundColor: "var(--status-verified-bg)",
        color: "var(--status-verified-fg)",
        borderColor: "var(--status-verified-border)",
      }
    : isUnresolved
      ? {
          backgroundColor: "var(--status-pending-bg)",
          color: "var(--status-pending-fg)",
          borderColor: "var(--status-pending-border)",
        }
      : undefined;

  return (
    <article
      data-testid={`pathway-card-${pathway.pathwayId}`}
      className={`min-w-0 space-y-4 rounded-lg border p-4 sm:p-5 ${
        pathway.disposition === "barred-or-inapplicable"
          ? "border-border bg-surface/60"
          : "border-border bg-surface-elevated shadow-2xs"
      }`}
    >
      {/* Top Priority & Disposition Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span
              data-persona="veteran-only"
              className="rounded border border-border bg-surface px-2 py-0.5 text-primary"
            >
              <LexiconText text={pathway.priorityBadgeVeteran} />
            </span>
            <span
              data-persona="practitioner-only"
              className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-primary"
            >
              {pathway.priorityBadgePractitioner}
            </span>
          </div>

          <h3 className="font-serif text-base font-bold leading-snug text-foreground sm:text-lg">
            <span data-persona="veteran-only">
              <LexiconText text={pathway.veteranTitle} />
            </span>
            <span data-persona="practitioner-only">{pathway.practitionerTitle}</span>
          </h3>
        </div>

        <div
          style={statusStyles}
          className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
            !statusStyles ? "border-border bg-muted text-muted-foreground" : ""
          }`}
        >
          {isSupported ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : isUnresolved ? (
            <FileSearch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span data-persona="veteran-only" className="break-words">
            {pathway.dispositionLabelVeteran}
          </span>
          <span data-persona="practitioner-only" className="break-words">
            {pathway.dispositionLabelPractitioner}
          </span>
        </div>
      </div>

      {/* Dual-Persona Doctrinal Scope Banner */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs leading-relaxed">
        <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 break-words font-medium text-foreground">
          <span data-persona="veteran-only">
            <LexiconText text={pathway.doctrinalScopeBadgeVeteran} />
          </span>
          <span data-persona="practitioner-only">
            <LexiconText text={pathway.doctrinalScopeBadge} />
          </span>
        </p>
      </div>

      {/* Cross-Inspectable Summary + Bitemporal Note + Citations */}
      <CrossInspectionExpander
        veteranContent={
          <div className="space-y-2.5 text-xs leading-relaxed">
            <p className="text-foreground">
              <LexiconText text={pathway.veteranSummary} />
            </p>
            <div className="rounded-md border border-border/80 bg-surface p-3 text-muted-foreground">
              <span className="font-semibold text-foreground">
                How Your Decision Date Affects This Option:{" "}
              </span>
              <LexiconText text={pathway.bitemporalNoteVeteran} />
            </div>
            {pathway.veteranDiscussionQuestions.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-foreground">
                  <LexiconText text="Questions to Ask an Accredited VSO, Claims Agent, or Attorney:" />
                </div>
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  {pathway.veteranDiscussionQuestions.map((q, idx) => (
                    <li key={idx} className="break-words">
                      <LexiconText text={q} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        }
        practitionerContent={
          <div className="space-y-2.5 text-xs leading-relaxed">
            <p className="text-foreground">
              <LexiconText text={pathway.practitionerSummary} />
            </p>
            <div className="rounded-md border border-border/80 bg-surface p-3 text-muted-foreground">
              <span className="font-semibold text-foreground">
                Bitemporal Audit Note (T₀ vs. Analysis Today):{" "}
              </span>
              <LexiconText text={pathway.bitemporalNotePractitioner} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pathway.authorityCitations.map((cite) => (
                <span
                  key={cite}
                  className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground"
                >
                  {cite}
                </span>
              ))}
            </div>
          </div>
        }
      />

      {/* Point-in-Time 38 C.F.R. Links & Temporal / Coverage / Quarantine Alerts */}
      {pathway.pointInTimeLinks.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-surface p-3 text-xs">
          <div className="font-semibold text-foreground">
            Point-in-Time 38 C.F.R. Snapshots Evaluated on Selected Decision Date
          </div>
          <div className="space-y-2">
            {pathway.pointInTimeLinks.map((link) => (
              <div
                key={link.sectionSlug}
                className="space-y-2 rounded border border-border bg-surface-elevated p-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground">
                      {link.cfrSection}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      ({link.effectiveIntervalLabel} · {link.publicationDateLabel})
                    </span>
                  </div>

                  {link.permalink ? (
                    <Link
                      href={link.permalink}
                      prefetch={false}
                      className="inline-flex min-h-7 items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 font-mono text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      <span className="break-all">{link.permalink}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      href={link.officialGovinfoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-7 items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      <span>Pull Official GovInfo Print CFR</span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  )}
                </div>

                {link.doNotRely && (
                  <div
                    style={{
                      backgroundColor: "var(--status-gap-bg)",
                      color: "var(--status-gap-fg)",
                      borderColor: "var(--status-gap-border)",
                    }}
                    className="rounded border p-2.5 text-[11px] leading-relaxed"
                  >
                    <p className="font-semibold">
                      Date Precedes Indexed Snapshot — Do Not Rely on Modern eCFR Wording
                    </p>
                    <p className="mt-0.5">
                      <LexiconText text={link.explanation} />
                    </p>
                  </div>
                )}

                {!link.doNotRely && link.coverageState === "SUMMARY_ONLY" && (
                  <div
                    style={{
                      backgroundColor: "var(--status-summary-bg)",
                      color: "var(--status-summary-fg)",
                      borderColor: "var(--status-summary-border)",
                    }}
                    className="rounded border p-2.5 text-[11px] leading-relaxed"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          Summary Only — Pull Print 38 C.F.R. Edition Before Pleading CUE
                        </span>
                      </span>
                      <a
                        href={link.officialGovinfoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-6 items-center gap-1 font-semibold underline underline-offset-2"
                      >
                        <span>Official GovInfo CFR</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                    <p className="mt-0.5">
                      <LexiconText text={link.explanation} />
                    </p>
                  </div>
                )}

                {link.publicationGapTrapAlert && (
                  <div
                    style={{
                      backgroundColor: "var(--status-summary-bg)",
                      color: "var(--status-summary-fg)",
                      borderColor: "var(--status-summary-border)",
                    }}
                    className="rounded border p-2.5 text-[11px] leading-relaxed"
                  >
                    <div className="inline-flex items-center gap-1 font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Publication Date vs. Effective Date Boundary Active</span>
                    </div>
                    <p className="mt-0.5">
                      <LexiconText text={link.publicationGapTrapAlert} />
                    </p>
                  </div>
                )}

                {link.quarantinedProposalsNote && (
                  <div
                    style={{
                      color: "var(--status-summary-fg)",
                      borderColor: "var(--status-summary-border)",
                    }}
                    className="quarantine-stripe rounded border p-2.5 text-[11px] leading-relaxed"
                  >
                    <span className="font-semibold">
                      Quarantined Rulemaking Watchlist:{" "}
                    </span>
                    <LexiconText text={link.quarantinedProposalsNote} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dual-Persona Inspectable Reasoning Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0 space-y-2 rounded-md border border-border bg-background p-3 text-xs leading-relaxed">
          {pathway.triggeredByAnswers.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">
                Why Triggered by Current Answers
              </div>
              <ul
                data-persona="veteran-only"
                className="list-disc space-y-1 pl-4 text-muted-foreground"
              >
                {pathway.triggeredByAnswersVeteran.map((t, idx) => (
                  <li key={idx} className="break-words">
                    <LexiconText text={t} />
                  </li>
                ))}
              </ul>
              <ul
                data-persona="practitioner-only"
                className="list-disc space-y-1 pl-4 text-muted-foreground"
              >
                {pathway.triggeredByAnswers.map((t, idx) => (
                  <li key={idx} className="break-words">
                    <LexiconText text={t} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pathway.recordsToLocate.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">
                Records Needed to Confirm (&ldquo;I&apos;m Not Sure&rdquo; Answers)
              </div>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {pathway.recordsToLocate.map((rec) => (
                  <li key={rec.recordId} className="break-words">
                    <strong className="text-foreground">
                      <LexiconText text={rec.documentName} />:
                    </strong>{" "}
                    <LexiconText text={rec.whyItMatters} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pathway.blockingReasons.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">
                Why Not Matched Under Current Answers
              </div>
              <ul
                data-persona="veteran-only"
                className="list-disc space-y-1 pl-4 text-muted-foreground"
              >
                {pathway.blockingReasonsVeteran.map((b, idx) => (
                  <li key={idx} className="break-words">
                    <LexiconText text={b} />
                  </li>
                ))}
              </ul>
              <ul
                data-persona="practitioner-only"
                className="list-disc space-y-1 pl-4 text-muted-foreground"
              >
                {pathway.blockingReasons.map((b, idx) => (
                  <li key={idx} className="break-words">
                    <LexiconText text={b} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-1.5 rounded-md border border-border bg-background p-3 text-xs leading-relaxed">
          <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <span data-persona="veteran-only">
              Important Limits &amp; Cautions to Discuss
            </span>
            <span data-persona="practitioner-only">
              Kill Switches &amp; Pre-Filing Exclusions to Verify
            </span>
          </div>
          <ul
            data-persona="veteran-only"
            className="list-disc space-y-1 pl-4 text-muted-foreground"
          >
            {pathway.killSwitchesVeteran.map((ks, idx) => (
              <li key={idx} className="break-words">
                <LexiconText text={ks} />
              </li>
            ))}
          </ul>
          <ul
            data-persona="practitioner-only"
            className="list-disc space-y-1 pl-4 text-muted-foreground"
          >
            {pathway.killSwitchesToVerify.map((ks, idx) => (
              <li key={idx} className="break-words">
                <LexiconText text={ks} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Deep-Dive Site Routes */}
      {pathway.relatedSiteRoutes.length > 0 && (
        <div className="no-print flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5 text-xs">
          <span className="font-medium text-muted-foreground">
            Inspect Related Reference Guides:
          </span>
          {pathway.relatedSiteRoutes.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              prefetch={false}
              className="inline-flex min-h-7 items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 font-semibold text-primary hover:bg-muted"
            >
              <span>{r.label}</span>
              <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
