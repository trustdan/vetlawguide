import { stripMarkdownSyntax } from "./diff";
import { resolveEraIdForDate } from "./eras-and-authorities";
import type { CfrVersionRecord, HistoricalEraId } from "./types";

export type EnactedTimelineTrack =
  | "Statutes"
  | "Part 3 Adjudication"
  | "Part 4 VASRD"
  | "Landmark Precedents";

export const ALL_ENACTED_TIMELINE_TRACKS: ReadonlyArray<EnactedTimelineTrack> = [
  "Statutes",
  "Part 3 Adjudication",
  "Part 4 VASRD",
  "Landmark Precedents",
];

export interface TimelineChronologyEvent {
  id: string;
  dateLabel: string;
  isoDate: string;
  publicationDate: string | null;
  eraId: HistoricalEraId;
  track: EnactedTimelineTrack;
  title: string;
  shortTitle: string;
  primaryCitation: string;
  veteranSummary: string;
  practitionerSummary: string;
  retroactiveOpportunity: string;
  temporalTrap: string;
  href: string;
  identifier?: string;
  isQuarantined: false;
}

export interface QuarantinedTimelineWatchItem {
  id: string;
  identifier: string;
  federalRegisterCitation: string;
  noticeDate: string;
  rescindedDate: string | null;
  statusKind: "proposed" | "rescinded";
  statusBadge: string;
  targetCfr: string;
  title: string;
  veteranSummary: string;
  practitionerSummary: string;
  activeLawBaseline: string;
  auditGuardrail: string;
  href: string;
  isQuarantined: true;
}

export interface CompiledTimelineBundle {
  checkedAsOf: string;
  events: TimelineChronologyEvent[];
  quarantinedWatchlist: QuarantinedTimelineWatchItem[];
}

interface MatrixRowEnrichment {
  id: string;
  isoDate: string;
  publicationDate: string | null;
  track: EnactedTimelineTrack;
  shortTitle: string;
  veteranSummary: string;
  retroactiveOpportunity: string;
  temporalTrap: string;
  href: string;
}

/**
 * Deterministic temporal, track, and dual-persona metadata mapped 1:1 onto the
 * enacted rows of `corpus/upstream/docs/master-chronological-matrix.md` plus
 * key `cfr-amendments.json` Part 3 / Supreme Court milestones.
 */
