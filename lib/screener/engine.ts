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
  assignCanonicalSectionSlugs,
  buildBitemporalTwoPaneContext,
  buildOfficialFallbackUrls,
  normalizeCfrSlug,
  resolveCfrAtDate,
} from "@/lib/corpus/temporal";
import type {
  BitemporalTwoPaneContext,
  CfrVersionRecord,
  CompiledCfrVersion,
} from "@/lib/corpus/types";
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

const RECORD_PRIOR_DECISION_LETTER_AND_DATE: MissingRecordDefinition = {
  recordId: "prior-va-decision-letter-and-date",
  documentName:
    "Find the decision letter — Prior VA Rating Decision, Notification Letter, or BVA Decision Date",
  whyItMatters:
    "Without the exact VA decision date, point-in-time 38 C.F.R. wording, historical Title 38 section numbers, and the July 21, 1992 Bell record-scope cutoff cannot be pinned down.",
  howToRequest:
    "Check VA.gov decision letters, saved VA envelopes, or file VA Form 20-10206 (FOIA / Privacy Act Request) for your complete Claims File (C-File) and Rating Code Sheets to confirm the exact decision date.",
  practitionerAuditNote:
    "Confirm exact Rating Decision code-sheet promulgation date and notification mailing date (or BVA decision date) in VBMS before resolving T₀ 38 C.F.R. snapshots or pleading CUE.",
  priorityOrder: 0,
};

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

const RECORD_REDUCTION_NOTICE_AND_STABILIZATION: MissingRecordDefinition = {
  recordId: "reduction-notice-and-stabilized-code-sheets",
  documentName:
    "Pre-Reduction 60-Day Proposal Letter, Reduction Rating Code Sheets & Longitudinal C&P Exams",
  whyItMatters:
    "Reveals how many years the prior evaluation or service connection was in effect (5-year § 3.344 stabilization, 10-year § 3.957 severance shield, 20-year § 3.951(b) protection, or § 3.951(a) rating-schedule readjustment shield) and whether VA gave mandatory 60-day advance notice (§ 3.105(e)) and proved sustained improvement under the ordinary conditions of life.",
  howToRequest:
    "Request your complete C-file via VA Form 20-10206 and compare the original grant Rating Code Sheet date, any pre-reduction proposal notice, and the exam relied on to reduce.",
  practitionerAuditNote:
    "Measure exact effective-to-effective duration (§§ 3.105(e), 3.344(c), 3.951, 3.957), verify 60-day proposal + 30-day § 3.105(i) predetermination hearing notice (Stern), and audit longitudinal medical history (Brown v. Brown, 5 Vet. App. 413 (1993)).",
  priorityOrder: 2,
};

const RECORD_UNEMPLOYABILITY_AND_SMC_FUNCTIONAL: MissingRecordDefinition = {
  recordId: "tdiu-employment-and-smc-functional-records",
  documentName:
    "SSA Earnings / Disability File, VA Form 21-8940 / VAMC Work Notes & ADL / Loss-of-Use Exams",
  whyItMatters:
    "Documents whether service-connected disabilities prevented substantially gainful employment (inferred TDIU under § 4.16 and Roberson) or caused loss of use of extremities/organs, housebound confinement, or need for daily Aid and Attendance (mandatory statutory SMC under 38 U.S.C. § 1114(k)–(t)).",
  howToRequest:
    "Gather Social Security Administration (SSA) disability/earnings records, VAMC vocational/clinical notes, and VA Form 21-2680 Aid and Attendance or C&P functional assessments.",
  practitionerAuditNote:
    "Audit pre-2015 informal/inferred TDIU triggers (Roberson; Rice), SMC(s) TDIU+60% predicates (Buie; Bradley), § 3.350(f)(3)–(4) multi-step bumps (Barry), and SMC(t) TBI care needs (Laska).",
  priorityOrder: 4,
};

const RECORD_HERBICIDE_DECK_LOGS_AND_NEHMER: MissingRecordDefinition = {
  recordId: "herbicide-exposure-deck-logs-and-prior-code-sheets",
  documentName:
    "DD-214, Deck Logs / Unit Histories (Vietnam, Blue Water, DMZ, Thailand/PACT) & Post-1985 Rating Code Sheets",
  whyItMatters:
    "Under the Nehmer court orders (38 C.F.R. § 3.816), if a prior claim—or even an uncompensated diagnostic code or medical mention in a prior VA decision on or after Sept. 25, 1985—involved a covered herbicide disease, retroactive benefits reach back to that original claim date for the Veteran, survivors, or estate.",
  howToRequest:
    "Request all post-Sept. 25, 1985 Rating Code Sheets in your C-file (VA Form 20-10206) alongside DD-214, ship deck logs, or unit deployment records.",
  practitionerAuditNote:
    "Audit every post-Sept. 25, 1985 claim and Rating Code Sheet for diagnostic codes or clinical diagnoses of covered § 3.309(e) / PACT herbicide conditions under § 3.816(c)(2) and post-Dec. 2, 2021 § 3.816(f) uncapped payee rules (86 FR 68409).",
  priorityOrder: 3,
};

const RECORD_SURVIVOR_DEATH_CERT_AND_PENDING_DOCKET: MissingRecordDefinition = {
  recordId: "survivor-death-certificate-and-pending-docket",
  documentName:
    "Death Certificate / Autopsy Summary, Veteran's Historical Rating Code Sheets & Pending Appeal Docket",
  whyItMatters:
    "Establishes whether a service-connected or PACT/herbicide condition caused or contributed to death (§ 3.312 / § 3.33), whether the Veteran held (or should have held via § 3.22(b) service records or lifetime CUE) a 10-year 100%/TDIU rating (§ 1318), and whether a claim was pending at death for 1-year substitution (§ 5121A, VA Form 21P-0847).",
  howToRequest:
    "Obtain the long-form death certificate, discharge summary, and FOIA copy of the Veteran's C-file Rating Code Sheets and VBMS/VACOLS pending-claim status immediately (watching the 1-year post-death substitution and accrued deadlines).",
  practitionerAuditNote:
    "Triage § 1310/§ 3.312 direct/contributory death, § 1305/§ 3.33 PACT DIC re-evaluation, § 1318/§ 3.22(b)(1)–(2) 10-year total rating, § 3.55 age-55/57 remarriage dates, and 1-year § 5121A substitution (21P-0847) vs. § 3.816(f) Nehmer estate awards.",
  priorityOrder: 2,
};

const RECORD_DD214_OMPF_AND_DISCHARGE_MENTAL_HEALTH: MissingRecordDefinition = {
  recordId: "ompf-separation-packet-and-insanity-records",
  documentName:
    "Complete Official Military Personnel File (OMPF), Separation Packet, All Enlistment Contracts & Mental Health Records",
  whyItMatters:
    "Checks whether an earlier honorable enlistment establishes unconditional veteran status (§ 3.13(c)), whether service-related mental illness, TBI, or trauma triggers the § 3.354(b) insanity exception or the June 25, 2024 § 3.12(e) compelling-circumstances factors, and how BCMR/DRB upgrades (§ 3.400(g)) affect effective dates.",
  howToRequest:
    "Submit SF 180 to NPRC requesting the complete OMPF (including enlistment/reenlistment contracts, court-martial or administrative separation boards, and STRs) plus Vet Center or VAMC mental health records.",
  practitionerAuditNote:
    "Screen 38 U.S.C. § 101(18)(B) / § 3.13(c) chartable prior enlistments, § 5303(b) / § 3.354(b) insanity (Zang; Gardner), June 25, 2024 § 3.12(d)(2) & (e) compelling circumstances (89 FR 32361), and 10 U.S.C. §§ 1552/1553 upgrade dates.",
  priorityOrder: 3,
};

const RECORD_DFAS_SEVERANCE_W2_AND_AWARD_WITHHOLDING: MissingRecordDefinition = {
  recordId: "dfas-severance-orders-and-va-withholding-audit",
  documentName:
    "DD-214 Block 18/24–28, Chapter 61 PEB Combat-Related Orders, DFAS Severance Tax Stub & VA Award Withholding Ledger",
  whyItMatters:
    "Verifies whether VA unlawfully recouped disability severance pay barred by 10 U.S.C. § 1212(d)(2) (post-Jan. 28, 2008 combat-zone / combat-operations Chapter 61 separations), recouped pre-tax gross instead of after-tax net severance (post-Sept. 30, 1996), or withheld compensation belonging to independent non-severance disabilities (§ 3.700(a)(3)).",
  howToRequest:
    "Pull your DD-214, Physical Evaluation Board (PEB) findings (DA Form 199 / branch equivalent), separation-year W-2/DFAS tax withholding statement, and VA audit/withholding accounting via VA Form 20-10206.",
  practitionerAuditNote:
    "Audit 10 U.S.C. § 1212(d)(2) & 38 C.F.R. § 3.700(a)(3) combat-zone / combat-operations non-recoupment (>= Jan. 28, 2008), post-Sept. 30, 1996 net after-tax cap (Pub. L. 104-201, § 653), and monthly severance-disability compensation cap.",
  priorityOrder: 5,
};

// ---------------------------------------------------------------------------
// Full-Corpus Three-Valued Screening Fact Questions
// ---------------------------------------------------------------------------

