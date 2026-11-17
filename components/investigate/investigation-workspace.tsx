"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  FileSearch,
  Layers,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LexiconText } from "@/components/bitemporal/lexicon-text";
import { SourceProvenancePanel } from "@/components/bitemporal/source-provenance-panel";
import { TwoPaneTemporalView } from "@/components/bitemporal/two-pane-temporal-view";
import { useResearchContext } from "@/components/providers/research-context";
import { resolveCfrAtDate } from "@/lib/corpus/temporal";
import type { CfrVersionRecord, CompiledCfrSection } from "@/lib/corpus/types";
import {
  createDefaultInvestigationState,
  evaluateInvestigationSession,
  INVESTIGATION_SCENARIO_PRESETS,
  WAVE1_SCREENING_QUESTIONS,
} from "@/lib/screener/engine";
import type {
  CorpusStampMetadata,
  DecisionAgency,
  FactQuestionGroup,
  InvestigationIntakeState,
  IssueFocus,
  RetireeProfile,
  TriValue,
} from "@/lib/screener/types";
import { PacketExportPanel } from "./packet-export-panel";
import { PathwayRankCard } from "./pathway-rank-card";

const QUESTION_GROUPS: ReadonlyArray<{
  group: FactQuestionGroup;
  veteranHeading: string;
  practitionerHeading: string;
  description: string;
}> = [
  {
    group: "service-records",
    veteranHeading: "A. Missing Military or Inpatient Hospital Records (38 C.F.R. § 3.156(c))",
    practitionerHeading:
      "A. Official Service Department & Inpatient Surgical Records (38 C.F.R. § 3.156(c))",
    description:
      "Checks whether pre-existing military or surgical records arrived (or can be requested) after the original decision.",
  },
  {
    group: "pending-finality",
    veteranHeading: "B. Unanswered Appeals, Hospital Notes & Mailing Clues",
    practitionerHeading:
      "B. Finality-Abating Events: NOD/SOC, § 3.156(b) Beraud/Lang, Pre-2015 § 3.157(b) & AMA § 5104(b)",
    description:
      "Checks whether the prior claim legally stayed open under benefit-of-the-doubt rules.",
  },
  {
    group: "scar-vs-muscle",
    veteranHeading: "C. Gunshot, Shrapnel & Deep Wound Rating Clues",
    practitionerHeading:
      "C. Penetrating Wound Multi-Manifestation Clues (§ 4.56 Muscle vs. § 4.118 Scar)",
    description:
      "Checks whether VA assigned only a 0% or 10% skin scar code while omitting deep muscle-group and nerve ratings.",
  },
  {
    group: "cue-record-and-math",
    veteranHeading: "D. Record-at-the-Time & Monthly Payment Impact Clues",
    practitionerHeading:
      "D. Collateral CUE Record Scope (Bell) & § 4.25 Combined-Payment Math",
    description:
      "Checks the strict record-at-the-time and combined-math rules needed before considering Regional Office or Board CUE.",
  },
];