const MATRIX_ROW_ENRICHMENTS: ReadonlyArray<{
  matchDatePrefix: string;
  spec: MatrixRowEnrichment;
}> = [
  {
    matchDatePrefix: "Apr 1, 1946",
    spec: {
      id: "tl-1946-vasrd",
      isoDate: "1946-04-01",
      publicationDate: "1964-05-22",
      track: "Part 4 VASRD",
      shortTitle: "1945 VASRD Eff.",
      veteranSummary:
        "Post-WWII rating schedule took effect April 1, 1946, creating modern 4-digit Diagnostic Codes and baseline muscle, joint, and scar rules.",
      retroactiveOpportunity:
        "Pre-July 3, 1997 muscle-wound rules (§§ 4.55–4.56) evaluated through-and-through gunshot/shrapnel muscle damage favorably when raters assigned only a 0% surface scar.",
      temporalTrap:
        "Although titled the '1945 Schedule,' it took effect April 1, 1946 (38 C.F.R. § 3.952; republished May 22, 1964 at 29 FR 6718). Pre-April 1, 1946 decisions require print schedules.",
      href: "/cfr/38-cfr-4.56/1946-04-01",
    },
  },
  {
    matchDatePrefix: "Sept 2, 1958",
    spec: {
      id: "tl-1959-title38",
      isoDate: "1959-01-01",
      publicationDate: "1958-09-02",
      track: "Statutes",
      shortTitle: "Title 38 Codified",
      veteranSummary:
        "Congress consolidated WWII and Korean-era Veterans' Regulations into Title 38 of the U.S. Code effective January 1, 1959 and protected existing 1957–1958 awards.",
      retroactiveOpportunity:
        "Statutory savings clauses (38 C.F.R. §§ 3.953, 3.957(c)) shield compensation payable on Dec. 31, 1957 or Dec. 31, 1958 against severance absent fraud, misrepresentation, or CUE.",
      temporalTrap:
        "Decisions before Jan. 1, 1959 cite Veterans' Regulation No. 1(a), whereas 1959–1991 decisions cite three- and four-digit Title 38 numbers (§ 310, § 314, § 3010).",
      href: "/crosswalk",
    },
  },
  {
    matchDatePrefix: "Oct 15, 1962",
    spec: {
      id: "tl-1962-soc",
      isoDate: "1962-12-01",
      publicationDate: "1962-10-15",
      track: "Statutes",
      shortTitle: "SOC & Eff. Dates",
      veteranSummary:
        "Standardized 1-year post-discharge effective dates and required VA (starting Jan. 1, 1963) to mail a formal Statement of the Case whenever a Veteran disagreed in writing.",
      retroactiveOpportunity:
        "If a Veteran filed a timely written Notice of Disagreement on or after Jan. 1, 1963 and VA never issued a Statement of the Case (SOC), the appeal remained legally open for decades.",
      temporalTrap:
        "Pub. L. 87-825 took effect Dec. 1, 1962 while Pub. L. 87-666 mandatory SOC rules took effect Jan. 1, 1963; pre-1963 appeals used direct Form P-9 / 1-9 filings.",
      href: "/docs/procedural-vehicles-piercing-finality",
    },
  },
  {
    matchDatePrefix: "1962–1988",
    spec: {
      id: "tl-1962-informal-3157b",
      isoDate: "1961-02-24",
      publicationDate: "1961-02-24",
      track: "Part 3 Adjudication",
      shortTitle: "§ 3.157(b) Hospital Claims",
      veteranSummary:
        "Any written statement showing intent to claim benefits counted as an informal claim, and VA or military hospital/exam reports for already service-connected conditions automatically claimed an increase.",
      retroactiveOpportunity:
        "A 0% service-connected rating followed by a pre-March 24, 2015 VA hospital admission or exam showing worsening triggered an automatic pending claim for increase under former § 3.157(b).",
      temporalTrap:
        "Former § 3.157(b) required the condition to be already service-connected (including 0% SC) before or via the report, and was prospectively repealed on March 24, 2015.",
      href: "/cfr/38-cfr-3.157b/1961-02-24",
    },
  },
  {
    matchDatePrefix: "Sept 25, 1985",
    spec: {
      id: "tl-1985-nehmer",
      isoDate: "1985-09-25",
      publicationDate: null,
      track: "Part 3 Adjudication",
      shortTitle: "Nehmer § 3.816 Class",
      veteranSummary:
        "Court stipulation voided unlawful Agent Orange denials and created special retroactive effective-date and family payout rules for covered herbicide diseases.",
      retroactiveOpportunity:
        "Overrides normal finality and § 5110 back to the post-Sept. 25, 1985 claim (or disease onset), even when earlier records documented the covered condition under a different code, with uncapped § 3.816(f) estate payouts.",
      temporalTrap:
        "VA policy (M21-1 VIII.i.2.B.1.c) excludes PACT-added hypertension and MGUS from § 3.816 Nehmer class retroactivity—audit PACT Intent-to-File and § 3.114 1-year lookbacks instead.",
      href: "/playbooks/06-nehmer-herbicide-presumptions-crsc",
    },
  },
  {
    matchDatePrefix: "Nov 18, 1988",
    spec: {
      id: "tl-1988-vjra",
      isoDate: "1988-11-18",
      publicationDate: "1988-11-18",
      track: "Statutes",
      shortTitle: "VJRA Court Review",
      veteranSummary:
        "Created independent federal court review of Board decisions and required written explanations ('reasons or bases'), while temporarily imposing the 'well-grounded claim' hurdle (1988–2000).",
      retroactiveOpportunity:
        "Ended former § 211(a) judicial insulation, mandated BVA 'reasons or bases' (§ 7104(d)(1)), and enabled binding CAVC and Federal Circuit precedent.",
      temporalTrap:
        "Between Nov. 18, 1988 and Nov. 8, 2000 (former § 5107(a)), VA lawfully dismissed claims as 'not well grounded' without a C&P exam—attacking lack of an exam as CUE fails.",
      href: "/eras/1988-2000-vjra-revolution",
    },
  },
  {
    matchDatePrefix: "Oct 1990",
    spec: {
      id: "tl-1990-cavc-wave",
      isoDate: "1990-10-19",
      publicationDate: null,
      track: "Landmark Precedents",
      shortTitle: "Gilbert & Russell Wave",
      veteranSummary:
        "Early Veterans Court rulings established the 50/50 benefit-of-the-doubt rule, mandatory Special Monthly Compensation review, strict mailing rules, and the 3-part CUE test.",
      retroactiveOpportunity:
        "Confirmed judicial enforceability of § 3.105(a) Regional Office CUE reaching back to 1945+ decisions, mandatory statutory SMC (Akles), and mailing-presumption rebuttal (Ashley).",
      temporalTrap:
        "Until Congress enacted Pub. L. 105-111 on Nov. 21, 1997, Smith v. Brown (1994) barred CUE motions against Board decisions, and Russell requires undebatable error on the extant record.",
      href: "/cases",
    },
  },
  {
    matchDatePrefix: "July 21, 1992",
    spec: {
      id: "tl-1992-bell",
      isoDate: "1992-07-21",
      publicationDate: "1992-07-21",
      track: "Landmark Precedents",
      shortTitle: "Bell Record Cutoff",
      veteranSummary:
        "Held that from July 21, 1992 forward, VA medical records already created by VA clinicians count as part of your file even if VA hadn't copied them into your claims folder.",
      retroactiveOpportunity:
        "For decisions on or after July 21, 1992, unassociated VAMC clinical notes existing before the decision are constructively before the adjudicator for CUE and § 3.156(b) Lang analysis.",
      temporalTrap:
        "Bell constructive possession does NOT apply retroactively to CUE attacks on decisions rendered before July 21, 1992 (VAOPGCPREC 12-95; Damrel)—check § 3.157(b) or § 3.156(c) instead.",
      href: "/docs/procedural-vehicles-piercing-finality",
    },
  },
  {
    matchDatePrefix: "Nov 7, 1996",
    spec: {
      id: "tl-1996-dsm4",
      isoDate: "1996-11-07",
      publicationDate: "1996-10-08",
      track: "Part 4 VASRD",
      shortTitle: "§ 4.130 DSM-IV Formula",
      veteranSummary:
        "Unified VA mental health ratings into the 0/10/30/50/70/100% General Rating Formula effective November 7, 1996 while repealing former § 4.16(c).",
      retroactiveOpportunity:
        "Claims pending across Nov. 7, 1996 receive consideration under both pre-1996 (§ 4.132 / former § 4.16(c)) and post-1996 criteria (Karnas); pre-1996 70% mental sole-disability claims had mandatory 100% rules under former § 4.16(c).",
      temporalTrap:
        "Published Oct. 8, 1996 (61 FR 52695), effective Nov. 7, 1996. Never cite modern § 4.130 symptom lists when auditing CUE on a pre-Nov. 7, 1996 rating decision.",
      href: "/cfr/38-cfr-4.130/1996-11-07",
    },
  },
  {
    matchDatePrefix: "July 3, 1997",
    spec: {
      id: "tl-1997-muscles",
      isoDate: "1997-07-03",
      publicationDate: "1997-06-03",
      track: "Part 4 VASRD",
      shortTitle: "§ 4.56 Muscle Overhaul",
      veteranSummary:
        "Updated muscle-injury rules effective July 3, 1997 (published June 3, 1997), adding an explicit moderate-rating floor for through-and-through gunshot or shrapnel muscle damage.",
      retroactiveOpportunity:
        "Codified the bright-line § 4.56(b) moderate-injury floor for through-and-through penetrating muscle wounds on/after July 3, 1997, while preserving generous qualitative wound rules pre-1997.",
      temporalTrap:
        "30-day FR publication gap: 62 FR 30235 was published June 3, 1997 but took effect July 3, 1997—a June 20, 1997 rating decision is governed strictly by the 1946–1997 text.",
      href: "/cfr/38-cfr-4.56/1997-07-03",
    },
  },
  {
    matchDatePrefix: "Nov 21, 1997",
    spec: {
      id: "tl-1997-cue-act",
      isoDate: "1997-11-21",
      publicationDate: "1997-11-21",
      track: "Statutes",
      shortTitle: "Board CUE Act",
      veteranSummary:
        "Congress authorized Clear and Unmistakable Error (CUE) motions against final Board of Veterans' Appeals decisions for the first time.",
      retroactiveOpportunity:
        "Overturned Smith v. Brown by enacting 38 U.S.C. § 7111 (Board CUE) alongside § 5109A (RO CUE), opening pre- and post-1997 BVA merits decisions to collateral error review.",
      temporalTrap:
        "Under 38 C.F.R. § 20.1409(c), once the Board renders a final merits decision on a CUE motion challenging a prior Board decision on an issue, no further CUE motions may be filed on that Board issue.",
      href: "/cfr/38-cfr-20.1400-20.1411",
    },
  },
  {
    matchDatePrefix: "Nov 9, 2000",
    spec: {
      id: "tl-2000-vcaa",
      isoDate: "2000-11-09",
      publicationDate: "2000-11-09",
      track: "Statutes",
      shortTitle: "VCAA Duty to Assist",
      veteranSummary:
        "Eliminated 'well-grounded claim' dismissals and required VA by statute to notify claimants of needed evidence, gather records, and provide medical nexus exams.",
      retroactiveOpportunity:
        "Abolished former § 5107(a) gatekeeping and codified the low 3-element medical exam trigger (§ 5103A(d); § 3.159(c)(4); McLendon) across open and pending claims.",
      temporalTrap:
        "Under Cook v. Principi (2002) and 38 C.F.R. § 20.1403(d)(2), VCAA notice or duty-to-assist violations cannot constitute CUE once a decision becomes final.",
      href: "/cfr/38-cfr-3.159a-c",
    },
  },
  {
    matchDatePrefix: "May 2001",
    spec: {
      id: "tl-2001-roberson-rice",
      isoDate: "2001-05-29",
      publicationDate: null,
      track: "Landmark Precedents",
      shortTitle: "Roberson & Rice TDIU",
      veteranSummary:
        "Federal courts held that VA must sympathetically read Veteran filings and consider 100% Individual Unemployability (TDIU) whenever claim records show service-connected conditions prevent work.",
      retroactiveOpportunity:
        "Unadjudicated reasonably raised TDIU issues embedded inside pre-2015 rating or increase claims remain legally pending open claims without requiring a separate TDIU form at the time.",
      temporalTrap:
        "Requires cognizable evidence of unemployability linked to service-connected disabilities in the record; post-2015 claims require standardized VA Form 21-8940 development compliance.",
      href: "/playbooks/04-unadjudicated-tdiu-informal-claims-smc",
    },
  },
  {
    matchDatePrefix: "Aug 30, 2002",
    spec: {
      id: "tl-2002-interim-scars-ivds",
      isoDate: "2002-08-30",
      publicationDate: "2002-07-31",
      track: "Part 4 VASRD",
      shortTitle: "2002 Scars & IVDS",
      veteranSummary:
        "Enacted interim square-inch/cm scar disfigurement rules (Aug. 30, 2002) and physician-prescribed bed-rest Incapacitating Episode spine rules (Sept. 23, 2002).",
      retroactiveOpportunity:
        "Introduced the 8-characteristic head/face/neck disfigurement matrix (up to 80% under DC 7800) effective Aug. 30, 2002 and alternative bed-rest vs. orthopedic spine evaluation.",
      temporalTrap:
        "Distinct interim windows: Aug. 30, 2002 – Oct. 22, 2008 still capped DC 7804 painful scars at a single 10%, and Sept. 23, 2002 – Sept. 25, 2003 sits before the full 2003 spine overhaul.",
      href: "/cfr/38-cfr-4.118/2002-08-30",
    },
  },
  {
    matchDatePrefix: "Sept 26, 2003",
    spec: {
      id: "tl-2003-spine",
      isoDate: "2003-09-26",
      publicationDate: "2003-08-27",
      track: "Part 4 VASRD",
      shortTitle: "§ 4.71a Spine ROM",
      veteranSummary:
        "Replaced subjective 'slight/moderate/severe' back and neck terms with measured degree-of-motion thresholds and mandatory separate nerve/radiculopathy ratings.",
      retroactiveOpportunity:
        "Note (1) to the General Rating Formula for the Spine mandates separate ratings for objective radiculopathy, bladder/bowel, and neurologic residuals from Sept. 26, 2003 forward.",
      temporalTrap:
        "Published Aug. 27, 2003 (68 FR 51454), effective Sept. 26, 2003. Pre-Sept. 26, 2003 CUE motions must apply retired DC 5285–5295 criteria rather than modern goniometer degrees.",
      href: "/cfr/38-cfr-4.71a-4.73",
    },
  },
  {
    matchDatePrefix: "Oct 6, 2006",
    spec: {
      id: "tl-2006-3156c",
      isoDate: "2006-10-06",
      publicationDate: "2006-09-06",
      track: "Part 3 Adjudication",
      shortTitle: "§ 3.156(c) Codified",
      veteranSummary:
        "Clarified mandatory reconsideration and multi-decade retroactive effective dates whenever missing official military, surgical, unit, or declassified service records are added to a VA file.",
      retroactiveOpportunity:
        "Carries awards based all or in part on newly associated official service department records back to the original denied claim (§ 3.156(c)(3); Vigil; Emerson) without proving CUE.",
      temporalTrap:
        "Published Sept. 6, 2006 (71 FR 52455), effective Oct. 6, 2006; exhausted under Blubaugh if VA already associated and weighed the record in an intermediate denial lacking a current diagnosis.",
      href: "/cfr/38-cfr-3.156c/2006-10-06",
    },
  },
  {
    matchDatePrefix: "Oct 23, 2008",
    spec: {
      id: "tl-2008-scars-tbi",
      isoDate: "2008-10-23",
      publicationDate: "2008-09-23",
      track: "Part 4 VASRD",
      shortTitle: "Scars & TBI Overhaul",
      veteranSummary:
        "Began counting every painful or unstable scar for 10%/20%/30% ratings (DC 7804) and enacted the 10-facet Traumatic Brain Injury table (up to 100% under DC 8045).",
      retroactiveOpportunity:
        "Count-based DC 7804 (1–2 = 10%, 3–4 = 20%, 5+ = 30%, +10% if both painful and unstable) and highest-facet DC 8045 TBI evaluation (0/10/40/70/100%) from Oct. 23, 2008 forward.",
      temporalTrap:
        "Published Sept. 23, 2008 (73 FR 54708 & 73 FR 54693), effective Oct. 23, 2008—increased awards under these liberalizing tables cannot precede October 23, 2008.",
      href: "/cfr/38-cfr-4.118/2008-10-23",
    },
  },
  {
    matchDatePrefix: "Aug 4, 2014",
    spec: {
      id: "tl-2014-dsm5",
      isoDate: "2014-08-04",
      publicationDate: "2014-08-04",
      track: "Part 4 VASRD",
      shortTitle: "§ 4.130 DSM-5 Update",
      veteranSummary:
        "Updated VA mental health diagnostic terminology from DSM-IV to DSM-5 and dropped GAF scores while keeping the 0%–100% rating tiers intact.",
      retroactiveOpportunity:
        "Removed arbitrary over-reliance on single Global Assessment of Functioning (GAF) numbers in favor of holistic occupational and social symptom frequency/severity.",
      temporalTrap:
        "Transitional applicability rules in 79 FR 45093 govern claims certified to the Board prior to Aug. 4, 2014; note Feb. 2022 proposed rule RIN 2900-AQ82 remains unfinalized (not enacted).",
      href: "/cfr/38-cfr-4.130/2014-08-04",
    },
  },
  {
    matchDatePrefix: "Mar 24, 2015",
    spec: {
      id: "tl-2015-standard-forms",
      isoDate: "2015-03-24",
      publicationDate: "2014-09-25",
      track: "Part 3 Adjudication",
      shortTitle: "Standard Claim Forms",
      veteranSummary:
        "Ended informal written claims and automatic VA hospital-report increase claims, requiring standardized claim forms (VA Form 21-526EZ) or an Intent to File (VA Form 21-0966).",
      retroactiveOpportunity:
        "Prospective only: pre-March 24, 2015 informal claims and § 3.157(b) hospital reports were NOT extinguished and remain enforceable today (Shea v. Wilkie).",
      temporalTrap:
        "Hard temporal wall (79 FR 57660, pub. Sept. 25, 2014, eff. Mar. 24, 2015): VAMC notes and non-form letters on/after March 24, 2015 never initiate a claim (Sellers v. Wilkie).",
      href: "/cfr/38-cfr-3.155/2015-03-24",
    },
  },
  {
    matchDatePrefix: "Aug 13, 2018",
    spec: {
      id: "tl-2018-skin-scars",
      isoDate: "2018-08-13",
      publicationDate: "2018-07-13",
      track: "Part 4 VASRD",
      shortTitle: "§ 4.118 Biologics & Zones",
      veteranSummary:
        "Added modern biologic/immunosuppressive skin-therapy tiers, removed the 'nonlinear' scar restriction, and defined 6 body zones under § 4.118.",
      retroactiveOpportunity:
        "Unlocked 30%/60% General Rating Formula evaluations for systemic biologics and allowed linear scars to qualify under DC 7801–7802 area thresholds.",
      temporalTrap:
        "Published July 13, 2018 (83 FR 32592), effective Aug. 13, 2018; Sept. 29, 2025 notice 90 FR 46542 on DC 7804 objective pain remains a proposed rule (not enacted law).",
      href: "/cfr/38-cfr-4.118/2018-08-13",
    },
  },
  {
    matchDatePrefix: "Feb 19, 2019",
    spec: {
      id: "tl-2019-ama",
      isoDate: "2019-02-19",
      publicationDate: "2019-01-18",
      track: "Statutes",
      shortTitle: "AMA 3-Lane System",
      veteranSummary:
        "Replaced the Legacy NOD/SOC appeal system with three 1-year review lanes (Supplemental Claim, Higher-Level Review, and Board Appeal) preserving continuous effective dates.",
      retroactiveOpportunity:
        "Continuous pursuit (§ 3.2500(c),(h)) preserves the original effective date across timely 1-year Supplemental Claims, HLRs, and Board appeals.",
      temporalTrap:
        "Under 38 C.F.R. § 3.2500, filing a VA Form 20-0995 Supplemental Claim after a CAVC affirmance (rather than appealing or remanding) breaks continuous pursuit of the original date.",
      href: "/eras/2019-2026-ama-pact-modern-era",
    },
  },
  {
    matchDatePrefix: "Aug 19, 2020",
    spec: {
      id: "tl-2020-lang",
      isoDate: "2020-08-19",
      publicationDate: null,
      track: "Landmark Precedents",
      shortTitle: "Lang § 3.156(b) Rule",
      veteranSummary:
        "Held that VA medical records created within 1 year after a post-July 1992 Legacy rating decision keep that claim open unless VA ruled on whether those records were new and material.",
      retroactiveOpportunity:
        "Converts 'final' 1992–2019 Legacy RO denials or low ratings into still-pending open claims whenever VAMC clinical notes treated the condition within 365 days post-decision.",
      temporalTrap:
        "Applies strictly to Legacy decisions governed by former § 3.156(b) and post-July 21, 1992 Bell constructive possession—not post-Feb. 19, 2019 AMA decisions.",
      href: "/docs/procedural-vehicles-piercing-finality",
    },
  },
  {
    matchDatePrefix: "Feb 7, 2021",
    spec: {
      id: "tl-2021-musculoskeletal",
      isoDate: "2021-02-07",
      publicationDate: "2020-11-30",
      track: "Part 4 VASRD",
      shortTitle: "2021 Joints & Muscles",
      veteranSummary:
        "Updated joint replacement convalescence, knee instability bracing tiers (DC 5257), plantar fasciitis (DC 5269), and compartment syndrome (DC 5331).",
      retroactiveOpportunity:
        "Added standalone DC 5269 Plantar Fasciitis (corrected at 86 FR 8142 from draft 5285) and separate per-muscle-group DC 5331 Compartment Syndrome ratings.",
      temporalTrap:
        "Shortened hip/knee replacement temporary 100% convalescence from 1 year to 4 months and tightened DC 5257 knee instability—pre-Feb. 7, 2021 running ratings are protected under § 3.951(a).",
      href: "/cfr/38-cfr-4.71a-4.73",
    },
  },
  {
    matchDatePrefix: "Aug 10, 2022",
    spec: {
      id: "tl-2022-pact",
      isoDate: "2022-08-10",
      publicationDate: "2022-08-10",
      track: "Statutes",
      shortTitle: "PACT Act Enacted",
      veteranSummary:
        "Expanded Agent Orange locations and presumptions (hypertension, MGUS), created burn-pit/particulate presumptions, mandated TERA exams, and authorized § 1305 DIC re-evaluations.",
      retroactiveOpportunity:
        "Audit PACT grants for missed pre-Aug. 14, 2023 Intent-to-File backdating, § 3.114 1-year liberalizing lookbacks, and § 3.33 / § 1305 retroactive Survivor DIC re-evaluations.",
      temporalTrap:
        "Hypertension and MGUS follow § 3.114 / PACT effective-date rules rather than § 3.816 Nehmer multi-decade class retroactivity under M21-1 VIII.i.2.B.1.c.",
      href: "/playbooks/15-gulf-war-mucmi-burn-pits-pact-tera",
    },
  },
  {
    matchDatePrefix: "Apr 16, 2023",
    spec: {
      id: "tl-2023-bilateral",
      isoDate: "2023-04-16",
      publicationDate: "2023-04-14",
      track: "Part 4 VASRD",
      shortTitle: "§ 4.26(d) Bilateral Fix",
      veteranSummary:
        "Stopped the 10% bilateral factor math quirk from paradoxically rounding a Veteran's combined rating down from 100% to 90%.",
      retroactiveOpportunity:
        "Excludes paired bilateral disabilities from the § 4.26 10% add-on on/after April 16, 2023 whenever separate combination yields a higher rounded total (95%+ -> 100%).",
      temporalTrap:
        "Liberalizing rule effective April 16, 2023 (88 FR 22914, pub. Apr. 14, 2023); cannot support CUE against final pre-April 16, 2023 rating decisions.",
      href: "/cfr/38-cfr-4.26d",
    },
  },
  {
    matchDatePrefix: "May 16, 2024",
    spec: {
      id: "tl-2024-barry-smc",
      isoDate: "2024-05-16",
      publicationDate: null,
      track: "Landmark Precedents",
      shortTitle: "Barry Multi-Step SMC",
      veteranSummary:
        "Federal Circuit struck down VA's single-step cap under § 3.350(f), allowing Veterans at SMC(l)–(n) to stack multiple half-step and full-step increases up to SMC(o).",
      retroactiveOpportunity:
        "Unlocks stacked half-step (§ 3.350(f)(3)) and full-step (§ 3.350(f)(4)) SMC increases across all open, pending, timely-appealed, and § 3.156(c) claims.",
      temporalTrap:
        "Under George v. McDonough (2022) and 38 C.F.R. § 20.1403(e), subsequent judicial reinterpretation in Barry faces collateral-bar defenses if pleaded solely as CUE against final pre-May 2024 decisions.",
      href: "/cfr/38-cfr-3.350f3-5",
    },
  },
  {
    matchDatePrefix: "May 19, 2024",
    spec: {
      id: "tl-2024-digestive",
      isoDate: "2024-05-19",
      publicationDate: "2024-03-20",
      track: "Part 4 VASRD",
      shortTitle: "§ 4.114 Digestive Rule",
      veteranSummary:
        "Overhauled digestive ratings: added Rome IV IBS tiers (10/20/30% under DC 7319), celiac/IBD codes, and strict esophageal-stricture GERD rules (DC 7206).",
      retroactiveOpportunity:
        "Expanded IBS minimum compensable tier to 10% (eliminating 0% mild tier), modernized IBD biologic tiers (DC 7326), and added Celiac Disease (DC 7355).",
      temporalTrap:
        "Published Mar. 20, 2024 (89 FR 19735), effective May 19, 2024: standalone DC 7206 GERD requires esophageal stricture for compensable ratings—pre-May 19, 2024 DC 7346 GERD awards remain protected under § 3.951(a).",
      href: "/cfr/38-cfr-4.110-4.114",
    },
  },
  {
    matchDatePrefix: "June 12, 2025",
    spec: {
      id: "tl-2025-soto-crsc",
      isoDate: "2025-06-12",
      publicationDate: null,
      track: "Landmark Precedents",
      shortTitle: "Soto Uncapped CRSC",
      veteranSummary:
        "U.S. Supreme Court unanimously held that military retirees owed retroactive Combat-Related Special Compensation (CRSC) are not limited by the 6-year Barring Act cap.",
      retroactiveOpportunity:
        "Displaces the 31 U.S.C. § 3702 6-year Barring Act cap under 10 U.S.C. § 1413a, unlocking full DFAS retroactive CRSC back pay when VA grants retroactive combat-related ratings.",
      temporalTrap:
        "CRSC is administered by the military department / DFAS under Title 10 (separate application required after VA rating grant; >$10,000 disputes route via Tucker Act).",
      href: "/playbooks/20-backpay-offsets-crdp-crsc-severance-recoupment",
    },
  },
  {
    matchDatePrefix: "Feb 4–5, 2026",
    spec: {
      id: "tl-2026-hamill-cash",
      isoDate: "2026-02-04",
      publicationDate: null,
      track: "Landmark Precedents",
      shortTitle: "Hamill & Cash Rulings",
      veteranSummary:
        "Federal Circuit abolished silent 'implicit denials' for modern AMA decisions (Hamill) and required the Board to consider in-possession VA evidence referenced in an NOD (Cash).",
      retroactiveOpportunity:
        "Any claimed or reasonably raised issue omitted from a post-Feb. 19, 2019 AMA decision notice violated 38 U.S.C. § 5104(b) and remains legally pending today (Hamill v. Collins).",
      temporalTrap:
        "Hamill's § 5104(b) holding governs AMA decisions (>= Feb. 19, 2019); pre-AMA Legacy decisions remain subject to Deshotel implicit-denial analysis.",
      href: "/docs/procedural-vehicles-piercing-finality",
    },
  },
  {
    matchDatePrefix: "Mar–Apr 2026",
    spec: {
      id: "tl-2026-freund",
      isoDate: "2026-03-15",
      publicationDate: null,
      track: "Landmark Precedents",
      shortTitle: "Freund VACOLS Class",
      veteranSummary:
        "Veterans Court certified a class action covering legacy appeals that were automatically closed in VA's VACOLS computer system without a Board decision.",
      retroactiveOpportunity:
        "Audit Legacy C-files (Dec. 1990 – Feb. 2025) where a timely Notice of Disagreement or Substantive Appeal vanished via administrative VACOLS sweep without BVA adjudication.",
      temporalTrap:
        "Class scope targets administrative VACOLS closures lacking merits adjudication or valid withdrawal—verify complete VACOLS dispatch history in the C-file.",
      href: "/docs/cavc-federal-circuit-writs-and-class-actions",
    },
  },
];

