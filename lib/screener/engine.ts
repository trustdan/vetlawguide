/**
 * Pure Client-Memory Three-Valued Screening & Bitemporal Investigation Engine (`lib/screener/`).
 *
 * Core Invariants (Rule 00, Rule 01, Rule 02, Rule 03, Rule 05, ADR-0004):
 * 1. Pure TypeScript: Zero React, Next.js, or `node:fs` imports.
 * 2. Strict Three-Valued Logic (`"yes" | "no" | "unknown"`):
 *    `"unknown"` ("I'm Not Sure") MUST NEVER evaluate as `"no"` or drop a candidate pathway.
 *    Any `"unknown"` precondition without an explicit disqualifier preserves the pathway in
 *    `"unresolved-records-needed"` and deduplicates the needed document into
 *    `prioritizedRecordsToLocate`.
 * 3. Bitemporal & 4-State Coverage Precision: Evaluates `resolveCfrAtDate` strictly on
 *    `effective_from <= decisionDate` (never `publication_date`), surfaces both
 *    `CORPUS_GAP_OR_QUEUED_WAVE` (`Do Not Rely`) and `SUMMARY_ONLY` print-CFR cautions,
 *    and quarantines unfinalized proposed rules (`90 FR 46542` proposed / not enacted).
 */

import {
  buildBitemporalTwoPaneContext,
  normalizeCfrSlug,
  resolveCfrAtDate,
} from "@/lib/corpus/temporal";
import type { CfrVersionRecord, CompiledCfrVersion } from "@/lib/corpus/types";
import type {
  CrossSystemRetireeAdvisory,
  EvaluatedInvestigationPathway,
  InvestigationEvaluationReport,
  InvestigationIntakeState,
  InvestigationScenarioPreset,
  MissingRecordChecklistItem,
  MissingRecordDefinition,
  PathwayDisposition,
  PointInTimeAuthorityLink,
  PractitionerVerificationGate,
  ScreeningFactQuestion,
  TriValue,
} from "./types";

export type { PathwayDisposition, TriValue } from "./types";

export interface ScreeningCondition {
  factId: string;
  questionLabel: string;
  requiredAnswer: "yes" | "no";
  missingRecordToLocate: {
    documentName: string;
    whyItMatters: string;
    howToRequest: string;
  };
  disqualifyingKillSwitch?: string;
}

export interface ScreeningPathwayDefinition {
  pathwayId: string;
  title: string;
  authorityCitations: string[];
  bitemporalNote: string;
  conditions: ScreeningCondition[];
  staticKillSwitches: string[];
}

export interface EvaluatedPathwayResult {
  pathwayId: string;
  title: string;
  disposition: PathwayDisposition;
  triggeredByAnswers: string[];
  blockingReasons: string[];
  recordsToLocate: Array<{
    factId: string;
    documentName: string;
    whyItMatters: string;
    howToRequest: string;
  }>;
  authorityCitations: string[];
  bitemporalNote: string;
  killSwitchesToVerify: string[];
}

export function evaluatePathway(
  definition: ScreeningPathwayDefinition,
  answers: Readonly<Record<string, TriValue | undefined>>,
): EvaluatedPathwayResult {
  const triggeredByAnswers: string[] = [];
  const blockingReasons: string[] = [];
  const recordsToLocate: EvaluatedPathwayResult["recordsToLocate"] = [];

  for (const cond of definition.conditions) {
    const actual: TriValue = answers[cond.factId] ?? "unknown";

    if (actual === cond.requiredAnswer) {
      triggeredByAnswers.push(`${cond.questionLabel}: ${actual.toUpperCase()}`);
    } else if (actual === "unknown") {
      recordsToLocate.push({
        factId: cond.factId,
        ...cond.missingRecordToLocate,
      });
    } else {
      blockingReasons.push(
        cond.disqualifyingKillSwitch ??
          `${cond.questionLabel} answered ${actual.toUpperCase()} (requires ${cond.requiredAnswer.toUpperCase()}).`,
      );
    }
  }

  let disposition: PathwayDisposition;
  if (blockingReasons.length > 0) {
    disposition = "barred-or-inapplicable";
  } else if (recordsToLocate.length > 0) {
    disposition = "unresolved-records-needed";
  } else {
    disposition = "supported-to-investigate";
  }

  return {
    pathwayId: definition.pathwayId,
    title: definition.title,
    disposition,
    triggeredByAnswers,
    blockingReasons,
    recordsToLocate,
    authorityCitations: definition.authorityCitations,
    bitemporalNote: definition.bitemporalNote,
    killSwitchesToVerify: definition.staticKillSwitches,
  };
}

// ---------------------------------------------------------------------------
// Canonical Evidentiary Record Definitions (Deduplicated by `recordId`)
// ---------------------------------------------------------------------------

const RECORD_NPRC_INPATIENT_SURGICAL: MissingRecordDefinition = {
  recordId: "nprc-inpatient-surgical-packet",
  documentName:
    "NPRC Inpatient Clinical / Surgical Ward Packet + Field Medical Card (DD Form 1380)",
  whyItMatters:
    "Military evacuation and base hospitals archived inpatient operative charts separately from routine outpatient Service Treatment Record (STR) jackets. Newly associating missing official service or surgical records triggers mandatory reconsideration under 38 C.F.R. § 3.156(c) without requiring undebatable CUE.",
  howToRequest:
    "Submit Standard Form 180 (SF 180) to the National Personnel Records Center (NPRC) specifically requesting 'Inpatient Clinical & Surgical Treatment Records' naming the military hospital/facility and approximate month/year, alongside a VA Form 20-10206 FOIA request for the C-file evidence list.",
  practitionerAuditNote:
    "Cross-check the prior Rating Decision's 'Evidence' list and C-file date stamps against NPRC inpatient clinical archives, morning reports, deck logs, or JSRRC stressor/unit records (Emerson v. McDonald, 28 Vet. App. 200 (2016)).",
  priorityOrder: 1,
};

const RECORD_CFILE_CODE_SHEET_AND_NARRATIVE: MissingRecordDefinition = {
  recordId: "va-cfile-rating-code-sheet",
  documentName:
    "Complete VA Claims File (C-File) + Historical Internal Rating Code Sheets",
  whyItMatters:
    "Cover letters often summarize decisions loosely. Only the internal VA Rating Code Sheet reveals exact 4-digit Diagnostic Codes (e.g., DC 7804 scar at 0% with zero DC 5301–5323 muscle code), statutory era citations, combined § 4.25 percentages, and listed evidence.",
  howToRequest:
    "File VA Form 20-10206 (FOIA / Privacy Act Request) asking for the complete VA Claims Folder (VBMS eFolder + any unindexed paper/microfiche Rating Code Sheets).",
  practitionerAuditNote:
    "Inspect earliest Rating Code Sheet for 4-digit DCs, hyphenated analogous codes (xx99-xxxx), raw vs. rounded § 4.25 combined values, and evidence physically before the adjudicator.",
  priorityOrder: 2,
};

const RECORD_PENDING_APPEAL_NOD_VAMC_AUDIT: MissingRecordDefinition = {
  recordId: "pending-nod-soc-vamc-audit",
  documentName:
    "Prior Correspondence, Legacy NOD / SOC Mailing Copies, VA Form 10-7131 & VAMC Clinical Notes",
  whyItMatters:
    "An unanswered Legacy Notice of Disagreement (NOD) missing a Statement of the Case (SOC), returned/wrong-address notice, post-July 21, 1992 VAMC treatment note within 1 year of a Legacy decision (38 C.F.R. § 3.156(b)), pre-March 24, 2015 VA Form 21-4138 / 10-7131 / § 3.157(b) hospital report, or omitted AMA issue (§ 5104(b)) can keep the original claim open under benefit-of-the-doubt rules.",
  howToRequest:
    "Review C-file correspondence tabs, returned-mail envelopes, VACOLS appellate history, and VAMC clinical treatment records surrounding the decision date.",
  practitionerAuditNote:
    "Audit for Tablazon unissued SOCs, Beraud (1-yr actual submission) / Lang (§ 3.156(b) 1-yr constructive VAMC records post-July 21, 1992), Ashley/Mindenhall/Woods/Romero mailing defects, Freund VACOLS closures, pre-2015 § 3.157(b) reports, or post-Feb. 19, 2019 Hamill (§ 5104(b)) omitted issues.",
  priorityOrder: 3,
};

const RECORD_SEPARATION_EXAM_AND_OPERATIVE_NOTES: MissingRecordDefinition = {
  recordId: "separation-exam-sf88-operative-notes",
  documentName:
    "Separation Physical (SF 88), Chronological Medical Care Sheets & X-Ray / Debridement Notes",
  whyItMatters:
    "Distinguishes superficial skin scars from deep muscle-group injuries by documenting through-and-through (T&T) wound tracks, surgical debridement, retained intramuscular metallic foreign bodies (MFB), fascia defects, or lowered threshold of fatigue under 38 C.F.R. §§ 4.55, 4.56, and 4.73.",
  howToRequest:
    "Check entrance/separation physicals (SF 88), field medical cards (DD Form 1380), and evacuation hospital summaries in STRs and NPRC clinical files.",
  practitionerAuditNote:
    "Map anatomical wound track to exact Muscle Group I–XXIII (38 C.F.R. § 4.73, DC 5301–5323) and peripheral nerve roots (DC 8510–8730) under Esteban v. Brown, 6 Vet. App. 259 (1994).",
  priorityOrder: 4,
};

const RECORD_BVA_SUBSUMPTION_AND_SUBPART_O_AUDIT: MissingRecordDefinition = {
  recordId: "bva-appellate-and-subpart-o-history",
  documentName:
    "Complete Board of Veterans' Appeals (BVA) Decision & Prior Board CUE Motion History",
  whyItMatters:
    "Determines whether a later BVA merits decision absorbed an earlier RO decision (blocking RO CUE under 38 C.F.R. § 20.1104) and whether any prior Board CUE motion was already decided on the merits (triggering 38 C.F.R. § 20.1409(c)'s single-final-merits-decision rule on that Board issue).",
  howToRequest:
    "Check VBMS eFolder 'BVA Decision' filters and VACOLS appeal history with an accredited VSO, claims agent, or attorney before filing any CUE motion.",
  practitionerAuditNote:
    "Verify both Manning/§ 20.1104 merger and § 20.1409(c) prior Subpart O merits rulings (confirming whether any prior dismissal was without prejudice for pleading specificity under § 20.1404(b)).",
  priorityOrder: 5,
};

const RECORD_COMBINED_MATH_AND_CONTEMPORANEOUS_RECORD: MissingRecordDefinition = {
  recordId: "combined-rating-math-and-bell-record-audit",
  documentName:
    "Date-Stamped C-File Inventory & 38 C.F.R. § 4.25 Combined-Payment Calculation",
  whyItMatters:
    "Strict CUE requires proving both that the key facts were inside the record VA had to check on that date (physically in the C-file before July 21, 1992; constructively including VAMC medical records on or after July 21, 1992) AND that fixing the error would have increased the monthly combined payment under 38 C.F.R. § 4.25 (or unlocked SMC or TDIU).",
  howToRequest:
    "Have an accredited VSO, claims agent, or attorney compare date-stamped C-file documents on the decision date against the historical Combined Ratings Table (§ 4.25).",
  practitionerAuditNote:
    "Run exact § 4.25 raw-to-rounded combined math across the historical rating profile (Russell v. Principi, 3 Vet. App. 310 (1992) (en banc)) and verify Bell v. Derwinski (1992-07-21) record-scope cutoff.",
  priorityOrder: 6,
};

