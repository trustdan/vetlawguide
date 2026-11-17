"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  FileSearch,
  Layers,
  MessageSquare,
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
  SCREENING_QUESTIONS,
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
import { cn } from "@/lib/utils";
import { PacketExportPanel } from "./packet-export-panel";
import { PathwayRankCard } from "./pathway-rank-card";

type InvestigationStage = 1 | 2 | 3 | 4;

const STAGES: ReadonlyArray<{
  stage: InvestigationStage;
  veteranLabel: string;
  practitionerLabel: string;
}> = [
  {
    stage: 1,
    veteranLabel: "1. Decision basics",
    practitionerLabel: "1. Decision & posture",
  },
  {
    stage: 2,
    veteranLabel: "2. Records & appeals",
    practitionerLabel: "2. Records & finality",
  },
  {
    stage: 3,
    veteranLabel: "3. Rating & file clues",
    practitionerLabel: "3. Rating & CUE scope",
  },
  {
    stage: 4,
    veteranLabel: "4. Summary & packet",
    practitionerLabel: "4. Summary & packet",
  },
];

const QUESTION_GROUPS: ReadonlyArray<{
  group: FactQuestionGroup;
  stage: 2 | 3;
  specializedForFocus?: IssueFocus;
  veteranHeading: string;
  practitionerHeading: string;
  description: string;
}> = [
  {
    group: "service-records",
    stage: 2,
    veteranHeading: "A. Missing Military or Inpatient Hospital Records (38 C.F.R. § 3.156(c))",
    practitionerHeading:
      "A. Official Service Department & Inpatient Surgical Records (38 C.F.R. § 3.156(c))",
    description:
      "Checks whether pre-existing military or surgical records arrived (or can be requested) after the original decision.",
  },
  {
    group: "pending-finality",
    stage: 2,
    veteranHeading: "B. Unanswered Appeals, Hospital Notes & Mailing Clues",
    practitionerHeading:
      "B. Finality-Abating Events: NOD/SOC, § 3.156(b) Beraud/Lang, Pre-2015 § 3.157(b) & AMA § 5104(b)",
    description:
      "Checks whether the prior claim legally stayed open under benefit-of-the-doubt rules.",
  },
  {
    group: "void-reduction",
    stage: 2,
    veteranHeading: "C. Lowered or Severed Existing Ratings (38 C.F.R. §§ 3.105(e), 3.344, 3.951, 3.957)",
    practitionerHeading:
      "C. Void Rating Reductions & Statutory Shields (Brown v. Brown; §§ 3.105(e), 3.344, 3.951, 3.957)",
    description:
      "Checks whether VA lowered a stabilized 5-year, 10-year, or 20-year rating without lawful notice and sustained real-life improvement.",
  },
  {
    group: "scar-vs-muscle",
    stage: 3,
    specializedForFocus: "penetrating-scar-muscle",
    veteranHeading: "Gunshot, Shrapnel & Deep Wound Rating Clues",
    practitionerHeading:
      "Penetrating Wound Multi-Manifestation Clues (§ 4.56 Muscle vs. § 4.118 Scar)",
    description:
      "Checks whether VA assigned only a 0% or 10% skin scar code while omitting deep muscle-group and nerve ratings.",
  },
  {
    group: "tdiu-and-smc",
    stage: 3,
    specializedForFocus: "tdiu-or-smc",
    veteranHeading: "Unemployability (TDIU) & Special Monthly Compensation (SMC) Clues",
    practitionerHeading:
      "Inferred TDIU (§ 4.16; Roberson) & Mandatory Statutory SMC (§ 1114(k)–(t); Buie / Barry / Laska)",
    description:
      "Checks whether work-loss evidence or loss-of-use / housebound / Aid and Attendance facts were left unaddressed.",
  },
  {
    group: "nehmer-herbicide",
    stage: 3,
    specializedForFocus: "nehmer-herbicide",
    veteranHeading: "Agent Orange / Herbicide Retroactive Effective Dates (Nehmer § 3.816)",
    practitionerHeading:
      "Nehmer Class-Action Effective Dates & Post-2021 Uncapped Payee Rules (38 C.F.R. § 3.816)",
    description:
      "Checks post-Sept. 25, 1985 herbicide claims, diagnostic-code mentions, and survivor/estate back-pay rules.",
  },
  {
    group: "survivor-dic-accrued",
    stage: 3,
    specializedForFocus: "survivor-dic-accrued",
    veteranHeading: "Survivor DIC (§ 1310 / § 1318 / PACT § 3.33), Substitution & Accrued Clues",
    practitionerHeading:
      "Chapter 13 DIC (§§ 3.22(b), 3.33, 3.312), Remarriage (§ 3.55) & 1-Year § 5121A Substitution",
    description:
      "Screens surviving spouse/family monthly DIC, PACT DIC re-evaluation, and claims pending at the Veteran's death.",
  },
  {
    group: "cod-discharge",
    stage: 3,
    specializedForFocus: "cod-or-insanity",
    veteranHeading: "OTH / Discharge Bar, Prior Enlistment (§ 3.13) & Insanity (§ 3.354(b)) Clues",
    practitionerHeading:
      "Character of Discharge (June 25, 2024 § 3.12 Overhaul), § 3.13(c) & § 3.354(b) Insanity",
    description:
      "Checks earlier honorable enlistments, mental-health insanity exceptions, and June 2024 compelling-circumstances factors.",
  },
  {
    group: "severance-recoupment",
    stage: 3,
    specializedForFocus: "severance-recoupment",
    veteranHeading: "Military Disability Severance & Separation Pay Withholding Clues",
    practitionerHeading:
      "Combat-Zone Severance Non-Recoupment (10 U.S.C. § 1212(d)(2)) & After-Tax Cap (§ 3.700(a)(3))",
    description:
      "Audits post-Jan. 28, 2008 combat severance exemptions, post-Sept. 1996 after-tax caps, and monthly withholding limits.",
  },
  {
    group: "cue-record-and-math",
    stage: 3,
    veteranHeading: "Record-at-the-Time & Monthly Payment Impact Clues (For RO / BVA CUE)",
    practitionerHeading:
      "Collateral CUE Record Scope (Bell) & § 4.25 Combined-Payment Math",
    description:
      "Checks the strict record-at-the-time and combined-math rules needed before considering Regional Office or Board CUE.",
  },
];