/**
 * Supplemental enacted Part 3 & SCOTUS milestones from `cfr-amendments.json`
 * ensuring balanced 4-track chronological coverage alongside `master-chronological-matrix.md`.
 */
const SUPPLEMENTAL_CFR_EVENTS: ReadonlyArray<TimelineChronologyEvent> = [
  {
    id: "tl-1992-predetermination-3105i",
    dateLabel: "Jan 21, 1992",
    isoDate: "1992-01-21",
    publicationDate: "1991-12-19",
    eraId: "era-1988-2000",
    track: "Part 3 Adjudication",
    title: "38 C.F.R. § 3.105(e) & (i) Reduction Notice & Predetermination Hearing Freeze",
    shortTitle: "§ 3.105(i) Reductions",
    primaryCitation: "56 FR 65846 (pub. Dec. 19, 1991, eff. Jan. 21, 1992); Stern v. McDonough",
    veteranSummary:
      "Added the 30-day predetermination hearing right that freezes monthly compensation until VA holds the hearing and issues a final decision, alongside 60-day advance reduction notice.",
    practitionerSummary:
      "56 FR 65846 (pub. 1991-12-19, eff. 1992-01-21) codified § 3.105(i) predetermination hearings alongside § 3.105(e) 60-day pre-/post-notice buffers; noncompliance voids the reduction ab initio.",
    retroactiveOpportunity:
      "Any compensation reduction executed without a 60-day § 3.105(e) proposal or premature cut after a timely 30-day § 3.105(i) hearing request is void ab initio, restoring full arrears.",
    temporalTrap:
      "Published Dec. 19, 1991, effective Jan. 21, 1992; reductions before Jan. 21, 1992 are audited under § 3.105(e) and § 3.344 rather than § 3.105(i).",
    href: "/cfr/38-cfr-3.105e-i/1992-01-21",
    isQuarantined: false,
  },
  {
    id: "tl-2018-pension-lookback",
    dateLabel: "Oct 18, 2018",
    isoDate: "2018-10-18",
    publicationDate: "2018-09-18",
    eraId: "era-2000-2018",
    track: "Part 3 Adjudication",
    title: "38 C.F.R. §§ 3.274–3.279 Wartime Pension Net-Worth Limit & 36-Month Lookback",
    shortTitle: "§ 3.274 Pension Rule",
    primaryCitation: "83 FR 47246 (pub. Sept. 18, 2018, eff. Oct. 18, 2018)",
    veteranSummary:
      "Replaced subjective pension net-worth reviews with an indexed bright-line dollar limit, a 2-acre home-lot exclusion, deductible care expenses, and a 36-month asset-transfer lookback.",
    practitionerSummary:
      "83 FR 47246 (eff. Oct. 18, 2018) enacted bright-line CSRA net worth (§ 3.274), 2-acre residential exclusion (§ 3.275), 36-month lookback (§ 3.276), and assisted-living medical deductions (§ 3.278).",
    retroactiveOpportunity:
      "38 C.F.R. § 3.276(b) explicitly disregards all asset transfers made BEFORE October 18, 2018, and § 3.278 deducts assisted-living/in-home care expenses above 5% MAPR.",
    temporalTrap:
      "Pension claims adjudicated before Oct. 18, 2018 were governed by former §§ 3.274–3.275 facts-and-circumstances corpus tests with zero lookback penalty.",
    href: "/cfr/38-cfr-3.274-3.279",
    isQuarantined: false,
  },
  {
    id: "tl-2022-george-cue",
    dateLabel: "June 15, 2022",
    isoDate: "2022-06-15",
    publicationDate: null,
    eraId: "era-2019-present",
    track: "Landmark Precedents",
    title: "George v. McDonough (SCOTUS) — Invalidated Regulations Barred as Standalone CUE",
    shortTitle: "George CUE Limit",
    primaryCitation: "George v. McDonough, 596 U.S. 740 (2022); 38 C.F.R. § 20.1403(e)",
    veteranSummary:
      "Supreme Court ruled that when a court strikes down a VA regulation years later, that change in law cannot be used by itself to prove CUE in an old final decision—making non-CUE reopeners like § 3.156(c) critical.",
    practitionerSummary:
      "Upheld 38 C.F.R. § 20.1403(e): faithful application of a regulation extant at T₀ (e.g., pre-Wagner soundness or pre-Barry SMC caps) is not CUE when later invalidated on judicial review.",
    retroactiveOpportunity:
      "Pivoting to § 3.156(c) newly associated service records, § 3.156(b) Lang 1-year VAMC abatement, missing SOCs, or § 3.344 void reductions completely bypasses George's CUE bar.",
    temporalTrap:
      "Never file a one-shot Board CUE motion (§ 20.1409(c)) premised solely on a post-decision judicial invalidation (Wagner, Barry, Laska) without an independent extant-law error.",
    href: "/cfr/38-cfr-20.1400-20.1411",
    isQuarantined: false,
  },
  {
    id: "tl-2024-cod-312",
    dateLabel: "June 25, 2024",
    isoDate: "2024-06-25",
    publicationDate: "2024-04-26",
    eraId: "era-2019-present",
    track: "Part 3 Adjudication",
    title: "38 C.F.R. § 3.12 Character of Discharge Overhaul & Compelling Circumstances",
    shortTitle: "§ 3.12 Discharge Rule",
    primaryCitation: "89 FR 32361 (pub. Apr. 26, 2024, eff. June 25, 2024)",
    veteranSummary:
      "Expanded 'compelling circumstances' hardship/service-trauma exceptions for Other Than Honorable discharges, narrowed willful-and-persistent misconduct, and repealed former § 3.12(d)(5).",
    practitionerSummary:
      "89 FR 32361 (pub. 2024-04-26, eff. 2024-06-25) created § 3.12(e) compelling-circumstances mitigation across § 3.12(c)(6) AWOL and § 3.12(d)(2) moral-turpitude/persistent misconduct.",
    retroactiveOpportunity:
      "Previously barred OTH claimants can reapply via Supplemental Claim under liberalized § 3.12(e), alongside timeless § 3.354(b) insanity and § 3.13(c) prior-enlistment shields.",
    temporalTrap:
      "60-day FR publication gap (published Apr. 26, 2024, effective June 25, 2024): liberalizing § 3.114(a) awards under revised § 3.12 cannot precede June 25, 2024.",
    href: "/cfr/38-cfr-3.12a-l",
    isQuarantined: false,
  },
  {
    id: "tl-2026-waiver-1963b",
    dateLabel: "Jan 26, 2026",
    isoDate: "2026-01-26",
    publicationDate: "2025-11-26",
    eraId: "era-2019-present",
    track: "Part 3 Adjudication",
    title: "38 C.F.R. § 1.963(b) 1-Year Overpayment Debt Waiver Window Conformed to Statute",
    shortTitle: "§ 1.963(b) 1-Yr Waiver",
    primaryCitation: "90 FR 54234 (pub. Nov. 26, 2025, eff. Jan. 26, 2026); 38 U.S.C. § 5302(a)",
    veteranSummary:
      "Updated VA's debt-waiver regulation to match Congress's 1-year window (up from 180 days) to request waiver of a VA benefit overpayment under Equity and Good Conscience.",
    practitionerSummary:
      "90 FR 54234 (eff. Jan. 26, 2026) conformed § 1.963(b) to Pub. L. 117-328, Div. U, § 254 (enacted Dec. 29, 2022), while retaining mail-delay receipt extensions.",
    retroactiveOpportunity:
      "Statutory-lag audit: between Dec. 29, 2022 and Jan. 25, 2026, 38 U.S.C. § 5302(a)'s 1-year deadline legally superseded the lagging 180-day CFR text.",
    temporalTrap:
      "Debt notices issued prior to Dec. 29, 2022 were subject to the historical 180-day window unless postal/VA mail delay postponed actual receipt.",
    href: "/cfr/38-cfr-1.963a-b",
    isQuarantined: false,
  },
];

