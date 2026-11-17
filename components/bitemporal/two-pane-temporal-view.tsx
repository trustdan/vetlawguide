import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { buildBitemporalTwoPaneContext, resolveCfrAtDate } from "@/lib/corpus/temporal";
import type { CompiledCfrSection } from "@/lib/corpus/types";
import { LexiconText } from "./lexicon-text";
import { QuarantinedWatchlistCard } from "./quarantined-watchlist-card";

export function TwoPaneTemporalView({
  section,
  effectiveDecisionDate,
}: {
  section: CompiledCfrSection;
  effectiveDecisionDate: string;
}) {
  const allRecords = [...section.versions, ...section.quarantinedWatchlist];
  const resolved = resolveCfrAtDate(
    allRecords,
    section.sectionSlug,
    effectiveDecisionDate,
  );
  const twoPane = buildBitemporalTwoPaneContext(effectiveDecisionDate, allRecords);

  const isPre2015HospitalRule = effectiveDecisionDate < "2015-03-24";
  const isPre1992Bell = effectiveDecisionDate < "1992-07-21";

  return (
    <section
      aria-labelledby="two-pane-temporal-heading"
      className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h2
            id="two-pane-temporal-heading"
            className="font-serif text-lg font-bold text-foreground"
          >
            <span data-persona="veteran-only">
              Rules on Your Decision Date vs. Ways to Review an Old Decision Today
            </span>
            <span data-persona="practitioner-only">
              Two-Pane Bitemporal Analysis: Law in Force Then vs. Procedural Vehicles Today
            </span>
          </h2>
          <p
            data-persona="veteran-only"
            className="text-xs text-muted-foreground"
          >
            Showing which rule applied on{" "}
            <strong className="font-mono text-foreground">{effectiveDecisionDate}</strong>{" "}
            alongside plain-English options an accredited representative can check today.
          </p>
          <p
            data-persona="practitioner-only"
            className="text-xs text-muted-foreground"
          >
            Evaluating challenged decision date{" "}
            <strong className="font-mono text-foreground">{effectiveDecisionDate}</strong>{" "}
            separately from modern reopening vehicles and collateral CUE bars.
          </p>
        </div>
        <span className="rounded border border-border bg-surface-elevated px-2.5 py-1 font-mono text-xs font-semibold text-primary">
          Decision Date: {effectiveDecisionDate}
        </span>
      </div>

      {twoPane.publicationGapTrapAlert && (
        <div
          role="alert"
          style={{
            backgroundColor: "var(--status-summary-bg)",
            color: "var(--status-summary-fg)",
            borderColor: "var(--status-summary-border)",
          }}
          className="rounded-md border p-3.5 text-xs leading-relaxed"
        >
          <div className="inline-flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Publication Date vs. Effective Date Boundary Active</span>
          </div>
          <p className="mt-1">
            <LexiconText text={twoPane.publicationGapTrapAlert} />
          </p>
        </div>
      )}

      {/* VETERAN MODE TWO-PANE PLAIN-ENGLISH VIEW */}
      <div data-persona="veteran-only" className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-3 rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold text-foreground">
              1. What Rules Applied on {effectiveDecisionDate}
            </h3>
          </div>

          {resolved.governingVersion ? (
            <div className="rounded-md border border-border bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-semibold text-foreground">
                  Active Rule Edition: {resolved.governingVersion.cfr_section}
                </span>
                <Link
                  href={resolved.governingVersion.permalink}
                  prefetch={false}
                  className="inline-flex items-center gap-1 break-all font-mono text-xs font-semibold text-primary underline underline-offset-2"
                >
                  <span>{resolved.governingVersion.permalink}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-1 text-muted-foreground">
                {resolved.governingVersion.heading} (in effect from{" "}
                <span className="font-mono font-semibold text-foreground">
                  {resolved.governingVersion.effective_from}
                </span>{" "}
                to{" "}
                <span className="font-mono font-semibold text-foreground">
                  {resolved.governingVersion.effective_to ?? "today"}
                </span>
                ).
              </p>
              {resolved.coverageState === "SUMMARY_ONLY" && (
                <div
                  style={{
                    backgroundColor: "var(--status-summary-bg)",
                    color: "var(--status-summary-fg)",
                    borderColor: "var(--status-summary-border)",
                  }}
                  className="mt-2 rounded border p-2.5 text-xs leading-relaxed"
                >
                  <p className="font-semibold">
                    Summary Only — Verify Official Print 38 C.F.R. Before Filing CUE
                  </p>
                  <p className="mt-0.5">
                    <LexiconText text="VetLawGuide displays a structured summary for this era—ask your accredited VSO, claims agent, or attorney to check the official GovInfo print 38 C.F.R. edition before filing any CUE challenge." />
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "var(--status-gap-bg)",
                color: "var(--status-gap-fg)",
                borderColor: "var(--status-gap-border)",
              }}
              className="rounded-md border p-3"
            >
              {(() => {
                const lastVer = section.versions[section.versions.length - 1];
                const isRepealedBeforeDate = Boolean(
                  lastVer?.effective_to &&
                    lastVer.effective_to !== "present" &&
                    effectiveDecisionDate > lastVer.effective_to,
                );
                return (
                  <>
                    <p className="font-semibold">
                      {isRepealedBeforeDate
                        ? `Rule Repealed or Consolidated Before ${effectiveDecisionDate} (Ended ${lastVer?.effective_to})`
                        : "Date Precedes Indexed Snapshots — Do Not Rely on Modern Wording"}
                    </p>
                    <p className="mt-1">
                      {isRepealedBeforeDate
                        ? `${section.cfrSection} ended or was consolidated on ${lastVer?.effective_to}. Decisions on ${effectiveDecisionDate} are governed by the successor regulation.`
                        : resolved.explanation}
                    </p>
                    {isRepealedBeforeDate && section.successorSection && (
                      <p className="mt-1.5">
                        <Link
                          href={section.successorSection.permalink}
                          className="font-semibold underline underline-offset-2"
                        >
                          Open Successor Provision ({section.successorSection.cfrSection}) →
                        </Link>
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
            <li>
              <strong className="text-foreground">Hospital &amp; Exam Reports:</strong>{" "}
              {isPre2015HospitalRule ? (
                <LexiconText text="Because this date is before March 24, 2015, a VA hospital or military medical report showing worsening of an already service-connected condition (even a 0% rating) could count automatically as an informal claim for increase." />
              ) : (
                <LexiconText text="On or after March 24, 2015, VA requires a standardized claim form or Intent to File to start a new claim, though older pre-2015 unfinished informal claims stay valid." />
              )}
            </li>
            <li>
              <strong className="text-foreground">Records VA Had to Check:</strong>{" "}
              {isPre1992Bell ? (
                <LexiconText text="For decisions before July 21, 1992, a CUE review usually looks only at papers physically inside your VA claims folder then—which makes § 3.156(c) especially helpful when military hospital records arrived years later." />
              ) : (
                <LexiconText text="For decisions on or after July 21, 1992, VA medical center (VAMC) treatment records that existed at the time count as part of the record even if they were not yet copied into your claims folder." />
              )}
            </li>
          </ul>
        </div>

        <div className="min-w-0 space-y-3 rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Scale className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold text-foreground">
              2. Ways an Accredited Representative Reviews Old Decisions Today
            </h3>
          </div>

          <div className="space-y-2">
            <div className="rounded-md border border-border bg-surface p-2.5">
              <div className="font-semibold text-foreground">
                Missing Military or Surgical Records Found Later (38 C.F.R. § 3.156(c))
              </div>
              <p className="mt-1 text-muted-foreground">
                <LexiconText text="If inpatient surgical charts (NPRC), field medical cards (DD 1380), or unit logs were missing when VA first decided your claim, VA must reconsider the claim and can grant earlier effective dates without requiring you to prove CUE." />
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface p-2.5">
              <div className="font-semibold text-foreground">
                Filing a Current Claim for Increase or Supplemental Claim
              </div>
              <p className="mt-1 text-muted-foreground">
                <LexiconText text="Applies today's updated rating schedule moving forward (such as post-2008 painful scar counting) with the benefit of the doubt in your favor." />
              </p>
            </div>

            <div className="rounded-md border border-border bg-background p-2.5">
              <div className="font-semibold text-foreground">
                Important Caution Before Filing a Board CUE Motion
              </div>
              <p className="mt-1 text-muted-foreground">
                <LexiconText text="Later rule changes or court reinterpretations cannot prove CUE in an older final decision, and under 38 C.F.R. § 20.1409(c) VA allows only one final merits CUE decision per prior BVA decision on an issue—always review your C-file with an accredited VSO, claims agent, or attorney first." />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PRACTITIONER MODE TWO-PANE DOCTRINAL VIEW */}
      <div data-persona="practitioner-only" className="grid gap-4 lg:grid-cols-2">
        {/* PANE 1: Law & Record Scope in Force Then */}
        <div className="min-w-0 flex flex-col justify-between space-y-3 rounded-lg border border-border bg-surface-elevated p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-bold text-foreground">
                Pane 1 — Text &amp; Rules in Force Then (T₀: {effectiveDecisionDate})
              </h3>
            </div>

            {resolved.governingVersion ? (
              <div className="rounded-md border border-border bg-surface p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-semibold text-foreground">
                    Governing Snapshot: {resolved.governingVersion.cfr_section}
                  </span>
                  <Link
                    href={resolved.governingVersion.permalink}
                    prefetch={false}
                    className="inline-flex items-center gap-1 break-all font-mono text-xs font-semibold text-primary underline underline-offset-2"
                  >
                    <span>{resolved.governingVersion.permalink}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {resolved.governingVersion.heading}
                </p>
                <dl className="mt-2 grid grid-cols-1 gap-1.5 border-t border-border/70 pt-2 font-mono text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">FR Publication Date</dt>
                    <dd className="text-foreground">
                      {resolved.governingVersion.publication_date ?? "Baseline"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Effective Interval</dt>
                    <dd className="font-semibold text-foreground">
                      {resolved.governingVersion.effective_from} →{" "}
                      {resolved.governingVersion.effective_to ?? "present"}
                    </dd>
                  </div>
                </dl>
                {resolved.coverageState === "SUMMARY_ONLY" && (
                  <div
                    style={{
                      backgroundColor: "var(--status-summary-bg)",
                      color: "var(--status-summary-fg)",
                      borderColor: "var(--status-summary-border)",
                    }}
                    className="mt-2.5 rounded border p-2.5 text-xs leading-relaxed"
                  >
                    <p className="font-semibold">
                      Summary Only — Pull Print 38 C.F.R. Edition Before Pleading CUE
                    </p>
                    <p className="mt-0.5">
                      <LexiconText text={resolved.explanation} />
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "var(--status-gap-bg)",
                  color: "var(--status-gap-fg)",
                  borderColor: "var(--status-gap-border)",
                }}
                className="rounded-md border p-3 text-xs"
              >
                <p className="font-semibold">
                  No Indexed Snapshot Covers {effectiveDecisionDate} — Do Not Rely
                </p>
                <p className="mt-1">{resolved.explanation}</p>
              </div>
            )}

            <div className="space-y-2 text-xs leading-relaxed">
              <div>
                <h4 className="font-semibold text-foreground">
                  {twoPane.statutoryEraLabel}
                </h4>
                <p className="mt-0.5 text-muted-foreground">
                  <LexiconText text={twoPane.statutoryEraDetail} />
                </p>
              </div>

              <div className="border-t border-border/70 pt-2">
                <h4 className="font-semibold text-foreground">
                  Record-Scope &amp; Informal-Claim Rules on Decision Date
                </h4>
                <p className="mt-0.5 text-muted-foreground">
                  <LexiconText text={twoPane.recordScopeRuleThen} />
                </p>
                <p className="mt-1.5 text-muted-foreground">
                  <LexiconText text={twoPane.informalClaimRuleThen} />
                </p>
              </div>

              {section.killSwitches.length > 0 && (
                <div className="border-t border-border/70 pt-2">
                  <h4 className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <ShieldAlert className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    <span>Section-Specific Temporal &amp; Pleading Traps</span>
                  </h4>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                    {section.killSwitches.map((ks, idx) => (
                      <li key={idx} className="break-words">
                        <LexiconText text={ks} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANE 2: How Later Developments Affect This Research Today */}
        <div className="min-w-0 flex flex-col justify-between space-y-3 rounded-lg border border-border bg-surface-elevated p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Scale className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-bold text-foreground">
                Pane 2 — How Later Developments Affect This Research Today
              </h3>
            </div>

            <div className="space-y-2 text-xs leading-relaxed">
              <h4 className="font-semibold text-foreground">
                Open &amp; Reconsideration Vehicles Today (Outside Strict CUE Bars)
              </h4>
              <div className="space-y-2">
                {twoPane.vehiclesToday.map((veh) => (
                  <div
                    key={veh.id}
                    className="rounded-md border border-border bg-surface p-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <span className="font-semibold text-foreground">{veh.title}</span>
                      <span className="font-mono text-xs text-primary">
                        {veh.citation}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      <LexiconText text={veh.summary} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border/70 pt-2 text-xs leading-relaxed">
              <h4 className="font-semibold text-foreground">
                Collateral CUE Limits &amp; Pre-Filing Gates Today
              </h4>
              <div className="space-y-2">
                {twoPane.collateralLimitsToday.map((lim) => (
                  <div
                    key={lim.id}
                    className="rounded-md border border-border bg-background p-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <span className="font-semibold text-foreground">{lim.title}</span>
                      <span className="font-mono text-xs text-accent">
                        {lim.citation}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      <LexiconText text={lim.scopeRule} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuarantinedWatchlistCard items={section.quarantinedWatchlist} />
    </section>
  );
}