// ---------------------------------------------------------------------------
// Wave 1 Three-Valued Screening Fact Questions
// ---------------------------------------------------------------------------

export const WAVE1_SCREENING_QUESTIONS: ReadonlyArray<ScreeningFactQuestion> = [
  {
    factId: "official_service_or_surgical_records_missing_at_t0",
    group: "service-records",
    veteranQuestion:
      "Were military hospital/surgical charts, field medical cards (DD Form 1380), or unit logs missing from your C-file when VA made that older decision?",
    veteranHelp:
      "Military inpatient surgical wards stored operative notes separately from regular outpatient STRs. Select \"I'm Not Sure\" if you haven't compared your C-file against NPRC inpatient archives.",
    practitionerQuestion:
      "Were official service department or inpatient surgical records unassociated with the C-file at T₀ and received/retrievable later (38 C.F.R. § 3.156(c)(1))?",
    practitionerAuthorityNote:
      "38 C.F.R. § 3.156(c)(1),(3); Vigil v. Peake, 22 Vet. App. 63 (2008); Emerson v. McDonald, 28 Vet. App. 200 (2016).",
    missingRecord: RECORD_NPRC_INPATIENT_SURGICAL,
  },
  {
    factId: "newly_associated_records_speak_to_disputed_element",
    group: "service-records",
    veteranQuestion:
      "Do those military or surgical records relate directly to why VA denied the claim or rated it too low (and did VA have enough basic info like service dates/unit to look)?",
    veteranHelp:
      "For example, VA said there was no proof of deep muscle damage in service, and the inpatient surgical chart shows muscle debridement or shrapnel.",
    practitionerQuestion:
      "Do the newly associated service records bear on a contested/disputed element without prior intermediate exhaustion or § 3.156(c)(2) claimant withholding?",
    practitionerAuthorityNote:
      "Kisor v. Wilkie, 969 F.3d 1333 (Fed. Cir. 2020); Blubaugh v. McDonald, 773 F.3d 1310 (Fed. Cir. 2014); 38 C.F.R. § 3.156(c)(2).",
    missingRecord: RECORD_CFILE_CODE_SHEET_AND_NARRATIVE,
  },
  {
    factId: "open_stream_or_unanswered_filing_clue",
    group: "pending-finality",
    veteranQuestion:
      "Was there an unanswered disagreement letter (NOD), returned/wrong-address VA mail, VAMC hospital report showing worsening (pre-March 2015), or a claimed issue VA left out of a post-Feb. 2019 AMA decision?",
    veteranHelp:
      "Any of these clues can mean the older claim never legally became final—allowing review under normal benefit-of-the-doubt rules.",
    practitionerQuestion:
      "Does the record reflect a finality-abating event: Legacy NOD without SOC, § 3.156(b) 1-yr submission/VAMC record (Beraud/Lang), defective mailing notice, pre-2015 §§ 3.155/3.157(b) informal/hospital claim, or omitted AMA issue (§ 5104(b) Hamill)?",
    practitionerAuthorityNote:
      "Tablazon; Beraud / Lang (§ 3.156(b)); Ashley / Mindenhall / Woods / Romero; former § 3.157(b); Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026).",
    missingRecord: RECORD_PENDING_APPEAL_NOD_VAMC_AUDIT,
  },
  {
    factId: "not_subsequently_finally_adjudicated",
    group: "pending-finality",
    veteranQuestion:
      "Did that unanswered filing or omitted issue stay unresolved (without VA later deciding that exact claim in a properly mailed final decision)?",
    veteranHelp:
      "Select \"I'm Not Sure\" until an accredited VSO, claims agent, or attorney checks every later rating decision in your C-file.",
    practitionerQuestion:
      "Did the pending stream remain unadjudicated without a later valid merits adjudication (and, for pre-Feb. 19, 2019 Legacy decisions, without Deshotel/Adams implicit denial)?",
    practitionerAuthorityNote:
      "Ingram v. Nicholson, 21 Vet. App. 232 (2007); Deshotel v. Nicholson, 457 F.3d 1258 (Fed. Cir. 2006) (Legacy only) vs. Hamill (AMA).",
    missingRecord: RECORD_PENDING_APPEAL_NOD_VAMC_AUDIT,
  },
  {
    factId: "penetrating_wound_rated_only_as_scar",
    group: "scar-vs-muscle",
    veteranQuestion:
      "Did VA rate a gunshot (GSW), shrapnel/fragment (SFW), or deep wound at 0% or 10% using only a skin scar code (7800–7805) with no muscle code (5301–5323)?",
    veteranHelp:
      "Historical VA Rating Code Sheets frequently listed '7804 — 0% — Scar, GSW' while omitting separate muscle-group and nerve codes.",
    practitionerQuestion:
      "Did the Rating Code Sheet assign only cutaneous scar DC 7800–7805 (0%/10%) for a penetrating wound while omitting Muscle Group DC 5301–5323 (38 C.F.R. § 4.73)?",
    practitionerAuthorityNote:
      "38 C.F.R. §§ 4.14, 4.55, 4.56, 4.73, 4.118; Esteban v. Brown, 6 Vet. App. 259 (1994).",
    missingRecord: RECORD_CFILE_CODE_SHEET_AND_NARRATIVE,
  },
  {
    factId: "deep_fascia_or_muscle_pathology_documented",
    group: "scar-vs-muscle",
    veteranQuestion:
      "Do service or separation medical records (STRs / SF 88) mention 'through-and-through' (T&T), surgical debridement, retained shrapnel/metal fragments (MFB) in muscle, fascia damage, or muscle weakness?",
    veteranHelp:
      "Superficial skin cuts alone don't trigger muscle ratings, but T&T bullet tracks, debridement, or retained intramuscular fragments point directly to Muscle Group criteria.",
    practitionerQuestion:
      "Do medical records establish deep fascia/muscle penetration (T&T track, debridement, retained intramuscular MFB, hernia, or cardinal functional loss under extant § 4.56)?",
    practitionerAuthorityNote:
      "38 C.F.R. § 4.56 (checking pre-July 3, 1997 vs. post-July 3, 1997 effective text; 62 FR 30235); Tropf v. Nicholson, 20 Vet. App. 317 (2006).",
    missingRecord: RECORD_SEPARATION_EXAM_AND_OPERATIVE_NOTES,
  },
  {
    factId: "undebatable_extant_error_in_record_then",
    group: "cue-record-and-math",
    veteranQuestion:
      "Were the key facts already inside the record VA had to check on that decision date—without relying on a brand-new medical opinion or a later change in legal interpretation?",
    veteranHelp:
      "Strict CUE looks only at the record and law that existed back then. If records were missing or you need a new medical nexus exam today, § 3.156(c) or a Supplemental Claim (20-0995) is usually safer.",
    practitionerQuestion:
      "Was there an undebatable error of extant fact or law on the cognizable T₀ record (respecting the July 21, 1992 Bell cutoff, Cook DTA bar, and George / § 20.1403(e) bar)?",
    practitionerAuthorityNote:
      "Russell v. Principi, 3 Vet. App. 310 (1992) (en banc); Bell v. Derwinski (1992-07-21); Cook v. Principi (2002); George v. McDonough, 596 U.S. 740 (2022).",
    missingRecord: RECORD_COMBINED_MATH_AND_CONTEMPORANEOUS_RECORD,
  },
  {
    factId: "manifestly_changed_combined_payment_4_25",
    group: "cue-record-and-math",
    veteranQuestion:
      "Would fixing that rating error back then have actually increased your monthly VA payment (for example, moving from 0% to 10%+, pushing a combined rating to the next 10% step, or unlocking SMC or TDIU)?",
    veteranHelp:
      "Because VA uses combined-rating math (38 C.F.R. § 4.25), adding 10% to certain existing ratings doesn't always change the rounded monthly check—an accredited VSO, claims agent, or attorney should check the exact table.",
    practitionerQuestion:
      "Would correcting the error have manifestly changed the rounded combined evaluation under 38 C.F.R. § 4.25 (or triggered statutory SMC / TDIU) during the historical period?",
    practitionerAuthorityNote:
      "38 U.S.C. §§ 5109A(a), 7111(a); 38 C.F.R. §§ 3.105(a)(1)(iii), 4.25, 20.1403(a),(c).",
    missingRecord: RECORD_COMBINED_MATH_AND_CONTEMPORANEOUS_RECORD,
  },
];

export function createDefaultInvestigationState(
  decisionDate = "1974-08-12",
): InvestigationIntakeState {
  const answers: Record<string, TriValue> = {};
  for (const q of WAVE1_SCREENING_QUESTIONS) {
    answers[q.factId] = "unknown";
  }
  return {
    decisionDate,
    decisionAgency: "unknown",
    issueFocus: "penetrating-scar-muscle",
    bvaMeritsSubsumed: "unknown",
    priorBvaCueDecidedOnMerits: "unknown",
    retireeStatus: "unknown",
    answers,
  };
}