export const SCREENING_QUESTIONS: ReadonlyArray<ScreeningFactQuestion> = [
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
    factId: "running_rating_reduced_or_severed",
    group: "void-reduction",
    veteranQuestion:
      "Did VA lower an existing monthly disability rating percentage (or sever service connection) after you were already receiving that rating?",
    veteranHelp:
      "When VA reduces an active running award without following strict medical-improvement and advance-notice rules, the reduction can be legally void from the start without proving CUE.",
    practitionerQuestion:
      "Did VA reduce a running compensation evaluation or sever an existing grant of service connection (as opposed to assigning initial retrospective staged ratings)?",
    practitionerAuthorityNote:
      "38 C.F.R. §§ 3.105(d)–(e), 3.343(a), 3.344, 3.951, 3.957; Brown v. Brown, 5 Vet. App. 413 (1993).",
    missingRecord: RECORD_REDUCTION_NOTICE_AND_STABILIZATION,
  },
  {
    factId: "stabilized_5_10_20yr_or_missing_60day_notice_clue",
    group: "void-reduction",
    veteranQuestion:
      "Had that rating been in place for 5+ years (or 10+ / 20+ years), OR did VA reduce it after a single exam, after a rating-schedule change, or without 60-day advance notice?",
    veteranHelp:
      "Ratings in effect 5+ years (§ 3.344) cannot be lowered off a single snapshot exam without sustained improvement in daily life and work; 20+ year ratings (§ 3.951(b)) and 10+ year service connection (§ 3.957) carry statutory shields.",
    practitionerQuestion:
      "Did the reduction/severance violate § 3.344 (>=5-yr stabilization / single exam), § 3.951(a) (VASRD readjustment), § 3.951(b) (>=20-yr protection), § 3.957 (>=10-yr SC), or § 3.105(e)/(i) 60-day notice / hearing freeze?",
    practitionerAuthorityNote:
      "38 U.S.C. §§ 110, 1155, 1159; Kitchens v. Brown, 7 Vet. App. 320 (1995); Stern v. McDonough, 34 Vet. App. 51 (2021).",
    missingRecord: RECORD_REDUCTION_NOTICE_AND_STABILIZATION,
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
    factId: "unemployability_or_smc_loss_of_use_housebound_clue",
    group: "tdiu-and-smc",
    veteranQuestion:
      "Do VA or medical records show service-connected conditions prevented full-time work (TDIU), OR show loss of use of a hand/foot/organ, housebound status, or need for daily Aid and Attendance (SMC)?",
    veteranHelp:
      "Special Monthly Compensation (SMC) and Total Disability based on Individual Unemployability (TDIU) can apply even when nobody knew which VA form or letter code to request.",
    practitionerQuestion:
      "Did the record reasonably raise unemployability (§ 4.16 TDIU; Roberson/Rice) OR satisfy statutory SMC criteria (38 U.S.C. § 1114(k)–(t): loss of use, 100%+60% SMC(s), A&A, § 3.350(f) steps, or TBI SMC(t))?",
    practitionerAuthorityNote:
      "38 U.S.C. § 1114(k)–(t); 38 C.F.R. §§ 3.350, 3.352, 4.16; Roberson (2001); Buie (2011); Bradley (2008); Barry (2024); Laska (2024).",
    missingRecord: RECORD_UNEMPLOYABILITY_AND_SMC_FUNCTIONAL,
  },
  {
    factId: "va_omitted_inferred_tdiu_or_mandatory_smc",
    group: "tdiu-and-smc",
    veteranQuestion:
      "Did VA assign only standard disability percentages while leaving out TDIU or Special Monthly Compensation (or cap multiple independent 50%/100% SMC steps at a single increase)?",
    veteranHelp:
      "Check historical Rating Code Sheets for SMC codes at the bottom and check whether VA ever adjudicated TDIU when work loss was mentioned.",
    practitionerQuestion:
      "Did VA fail to adjudicate reasonably raised TDIU, omit mandatory statutory SMC on the Code Sheet, or cap § 3.350(f)(3)–(4) intermediate/next-higher steps at a single bump?",
    practitionerAuthorityNote:
      "Akles v. Derwinski, 1 Vet. App. 118 (1991); Buie v. Shinseki, 24 Vet. App. 242 (2011); Barry v. McDonough, 101 F.4th 1348 (Fed. Cir. 2024).",
    missingRecord: RECORD_CFILE_CODE_SHEET_AND_NARRATIVE,
  },
  {
    factId: "herbicide_exposure_and_presumptive_condition",
    group: "nehmer-herbicide",
    veteranQuestion:
      "Did the Veteran serve in a qualifying Agent Orange / herbicide location (Vietnam, Blue Water Navy, Korean DMZ, Thailand, or PACT herbicide sites) and have a presumptive herbicide illness?",
    veteranHelp:
      "Includes ischemic heart disease, Parkinson's, prostate/respiratory/bladder cancer, diabetes, hypothyroidism, hypertension, MGUS, and other § 3.309(e) herbicide diseases.",
    practitionerQuestion:
      "Does the Veteran establish qualifying herbicide exposure (38 U.S.C. §§ 1116, 1116A; 38 C.F.R. § 3.307(a)(6)) and a covered presumptive herbicide condition (§ 3.309(e) / PACT)?",
    practitionerAuthorityNote:
      "38 C.F.R. §§ 3.307(a)(6), 3.309(e), 3.816; Pub. L. 116-23 (Blue Water Navy); Pub. L. 117-168 (PACT Act §§ 403–404).",
    missingRecord: RECORD_HERBICIDE_DECK_LOGS_AND_NEHMER,
  },
  {
    factId: "prior_claim_or_coding_mention_since_1985",
    group: "nehmer-herbicide",
    veteranQuestion:
      "Was an earlier claim filed or denied—or was the condition listed on a VA Rating Code Sheet—on or after September 25, 1985 before VA later granted benefits (or before the Veteran passed away)?",
    veteranHelp:
      "Under Nehmer (38 C.F.R. § 3.816), even an old denial or noncompensable code entry since Sept. 25, 1985 can unlock retroactive back pay for the Veteran, surviving family, or estate.",
    practitionerQuestion:
      "Was a claim involving the covered herbicide disease filed or denied on/after Sept. 25, 1985 (including Footnote 1 diagnostic-coding mentions under § 3.816(c)(2) or unpaid § 3.816(f) survivor/estate arrears)?",
    practitionerAuthorityNote:
      "38 C.F.R. § 3.816(c)–(f) (including Dec. 2, 2021 86 FR 68409 removal of the § 3.816(f)(3) prior-payee bar); Nehmer v. U.S. Veterans' Admin.",
    missingRecord: RECORD_HERBICIDE_DECK_LOGS_AND_NEHMER,
  },
  {
    factId: "survivor_or_post_mortem_claim_context",
    group: "survivor-dic-accrued",
    veteranQuestion:
      "Are you reviewing options for a surviving spouse, dependent child, parent, or estate after a Veteran's death (DIC monthly survivor benefits, substitution, or unpaid back pay)?",
    veteranHelp:
      "Select \"Yes\" if the Veteran is deceased; select \"No\" if the Veteran is living.",
    practitionerQuestion:
      "Does this matter involve post-mortem survivor or estate entitlement (Chapter 13 DIC under §§ 1310/1318/1305, § 5121A substitution, § 5121 accrued benefits, or § 3.816(f) Nehmer)?",
    practitionerAuthorityNote:
      "38 U.S.C. §§ 1305, 1310, 1318, 5121, 5121A; 38 C.F.R. §§ 3.22, 3.33, 3.55, 3.312, 3.1000, 3.1010.",
    missingRecord: RECORD_SURVIVOR_DEATH_CERT_AND_PENDING_DOCKET,
  },
  {
    factId: "ten_yr_total_service_death_or_pending_at_death_clue",
    group: "survivor-dic-accrued",
    veteranQuestion:
      "Did a service-connected or PACT/toxic condition contribute to death, OR was the Veteran at (or owed) 100% / TDIU for 10+ years, OR was a VA claim/appeal still pending when the Veteran died?",
    veteranHelp:
      "Also covers previously denied DIC claims eligible for PACT Act re-evaluation (§ 3.33) and surviving spouses who remarried at age 55+ (on/after Jan. 5, 2021) or age 57+ (since Jan. 1, 2004).",
    practitionerQuestion:
      "Is there evidence of § 3.312 principal/contributory SC death, § 3.33 PACT DIC re-evaluation, 10-yr § 1318 / § 3.22(b)(1)–(2) total disability, or a claim pending at death (§ 5121A / § 3.1000)?",
    practitionerAuthorityNote:
      "38 C.F.R. §§ 3.22(a)–(b), 3.33(d)(1) (88 FR 82261, eff. Jan. 23, 2024), 3.55(a)(9)–(11), 3.312, 3.1000, 3.1010.",
    missingRecord: RECORD_SURVIVOR_DEATH_CERT_AND_PENDING_DOCKET,
  },
  {
    factId: "oth_or_discharge_bar_blocked_benefits",
    group: "cod-discharge",
    veteranQuestion:
      "Did VA deny benefits or health care because of an Other-Than-Honorable (OTH), Bad Conduct (BCD), or Character of Discharge (COD) determination?",
    veteranHelp:
      "Select \"No\" if all periods of service were Honorable or General Under Honorable Conditions without a discharge bar.",
    practitionerQuestion:
      "Was benefit eligibility denied or questioned under statutory (38 U.S.C. § 5303(a)) or regulatory (38 C.F.R. § 3.12) Character of Discharge bars?",
    practitionerAuthorityNote:
      "38 U.S.C. §§ 101(2), 101(18)(B), 5303(a)–(b); 38 C.F.R. §§ 3.12 (89 FR 32361, eff. June 25, 2024), 3.13, 3.354(b).",
    missingRecord: RECORD_DD214_OMPF_AND_DISCHARGE_MENTAL_HEALTH,
  },
  {
    factId: "prior_good_enlistment_insanity_or_compelling_circumstances",
    group: "cod-discharge",
    veteranQuestion:
      "Did the Veteran complete an earlier honorable enlistment before reenlisting, experience severe mental health / TBI / MST / combat trauma tied to the discharge conduct, or receive a discharge upgrade?",
    veteranHelp:
      "An earlier completed enlistment (§ 3.13(c)), VA's broad mental-illness insanity rule (§ 3.354(b)), or VA's June 25, 2024 compelling-circumstances rule (§ 3.12(e)) can unlock VA eligibility.",
    practitionerQuestion:
      "Does the OMPF/medical record support § 3.13(c) conditional discharge, § 3.354(b) insanity at the time of the offense, June 25, 2024 § 3.12(d)(2)/(e) compelling circumstances, or a BCMR/DRB upgrade (§ 3.400(g))?",
    practitionerAuthorityNote:
      "VAOPGCPREC 10-96 (§ 3.13(c)); Zang / Gardner (§ 3.354(b)); 38 C.F.R. § 3.12(d)(2),(e) (eff. June 25, 2024); 38 C.F.R. § 3.400(g).",
    missingRecord: RECORD_DD214_OMPF_AND_DISCHARGE_MENTAL_HEALTH,
  },
  {
    factId: "va_recouped_disability_severance_or_separation_pay",
    group: "severance-recoupment",
    veteranQuestion:
      "Did VA withhold monthly VA disability compensation to pay back military disability severance pay, separation pay (SSB/VSI), or readjustment pay?",
    veteranHelp:
      "Check old VA award letters for a monthly withholding line recouping lump-sum military severance or separation pay.",
    practitionerQuestion:
      "Did VA recoup military disability severance, separation, or readjustment pay from Title 38 compensation under 38 C.F.R. § 3.700(a)(2), (3), or (5)?",
    practitionerAuthorityNote:
      "10 U.S.C. § 1212(d)(2); 38 C.F.R. § 3.700(a)(2)–(5) (67 FR 60868; 74 FR 26956).",
    missingRecord: RECORD_DFAS_SEVERANCE_W2_AND_AWARD_WITHHOLDING,
  },
  {
    factId: "combat_zone_post2008_pretax_gross_or_excess_withholding",
    group: "severance-recoupment",
    veteranQuestion:
      "Was the medical separation on or after Jan. 28, 2008 for a combat-zone / combat-operations injury, OR did VA recoup pre-tax gross pay (post-Sept. 1996) or take money from unrelated VA ratings?",
    veteranHelp:
      "Combat-zone / combat-operations severance since Jan. 28, 2008 is 100% exempt from VA recoupment, and post-Sept. 30, 1996 recoupment is capped at the after-tax net amount.",
    practitionerQuestion:
      "Did VA violate 10 U.S.C. § 1212(d)(2) (post-Jan. 28, 2008 combat-zone / combat-operations non-recoupment), recoup pre-tax gross pay post-Sept. 30, 1996, or exceed the severance disability's monthly compensation rate (§ 3.700(a)(3))?",
    practitionerAuthorityNote:
      "Pub. L. 110-181, § 1646 (10 U.S.C. § 1212(d)(2), eff. Jan. 28, 2008); Pub. L. 104-201, § 653 (eff. Oct. 1, 1996); 38 C.F.R. § 3.700(a)(3).",
    missingRecord: RECORD_DFAS_SEVERANCE_W2_AND_AWARD_WITHHOLDING,
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

export const WAVE1_SCREENING_QUESTIONS = SCREENING_QUESTIONS;

function createAllNoAnswers(overrides: Record<string, TriValue>): Record<string, TriValue> {
  const out: Record<string, TriValue> = {};
  for (const q of SCREENING_QUESTIONS) {
    out[q.factId] = "no";
  }
  return { ...out, ...overrides };
}

export function createDefaultInvestigationState(
  decisionDate = "",
): InvestigationIntakeState {
  const answers: Record<string, TriValue> = {};
  for (const q of SCREENING_QUESTIONS) {
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
      state: createDefaultInvestigationState(""),
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
        answers: createAllNoAnswers({
          official_service_or_surgical_records_missing_at_t0: "yes",
          newly_associated_records_speak_to_disputed_element: "yes",
          open_stream_or_unanswered_filing_clue: "unknown",
          not_subsequently_finally_adjudicated: "unknown",
          penetrating_wound_rated_only_as_scar: "yes",
          deep_fascia_or_muscle_pathology_documented: "yes",
          undebatable_extant_error_in_record_then: "unknown",
          manifestly_changed_combined_payment_4_25: "yes",
        }),
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
        answers: createAllNoAnswers({
          penetrating_wound_rated_only_as_scar: "yes",
          deep_fascia_or_muscle_pathology_documented: "yes",
          undebatable_extant_error_in_record_then: "yes",
          manifestly_changed_combined_payment_4_25: "yes",
        }),
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
        answers: createAllNoAnswers({
          official_service_or_surgical_records_missing_at_t0: "unknown",
          newly_associated_records_speak_to_disputed_element: "unknown",
          penetrating_wound_rated_only_as_scar: "yes",
          deep_fascia_or_muscle_pathology_documented: "unknown",
          undebatable_extant_error_in_record_then: "yes",
          manifestly_changed_combined_payment_4_25: "yes",
        }),
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
        answers: createAllNoAnswers({
          open_stream_or_unanswered_filing_clue: "yes",
          not_subsequently_finally_adjudicated: "yes",
          manifestly_changed_combined_payment_4_25: "unknown",
        }),
      },
    },
    {
      presetId: "preset-1995-void-stabilized-reduction",
      veteranLabel: "1995 Lowered 5-Year Rating (§ 3.344 Void Reduction)",
      practitionerLabel: "1995-04-10 Brown Void Stabilized Rating Reduction (§§ 3.105(e), 3.344)",
      shortDescription:
        "Stabilized >=5-year evaluation reduced after a single exam—restorable ab initio under Brown v. Brown without proving CUE.",
      state: {
        decisionDate: "1995-04-10",
        decisionAgency: "AOJ-RO",
        issueFocus: "stabilized-reduction-or-severance",
        bvaMeritsSubsumed: "no",
        priorBvaCueDecidedOnMerits: "no",
        retireeStatus: "none",
        answers: createAllNoAnswers({
          running_rating_reduced_or_severed: "yes",
          stabilized_5_10_20yr_or_missing_60day_notice_clue: "yes",
        }),
      },
    },
    {
      presetId: "preset-2016-survivor-1318-dic-substitution",
      veteranLabel: "2016 Survivor DIC (§ 1318) & Pending Appeal",
      practitionerLabel: "2016-09-01 Survivor § 1318 / § 3.22(b) + § 5121A Substitution + Nehmer",
      shortDescription:
        "Screens surviving spouse DIC (§ 1310 / § 1318 / § 3.33 PACT), 1-year § 5121A substitution, and § 3.816(f) Nehmer estate rules.",
      state: {
        decisionDate: "2016-09-01",
        decisionAgency: "AOJ-RO",
        issueFocus: "survivor-dic-accrued",
        bvaMeritsSubsumed: "no",
        priorBvaCueDecidedOnMerits: "no",
        retireeStatus: "none",
        answers: createAllNoAnswers({
          survivor_or_post_mortem_claim_context: "yes",
          ten_yr_total_service_death_or_pending_at_death_clue: "yes",
          herbicide_exposure_and_presumptive_condition: "unknown",
          prior_claim_or_coding_mention_since_1985: "unknown",
        }),
      },
    },
    {
      presetId: "preset-2024-cod-pub-gap-and-combat-severance",
      veteranLabel: "May 2024 OTH Discharge Rule Gap & Combat Severance",
      practitionerLabel: "2024-05-15 § 3.12 COD FR Gap Trap (89 FR 32361) + § 3.354(b) & § 1212(d)(2)",
      shortDescription:
        "Decision between Apr. 26, 2024 FR publication and June 25, 2024 effective date of § 3.12 + § 3.354(b) insanity & combat severance check.",
      state: {
        decisionDate: "2024-05-15",
        decisionAgency: "AOJ-RO",
        issueFocus: "cod-or-insanity",
        bvaMeritsSubsumed: "no",
        priorBvaCueDecidedOnMerits: "no",
        retireeStatus: "none",
        answers: createAllNoAnswers({
          oth_or_discharge_bar_blocked_benefits: "yes",
          prior_good_enlistment_insanity_or_compelling_circumstances: "yes",
          va_recouped_disability_severance_or_separation_pay: "yes",
          combat_zone_post2008_pretax_gross_or_excess_withholding: "yes",
        }),
      },
    },
  ];