function TriValueSelector({
  legendVeteran,
  legendPractitioner,
  helpVeteran,
  notePractitioner,
  value,
  onChange,
  unknownRecordHint,
  testIdPrefix,
}: {
  legendVeteran: string;
  legendPractitioner: string;
  helpVeteran?: string;
  notePractitioner?: string;
  value: TriValue;
  onChange: (next: TriValue) => void;
  unknownRecordHint?: string;
  testIdPrefix: string;
}) {
  const options: ReadonlyArray<{
    val: TriValue;
    vetLabel: string;
    pracLabel: string;
  }> = [
    { val: "yes", vetLabel: "Yes", pracLabel: "Yes" },
    { val: "no", vetLabel: "No", pracLabel: "No" },
    { val: "unknown", vetLabel: "I'm Not Sure", pracLabel: "Unknown / Check File" },
  ];

  return (
    <fieldset className="min-w-0 space-y-2 rounded-md border border-border bg-surface-elevated p-3.5">
      <legend className="px-1 text-xs font-semibold leading-relaxed text-foreground">
        <span data-persona="veteran-only">
          <LexiconText text={legendVeteran} />
        </span>
        <span data-persona="practitioner-only">
          <LexiconText text={legendPractitioner} />
        </span>
      </legend>

      {helpVeteran && (
        <p
          data-persona="veteran-only"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          <LexiconText text={helpVeteran} />
        </p>
      )}
      {notePractitioner && (
        <p
          data-persona="practitioner-only"
          className="font-mono text-[11px] leading-relaxed text-muted-foreground"
        >
          {notePractitioner}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-0.5">
        {options.map((opt) => {
          const active = value === opt.val;
          return (
            <button
              key={opt.val}
              type="button"
              data-testid={`${testIdPrefix}-${opt.val}`}
              aria-pressed={active}
              onClick={() => onChange(opt.val)}
              className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <span data-persona="veteran-only">{opt.vetLabel}</span>
              <span data-persona="practitioner-only">{opt.pracLabel}</span>
            </button>
          );
        })}
      </div>

      {value === "unknown" && unknownRecordHint && (
        <p className="text-[11px] leading-relaxed text-primary">
          <span className="font-semibold">Kept Open → Record to Check: </span>
          <LexiconText text={unknownRecordHint} />
        </p>
      )}
    </fieldset>
  );
}

export function InvestigationWorkspace({
  cfrSections,
  cfrVersions,
  stamp,
  activeBookmarkWave,
}: {
  cfrSections: CompiledCfrSection[];
  cfrVersions: CfrVersionRecord[];
  stamp: CorpusStampMetadata;
  activeBookmarkWave: string;
}) {
  const { decisionDate: globalDecisionDate, setDecisionDate: setGlobalDecisionDate } =
    useResearchContext();

  const [intake, setIntake] = useState<InvestigationIntakeState>(() =>
    createDefaultInvestigationState(globalDecisionDate ?? "1974-08-12"),
  );
  const [activePresetId, setActivePresetId] = useState<string>("preset-blank-not-sure");
  const [checkedRecords, setCheckedRecords] = useState<Record<string, boolean>>({});
  const [pathwayFilter, setPathwayFilter] = useState<"all" | "active-only">("all");
  const [selectedTwoPaneSlug, setSelectedTwoPaneSlug] = useState<string>("38-cfr-4.56");

  const report = useMemo(
    () => evaluateInvestigationSession(intake, cfrVersions),
    [intake, cfrVersions],
  );

  const activeTwoPaneSection = useMemo(() => {
    return (
      cfrSections.find((s) => s.sectionSlug === selectedTwoPaneSlug) ??
      cfrSections[0] ??
      null
    );
  }, [cfrSections, selectedTwoPaneSlug]);

  const activeProvenanceTranscriptionLevel = useMemo<
    "Verbatim Primary Source" | "Structured Summary Only"
  >(() => {
    if (!activeTwoPaneSection) return "Verbatim Primary Source";
    const resolved = resolveCfrAtDate(
      [...activeTwoPaneSection.versions, ...activeTwoPaneSection.quarantinedWatchlist],
      activeTwoPaneSection.sectionSlug,
      report.intake.decisionDate,
    );
    return resolved.doNotRely || resolved.coverageState === "SUMMARY_ONLY"
      ? "Structured Summary Only"
      : "Verbatim Primary Source";
  }, [activeTwoPaneSection, report.intake.decisionDate]);

  const activePathwayCount = report.pathways.filter(
    (p) => p.disposition !== "barred-or-inapplicable",
  ).length;
  const barredPathwayCount = report.pathways.length - activePathwayCount;

  const visiblePathways =
    pathwayFilter === "active-only"
      ? report.pathways.filter((p) => p.disposition !== "barred-or-inapplicable")
      : report.pathways;

  function applyPreset(presetId: string) {
    const found = INVESTIGATION_SCENARIO_PRESETS.find((p) => p.presetId === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setIntake({
      ...found.state,
      answers: { ...found.state.answers },
    });
    setCheckedRecords({});
    setGlobalDecisionDate(found.state.decisionDate);
  }

  function handleDecisionDateChange(nextIso: string) {
    setActivePresetId("custom");
    setIntake((prev) => ({ ...prev, decisionDate: nextIso }));
    if (/^\d{4}-\d{2}-\d{2}$/.test(nextIso)) {
      setGlobalDecisionDate(nextIso);
    }
  }

  function handleAnswerChange(factId: string, val: TriValue) {
    setActivePresetId("custom");
    setIntake((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [factId]: val,
      },
    }));
  }

  return (
    <div className="min-w-0 space-y-8">
      {/* Top Privacy & Honest Wave Scope Strip */}
      <section
        aria-label="On-device privacy and corpus scope"
        className="space-y-3 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              100% On-Device Browser Memory · Zero Network Calls · Zero URL Query Leakage
            </span>
          </div>

          <button
            type="button"
            onClick={() => applyPreset("preset-blank-not-sure")}
            className="no-print inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 py-1.5 font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Reset Session to &ldquo;I&apos;m Not Sure&rdquo;</span>
          </button>
        </div>

        <p className="text-muted-foreground">
          <strong className="text-foreground">Three-Valued Preservation Rule:</strong>{" "}
          Selecting <strong>&ldquo;I&apos;m Not Sure&rdquo;</strong> (or{" "}
          <code className="font-mono text-[11px]">Unknown</code>) never drops a candidate
          legal pathway. Instead, it keeps the option open and adds the exact military or
          VA record needed to check that fact to{" "}
          <strong className="text-foreground">Records to Locate &amp; Why</strong> below.
        </p>

        <div className="flex flex-wrap items-start gap-2 rounded border border-border/80 bg-surface-elevated p-2.5 text-[11px] text-muted-foreground">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words">
            <strong className="text-foreground">
              Honest Coverage Scope (Bookmark {activeBookmarkWave}):
            </strong>{" "}
            Point-in-time regulation coupling is live today for{" "}
            <Link
              href="/cfr/38-cfr-3.156c"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              38 C.F.R. § 3.156(c)
            </Link>{" "}
            (verbatim 1962–present),{" "}
            <Link
              href="/cfr/38-cfr-4.56"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              § 4.56 Muscle Injuries
            </Link>{" "}
            (verbatim 1946–present), and{" "}
            <Link
              href="/cfr/38-cfr-4.118"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              § 4.118 Scars
            </Link>{" "}
            <LexiconText text="(verbatim 1946–2008; structured summary 2008–present — pull official print CFR before pleading post-2008 scar CUE). Additional domain modules (such as Agent Orange Nehmer § 3.816, Void Rating Reductions § 3.105(e), and Survivor DIC / § 1318) are scheduled in Waves W2–W5 and linked via" />{" "}
            <Link
              href="/cfr"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              /cfr
            </Link>{" "}
            and{" "}
            <Link
              href="/explore"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              /explore
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Scenario Presets Bar */}
      <section
        aria-labelledby="scenario-presets-heading"
        className="no-print space-y-2.5 rounded-lg border border-border bg-surface-elevated p-4"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <h2 id="scenario-presets-heading">
            Load an Example Historical Scenario (Optional — In-Memory Only)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {INVESTIGATION_SCENARIO_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.presetId;
            return (
              <button
                key={preset.presetId}
                type="button"
                data-testid={`preset-${preset.presetId}`}
                aria-pressed={isSelected}
                onClick={() => applyPreset(preset.presetId)}
                className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1.5 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:bg-muted"
                }`}
              >
                <span data-persona="veteran-only">{preset.veteranLabel}</span>
                <span data-persona="practitioner-only">{preset.practitionerLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 1: Decision Date, Posture & Jurisdictional Gate Inputs */}
      <section
        aria-labelledby="step1-intake-heading"
        className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5"
      >
        <div className="border-b border-border pb-3">
          <h2
            id="step1-intake-heading"
            className="font-serif text-xl font-bold text-foreground"
          >
            <span data-persona="veteran-only">
              Step 1 — Basic Clues About the Older VA Decision
            </span>
            <span data-persona="practitioner-only">
              Step 1 — Challenged Decision Posture, Date (T₀) &amp; Jurisdictional Gates
            </span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter whatever you know from your decision letter or Rating Code Sheet. Leave
            anything uncertain set to <strong>I&apos;m Not Sure</strong>.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="min-w-0 space-y-1.5 rounded-md border border-border bg-surface-elevated p-3.5">
            <label
              htmlFor="investigate-decision-date"
              className="block text-xs font-semibold text-foreground"
            >
              <span data-persona="veteran-only">
                Challenged VA Decision Date (YYYY-MM-DD)
              </span>
              <span data-persona="practitioner-only">
                Target Decision Date T₀ (YYYY-MM-DD)
              </span>
            </label>
            <input
              id="investigate-decision-date"
              type="date"
              min="1933-03-20"
              max="2026-12-31"
              value={intake.decisionDate}
              onChange={(e) => handleDecisionDateChange(e.target.value)}
              className="min-h-9 w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Resolves exact historical 38 C.F.R. snapshots, statutory numbering era, and
              July 21, 1992 <em>Bell</em> record rules.
            </p>
          </div>

          <div className="min-w-0 space-y-1.5 rounded-md border border-border bg-surface-elevated p-3.5">
            <label
              htmlFor="investigate-agency-select"
              className="block text-xs font-semibold text-foreground"
            >
              <span data-persona="veteran-only">Which VA Office Issued That Decision?</span>
              <span data-persona="practitioner-only">Adjudicating Agency at T₀</span>
            </label>
            <select
              id="investigate-agency-select"
              value={intake.decisionAgency}
              onChange={(e) => {
                setActivePresetId("custom");
                setIntake((prev) => ({
                  ...prev,
                  decisionAgency: e.target.value as DecisionAgency,
                }));
              }}
              className="min-h-9 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="unknown">I&apos;m Not Sure (Check C-File)</option>
              <option value="AOJ-RO">VA Regional Office (Rating Decision)</option>
              <option value="BVA">Board of Veterans&apos; Appeals (BVA Decision)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              <LexiconText text="Distinguishes Regional Office (RO) CUE (§ 3.105(a)) from BVA CUE (§ 7111)." />
            </p>
          </div>

          <div className="min-w-0 space-y-1.5 rounded-md border border-border bg-surface-elevated p-3.5">
            <label
              htmlFor="investigate-focus-select"
              className="block text-xs font-semibold text-foreground"
            >
              <span data-persona="veteran-only">Primary Situation or Body System Clue</span>
              <span data-persona="practitioner-only">Primary Issue / VASRD Focus</span>
            </label>
            <select
              id="investigate-focus-select"
              value={intake.issueFocus}
              onChange={(e) => {
                const nextFocus = e.target.value as IssueFocus;
                setActivePresetId("custom");
                setIntake((prev) => ({ ...prev, issueFocus: nextFocus }));
                if (nextFocus === "service-records-reconsideration") {
                  setSelectedTwoPaneSlug("38-cfr-3.156c");
                } else if (nextFocus === "penetrating-scar-muscle") {
                  setSelectedTwoPaneSlug("38-cfr-4.56");
                }
              }}
              className="min-h-9 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="penetrating-scar-muscle">
                Gunshot / Shrapnel Wound (0%–10% Scar vs. Muscle Group)
              </option>
              <option value="service-records-reconsideration">
                Missing Military or Inpatient Surgical Records (§ 3.156(c))
              </option>
              <option value="finality-nod-informal-notice">
                Unanswered NOD / Pre-2015 Informal Claim / Wrong-Address Mail
              </option>
              <option value="general-collateral-review">
                General Historical Rating or Board Decision Audit
              </option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Sets the default 38 C.F.R. section in the Two-Pane Temporal comparison below.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TriValueSelector
            testIdPrefix="gate-bva-subsumed"
            legendVeteran="Did the Board of Veterans' Appeals (BVA) ever review and decide this exact issue on the merits?"
            legendPractitioner="Did a BVA merits decision decide or subsume this exact issue (38 C.F.R. § 20.1104; Manning)?"
            helpVeteran="If BVA decided the issue later, RO CUE no longer applies—though § 3.156(c) missing military records still work."
            notePractitioner="If YES, AOJ CUE under § 5109A / § 3.105(a) is jurisdictionally barred."
            value={intake.bvaMeritsSubsumed}
            onChange={(val) => {
              setActivePresetId("custom");
              setIntake((prev) => ({ ...prev, bvaMeritsSubsumed: val }));
            }}
            unknownRecordHint="Complete BVA Decision & VACOLS Appeal History"
          />

          <TriValueSelector
            testIdPrefix="gate-prior-bva-cue"
            legendVeteran="Has BVA already issued a final merits decision on a prior BVA CUE motion on this exact issue?"
            legendPractitioner="Prior final merits Subpart O ruling on this Board issue (38 C.F.R. § 20.1409(c))?"
            helpVeteran="Note: Dismissals 'without prejudice' for wording specificity (§ 20.1404) do NOT count as a merits denial."
            notePractitioner="One final merits CUE decision per prior Board decision on an issue (§ 20.1409(c)); excludes § 20.1404 dismissals."
            value={intake.priorBvaCueDecidedOnMerits}
            onChange={(val) => {
              setActivePresetId("custom");
              setIntake((prev) => ({ ...prev, priorBvaCueDecidedOnMerits: val }));
            }}
            unknownRecordHint="VBMS Prior BVA CUE Motion & Docket Search"
          />

          <div className="min-w-0 space-y-2 rounded-md border border-border bg-surface-elevated p-3.5">
            <label
              htmlFor="investigate-retiree-select"
              className="block text-xs font-semibold leading-relaxed text-foreground"
            >
              <span data-persona="veteran-only">
                Did you retire from the military (20-year or Chapter 61 medical retirement)?
              </span>
              <span data-persona="practitioner-only">
                Military Retiree Status (Title 10 DoD CRSC Screen — Soto v. United States)
              </span>
            </label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <LexiconText text="Screens separate DoD / DFAS Combat-Related Special Compensation (CRSC, 10 U.S.C. § 1413a) arrears after a retroactive combat-related VA award." />
            </p>
            <select
              id="investigate-retiree-select"
              value={intake.retireeStatus}
              onChange={(e) => {
                setActivePresetId("custom");
                setIntake((prev) => ({
                  ...prev,
                  retireeStatus: e.target.value as RetireeProfile,
                }));
              }}
              className="min-h-9 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="unknown">I&apos;m Not Sure / Verify DD-214</option>
              <option value="military-retiree-or-ch61">
                Yes — 20-Year or Chapter 61 Medical Retiree
              </option>
              <option value="none">No — Separated Non-Retiree</option>
            </select>
          </div>
        </div>
      </section>

      {/* Step 2: Grouped Three-Valued Evidence & Procedural Questions */}
      <section
        aria-labelledby="step2-questions-heading"
        className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5"
      >
        <div className="border-b border-border pb-3">
          <h2
            id="step2-questions-heading"
            className="font-serif text-xl font-bold text-foreground"
          >
            <span data-persona="veteran-only">
              Step 2 — Evidence &amp; Paperwork Questions (Yes / No / I&apos;m Not Sure)
            </span>
            <span data-persona="practitioner-only">
              Step 2 — Three-Valued Evidentiary Preconditions (Yes / No / Unknown)
            </span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every <strong>&ldquo;I&apos;m Not Sure&rdquo;</strong> answer keeps candidate
            pathways alive while building your tailored record-request list below.
          </p>
        </div>

        <div className="space-y-5">
          {QUESTION_GROUPS.map((grp) => {
            const questions = WAVE1_SCREENING_QUESTIONS.filter(
              (q) => q.group === grp.group,
            );
            return (
              <div key={grp.group} className="space-y-2.5">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    <span data-persona="veteran-only">{grp.veteranHeading}</span>
                    <span data-persona="practitioner-only">
                      {grp.practitionerHeading}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    <LexiconText text={grp.description} />
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {questions.map((q) => (
                    <TriValueSelector
                      key={q.factId}
                      testIdPrefix={`fact-${q.factId}`}
                      legendVeteran={q.veteranQuestion}
                      legendPractitioner={q.practitionerQuestion}
                      helpVeteran={q.veteranHelp}
                      notePractitioner={q.practitionerAuthorityNote}
                      value={intake.answers[q.factId] ?? "unknown"}
                      onChange={(val) => handleAnswerChange(q.factId, val)}
                      unknownRecordHint={q.missingRecord.documentName}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Step 3: Prioritized "Records to Locate & Why" Desk */}
      <section
        aria-labelledby="records-to-locate-heading"
        data-testid="records-to-locate-section"
        className="space-y-4 rounded-lg border border-border bg-surface-elevated p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <FileSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Step 3 — Records to Locate &amp; Why (
                {report.prioritizedRecordsToLocate.length} Priority{" "}
                {report.prioritizedRecordsToLocate.length === 1 ? "Item" : "Items"})
              </span>
            </div>
            <h2
              id="records-to-locate-heading"
              className="mt-0.5 font-serif text-xl font-bold text-foreground"
            >
              <span data-persona="veteran-only">
                Military &amp; VA Records That Will Clarify Your &ldquo;I&apos;m Not Sure&rdquo; Answers
              </span>
              <span data-persona="practitioner-only">
                Deduplicated Evidentiary Production &amp; C-File Audit Checklist
              </span>
            </h2>
          </div>
        </div>

        {report.prioritizedRecordsToLocate.length === 0 ? (
          <div className="rounded-md border border-border bg-surface p-4 text-xs text-muted-foreground">
            <LexiconText text="All screening preconditions currently have explicit Yes or No answers—no unresolved record gaps flagged. Bring your underlying Rating Decisions, Rating Code Sheets, and DD-214 when reviewing candidate pathways below." />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {report.prioritizedRecordsToLocate.map((rec) => {
              const isChecked = Boolean(checkedRecords[rec.recordId]);
              const checkboxId = `rec-check-${rec.recordId}`;
              return (
                <div
                  key={rec.recordId}
                  className="min-w-0 space-y-2 rounded-md border border-border bg-surface p-3.5 text-xs leading-relaxed"
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setCheckedRecords((prev) => ({
                          ...prev,
                          [rec.recordId]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                    />
                    <label
                      htmlFor={checkboxId}
                      className={`cursor-pointer font-semibold text-foreground ${
                        isChecked ? "line-through opacity-75" : ""
                      }`}
                    >
                      <LexiconText text={rec.documentName} />
                    </label>
                  </div>

                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Why It Matters: </strong>
                    <LexiconText text={rec.whyItMatters} />
                  </p>

                  <p data-persona="veteran-only" className="text-muted-foreground">
                    <strong className="text-foreground">How to Request: </strong>
                    <LexiconText text={rec.howToRequest} />
                  </p>
                  <p data-persona="practitioner-only" className="text-muted-foreground">
                    <strong className="text-foreground">C-File Audit Step: </strong>
                    <LexiconText text={rec.practitionerAuditNote} />
                  </p>

                  <div className="border-t border-border/70 pt-1.5 text-[11px] text-primary">
                    <span className="font-semibold">Helps Resolve: </span>
                    <span data-persona="veteran-only" className="break-words">
                      <LexiconText
                        text={rec.unlocksPathwayTitlesVeteran.join(" · ")}
                      />
                    </span>
                    <span data-persona="practitioner-only" className="break-words">
                      <LexiconText text={rec.unlocksPathwayTitles.join(" · ")} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 4: Ranked Explainable Pathway Cards + Title 10 CRSC Check */}
      <section aria-labelledby="ranked-pathways-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Scale className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span data-persona="veteran-only">
                <LexiconText
                  text={`Step 4 — Open-Review-First Option Ranking (${activePathwayCount} Active / Open · ${barredPathwayCount} Not Matched)`}
                />
              </span>
              <span data-persona="practitioner-only">
                Step 4 — Non-CUE-First Pathway Ranking ({activePathwayCount} Active / Open ·{" "}
                {barredPathwayCount} Barred or Unmatched)
              </span>
            </div>
            <h2
              id="ranked-pathways-heading"
              className="font-serif text-xl font-bold text-foreground"
            >
              <span data-persona="veteran-only">
                <LexiconText text="Options Ordered From Safest Open Review to Strictest CUE Rules" />
              </span>
              <span data-persona="practitioner-only">
                Explainable Candidate Vehicles, T₀ Snapshots &amp; Kill Switches
              </span>
            </h2>
          </div>

          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={pathwayFilter === "all"}
              onClick={() => setPathwayFilter("all")}
              className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1.5 text-xs font-semibold ${
                pathwayFilter === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              All Pathways ({report.pathways.length})
            </button>
            <button
              type="button"
              aria-pressed={pathwayFilter === "active-only"}
              onClick={() => setPathwayFilter("active-only")}
              className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1.5 text-xs font-semibold ${
                pathwayFilter === "active-only"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              Open / Supported Only ({activePathwayCount})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {visiblePathways.map((pathway) => (
            <PathwayRankCard key={pathway.pathwayId} pathway={pathway} />
          ))}
        </div>

        {/* Cross-System Title 10 DoD CRSC Card */}
        <div
          data-testid="crsc-soto-advisory"
          className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <CheckSquare className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <LexiconText text="Cross-System Military Retiree Check: Title 10 DoD / DFAS CRSC (Soto v. United States, 2025)" />
              </span>
            </div>
            <span className="rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              <LexiconText text="10 U.S.C. § 1413a (DoD / DFAS — Separate From Title 38 VA)" />
            </span>
          </div>
          <p data-persona="veteran-only" className="mt-1.5 text-muted-foreground">
            <LexiconText text={report.retireeCrscAdvisory.veteranNote} />
          </p>
          <p data-persona="practitioner-only" className="mt-1.5 text-muted-foreground">
            <LexiconText text={report.retireeCrscAdvisory.practitionerNote} />
          </p>
        </div>

        {/* Practitioner Mandatory 4-Gate Strip */}
        <div
          data-persona="practitioner-only"
          className="space-y-2.5 rounded-lg border border-border bg-surface-elevated p-4 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <span className="font-semibold text-foreground">
              Practitioner Pre-Filing Verification Gates
            </span>
            <Link
              href="/checklists/board-cue-pre-filing-gate"
              prefetch={false}
              className="inline-flex min-h-7 items-center gap-1 font-semibold text-primary hover:underline"
            >
              <span>Open Full 5-Gate Board CUE Checklist</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {report.practitionerVerificationGates.map((g) => (
              <div
                key={g.gateId}
                className="rounded border border-border bg-background p-3 leading-relaxed"
              >
                <div className="flex flex-wrap items-center justify-between gap-1 font-semibold text-foreground">
                  <span>{g.title}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                    {g.status === "barred" && (
                      <AlertTriangle className="h-3 w-3 text-accent" aria-hidden="true" />
                    )}
                    <span>
                      {g.status === "verified"
                        ? "Checked"
                        : g.status === "barred"
                          ? "Bar Alert"
                          : "Verify Before Filing"}
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  <LexiconText text={g.detail} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Step 5: Coupled Two-Pane Bitemporal Comparison (Unlocked Wave 1 Sections Only) */}
      {activeTwoPaneSection && (
        <section aria-label="Coupled two-pane bitemporal regulation view" className="space-y-3">
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Inspect Coupled Two-Pane Regulation Snapshot on{" "}
              <strong className="font-mono text-foreground">{intake.decisionDate}</strong>:
            </span>
            <div className="flex flex-wrap gap-2">
              {cfrSections.map((sec) => {
                const active = sec.sectionSlug === activeTwoPaneSection.sectionSlug;
                return (
                  <button
                    key={sec.sectionSlug}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedTwoPaneSlug(sec.sectionSlug)}
                    className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1 text-xs font-semibold ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    {sec.cfrSection}
                  </button>
                );
              })}
            </div>
          </div>

          <TwoPaneTemporalView
            section={activeTwoPaneSection}
            effectiveDecisionDate={report.intake.decisionDate}
          />
        </section>
      )}

      {/* Step 6: Exportable Discussion & Pre-Filing Audit Packet + Source Provenance */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <PacketExportPanel report={report} stamp={stamp} />
        </div>
        <div className="min-w-0">
          <SourceProvenancePanel
            officialCitation="38 U.S.C. §§ 5104(b), 5109A, 5110, 7111 · 38 C.F.R. §§ 3.105(a), 3.156(b)–(c), 4.14, 4.56, 4.118, 20.1400–20.1411"
            publicationDate="Multi-Era Compiled Index"
            effectiveFrom="1946-04-01"
            effectiveTo="present"
            transcriptionLevel={activeProvenanceTranscriptionLevel}
            checkedAsOf={stamp.checkedAsOf}
            corpusReleaseId={stamp.corpusReleaseId}
            bookmarkWave={activeBookmarkWave}
            primarySourceUrl="https://www.ecfr.gov/current/title-38"
            limitationsNote="Screening logic evaluates Wave 1 indexed rules strictly in client memory. Post-Oct. 23, 2008 § 4.118 scar criteria are Summary Only—always verify official print 38 C.F.R. text, § 4.25 combined math, and complete C-file evidence dates prior to filing."
          />
        </div>
      </div>
    </div>
  );
}
