import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileSearch,
  ListTree,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/corpus/loader";
import { resolveWave1CfrHref } from "@/lib/corpus/temporal";
import {
  classifyPrecedentNonprecedential,
  getVasrdSystemLabel,
  type CompiledDocument,
  type MarkdownBlock,
} from "@/lib/corpus/types";
import { CoverageBanner } from "./coverage-banner";
import { CrossInspectionExpander } from "./cross-inspection-expander";
import { InlineLegalText } from "./inline-legal-text";
import { InteractiveChecklistBlock } from "./interactive-checklist-block";
import { LexiconText } from "./lexicon-text";
import { PlannedModulePlaceholder } from "./planned-module-placeholder";
import { SourceProvenancePanel } from "./source-provenance-panel";
import { VeteranOverlayCard } from "./veteran-overlay-card";

function renderAstBlock(block: MarkdownBlock, idx: number, docId: string) {
  switch (block.kind) {
    case "heading":
      if (block.level === 2) {
        return (
          <h2
            key={`${docId}-h2-${idx}`}
            id={block.id}
            className="scroll-mt-28 border-b border-border pt-4 pb-1.5 font-serif text-xl font-bold text-foreground"
          >
            {block.text}
          </h2>
        );
      }
      return (
        <h3
          key={`${docId}-h3-${idx}`}
          id={block.id}
          className="scroll-mt-28 pt-2 font-serif text-base font-bold text-foreground"
        >
          {block.text}
        </h3>
      );

    case "alert": {
      const isCaution =
        block.alertType === "CAUTION" || block.alertType === "WARNING";
      return (
        <div
          key={`${docId}-alert-${idx}`}
          role="note"
          className={
            isCaution
              ? "space-y-1.5 rounded-lg border border-accent/60 bg-surface p-4 text-xs leading-relaxed"
              : "space-y-1.5 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
          }
        >
          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-primary">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{block.alertType}</span>
          </div>
          {block.lines.map((line, lIdx) => (
            <p key={lIdx} className="text-foreground">
              <InlineLegalText text={line} />
            </p>
          ))}
        </div>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={`${docId}-bq-${idx}`}
          className="space-y-2 rounded-r-lg border-y border-r border-l-4 border-border border-l-primary bg-surface p-4 text-sm leading-relaxed text-foreground"
        >
          {block.lines.map((line, lIdx) => (
            <p key={lIdx}>
              <InlineLegalText text={line} />
            </p>
          ))}
        </blockquote>
      );

    case "code":
      return (
        <div
          key={`${docId}-code-${idx}`}
          role="region"
          aria-label={`Structured ${block.language} reference block`}
          tabIndex={0}
          className="overflow-x-auto rounded-lg border border-border bg-surface p-3.5 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <pre className="whitespace-pre-wrap break-words">{block.code}</pre>
        </div>
      );

    case "table":
      return (
        <div
          key={`${docId}-tbl-${idx}`}
          className="overflow-x-auto rounded-lg border border-border bg-surface-elevated"
        >
          <table className="w-full text-left text-xs leading-relaxed">
            <thead className="border-b border-border bg-surface text-muted-foreground">
              <tr>
                {block.headers.map((h, hIdx) => (
                  <th key={hIdx} scope="col" className="px-3 py-2 font-semibold">
                    {h.replace(/`/g, "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className="align-top">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={
                        cIdx === 0
                          ? "px-3 py-2 font-medium text-foreground"
                          : "px-3 py-2 text-muted-foreground"
                      }
                    >
                      <InlineLegalText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "checklist":
      return (
        <InteractiveChecklistBlock
          key={`${docId}-chk-${idx}`}
          blockId={`${docId}-chk-${idx}`}
          items={block.items}
        />
      );

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag
          key={`${docId}-lst-${idx}`}
          className={
            block.ordered
              ? "list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground"
              : "list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground"
          }
        >
          {block.items.map((item, iIdx) => {
            const subLines = item.split("\n");
            return (
              <li key={iIdx} className="space-y-1">
                <div>
                  <InlineLegalText text={subLines[0] ?? ""} />
                </div>
                {subLines.slice(1).map((sub, sIdx) => (
                  <div
                    key={sIdx}
                    className="pl-3 text-xs leading-relaxed text-muted-foreground"
                  >
                    <InlineLegalText text={sub} />
                  </div>
                ))}
              </li>
            );
          })}
        </ListTag>
      );
    }

    case "paragraph":
      return (
        <p
          key={`${docId}-p-${idx}`}
          className="text-sm leading-relaxed text-foreground"
        >
          <InlineLegalText text={block.text} />
        </p>
      );
  }
}

export function ThreeColumnReader({
  doc,
  checkedAsOf,
  corpusReleaseId,
  activeBookmarkWave,
  relatedDocs,
  hubHref,
  hubLabel,
}: {
  doc: CompiledDocument;
  checkedAsOf: string;
  corpusReleaseId: string;
  activeBookmarkWave: string;
  relatedDocs: CompiledDocument[];
  hubHref: string;
  hubLabel: string;
}) {
  const categoryLabel = DOCUMENT_CATEGORY_LABELS[doc.category];

  if (doc.status === "HELD_AT_GATE") {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link
            href={hubHref}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to {hubLabel}</span>
          </Link>
        </nav>

        <CoverageBanner
          state="CORPUS_GAP_OR_QUEUED_WAVE"
          checkedAsOf={checkedAsOf}
          corpusReleaseId={corpusReleaseId}
          detail={`"${doc.title}" is intentionally held at VetLawGuide's Wave ${doc.waveId} ingestion gate while Wave 1 core workflows are verified. Consult official eCFR or GovInfo primary text directly.`}
          officialEcfrUrl={doc.officialFallbackUrl}
          officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
        />

        <PlannedModulePlaceholder
          topic={{
            slug: doc.slug,
            route: doc.route,
            title: doc.title,
            category:
              doc.category === "playbook" ||
              doc.category === "doctrine" ||
              doc.category === "checklist"
                ? doc.category
                : "doctrine",
            waveId: doc.waveId as "W2" | "W3" | "W4" | "W5",
            authoritySummary: `${categoryLabel} · Canonical Route ${doc.route}`,
            veteranPreview:
              "Plain-English companion, record clues, and accredited representative discussion questions will unlock when this Ingestion Wave opens.",
            practitionerPreview:
              "Upstream legal treatise and point-in-time citation crosswalk are staged behind this bookmark gate. Zero placeholder legal conclusions are rendered.",
            officialFallbackUrl: doc.officialFallbackUrl,
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl min-w-0 overflow-x-clip space-y-8 px-4 py-8">
      {/* Top Breadcrumb & Header */}
      <header className="min-w-0 space-y-3 border-b border-border pb-6 break-words">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <Link
            href={hubHref}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{hubLabel}</span>
          </Link>
          <span className="rounded border border-border bg-surface px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
            {categoryLabel} · Bookmark {activeBookmarkWave}
          </span>
        </div>

        <h1
          data-persona="veteran-only"
          className="font-serif text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {doc.veteranOverlay?.plain_english_title ?? doc.title}
        </h1>
        <h1
          data-persona="practitioner-only"
          className="font-serif text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {doc.title}
        </h1>

        {doc.diagnosticCodes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Diagnostic Codes:</span>
            {doc.diagnosticCodes.map((dc) => (
              <span
                key={dc}
                className="rounded border border-border bg-surface px-2 py-0.5 text-[11px]"
              >
                DC {dc}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* 3-Column Editorial Reader */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Column 1: Sticky ToC & Related Wave 1 Modules */}
        <aside
          aria-label="Document outline and related guides"
          className="min-w-0 space-y-4 break-words lg:sticky lg:top-24 lg:col-span-3"
        >
          <div
            data-persona="veteran-only"
            className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
          >
            <div className="flex items-center gap-1.5 border-b border-border pb-2 font-semibold text-foreground">
              <ListTree className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Plain-English Guide Structure</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-muted-foreground">
              <li>1. What This Rule Means in Plain English</li>
              <li>2. Clues to Check in Your Records</li>
              <li>3. Important Date &amp; Scope Cautions</li>
              <li>4. Questions for an Accredited Representative</li>
            </ul>
          </div>

          {doc.toc.length > 0 && (
            <nav
              data-persona="practitioner-only"
              aria-label="On this page"
              className="rounded-lg border border-border bg-surface p-4 text-xs"
            >
              <div className="flex items-center gap-1.5 border-b border-border pb-2 font-semibold text-foreground">
                <ListTree className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Practitioner Section Outline</span>
              </div>
              <ul className="mt-2.5 max-h-80 space-y-1 overflow-y-auto pr-1">
                {doc.toc.map((item) => (
                  <li
                    key={item.id}
                    className={item.level === 3 ? "pl-3" : undefined}
                  >
                    <a
                      href={`#${item.id}`}
                      className="block py-1.5 leading-snug text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {relatedDocs.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4 text-xs">
              <div className="flex items-center gap-1.5 border-b border-border pb-2 font-semibold text-foreground">
                <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Related Corpus Guides</span>
              </div>
              <ul className="mt-2 space-y-1">
                {relatedDocs.slice(0, 6).map((rel) => (
                  <li key={rel.id}>
                    <Link
                      href={rel.route}
                      className="inline-flex min-h-6 items-start gap-1 py-1 font-medium text-primary hover:underline"
                    >
                      <ArrowRight
                        className="mt-0.5 h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        {rel.veteranOverlay?.plain_english_title ?? rel.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface p-4 text-xs space-y-2">
            <div className="font-semibold text-foreground">Quick Decoders &amp; Hubs</div>
            <div className="flex flex-col gap-1">
              {doc.vasrdSystem && (
                <Link
                  href={`/vasrd/${doc.vasrdSystem}`}
                  className="inline-flex min-h-6 items-center py-1 font-medium text-primary hover:underline"
                >
                  VASRD Hub: {getVasrdSystemLabel(doc.vasrdSystem)} →
                </Link>
              )}
              <Link
                href="/vasrd"
                className="inline-flex min-h-6 items-center py-1 font-medium text-primary hover:underline"
              >
                All 15 VASRD Body Systems →
              </Link>
              <Link
                href="/crosswalk"
                className="inline-flex min-h-6 items-center py-1 font-medium text-primary hover:underline"
              >
                1933 ↔ 1958 ↔ 1991 Statutory Crosswalk →
              </Link>
              <Link
                href="/reference/forms-and-codes"
                className="inline-flex min-h-6 items-center py-1 font-medium text-primary hover:underline"
              >
                Forms &amp; Code-Sheet Decoder →
              </Link>
            </div>
          </div>
        </aside>

        {/* Column 2: Dual-Persona Primary Reader */}
        <div className="min-w-0 space-y-6 lg:col-span-6">
          <CoverageBanner
            state={doc.coverageState}
            checkedAsOf={checkedAsOf}
            corpusReleaseId={corpusReleaseId}
            officialEcfrUrl={doc.officialFallbackUrl}
            officialGovInfoUrl="https://www.govinfo.gov/app/collection/cfr"
          />

          {doc.unfinalizedProposals.length > 0 && (
            <div
              role="note"
              className="quarantine-stripe rounded-lg border border-accent/60 p-4 text-xs leading-relaxed"
            >
              <div className="font-mono font-bold text-foreground">
                Proposed / Unfinalized Rulemaking Watchlist (Not Enacted Law)
              </div>
              <p className="mt-1 text-muted-foreground">
                This module references quarantined proposed or unfinalized notices (
                <span className="font-mono font-semibold text-foreground">
                  {doc.unfinalizedProposals.join(" · ")}
                </span>
                ). Never cite proposed rules as binding rating criteria or historical CUE
                standards.
              </p>
            </div>
          )}

          <CrossInspectionExpander
            veteranContent={
              doc.veteranOverlay ? (
                <div className="space-y-4">
                  <VeteranOverlayCard overlay={doc.veteranOverlay} />
                  {doc.category === "checklist" &&
                    doc.veteranOverlay.questions_for_representative.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-serif text-base font-bold text-foreground">
                          Interactive Preparation &amp; Representative Discussion Checklist
                        </h3>
                        <InteractiveChecklistBlock
                          blockId={`${doc.id}-vet-prep`}
                          items={[
                            ...doc.veteranOverlay.record_clues,
                            ...doc.veteranOverlay.questions_for_representative,
                          ]}
                        />
                      </div>
                    )}
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
                  <div className="font-serif text-base font-bold text-foreground">
                    Plain-English Companion In Progress — Primary Source Reference Ready Below
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <LexiconText text="This primary-source module from the Veterans Law reference library is fully unlocked and searchable, with inline acronym and VA form tooltips active. Its dedicated plain-English summary card is queued in the current editorial wave—expand the exact legal authority below or bring the record clues to an accredited VSO, claims agent, or attorney." />
                  </p>
                  {doc.cFileTriggers.length > 0 && (
                    <div className="rounded-md border border-border bg-surface-elevated p-3 text-xs">
                      <div className="font-semibold text-foreground">
                        Record &amp; Paperwork Clues Tracked in This Module:
                      </div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted-foreground">
                        {doc.cFileTriggers.slice(0, 4).map((clue, cIdx) => (
                          <li key={cIdx}>
                            <LexiconText text={clue} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            }
            practitionerContent={
              <article className="min-w-0 space-y-4 break-words rounded-lg border border-border bg-surface-elevated p-4 sm:p-5">
                {doc.blocks.map((block, idx) =>
                  renderAstBlock(block, idx, doc.id),
                )}
              </article>
            }
          />
        </div>

        {/* Column 3: Provenance, Citations, C-File Triggers & Kill Switches */}
        <aside
          aria-label="Citations, record triggers, and pre-filing gates"
          className="min-w-0 space-y-4 break-words lg:col-span-3"
        >
          <SourceProvenancePanel
            officialCitation={
              doc.cfrCitations.slice(0, 3).join(" · ") ||
              doc.statutes.slice(0, 3).join(" · ") ||
              doc.title
            }
            effectiveFrom={doc.effectiveFrom}
            effectiveTo={doc.effectiveTo}
            transcriptionLevel={
              doc.category === "authority-snapshot"
                ? "Verbatim Primary Source"
                : "Primary-Source-Cited Analytical Synthesis"
            }
            checkedAsOf={checkedAsOf}
            corpusReleaseId={corpusReleaseId}
            bookmarkWave={activeBookmarkWave}
            primarySourceUrl={doc.officialFallbackUrl}
            limitationsNote="Educational legal research and pre-filing verification aid; always verify pinpoint print editions before pleading CUE."
          />

          {(doc.cfrCitations.length > 0 || doc.statutes.length > 0) && (
            <section
              aria-label="Governing regulations and statutes"
              className="space-y-3 rounded-lg border border-border bg-surface p-4 text-xs"
            >
              <div className="flex items-center gap-1.5 border-b border-border pb-2 font-semibold text-foreground">
                <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Cited Regulations &amp; Statutes</span>
              </div>

              {doc.cfrCitations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[11px] font-medium text-muted-foreground">
                    38 C.F.R. Authorities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doc.cfrCitations.map((cite) => {
                      const { href } = resolveWave1CfrHref(cite);
                      return (
                        <Link
                          key={cite}
                          href={href}
                          className="inline-flex min-h-6 items-center rounded border border-border bg-surface-elevated px-2.5 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-muted"
                        >
                          {cite}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {doc.statutes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[11px] font-medium text-muted-foreground">
                    Title 38 U.S.C. Crosswalk
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doc.statutes.map((stat) => {
                      const digits = /(\d{3,4})/.exec(stat)?.[1] ?? "";
                      return (
                        <Link
                          key={stat}
                          href={digits ? `/crosswalk?q=${digits}` : "/crosswalk"}
                          className="inline-flex min-h-6 items-center rounded border border-border bg-surface-elevated px-2.5 py-1 font-mono text-[11px] text-foreground hover:border-primary"
                        >
                          {stat}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {doc.cFileTriggers.length > 0 && (
            <section
              aria-label="C-file record triggers"
              className="space-y-2 rounded-lg border border-border bg-surface p-4 text-xs"
            >
              <div className="flex items-center gap-1.5 border-b border-border pb-2 font-semibold text-foreground">
                <FileSearch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>C-File &amp; Clinical Record Clues</span>
              </div>
              <ul className="list-disc space-y-1.5 pl-4 leading-relaxed text-muted-foreground">
                {doc.cFileTriggers.map((trig, tIdx) => (
                  <li key={tIdx}>
                    <LexiconText text={trig} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {doc.killSwitches.length > 0 && (
            <section
              aria-label="Doctrinal bars and pre-filing kill switches"
              className="space-y-2 rounded-lg border border-border bg-surface p-4 text-xs"
            >
              <div className="flex items-center gap-1.5 border-b border-border pb-2 font-semibold text-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Doctrinal Bars &amp; Kill Switches</span>
              </div>
              <ul className="list-disc space-y-1.5 pl-4 leading-relaxed text-muted-foreground">
                {doc.killSwitches.map((ks, kIdx) => (
                  <li key={kIdx}>
                    <LexiconText text={ks} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {doc.keyPrecedents.length > 0 && (
            <section
              aria-label="Governing precedents"
              className="space-y-2 rounded-lg border border-border bg-surface p-4 text-xs"
            >
              <div className="border-b border-border pb-2 font-semibold text-foreground">
                Governing Precedents ({doc.keyPrecedents.length})
              </div>
              <ul className="space-y-2 leading-relaxed text-muted-foreground">
                {doc.keyPrecedents.map((prec) => {
                  const nonprec = classifyPrecedentNonprecedential(prec);
                  return (
                    <li
                      key={prec}
                      className="rounded border border-border/70 bg-surface-elevated p-2"
                    >
                      <div className="font-mono text-[11px] text-foreground">
                        {prec}
                      </div>
                      {nonprec.isRule30a && (
                        <div className="mt-1 font-mono text-[10px] font-semibold text-accent">
                          Nonprecedential single-judge decision — CAVC Rule 30(a)
                        </div>
                      )}
                      {nonprec.isFedCirNonprecedential && (
                        <div className="mt-1 font-mono text-[10px] font-semibold text-accent">
                          Nonprecedential disposition — Fed. Cir. R. 32.1
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