// ---------------------------------------------------------------------------
// Point-in-Time T₀ CFR Link Resolver Helper
// ---------------------------------------------------------------------------

function buildUnknownDateTwoPaneContext(): BitemporalTwoPaneContext {
  const baselineModernContext = buildBitemporalTwoPaneContext("2026-01-01", []);
  return {
    decisionDate: "unknown",
    statutoryEraLabel:
      "Decision Date Unknown — Confirm Exact Date on Decision Letter or Rating Code Sheet",
    statutoryEraDetail:
      "Historical Title 38 numbering (pre-1959 Veterans' Regulations, 1959–1991 former 38 U.S.C. sections, or post-Aug. 6, 1991 modern Title 38 U.S.C.) cannot be pinned down until the decision date is confirmed.",
    recordScopeRuleThen:
      "Decision Date Unknown: Decisions before July 21, 1992 require physical presence in the C-file for CUE (Damrel), while decisions on or after July 21, 1992 include pre-existing VA medical records constructively (Bell v. Derwinski).",
    informalClaimRuleThen:
      "Decision Date Unknown: Decisions before March 24, 2015 fall under former 38 C.F.R. §§ 3.155(a) & 3.157(b) informal/hospital-report claim rules; decisions on or after March 24, 2015 follow standardized claim forms (79 FR 57660).",
    publicationGapTrapAlert: null,
    vehiclesToday: baselineModernContext.vehiclesToday,
    collateralLimitsToday: baselineModernContext.collateralLimitsToday,
  };
}