const AGENCY_LABELS: Record<DecisionAgency, string> = {
  unknown: "Not sure yet (check C-file)",
  "AOJ-RO": "VA Regional Office (Rating Decision)",
  BVA: "Board of Veterans' Appeals (BVA)",
};

const FOCUS_LABELS: Record<IssueFocus, string> = {
  "penetrating-scar-muscle": "Gunshot / shrapnel wound (scar vs. muscle)",
  "service-records-reconsideration": "Missing military or inpatient surgical records",
  "finality-nod-informal-notice": "Unanswered appeal, informal claim, or wrong-address mail",
  "stabilized-reduction-or-severance": "Lowered or severed existing disability rating",
  "tdiu-or-smc": "Unemployability (TDIU) or Special Monthly Compensation (SMC)",
  "nehmer-herbicide": "Agent Orange / herbicide retroactive award (Nehmer)",
  "survivor-dic-accrued": "Survivor DIC (§ 1318 / PACT), substitution, or accrued pay",
  "cod-or-insanity": "OTH / Character of Discharge bar or insanity exception",
  "severance-recoupment": "Military disability severance or separation pay recoupment",
  "general-collateral-review": "General historical rating or Board decision review",
};

function defaultTwoPaneSlugForFocus(focus: IssueFocus): string {
  switch (focus) {
    case "service-records-reconsideration":
      return "38-cfr-3.156c";
    case "stabilized-reduction-or-severance":
      return "38-cfr-3.344";
    case "tdiu-or-smc":
      return "38-cfr-4.16a-b";
    case "nehmer-herbicide":
      return "38-cfr-3.816";
    case "survivor-dic-accrued":
      return "38-cfr-3.22";
    case "cod-or-insanity":
      return "38-cfr-3.12a-l";
    case "severance-recoupment":
      return "38-cfr-3.700a3-5";
    default:
      return "38-cfr-4.56";
  }
}

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
          className="font-mono text-xs leading-relaxed text-muted-foreground"
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
        <p className="text-xs leading-relaxed text-primary">
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

  const [activeStage, setActiveStage] = useState<InvestigationStage>(1);
  const [intake, setIntake] = useState<InvestigationIntakeState>(() =>
    createDefaultInvestigationState(globalDecisionDate ?? "1974-08-12"),
  );
  const [draftDecisionDate, setDraftDecisionDate] = useState<string>(
    () => globalDecisionDate ?? "1974-08-12",
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

  const activePathways = useMemo(
    () => report.pathways.filter((p) => p.disposition !== "barred-or-inapplicable"),
    [report.pathways],
  );
  const activePathwayCount = activePathways.length;
  const barredPathwayCount = report.pathways.length - activePathwayCount;

  const visiblePathways =
    pathwayFilter === "active-only" ? activePathways : report.pathways;

  // Count Yes / No / Unknown across screening answers + jurisdictional gates
  const answerCounts = useMemo(() => {
    const allVals: TriValue[] = [
      intake.bvaMeritsSubsumed,
      intake.priorBvaCueDecidedOnMerits,
      ...SCREENING_QUESTIONS.map((q) => intake.answers[q.factId] ?? "unknown"),
    ];
    return {
      yes: allVals.filter((v) => v === "yes").length,
      no: allVals.filter((v) => v === "no").length,
      unknown: allVals.filter((v) => v === "unknown").length,
    };
  }, [intake]);

  // Deduplicated plain-English questions to discuss from active/open pathways
  const topDiscussionQuestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const pw of activePathways) {
      for (const q of pw.veteranDiscussionQuestions) {
        if (!seen.has(q)) {
          seen.add(q);
          out.push(q);
        }
      }
    }
    return out.slice(0, 8);
  }, [activePathways]);

  function applyPreset(presetId: string) {
    const found = INVESTIGATION_SCENARIO_PRESETS.find((p) => p.presetId === presetId);
    if (!found) return;
    setActivePresetId(presetId);
    setIntake({
      ...found.state,
      answers: { ...found.state.answers },
    });
    setDraftDecisionDate(found.state.decisionDate);
    setCheckedRecords({});
    setSelectedTwoPaneSlug(defaultTwoPaneSlugForFocus(found.state.issueFocus));
    setGlobalDecisionDate(found.state.decisionDate);
    // Blank reset returns to Stage 1; named scenario presets open Stage 4 Summary directly
    setActiveStage(presetId === "preset-blank-not-sure" ? 1 : 4);
  }

  function handleDecisionDateChange(nextIso: string) {
    setActivePresetId("custom");
    setDraftDecisionDate(nextIso);
    if (/^\d{4}-\d{2}-\d{2}$/.test(nextIso)) {
      setIntake((prev) => ({ ...prev, decisionDate: nextIso }));
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

  const activeSpecializedGroup: FactQuestionGroup = useMemo(() => {
    const matched = QUESTION_GROUPS.find(
      (g) => g.stage === 3 && g.specializedForFocus === intake.issueFocus,
    );
    return matched ? matched.group : "scar-vs-muscle";
  }, [intake.issueFocus]);

  function handleMarkUnrelatedTopicsNo() {
    setActivePresetId("custom");
    setIntake((prev) => {
      const nextAnswers = { ...prev.answers };
      for (const grp of QUESTION_GROUPS) {
        if (
          grp.stage === 3 &&
          grp.specializedForFocus &&
          grp.group !== activeSpecializedGroup
        ) {
          for (const q of SCREENING_QUESTIONS) {
            if (q.group === grp.group && (nextAnswers[q.factId] ?? "unknown") === "unknown") {
              nextAnswers[q.factId] = "no";
            }
          }
        }
      }
      return {
        ...prev,
        answers: nextAnswers,
      };
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Compact Scope, Privacy & Example Presets Header */}
      <section
        aria-label="On-device privacy and supported screening scope"
        className="space-y-3 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              On-Device Browser Memory · Zero Network Calls · &ldquo;I&apos;m Not Sure&rdquo;
              Keeps Options Open
            </span>
          </div>

          <button
            type="button"
            onClick={() => applyPreset("preset-blank-not-sure")}
            className="no-print inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 py-1.5 font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Reset to &ldquo;I&apos;m Not Sure&rdquo;</span>
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-2 rounded border border-border/80 bg-surface-elevated p-2.5 text-xs text-muted-foreground">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words">
            <strong className="text-foreground">Full-Corpus Screening Scope:</strong>{" "}
            <span data-persona="veteran-only">
              <LexiconText text="Matches exact regulations on your decision date and checks safest open-review options before strict CUE rules across" />
            </span>
            <span data-persona="practitioner-only">
              <LexiconText text="Couples point-in-time 38 C.F.R. text and non-CUE-first ranking across" />
            </span>{" "}
            <Link
              href="/cfr/38-cfr-3.156c"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              § 3.156(c) service records
            </Link>
            ,{" "}
            <Link
              href="/playbooks/05-void-rating-reductions-stabilized-ratings"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              § 3.344 void reductions
            </Link>
            , pending appeals,{" "}
            <Link
              href="/cfr/38-cfr-3.816"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              § 3.816 Nehmer
            </Link>
            ,{" "}
            <LexiconText text="TDIU & SMC, Survivor DIC (§ 1318 / § 3.33) & Substitution (§ 5121A)," />{" "}
            <Link
              href="/cfr/38-cfr-3.12a-l"
              prefetch={false}
              className="font-semibold text-primary underline"
            >
              2024 § 3.12 discharge &amp; insanity
            </Link>
            ,{" "}
            <LexiconText text="combat severance recoupment (§ 1212(d)(2)), penetrating wounds (§ 4.56 / § 4.118), and RO / BVA CUE gates." />
          </p>
        </div>

        {/* Example Scenarios Row */}
        <div className="no-print flex flex-wrap items-center gap-2 pt-0.5">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Example scenarios:</span>
          </span>
          {INVESTIGATION_SCENARIO_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.presetId;
            return (
              <button
                key={preset.presetId}
                type="button"
                data-testid={`preset-${preset.presetId}`}
                aria-pressed={isSelected}
                onClick={() => applyPreset(preset.presetId)}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface-elevated text-foreground hover:bg-muted",
                )}
              >
                <span data-persona="veteran-only">{preset.veteranLabel}</span>
                <span data-persona="practitioner-only">{preset.practitionerLabel}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive 4-Stage Progress Indicator (Browser Memory Only) */}
      <nav
        aria-label="Investigation steps"
        className="no-print rounded-xl border border-border bg-surface-elevated p-2"
      >
        <ol className="grid gap-2 sm:grid-cols-4">
          {STAGES.map((item) => {
            const isCurrent = activeStage === item.stage;
            return (
              <li key={item.stage} className="min-w-0">
                <button
                  type="button"
                  data-testid={`stage-tab-${item.stage}`}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => setActiveStage(item.stage)}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:bg-muted",
                  )}
                >
                  <span data-persona="veteran-only" className="truncate">
                    {item.veteranLabel}
                  </span>
                  <span data-persona="practitioner-only" className="truncate">
                    {item.practitionerLabel}
                  </span>
                  {item.stage === 4 && (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 font-mono text-xs",
                        isCurrent
                          ? "bg-background/20 text-primary-foreground"
                          : "bg-background text-muted-foreground",
                      )}
                    >
                      {report.prioritizedRecordsToLocate.length} rec
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* STAGE 1: Decision Basics & Jurisdictional Gates */}
      {activeStage === 1 && (
        <section
          aria-labelledby="stage1-intake-heading"
          className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
        >
          <div className="border-b border-border pb-3">
            <h2
              id="stage1-intake-heading"
              className="font-serif text-xl font-bold text-foreground"
            >
              <span data-persona="veteran-only">
                Stage 1 of 4 — Basic Clues About the Older VA Decision
              </span>
              <span data-persona="practitioner-only">
                Stage 1 of 4 — Challenged Decision Posture, Date (T₀) &amp; Gates
              </span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter whatever you know from your decision letter or Rating Code Sheet.
              Leave anything uncertain set to <strong>I&apos;m Not Sure</strong>.
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
                value={draftDecisionDate}
                onChange={(e) => handleDecisionDateChange(e.target.value)}
                className="min-h-9 w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              />
              {!/^\d{4}-\d{2}-\d{2}$/.test(draftDecisionDate) && (
                <p
                  role="status"
                  className="text-xs font-medium text-accent"
                >
                  Enter a complete YYYY-MM-DD date (holding {intake.decisionDate} so your answers stay intact).
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Resolves historical 38 C.F.R. text, statutory era, and July 21, 1992{" "}
                <em>Bell</em> record rules.
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
              <p className="text-xs text-muted-foreground">
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
                  setSelectedTwoPaneSlug(defaultTwoPaneSlugForFocus(nextFocus));
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
                <option value="stabilized-reduction-or-severance">
                  Lowered or Severed Existing Rating (§§ 3.344 / 3.951 / 3.957)
                </option>
                <option value="tdiu-or-smc">
                  Unemployability (TDIU) or Special Monthly Compensation (SMC)
                </option>
                <option value="nehmer-herbicide">
                  Agent Orange / Herbicide Retroactive Claim (Nehmer § 3.816)
                </option>
                <option value="survivor-dic-accrued">
                  Survivor DIC (§ 1318 / PACT § 3.33), Substitution or Accrued
                </option>
                <option value="cod-or-insanity">
                  OTH / Character of Discharge Bar (§ 3.12) or Insanity (§ 3.354(b))
                </option>
                <option value="severance-recoupment">
                  Military Disability Severance Recoupment (§ 1212(d)(2) / § 3.700)
                </option>
                <option value="general-collateral-review">
                  General Historical Rating or Board Decision Audit
                </option>
              </select>
              <p className="text-xs text-muted-foreground">
                Sets the default 38 C.F.R. section in the temporal comparison on Stage 4.
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

          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setActiveStage(4)}
              className="text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-85"
            >
              Skip ahead to Summary ({report.prioritizedRecordsToLocate.length} records flagged)
            </button>
            <button
              type="button"
              data-testid="stage-next-btn"
              onClick={() => setActiveStage(2)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span>Continue to Stage 2: Records &amp; Appeals</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* STAGE 2 & STAGE 3: Concise Grouped Three-Valued Questions */}
      {(activeStage === 2 || activeStage === 3) && (
        <section
          aria-labelledby={`stage${activeStage}-questions-heading`}
          className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2
                id={`stage${activeStage}-questions-heading`}
                className="font-serif text-xl font-bold text-foreground"
              >
                {activeStage === 2 ? (
                  <>
                    <span data-persona="veteran-only">
                      Stage 2 of 4 — Service Records, Open Appeals &amp; Rating Reductions
                    </span>
                    <span data-persona="practitioner-only">
                      Stage 2 of 4 — § 3.156(c) Records, Pending Finality &amp; §§ 3.344 / 3.951 Shields
                    </span>
                  </>
                ) : (
                  <>
                    <span data-persona="veteran-only">
                      Stage 3 of 4 — Focused Benefit Clues &amp; Record-at-the-Time Checks
                    </span>
                    <span data-persona="practitioner-only">
                      Stage 3 of 4 — Substantive Entitlement Clues &amp; Collateral CUE Gates
                    </span>
                  </>
                )}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose <strong>Yes</strong>, <strong>No</strong>, or{" "}
                <strong>I&apos;m Not Sure</strong>. Unanswered items stay open and add the
                exact record to check on your Stage 4 summary.
              </p>
            </div>

            {activeStage === 3 && (
              <button
                type="button"
                data-testid="mark-unrelated-topics-no-btn"
                onClick={handleMarkUnrelatedTopicsNo}
                className="no-print inline-flex min-h-8 items-center rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                Mark unrelated specialized topics &ldquo;No&rdquo;
              </button>
            )}
          </div>

          {(() => {
            const stageGroups = QUESTION_GROUPS.filter((g) => g.stage === activeStage);
            const isPrimaryStage3Group = (grp: (typeof QUESTION_GROUPS)[number]) => {
              if (activeStage === 2) return true;
              if (!grp.specializedForFocus || grp.group === activeSpecializedGroup) {
                return true;
              }
              return SCREENING_QUESTIONS.some(
                (q) => q.group === grp.group && intake.answers[q.factId] === "yes",
              );
            };

            const primaryGroups = stageGroups.filter(isPrimaryStage3Group);
            const secondaryGroups = stageGroups.filter((g) => !isPrimaryStage3Group(g));

            const renderQuestionGroup = (grp: (typeof QUESTION_GROUPS)[number]) => {
              const questions = SCREENING_QUESTIONS.filter((q) => q.group === grp.group);
              return (
                <div key={grp.group} className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      <span data-persona="veteran-only">
                        <LexiconText text={grp.veteranHeading} />
                      </span>
                      <span data-persona="practitioner-only">
                        <LexiconText text={grp.practitionerHeading} />
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
            };

            return (
              <div className="space-y-5">
                {primaryGroups.map(renderQuestionGroup)}

                {secondaryGroups.length > 0 && (
                  <details
                    data-testid="additional-topic-clues-expander"
                    className="rounded-lg border border-border bg-surface-elevated p-3.5"
                  >
                    <summary className="cursor-pointer text-xs font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary">
                      <span data-persona="veteran-only">
                        Check {secondaryGroups.length} additional topic groups (TDIU/SMC,
                        Agent Orange Nehmer, Survivor DIC, Discharge Bars, Severance Pay)
                      </span>
                      <span data-persona="practitioner-only">
                        Expand {secondaryGroups.length} additional substantive screening
                        domains (§ 4.16 / SMC, § 3.816 Nehmer, § 1318 / § 5121A, § 3.12 COD,
                        § 1212(d)(2) Severance)
                      </span>
                    </summary>
                    <div className="mt-4 space-y-5 border-t border-border pt-4">
                      {secondaryGroups.map(renderQuestionGroup)}
                    </div>
                  </details>
                )}
              </div>
            );
          })()}

          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setActiveStage((activeStage - 1) as InvestigationStage)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Stage {activeStage - 1}</span>
            </button>

            <button
              type="button"
              data-testid="stage-next-btn"
              onClick={() => setActiveStage((activeStage + 1) as InvestigationStage)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span>
                {activeStage === 2
                  ? "Continue to Stage 3: Rating & File Clues"
                  : "View Stage 4: Your Summary & Packet"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* STAGE 4: Three Focused Summary Blocks (What you know · Records to find · Questions to discuss) */}
      {activeStage === 4 && (
        <div className="space-y-6">
          {/* BLOCK 1: What you know */}
          <section
            aria-labelledby="what-you-know-heading"
            data-testid="summary-what-you-know"
            className="space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <div className="text-xs font-semibold text-primary">
                  Summary Block 1 of 3
                </div>
                <h2
                  id="what-you-know-heading"
                  className="font-serif text-xl font-bold text-foreground"
                >
                  What you know
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveStage(1)}
                className="no-print inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-surface-elevated px-3 py-1 text-xs font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit answers</span>
              </button>
            </div>

            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <div className="text-muted-foreground">Decision Date &amp; Office</div>
                <div className="mt-1 font-mono text-sm font-bold text-foreground">
                  {intake.decisionDate}
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  {AGENCY_LABELS[intake.decisionAgency]}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <div className="text-muted-foreground">Primary Focus</div>
                <div className="mt-1 font-semibold text-foreground">
                  {FOCUS_LABELS[intake.issueFocus]}
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  {activePathwayCount} open/supported option
                  {activePathwayCount === 1 ? "" : "s"} · {barredPathwayCount} not matched
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                <div className="text-muted-foreground">Answers Recorded</div>
                <div className="mt-1 font-mono font-semibold text-foreground">
                  {answerCounts.yes} Yes · {answerCounts.no} No ·{" "}
                  {answerCounts.unknown} I&apos;m Not Sure
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  Stored strictly in browser memory
                </div>
              </div>
            </div>
          </section>

          {/* BLOCK 2: Records to find */}
          <section
            aria-labelledby="records-to-locate-heading"
            data-testid="records-to-locate-section"
            className="space-y-4 rounded-xl border border-border bg-surface-elevated p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <FileSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Summary Block 2 of 3 ({report.prioritizedRecordsToLocate.length}{" "}
                    Priority{" "}
                    {report.prioritizedRecordsToLocate.length === 1 ? "Item" : "Items"})
                  </span>
                </div>
                <h2
                  id="records-to-locate-heading"
                  className="mt-0.5 font-serif text-xl font-bold text-foreground"
                >
                  Records to find
                </h2>
              </div>
            </div>

            {report.prioritizedRecordsToLocate.length === 0 ? (
              <div className="rounded-md border border-border bg-surface p-4 text-xs text-muted-foreground">
                <LexiconText text="All screening questions currently have explicit Yes or No answers—no unresolved record gaps flagged. Bring your underlying Rating Decisions, Rating Code Sheets, and DD-214 when reviewing options below." />
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
                      <p
                        data-persona="practitioner-only"
                        className="text-muted-foreground"
                      >
                        <strong className="text-foreground">C-File Audit Step: </strong>
                        <LexiconText text={rec.practitionerAuditNote} />
                      </p>

                      <div className="border-t border-border/70 pt-1.5 text-xs text-primary">
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

          {/* BLOCK 3: Questions to discuss & Ranked Review Pathways */}
          <section
            aria-labelledby="questions-to-discuss-heading"
            data-testid="summary-questions-to-discuss"
            className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Summary Block 3 of 3 ({activePathwayCount} Active / Open ·{" "}
                    {barredPathwayCount} Not Matched)
                  </span>
                </div>
                <h2
                  id="questions-to-discuss-heading"
                  className="font-serif text-xl font-bold text-foreground"
                >
                  <span data-persona="veteran-only">Questions to discuss</span>
                  <span data-persona="practitioner-only">
                    Questions to discuss &amp; Explainable Candidate Vehicles
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
                      : "border-border bg-surface-elevated text-foreground hover:bg-muted"
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
                      : "border-border bg-surface-elevated text-foreground hover:bg-muted"
                  }`}
                >
                  Open / Supported Only ({activePathwayCount})
                </button>
              </div>
            </div>

            {/* Key Questions for Representative (Veteran Mode Lead) */}
            {topDiscussionQuestions.length > 0 && (
              <div
                data-persona="veteran-only"
                className="space-y-2 rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed"
              >
                <div className="font-semibold text-foreground">
                  <LexiconText text="Focused Questions to Bring to an Accredited VSO, Claims Agent, or Attorney:" />
                </div>
                <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                  {topDiscussionQuestions.map((q, idx) => (
                    <li key={idx}>
                      <LexiconText text={q} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ranked Pathway Cards (Safest Open Review First -> CUE Last) */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span data-persona="veteran-only">
                  Review options ordered from safest open review to strictest CUE rules:
                </span>
                <span data-persona="practitioner-only">
                  Non-CUE-first vehicle ranking, T₀ snapshots &amp; kill switches:
                </span>
              </div>
              {visiblePathways.map((pathway) => (
                <PathwayRankCard key={pathway.pathwayId} pathway={pathway} />
              ))}
            </div>

            {/* Cross-System Title 10 DoD CRSC Card */}
            <div
              data-testid="crsc-soto-advisory"
              className="rounded-lg border border-border bg-surface-elevated p-4 text-xs leading-relaxed"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <CheckSquare
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    <LexiconText text="Cross-System Military Retiree Check: Title 10 DoD / DFAS CRSC (Soto v. United States, 2025)" />
                  </span>
                </div>
                <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  <LexiconText text="10 U.S.C. § 1413a (DoD / DFAS — Separate From Title 38 VA)" />
                </span>
              </div>
              <p data-persona="veteran-only" className="mt-1.5 text-muted-foreground">
                <LexiconText text={report.retireeCrscAdvisory.veteranNote} />
              </p>
              <p
                data-persona="practitioner-only"
                className="mt-1.5 text-muted-foreground"
              >
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
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-primary">
                        {g.status === "barred" && (
                          <AlertTriangle
                            className="h-3 w-3 text-accent"
                            aria-hidden="true"
                          />
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

          {/* Expandable Coupled Two-Pane Bitemporal Comparison */}
          {activeTwoPaneSection && (
            <details className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer font-serif text-base font-bold text-foreground focus-visible:outline-2 focus-visible:outline-primary">
                Compare exact 38 C.F.R. text on {intake.decisionDate} vs. collateral
                limits today ({activeTwoPaneSection.cfrSection})
              </summary>
              <div className="mt-4 space-y-3 border-t border-border pt-3">
                <div className="no-print flex flex-wrap items-center gap-2">
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
                            : "border-border bg-surface-elevated text-foreground hover:bg-muted"
                        }`}
                      >
                        {sec.cfrSection}
                      </button>
                    );
                  })}
                </div>

                <TwoPaneTemporalView
                  section={activeTwoPaneSection}
                  effectiveDecisionDate={report.intake.decisionDate}
                />
              </div>
            </details>
          )}

          {/* Exportable Discussion & Pre-Filing Audit Packet + Quiet Provenance */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <PacketExportPanel report={report} stamp={stamp} />
            </div>
            <div className="min-w-0">
              <SourceProvenancePanel
                officialCitation="38 U.S.C. §§ 1114, 1310, 1318, 5104(b), 5109A, 5110, 5121A, 7111 · 10 U.S.C. §§ 1212(d)(2), 1413a · 38 C.F.R. §§ 3.12, 3.22, 3.105, 3.156, 3.344, 3.700, 3.816, 4.16, 4.56, 4.118, 20.1400–20.1411"
                publicationDate="Multi-Era Compiled Index"
                effectiveFrom="1946-04-01"
                effectiveTo="present"
                transcriptionLevel={activeProvenanceTranscriptionLevel}
                checkedAsOf={stamp.checkedAsOf}
                corpusReleaseId={stamp.corpusReleaseId}
                bookmarkWave={activeBookmarkWave}
                primarySourceUrl="https://www.ecfr.gov/current/title-38"
                limitationsNote="Screening logic evaluates supported full-corpus rules strictly in client memory. Post-Oct. 23, 2008 § 4.118 scar criteria and pre-indexed print CFR eras are Summary Only—always verify official annual print 38 C.F.R. text, § 4.25 combined math, and complete C-file evidence dates prior to filing."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