export const INVESTIGATION_SCENARIO_PRESETS: ReadonlyArray<InvestigationScenarioPreset> =
  [
    {
      presetId: "preset-blank-not-sure",
      veteranLabel: "Start Fresh (All \"I'm Not Sure\")",
      practitionerLabel: "Blank Intake (All Unknown — Record Discovery Mode)",
      shortDescription:
        "Demonstrates three-valued preservation: zero pathways dropped when C-file facts are still unknown.",
      state: createDefaultInvestigationState("1974-08-12"),
    },
    {
      presetId: "preset-1974-vietnam-gsw-scar",
      veteranLabel: "1974 Vietnam Shrapnel / 0% Scar Rating",
      practitionerLabel: "1974-08-12 RO 0% DC 7804 Scar vs. DC 5313 Muscle + § 3.156(c)",
      shortDescription:
        "Era B (former 38 U.S.C. §§ 310/3010), pre-Bell (1992-07-21), pre-1997 § 4.56, missing NPRC surgical ward packet.",
      state: {
        decisionDate: "1974-08-12",
        decisionAgency: "AOJ-RO",
        issueFocus: "penetrating-scar-muscle",
        bvaMeritsSubsumed: "no",
        priorBvaCueDecidedOnMerits: "no",
        retireeStatus: "none",
        answers: {
          official_service_or_surgical_records_missing_at_t0: "yes",
          newly_associated_records_speak_to_disputed_element: "yes",
          open_stream_or_unanswered_filing_clue: "unknown",
          not_subsequently_finally_adjudicated: "unknown",
          penetrating_wound_rated_only_as_scar: "yes",
          deep_fascia_or_muscle_pathology_documented: "yes",
          undebatable_extant_error_in_record_then: "unknown",
          manifestly_changed_combined_payment_4_25: "yes",
        },
      },
    },
    {
      presetId: "preset-1997-pub-gap-trap",
      veteranLabel: "June 1997 Muscle Rating (Rule Change Window)",
      practitionerLabel: "1997-06-20 FR Pub-vs-Effective Gap Trap (§ 4.56, 62 FR 30235)",
      shortDescription:
        "Decision issued after June 3, 1997 FR publication but before July 3, 1997 effective date—resolving strictly to 1946-04-01 § 4.56.",
      state: {
        decisionDate: "1997-06-20",
        decisionAgency: "AOJ-RO",
        issueFocus: "penetrating-scar-muscle",
        bvaMeritsSubsumed: "no",
        priorBvaCueDecidedOnMerits: "no",
        retireeStatus: "none",
        answers: {
          official_service_or_surgical_records_missing_at_t0: "no",
          newly_associated_records_speak_to_disputed_element: "no",
          open_stream_or_unanswered_filing_clue: "no",
          not_subsequently_finally_adjudicated: "no",
          penetrating_wound_rated_only_as_scar: "yes",
          deep_fascia_or_muscle_pathology_documented: "yes",
          undebatable_extant_error_in_record_then: "yes",
          manifestly_changed_combined_payment_4_25: "yes",
        },
      },
    },
    {
      presetId: "preset-1986-bva-subsumed-cue-gate",
      veteranLabel: "1986 Board (BVA) Denial — Checking Safe Options First",
      practitionerLabel: "1986-11-04 BVA Subsumption (§ 20.1104) & § 20.1409(c) Pre-Filing Gate",
      shortDescription:
        "Shows RO CUE barred by BVA merger while § 3.156(c) overrides Board finality (§ 20.1411(b)) and Board CUE checks prior Subpart O history.",
      state: {
        decisionDate: "1986-11-04",
        decisionAgency: "BVA",
        issueFocus: "general-collateral-review",
        bvaMeritsSubsumed: "yes",
        priorBvaCueDecidedOnMerits: "unknown",
        retireeStatus: "unknown",
        answers: {
          official_service_or_surgical_records_missing_at_t0: "unknown",
          newly_associated_records_speak_to_disputed_element: "unknown",
          open_stream_or_unanswered_filing_clue: "no",
          not_subsequently_finally_adjudicated: "no",
          penetrating_wound_rated_only_as_scar: "yes",
          deep_fascia_or_muscle_pathology_documented: "unknown",
          undebatable_extant_error_in_record_then: "yes",
          manifestly_changed_combined_payment_4_25: "yes",
        },
      },
    },
    {
      presetId: "preset-2021-ama-omitted-issue-hamill",
      veteranLabel: "2021 AMA Decision Missing an Issue + Military Retiree",
      practitionerLabel: "2021-05-14 AMA § 5104(b) Explicit Notice (Hamill) + Title 10 CRSC (Soto)",
      shortDescription:
        "Post-Feb. 19, 2019 AMA decision omitting a claimed/reasonably raised issue (no implicit denial under Hamill) + DoD Title 10 CRSC check.",
      state: {
        decisionDate: "2021-05-14",
        decisionAgency: "AOJ-RO",
        issueFocus: "finality-nod-informal-notice",
        bvaMeritsSubsumed: "no",
        priorBvaCueDecidedOnMerits: "no",
        retireeStatus: "military-retiree-or-ch61",
        answers: {
          official_service_or_surgical_records_missing_at_t0: "no",
          newly_associated_records_speak_to_disputed_element: "no",
          open_stream_or_unanswered_filing_clue: "yes",
          not_subsequently_finally_adjudicated: "yes",
          penetrating_wound_rated_only_as_scar: "no",
          deep_fascia_or_muscle_pathology_documented: "no",
          undebatable_extant_error_in_record_then: "no",
          manifestly_changed_combined_payment_4_25: "unknown",
        },
      },
    },
  ];

// ---------------------------------------------------------------------------
// Point-in-Time T₀ CFR Link Resolver Helper
// ---------------------------------------------------------------------------

function resolvePointInTimeLink(
  versions: CfrVersionRecord[],
  sectionSlug: string,
  cfrLabel: string,
  decisionDate: string,
): PointInTimeAuthorityLink {
  const resolved = resolveCfrAtDate(versions, sectionSlug, decisionDate);
  const matchingSectionVersions = versions.filter(
    (v) =>
      (v as Partial<CompiledCfrVersion>).sectionSlug === sectionSlug ||
      normalizeCfrSlug(v.cfr_section) === sectionSlug,
  );
  const twoPaneForSec = buildBitemporalTwoPaneContext(
    decisionDate,
    matchingSectionVersions,
  );

  const quarantinedNote =
    resolved.quarantinedWatchlist.length > 0
      ? resolved.quarantinedWatchlist
          .map(
            (q) =>
              `${q.cfr_section} (${q.federal_register_citation ?? q.version_id}): Proposed / unfinalized or rescinded — NOT enacted law; never cite as binding regulation.`,
          )
          .join(" ")
      : null;

  if (!resolved.governingVersion || resolved.doNotRely) {
    return {
      sectionSlug,
      cfrSection: cfrLabel,
      coverageState: resolved.coverageState,
      doNotRely: true,
      permalink: null,
      effectiveIntervalLabel: `No indexed snapshot covers ${decisionDate} — Do Not Rely`,
      publicationDateLabel: "Pull contemporaneous GovInfo print edition",
      publicationGapTrapAlert: twoPaneForSec.publicationGapTrapAlert,
      quarantinedProposalsNote: quarantinedNote,
      explanation: resolved.explanation,
      officialEcfrUrl: resolved.officialFallbackUrls.ecfrUrl,
      officialGovinfoUrl: resolved.officialFallbackUrls.govinfoUrl,
    };
  }

  const gv = resolved.governingVersion;
  return {
    sectionSlug,
    cfrSection: gv.cfr_section,
    coverageState: gv.coverageState,
    doNotRely: false,
    permalink: gv.permalink,
    effectiveIntervalLabel: `${gv.effective_from} → ${gv.effective_to ?? "present"}`,
    publicationDateLabel: gv.publication_date
      ? `FR Pub: ${gv.publication_date} (${gv.federal_register_citation ?? "Federal Register"})`
      : "Baseline edition",
    publicationGapTrapAlert: twoPaneForSec.publicationGapTrapAlert,
    quarantinedProposalsNote: quarantinedNote,
    explanation: resolved.explanation,
    officialEcfrUrl: resolved.officialFallbackUrls.ecfrUrl,
    officialGovinfoUrl: resolved.officialFallbackUrls.govinfoUrl,
  };
}

function dispositionLabels(disposition: PathwayDisposition): {
  veteran: string;
  practitioner: string;
} {
  switch (disposition) {
    case "supported-to-investigate":
      return {
        veteran: "Supported Clues Present — Review With an Accredited Representative",
        practitioner: "Supported Hypothesis — Proceed to Primary-Source & Record Verification",
      };
    case "unresolved-records-needed":
      return {
        veteran: "Kept Open — Records Needed to Confirm (\"I'm Not Sure\" Never Drops This Option)",
        practitioner: "Pending Record Verification — Unresolved Evidentiary Preconditions",
      };
    case "barred-or-inapplicable":
      return {
        veteran: "Does Not Match Current Answers (See Plain-English Reason Below)",
        practitioner: "Jurisdictionally Barred or Inapplicable Under Current Inputs",
      };
  }
}

// ---------------------------------------------------------------------------
// Full Wave 1 Bitemporal & Three-Valued Session Evaluator
// ---------------------------------------------------------------------------