function resolvePointInTimeLink(
  versions: CfrVersionRecord[],
  sectionSlug: string,
  cfrLabel: string,
  decisionDate: string,
  canonicalSlugById?: ReadonlyMap<string, string>,
): PointInTimeAuthorityLink {
  const matchingSectionVersions = versions.filter(
    (v) =>
      (v as Partial<CompiledCfrVersion>).sectionSlug === sectionSlug ||
      canonicalSlugById?.get(v.version_id) === sectionSlug ||
      normalizeCfrSlug(v.cfr_section) === sectionSlug,
  );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(decisionDate)) {
    const quarantinedForSection = matchingSectionVersions.filter(
      (v) =>
        v.regulatory_status === "proposed-nonbinding" ||
        v.regulatory_status === "interim-final-rescinded",
    );
    const quarantinedNote =
      quarantinedForSection.length > 0
        ? quarantinedForSection
            .map(
              (q) =>
                `${q.cfr_section} (${q.federal_register_citation ?? q.version_id}): Proposed / unfinalized or rescinded — NOT enacted law; never cite as binding regulation.`,
            )
            .join(" ")
        : null;
    const fallbackUrls = buildOfficialFallbackUrls(sectionSlug, cfrLabel);
    return {
      sectionSlug,
      cfrSection: cfrLabel,
      coverageState: "CORPUS_GAP_OR_QUEUED_WAVE",
      doNotRely: true,
      permalink: null,
      effectiveIntervalLabel:
        "Decision date unknown — locate decision letter to resolve exact snapshot",
      publicationDateLabel: "Confirm decision date first",
      publicationGapTrapAlert: null,
      quarantinedProposalsNote: quarantinedNote,
      explanation:
        "Exact 38 C.F.R. snapshot cannot be resolved until the VA decision date is confirmed.",
      officialEcfrUrl: fallbackUrls.ecfrUrl,
      officialGovinfoUrl: fallbackUrls.govinfoUrl,
    };
  }

  const resolved = resolveCfrAtDate(versions, sectionSlug, decisionDate);
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
  const hasExactDate = /^\d{4}-\d{2}-\d{2}$/.test(intake.decisionDate);
  const safeDate = hasExactDate ? intake.decisionDate : "unknown";

  const canonicalSlugById = assignCanonicalSectionSlugs(cfrVersions);
  const ans = (factId: string): TriValue => intake.answers[factId] ?? "unknown";

  const contextSlugs = new Set<string>(["38-cfr-3.156c"]);
  switch (intake.issueFocus) {
    case "penetrating-scar-muscle":
    case "general-collateral-review":
      contextSlugs.add("38-cfr-4.56");
      contextSlugs.add("38-cfr-4.118");
      break;
    case "finality-nod-informal-notice":
      contextSlugs.add("38-cfr-3.157b");
      break;
    case "stabilized-reduction-or-severance":
      contextSlugs.add("38-cfr-3.344");
      contextSlugs.add("38-cfr-3.951");
      contextSlugs.add("38-cfr-3.957");
      contextSlugs.add("38-cfr-3.105e-i");
      break;
    case "tdiu-or-smc":
      contextSlugs.add("38-cfr-4.16a-b");
      contextSlugs.add("38-cfr-3.350f3-5");
      contextSlugs.add("38-cfr-3.350j-3.352b-3.552b2");
      break;
    case "nehmer-herbicide":
      contextSlugs.add("38-cfr-3.816");
      break;
    case "survivor-dic-accrued":
      contextSlugs.add("38-cfr-3.22");
      contextSlugs.add("38-cfr-3.33");
      contextSlugs.add("38-cfr-3.312");
      contextSlugs.add("38-cfr-3.1000");
      contextSlugs.add("38-cfr-3.1010");
      break;
    case "cod-or-insanity":
      contextSlugs.add("38-cfr-3.12a-l");
      contextSlugs.add("38-cfr-3.13");
      contextSlugs.add("38-cfr-3.354a-b");
      break;
    case "severance-recoupment":
      contextSlugs.add("38-cfr-3.700a3-5");
      break;
  }
  if (
    ans("penetrating_wound_rated_only_as_scar") === "yes" ||
    ans("deep_fascia_or_muscle_pathology_documented") === "yes"
  ) {
    contextSlugs.add("38-cfr-4.56");
    contextSlugs.add("38-cfr-4.118");
  }
  if (
    ans("running_rating_reduced_or_severed") === "yes" ||
    ans("stabilized_5_10_20yr_or_missing_60day_notice_clue") === "yes"
  ) {
    contextSlugs.add("38-cfr-3.344");
    contextSlugs.add("38-cfr-3.951");
    contextSlugs.add("38-cfr-3.957");
    contextSlugs.add("38-cfr-3.105e-i");
  }
  if (
    ans("unemployability_or_smc_loss_of_use_housebound_clue") === "yes" ||
    ans("va_omitted_inferred_tdiu_or_mandatory_smc") === "yes"
  ) {
    contextSlugs.add("38-cfr-4.16a-b");
    contextSlugs.add("38-cfr-3.350f3-5");
  }
  if (
    ans("herbicide_exposure_and_presumptive_condition") === "yes" ||
    ans("prior_claim_or_coding_mention_since_1985") === "yes"
  ) {
    contextSlugs.add("38-cfr-3.816");
  }
  if (
    ans("survivor_or_post_mortem_claim_context") === "yes" ||
    ans("ten_yr_total_service_death_or_pending_at_death_clue") === "yes"
  ) {
    contextSlugs.add("38-cfr-3.22");
    contextSlugs.add("38-cfr-3.312");
    contextSlugs.add("38-cfr-3.1000");
    contextSlugs.add("38-cfr-3.1010");
  }
  if (
    ans("oth_or_discharge_bar_blocked_benefits") === "yes" ||
    ans("prior_good_enlistment_insanity_or_compelling_circumstances") === "yes"
  ) {
    contextSlugs.add("38-cfr-3.12a-l");
    contextSlugs.add("38-cfr-3.13");
    contextSlugs.add("38-cfr-3.354a-b");
  }
  if (
    ans("va_recouped_disability_severance_or_separation_pay") === "yes" ||
    ans("combat_zone_post2008_pretax_gross_or_excess_withholding") === "yes"
  ) {
    contextSlugs.add("38-cfr-3.700a3-5");
  }

  const scopedContextVersions = cfrVersions.filter((v) => {
    const slug =
      (v as Partial<CompiledCfrVersion>).sectionSlug ??
      canonicalSlugById.get(v.version_id) ??
      normalizeCfrSlug(v.cfr_section);
    return contextSlugs.has(slug);
  });
  const twoPaneContext = hasExactDate
    ? buildBitemporalTwoPaneContext(
        safeDate,
        scopedContextVersions.length > 0 ? scopedContextVersions : cfrVersions,
      )
    : buildUnknownDateTwoPaneContext();

  const link3156c = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.156c",
    "38 C.F.R. § 3.156(c)",
    safeDate,
    canonicalSlugById,
  );
  const link456 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-4.56",
    "38 C.F.R. § 4.56",
    safeDate,
    canonicalSlugById,
  );
  const link4118 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-4.118",
    "38 C.F.R. § 4.118",
    safeDate,
    canonicalSlugById,
  );
  const link3344 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.344",
    "38 C.F.R. § 3.344",
    safeDate,
    canonicalSlugById,
  );
  const link3951 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.951",
    "38 C.F.R. § 3.951",
    safeDate,
    canonicalSlugById,
  );
  const link3957 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.957",
    "38 C.F.R. § 3.957",
    safeDate,
    canonicalSlugById,
  );
  const link3105ei = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.105e-i",
    "38 C.F.R. § 3.105(e) & (i)",
    safeDate,
    canonicalSlugById,
  );
  const link416 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-4.16a-b",
    "38 C.F.R. § 4.16(a)–(b)",
    safeDate,
    canonicalSlugById,
  );
  const link3350f = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.350f3-5",
    "38 C.F.R. § 3.350(f)(3)–(5)",
    safeDate,
    canonicalSlugById,
  );
  const link3350j = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.350j-3.352b-3.552b2",
    "38 C.F.R. §§ 3.350(j) & 3.352(b)",
    safeDate,
    canonicalSlugById,
  );
  const link3816 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.816",
    "38 C.F.R. § 3.816",
    safeDate,
    canonicalSlugById,
  );
  const link322 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.22",
    "38 C.F.R. § 3.22",
    safeDate,
    canonicalSlugById,
  );
  const link3312 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.312",
    "38 C.F.R. § 3.312",
    safeDate,
    canonicalSlugById,
  );
  const link31000 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.1000",
    "38 C.F.R. § 3.1000",
    safeDate,
    canonicalSlugById,
  );
  const link31010 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.1010",
    "38 C.F.R. § 3.1010",
    safeDate,
    canonicalSlugById,
  );
  const link312 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.12a-l",
    "38 C.F.R. § 3.12",
    safeDate,
    canonicalSlugById,
  );
  const link313 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.13",
    "38 C.F.R. § 3.13",
    safeDate,
    canonicalSlugById,
  );
  const link3354 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.354a-b",
    "38 C.F.R. § 3.354(a)–(b)",
    safeDate,
    canonicalSlugById,
  );
  const link3700 = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-3.700a3-5",
    "38 C.F.R. § 3.700(a)(3) & (5)",
    safeDate,
    canonicalSlugById,
  );
  const linkSubpartO = resolvePointInTimeLink(
    cfrVersions,
    "38-cfr-20.1400-20.1411",
    "38 C.F.R. §§ 20.1400–20.1411",
    safeDate,
    canonicalSlugById,
  );

  const qById = new Map<string, ScreeningFactQuestion>(
    SCREENING_QUESTIONS.map((q) => [q.factId, q]),
  );

  const isPre1992Bell = hasExactDate && safeDate < "1992-07-21";
  const isPre2015Informal = hasExactDate && safeDate < "2015-03-24";
  const isAmaDecision = hasExactDate && safeDate >= "2019-02-19";

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
      bitemporalNoteVeteran: !hasExactDate
        ? "Decision Date Unknown: Modern § 3.156(c) reconsideration applies today whenever missing official military or surgical records enter your C-file; locate your decision letter to inspect the historical wording of § 3.156(c)."
        : link3156c.doNotRely
          ? `Note: ${safeDate} is earlier than our 1962-01-01 historical snapshot of § 3.156(c), though modern § 3.156(c) reconsideration still applies today whenever missing official military records are newly added to your C-file.`
          : `Modern § 3.156(c) reconsideration applies today when missing military records enter your C-file, and you can also inspect § 3.156(c) as it stood on ${safeDate}.`,
      bitemporalNotePractitioner: !hasExactDate
        ? "Decision Date Unknown: Contemporary § 3.156(c)(1),(3),(4) governs open reconsideration today upon newly associated service department records (Vigil; Emerson); confirm exact T₀ decision date before citing historical § 3.156(c) snapshots."
        : link3156c.doNotRely
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
  // PATHWAY 2: Brown Void Rating Reduction / Protected Evaluation Restoration (§§ 3.105(e), 3.344, 3.951, 3.957)
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fReduced = ans("running_rating_reduced_or_severed");
    if (fReduced === "yes") {
      triggeredVet.push(
        "VA lowered an active running monthly disability rating or severed an existing grant of service connection.",
      );
      triggeredPrac.push(
        "Challenged decision reduced an active running compensation evaluation or severed existing service connection.",
      );
    } else if (fReduced === "unknown") {
      missing.push(RECORD_REDUCTION_NOTICE_AND_STABILIZATION);
    } else {
      blockingVet.push(
        "You indicated VA did not lower an existing running disability rating or sever existing service connection.",
      );
      blockingPrac.push(
        "Decision did not reduce an active running evaluation or sever existing service connection.",
      );
    }

    const fProt = ans("stabilized_5_10_20yr_or_missing_60day_notice_clue");
    if (fProt === "yes") {
      triggeredVet.push(
        "The rating had been in place 5+ years (or 10+ / 20+ years), or VA reduced it after a single exam, after a rating-schedule change, or without 60-day advance notice.",
      );
      triggeredPrac.push(
        "Evidence of >=5-year stabilization (§ 3.344), >=10-year SC (§ 3.957), >=20-year protection (§ 3.951(b)), VASRD readjustment (§ 3.951(a)), or defective § 3.105(e)/(i) 60-day notice / predetermination freeze.",
      );
    } else if (fProt === "unknown") {
      missing.push(RECORD_REDUCTION_NOTICE_AND_STABILIZATION);
    } else {
      blockingVet.push(
        "You indicated the reduction followed full 60-day advance notice and complete medical proof on an unstabilized rating.",
      );
      blockingPrac.push(
        "No § 3.344 / § 3.951 / § 3.957 protection or § 3.105(e)/(i) procedural notice defect identified.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    const reductionLinks = [
      link3344,
      link3951,
      ...(!hasExactDate || safeDate >= "1962-01-01" ? [link3957] : []),
      ...(!hasExactDate || safeDate >= "1992-01-21" ? [link3105ei] : []),
    ];

    pathways.push({
      pathwayId: "unlawful-reduction-3-344-3-951-3-957",
      rankOrder: 2,
      priorityBadgeVeteran:
        "Priority 2 · Void Rating Reduction Check (Restores Rating Without Strict CUE)",
      priorityBadgePractitioner:
        "Tier 1A · Void Ab Initio Reduction / Severance Restoration (Brown v. Brown)",
      veteranTitle:
        "Restore an Unlawfully Lowered or Severed Existing Rating (38 C.F.R. §§ 3.105(e), 3.344, 3.951, 3.957)",
      practitionerTitle:
        "Void Rating Reduction & Statutory Protection Audit: 38 C.F.R. §§ 3.105(d)–(i), 3.343(a), 3.344, 3.951 & 3.957 (Brown v. Brown)",
      veteranSummary:
        "When VA lowers an active disability rating that has been in place 5+ years (§ 3.344) off a single exam without proving sustained improvement in daily life and work—or cuts a 20-year rating (§ 3.951(b)), severs 10-year service connection (§ 3.957), reduces solely because VA rewrote the rating schedule (§ 3.951(a)), or skips 60-day advance notice (§ 3.105(e))—courts treat the reduction as legally void from the beginning.",
      practitionerSummary:
        "Under Brown v. Brown, 5 Vet. App. 413 (1993), Kitchens v. Brown, 7 Vet. App. 320 (1995), and Stern v. McDonough, 34 Vet. App. 51 (2021), VA bears the affirmative burden to justify reducing a running compensation evaluation. Any reduction violating §§ 3.105(e)/(i), 3.343(a), 3.344(a)–(c), 3.951(a)–(b), or 3.957 is void ab initio—mandating full reinstatement back to the reduction effective date without pleading CUE.",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Void Reduction Restoration — VA Must Prove Lawful Notice & Sustained Real-Life Improvement",
      doctrinalScopeBadge:
        "Void Ab Initio Restoration (Brown / Kitchens / Stern) — Burden on VA Outside Collateral CUE",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 U.S.C. §§ 110, 1155, 1159",
        "38 C.F.R. §§ 3.105(d)–(i), 3.343(a), 3.344, 3.951, 3.957",
        "Brown v. Brown, 5 Vet. App. 413 (1993)",
        "Kitchens v. Brown, 7 Vet. App. 320 (1995)",
        "Stern v. McDonough, 34 Vet. App. 51 (2021)",
      ],
      bitemporalNoteVeteran: !hasExactDate
        ? "Decision Date Unknown: Locate the reduction decision letter and prior Rating Code Sheets to check how many years your higher rating was in effect (5, 10, or 20 years) and whether VA gave 60-day advance notice (§ 3.105(e))."
        : safeDate < "1992-01-21"
          ? `On ${safeDate}, 5-year stabilized rating rules (§ 3.344), 10-year severance rules (§ 3.957, eff. 1962/1968), and 20-year protection (§ 3.951(b)) governed running awards; VA added § 3.105(i) 30-day predetermination hearing rights effective January 21, 1992.`
          : `On ${safeDate}, both substantive stabilization protections (§§ 3.344, 3.951, 3.957) and procedural 60-day notice + 30-day predetermination hearing protections (§ 3.105(e) & (i)) governed running awards.`,
      bitemporalNotePractitioner: !hasExactDate
        ? "Decision Date Unknown: Confirm both the original grant effective date and the reduction decision/effective dates to measure 5-year § 3.344(c), 10-year § 3.957, and 20-year § 3.951(b) thresholds and post-Jan. 21, 1992 § 3.105(i) hearing rights."
        : `Measure duration from the original rating effective date to the effective date of the reduced evaluation (§ 3.105(e) 60-day post-final-notice buffer counts toward 5-year § 3.344(c), 10-year § 3.957, and 20-year § 3.951(b) thresholds). ${safeDate < "1993-10-18" ? "Note: pre-Oct. 18, 1993 § 3.344 is Summary Only—verify 26 FR 1586 print text if needed." : "Verbatim post-Oct. 18, 1993 § 3.344 text resolved."}`,
      pointInTimeLinks: reductionLinks,
      relatedSiteRoutes: [
        {
          label: "Playbook 05: Void Rating Reductions & Stabilized Ratings",
          href: "/playbooks/05-void-rating-reductions-stabilized-ratings",
        },
        { label: "38 C.F.R. § 3.344 Stabilization Reader", href: "/cfr/38-cfr-3.344" },
        { label: "38 C.F.R. § 3.951 Preservation Reader", href: "/cfr/38-cfr-3.951" },
      ],
      killSwitchesVeteran: [
        "Stabilized reduction rules (§ 3.344) protect active running monthly ratings—not step-up/step-down 'staged ratings' assigned all at once inside a single multi-year appeal decision.",
        "Temporary 100% surgical or hospital convalescent ratings (§§ 4.29 / 4.30) end on their scheduled date unless VA also lowered your underlying baseline rating.",
      ],
      killSwitchesToVerify: [
        "Reizenstein v. Shinseki, 583 F.3d 1331 (Fed. Cir. 2009) & Singleton v. Shinseki, 659 F.3d 1332 (Fed. Cir. 2011): §§ 3.343(a) and 3.344 do NOT apply to retrospective staged evaluations assigned within a single multi-year initial/appellate grant.",
        "38 C.F.R. §§ 4.29 & 4.30 Exemption: Expiration of fixed-duration hospital/surgical temporary 100% convalescence does not require § 3.105(e) notice unless the pre-existing baseline evaluation is reduced.",
      ],
      veteranDiscussionQuestions: [
        "How many years was my higher rating in effect from its start date to the date my monthly payment actually dropped—did it cross the 5-year (§ 3.344), 10-year (§ 3.957), or 20-year (§ 3.951(b)) mark?",
        "Did VA send a 60-day advance proposal notice (§ 3.105(e)) and compare my entire medical history rather than relying on a single C&P exam?",
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

    const temporalVet = !hasExactDate
      ? "Decision Date Unknown: Once you find your decision letter, check whether the decision was issued before March 24, 2015 (informal claims and VAMC hospital reports under former § 3.157(b)), between 2015 and February 18, 2019 (Legacy NOD/SOC and § 3.156(b) 1-year VAMC records), or on/after February 19, 2019 (AMA explicit notice under § 5104(b))."
      : isAmaDecision
        ? `Because ${safeDate} is on or after February 19, 2019 (the AMA era), VA cannot deny a claimed or reasonably raised issue by staying silent—any skipped issue remains legally open.`
        : isPre2015Informal
          ? `Because ${safeDate} is before March 24, 2015, informal written requests (21-4138, 10-7131) and VAMC or military hospital reports showing worsening of an already service-connected condition (former 38 C.F.R. § 3.157(b)) could start an open claim automatically.`
          : `For decisions between March 24, 2015 and February 18, 2019, standardized claim forms applied to new filings, but an unanswered Legacy NOD (missing an SOC), VAMC treatment notes within 1 year (§ 3.156(b)), or wrong-address mailing still kept finality from attaching.`;

    const temporalPrac = !hasExactDate
      ? "Decision Date Unknown: Confirm exact decision date to distinguish pre-March 24, 2015 former §§ 3.155(a)/3.157(b) informal/hospital claims, pre- vs. post-July 21, 1992 § 3.156(b) Beraud/Lang constructive receipt, Tablazon unissued SOCs, and post-Feb. 19, 2019 AMA § 5104(b) explicit-notice rules (Hamill)."
      : isAmaDecision
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
  // PATHWAY 4: Nehmer Herbicide Class-Action Retroactive Award & Estate Payee Audit (§ 3.816)
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fHerb = ans("herbicide_exposure_and_presumptive_condition");
    if (fHerb === "yes") {
      triggeredVet.push(
        "Qualifying Agent Orange / herbicide service (Vietnam, Blue Water Navy, Korean DMZ, Thailand, or PACT herbicide locations) and a presumptive herbicide condition were identified.",
      );
      triggeredPrac.push(
        "Qualifying herbicide exposure (38 U.S.C. §§ 1116/1116A; § 3.307(a)(6)) and covered § 3.309(e) / PACT herbicide disease identified.",
      );
    } else if (fHerb === "unknown") {
      missing.push(RECORD_HERBICIDE_DECK_LOGS_AND_NEHMER);
    } else {
      blockingVet.push(
        "You indicated no qualifying Agent Orange / herbicide service or presumptive herbicide condition applies.",
      );
      blockingPrac.push(
        "No qualifying herbicide exposure or covered § 3.309(e) / PACT herbicide condition identified.",
      );
    }

    const f1985 = ans("prior_claim_or_coding_mention_since_1985");
    if (f1985 === "yes") {
      triggeredVet.push(
        "An earlier VA claim, denial, or Rating Code Sheet entry on or after September 25, 1985 involved that herbicide condition.",
      );
      triggeredPrac.push(
        "Prior claim, denial, or § 3.816(c)(2) diagnostic-coding entry on/after Sept. 25, 1985 (or unpaid § 3.816(f) survivor/estate arrears) identified.",
      );
    } else if (f1985 === "unknown") {
      missing.push(RECORD_HERBICIDE_DECK_LOGS_AND_NEHMER);
    } else {
      blockingVet.push(
        "You indicated there was no prior claim or Rating Code Sheet entry on or after September 25, 1985 for that condition.",
      );
      blockingPrac.push(
        "No prior claim or § 3.816(c)(2) coding mention between Sept. 25, 1985 and the date the disease was added to § 3.309(e).",
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
      pathwayId: "nehmer-herbicide-retroactive-3-816",
      rankOrder: 4,
      priorityBadgeVeteran:
        "Priority 4 · Agent Orange / Nehmer Retroactive Class Protection (38 C.F.R. § 3.816)",
      priorityBadgePractitioner:
        "Tier 1C · Nehmer Consent-Decree Retroactive Effective Date & Estate Payment (§ 3.816)",
      veteranTitle:
        "Agent Orange / Herbicide Retroactive Effective Dates & Survivor/Estate Payments (38 C.F.R. § 3.816)",
      practitionerTitle:
        "Nehmer Class-Action Effective-Date & Uncapped Estate/Payee Audit (38 C.F.R. § 3.816(c)–(f))",
      veteranSummary:
        "Under the federal Nehmer court orders (38 C.F.R. § 3.816), if a Veteran with qualifying herbicide exposure filed a claim—or had the condition listed on a VA Rating Code Sheet—on or after September 25, 1985 before VA recognized the illness as presumptive, VA must pay retroactive benefits back to that earlier claim (or when the illness began), including full uncapped back pay to eligible survivors or estates.",
      practitionerSummary:
        "Displaces 38 U.S.C. § 5110(g) and 38 C.F.R. § 3.114(a) for covered herbicide presumptions (including Blue Water Navy § 1116A and PACT Act herbicide additions such as hypertension and MGUS). Under 86 FR 68409 (effective December 2, 2021), VA removed the final sentence of § 3.816(f)(3), mandating full retroactive payment to newly identified § 3.816(f)(1) payees or the Veteran's estate with zero 1-year accrued-benefits filing bar.",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Mandatory Retroactive Class Rule — Reaches Back to Post-Sept. 25, 1985 Claims & Pays Survivors or Estates Without a 1-Year Filing Bar",
      doctrinalScopeBadge:
        "Displaces § 5110(g) / § 3.114(a) & § 5121 Time Bars — Includes Post-Dec. 2, 2021 Uncapped § 3.816(f) Payee Rule",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 U.S.C. §§ 1116, 1116A",
        "38 C.F.R. §§ 3.307(a)(6), 3.309(e), 3.816(c)–(f)",
        "86 FR 68409 (Dec. 2, 2021)",
        "Pub. L. 117-168, §§ 403–404 (PACT Act)",
      ],
      bitemporalNoteVeteran:
        "Even if the earlier denial happened in the 1980s or 1990s before § 3.816 was printed in 2003, modern Nehmer rules reach back to claims filed or pending on or after September 25, 1985—and since December 2, 2021, prior payments to another relative no longer block newly identified eligible family members or estates.",
      bitemporalNotePractitioner: !hasExactDate
        ? "Decision Date Unknown: Confirm exact prior claim and Rating Code Sheet dates—contemporary Nehmer rules reach claims filed on/after Sept. 25, 1985 (or pending May 3, 1989) alongside post-December 2, 2021 (86 FR 68409) uncapped § 3.816(f) estate rules."
        : safeDate >= "2003-09-24"
          ? `T₀ § 3.816 snapshot resolved (${link3816.effectiveIntervalLabel}); apply current post-December 2, 2021 § 3.816(f) uncapped payee rule (86 FR 68409) and audit Footnote 1 diagnostic-code mentions on all post-Sept. 25, 1985 Code Sheets.`
          : `Although ${safeDate} precedes the Sept. 24, 2003 codification of 38 C.F.R. § 3.816, Nehmer operates today as a binding retroactive vehicle reaching claims filed on/after Sept. 25, 1985 (or pending May 3, 1989) alongside post-December 2, 2021 (86 FR 68409) uncapped § 3.816(f) estate rules.`,
      pointInTimeLinks: !hasExactDate || safeDate >= "2003-09-24" ? [link3816] : [],
      relatedSiteRoutes: [
        {
          label: "Playbook 06: Nehmer Herbicide Presumptions & CRSC",
          href: "/playbooks/06-nehmer-herbicide-presumptions-crsc",
        },
        { label: "38 C.F.R. § 3.816 Nehmer Reader & Redline", href: "/cfr/38-cfr-3.816" },
      ],
      killSwitchesVeteran: [
        "Nehmer (§ 3.816) covers tactical herbicide / Agent Orange diseases—non-herbicide PACT Act burn-pit conditions follow different effective-date rules (typically August 10, 2022 or 1-year lookback, unless survivor DIC re-evaluation under § 3.33 applies).",
        "Retroactive compensation cannot start earlier than the date medical evidence shows the herbicide illness first manifested.",
      ],
      killSwitchesToVerify: [
        "Herbicide Scope Distinction: 38 C.F.R. § 3.816 governs herbicide-exposed class conditions—do not conflate with non-herbicide 38 U.S.C. § 1120 / 38 C.F.R. § 3.320 PACT burn-pit presumptions (which remain subject to § 3.114(a) / Aug. 10, 2022 floors except under 38 U.S.C. § 1305 / 38 C.F.R. § 3.33 DIC re-evaluation).",
        "Manifestation Floor (§ 3.816(c)(1)–(2)): Retroactive effective date is the later of the prior claim receipt date or the date the covered disease first manifested to a compensable degree.",
      ],
      veteranDiscussionQuestions: [
        "Do any VA Rating Code Sheets or medical notes in my C-file since September 25, 1985 list or mention my herbicide condition before VA finally granted it?",
        "If I am a survivor or estate representative, has VA audited unpaid Nehmer benefits under the post-December 2, 2021 § 3.816(f) rules?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 5: Inferred TDIU (§ 4.16; Roberson) & Mandatory Statutory SMC (38 U.S.C. § 1114(k)–(t))
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fClue = ans("unemployability_or_smc_loss_of_use_housebound_clue");
    if (fClue === "yes") {
      triggeredVet.push(
        "Records indicate service-connected disabilities prevented full-time work (TDIU) or involved loss of use, 100% + 60% housebound ratings, or daily Aid and Attendance / TBI care needs (SMC).",
      );
      triggeredPrac.push(
        "Record contains unemployability evidence (§ 4.16; Roberson/Rice) or statutory 38 U.S.C. § 1114(k)–(t) predicates (loss of use, SMC(s) 100%+60%, A&A, § 3.350(f) steps, or TBI SMC(t)).",
      );
    } else if (fClue === "unknown") {
      missing.push(RECORD_UNEMPLOYABILITY_AND_SMC_FUNCTIONAL);
    } else {
      blockingVet.push(
        "You indicated no unemployability (TDIU), loss-of-use, housebound, or Aid and Attendance (SMC) clues apply.",
      );
      blockingPrac.push(
        "No unemployability (§ 4.16) or statutory SMC (§ 1114(k)–(t)) factual predicates indicated.",
      );
    }

    const fOmitted = ans("va_omitted_inferred_tdiu_or_mandatory_smc");
    if (fOmitted === "yes") {
      triggeredVet.push(
        "VA assigned only standard disability percentages while skipping TDIU or Special Monthly Compensation (or capped multi-step SMC increases).",
      );
      triggeredPrac.push(
        "VA failed to adjudicate reasonably raised TDIU, omitted mandatory statutory SMC, or capped § 3.350(f)(3)–(4) steps at a single bump.",
      );
    } else if (fOmitted === "unknown") {
      missing.push(RECORD_CFILE_CODE_SHEET_AND_NARRATIVE);
    } else {
      blockingVet.push(
        "You indicated VA already fully addressed and paid all applicable TDIU and SMC benefits.",
      );
      blockingPrac.push(
        "TDIU and all applicable statutory SMC levels were already explicitly adjudicated and awarded.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    const tdiuSmcLinks = [
      link416,
      link3350f,
      ...(!hasExactDate || safeDate >= "2018-06-07" ? [link3350j] : []),
    ];

    pathways.push({
      pathwayId: "inferred-tdiu-and-statutory-smc",
      rankOrder: 5,
      priorityBadgeVeteran:
        "Priority 5 · Unaddressed Unemployability (TDIU) & Special Monthly Compensation (SMC)",
      priorityBadgePractitioner:
        "Tier 2A · Inferred § 4.16 TDIU (Roberson) & Mandatory Statutory SMC (§ 1114(k)–(t))",
      veteranTitle:
        "Check for Unaddressed Unemployability (TDIU) or Mandatory Special Monthly Compensation (SMC k–t)",
      practitionerTitle:
        "Inferred TDIU (38 C.F.R. § 4.16; Roberson/Rice) & Mandatory Statutory SMC Audit (38 U.S.C. § 1114(k)–(t); Buie / Bradley / Barry / Laska)",
      veteranSummary:
        "Veterans do not have to know Special Monthly Compensation (SMC) letter codes—VA must award SMC automatically whenever medical facts show loss of use of a hand/foot/organ, a single 100% rating (including TDIU) plus additional 60%+ ratings (SMC(s)), or need for daily Aid and Attendance. Likewise, before March 24, 2015 (and in omitted AMA issues), evidence that service-connected conditions prevented work could raise an inferred TDIU claim automatically.",
      practitionerSummary:
        "Combines two high-yield doctrines: (1) reasonably raised TDIU as part and parcel of an increased-rating stream (Roberson v. Principi, 251 F.3d 1378 (Fed. Cir. 2001); Rice v. Shinseki, 22 Vet. App. 447 (2009); pre-Mar. 24, 2015 informal claims or post-Feb. 19, 2019 AMA § 5104(b) omissions), and (2) mandatory statutory SMC entitlement whenever Code Sheet / exam predicates are met (Akles; Buie; Bradley TDIU+60% SMC(s); Barry uncapped § 3.350(f)(3)–(4) steps; Laska TBI SMC(t)).",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Mandatory Benefit Check — Pairs With Open Pending Claims, § 3.156(c) Records, or Current Supplemental Claims",
      doctrinalScopeBadge:
        "Hybrid Open-Stream (Roberson) & Statutory SMC Audit — Observe George (§ 20.1403(e)) Bar on Later Judicial Reinterpretations",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 U.S.C. § 1114(k)–(t)",
        "38 C.F.R. §§ 3.350, 3.352, 4.16",
        "Roberson v. Principi, 251 F.3d 1378 (Fed. Cir. 2001)",
        "Buie v. Shinseki, 24 Vet. App. 242 (2011)",
        "Barry v. McDonough, 101 F.4th 1348 (Fed. Cir. 2024)",
        "Laska v. McDonough, 37 Vet. App. 460 (2024)",
      ],
      bitemporalNoteVeteran: !hasExactDate
        ? "Decision Date Unknown: Locate your decision letter to check whether unemployability was raised before VA's March 24, 2015 standardized-form rule (VA Form 21-8940) and whether later SMC rulings like Barry (2024) or Laska (2024) call for an open claim or Supplemental Claim."
        : link416.publicationGapTrapAlert
          ? `Important Date Alert (${safeDate}): VA's 1990 TDIU poverty-threshold update (55 FR 31579) was published August 3, 1990 but did not take effect until September 4, 1990—so the earlier 1975 edition of § 4.16 governed on ${safeDate}. Also note TBI SMC(t) took effect October 1, 2011.`
          : `On ${safeDate}, check whether unemployability was raised before VA's March 24, 2015 standardized-form rule (VA Form 21-8940) and whether later SMC rulings like Barry (2024) or Laska (2024) require an open claim or Supplemental Claim rather than CUE.`,
      bitemporalNotePractitioner: `${link416.publicationGapTrapAlert ? `${link416.publicationGapTrapAlert} ` : ""}Audit pre-March 24, 2015 informal/inferred TDIU (VA Form 21-8940 standardized eff. Mar. 24, 2015 at 79 FR 57660; former § 4.16(c) 70% mental rule in force Mar. 1, 1989 – Nov. 6, 1996) and SMC statutory floors (SMC(t) floor Oct. 1, 2011 under Pub. L. 111-275; breast SMC(k) Nov. 1, 2000 / Dec. 6, 2002).`,
      pointInTimeLinks: tdiuSmcLinks,
      relatedSiteRoutes: [
        {
          label: "Playbook 04: Unadjudicated TDIU, Informal Claims & SMC",
          href: "/playbooks/04-unadjudicated-tdiu-informal-claims-smc",
        },
        {
          label: "Playbook 12: Aid & Attendance, SMC(l)–(r) & TBI SMC(t)",
          href: "/playbooks/12-aid-and-attendance-smc-l-r1-r2-and-smc-t",
        },
        {
          label: "SMC Complete Treatise & Step Math",
          href: "/docs/smc-complete-treatise-and-step-math",
        },
      ],
      killSwitchesVeteran: [
        "Since March 24, 2015, starting a new TDIU claim generally requires submitting VA Form 21-8940.",
        "Under George v. McDonough (2022), recent court rulings like Barry (2024 multi-step SMC) and Laska (2024 TBI SMC(t)) apply to open claims, appeals, and Supplemental Claims—not strict CUE motions against older final decisions.",
      ],
      killSwitchesToVerify: [
        "George v. McDonough, 596 U.S. 740 (2022) & 38 C.F.R. § 20.1403(e): Never plead later judicial reinterpretations—such as Barry v. McDonough (May 16, 2024), Laska v. McDonough (Sept. 6, 2024), or Bradley v. Peake (2008)—as CUE against final decisions predating those holdings; pursue open streams, § 3.156(c), or § 5108 Supplemental Claims.",
        "Post-March 24, 2015 Form Gate (79 FR 57660) & SMC(t) Floor: Formal VA Form 21-8940 applies post-Mar. 24, 2015; 38 U.S.C. § 1114(t) carries an absolute statutory effective-date floor of October 1, 2011.",
      ],
      veteranDiscussionQuestions: [
        "Did my VAMC notes, C&P exams, or Social Security disability records before March 24, 2015 show my service-connected conditions kept me from working without VA deciding TDIU?",
        "Looking at my Rating Code Sheet percentages and functional limits, do I qualify for SMC(k), housebound SMC(s), Aid and Attendance SMC(l), or multi-step increases under § 3.350(f)?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 6: Survivor DIC (§ 1310 / § 1318 / § 3.22(b) / § 3.33 PACT) & Substitution (§ 5121A)
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fSurv = ans("survivor_or_post_mortem_claim_context");
    if (fSurv === "yes") {
      triggeredVet.push(
        "You are checking survivor or post-mortem benefits (monthly DIC, substitution in a pending claim, or unpaid accrued benefits) after a Veteran's death.",
      );
      triggeredPrac.push(
        "Post-mortem survivor or estate posture confirmed (Chapter 13 DIC, § 5121A substitution, § 5121 accrued, or § 3.816(f) Nehmer).",
      );
    } else if (fSurv === "unknown") {
      missing.push(RECORD_SURVIVOR_DEATH_CERT_AND_PENDING_DOCKET);
    } else {
      blockingVet.push(
        "You indicated this review is for a living Veteran rather than a survivor or estate claim.",
      );
      blockingPrac.push(
        "Veteran is living—post-mortem Chapter 13 DIC and §§ 5121/5121A survivor/accrued vehicles are inapplicable.",
      );
    }

    const fDeath = ans("ten_yr_total_service_death_or_pending_at_death_clue");
    if (fDeath === "yes") {
      triggeredVet.push(
        "A service-connected or PACT/toxic condition caused or contributed to death, OR the Veteran had (or was owed) 10+ years at 100%/TDIU, OR a claim was pending at death.",
      );
      triggeredPrac.push(
        "Evidence of § 3.312 direct/contributory SC death, § 3.33 PACT DIC re-evaluation, 10-year § 1318 / § 3.22(b)(1)–(2) total disability, or pending claim at death (§ 5121A / § 3.1000).",
      );
    } else if (fDeath === "unknown") {
      missing.push(RECORD_SURVIVOR_DEATH_CERT_AND_PENDING_DOCKET);
    } else {
      blockingVet.push(
        "You indicated death was unrelated to service/presumptions, total disability lasted under 10 years, and no claim was pending at death.",
      );
      blockingPrac.push(
        "No § 3.312 causal/contributory nexus, § 3.33 PACT presumption, § 1318 10-year total rating predicate, or pending claim at death identified.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    const survivorLinks = [
      link3312,
      ...(!hasExactDate || safeDate >= "1978-10-01" ? [link322] : []),
      link31000,
      ...(!hasExactDate || safeDate >= "2014-10-06" ? [link31010] : []),
    ];

    pathways.push({
      pathwayId: "survivor-dic-1318-and-substitution-5121a",
      rankOrder: 6,
      priorityBadgeVeteran:
        "Priority 6 · Survivor DIC (§ 1310 / § 1318 / PACT § 3.33) & Pending-Claim Substitution",
      priorityBadgePractitioner:
        "Tier 2B · Chapter 13 DIC (§§ 1310, 1318, 1305/§ 3.33) & §§ 5121 / 5121A Substitution",
      veteranTitle:
        "Survivor Monthly DIC (§ 1310 / 10-Year § 1318 / PACT § 3.33), Pending-Claim Substitution & Accrued Back Pay",
      practitionerTitle:
        "Post-Mortem Triage: Direct/Contributory DIC (§ 3.312), § 1318 / § 3.22(b), PACT § 3.33 Re-Evaluation & § 5121A Substitution",
      veteranSummary:
        "Surviving spouses, dependent children, and eligible parents can qualify for monthly Dependency and Indemnity Compensation (DIC) if a service-connected or PACT Act illness caused or contributed to death (§ 3.312)—and if VA previously denied DIC before a post-August 10, 2022 presumption, 38 C.F.R. § 3.33 allows retroactive re-evaluation back to the original DIC claim. Even when death was unrelated to service, DIC applies if the Veteran held (or was owed via missing military records or lifetime-claim CUE under § 3.22(b)) 100% or TDIU for 10 continuous years (§ 1318). If a claim was pending at death, filing VA Form 21P-0847 within 1 year lets an eligible survivor step in to finish it.",
      practitionerSummary:
        "Coordinates four distinct survivor tracks: (1) § 1310 / § 3.312 principal or contributory death (plus 38 U.S.C. § 1305 / 38 C.F.R. § 3.33, eff. Jan. 23, 2024, assigning original-DIC-claim effective dates 'notwithstanding section 5110' on re-evaluated PACT claims); (2) § 1318 / § 3.22(b)(1)–(2) posthumous 10-year total-disability satisfaction via lifetime CUE or § 3.156(c) service records; (3) 1-year § 5121A substitution (VA Form 21P-0847, eff. Oct. 10, 2008 / § 3.1010 eff. Oct. 6, 2014) preserving open record development vs. closed-record § 5121 / § 3.1000 accrued benefits (uncapped post-Dec. 16, 2003); and (4) § 3.55 remarriage retention (age 57 on/after Jan. 1, 2004; age 55 on/after Jan. 5, 2021).",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Time-Sensitive Survivor Protections — Watch the 1-Year Death Filing Window for Substitution (21P-0847) & DIC",
      doctrinalScopeBadge:
        "Multi-Track Survivor & Estate Gate — Contrast 1-Yr § 5121A / § 5121 Deadlines With Uncapped § 3.816(f) & § 3.33(d)(1)",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 U.S.C. §§ 1305, 1310, 1318, 5121, 5121A",
        "38 C.F.R. §§ 3.22, 3.33, 3.55(a)(9)–(11), 3.312, 3.1000, 3.1010",
        "Rodriguez v. Peake, 511 F.3d 1147 (Fed. Cir. 2008)",
        "Nat'l Org. of Veterans' Advocates v. Sec'y, 809 F.3d 1359 (Fed. Cir. 2016)",
      ],
      bitemporalNoteVeteran:
        "Key Survivor Dates: Substitution (21P-0847) and non-Nehmer accrued claims must be filed within 1 year of the Veteran's death; filing DIC within 1 year of death pays back to the month of death; PACT DIC re-evaluation (§ 3.33) took effect January 23, 2024; and DIC remarriage retention dropped from age 57 to age 55 for remarriages on or after January 5, 2021.",
      bitemporalNotePractitioner: `Check post-Jan. 21, 2000 § 3.22(b) restriction (NOVA II / Rodriguez / Tarver abrogated open-ended Green v. Brown hypothetical § 1318 claims, confining posthumous 10-year proof to § 3.22(b)(1) lifetime CUE or § 3.22(b)(2) missing service records), 38 C.F.R. § 3.33(d)(1) PACT DIC re-evaluation (88 FR 82261, eff. Jan. 23, 2024), Dec. 16, 2003 repeal of the 2-year § 3.1000(a) accrued cap, Oct. 10, 2008 § 5121A statutory substitution floor, and Jan. 5, 2021 age-55 § 3.55 remarriage cutoff.`,
      pointInTimeLinks: survivorLinks,
      relatedSiteRoutes: [
        {
          label: "Playbook 08: Survivor DIC (§ 1310, § 1318 & PACT § 3.33)",
          href: "/playbooks/08-survivor-dic-direct-and-1318-hypothetical",
        },
        {
          label: "Playbook 09: Accrued Benefits, Substitution & Nehmer Estates",
          href: "/playbooks/09-accrued-benefits-substitution-nehmer-estates",
        },
        {
          label: "Survivor Post-Mortem Triage Checklist",
          href: "/checklists/survivor-post-mortem-triage-gate",
        },
      ],
      killSwitchesVeteran: [
        "Strict 1-Year Clock: Substitution (VA Form 21P-0847) and standard accrued-benefits claims must be filed within 1 year of the Veteran's death (only Agent Orange Nehmer § 3.816(f) back pay has no 1-year filing bar).",
        "Since January 21, 2000, proving 10-year 100%/TDIU after death under § 1318 requires either missing military records (§ 3.22(b)(2)) or CUE in a decision on a claim the Veteran filed during life (§ 3.22(b)(1))—not a brand-new hypothetical claim.",
      ],
      killSwitchesToVerify: [
        "1-Year Jurisdictional Filing Bar (38 U.S.C. §§ 5121(c), 5121A(a)(1); 38 C.F.R. §§ 3.1000(c), 3.1010(b)): Accrued and substitution requests must be filed within 1 year of death (contrast § 3.816(f) Nehmer awards).",
        "Post-Jan. 21, 2000 § 3.22(b) Hypothetical Bar (Rodriguez v. Peake; Tarver v. Shinseki): Green v. Brown hypothetical § 1318 claims are barred unless predicated on § 3.22(b)(1) lifetime-claim CUE or § 3.22(b)(2) newly associated official service department records.",
        "Remarriage Age Split (38 C.F.R. § 3.55(a)(9)–(11)): Age 55 applies to remarriages on/after Jan. 5, 2021 for DIC (Pub. L. 116-315, § 2009), whereas Jan. 1, 2004 – Jan. 4, 2021 remarriages (and DEA Ch. 35 / Ch. 37 home loans) require age 57.",
      ],
      veteranDiscussionQuestions: [
        "Was any VA claim or appeal pending when my loved one passed away so we should file VA Form 21P-0847 (Substitution) and VA Form 21P-534EZ within 1 year of death?",
        "Was DIC previously denied for a condition later added by the PACT Act (eligible for retroactive re-evaluation under 38 C.F.R. § 3.33), or can missing military records establish 10-year 100%/TDIU under § 3.22(b)(2)?",
      ],
    });
  }

  // -------------------------------------------------------------------------
  // PATHWAY 7: Character of Discharge (2024 § 3.12 Overhaul), § 3.13(c) & § 3.354(b) Insanity
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fCod = ans("oth_or_discharge_bar_blocked_benefits");
    if (fCod === "yes") {
      triggeredVet.push(
        "VA denied benefits or eligibility based on an Other-Than-Honorable (OTH), Bad Conduct (BCD), or Character of Discharge bar.",
      );
      triggeredPrac.push(
        "Threshold veteran-status eligibility barred or challenged under 38 U.S.C. § 5303(a) or 38 C.F.R. § 3.12.",
      );
    } else if (fCod === "unknown") {
      missing.push(RECORD_DD214_OMPF_AND_DISCHARGE_MENTAL_HEALTH);
    } else {
      blockingVet.push(
        "You indicated discharge character was already honorable / eligible with no Character of Discharge bar.",
      );
      blockingPrac.push(
        "No statutory (§ 5303) or regulatory (§ 3.12) Character of Discharge bar at issue.",
      );
    }

    const fExc = ans("prior_good_enlistment_insanity_or_compelling_circumstances");
    if (fExc === "yes") {
      triggeredVet.push(
        "Records point to an earlier completed honorable enlistment (§ 3.13(c)), severe mental health / TBI / trauma at the time of the conduct (§ 3.354(b) insanity or 2024 § 3.12(e) compelling circumstances), or a discharge upgrade.",
      );
      triggeredPrac.push(
        "OMPF/clinical clues support § 3.13(c) conditional discharge, § 3.354(b) insanity, June 25, 2024 § 3.12(d)(2)/(e) compelling circumstances, or a BCMR/DRB upgrade (§ 3.400(g)).",
      );
    } else if (fExc === "unknown") {
      missing.push(RECORD_DD214_OMPF_AND_DISCHARGE_MENTAL_HEALTH);
    } else {
      blockingVet.push(
        "You indicated no prior honorable enlistment, mental-health/trauma circumstances, or military discharge upgrade applies.",
      );
      blockingPrac.push(
        "No § 3.13(c) prior unconditional period, § 3.354(b) insanity predicate, § 3.12(e) compelling circumstances, or § 3.400(g) upgrade identified.",
      );
    }

    const disp: PathwayDisposition =
      blockingPrac.length > 0
        ? "barred-or-inapplicable"
        : missing.length > 0
          ? "unresolved-records-needed"
          : "supported-to-investigate";
    const labels = dispositionLabels(disp);

    const codLinks = [link312, link313, link3354];

    pathways.push({
      pathwayId: "cod-insanity-and-2024-3-12-gateway",
      rankOrder: 7,
      priorityBadgeVeteran:
        "Priority 7 · OTH / Discharge Bar Exceptions (2024 § 3.12, Insanity & Prior Enlistments)",
      priorityBadgePractitioner:
        "Tier 2C · Character of Discharge Gateway: 2024 § 3.12(e), § 3.13(c) & § 3.354(b) Insanity",
      veteranTitle:
        "Overcome an OTH or Discharge Bar: Earlier Enlistments (§ 3.13), Insanity (§ 3.354(b)) & June 2024 Compelling Circumstances (§ 3.12)",
      practitionerTitle:
        "Character of Discharge & Statutory Bar Audit: 38 C.F.R. §§ 3.12 (June 25, 2024 Overhaul), 3.13(c), 3.354(b) & 3.400(g)",
      veteranSummary:
        "An Other-Than-Honorable (OTH) discharge does not automatically block VA benefits forever: (1) if you completed an earlier honorable enlistment and immediately reenlisted without a break, benefits from that earlier period remain protected (§ 3.13(c)); (2) VA's non-criminal 'insanity' rule (§ 3.354(b)) removes discharge bars when severe service-related mental illness, PTSD, or TBI drove the misconduct; and (3) effective June 25, 2024, VA expanded § 3.12(e) 'compelling circumstances' review for older COD denials via a Supplemental Claim (20-0995).",
      practitionerSummary:
        "Triages four independent gateways: (1) 38 U.S.C. § 101(18)(B) / 38 C.F.R. § 3.13(c) unconditional prior enlistment preservation (VAOPGCPREC 10-96); (2) 38 U.S.C. § 5303(b) / 38 C.F.R. § 3.354(b) disease-induced insanity lifting even statutory GCM bars (Zang; Gardner; VAOPGCPREC 20-97); (3) VA's June 25, 2024 § 3.12 overhaul (89 FR 32361, published Apr. 26, 2024, effective June 25, 2024) narrowing willful/persistent misconduct (§ 3.12(d)(2)(ii)) and extending § 3.12(e) compelling circumstances; and (4) 10 U.S.C. §§ 1552/1553 BCMR/DRB upgrades under 38 C.F.R. § 3.400(g).",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Eligibility Gateway — § 3.13(c) & § 3.354(b) Apply Across Eras; June 25, 2024 § 3.12 Rules Open New Supplemental Claims Today",
      doctrinalScopeBadge:
        "Bitemporal Split: § 3.13(c) & § 3.354(b) Extant Since 1961/1978; 2024 § 3.12(d)(2)/(e) Prospective Floor June 25, 2024 (§ 3.114(a))",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "38 U.S.C. §§ 101(18)(B), 5110(i), 5303(a)–(b)",
        "38 C.F.R. §§ 3.12(a)–(l) (89 FR 32361, eff. June 25, 2024), 3.13(c), 3.354(a)–(b), 3.400(g)",
        "Zang v. Brown, 8 Vet. App. 246 (1995)",
        "Gardner v. Shinseki, 22 Vet. App. 415 (2009)",
        "VAOPGCPREC 10-96 & VAOPGCPREC 20-97",
      ],
      bitemporalNoteVeteran: !hasExactDate
        ? "Decision Date Unknown: Locate your decision letter to check which Character of Discharge edition applied—while the expanded § 3.12(e) compelling-circumstances rule took effect June 25, 2024, both the earlier-enlistment rule (§ 3.13(c)) and VA's mental-health insanity exception (§ 3.354(b)) apply across older eras."
        : link312.publicationGapTrapAlert
          ? `Important Date Alert (${safeDate}): VA published its updated Character of Discharge rule on April 26, 2024 (89 FR 32361), but it did not take effect until June 25, 2024—so the pre-June 25, 2024 text governed on ${safeDate}, while you can file a Supplemental Claim (20-0995) under the June 25, 2024 rule today.`
          : safeDate < "2024-06-25"
            ? `While the expanded § 3.12(e) compelling-circumstances rule cannot pay benefits earlier than June 25, 2024, both the earlier-enlistment rule (§ 3.13(c)) and VA's mental-health insanity exception (§ 3.354(b)) already existed on ${safeDate}.`
            : `On ${safeDate}, the overhauled post-June 25, 2024 edition of 38 C.F.R. § 3.12(d)(2) & (e) governed alongside § 3.13(c) and § 3.354(b).`,
      bitemporalNotePractitioner: `${link312.publicationGapTrapAlert ? `${link312.publicationGapTrapAlert} ` : ""}Explicit 89 FR 32361 Applicability Gate: Revised § 3.12(d)–(e) applies to claims pending on or received on/after June 25, 2024 with a § 3.114(a) effective-date floor of June 25, 2024 (never cite 2024 § 3.12 to plead CUE on pre-June 25, 2024 final denials—use § 3.13(c), § 3.354(b), or § 3.156(c) OMPF records for pre-2024 retroactivity).`,
      pointInTimeLinks: codLinks,
      relatedSiteRoutes: [
        {
          label: "Playbook 10: Character of Discharge, Insanity & Upgrades",
          href: "/playbooks/10-character-of-discharge-insanity-upgrades",
        },
        {
          label: "COD & Guard/Reserve Intake Checklist",
          href: "/checklists/cod-and-guard-reserve-intake-audit",
        },
        { label: "38 C.F.R. § 3.12 Point-in-Time Reader & Redline", href: "/cfr/38-cfr-3.12a-l" },
      ],
      killSwitchesVeteran: [
        "Regulatory 'compelling circumstances' (§ 3.12(e)) cannot waive a General Court-Martial sentence or a discharge in lieu of General Court-Martial—though VA's § 3.354(b) insanity exception and § 3.13(c) prior-enlistment protection still can.",
        "Grants based solely on VA's June 25, 2024 § 3.12 rule change cannot have an effective date earlier than June 25, 2024.",
      ],
      killSwitchesToVerify: [
        "Statutory § 5303(a) & § 3.12(d)(1) Non-Mitigable Bars: § 3.12(e) compelling circumstances applies to § 3.12(c)(6) prolonged AWOL and § 3.12(d)(2) moral-turpitude / willful-and-persistent misconduct—NOT statutory General Court-Martial bars or § 3.12(d)(1)(i) discharge in lieu of GCM (screen § 3.354(b) insanity or § 3.13(c) prior enlistment instead).",
        "Pub. L. 95-126 Special Upgrade Bar (§ 3.12(h)) & § 3.114(a) Floor: Verify whether a DRB upgrade was under a 1977 special program, and enforce the June 25, 2024 effective-date floor on liberalizing § 3.12 re-filings.",
      ],
      veteranDiscussionQuestions: [
        "Does my OMPF show I completed an earlier enlistment and immediately reenlisted so my first period of service is unconditionally protected under 38 C.F.R. § 3.13(c)?",
        "Should we file a Supplemental Claim (20-0995) requesting both a June 25, 2024 § 3.12(e) compelling-circumstances review and a 38 C.F.R. § 3.354(b) mental-health insanity determination?",
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
    const isPre1946Vasrd = hasExactDate && link456.doNotRely;
    const isPre1997Muscle = hasExactDate && safeDate < "1997-07-03";
    const scarsSummaryOnlyCaution =
      link4118.coverageState === "SUMMARY_ONLY"
        ? " Note: Post-Oct. 23, 2008 § 4.118 scar criteria are Summary Only—pull the official print 38 C.F.R. § 4.118 edition before pleading scar CUE."
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
      bitemporalNoteVeteran: !hasExactDate
        ? "Decision Date Unknown: Locate your decision letter to check whether the pre-July 3, 1997 or post-July 3, 1997 edition of 38 C.F.R. § 4.56 and historical § 4.118 scar criteria applied. (Note: VA's Sept. 2025 90 FR 46542 scar proposal remains proposed/unfinalized, not enacted law.)"
        : isPre1946Vasrd
          ? `Coverage Gap Alert (${safeDate}): ${safeDate} is earlier than the April 1, 1946 VASRD baseline indexed on VetLawGuide—do not rely on post-1946 § 4.56 or § 4.118 snapshots; ask an accredited representative to check the earlier 1933 Rating Schedule / Veterans' Regulation rules.`
          : trap456
            ? `Important Date Alert (${safeDate}): VA's 1997 muscle-rating update was published June 3, 1997 but did not take effect until July 3, 1997—so the earlier 1946–1997 wording of § 4.56 still applied on ${safeDate}. (Also note VA's Sept. 2025 90 FR 46542 scar proposal is proposed/unfinalized, not enacted law.)`
            : isPre1997Muscle
              ? `On ${safeDate}, the pre-July 3, 1997 edition of 38 C.F.R. § 4.56 governed muscle injuries alongside the historical edition of § 4.118 for scars. (Note: VA's Sept. 2025 90 FR 46542 scar proposal remains proposed/unfinalized, not enacted law.)`
              : `On ${safeDate}, the post-July 3, 1997 edition of 38 C.F.R. § 4.56 applied—including § 4.56(b)'s rule that a T&T injury with muscle damage is evaluated as no less than moderate for each muscle group damaged.${link4118.coverageState === "SUMMARY_ONLY" ? " For post-Oct. 23, 2008 scar rules (§ 4.118), have your representative verify the official print 38 C.F.R. text." : ""} (Note: 90 FR 46542 on DC 7804 scars remains proposed/unfinalized.)`,
      bitemporalNotePractitioner: !hasExactDate
        ? "Decision Date Unknown: Confirm exact T₀ decision date to resolve pre- vs. post-July 3, 1997 § 4.56(b)–(d) (62 FR 30235) and exact § 4.118 scar era before pleading CUE, and quarantine proposed/unfinalized 90 FR 46542."
        : isPre1946Vasrd
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
  // PATHWAY 9: Combat-Zone & After-Tax Disability Severance Recoupment Audit (10 U.S.C. § 1212(d)(2); 38 C.F.R. § 3.700(a)(3))
  // -------------------------------------------------------------------------
  {
    const triggeredVet: string[] = [];
    const triggeredPrac: string[] = [];
    const blockingVet: string[] = [];
    const blockingPrac: string[] = [];
    const missing: MissingRecordDefinition[] = [];

    const fRecoup = ans("va_recouped_disability_severance_or_separation_pay");
    if (fRecoup === "yes") {
      triggeredVet.push(
        "VA withheld monthly disability compensation to recoup military disability severance, separation, or readjustment pay.",
      );
      triggeredPrac.push(
        "VA recouped military disability severance, separation, or readjustment pay from Title 38 compensation (§ 3.700(a)(2)–(5)).",
      );
    } else if (fRecoup === "unknown") {
      missing.push(RECORD_DFAS_SEVERANCE_W2_AND_AWARD_WITHHOLDING);
    } else {
      blockingVet.push(
        "You indicated VA never recouped military disability severance, separation, or readjustment pay.",
      );
      blockingPrac.push(
        "No military severance, separation, or readjustment recoupment withholding at issue.",
      );
    }

    const fCombatTax = ans("combat_zone_post2008_pretax_gross_or_excess_withholding");
    if (fCombatTax === "yes") {
      triggeredVet.push(
        "The Chapter 61 medical separation was on/after Jan. 28, 2008 for a combat-zone or combat-operations injury, OR VA recouped pre-tax gross pay (post-Sept. 1996) or withheld compensation from unrelated VA ratings.",
      );
      triggeredPrac.push(
        "Potential violation of 10 U.S.C. § 1212(d)(2) (post-Jan. 28, 2008 combat-zone / combat-operations non-recoupment), post-Sept. 30, 1996 net after-tax cap, or § 3.700(a)(3) monthly severance-rating cap.",
      );
    } else if (fCombatTax === "unknown") {
      missing.push(RECORD_DFAS_SEVERANCE_W2_AND_AWARD_WITHHOLDING);
    } else {
      blockingVet.push(
        "You indicated the recoupment stayed within the after-tax net cap on a non-combat separation and touched only the severance condition's monthly rate.",
      );
      blockingPrac.push(
        "Recoupment complied with non-combat net after-tax and § 3.700(a)(3) monthly severance-disability caps.",
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
      pathwayId: "combat-and-after-tax-severance-recoupment-3-700a3",
      rankOrder: 9,
      priorityBadgeVeteran:
        "Priority 9 · Military Severance Recoupment & Refund Check (10 U.S.C. § 1212(d)(2))",
      priorityBadgePractitioner:
        "Tier 2D · Severance Non-Recoupment & After-Tax Withholding Audit (§ 1212(d)(2); § 3.700(a)(3))",
      veteranTitle:
        "Audit VA Recoupment of Military Disability Severance or Separation Pay (Combat Exemption & After-Tax Cap)",
      practitionerTitle:
        "Disability Severance & Separation Pay Recoupment Audit: 10 U.S.C. § 1212(d)(2) & 38 C.F.R. § 3.700(a)(2)–(5)",
      veteranSummary:
        "Three federal rules protect Veterans against over-recoupment of military disability severance pay: (1) if you were medically separated (Chapter 61) on or after January 28, 2008 for an injury incurred in a combat zone or combat-related operations, VA is barred from recouping a single dollar (10 U.S.C. § 1212(d)(2)); (2) for severance/separation payments after September 30, 1996, VA can recoup at most the after-tax net amount—never Federal income taxes withheld; and (3) VA cannot take compensation paid for separate, non-severance disabilities.",
      practitionerSummary:
        "Audits VA fiscal withholding ledgers across three bright-line statutory/regulatory caps: (1) 10 U.S.C. § 1212(d)(2) (Pub. L. 110-181, § 1646, eff. Jan. 28, 2008; codified in § 3.700(a)(3) on June 5, 2009 at 74 FR 26956) barring all VA recoupment for post-Jan. 28, 2008 combat-zone / combat-operations Chapter 61 separations; (2) Pub. L. 104-201, § 653 (eff. Oct. 1, 1996; 67 FR 60868) capping recoupment at after-tax net pay; and (3) § 3.700(a)(3)'s monthly withholding ceiling protecting independent non-severance evaluations.",
      disposition: disp,
      dispositionLabelVeteran: labels.veteran,
      dispositionLabelPractitioner: labels.practitioner,
      doctrinalScopeBadgeVeteran:
        "Award Withholding & Refund Audit — Check Chapter 61 Separation Date, Combat Orders & W-2 Tax Withholding",
      doctrinalScopeBadge:
        "Bright-Line Statutory & Accounting Audit — Includes Jan. 28, 2008 – June 4, 2009 Statutory Lag Window",
      triggeredByAnswersVeteran: triggeredVet,
      triggeredByAnswers: triggeredPrac,
      blockingReasonsVeteran: blockingVet,
      blockingReasons: blockingPrac,
      recordsToLocate: deduplicateSimpleRecords(missing),
      authorityCitations: [
        "10 U.S.C. § 1212(d)(2) (Pub. L. 110-181, § 1646)",
        "Pub. L. 104-201, § 653 (110 Stat. 2583)",
        "38 C.F.R. § 3.700(a)(2), (3) & (5) (67 FR 60868; 74 FR 26956)",
      ],
      bitemporalNoteVeteran: !hasExactDate
        ? "Decision Date Unknown: Check both your military separation date (DD-214) and VA withholding letters—combat-zone / combat-operations severance non-recoupment (10 U.S.C. § 1212(d)(2)) applies to Chapter 61 separations on/after January 28, 2008, and after-tax net recoupment applies to severance payments after September 30, 1996."
        : safeDate >= "2008-01-28"
          ? `On ${safeDate}, Congress's January 28, 2008 combat-zone / combat-operations severance non-recoupment law (10 U.S.C. § 1212(d)(2)) was in effect—even before VA updated its printed regulation on June 5, 2009.`
          : safeDate >= "1996-10-01"
            ? `On ${safeDate}, post-September 30, 1996 after-tax net recoupment and monthly severance-disability caps applied (note that 10 U.S.C. § 1212(d)(2) full combat non-recoupment requires a Chapter 61 separation on or after January 28, 2008).`
            : `For pre-October 1, 1996 payments, pre-tax gross recoupment applied, though § 3.700(a)(3) still barred withholding monthly compensation payable for separate non-severance disabilities.`,
      bitemporalNotePractitioner:
        hasExactDate && safeDate >= "2008-01-28" && safeDate < "2009-06-05"
          ? `Statutory Lag Window Active (${safeDate}): Pub. L. 110-181, § 1646 (10 U.S.C. § 1212(d)(2)) barred combat-zone / combat-operations severance recoupment for Chapter 61 separations on/after January 28, 2008, superseding the lagging CFR text prior to 74 FR 26956 (June 5, 2009).`
          : `Verify Chapter 61 separation date (not VA rating date) against the Jan. 28, 2008 floor of 10 U.S.C. § 1212(d)(2), Oct. 1, 1996 after-tax net recoupment floor (Pub. L. 104-201, § 653), and § 3.700(a)(3) independent-disability monthly withholding cap.`,
      pointInTimeLinks: [link3700],
      relatedSiteRoutes: [
        {
          label: "Playbook 20: Back-Pay Offsets, CRDP/CRSC & Severance Recoupment",
          href: "/playbooks/20-backpay-offsets-crdp-crsc-severance-recoupment",
        },
        {
          label: "Award Letter & Withholding Audit Checklist",
          href: "/checklists/award-letter-and-withholding-audit-checklist",
        },
        { label: "38 C.F.R. § 3.700(a)(3) Reader", href: "/cfr/38-cfr-3.700a3-5" },
      ],
      killSwitchesVeteran: [
        "Full combat-zone / combat-operations non-recoupment (10 U.S.C. § 1212(d)(2)) applies only when your military Chapter 61 medical separation occurred on or after January 28, 2008.",
        "Note that Combat-Related Special Compensation (CRSC) and Voluntary Separation Incentive (VSI) follow separate DoD/DFAS coordination rules.",
      ],
      killSwitchesToVerify: [
        "January 28, 2008 Separation-Date Floor (Pub. L. 110-181, § 1646(c)): Full combat non-recoupment under 10 U.S.C. § 1212(d)(2) is keyed to Armed Forces separations on or after Jan. 28, 2008—not the date of a later VA rating decision.",
        "October 1, 1996 After-Tax Floor (Pub. L. 104-201, § 653): Net after-tax recoupment applies to severance/separation/SSB payments made after Sept. 30, 1996 (SSB flat-rate tax rules apply back to Dec. 5, 1991 under § 3.700(a)(5)).",
      ],
      veteranDiscussionQuestions: [
        "Can we compare my DD-214, Physical Evaluation Board (PEB) combat-related findings, and separation W-2 against VA's recoupment ledger to check whether VA over-withheld taxes or recouped exempt post-Jan. 28, 2008 combat severance?",
        "Did VA withhold compensation from my separate, non-severance disabilities in violation of 38 C.F.R. § 3.700(a)(3)?",
      ],
    });
  }

  // Shared focus-aware T0 authority links for RO CUE, Board CUE, and Gate 1
  const scarPathwaySoFar = pathways.find(
    (p) => p.pathwayId === "penetrating-wound-muscle-vs-scar",
  );
  const scarMuscleActiveForCueAndGate =
    intake.issueFocus === "penetrating-scar-muscle" ||
    scarPathwaySoFar?.disposition === "supported-to-investigate" ||
    (intake.issueFocus === "general-collateral-review" &&
      scarPathwaySoFar?.disposition !== "barred-or-inapplicable");

  const focusSlugLinks: PointInTimeAuthorityLink[] = (() => {
    switch (intake.issueFocus) {
      case "penetrating-scar-muscle":
        return [link456, link4118];
      case "stabilized-reduction-or-severance":
        return [
          link3344,
          link3951,
          ...(!hasExactDate || safeDate >= "1962-01-01" ? [link3957] : []),
        ];
      case "tdiu-or-smc":
        return [link416, link3350f];
      case "nehmer-herbicide":
        return !hasExactDate || safeDate >= "2003-09-24" ? [link3816] : [];
      case "survivor-dic-accrued":
        return [
          link3312,
          ...(!hasExactDate || safeDate >= "1978-10-01" ? [link322] : []),
          link31000,
        ];
      case "cod-or-insanity":
        return [link312, link313, link3354];
      case "severance-recoupment":
        return [link3700];
      default:
        return scarMuscleActiveForCueAndGate ? [link456, link4118] : [];
    }
  })();

  const cueSubstantiveLinks: PointInTimeAuthorityLink[] = (() => {
    const seen = new Set<string>();
    const out: PointInTimeAuthorityLink[] = [];
    const supportedSoFar = pathways
      .filter((p) => p.disposition === "supported-to-investigate")
      .flatMap((p) => p.pointInTimeLinks);
    for (const l of [
      ...focusSlugLinks,
      ...(scarMuscleActiveForCueAndGate ? [link456, link4118] : []),
      ...supportedSoFar,
      link3156c,
    ]) {
      if (!seen.has(l.sectionSlug)) {
        seen.add(l.sectionSlug);
        out.push(l);
      }
    }
    return out;
  })();

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

    if (!hasExactDate && blockingPrac.length === 0) {
      missing.unshift(RECORD_PRIOR_DECISION_LETTER_AND_DATE);
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
        "If the RO had all the key facts right in front of it on the decision date, clearly misapplied the regulation in force back then, and BVA never decided that issue on appeal, an accredited representative can evaluate an RO CUE revision request.",
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
      bitemporalNoteVeteran: !hasExactDate
        ? "Decision Date Unknown: Find your decision letter first—RO CUE requires checking the exact regulation in force on that date and whether the decision came before or after July 21, 1992 (Bell record rule)."
        : isPre1992Bell
          ? `Record Rule on ${safeDate} (Before July 21, 1992): For pre-July 21, 1992 decisions, RO CUE generally looks only at papers physically inside your C-file on that date—so check § 3.156(c) first if military hospital charts arrived later.`
          : `Record Rule on ${safeDate} (On or After July 21, 1992): VAMC treatment records that already existed on ${safeDate} count as part of the record VA had to check.`,
      bitemporalNotePractitioner: `${twoPaneContext.statutoryEraLabel}. ${twoPaneContext.recordScopeRuleThen}`,
      pointInTimeLinks: cueSubstantiveLinks,
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

    if (!hasExactDate && blockingPrac.length === 0) {
      missing.unshift(RECORD_PRIOR_DECISION_LETTER_AND_DATE);
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
      bitemporalNotePractitioner: !hasExactDate
        ? "Decision Date Unknown: Locate the exact BVA decision date before completing /checklists/board-cue-pre-filing-gate—Subpart O Board CUE requires verbatim T₀ print CFR text, pre- vs. post-July 21, 1992 Bell record scope, zero § 20.1400(b)(1) CAVC merits affirmance, and § 4.25 math."
        : `Complete all 5 gates in /checklists/board-cue-pre-filing-gate: pull verbatim T₀ print CFR text for ${safeDate}, verify ${isPre1992Bell ? "pre-July 21, 1992 physical C-file presence (Damrel)" : "post-July 21, 1992 Bell constructive possession"}, confirm zero § 20.1400(b)(1) CAVC merits affirmance, and audit § 4.25 math.`,
      pointInTimeLinks: [
        ...(!hasExactDate || safeDate >= "1999-02-12" ? [linkSubpartO] : []),
        ...cueSubstantiveLinks,
      ],
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

  // Normalize contiguous rankOrder (1..12) and priority badge numbering in non-CUE-first doctrinal order
  pathways.forEach((p, idx) => {
    const rank = idx + 1;
    p.rankOrder = rank;
    p.priorityBadgeVeteran = p.priorityBadgeVeteran.replace(
      /^Priority\s+\d+/,
      `Priority ${rank}`,
    );
  });

  // -------------------------------------------------------------------------
  // Deduplicate & Prioritize "Records to Locate & Why" Across Active Pathways
  // -------------------------------------------------------------------------
  const recordMap = new Map<string, MissingRecordChecklistItem>();

  if (!hasExactDate) {
    const activeNonBarred = pathways.filter(
      (p) => p.disposition !== "barred-or-inapplicable",
    );
    recordMap.set(RECORD_PRIOR_DECISION_LETTER_AND_DATE.recordId, {
      ...RECORD_PRIOR_DECISION_LETTER_AND_DATE,
      triggeredByFactIds: ["decision_date_unknown"],
      unlocksPathwayTitles: activeNonBarred.map((p) => p.practitionerTitle),
      unlocksPathwayTitlesVeteran: activeNonBarred.map((p) => p.veteranTitle),
    });
  }

  for (const p of pathways) {
    if (p.disposition === "barred-or-inapplicable") continue;
    for (const rec of p.recordsToLocate) {
      const existing = recordMap.get(rec.recordId);
      const matchingFactIds = SCREENING_QUESTIONS.filter(
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

  // Gate 1: Evaluate baseline + active/supported point-in-time links for FR pub-gaps, pre-baseline gaps, and SUMMARY_ONLY coverage!
  const supportedPathwayLinks = pathways
    .filter((p) => p.disposition === "supported-to-investigate")
    .flatMap((p) => p.pointInTimeLinks);

  const seenGateSlugs = new Set<string>();
  const allGateLinks: PointInTimeAuthorityLink[] = [];
  for (const l of [
    link3156c,
    ...(scarMuscleActiveForCueAndGate ? [link456, link4118] : []),
    ...focusSlugLinks,
    ...supportedPathwayLinks,
  ]) {
    if (!seenGateSlugs.has(l.sectionSlug)) {
      seenGateSlugs.add(l.sectionSlug);
      allGateLinks.push(l);
    }
  }

  const pubGapAlerts = allGateLinks
    .map((l) => l.publicationGapTrapAlert)
    .filter((a): a is string => Boolean(a));
  const gapLinks = allGateLinks.filter((l) => l.doNotRely);
  const summaryOnlyLinks = allGateLinks.filter(
    (l) => !l.doNotRely && l.coverageState === "SUMMARY_ONLY",
  );

  const gate1NeedsAction =
    !hasExactDate ||
    pubGapAlerts.length > 0 ||
    gapLinks.length > 0 ||
    summaryOnlyLinks.length > 0;

  let gate1Detail: string;
  if (!hasExactDate) {
    gate1Detail =
      "Target Decision Date (T₀) Unknown: Locate the challenged VA Rating Decision, notification letter, or BVA decision date before resolving contemporaneous 38 C.F.R. text or pleading CUE.";
  } else if (pubGapAlerts.length > 0) {
    gate1Detail = pubGapAlerts.join(" ");
  } else if (gapLinks.length > 0) {
    gate1Detail = `Pre-Baseline Coverage Gap on ${safeDate} (${gapLinks.map((g) => g.cfrSection).join(", ")}): Do Not Rely on unindexed snapshots—pull the contemporaneous official print 38 C.F.R. / Rating Schedule edition on GovInfo before pleading CUE.`;
  } else if (summaryOnlyLinks.length > 0) {
    gate1Detail = `Summary-Only Coverage on ${safeDate} (${summaryOnlyLinks.map((s) => s.cfrSection).join(", ")}): Pull the contemporaneous official print 38 C.F.R. edition on GovInfo before pleading CUE (and confirm zero reliance on proposed/unfinalized 90 FR 46542).`;
  } else {
    gate1Detail = `Verbatim primary-source snapshots resolved for ${safeDate} with zero FR publication-vs-effective gap traps; confirm zero reliance on proposed/unfinalized rules (e.g., 90 FR 46542, RIN 2900-AQ72/AQ73/AQ82/AR96/AS39) or rescinded 91 FR 7118.`;
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
      title: "2. Non-CUE Open-Record & Statutory Vehicle Exhaustion",
      detail:
        "Exhaust § 3.156(c) service records (§ 20.1411(b)), Brown void reductions (§§ 3.105(e), 3.344, 3.951, 3.957), pending streams (Tablazon, Beraud/Lang § 3.156(b), pre-2015 § 3.157(b), Roberson TDIU, AMA § 5104(b) Hamill), and § 3.816 Nehmer before expending Subpart O Board CUE.",
      status:
        ans("official_service_or_surgical_records_missing_at_t0") === "unknown" ||
        ans("open_stream_or_unanswered_filing_clue") === "unknown" ||
        ans("running_rating_reduced_or_severed") === "unknown"
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
      detail: !hasExactDate
        ? "Decision Date Unknown: Confirm exact decision date to determine whether pre-July 21, 1992 physical C-file presence (Damrel) or post-July 21, 1992 Bell constructive possession governs, confirm no reliance on later judicial reinterpretation (George), and verify manifest monthly payment change under 38 C.F.R. § 4.25."
        : `${isPre1992Bell ? "Pre-July 21, 1992 decision: document must have been physically in the C-file at T₀ (Damrel)." : "Post-July 21, 1992 decision: Bell constructive possession applies to pre-existing VA medical records."} Confirm no reliance on later judicial reinterpretation (George) and verify manifest monthly payment change under 38 C.F.R. § 4.25.`,
      status:
        hasExactDate &&
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
