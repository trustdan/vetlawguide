import { resolveEraIdForDate } from "./eras-and-authorities";
import type { AudienceMode, HistoricalEraId } from "./types";

export type PiercingFinalityGateId =
  | "void-reduction"
  | "service-records-3156c"
  | "pending-unadjudicated"
  | "nehmer-herbicide"
  | "ro-cue-3105a"
  | "board-cue-7111";

export interface PiercingFinalityGate {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6;
  id: PiercingFinalityGateId;
  shortTitle: string;
  gateQuestion: string;
  primaryCitation: string;
  evidentiaryStandard: string;
  dateStatusBadge: string;
  dateBoundaryAlert: string | null;
  ifYesTitle: string;
  ifYesSummary: string;
  ifNoAdvanceLabel: string;
  recordClues: string[];
  killSwitches: string[];
  primaryHref: string;
  secondaryLinks: Array<{ label: string; href: string }>;
  svgY: number;
}

export interface PiercingFinalityFlowchartModel {
  effectiveDate: string;
  eraId: HistoricalEraId | null;
  gates: PiercingFinalityGate[];
  svgViewBox: {
    width: number;
    height: number;
  };
}

/**
 * Pure TypeScript 6-Gate Piercing-Finality Decision Flowchart model (ADR-0008 / E6-S1).
 *
 * Doctrinal audit order:
 * 1. Void Rating Reduction / Severance (§§ 3.344, 3.105(d)–(e),(i), 3.951, 3.957)
 * 2. Newly Associated Service Department Records (§ 3.156(c)(1)–(4))
 * 3. Unadjudicated, Defective-Notice, Legacy § 3.156(b) (Beraud & Lang), or AMA § 5104(b) (Hamill) Open Claim
 * 4. Nehmer Herbicide Class Stipulation (§ 3.816)
 * 5. Regional Office / AOJ CUE (38 U.S.C. § 5109A; 38 C.F.R. § 3.105(a))
 * 6. Board of Veterans' Appeals CUE (38 U.S.C. § 7111; 38 C.F.R. §§ 20.1400–20.1411, § 20.1409(c))
 */