export function evaluateInvestigationSession(
  intake: InvestigationIntakeState,
  cfrVersions: CfrVersionRecord[],
): InvestigationEvaluationReport {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(intake.decisionDate)
    ? intake.decisionDate
    : "1974-08-12";

  const wave1Slugs = new Set(["38-cfr-3.156c", "38-cfr-4.56", "38-cfr-4.118"]);
  const wave1VersionsOnly = cfrVersions.filter((v) =>
    wave1Slugs.has(normalizeCfrSlug(v.cfr_section)),
  );
  const twoPaneContext = buildBitemporalTwoPaneContext(
    safeDate,
    wave1VersionsOnly.length > 0 ? wave1VersionsOnly : cfrVersions,
  );

  const link3156c = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.156c",
    "38 C.F.R. § 3.156(c)",
    safeDate,
  );
  const link456 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-4.56",
    "38 C.F.R. § 4.56",
    safeDate,
  );
  const link4118 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-4.118",
    "38 C.F.R. § 4.118",
    safeDate,
  );

  const qById = new Map<string, ScreeningFactQuestion>(
    WAVE1_SCREENING_QUESTIONS.map((q) => [q.factId, q]),
  );

  const ans = (factId: string): TriValue => intake.answers[factId] ?? "unknown";

  const isPre1992Bell = safeDate < "1992-07-21";
  const isPre2015Informal = safeDate < "2015-03-24";
  const isAmaDecision = safeDate >= "2019-02-19";

  const pathways: EvaluatedInvestigationPathway[] = [];

  // -------------------------------------------------------------------------
  // PATHWAY 1: 38 C.F.R. § 3.156(c) Newly Associated Service / Surgical Records
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const f1 = ans("official_service_or_surgical_records_missing_at_t0");
    if (f1 === "yes") {
      triggeredVet.push(
        "Official military or inpatient surgical records existed when VA made the older decision but were missing from your C-file.",
      );
      triggeredPrac.push(
        "Official military or inpatient surgical records existed at T₀ but were unassociated with the VA claims folder (§ 3.156(c)(1)).",
      );
    } else if (f1 === "unknown") {
      missing.push(RECORD_NPRC_INPATIENT_SURGICAL);
    } else {
      blockingVet.push(
        "You indicated all military and inpatient surgical records were already inside your C-file when VA first decided the claim.",
      );
      blockingPrac.push(
        "All official service department and inpatient surgical records were already associated with the claims file at T₀.",
      );
    }

    const f2 = ans("newly_associated_records_speak_to_disputed_element");
    if (f2 === "yes") {
      triggeredVet.push(
        "Those military or surgical records relate directly to why VA denied the claim or rated it too low, and VA had basic service details to search.",
      );
      triggeredPrac.push(
        "Newly associated service records bear on a contested element without § 3.156(c)(2) withholding or prior Blubaugh intermediate exhaustion.",
      );
    } else if (f2 === "unknown") {
      missing.push(RECORD_CFILE_CODE_SHEET_AND_NARRATIVE);
    } else {
      blockingVet.push(
        "You indicated the records do not relate to the disputed issue, were already reviewed in a later VA decision, or lacked basic identifying info.",
      );
      blockingPrac.push(
        "Records do not speak to a contested element of the prior denial (Kisor) or § 3.156(c)(2) / Blubaugh limitation applies.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    pathways.push({
      pathwayId: "service-records-3-156c",
      rankOrder: 1,
      priorityBadgeVeteran: "Priority 1 · Open Reconsideration (No Strict CUE Hurdle)",
      priorityBadgePractitioner:
        "Tier 1 · Open-Record Reconsideration (Overrides RO & BVA Finality)",
      veteranTitle:
        "Reconsider the Original Claim With Missing Military or Surgical Records (38 C.F.R. § 3.156(c))",
      practitionerTitle:
        "Newly Associated Official Service Department Records (38 C.F.R. § 3.156(c)(1)–(4))",
      veteranSummary:
        "When inpatient military surgical charts, field medical cards (DD Form 1380), deck logs, or unit records were missing when VA first decided your claim, VA must reconsider the claim on an open record—allowing modern medical exams, giving you the benefit of the doubt, and still reaching back to the original claim date without using up your BVA CUE opportunity.",
      practitionerSummary:
        "Mandatory AOJ reconsideration under 38 C.F.R. § 3.156(c)(1) & (3) (and § 20.1411(b) even after a final BVA decision). Evaluates staged retroactive ratings (§ 3.156(c)(4)) under § 5107(b) equipoise and allows contemporary nexus exams (Vigil v. Peake) without consuming § 20.1409(c).",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Open-Record Reconsideration With Benefit of the Doubt — Works Even After a Final BVA Decision Without Using Up Your One BVA CUE Opportunity",
      doctrinalScopeBadge:
        "Open-Record Reconsideration Under § 5107(b) Equipoise — Overrides Board Finality (§ 20.1411(b)) Without Consuming § 20.1409(c)",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 C.F.R. § 3.156(c)(1)–(4)",
        "38 C.F.R. § 20.1411(b)",
        "Vigil v. Peake, 22 Vet. App. 63 (2008)",
        "Emerson v. McDonald, 28 Vet. App. 200 (2016)",
        "Blubaugh v. McDonald, 773 F.3d 1310 (Fed. Cir. 2014)",
        "Kisor v. Wilkie, 969 F.3d 1333 (Fed. Cir. 2020)",
      ],
      bitemporalNoteVeteran: link3156c.doNotRely
        ? `Note: ${safeDate} is earlier than our 1962-01-01 historical snapshot of § 3.156(c), though modern § 3.156(c) reconsideration still applies today whenever missing official military records are newly added to your C-file.`
        : `Modern § 3.156(c) reconsideration applies today when missing military records enter your C-file, and you can also inspect § 3.156(c) as it stood on ${safeDate}.`,
      bitemporalNotePractitioner: link3156c.doNotRely
        ? `T₀ Gap Alert: ${safeDate} precedes indexed 1962-01-01 § 3.156(c) baseline (Do Not Rely on unindexed T₀ text for CUE); however, contemporary § 3.156(c)(1),(3) governs current reconsideration requests upon newly associated official service records (Vigil; Emerson).`
        : `T₀ snapshot resolved (${link3156c.effectiveIntervalLabel}); contemporary § 3.156(c)(1),(3),(4) governs open reconsideration today upon newly associated service department records, including post-liberalizing-grant effective-date audits (Emerson).`,
      pointInTimeLinks: [link3156c],
      relatedSiteRoutes: [
        { label: "38 C.F.R. § 3.156(c) Point-in-Time Reader", href: "/cfr/38-cfr-3.156c" },
        {
          label: "Piercing Finality Doctrine Guide",
          href: "/docs/procedural-vehicles-piercing-finality",
        },
      ],
      killSwitchesVeteran: [
        "Does not apply to brand-new private medical letters created years after service—the missing record must be an official military, hospital, or government archive record that existed when VA first decided the claim.",
        "Does not apply if VA already had and reviewed those exact military records in an in-between reopening decision, or if basic service details needed to find them were withheld.",
      ],
      killSwitchesToVerify: [
        "38 C.F.R. § 3.156(c)(2): Inapplicable if the claimant failed to provide sufficient identifying information for VA to request the service records.",
        "Blubaugh v. McDonald, 773 F.3d 1310 (Fed. Cir. 2014): Inapplicable if VA already associated and evaluated those exact service records in an intermediate reopening denied solely for lack of a current diagnosis.",
        "Kisor v. Wilkie, 969 F.3d 1333 (Fed. Cir. 2020): Newly associated record must be 'relevant'—speaking to a contested element of the prior denial.",
      ],
      veteranDiscussionQuestions: [
        "Can we compare the 'Evidence' list on my original VA rating decision against an NPRC request (SF 180) for my inpatient military surgical/clinical hospital records?",
        "If official military or inpatient hospital records were missing back then, can we request reconsideration under 38 C.F.R. § 3.156(c) instead of filing a strict CUE motion?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 2: Unadjudicated Pending Claim / NOD-Without-SOC / Pre-2015 Informal / AMA Hamill
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fOpen = ans("open_stream_or_unanswered_filing_clue");
    if (fOpen === "yes") {
      triggeredVet.push(
        isAmaDecision
          ? "A claimed or reasonably raised condition was left out of a post-February 19, 2019 AMA decision, or VA mailed notice to an outdated address."
          : isPre2015Informal
            ? "An older disagreement letter (NOD without an SOC), returned/wrong-address VA mail, 1-year post-decision evidence submission, or pre-March 24, 2015 informal claim / VAMC hospital report (10-7131 / 21-4138) was identified."
            : "An unanswered Legacy NOD (missing an SOC), VAMC treatment note within 1 year after a post-1992 RO decision, or wrong-address mailing was identified.",
      );
      triggeredPrac.push(
        isAmaDecision
          ? "Post-Feb. 19, 2019 AMA decision clue: claimed/reasonably raised issue omitted from explicit § 5104(b) notice (Hamill) or defective decision mailing."
          : isPre1992Bell
            ? "Pre-July 21, 1992 Legacy clue: unanswered NOD (no SOC), actual 1-year § 3.156(b) submission (Beraud; note Lang constructive VAMC receipt requires post-July 21, 1992 Bell possession), defective mailing notice, or pre-2015 VA Form 21-4138 / 10-7131 / § 3.157(b) hospital report."
            : isPre2015Informal
              ? "Post-Bell / Pre-March 24, 2015 Legacy clue: unanswered NOD (no SOC), § 3.156(b) 1-year submission or VAMC clinical record (Beraud / Lang), defective mailing notice, or VA Form 21-4138 / 10-7131 / § 3.157(b) hospital report."
              : "Late-Legacy (2015–2019) clue: unanswered NOD without SOC, § 3.156(b) 1-year submission/VAMC record (Beraud / Lang), or returned/wrong-address notice.",
      );
    } else if (fOpen === "unknown") {
      missing.push(RECORD_PENDING_APPEAL_NOD_VAMC_AUDIT);
    } else {
      blockingVet.push(
        "You indicated there was no unanswered NOD, returned/wrong-address VA letter, pre-2015 hospital report claim, or skipped AMA issue.",
      );
      blockingPrac.push(
        "No unanswered NOD, post-decision 1-year § 3.156(b) submission, defective mailing, pre-2015 informal/hospital claim, or omitted AMA issue identified.",
      );
    }

    const fUnresolved = ans("not_subsequently_finally_adjudicated");
    if (fUnresolved === "yes") {
      triggeredVet.push(
        "That unfinished claim or appeal was never closed out by a later properly mailed VA decision on the same issue.",
      );
      triggeredPrac.push(
        "Pending stream was not terminated by a subsequent valid final merits adjudication.",
      );
    } else if (fUnresolved === "unknown") {
      missing.push(RECORD_PENDING_APPEAL_NOD_VAMC_AUDIT);
    } else {
      blockingVet.push(
        "You indicated VA later decided and properly mailed a final decision resolving that unfinished claim or appeal.",
      );
      blockingPrac.push(
        "Subsequent valid merits rating or Board decision explicitly (or under pre-2019 Legacy Deshotel rules, implicitly) adjudicated and closed the pending stream.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    const temporalVet = isAmaDecision
      ? `Because ${safeDate} is on or after February 19, 2019 (the AMA era), VA cannot deny a claimed or reasonably raised issue by staying silent—any skipped issue remains legally open.`
      : isPre2015Informal
        ? `Because ${safeDate} is before March 24, 2015, informal written requests (21-4138, 10-7131) and VAMC or military hospital reports showing worsening of an already service-connected condition (former 38 C.F.R. § 3.157(b)) could start an open claim automatically.`
        : `For decisions between March 24, 2015 and February 18, 2019, standardized claim forms applied to new filings, but an unanswered Legacy NOD (missing an SOC), VAMC treatment notes within 1 year (§ 3.156(b)), or wrong-address mailing still kept finality from attaching.`;

    const temporalPrac = isAmaDecision
      ? `AMA Explicit-Notice Era (${safeDate} >= 2019-02-19): Under Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026) and 38 U.S.C. § 5104(b), the judge-made implicit-denial doctrine is abolished for AMA decisions—omitted claimed/reasonably raised issues remain pending (note: within 1 year of a silent AMA decision, pursue HLR/Board appeal rather than mandamus per Hamill fn. 6).`
      : isPre1992Bell
        ? `Pre-Bell & Informal-Claim Era (${safeDate} < 1992-07-21): Audit former 38 C.F.R. §§ 3.155(a) & 3.157(b) (VA Form 10-7131 / 21-4138 & automatic hospital-report increase claims on 0%+ SC conditions; Shea v. Wilkie), Tablazon unissued SOCs, actual 1-year § 3.156(b) submissions (Beraud; note Lang constructive VAMC receipt applies post-July 21, 1992), and Ashley/Mindenhall mailing defects.`
        : isPre2015Informal
          ? `Post-Bell & Pre-2015 Informal Era (1992-07-21 <= ${safeDate} < 2015-03-24): Audit former 38 C.F.R. §§ 3.155(a) & 3.157(b) (10-7131 / 21-4138 & automatic VAMC/military hospital-report increase claims on 0%+ SC conditions), Tablazon unissued SOCs, Beraud/Lang § 3.156(b) 1-year VAMC records, and Woods/Romero mailing defects.`
          : `Late-Legacy Standardized Form Era (2015-03-24 <= ${safeDate} < 2019-02-19): Audit Tablazon unissued SOCs, Beraud/Lang § 3.156(b) VAMC records generated within 1 year after the RO decision, Freund VACOLS closures, and defective mailing notice.`;

    pathways.push({
      pathwayId: "pending-claim-nod-notice-informal",
      rankOrder: 2,
      priorityBadgeVeteran: "Priority 2 · Open Unfinished Claim (Benefit of the Doubt Applies)",
      priorityBadgePractitioner:
        "Tier 1B · Finality Abated or Unadjudicated Pending Stream (§ 5107(b))",
      veteranTitle:
        "Check Whether an Older Claim or Appeal Stayed Legally Open (Unissued Statement of the Case / SOC, Pre-2015 Informal Claim, or Defective Mailing)",
      practitionerTitle:
        "Pending Unadjudicated Claim Stream: Legacy NOD/SOC, § 3.156(b) Beraud/Lang, Pre-2015 §§ 3.155/3.157(b), Defective Notice & AMA § 5104(b) Hamill",
      veteranSummary:
        "If VA never answered a timely Notice of Disagreement (NOD) with a Statement of the Case (SOC), mailed a decision to an outdated address when VA had your newer address, ignored a pre-March 2015 VAMC hospital report on a service-connected condition, or left an issue out of a post-Feb. 2019 AMA decision, finality may never have attached.",
      practitionerSummary:
        "Establishes that finality never attached to the prior stream, placing the claimant in an open adjudication under 38 U.S.C. § 5107(b) equipoise and bypassing collateral CUE exclusions (George / § 20.1403(e) and Cook).",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Open Unfinished Claim — Reviewed Under Normal Benefit-of-the-Doubt Rules Rather Than Strict CUE",
      doctrinalScopeBadge:
        "Non-Final / Open Claim Stream — Adjudicated Under § 5107(b) Equipoise Outside Collateral CUE Bars",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 C.F.R. §§ 3.156(b), 3.160(c)",
        "Former 38 C.F.R. §§ 3.155(a), 3.157(b) (pre-Mar. 24, 2015)",
        "38 U.S.C. § 5104(a)–(b)",
        "Beraud v. McDonald, 766 F.3d 1402 (Fed. Cir. 2014)",
        "Lang v. Wilkie, 971 F.3d 1348 (Fed. Cir. 2020)",
        "Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026)",
      ],
      bitemporalNoteVeteran: temporalVet,
      bitemporalNotePractitioner: temporalPrac,
      pointInTimeLinks: [],
      relatedSiteRoutes: [
        {
          label: "Piercing Finality Doctrine Guide",
          href: "/docs/procedural-vehicles-piercing-finality",
        },
        {
          label: "Forms & Rating Code Sheet Decoder (10-7131, 8-526)",
          href: "/reference/forms-and-codes",
        },
      ],
      killSwitchesVeteran: [
        "For pre-February 19, 2019 Legacy decisions, a later rating letter that clearly resolved a closely related claim could sometimes close out an older pending request ('implicit denial')—an accredited representative should read the exact wording of every later VA letter.",
        "The pre-March 24, 2015 automatic VAMC hospital-report rule (former § 3.157(b)) applied when the condition was already service-connected (including at 0%).",
        "Proving wrong-address mailing requires clear proof in your C-file or VAMC records (such as a returned envelope or prior address update), not just memory alone.",
      ],
      killSwitchesToVerify: [
        "Legacy Implicit Denial (decisions before Feb. 19, 2019 only): Under Deshotel v. Nicholson, 457 F.3d 1258 (Fed. Cir. 2006), Adams v. Shinseki, 568 F.3d 956 (Fed. Cir. 2009), and Hampton v. McDonough, 68 F.4th 1376 (Fed. Cir. 2023), check whether a subsequent Legacy rating narrative provided reasonable notice that the pending issue was also denied.",
        "Former 38 C.F.R. § 3.157(b) Prerequisite: Automatic hospital/exam-report informal increase claims prior to March 24, 2015 required that service connection (at 0% or higher) was already in effect for that condition.",
        "Presumption of Regularity: Rebutting mailing regularity requires clear C-file/VAMC address or systemic irregularity evidence (Ashley; Mindenhall; Woods; Romero; note that single-judge mem. dec. rulings carry nonprecedential status under CAVC Rule 30(a)).",
      ],
      veteranDiscussionQuestions: [
        "Can you check my C-file correspondence, VACOLS history, and VAMC treatment dates to see if an older NOD, 10-7131, 21-4138, or pre-2015 hospital report remained unanswered?",
        "Were any C&P exam notices or decision letters returned undeliverable or mailed to an old address after I updated my address with VA or a VAMC?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 3: § 4.56 Muscle Group vs. § 4.118 Scar Multi-Manifestation Audit
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fScar = ans("penetrating_wound_rated_only_as_scar");
    if (fScar === "yes") {
      triggeredVet.push(
        "A gunshot (GSW), shrapnel (SFW), or deep wound was rated 0% or 10% using only a skin scar code (7800–7805) with no muscle-group rating (5301–5323).",
      );
      triggeredPrac.push(
        "Penetrating gunshot/shrapnel/trauma wound rated 0% or 10% solely under skin scar DC 7800–7805 with no Muscle Group DC 5301–5323 evaluation.",
      );
    } else if (fScar === "unknown") {
      missing.push(RECORD_CFILE_CODE_SHEET_AND_NARRATIVE);
    } else {
      blockingVet.push(
        "You indicated the older decision did not rate a penetrating wound solely as a skin scar.",
      );
      blockingPrac.push(
        "Disputed decision did not involve a penetrating wound rated solely under skin scar codes (DC 7800–7805).",
      );
    }

    const fDeep = ans("deep_fascia_or_muscle_pathology_documented");
    if (fDeep === "yes") {
      triggeredVet.push(
        "Service or medical records show a through-and-through (T&T) track, surgical debridement, retained metal fragments (MFB) in muscle, or muscle weakness.",
      );
      triggeredPrac.push(
        "Medical records document through-and-through (T&T) wound track, surgical debridement, retained intramuscular metallic fragments (MFB), fascia defect, or functional muscle loss.",
      );
    } else if (fDeep === "unknown") {
      missing.push(RECORD_SEPARATION_EXAM_AND_OPERATIVE_NOTES);
    } else {
      blockingVet.push(
        "You indicated the wound affected only surface skin without reaching deep tissue or muscle.",
      );
      blockingPrac.push(
        "Wound was strictly superficial/subcutaneous without penetrating deep fascia or muscle groups.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    const trap456 = link456.publicationGapTrapAlert;
    const isPre1946Vasrd = link456.doNotRely;
    const isPre1997Muscle = safeDate < "1997-07-03";
    const scarsSummaryOnlyCaution =
      link4118.coverageState === "SUMMARY_ONLY"
        ? " Note: Post-Oct. 23, 2008 § 4.118 scar criteria are Summary Only in Wave 1—pull the official print 38 C.F.R. § 4.118 edition before pleading scar CUE."
        : "";

    pathways.push({
      pathwayId: "penetrating-wound-muscle-vs-scar",
      rankOrder: 3,
      priorityBadgeVeteran:
        "Priority 3 · Combat / Penetrating Wound Rating Schedule Check",
      priorityBadgePractitioner:
        "Tier 2 · Substantive § 4.56 Muscle vs. § 4.118 Scar Anti-Pyramiding Audit",
      veteranTitle:
        "Separate Skin Scar (DC 7800–7805), Muscle Group (DC 5301–5323) & Nerve Ratings for Penetrating Wounds",
      practitionerTitle:
        "Penetrating Wound Multi-Manifestation Audit: 38 C.F.R. §§ 4.14, 4.55, 4.56, 4.73 & 4.118 (Esteban v. Brown)",
      veteranSummary:
        "Under VA's anti-pyramiding rule (38 C.F.R. § 4.14), VA cannot pay twice for the exact same symptom—but a single GSW or SFW that damages skin, deep muscle, and nerves can qualify for separate ratings for the painful/unstable scar, muscle weakness/fatigue, and nerve numbness.",
      practitionerSummary:
        "Esteban v. Brown, 6 Vet. App. 259 (1994) construed the plain text of 38 C.F.R. § 4.14 since 1946: skin scar tenderness/disfigurement (DC 7800–7805), muscle power/fatigue impairment (DC 5301–5323), and peripheral nerve deficits (DC 8510–8730) are distinct manifestations. Pairs first with § 3.156(c) if surgical records were missing, or extant-record CUE if T&T/debridement facts were already before the adjudicator.",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Separate Skin, Muscle & Nerve Symptoms Can Be Rated Together — Pairs Best With § 3.156(c) Missing Surgical Records or Record-at-the-Time Review",
      doctrinalScopeBadge:
        "No § 20.1403(e) Change-in-Interpretation Bar on § 4.14 (Esteban) — Undebatable Record Error & § 4.25 Manifest Outcome Change Still Required for CUE",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 C.F.R. §§ 4.14, 4.55, 4.56, 4.73, 4.118",
        "Esteban v. Brown, 6 Vet. App. 259 (1994)",
        "Tropf v. Nicholson, 20 Vet. App. 317 (2006)",
        "Lyles v. Shulkin, 29 Vet. App. 107 (2017)",
      ],
      bitemporalNoteVeteran: isPre1946Vasrd
        ? `Coverage Gap Alert (${safeDate}): ${safeDate} is earlier than the April 1, 1946 VASRD baseline indexed on VetLawGuide—do not rely on post-1946 § 4.56 or § 4.118 snapshots; ask an accredited representative to check the earlier 1933 Rating Schedule / Veterans' Regulation rules.`
        : trap456
          ? `Important Date Alert (${safeDate}): VA's 1997 muscle-rating update was published June 3, 1997 but did not take effect until July 3, 1997—so the earlier 1946–1997 wording of § 4.56 still applied on ${safeDate}. (Also note VA's Sept. 2025 90 FR 46542 scar proposal is proposed/unfinalized, not enacted law.)`
          : isPre1997Muscle
            ? `On ${safeDate}, the pre-July 3, 1997 edition of 38 C.F.R. § 4.56 governed muscle injuries alongside the historical edition of § 4.118 for scars. (Note: VA's Sept. 2025 90 FR 46542 scar proposal remains proposed/unfinalized, not enacted law.)`
            : `On ${safeDate}, the post-July 3, 1997 edition of 38 C.F.R. § 4.56 applied—including § 4.56(b)'s rule that a T&T injury with muscle damage is evaluated as no less than moderate for each muscle group damaged.${link4118.coverageState === "SUMMARY_ONLY" ? " For post-Oct. 23, 2008 scar rules (§ 4.118), have your representative verify the official print 38 C.F.R. text." : ""} (Note: 90 FR 46542 on DC 7804 scars remains proposed/unfinalized.)`,
      bitemporalNotePractitioner: isPre1946Vasrd
        ? `T₀ Pre-Baseline Gap (${safeDate} < 1946-04-01): Do Not Rely on 1946 VASRD snapshots (/cfr/38-cfr-4.56/1946-04-01 did not take effect until April 1, 1946; 29 FR 6718). Pull the contemporaneous 1933 Schedule for Rating Disabilities / Veterans' Regulation No. 1(a) print edition before pleading CUE.`
        : trap456
          ? `${trap456} Always cite pre-amendment § 4.56 (/cfr/38-cfr-4.56/1946-04-01) for ${safeDate} CUE pleadings, and quarantine proposed/unfinalized 90 FR 46542 on DC 7804.`
          : isPre1997Muscle
            ? `T₀ = ${safeDate} (1946-04-01 <= T₀ < 1997-07-03): Quote pre-1997 § 4.56(b)–(d) verbatim (/cfr/38-cfr-4.56/1946-04-01)—never quote the post-July 3, 1997 § 4.56(b) T&T floor sentence retroactively in a CUE motion. Verify exact § 4.118 scar era (${link4118.effectiveIntervalLabel}) and quarantine proposed/unfinalized 90 FR 46542.`
            : `T₀ = ${safeDate} (>= 1997-07-03): Post-62 FR 30235 § 4.56(b) T&T moderate floor and § 4.56(d) cardinal signs govern (/cfr/38-cfr-4.56/1997-07-03), paired with ${link4118.cfrSection} (${link4118.effectiveIntervalLabel}; 90 FR 46542 remains proposed/unfinalized).${scarsSummaryOnlyCaution}`,
      pointInTimeLinks: [link456, link4118],
      relatedSiteRoutes: [
        {
          label: "Playbook 01: Gunshot, Shrapnel & Penetrating Wounds",
          href: "/playbooks/01-penetrating-wounds-scars-vs-muscles",
        },
        { label: "38 C.F.R. § 4.56 Muscle Reader & Redline", href: "/cfr/38-cfr-4.56" },
        { label: "38 C.F.R. § 4.118 Scars Reader & Redline", href: "/cfr/38-cfr-4.118" },
      ],
      killSwitchesVeteran: [
        "VA generally does not stack a separate muscle rating and a separate joint range-of-motion rating when both pay for limiting the exact same joint movement.",
        "When reviewing a pre-July 3, 1997 decision for CUE, only the pre-July 3, 1997 wording of § 4.56 can be used—not the updated July 3, 1997 wording.",
        "VA's September 2025 painful-scars notice (90 FR 46542) is only a proposed/unfinalized rule—not active law.",
      ],
      killSwitchesToVerify: [
        "38 C.F.R. § 4.55(d)–(e): Combining a muscle injury rating with joint limitation of motion for the EXACT SAME anatomical movement is barred unless § 4.55 exceptions apply (see Lyles v. Shulkin, 29 Vet. App. 107 (2017)).",
        "Temporal § 4.56 Verbatim Rule: Never cite the post-July 3, 1997 § 4.56(b) explicit T&T floor verbatim to attack a pre-July 3, 1997 decision via CUE.",
        "90 FR 46542 Quarantine: Sept. 29, 2025 DC 7804 painful-scars notice is a proposed/unfinalized rulemaking—not enacted law.",
      ],
      veteranDiscussionQuestions: [
        "Does my earliest VA Rating Code Sheet show only a 0% or 10% scar code (DC 7800–7805) even though my STRs or SF 88 mention a T&T wound, debridement, or retained MFB?",
        "Should we evaluate separate ratings for muscle group damage (DC 5301–5323), painful/unstable scars (DC 7804), and peripheral nerve symptoms?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 4: Regional Office / AOJ CUE (38 U.S.C. § 5109A; 38 C.F.R. § 3.105(a))
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    if (intake.decisionAgency === "BVA" || intake.bvaMeritsSubsumed === "yes") {
      blockingVet.push(
        "Because the Board of Veterans' Appeals (BVA) decided this issue on the merits, Regional Office (RO) CUE is no longer available—check § 3.156(c) missing military records first, or review Board CUE rules with an accredited representative.",
      );
      blockingPrac.push(
        "Jurisdictional Subsumption Bar (38 C.F.R. §§ 20.1104, 20.1400(b); Manning v. Principi): Because a Board (BVA) decision decided or subsumed this issue on the merits, Regional Office CUE under 38 C.F.R. § 3.105(a) is jurisdictionally unavailable—evaluate § 3.156(c) reconsideration or Subpart O Board CUE (§ 7111).",
      );
    } else if (
      intake.decisionAgency === "unknown" ||
      intake.bvaMeritsSubsumed === "unknown"
    ) {
      missing.push(RECORD_BVA_SUBSUMPTION_AND_SUBPART_O_AUDIT);
    } else {
      triggeredVet.push(
        "The older decision is an unappealed VA Regional Office (RO) decision that BVA never decided on the merits.",
      );
      triggeredPrac.push(
        "Target is a final Regional Office (AOJ) decision that was never appealed to or subsumed by the Board on this issue.",
      );
    }

    const fErr = ans("undebatable_extant_error_in_record_then");
    if (fErr === "yes") {
      triggeredVet.push(
        "The key facts were already inside the record VA had to check on that date, and the error did not depend on missing exams or a later change in legal interpretation.",
      );
      triggeredPrac.push(
        "Decisive factual or extant regulatory error was in the cognizable T₀ record without relying on duty-to-assist or later judicial reinterpretation.",
      );
    } else if (fErr === "unknown") {
      missing.push(RECORD_COMBINED_MATH_AND_CONTEMPORANEOUS_RECORD);
    } else {
      blockingVet.push(
        "Strict CUE cannot be based on VA failing to help gather records/exams (DTA), disagreements over weighing medical evidence, or later changes in how courts interpret the law.",
      );
      blockingPrac.push(
        "Theory relies on missing development (Cook duty-to-assist bar), weighing conflicting evidence, or a later change in legal interpretation (George / § 20.1403(e)).",
      );
    }

    const fMath = ans("manifestly_changed_combined_payment_4_25");
    if (fMath === "yes") {
      triggeredVet.push(
        "Fixing the error back then would have increased your monthly VA compensation payment (or unlocked SMC or TDIU).",
      );
      triggeredPrac.push(
        "Correcting the error manifestly increases the rounded combined compensable evaluation under 38 C.F.R. § 4.25 (or unlocks statutory SMC/TDIU).",
      );
    } else if (fMath === "unknown") {
      missing.push(RECORD_COMBINED_MATH_AND_CONTEMPORANEOUS_RECORD);
    } else {
      blockingVet.push(
        "Under VA's combined-rating table (§ 4.25), changing that single rating would not have increased your monthly VA payment during that historical period.",
      );
      blockingPrac.push(
        "Correcting the error would not manifestly change the combined monthly payment under 38 C.F.R. § 4.25 during the historical period.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    pathways.push({
      pathwayId: "ro-cue-3-105a",
      rankOrder: 4,
      priorityBadgeVeteran:
        "Priority 4 · Regional Office Clear & Unmistakable Error (38 C.F.R. § 3.105(a))",
      priorityBadgePractitioner:
        "Tier 3 · Collateral Revision of Unsubsumed AOJ Decision (38 U.S.C. § 5109A)",
      veteranTitle:
        "Revise a Final VA Regional Office (RO) Decision for Clear and Unmistakable Error (38 C.F.R. § 3.105(a))",
      practitionerTitle:
        "Regional Office / AOJ Clear and Unmistakable Error (38 U.S.C. § 5109A; 38 C.F.R. § 3.105(a))",
      veteranSummary:
        "If the RO had all the key facts right in front of it on the decision date, clearly misapplied the regulation in effect back then, and BVA never decided that issue on appeal, an accredited representative can evaluate an RO CUE revision request.",
      practitionerSummary:
        "Three-prong collateral revision under Russell v. Principi, 3 Vet. App. 310 (1992) (en banc) and Fugo v. Brown, 6 Vet. App. 40 (1993). Unlike Subpart O Board CUE, § 3.105(a) does not impose § 20.1409(c)'s single-motion bar across distinct theories, but still enforces strict extant-law, Bell record-scope, and § 4.25 manifest-outcome rules.",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Strict Record-at-the-Time Review — Requires an Undebatable Error That Would Have Changed Your Monthly VA Payment",
      doctrinalScopeBadge:
        "Strict Russell / Fugo Three-Prong Test — Subject to Bell (1992-07-21) Record Cutoff, Cook DTA Bar & George (§ 20.1403(e))",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 U.S.C. § 5109A",
        "38 C.F.R. § 3.105(a)",
        "Russell v. Principi, 3 Vet. App. 310 (1992) (en banc)",
        "Bell v. Derwinski, 2 Vet. App. 611 (1992)",
        "Cook v. Principi, 318 F.3d 1334 (Fed. Cir. 2002) (en banc)",
        "George v. McDonough, 596 U.S. 740 (2022)",
      ],
      bitemporalNoteVeteran: isPre1992Bell
        ? `Record Rule on ${safeDate} (Before July 21, 1992): For pre-July 21, 1992 decisions, RO CUE generally looks only at papers physically inside your C-file on that date—so check § 3.156(c) first if military hospital charts arrived later.`
        : `Record Rule on ${safeDate} (On or After July 21, 1992): VAMC treatment records that already existed on ${safeDate} count as part of the record VA had to check.`,
      bitemporalNotePractitioner: `${twoPaneContext.statutoryEraLabel}. ${twoPaneContext.recordScopeRuleThen}`,
      pointInTimeLinks:
        intake.issueFocus === "penetrating-scar-muscle"
          ? [link456, link4118]
          : [link456],
      relatedSiteRoutes: [
        { label: "Title 38 Statutory Crosswalk (1933–1991)", href: "/crosswalk" },
        {
          label: "Piercing Finality Doctrine Guide",
          href: "/docs/procedural-vehicles-piercing-finality",
        },
      ],
      killSwitchesVeteran: [
        "If BVA later decided that same issue on the merits, RO CUE no longer applies—an accredited representative must check § 3.156(c) or Board CUE rules instead.",
        "VA failing to order a C&P exam or gather missing records (DTA) cannot prove CUE.",
        "A later court decision changing how a rule is interpreted (George v. McDonough) cannot prove CUE in an older final decision.",
      ],
      killSwitchesToVerify: [
        "Subsumption Bar (38 C.F.R. § 20.1104; Manning v. Principi): AOJ lacks jurisdiction to revise an RO decision on an issue later decided on the merits by BVA.",
        "Cook v. Principi (Duty to Assist) & Weighing Exclusions: Failure to obtain records, an inadequate C&P exam, or disputing how conflicting evidence was weighed can never constitute CUE.",
        "George v. McDonough, 596 U.S. 740 (2022): Later judicial invalidation of a regulation or changed legal interpretation cannot establish CUE.",
      ],
      veteranDiscussionQuestions: [
        "Did BVA ever review this exact issue later, or did it stay an unappealed RO decision?",
        "If we check the 38 C.F.R. § 4.25 Combined Ratings Table on that decision date, would fixing the error have changed my monthly payment?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 5: Board (BVA) CUE Motion (38 U.S.C. § 7111; 38 C.F.R. §§ 20.1400–20.1411)
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    if (intake.decisionAgency === "AOJ-RO" && intake.bvaMeritsSubsumed === "no") {
      blockingVet.push(
        "Because this issue was decided only by a VA Regional Office (RO) and never by BVA, Board CUE rules do not apply (RO CUE under § 3.105(a) applies instead).",
      );
      blockingPrac.push(
        "Target decision is an unappealed Regional Office (AOJ) decision with no Board merits decision—38 U.S.C. § 7111 Subpart O applies only to final Board decisions (evaluate RO CUE under § 3.105(a) instead).",
      );
    } else if (
      intake.decisionAgency === "BVA" ||
      intake.bvaMeritsSubsumed === "yes"
    ) {
      triggeredVet.push(
        "The issue was decided on the merits by the Board of Veterans' Appeals (BVA).",
      );
      triggeredPrac.push(
        "Target adjudication is a final Board of Veterans' Appeals (BVA) merits decision.",
      );
    } else {
      missing.push(RECORD_BVA_SUBSUMPTION_AND_SUBPART_O_AUDIT);
    }

    if (intake.priorBvaCueDecidedOnMerits === "yes") {
      blockingVet.push(
        "Under 38 C.F.R. § 20.1409(c), VA allows only one final merits CUE decision per prior BVA decision on an issue (excluding without-prejudice dismissals under § 20.1404). Ask your representative to check whether § 3.156(c) missing military records can still reopen the claim.",
      );
      blockingPrac.push(
        "Res Judicata Bar under 38 C.F.R. § 20.1409(c) (Hillyard v. Shinseki): 38 C.F.R. § 20.1409(c) permits only one final merits CUE decision per prior Board decision on an issue (excluding without-prejudice pleading dismissals under 38 C.F.R. § 20.1404). Evaluate 38 C.F.R. § 3.156(c) reconsideration under § 20.1411(b) if official service records were missing.",
      );
    } else if (intake.priorBvaCueDecidedOnMerits === "no") {
      triggeredVet.push(
        "No prior BVA CUE motion has already been decided on the merits on this Board issue (§ 20.1409(c)).",
      );
      triggeredPrac.push(
        "No prior Subpart O Board CUE motion has been decided on the merits as to this Board decision issue (§ 20.1409(c)).",
      );
    } else {
      missing.push(RECORD_BVA_SUBSUMPTION_AND_SUBPART_O_AUDIT);
    }

    const fErr = ans("undebatable_extant_error_in_record_then");
    if (fErr === "yes") {
      triggeredVet.push(
        "The key facts were inside the record BVA had to review back then, without relying on new medical diagnoses or later changes in legal interpretation.",
      );
      triggeredPrac.push(
        "Extant legal/factual error identified without violating 38 C.F.R. § 20.1403(d)–(e) exclusions.",
      );
    } else if (fErr === "unknown") {
      missing.push(RECORD_COMBINED_MATH_AND_CONTEMPORANEOUS_RECORD);
    } else {
      blockingVet.push(
        "Board CUE cannot be based on a newer medical diagnosis, VA failing to gather records (DTA), weighing conflicting evidence, or a later change in how courts interpret the law.",
      );
      blockingPrac.push(
        "Excluded by 38 C.F.R. § 20.1403(d)–(e) (later medical diagnosis, duty-to-assist breach, weighing dispute, inadequate reasons or bases, or George later change in interpretation of law).",
      );
    }

    const fMath = ans("manifestly_changed_combined_payment_4_25");
    if (fMath === "yes") {
      triggeredVet.push(
        "Fixing the error back then would have clearly increased your monthly VA payment.",
      );
      triggeredPrac.push(
        "Manifestly changed outcome verified under 38 C.F.R. § 20.1403(a),(c) and § 4.25.",
      );
    } else if (fMath === "unknown") {
      missing.push(RECORD_COMBINED_MATH_AND_CONTEMPORANEOUS_RECORD);
    } else {
      blockingVet.push(
        "Fixing that issue back then would not have increased your monthly combined payment under § 4.25.",
      );
      blockingPrac.push(
        "Does not manifestly change the outcome / combined payment under 38 C.F.R. § 20.1403(c).",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    pathways.push({
      pathwayId: "board-cue-7111-subpart-o",
      rankOrder: 5,
      priorityBadgeVeteran:
        "Priority 5 · High-Caution BVA CUE Gate (Consult Accredited Representative First)",
      priorityBadgePractitioner:
        "Tier 4 · Subpart O Board CUE Motion (38 U.S.C. § 7111; 38 C.F.R. §§ 20.1400–20.1411)",
      veteranTitle:
        "Board of Veterans' Appeals (BVA) CUE Motion — High-Stakes Single Final Merits Decision Rule (38 C.F.R. § 20.1409(c))",
      practitionerTitle:
        "Subpart O Board CUE Motion (38 U.S.C. § 7111; 38 C.F.R. §§ 20.1400–20.1411) — Mandatory Pre-Filing Gate",
      veteranSummary:
        "Under 38 C.F.R. § 20.1409(c), VA allows only one final merits CUE decision per prior BVA decision on an issue (excluding without-prejudice pleading dismissals under § 20.1404). Because filing an incomplete BVA CUE motion that is denied on the merits permanently blocks stronger CUE arguments on that Board issue, always check § 3.156(c) first and review your complete C-file with an accredited VSO, claims agent, or attorney.",
      practitionerSummary:
        "Last-resort collateral attack on a final BVA decision. Under Andrews v. Nicholson, 421 F.3d 1278 (Fed. Cir. 2005) and Hillyard v. Shinseki, 24 Vet. App. 343 (2011), every viable CUE theory against a Board issue must be pleaded with strict § 20.1404(b) specificity in a single comprehensive motion after exhausting § 3.156(c) (§ 20.1411(b)) and verifying § 20.1400(b)(1) court-review exclusions.",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "38 C.F.R. § 20.1409(c) Caution: Only One Final Merits CUE Decision Allowed Per Prior BVA Decision on an Issue — Check § 3.156(c) First",
      doctrinalScopeBadge:
        "38 C.F.R. § 20.1409(c): One Final Merits CUE Decision Per Prior Board Decision on an Issue (Excludes § 20.1404 Without-Prejudice Dismissals)",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 U.S.C. § 7111",
        "38 C.F.R. §§ 20.1400, 20.1403, 20.1404, 20.1409(c), 20.1411(b)",
        "George v. McDonough, 596 U.S. 740 (2022)",
        "Andrews v. Nicholson, 421 F.3d 1278 (Fed. Cir. 2005)",
        "Hillyard v. Shinseki, 24 Vet. App. 343 (2011)",
      ],
      bitemporalNoteVeteran:
        "Before anyone files a BVA CUE motion, confirm (1) whether missing military records allow § 3.156(c) reconsideration instead, (2) the exact official print regulation wording in force on the day BVA signed its decision, and (3) that no prior BVA CUE motion was already decided on the merits on that issue.",
      bitemporalNotePractitioner: `Complete all 5 gates in /checklists/board-cue-pre-filing-gate: pull verbatim T₀ print CFR text for ${safeDate}, verify ${isPre1992Bell ? "pre-July 21, 1992 physical C-file presence (Damrel)" : "post-July 21, 1992 Bell constructive possession"}, confirm zero § 20.1400(b)(1) CAVC merits affirmance, and audit § 4.25 math.`,
      pointInTimeLinks: [link456, link4118, link3156c],
      relatedSiteRoutes: [
        {
          label: "Board CUE Pre-Filing Gate Checklist (5 Gates)",
          href: "/checklists/board-cue-pre-filing-gate",
        },
        {
          label: "Piercing Finality Doctrine Guide",
          href: "/docs/procedural-vehicles-piercing-finality",
        },
      ],
      killSwitchesVeteran: [
        "38 C.F.R. § 20.1409(c): Once BVA decides a Board CUE motion on the merits on an issue, you can never file a second Board CUE motion on that same Board issue.",
        "Board CUE is not available if CAVC or a higher federal court already decided that exact Board issue on the merits.",
        "Later medical diagnoses, missing exams (DTA), disagreements over weighing evidence, and later changes in legal interpretation cannot prove Board CUE.",
      ],
      killSwitchesToVerify: [
        "38 C.F.R. § 20.1409(c): Once the Board issues a final merits decision on a Subpart O motion on an issue, res judicata bars any subsequent Board CUE motion on that same Board issue.",
        "38 C.F.R. § 20.1400(b)(1): Subpart O Board CUE is barred if the issue in the Board decision was appealed to and decided on the merits by CAVC or the Federal Circuit.",
        "38 C.F.R. § 20.1403(d)–(e): Delayed medical diagnosis, Cook duty-to-assist breach, weighing dispute, inadequate § 7104(d)(1) reasons or bases, and George later changes in legal interpretation are categorically excluded.",
      ],
      veteranDiscussionQuestions: [
        "Can you search my entire VBMS eFolder to confirm no prior BVA CUE motion was ever decided on the merits on this issue under 38 C.F.R. § 20.1409(c)?",
        "Can we walk through all 5 sections of the Board CUE Pre-Filing Gate Checklist—starting with whether § 3.156(c) service records can achieve the same goal safely?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 6: Current Supplemental / Claim for Increase & George Collateral Safety Net
  // -------------------------------------------------------------------------
  {
    const labels = dispositionLabels("supported-to-investigate");
    pathways.push({
      pathwayId: "prospective-supplemental-or-increase-today",
      rankOrder: 6,
      priorityBadgeVeteran:
        "Always Available Today · Current Claim or Supplemental Claim",
      priorityBadgePractitioner:
        "Prospective Baseline & George (§ 20.1403(e)) Collateral-Bar Alternative",
      veteranTitle:
        "Protect Today's Effective Date: Supplemental Claim (20-0995) or Claim for Increase (21-526EZ)",
      practitionerTitle:
        "Prospective Supplemental / Increased-Rating Claim (38 U.S.C. § 5108; 38 C.F.R. § 3.2501) Under Modern Liberalized Criteria",
      veteranSummary:
        "Even when an older decision cannot be revised retroactively (for example, because a rule changed years later or you need a new medical nexus opinion today), filing an Intent to File (ITF / 21-0966) paired with a Supplemental Claim (20-0995) or Claim for Increase (21-526EZ) lets VA evaluate your condition under today's rules with DTA help and the benefit of the doubt in your favor.",
      practitionerSummary:
        "Where George v. McDonough, 596 U.S. 740 (2022) / 38 C.F.R. § 20.1403(e) or Cook v. Principi forecloses retroactive CUE (e.g., relying on post-2008 DC 7804 painful-scar revisions, PACT Act presumptions, or new nexus opinions), secure a protective ITF (21-0966) and pursue prospective entitlement under § 5108 / § 3.2501 while continuing C-file § 3.156(c) / pending-claim audits.",
      disposition: "supported-to-investigate",
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Applies Today's Updated Rules Going Forward — Includes VA Duty to Assist (DTA) and Benefit of the Doubt",
      doctrinalScopeBadge:
        "Prospective Effective Date Under 38 U.S.C. § 5110(a) — Full § 5107(b) Equipoise & VA Duty to Assist",
      triggeredByAnswersVeteran: [
        "Available today whenever you have new and relevant medical/lay evidence (20-0995) or your service-connected disability has worsened (21-526EZ).",
      ],
      triggeredByAnswers: [
        "Available regardless of historical CUE bars whenever new and relevant evidence (38 C.F.R. § 3.2501) or current disability worsening exists.",
      ],
      blockingReasonsVeteran: [],
      blockingReasons: [],
      recordsToLocate: [],
      authorityCitations: [
        "38 U.S.C. §§ 5107(b), 5108, 5110(a)",
        "38 C.F.R. §§ 3.155, 3.2501",
        "George v. McDonough, 596 U.S. 740 (2022)",
      ],
      bitemporalNoteVeteran:
        "An Intent to File (ITF / 21-0966) locks in today's effective date for up to 1 year while you and an accredited VSO, claims agent, or attorney request your FOIA C-file and NPRC surgical records.",
      bitemporalNotePractitioner:
        "Filing a protective ITF (VA Form 21-0966) preserves prospective effective-date entitlement while awaiting FOIA C-file / NPRC § 3.156(c) production—just take care not to prematurely file an unvetted Subpart O Board CUE motion.",
      pointInTimeLinks: [],
      relatedSiteRoutes: [
        { label: "Forms & Codes Decoder (ITF 21-0966, 20-0995)", href: "/reference/forms-and-codes" },
      ],
      killSwitchesVeteran: [
        "Deadline Check: If BVA issued a recent denial within the last 120 days (or 1 year under AMA), check CAVC appeal and Supplemental Claim deadlines immediately with an accredited representative.",
      ],
      killSwitchesToVerify: [
        "120-Day CAVC Direct-Appeal Deadline (38 U.S.C. § 7266(a)): If challenging a recent Board decision issued within the last 120 days (or 1-year AMA review window), verify direct-appeal / supplemental-claim tolling deadlines immediately with accredited counsel.",
      ],
      veteranDiscussionQuestions: [
        "Should we submit an Intent to File (21-0966) right away to protect today's effective date while we wait for my FOIA C-file (20-10206) and NPRC records (SF 180)?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // Deduplicate & Prioritize "Records to Locate & Why" Across Active Pathways
  // -------------------------------------------------------------------------
  const recordMap = new Map<string, MissingRecordChecklistItem>();

  for (const p of pathways) {
    if (p.disposition === "barred-or-inapplicable") continue;
    for (const rec of p.recordsToLocate) {
      const existing = recordMap.get(rec.recordId);
      const matchingFactIds = WAVE1_SCREENING_QUESTIONS.filter(
        (q) =>
          q.missingRecord.recordId === rec.recordId &&
          (intake.answers[q.factId] ?? "unknown") === "unknown",
      ).map((q) => q.factId);

      if (!existing) {
        recordMap.set(rec.recordId, {
          ...rec,
          triggeredByFactIds: matchingFactIds,
          unlocksPathwayTitles: [p.practitionerTitle],
          unlocksPathwayTitlesVeteran: [p.veteranTitle],
        });
      } else {
        for (const fid of matchingFactIds) {
          if (!existing.triggeredByFactIds.includes(fid)) {
            existing.triggeredByFactIds.push(fid);
          }
        }
        if (!existing.unlocksPathwayTitles.includes(p.practitionerTitle)) {
          existing.unlocksPathwayTitles.push(p.practitionerTitle);
        }
        if (!existing.unlocksPathwayTitlesVeteran.includes(p.veteranTitle)) {
          existing.unlocksPathwayTitlesVeteran.push(p.veteranTitle);
        }
      }
    }
  }

  for (const [factId, val] of Object.entries(intake.answers)) {
    if (val !== "unknown") continue;
    const q = qById.get(factId);
    if (!q) continue;
    const existing = recordMap.get(q.missingRecord.recordId);
    if (existing && !existing.triggeredByFactIds.includes(factId)) {
      existing.triggeredByFactIds.push(factId);
    }
  }

  const prioritizedRecordsToLocate = Array.from(recordMap.values()).sort(
    (a, b) => a.priorityOrder - b.priorityOrder,
  );

  // -------------------------------------------------------------------------
  // Build Veteran Discussion Checklist & Practitioner Verification Gates
  // -------------------------------------------------------------------------
  const veteranDiscussionChecklist: string[] = [];
  for (const p of pathways) {
    if (p.disposition === "barred-or-inapplicable") continue;
    for (const qText of p.veteranDiscussionQuestions) {
      if (!veteranDiscussionChecklist.includes(qText)) {
        veteranDiscussionChecklist.push(qText);
      }
    }
  }

  // Gate 1: Evaluate ALL Wave 1 point-in-time links for FR pub-gaps, pre-baseline gaps, and SUMMARY_ONLY coverage!
  const allWave1Links = [link456, link4118, link3156c];
  const pubGapAlerts = allWave1Links
    .map((l) => l.publicationGapTrapAlert)
    .filter((a): a is string => Boolean(a));
  const gapLinks = allWave1Links.filter((l) => l.doNotRely);
  const summaryOnlyLinks = allWave1Links.filter(
    (l) => !l.doNotRely && l.coverageState === "SUMMARY_ONLY",
  );

  const gate1NeedsAction =
    pubGapAlerts.length > 0 || gapLinks.length > 0 || summaryOnlyLinks.length > 0;

  let gate1Detail: string;
  if (pubGapAlerts.length > 0) {
    gate1Detail = pubGapAlerts.join(" ");
  } else if (gapLinks.length > 0) {
    gate1Detail = `Pre-Baseline Coverage Gap on ${safeDate} (${gapLinks.map((g) => g.cfrSection).join(", ")}): Do Not Rely on unindexed snapshots—pull the contemporaneous official print 38 C.F.R. / Rating Schedule edition on GovInfo before pleading CUE.`;
  } else if (summaryOnlyLinks.length > 0) {
    gate1Detail = `Summary-Only Coverage on ${safeDate} (${summaryOnlyLinks.map((s) => s.cfrSection).join(", ")}): Pull the contemporaneous official print 38 C.F.R. edition on GovInfo before pleading CUE (and confirm zero reliance on proposed/unfinalized 90 FR 46542).`;
  } else {
    gate1Detail = `Verbatim Wave 1 snapshots resolved for ${safeDate} (§ 4.56, § 4.118, § 3.156(c)) with zero FR publication-vs-effective gap traps; confirm zero reliance on proposed/unfinalized rules (e.g., 90 FR 46542).`;
  }

  const agencySubsumptionConflict =
    intake.decisionAgency === "AOJ-RO" && intake.bvaMeritsSubsumed === "yes";

  const practitionerVerificationGates: PractitionerVerificationGate[] = [
    {
      gateId: "gate-contemporaneous-cfr-and-fr-dates",
      title: "1. Contemporaneous 38 C.F.R. Text & FR Pub-vs-Effective Date Check",
      detail: gate1Detail,
      status: gate1NeedsAction ? "action-required" : "verified",
    },
    {
      gateId: "gate-non-cue-exhaustion",
      title: "2. Non-CUE Open-Record Vehicle Exhaustion (§ 3.156(c) & Pending Streams)",
      detail:
        "Exhaust 38 C.F.R. § 3.156(c) service/surgical record reconsideration (overrides Board finality under § 20.1411(b)) and non-final pending streams (Tablazon, Beraud/Lang § 3.156(b), pre-2015 § 3.157(b), AMA § 5104(b) Hamill) before expending Subpart O Board CUE.",
      status:
        ans("official_service_or_surgical_records_missing_at_t0") === "unknown" ||
        ans("open_stream_or_unanswered_filing_clue") === "unknown"
          ? "action-required"
          : "verified",
    },
    {
      gateId: "gate-subsumption-and-20-1409c",
      title: "3. BVA Subsumption (§ 20.1104) & § 20.1409(c) Single-Merits-Decision Audit",
      detail:
        intake.priorBvaCueDecidedOnMerits === "yes"
          ? "BAR ALERT: Prior merits Subpart O decision indicated—38 C.F.R. § 20.1409(c) bars a second Board CUE motion on the same Board issue (verify whether prior dismissal was without prejudice under § 20.1404(b))."
          : agencySubsumptionConflict
            ? "MERGER ALERT: AOJ-RO selected alongside BVA merits affirmance—38 C.F.R. § 20.1104 subsumes the RO decision into the BVA decision (target § 3.156(c) or Subpart O Board CUE, not § 3.105(a))."
            : "Verify VBMS/VACOLS history for BVA merger (§ 20.1104) and confirm zero prior merits Subpart O CUE rulings on the target Board issue (§ 20.1409(c)).",
      status:
        intake.priorBvaCueDecidedOnMerits === "yes"
          ? "barred"
          : intake.decisionAgency === "unknown" ||
              intake.bvaMeritsSubsumed === "unknown" ||
              intake.priorBvaCueDecidedOnMerits === "unknown" ||
              agencySubsumptionConflict
            ? "action-required"
            : "verified",
    },
    {
      gateId: "gate-bell-george-and-4-25-math",
      title: "4. Bell (1992-07-21) Record Scope, George (§ 20.1403(e)) & § 4.25 Payment Math",
      detail: `${isPre1992Bell ? "Pre-July 21, 1992 decision: document must have been physically in the C-file at T₀ (Damrel)." : "Post-July 21, 1992 decision: Bell constructive possession applies to pre-existing VA medical records."} Confirm no reliance on later judicial reinterpretation (George) and verify manifest monthly payment change under 38 C.F.R. § 4.25.`,
      status:
        ans("undebatable_extant_error_in_record_then") === "yes" &&
        ans("manifestly_changed_combined_payment_4_25") === "yes"
          ? "verified"
          : "action-required",
    },
  ];

  // -------------------------------------------------------------------------
  // Cross-System Title 10 DoD/DFAS CRSC Multiplier Check (Soto v. United States, 2025)
  // -------------------------------------------------------------------------
  let retireeCrscAdvisory: CrossSystemRetireeAdvisory;
  if (intake.retireeStatus === "military-retiree-or-ch61") {
    retireeCrscAdvisory = {
      applicable: true,
      status: "candidate",
      veteranNote:
        "Military Retiree Cross-System Check (DoD / DFAS, Separate From VA): If you receive military retired pay (20-year or Chapter 61 medical retirement) and win a retroactive combat-related VA rating, ask your representative about CRSC (10 U.S.C. § 1413a). Under Soto v. United States, 605 U.S. 360 (2025), the Supreme Court removed the old 6-year Barring Act cap on retroactive CRSC arrears.",
      practitionerNote:
        "Cross-System Title 10 DoD/DFAS Multiplier (10 U.S.C. § 1413a — NOT a Title 38 VA claim): Screen Chapter 61 and 20-year retirees for Combat-Related Special Compensation (CRSC). Under Soto v. United States, 605 U.S. 360 (2025) (and Aug. 20, 2025 DoD guidance), 10 U.S.C. § 1413a displaces the 6-year Barring Act cap (31 U.S.C. § 3702(b)) on retroactive combat-related retired-pay arrears.",
    };
  } else if (intake.retireeStatus === "unknown") {
    retireeCrscAdvisory = {
      applicable: true,
      status: "verify-retiree-status",
      veteranNote:
        "Optional Military Retiree Check (DoD / DFAS): If you retired from the military (20-year or Chapter 61 medical retirement), any retroactive combat-related VA award may also unlock uncapped retroactive DoD CRSC arrears under Soto v. United States (2025).",
      practitionerNote:
        "Verify DD-214 / DFAS Retiree Status: If claimant is a 20-year or Chapter 61 medical retiree, screen separate Title 10 DoD/DFAS CRSC arrears (10 U.S.C. § 1413a; Soto v. United States, 605 U.S. 360 (2025)) following any combat-related Title 38 retroactive grant.",
    };
  } else {
    retireeCrscAdvisory = {
      applicable: false,
      status: "not-applicable",
      veteranNote:
        "Non-retiree selected: DoD CRSC paid by DFAS applies only to military retirees whose retired pay was offset by VA compensation.",
      practitionerNote:
        "Title 10 CRSC (10 U.S.C. § 1413a) marked inapplicable (claimant is not a 20-year or Chapter 61 military retiree).",
    };
  }

  return {
    intake: { ...intake, decisionDate: safeDate },
    twoPaneContext,
    pathways,
    prioritizedRecordsToLocate,
    veteranDiscussionChecklist,
    practitionerVerificationGates,
    retireeCrscAdvisory,
  };
}

function deduplicateSimpleRecords(
  items: MissingRecordDefinition[],
): MissingRecordDefinition[] {
  const seen = new Set<string>();
  const out: MissingRecordDefinition[] = [];
  for (const item of items) {
    if (!seen.has(item.recordId)) {
      seen.add(item.recordId);
      out.push(item);
    }
  }
  return out;
}