function cleanMatrixCell(raw: string): string {
  return stripMarkdownSyntax(
    raw
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\\(\$)/g, "$1")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function buildQuarantinedWatchlist(
  cfrRecords: ReadonlyArray<CfrVersionRecord>,
): QuarantinedTimelineWatchItem[] {
  const byVersionId = new Map(cfrRecords.map((r) => [r.version_id, r]));
  const aq72Rec = byVersionId.get("38-cfr-4.97-2022-2024-proposed-respiratory");
  const aq73Rec = byVersionId.get("38-cfr-4.124a-2024-proposed-neurological");
  const ifr91Rec = byVersionId.get("38-cfr-4.10-2026-rescinded-ifr");

  return [
    {
      id: "watch-rin-2900-aq72",
      identifier: "RIN 2900-AQ72",
      federalRegisterCitation:
        aq72Rec?.federal_register_citation ??
        "87 FR 8474 (Feb. 15, 2022 NPRM) & 89 FR 74162 (Sept. 12, 2024 SNPRM)",
      noticeDate: aq72Rec?.publication_date ?? "2022-02-15",
      rescindedDate: null,
      statusKind: "proposed",
      statusBadge: "Proposed — Not Enacted Law",
      targetCfr: "38 C.F.R. §§ 4.87 & 4.96–4.97 (DC 6260 Tinnitus & DC 6847 Sleep Apnea)",
      title:
        "Unfinalized ENT, Tinnitus & Respiratory / Sleep Apnea Proposed Rule (RIN 2900-AQ72)",
      veteranSummary:
        "Proposed eliminating standalone 10% tinnitus ratings and restricting 50% CPAP sleep apnea ratings, plus a Sept. 2024 supplemental proposal adding DC 6605 constrictive bronchiolitis. Proposed only—NOT enacted law.",
      practitionerSummary:
        "Quarantined NPRM (87 FR 8474) & SNPRM (89 FR 74162) under RIN 2900-AQ72. Remains unfinalized as of late 2026 and must never be cited as enacted Part 4 criteria.",
      activeLawBaseline:
        "Enacted DC 6260 (10% recurrent tinnitus) and DC 6847 (50% when requires use of breathing assistance device such as CPAP) remain active governing law.",
      auditGuardrail:
        "Verify whether a C&P opinion or rating narrative prematurely applies proposed RIN 2900-AQ72 CPAP treatment-efficacy tests rather than enacted DC 6847.",
      href: "/cfr/38-cfr-4.96-4.97",
      isQuarantined: true,
    },
    {
      id: "watch-rin-2900-aq82",
      identifier: "RIN 2900-AQ82",
      federalRegisterCitation: "87 FR 8498 (Feb. 15, 2022 NPRM)",
      noticeDate: "2022-02-15",
      rescindedDate: null,
      statusKind: "proposed",
      statusBadge: "Proposed — Not Enacted Law",
      targetCfr: "38 C.F.R. §§ 4.125–4.130 (Mental Disorders General Rating Formula)",
      title:
        "Unfinalized Five-Domain Mental Disorders Rating Proposal (RIN 2900-AQ82)",
      veteranSummary:
        "Proposed replacing the current 0/10/30/50/70/100% mental health rating formula with a five-domain functional scoring matrix. Proposed only—NOT enacted law.",
      practitionerSummary:
        "Quarantined NPRM published Feb. 15, 2022 (87 FR 8498, RIN 2900-AQ82) proposing domain-based § 4.130 criteria and removal of the 0% mental tier. Remains proposed and nonbinding.",
      activeLawBaseline:
        "The Aug. 4, 2014 DSM-5 General Rating Formula for Mental Disorders (0/10/30/50/70/100% under 38 C.F.R. § 4.130) remains active governing law.",
      auditGuardrail:
        "Never cite proposed RIN 2900-AQ82 domain tiers in current appeals or historical CUE motions.",
      href: "/cfr/38-cfr-4.130",
      isQuarantined: true,
    },
    {
      id: "watch-rin-2900-aq73",
      identifier: "RIN 2900-AQ73",
      federalRegisterCitation:
        aq73Rec?.federal_register_citation ?? "89 FR 88917 (Nov. 12, 2024 NPRM)",
      noticeDate: aq73Rec?.publication_date ?? "2024-11-12",
      rescindedDate: null,
      statusKind: "proposed",
      statusBadge: "Proposed — Not Enacted Law",
      targetCfr: "38 C.F.R. §§ 4.120–4.124a (Neurological Conditions & Peripheral Nerves)",
      title:
        "Unfinalized Neurological, Peripheral Neuropathy & Migraine Proposal (RIN 2900-AQ73)",
      veteranSummary:
        "Proposed changing how peripheral nerve conditions, migraines, and seizure disorders are graded under §§ 4.120–4.124a. Proposed only—NOT enacted law.",
      practitionerSummary:
        "Quarantined NPRM published Nov. 12, 2024 (89 FR 88917, RIN 2900-AQ73) proposing MRC muscle-strength neuropathy grading and consolidation of neuritis/neuralgia codes. Unfinalized.",
      activeLawBaseline:
        "Existing § 4.124a peripheral nerve paralysis/neuritis/neuralgia tiers, DC 8100 Migraines (50% very frequent completely prostrating & prolonged attacks), and DC 8045 TBI remain active law.",
      auditGuardrail:
        "Ensure radiculopathy and peripheral nerve ratings apply enacted § 4.124a mild/moderate/moderately severe/severe incomplete paralysis standards.",
      href: "/cfr/38-cfr-4.124a-dc-8045",
      isQuarantined: true,
    },
    {
      id: "watch-rin-2900-ar96",
      identifier: "RIN 2900-AR96",
      federalRegisterCitation: "89 FR 97404 (Dec. 6, 2024 NPRM)",
      noticeDate: "2024-12-06",
      rescindedDate: null,
      statusKind: "proposed",
      statusBadge: "Proposed — Not Enacted Law",
      targetCfr: "38 C.F.R. Part 71 (PCAFC Family Caregiver Program)",
      title:
        "Unfinalized Family Caregiver Program (PCAFC) Proposed Amendments (RIN 2900-AR96)",
      veteranSummary:
        "Proposed revising Program of Comprehensive Assistance for Family Caregivers (PCAFC) eligibility and reassessment criteria. Proposed only—NOT enacted law.",
      practitionerSummary:
        "Quarantined NPRM published Dec. 6, 2024 (89 FR 97404, RIN 2900-AR96) proposing amendments to 38 C.F.R. Part 71; remains unfinalized (note legacy cohort extension at 90 FR 46477).",
      activeLawBaseline:
        "Enacted 38 C.F.R. Part 71 (as construed in Veteran Warriors and Beaudette v. McDonough Board/CAVC reviewability, with legacy cohort extended through Sept. 30, 2028) governs.",
      auditGuardrail:
        "PCAFC denials and revocations are appealable to the Board and CAVC under Beaudette v. McDonough (2024); never apply unfinalized RIN 2900-AR96 drafts.",
      href: "/cfr/38-cfr-part-71-17.4000-17.4020c",
      isQuarantined: true,
    },
    {
      id: "watch-90-fr-46542",
      identifier: "90 FR 46542",
      federalRegisterCitation: "90 FR 46542 (Sept. 29, 2025 Proposed Rule)",
      noticeDate: "2025-09-29",
      rescindedDate: null,
      statusKind: "proposed",
      statusBadge: "Proposed — Not Enacted Law",
      targetCfr: "38 C.F.R. § 4.118 (DC 7804 Painful or Unstable Scars)",
      title:
        "Unfinalized DC 7804 Objective-Pain-on-Examination Scar Proposal (90 FR 46542)",
      veteranSummary:
        "Proposed requiring objective clinical signs of pain during an exam for painful scar ratings under DC 7804. Proposed only—NOT enacted law.",
      practitionerSummary:
        "Quarantined proposed rule published Sept. 29, 2025 (90 FR 46542) proposing to restrict DC 7804 painful-scar evaluations. Remains unfinalized and nonbinding.",
      activeLawBaseline:
        "Enacted Aug. 13, 2018 38 C.F.R. § 4.118 (DC 7804 count-based 10/20/30% painful/unstable scar schedule, including credible reported scar pain) remains active law.",
      auditGuardrail:
        "Flag any rating decision refusing DC 7804 compensable evaluation solely for lack of clinician-provoked wincing where credible painful scar symptoms are of record.",
      href: "/cfr/38-cfr-4.118/2025-09-29",
      isQuarantined: true,
    },
    {
      id: "watch-rin-2900-as39",
      identifier: "RIN 2900-AS39",
      federalRegisterCitation: "90 FR 47266 (Oct. 1, 2025 NPRM)",
      noticeDate: "2025-10-01",
      rescindedDate: null,
      statusKind: "proposed",
      statusBadge: "Proposed — Not Enacted Law",
      targetCfr: "38 C.F.R. § 4.116 (DC 7629 Endometriosis)",
      title:
        "Unfinalized DC 7629 Endometriosis Diagnostic Substantiation Proposal (RIN 2900-AS39)",
      veteranSummary:
        "Proposed removing the surgical laparoscopy requirement for confirming endometriosis under DC 7629. Proposed only—NOT yet enacted as a final rule.",
      practitionerSummary:
        "Quarantined NPRM published Oct. 1, 2025 (90 FR 47266, RIN 2900-AS39) proposing to eliminate laparoscopy substantiation in § 4.116 DC 7629. Remains proposed / not finalized.",
      activeLawBaseline:
        "Enacted May 13, 2018 38 C.F.R. § 4.116 governs current schedular DC 7629 adjudications (while secondary/analogous symptom pathways remain available).",
      auditGuardrail:
        "Do not represent proposed RIN 2900-AS39 as already enacted; monitor Federal Register finalization for § 3.114 liberalizing effective-date triggers.",
      href: "/cfr/38-cfr-4.116",
      isQuarantined: true,
    },
    {
      id: "watch-91-fr-7118",
      identifier: "91 FR 7118",
      federalRegisterCitation:
        ifr91Rec?.federal_register_citation ??
        "91 FR 7118 (Feb. 17, 2026 IFR), formally rescinded at 91 FR 9712 (Feb. 27, 2026)",
      noticeDate: ifr91Rec?.publication_date ?? "2026-02-17",
      rescindedDate: "2026-02-27",
      statusKind: "rescinded",
      statusBadge: "Rescinded IFR — Not Active Law",
      targetCfr: "38 C.F.R. § 4.10 (Ameliorative Medication Effects)",
      title:
        "Rescinded 10-Day § 4.10 Medication Interim Final Rule (91 FR 7118 -> Rescinded 91 FR 9712)",
      veteranSummary:
        "VA issued an Interim Final Rule on Feb. 17, 2026 trying to lower ratings when medication eases symptoms, then formally rescinded it 10 days later on Feb. 27, 2026.",
      practitionerSummary:
        "Issued Feb. 17, 2026 (91 FR 7118) attempting to displace Ingram v. Collins, 38 Vet. App. 130 (2025) / Jones v. Shinseki, and formally rescinded Feb. 27, 2026 (91 FR 9712).",
      activeLawBaseline:
        "Under Jones v. Shinseki and Ingram v. Collins, VA cannot discount baseline disability severity for medication relief unless the specific Diagnostic Code explicitly mentions medication.",
      auditGuardrail:
        "High-priority audit target: inspect any rating decision or C&P exam issued around Feb. 17–27, 2026 (or before/after) that discounted medicated musculoskeletal or systemic symptoms.",
      href: "/cfr/modules/38-cfr-4.1-4.31-general-policy-snapshots",
      isQuarantined: true,
    },
  ];
}

export function parseMasterChronologicalMatrix(
  markdown: string,
  cfrRecords: ReadonlyArray<CfrVersionRecord>,
  checkedAsOf = "2026-11-17",
): CompiledTimelineBundle {
  const content = markdown.replace(/^---[\s\S]*?---\r?\n/, "");
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const events: TimelineChronologyEvent[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith("|") || trimmed.includes(":---")) continue;
    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map(cleanMatrixCell);
    if (cells.length < 5) continue;
    if (/^Era\s*\/\s*Date$/i.test(cells[0] ?? "")) continue;

    const [dateCell, changeCell, authorityCell, whatChangedCell] = cells as [
      string,
      string,
      string,
      string,
      string,
    ];

    // Quarantined / rescinded rows in master-chronological-matrix.md are routed strictly to quarantinedWatchlist
    if (
      /Feb 17–27, 2026|Through Late 2026|91 FR 7118|AQ72/i.test(
        `${dateCell} ${changeCell} ${authorityCell}`,
      )
    ) {
      continue;
    }

    const matched = MATRIX_ROW_ENRICHMENTS.find((m) =>
      dateCell.startsWith(m.matchDatePrefix),
    );
    if (!matched) continue;

    const eraId = resolveEraIdForDate(matched.spec.isoDate) ?? "era-2019-present";

    events.push({
      id: matched.spec.id,
      dateLabel: dateCell,
      isoDate: matched.spec.isoDate,
      publicationDate: matched.spec.publicationDate,
      eraId,
      track: matched.spec.track,
      title: changeCell,
      shortTitle: matched.spec.shortTitle,
      primaryCitation: authorityCell,
      veteranSummary: matched.spec.veteranSummary,
      practitionerSummary: whatChangedCell,
      retroactiveOpportunity: matched.spec.retroactiveOpportunity,
      temporalTrap: matched.spec.temporalTrap,
      href: matched.spec.href,
      isQuarantined: false,
    });
  }

  for (const supp of SUPPLEMENTAL_CFR_EVENTS) {
    if (!events.some((e) => e.id === supp.id)) {
      events.push(supp);
    }
  }

  events.sort((a, b) => a.isoDate.localeCompare(b.isoDate) || a.id.localeCompare(b.id));

  return {
    checkedAsOf,
    events,
    quarantinedWatchlist: buildQuarantinedWatchlist(cfrRecords),
  };
}