export function buildPiercingFinalityFlowchart(
  mode: AudienceMode,
  decisionDate: string,
): PiercingFinalityFlowchartModel {
  const isVet = mode === "veteran";
  const eraId = resolveEraIdForDate(decisionDate);

  const isPre1959Savings = decisionDate < "1959-01-01";
  const isPre1962ServiceRecs = decisionDate < "1962-01-01";
  const is2006ServiceRecsPubGap =
    decisionDate >= "2006-09-06" && decisionDate < "2006-10-06";
  const isPre1963Soc = decisionDate < "1963-01-01";
  const isPreBell = decisionDate < "1992-07-21";
  const isPre2015Informal = decisionDate < "2015-03-24";
  const isAmaDecision = decisionDate >= "2019-02-19";
  const isPre1997BoardCueAct = decisionDate < "1997-11-21";
  const isPre1992Predetermination = decisionDate < "1992-01-21";

  const stepSpacing = 136;
  const firstStepY = 76;

  const gates: PiercingFinalityGate[] = [
    // STEP 1: Void Rating Reduction / Severance
    {
      stepNumber: 1,
      id: "void-reduction",
      shortTitle: "Void rating reduction",
      gateQuestion: isVet
        ? "Did VA lower an existing disability percentage or sever service connection without following required protection and advance-notice rules?"
        : "Did VA reduce a stabilized (5+ yr), 20-year continuous, or readjusted rating—or sever 10-year service connection—in violation of §§ 3.344, 3.105(d)–(e)/(i), 3.951, or 3.957?",
      primaryCitation:
        "38 C.F.R. §§ 3.344, 3.105(d)–(e), (i), 3.951, 3.957; Brown v. Brown",
      evidentiaryStandard: "Void Ab Initio (Strict VA Burden of Proof)",
      dateStatusBadge: isPre1959Savings
        ? "§ 3.953 1957/1958 Savings Active"
        : isPre1992Predetermination
          ? "§§ 3.344 & 3.105(e) Active"
          : "§ 3.105(i) Hearing Rule Active",
      dateBoundaryAlert: isPre1959Savings
        ? `Decisions in force on Dec. 31, 1957 / Dec. 31, 1958 carry additional statutory grandfathering under Pub. L. 85-56 & Pub. L. 85-857 (38 C.F.R. § 3.953).`
        : isPre1992Predetermination
          ? `Note: § 3.105(i) 30-day predetermination hearing freeze took effect Jan. 21, 1992 (56 FR 65846), while § 3.344 stabilization and 60-day § 3.105(e) notice applied across earlier decades.`
          : null,
      ifYesTitle: isVet
        ? "Unlawful reduction is legally void (restores prior rating)"
        : "Reduction Void Ab Initio — Reinstate Prior Evaluation",
      ifYesSummary: isVet
        ? "When VA reduces a protected or 5-year stabilized rating without proving sustained medical improvement under everyday life or sending required advance notice, courts treat the reduction as legally void from the day it happened—without needing to prove CUE."
        : "Noncompliant reductions under § 3.344(a)–(c), § 3.105(e)/(i), or § 3.951 are void ab initio (Brown v. Brown, 5 Vet. App. 413 (1993); Kitchens; Stern v. McDonough), requiring reinstatement retroactive to the unlawful reduction date without satisfying CUE's undebatable standard.",
      ifNoAdvanceLabel: "Not a reduction/severance -> Check Step 2 (§ 3.156(c))",
      recordClues: [
        "Rating code sheet showing a prior higher evaluation held for 5+ years (§ 3.344(c)) or 20+ continuous years (§ 3.951(b)) before reduction.",
        "Single C&P exam that failed to review the entire medical history or ignored temporary rest/convalescence.",
        "Missing 60-day advance proposal notice (§ 3.105(e)) or ignored 30-day predetermination hearing request (§ 3.105(i)).",
      ],
      killSwitches: [
        "Temporary 100% surgical/hospital ratings (§§ 4.29, 4.30) and time-limited convalescent floors follow distinct expiration rules unless post-convalescent residuals were reduced without an exam.",
        "Fraud proven by clear and unmistakable evidence lifts statutory 10-year (§ 3.957) and 20-year (§ 3.951(b)) shields.",
      ],
      primaryHref: "/playbooks/05-void-rating-reductions-stabilized-ratings",
      secondaryLinks: [
        { label: "38 C.F.R. § 3.344", href: "/cfr/38-cfr-3.344" },
        { label: "38 C.F.R. § 3.951", href: "/cfr/38-cfr-3.951" },
      ],
      svgY: firstStepY,
    },

    // STEP 2: Newly Associated Service Department Records (§ 3.156(c))
    {
      stepNumber: 2,
      id: "service-records-3156c",
      shortTitle: "§ 3.156(c) service records",
      gateQuestion: isVet
        ? "Did official military, inpatient surgical, unit, deck-log, or declassified exposure records exist during service that were missing from your VA file at the earlier denial?"
        : "Were relevant pre-existing official service department records associated with the C-file after the prior denial (§ 3.156(c)(1))?",
      primaryCitation: "38 C.F.R. § 3.156(c)(1)–(4); Vigil; Emerson; Blubaugh",
      evidentiaryStandard: "Standard Benefit of the Doubt (38 U.S.C. § 5107(b))",
      dateStatusBadge: isPre1962ServiceRecs
        ? "Verify Pre-1962 Print Text"
        : is2006ServiceRecsPubGap
          ? "Sept. 2006 FR Pub-Gap!"
          : "Bypasses George & CUE Bars",
      dateBoundaryAlert: isPre1962ServiceRecs
        ? `Indexed § 3.156(c) snapshots begin in 1962; consult print regulations for ${decisionDate} while noting modern § 3.156(c) reconsideration applies today when pre-existing official service records enter the C-file.`
        : is2006ServiceRecsPubGap
          ? `71 FR 52455 was published Sept. 6, 2006 but took effect October 6, 2006 (2006-10-06). Decisions on ${decisionDate} preceded the Oct. 6, 2006 codification (see Vigil v. Peake, 22 Vet. App. 63 (2008)).`
          : null,
      ifYesTitle: isVet
        ? "Mandatory reconsideration back to original claim date"
        : "§ 3.156(c) Reconsideration & Retroactive Staged Rating",
      ifYesSummary: isVet
        ? "VA must reconsider the earlier denial using full medical development and the Veteran-friendly benefit-of-the-doubt rule. If granted all or in part based on those military records, the effective date can reach back to your original denied claim (or when the disability arose, if later)."
        : "Triggers mandatory reconsideration under § 3.156(c)(1) with full nexus development, modern favorable case law (bypassing George v. McDonough), effective date back to the original disallowed claim or date entitlement arose (§ 3.156(c)(3); Vigil; Emerson), and multi-decade staged ratings (§ 3.156(c)(4)).",
      ifNoAdvanceLabel: "No unassociated service records -> Check Step 3 (Open Claim)",
      recordClues: [
        "Inpatient military hospital / clinical surgical jackets (often stored separately from outpatient STRs in NPRC archives).",
        "Unit morning reports, ship deck logs, JSRRC/CRUR stressor verifications, or declassified DoD chemical/herbicide logs.",
        "NPRC 1973 St. Louis fire reconstruction files (§ 3.156(c)(1)(iii)) arriving after the initial denial.",
      ],
      killSwitches: [
        "Blubaugh v. McDonald (Fed. Cir. 2014): exhausted if VA already associated and weighed the record in an intermediate denial that failed solely for lack of current diagnosis.",
        "Kisor v. Wilkie (Fed. Cir. 2020): the newly associated service record must be 'relevant'—speaking to a contested element of the prior denial.",
      ],
      primaryHref: "/cfr/38-cfr-3.156c",
      secondaryLinks: [
        {
          label: "Service Records Guide",
          href: "/playbooks/03-service-department-records-38-cfr-3-156c",
        },
        {
          label: "Piercing Finality Treatise",
          href: "/docs/procedural-vehicles-piercing-finality",
        },
      ],
      svgY: firstStepY + stepSpacing,
    },

    // STEP 3: Pending / Unadjudicated / Defective Notice / § 3.156(b) / AMA § 5104(b)
    {
      stepNumber: 3,
      id: "pending-unadjudicated",
      shortTitle: "Pending open claim",
      gateQuestion: isVet
        ? "Did finality never attach because VA left a claim or appeal unanswered, mailed notice to a wrong address, or received VA hospital records within 1 year of a Legacy decision?"
        : isAmaDecision
          ? "Did the post-Feb. 19, 2019 AMA decision omit a claimed or reasonably raised issue (§ 5104(b) Hamill), or suffer defective mailing notice?"
          : "Did finality fail to attach due to an unissued SOC, pre-2015 informal/TDIU claim, defective mailing, VACOLS sweep, or 1-year § 3.156(b) submission/VAMC record (Beraud / Lang)?",
      primaryCitation: isAmaDecision
        ? "38 U.S.C. § 5104(b); Hamill v. Collins (2026); 38 C.F.R. § 3.103"
        : "38 C.F.R. §§ 3.156(b), 3.157(b); Beraud; Lang; Roberson; Ashley",
      evidentiaryStandard: "Open Original Claim — Equipoise (38 U.S.C. § 5107(b))",
      dateStatusBadge: isAmaDecision
        ? "AMA § 5104(b) Hamill Active"
        : isPre1963Soc
          ? "Pre-1963 Form P-9 Era"
          : isPre2015Informal
            ? "§ 3.157(b) & § 3.156(b) Active"
            : "Legacy § 3.156(b) (2015–2019)",
      dateBoundaryAlert: isAmaDecision
        ? `Under Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026), implicit denial is abolished for AMA decisions (>= Feb. 19, 2019)—every omitted claim or reasonably raised issue remains legally pending. Note § 3.156(b) Beraud/Lang applies only to pre-Feb. 19, 2019 Legacy decisions.`
        : isPreBell
          ? `Note: Lang v. Wilkie (1-year post-decision VAMC constructive receipt under § 3.156(b)) requires Bell constructive possession (>= July 21, 1992), whereas actual § 3.156(b) submissions (Beraud), unissued SOCs (>= 1963), and § 3.157(b) hospital reports apply earlier.`
          : !isPre2015Informal
            ? `79 FR 57660 prospectively repealed former § 3.157(b) hospital-report informal claims on March 24, 2015, without extinguishing pre-2015 pending claims (Shea v. Wilkie).`
            : null,
      ifYesTitle: isVet
        ? "Original claim or appeal is still open and pending"
        : "Finality Never Attached — Direct Pending-Claim Adjudication",
      ifYesSummary: isVet
        ? "Because VA never properly closed the claim or appeal, it remains legally open today—meaning VA must decide it under normal benefit-of-the-doubt rules rather than strict CUE error rules."
        : "Finality never attached (or was abated under Legacy § 3.156(b)); the claimant pursues a live pending claim governed by § 5107(b) equipoise and favorable intervening precedent (Barry, Wagner) back to the original filing date.",
      ifNoAdvanceLabel: "Claim validly closed & noticed -> Check Step 4 (Nehmer)",
      recordClues: [
        "Timely post-1962 Notice of Disagreement (NOD) in the C-file with no Statement of the Case (SOC) ever issued, or VACOLS administrative sweep closure (Freund).",
        "Returned-undeliverable envelope or decision/exam notice mailed to an outdated address despite newer VAMC/RO address records (Ashley; Cross; Woods).",
        "Legacy RO decision (1992–2019) followed within 365 days by VAMC treatment notes for that condition with no new-and-material ruling (Lang v. Wilkie), or AMA decision (>= 2019-02-19) silently omitting a raised issue (Hamill).",
        "Pre-March 24, 2015 VAMC exam/admission report on a 0%+ SC condition (former § 3.157(b)) or unemployability evidence raising inferred TDIU (Roberson / Rice).",
      ],
      killSwitches: [
        "Deshotel / Williams implicit denial can close related issues in pre-Feb. 19, 2019 Legacy decisions when a formal decision reasonably notified the claimant that the related claim was denied (abolished for AMA decisions by Hamill).",
        "After March 24, 2015 (79 FR 57660), clinical treatment notes and non-form letters no longer initiate new claims.",
      ],
      primaryHref: "/docs/procedural-vehicles-piercing-finality",
      secondaryLinks: [
        {
          label: "Defective Notice Guide",
          href: "/playbooks/02-wrong-address-defective-notice-cp-exams",
        },
        {
          label: "Unadjudicated TDIU & Informal Claims",
          href: "/playbooks/04-unadjudicated-tdiu-informal-claims-smc",
        },
      ],
      svgY: firstStepY + stepSpacing * 2,
    },

    // STEP 4: Nehmer Herbicide Class Stipulation (§ 3.816)
    {
      stepNumber: 4,
      id: "nehmer-herbicide",
      shortTitle: "Nehmer § 3.816 class",
      gateQuestion: isVet
        ? "Does the decision involve a covered Agent Orange / herbicide condition originally claimed or documented in your file on or after September 25, 1985?"
        : "Is the disability a covered herbicide disease under 38 C.F.R. § 3.816 denied post-Sept. 25, 1985 or documented during a prior claim?",
      primaryCitation: "38 C.F.R. § 3.816(c)–(f); Nehmer Stipulation; Footnote 1",
      evidentiaryStandard: "Mandatory Class-Action Effective-Date Override",
      dateStatusBadge:
        decisionDate < "1985-09-25"
          ? "Check Post-9/25/1985 Filings"
          : "§ 3.816 Overrides § 5110",
      dateBoundaryAlert:
        decisionDate < "1985-09-25"
          ? `Claims finally denied before Sept. 25, 1985 require checking whether a subsequent claim or medical record entered the file on/after Sept. 25, 1985 under § 3.816(c).`
          : null,
      ifYesTitle: isVet
        ? "Special Nehmer retroactive effective date (and estate payout)"
        : "§ 3.816(c)–(f) Retroactive Award & Survivor/Estate Distribution",
      ifYesSummary: isVet
        ? "The Nehmer court order overrides normal finality rules for covered herbicide diseases—paying benefits back to the earlier post-1985 claim (or when the illness began) and paying unpaid back pay to eligible survivors or estates under § 3.816(f)."
        : "Overrides § 5110 and finality under § 3.816(c)(1)–(2) (including diagnostic coding mismatch protection where medical records in the prior file documented the later-added disease), with uncapped § 3.816(f) estate/survivor distribution.",
      ifNoAdvanceLabel: "Not a § 3.816 Nehmer claim -> Check Step 5 (RO CUE)",
      recordClues: [
        "Prior post-Sept. 25, 1985 denial or code-sheet entry for ischemic heart disease, Parkinsonism, bladder cancer, hypothyroidism, B-cell leukemias, soft-tissue sarcoma, or respiratory cancer.",
        "Earlier medical records in the C-file showing diagnosis of a covered herbicide condition even under a different claim label (Footnote 1).",
        "Surviving family member or estate where the Veteran died before receiving full retroactive Nehmer compensation (§ 3.816(f)).",
      ],
      killSwitches: [
        "PACT Act statutory additions of hypertension and MGUS are excluded by VA policy (M21-1 VIII.i.2.B.1.c) from § 3.816 Nehmer class retroactivity—audit § 3.114 1-year lookbacks and pre-Aug. 14, 2023 Intent to File dates instead.",
      ],
      primaryHref: "/playbooks/06-nehmer-herbicide-presumptions-crsc",
      secondaryLinks: [
        {
          label: "Survivor & Nehmer Estates Guide",
          href: "/playbooks/09-accrued-benefits-substitution-nehmer-estates",
        },
        { label: "38 C.F.R. § 3.816", href: "/cfr/38-cfr-3.816" },
      ],
      svgY: firstStepY + stepSpacing * 3,
    },

    // STEP 5: Regional Office / AOJ CUE (§ 3.105(a))
    {
      stepNumber: 5,
      id: "ro-cue-3105a",
      shortTitle: "RO CUE (§ 3.105(a))",
      gateQuestion: isVet
        ? "Is the decision an unappealed Regional Office rating (never decided on the merits by the Board) with an undebatable factual or then-existing law error?"
        : "Is the target an unsubsumed final AOJ/RO decision containing an undebatable Russell/Fugo error on the extant record and extant law?",
      primaryCitation:
        "38 U.S.C. § 5109A; 38 C.F.R. § 3.105(a); Russell; Bell; George",
      evidentiaryStandard: "Undebatable Error + Manifestly Changed Outcome",
      dateStatusBadge: isPreBell
        ? "Pre-Bell (< 7/21/1992): Physical C-File"
        : "Post-Bell (>= 7/21/1992): Constructive VAMC",
      dateBoundaryAlert: isPreBell
        ? `Critical temporal cutoff: Because ${decisionDate} precedes July 21, 1992 (Bell v. Derwinski; VAOPGCPREC 12-95), VA medical records NOT physically inside the C-file on ${decisionDate} are outside CUE record scope.`
        : `Because ${decisionDate} is on or after July 21, 1992 (Bell v. Derwinski), existing VA-generated clinical records were constructively part of the record before the RO.`,
      ifYesTitle: isVet
        ? "Regional Office CUE revision back to original rating date"
        : "AOJ Revision Under § 5109A / § 3.105(a) (Distinct Theories Permitted)",
      ifYesSummary: isVet
        ? "If the Regional Office missed undisputed facts in the file or misapplied the exact regulation in force on the decision date—and fixing that mistake would unquestionably have changed the outcome—VA revises the rating back to the original decision date."
        : "Revises the unappealed AOJ decision effective as if made properly on the original date (§ 5109A(b)). Unlike Subpart O Board CUE, distinct § 3.105(a) theories not previously decided on the merits are not barred by § 20.1409(c)—provided no BVA decision subsumed the issue.",
      ifNoAdvanceLabel: "Issue decided/subsumed by Board -> Check Step 6 (Board CUE)",
      recordClues: [
        "Code sheet verifying the issue was NEVER appealed to and decided on the merits by the Board of Veterans' Appeals (no § 20.1400(b) merger).",
        "Point-in-time 38 C.F.R. text on the decision date (e.g., pre-July 3, 1997 § 4.56 muscle rules or mandatory statutory SMC) plainly misapplied to undisputed C-file facts.",
      ],
      killSwitches: [
        "BVA Merger / Subsumption (§ 20.1400(b); Manning): if a later Board decision reviewed and decided the same issue on the merits, AOJ CUE is jurisdictionally barred.",
        "Cook v. Principi (2002): duty-to-assist or inadequate-exam failures can NEVER constitute CUE.",
        "George v. McDonough (2022) & 38 C.F.R. § 20.1403(e): later judicial invalidation or reinterpretation of a regulation extant at T₀ cannot support CUE.",
      ],
      primaryHref: "/docs/procedural-vehicles-piercing-finality",
      secondaryLinks: [
        {
          label: "38 C.F.R. § 3.105 & Protections",
          href: "/cfr/modules/38-cfr-3.105e-3.344-3.951-3.957-reductions",
        },
        {
          label: "Gunshot & Muscle CUE Guide",
          href: "/playbooks/01-penetrating-wounds-scars-vs-muscles",
        },
      ],
      svgY: firstStepY + stepSpacing * 4,
    },

    // STEP 6: Board of Veterans' Appeals CUE (§ 7111 / § 20.1409(c))
    {
      stepNumber: 6,
      id: "board-cue-7111",
      shortTitle: "Board CUE (§ 7111)",
      gateQuestion: isVet
        ? "Did the Board of Veterans' Appeals decide this issue on the merits, and have you reviewed the pre-filing checklist with an accredited representative?"
        : "Did a final BVA decision decide or subsume the issue on the merits, and are all Subpart O (§§ 20.1403–20.1409) pre-filing gates satisfied?",
      primaryCitation:
        "38 U.S.C. § 7111; 38 C.F.R. §§ 20.1400–20.1411 (§ 20.1409(c) Finality)",
      evidentiaryStandard: "Strict Pleading (§ 20.1404(b)) + One Final Merits Gate (§ 20.1409(c))",
      dateStatusBadge: isPre1997BoardCueAct
        ? "Enacted 11/21/1997 (Reaches Earlier BVA)"
        : "§ 20.1409(c) Merits Finality Gate",
      dateBoundaryAlert: isPre1997BoardCueAct
        ? `Historical note: Statutory Board CUE (Pub. L. 105-111, eff. Nov. 21, 1997) overturned Smith v. Brown to permit CUE motions today against pre-1997 BVA decisions—still governed by the substantive law and ${isPreBell ? "pre-Bell physical record" : "post-Bell constructive record"} in force on ${decisionDate}.`
        : null,
      ifYesTitle: isVet
        ? "Review Board CUE pre-filing checklist before filing"
        : "Subpart O Board CUE Motion (Complete Pre-Filing Gate First)",
      ifYesSummary: isVet
        ? "Under 38 C.F.R. § 20.1409(c), once the Board issues a final decision on the merits of a CUE motion attacking a prior Board decision on an issue, no further CUE motions can be filed on that same Board issue. Always review the complete C-file and every possible non-CUE option with an accredited representative first."
        : "Filed directly with the Board under 38 U.S.C. § 7111 and 38 C.F.R. § 20.1404(b). CRITICAL GATE (§ 20.1409(c)): Once the Board renders a final merits decision on a CUE motion challenging a prior Board decision on an issue, that Board issue is permanently closed to later CUE theories (whereas facial pleading dismissals under § 20.1404(b) are without prejudice).",
      ifNoAdvanceLabel:
        "If CUE bars apply -> Re-check Supplemental Claim (§ 3.2501) with new & relevant evidence",
      recordClues: [
        "Complete copy of the prior BVA decision, hearing transcript, and contemporaneous C-file proving undebatable error on extant law and record.",
        "Confirmation that no federal court (CAVC / Fed. Cir.) affirmed or decided that exact issue on the merits (§ 20.1400(b)).",
        "Signed completion of the Board CUE Pre-Filing Gate checklist verifying all possible theories on that Board issue are pleaded together.",
      ],
      killSwitches: [
        "38 C.F.R. § 20.1409(c) issue finality: a prior final merits denial of a Subpart O CUE motion on the same Board decision issue bars any second CUE motion on that Board issue.",
        "38 C.F.R. § 20.1400(b): issues decided on the merits by a court of competent jurisdiction (e.g., CAVC merits affirmance) cannot be revised via Board CUE.",
        "38 C.F.R. § 20.1403(d)–(e): duty-to-assist breaches, changed diagnoses, weighing disputes, and subsequent changes in interpretation (George) are categorically excluded.",
      ],
      primaryHref: "/checklists/board-cue-pre-filing-gate",
      secondaryLinks: [
        {
          label: "38 C.F.R. §§ 20.1400–20.1411",
          href: "/cfr/38-cfr-20.1400-20.1411",
        },
        {
          label: "Investigate Workspace",
          href: "/investigate",
        },
      ],
      svgY: firstStepY + stepSpacing * 5,
    },
  ];

  return {
    effectiveDate: decisionDate,
    eraId,
    gates,
    svgViewBox: {
      width: 920,
      height: firstStepY + stepSpacing * 5 + 96,
    },
  };
}
