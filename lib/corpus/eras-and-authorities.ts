import { classifyPrecedentNonprecedential } from "./types";
import type {
  AuthorityTier,
  AuthorityValidityStatus,
  HistoricalEraId,
  PrecedentCitedModule,
  PrecedentEntry,
  PrecedentEraCaution,
  UpstreamIndexEntry,
} from "./types";

export interface HistoricalEraMatrixRow {
  statutorySystem: string;
  claimInitiationRule: string;
  appealPipeline: string;
  recordPossessionRule: string;
  representationRule: string;
}

export interface HistoricalEraSpec {
  eraId: HistoricalEraId;
  eraNumber: 1 | 2 | 3 | 4 | 5;
  upstreamModuleId: string;
  shortLabel: string;
  fullTitle: string;
  windowLabel: string;
  startDate: string;
  endDate: string | null;
  representativeDate: string;
  proportionWeight: number;
  eraLensRoute: string;
  watershedBoundaryWhy: string;
  veteranOverview: string;
  practitionerOverview: string;
  matrix: HistoricalEraMatrixRow;
  signatureForms: ReadonlyArray<{
    code: string;
    meaning: string;
  }>;
  keyOpportunity: string;
  keyTrap: string;
}

export interface WatershedTimelineTick {
  id: string;
  yearLabel: string;
  isoDate: string;
  eraId: HistoricalEraId;
  shortTitle: string;
  track: "Statute" | "Part 3" | "VASRD" | "Precedent";
  veteranSummary: string;
  practitionerSummary: string;
  href: string;
}

export interface EraDefinitionTerm {
  id: string;
  term: string;
  eraWindow: string;
  relatedEraIds: ReadonlyArray<HistoricalEraId>;
  veteranDefinition: string;
  practitionerDefinition: string;
  relatedHref: string;
}

export const ALL_HISTORICAL_ERA_IDS: ReadonlyArray<HistoricalEraId> = [
  "era-1945-1961",
  "era-1962-1988",
  "era-1988-2000",
  "era-2000-2018",
  "era-2019-present",
];

export const HISTORICAL_ERAS: ReadonlyArray<HistoricalEraSpec> = [
  {
    eraId: "era-1945-1961",
    eraNumber: 1,
    upstreamModuleId: "era-1945-1961-post-wwii-korean",
    shortLabel: "Post-WWII & Korea",
    fullTitle: "Era 1: Post-WWII & Korean War Demobilization Era (1945–1961)",
    windowLabel: "1945–1961",
    startDate: "1945-04-01",
    endDate: "1961-12-31",
    representativeDate: "1954-06-15",
    proportionWeight: 1.08,
    eraLensRoute: "/eras/1945-1961-post-wwii-korean-era",
    watershedBoundaryWhy:
      "Opens with the 1945 VASRD (effective April 1, 1946) and WWII separation claims; closes December 31, 1961 just before the 1962 effective-date and mandatory Statement of the Case reforms.",
    veteranOverview:
      "Separating WWII and Korean War service members typically filed handwritten VA Form 8-526 applications at discharge and received one-page carbon-copy rating sheets with no written explanation and older 'Veterans' Regulation' law citations.",
    practitionerOverview:
      "Governed pre-1959 by Veterans' Regulation No. 1(a) and from Jan. 1, 1959 by Pub. L. 85-857 three-digit Title 38 sections (§ 310, § 314), with statutory grandfathering under 38 C.F.R. § 3.953 for Dec. 31, 1957 / Dec. 31, 1958 awards and § 3.157(b) hospital-report claims codified Feb. 24, 1961.",
    matrix: {
      statutorySystem:
        "Vet. Reg. No. 1(a) (through Dec. 31, 1958); Pub. L. 85-857 §§ 310, 314, 3010 (Jan. 1, 1959+)",
      claimInitiationRule:
        "Broad written informal claims; discharge VA Form 8-526; § 3.157(b) hospital reports codified Feb. 24, 1961",
      appealPipeline:
        "1-year direct Form P-9 / Form 1-9 appeal to BVA (no Statement of the Case procedure yet); zero federal court review",
      recordPossessionRule:
        "Physical C-file record only for CUE (pre-Bell cutoff); 1973 NPRC fire reconstruction eligible for § 3.156(c)",
      representationRule:
        "$10 statutory attorney fee ceiling; VSO or pro se representation",
    },
    signatureForms: [
      {
        code: "VA Form 8-526",
        meaning:
          "Discharge-center compensation application—every handwritten condition listed is a formal claim.",
      },
      {
        code: "AGO Form 53-55 / DD 214",
        meaning:
          "WWII Enlisted Separation Report and Korean-era DD Form 214 (introduced in 1950).",
      },
      {
        code: "VA Form P-9 / 1-9",
        meaning: "Pre-1963 direct appeal form prior to Statement of the Case procedures.",
      },
    ],
    keyOpportunity:
      "Through-and-through gunshot or shrapnel wounds rated 0%/10% solely as surface scars (DC 7800–7805) despite separation physicals in the C-file documenting deep Muscle Group I–XXIII injuries (38 C.F.R. § 4.56), plus 1973 NPRC fire records later located under § 3.156(c)(1)(iii).",
    keyTrap:
      "Pre-July 21, 1992 decisions are not charged with Bell constructive possession of unassociated VAMC records in CUE (VAOPGCPREC 12-95), and post-decision judicial reinterpretations are barred in CUE under 38 C.F.R. § 20.1403(e) (George v. McDonough).",
  },
  {
    eraId: "era-1962-1988",
    eraNumber: 2,
    upstreamModuleId: "era-1962-1988-pre-vjra-closed",
    shortLabel: "Pre-VJRA Closed",
    fullTitle: "Era 2: Pre-VJRA Closed Era & Vietnam Adjudications (1962–1988)",
    windowLabel: "1962–1988",
    startDate: "1962-01-01",
    endDate: "1988-11-17",
    representativeDate: "1974-08-12",
    proportionWeight: 1.25,
    eraLensRoute: "/eras/1962-1988-pre-vjra-closed-era",
    watershedBoundaryWhy:
      "Spans the 1962 effective-date/SOC overhaul (Pub. L. 87-825 & Pub. L. 87-666) and Vietnam adjudications until the day before Congress enacted the Veterans' Judicial Review Act on November 18, 1988.",
    veteranOverview:
      "VA decisions could not be appealed to any court, yet strong procedural protections applied: after January 1, 1963, a written disagreement kept an appeal open until VA mailed a Statement of the Case, and VA hospital reports for already service-connected conditions counted automatically as claims for increase.",
    practitionerOverview:
      "Insulated by former 38 U.S.C. § 211(a) and the $10 attorney fee bar (§ 3404(c)), but governed by mandatory SOC issuance (Pub. L. 87-666, eff. Jan. 1, 1963; Tablazon), automatic § 3.157(b) VAMC increase claims, April 11, 1980 addition of PTSD (DC 9411), and Sept. 25, 1985 Nehmer class protection (§ 3.816).",
    matrix: {
      statutorySystem:
        "1958 Title 38 numbering (§§ 310, 314, 3010, 4005); former § 211(a) judicial review bar",
      claimInitiationRule:
        "Broad § 3.155 informal written claims + automatic § 3.157(b) VAMC admission/exam claims for SC conditions",
      appealPipeline:
        "1-year written NOD -> mandatory VA Statement of the Case (SOC) -> Form 1-9 / Form 9 to BVA",
      recordPossessionRule:
        "Physical C-file record only for CUE (pre-Bell); Vietnam inpatient clinical packets stored separately at NPRC (§ 3.156(c))",
      representationRule:
        "$10 attorney fee limit under former 38 U.S.C. § 3404(c)",
    },
    signatureForms: [
      {
        code: "VA Form 21-4138",
        meaning:
          "Statement in Support of Claim—frequently served as an informal claim or timely written NOD.",
      },
      {
        code: "VA Form 10-1000 / 10-7131",
        meaning:
          "VAMC inpatient discharge summary and RO-VAMC exchange request triggering § 3.157(b) or address notice.",
      },
      {
        code: "DD Form 722 vs. Inpatient Chart",
        meaning:
          "Thin outpatient jacket often pulled without separate field/evac hospital surgical packets (§ 3.156(c)).",
      },
    ],
    keyOpportunity:
      "Unperfected post-1962 NODs where VA never issued an SOC (Tablazon), dormant § 3.157(b) VAMC reports on 0%+ SC conditions, separate Vietnam surgical hospital packets (§ 3.156(c)), post-Sept. 25, 1985 Nehmer claims (§ 3.816), and void stabilized reductions (§ 3.344; Brown).",
    keyTrap:
      "Unassociated VAMC clinical notes cannot support CUE against pre-July 21, 1992 decisions (VAOPGCPREC 12-95)—screen them as unadjudicated § 3.157(b) informal claims instead.",
  },
  {
    eraId: "era-1988-2000",
    eraNumber: 3,
    upstreamModuleId: "era-1988-2000-vjra-revolution",
    shortLabel: "VJRA Revolution",
    fullTitle: "Era 3: VJRA Judicial Review & Well-Grounded Claim Era (1988–2000)",
    windowLabel: "1988–2000",
    startDate: "1988-11-18",
    endDate: "2000-11-08",
    representativeDate: "1994-05-10",
    proportionWeight: 1.05,
    eraLensRoute: "/eras/1988-2000-vjra-revolution",
    watershedBoundaryWhy:
      "Begins November 18, 1988 with the Veterans' Judicial Review Act creating court review and the 'well-grounded claim' hurdle; ends November 8, 2000 on the eve of the Veterans Claims Assistance Act (VCAA).",
    veteranOverview:
      "Independent court review and written decision reasons began, and after July 21, 1992 VA hospital charts counted as part of your file—but until November 2000 VA dismissed thousands of claims as 'not well grounded' without scheduling a medical exam.",
    practitionerOverview:
      "Created COVA/CAVC, BVA reasons-or-bases (§ 7104(d)(1)), and Feb. 1, 1990 RO notice (§ 5104); renumbered Title 38 in May/Aug. 1991 (Pub. L. 102-40 & 102-83); established July 21, 1992 Bell constructive possession and the Nov. 21, 1997 Board CUE Act (§§ 5109A, 7111), while enforcing former § 5107(a) well-groundedness.",
    matrix: {
      statutorySystem:
        "Two-step May/Aug. 1991 Title 38 renumbering (§ 310 -> § 1110; § 3010 -> § 5110; § 4004 -> § 7104)",
      claimInitiationRule:
        "Informal claims & § 3.157(b) active, BUT original/reopened claims gated by former § 5107(a) 'well-grounded claim' burden",
      appealPipeline:
        "Legacy NOD -> SOC -> Form 9 -> BVA -> 120-day CAVC judicial appeal + statutory Board CUE enacted Nov. 21, 1997",
      recordPossessionRule:
        "Split era: physical C-file pre-July 21, 1992; full Bell constructive VAMC possession on/after July 21, 1992",
      representationRule:
        "Paid attorney representation permitted only after a first final BVA decision (if NOD >= Nov. 18, 1988)",
    },
    signatureForms: [
      {
        code: "VA Form 9",
        meaning: "Substantive Appeal to BVA following issuance of an SOC/SSOC.",
      },
      {
        code: "VistA / CAPRI VAMC Notes",
        meaning:
          "Constructively before VA adjudicators on/after July 21, 1992 under Bell v. Derwinski & VAOPGCPREC 12-95.",
      },
      {
        code: "1996–1997 FR Preambles",
        meaning:
          "Check pub-vs.-eff dates on § 4.130 Mental Health (eff. Nov. 7, 1996) and § 4.56 Muscles (eff. July 3, 1997).",
      },
    ],
    keyOpportunity:
      "Post-July 21, 1992 CUEs overlooking existing VAMC clinical findings, post-1992 1-year VAMC treatment abating finality under § 3.156(b) (Lang), and § 3.156(c) service records sweeping aside 1990s 'not well grounded' denials.",
    keyTrap:
      "Never attack a 1990–2000 'not well grounded' denial as CUE for lack of a C&P exam—both pre-VCAA Grottveit law and Cook v. Principi foreclose CUE.",
  },
  {
    eraId: "era-2000-2018",
    eraNumber: 4,
    upstreamModuleId: "era-2000-2018-vcaa-legacy-modernization",
    shortLabel: "VCAA Legacy",
    fullTitle: "Era 4: VCAA Duty-to-Assist & Legacy Modernization Era (2000–2018)",
    windowLabel: "2000–2018",
    startDate: "2000-11-09",
    endDate: "2019-02-18",
    representativeDate: "2010-03-15",
    proportionWeight: 1.15,
    eraLensRoute: "/eras/2000-2018-vcaa-legacy-modernization",
    watershedBoundaryWhy:
      "Begins November 9, 2000 when the VCAA abolished 'well-grounded' dismissals and mandated medical nexus assistance; ends February 18, 2019 on the final day before full Appeals Modernization Act (AMA) implementation.",
    veteranOverview:
      "VA became legally required to help gather records and schedule medical exams, major spine, scar, TBI, and Agent Orange updates took effect, and on March 24, 2015 VA ended informal claims in favor of standardized forms and Intent to File.",
    practitionerOverview:
      "Governed by VCAA §§ 5103/5103A (McLendon exam threshold), Oct. 6, 2006 § 3.156(c) codification, Oct. 23, 2008 TBI & Scars overhauls, 2010 PTSD stressor & Nehmer IHD/Parkinson's/leukemia rules, the March 24, 2015 repeal of informal/§ 3.157(b) claims (Shea vs. Sellers), and § 3.156(b) 1-year VAMC finality abatement (Beraud/Lang).",
    matrix: {
      statutorySystem:
        "Modern Title 38 + VCAA §§ 5103, 5103A + Oct. 10, 2008 § 5121A survivor substitution",
      claimInitiationRule:
        "Split at Mar. 24, 2015: informal/§ 3.157(b) before Mar. 24, 2015 (Shea); mandatory 21-0966 ITF & 21-526EZ on/after Mar. 24, 2015 (Sellers)",
      appealPipeline:
        "Legacy NOD -> DRO / SOC -> Form 9 -> BVA (plus 2017–2018 RAMP opt-in pilot); Legacy implicit denial (Deshotel) active",
      recordPossessionRule:
        "Full Bell constructive possession + § 3.156(b) 1-year post-decision VAMC constructive receipt abating RO finality (Lang)",
      representationRule:
        "Post-June 20, 2007 NODs unlock paid representation right after an initial RO decision (Pub. L. 109-461)",
    },
    signatureForms: [
      {
        code: "VA Form 21-0966",
        meaning:
          "Intent to File introduced March 24, 2015 holding an effective-date placeholder for 1 year.",
      },
      {
        code: "VA Form 21-526EZ",
        meaning:
          "Mandatory standardized disability claim form from March 24, 2015 forward (Sellers v. Wilkie).",
      },
      {
        code: "VA Form 21-0845 / 21-22a",
        meaning:
          "Post-2007 early-stage attorney/agent fee representation after initial AOJ decision.",
      },
    ],
    keyOpportunity:
      "Legacy RO denials or low ratings from 2000–2018 kept non-final under 38 C.F.R. § 3.156(b) (Lang) whenever VAMC clinical notes addressed the condition within 1 year after the decision—unlocking modern precedents (Bradley, Barry) without triggering George's CUE bar.",
    keyTrap:
      "VAMC treatment notes and non-form statements dated on or after March 24, 2015 never initiate a claim without a standardized form or Intent to File (79 FR 57660).",
  },
  {
    eraId: "era-2019-present",
    eraNumber: 5,
    upstreamModuleId: "era-2019-2026-ama-pact-modern",
    shortLabel: "AMA & PACT",
    fullTitle: "Era 5: AMA Three-Lane System, PACT Act & Modern Precedent Era (2019–Present)",
    windowLabel: "2019–Present",
    startDate: "2019-02-19",
    endDate: null,
    representativeDate: "2024-07-01",
    proportionWeight: 1.12,
    eraLensRoute: "/eras/2019-2026-ama-pact-modern-era",
    watershedBoundaryWhy:
      "Begins February 19, 2019 when the Appeals Modernization Act (AMA) took full effect—replacing Legacy appeals with three continuous-pursuit lanes and strict § 5104(b) explicit decision notice rules.",
    veteranOverview:
      "Modern VA decisions offer three 1-year review lanes (Supplemental Claim, Higher-Level Review, or Board Appeal), expanded PACT Act toxic-exposure presumptions, updated 2024 discharge rules, and protection against silent 'implicit denials.'",
    practitionerOverview:
      "Governed by 38 C.F.R. § 3.2500 continuous pursuit, PACT Act (Pub. L. 117-168; §§ 1116A, 1120, 1168, 1305), June 25, 2024 § 3.12 COD overhaul, George (2022), Arellano (2023), Barry multi-step SMC (2024), Soto uncapped CRSC (2025), Ingram & rescinded Feb. 2026 § 4.10 IFR, and Hamill / Cash (Feb. 2026).",
    matrix: {
      statutorySystem:
        "AMA §§ 5104(b), 5104C, 5108, 5110(a)(2), 7113(c) + PACT Act §§ 1116A, 1119, 1120, 1168, 1305",
      claimInitiationRule:
        "Standardized forms (21-526EZ, 20-0995, 20-0996, 10182) + 21-0966 ITF; silent AMA decisions leave omitted claims pending (Hamill)",
      appealPipeline:
        "Three 1-year AMA lanes: Supplemental (new & relevant), HLR (closed de novo), or BVA Direct / Evidence / Hearing",
      recordPossessionRule:
        "Closed evidentiary windows per AMA lane (§ 7113; Cash v. Collins in-between possession rule); § 3.156(c) still overrides finality",
      representationRule:
        "Paid accredited representation across all post-initial AMA Supplemental, HLR, Board, and CAVC lanes",
    },
    signatureForms: [
      {
        code: "VA Form 20-0995",
        meaning:
          "AMA Supplemental Claim—requires new and relevant evidence (§ 3.156(d)) and preserves date if filed within 1 year of RO or BVA denial.",
      },
      {
        code: "VA Form 20-0996",
        meaning:
          "AMA Higher-Level Review—closed-record senior review within 1 year of an AOJ decision.",
      },
      {
        code: "VA Form 10182",
        meaning:
          "AMA Board Notice of Disagreement electing Direct, Evidence Submission, or Hearing docket.",
      },
    ],
    keyOpportunity:
      "Any claimed or reasonably raised issue silently omitted from an AMA decision (>= Feb. 19, 2019) remains legally pending under Hamill v. Collins (2026), plus PACT Act § 3.114 / § 3.33 effective-date audits, Barry SMC steps, and Soto CRSC arrears.",
    keyTrap:
      "38 C.F.R. § 3.2500 continuous pursuit stops at the Board—filing a 20-0995 Supplemental Claim after a CAVC affirmance forfeits the original effective date; meanwhile RIN 2900-AQ72, RIN 2900-AQ82, and 90 FR 46542 remain unfinalized proposed rules (not enacted law).",
  },
];

export const WATERSHED_TIMELINE_TICKS: ReadonlyArray<WatershedTimelineTick> = [
  {
    id: "tick-1946",
    yearLabel: "1946",
    isoDate: "1946-04-01",
    eraId: "era-1945-1961",
    shortTitle: "1945 VASRD Eff.",
    track: "VASRD",
    veteranSummary: "Baseline 4-digit Diagnostic Code schedule took effect April 1, 1946.",
    practitionerSummary: "1945 VASRD effective Apr. 1, 1946 (38 C.F.R. § 3.952; republished 29 FR 6718).",
    href: "/cfr/38-cfr-4.56/1946-04-01",
  },
  {
    id: "tick-1959",
    yearLabel: "1959",
    isoDate: "1959-01-01",
    eraId: "era-1945-1961",
    shortTitle: "Title 38 Codified",
    track: "Statute",
    veteranSummary: "Congress codified Title 38 U.S.C. and grandfathered 1957–1958 awards.",
    practitionerSummary: "Pub. L. 85-857 eff. Jan. 1, 1959 (§§ 310, 314, 3010; § 3.953 savings protection).",
    href: "/crosswalk",
  },
  {
    id: "tick-1963",
    yearLabel: "1963",
    isoDate: "1963-01-01",
    eraId: "era-1962-1988",
    shortTitle: "Mandatory SOC",
    track: "Statute",
    veteranSummary: "Written disagreement required VA to issue a Statement of the Case or appeal stayed open.",
    practitionerSummary: "Pub. L. 87-666 eff. Jan. 1, 1963: unperfected NOD missing an SOC prevents finality (Tablazon).",
    href: "/docs/procedural-vehicles-piercing-finality",
  },
  {
    id: "tick-1985",
    yearLabel: "1985",
    isoDate: "1985-09-25",
    eraId: "era-1962-1988",
    shortTitle: "Nehmer Cutoff",
    track: "Precedent",
    veteranSummary: "Agent Orange claims filed or pending from Sept. 25, 1985 qualify for Nehmer retroactivity.",
    practitionerSummary: "Sept. 25, 1985 Nehmer class date codified in 38 C.F.R. § 3.816 overriding finality.",
    href: "/playbooks/06-nehmer-herbicide-presumptions-crsc",
  },
  {
    id: "tick-1988",
    yearLabel: "1988",
    isoDate: "1988-11-18",
    eraId: "era-1988-2000",
    shortTitle: "VJRA Court Act",
    track: "Statute",
    veteranSummary: "Created independent court review and written Board reasons on Nov. 18, 1988.",
    practitionerSummary: "Pub. L. 100-687 (Nov. 18, 1988): created COVA/CAVC, § 7104(d)(1), and former § 5107(a).",
    href: "/eras/1988-2000-vjra-revolution",
  },
  {
    id: "tick-1992",
    yearLabel: "1992",
    isoDate: "1992-07-21",
    eraId: "era-1988-2000",
    shortTitle: "Bell Record Rule",
    track: "Precedent",
    veteranSummary: "From July 21, 1992 forward, existing VA hospital records count as part of your file.",
    practitionerSummary: "Bell v. Derwinski (July 21, 1992) & VAOPGCPREC 12-95 constructive-possession CUE cutoff.",
    href: "/docs/vaopgcprec-index",
  },
  {
    id: "tick-1997",
    yearLabel: "1997",
    isoDate: "1997-11-21",
    eraId: "era-1988-2000",
    shortTitle: "§ 4.56 & CUE Act",
    track: "Statute",
    veteranSummary: "July 3, 1997 muscle-injury update and Nov. 21, 1997 statutory Board CUE review.",
    practitionerSummary: "62 FR 30235 eff. July 3, 1997 (§ 4.56) + Pub. L. 105-111 eff. Nov. 21, 1997 (§§ 5109A, 7111).",
    href: "/cfr/38-cfr-4.56",
  },
  {
    id: "tick-2000",
    yearLabel: "2000",
    isoDate: "2000-11-09",
    eraId: "era-2000-2018",
    shortTitle: "VCAA Enacted",
    track: "Statute",
    veteranSummary: "Ended 'not well grounded' dismissals and mandated VA duty-to-assist exams.",
    practitionerSummary: "Pub. L. 106-475 (Nov. 9, 2000): enacted §§ 5103, 5103A and repealed well-grounded gate.",
    href: "/eras/2000-2018-vcaa-legacy-modernization",
  },
  {
    id: "tick-2006",
    yearLabel: "2006",
    isoDate: "2006-10-06",
    eraId: "era-2000-2018",
    shortTitle: "§ 3.156(c) Rule",
    track: "Part 3",
    veteranSummary: "Clarified retroactive effective dates when missing military records are found.",
    practitionerSummary: "71 FR 52455 (pub. Sept. 6, 2006, eff. Oct. 6, 2006) codifying § 3.156(c)(1)–(4).",
    href: "/cfr/38-cfr-3.156c",
  },
  {
    id: "tick-2008",
    yearLabel: "2008",
    isoDate: "2008-10-23",
    eraId: "era-2000-2018",
    shortTitle: "Scars & TBI",
    track: "VASRD",
    veteranSummary: "Oct. 23, 2008 overhaul counting painful scars (DC 7804) and 10-facet TBI ratings.",
    practitionerSummary: "73 FR 54708 & 73 FR 54693 eff. Oct. 23, 2008 (DC 7800/7804 & DC 8045) + § 5121A substitution.",
    href: "/cfr/38-cfr-4.118",
  },
  {
    id: "tick-2015",
    yearLabel: "2015",
    isoDate: "2015-03-24",
    eraId: "era-2000-2018",
    shortTitle: "Form Wall",
    track: "Part 3",
    veteranSummary: "March 24, 2015 ended informal letter/hospital claims in favor of 21-0966 & 21-526EZ.",
    practitionerSummary: "79 FR 57660 eff. Mar. 24, 2015: repealed §§ 3.155(a) informal & 3.157(b) hospital claims.",
    href: "/reference/forms-and-codes",
  },
  {
    id: "tick-2019",
    yearLabel: "2019",
    isoDate: "2019-02-19",
    eraId: "era-2019-present",
    shortTitle: "AMA Effective",
    track: "Statute",
    veteranSummary: "Feb. 19, 2019 launched Supplemental, Higher-Level Review, and Board lanes.",
    practitionerSummary: "Pub. L. 115-55 & 38 C.F.R. § 3.2500 eff. Feb. 19, 2019 (explicit § 5104(b) notice under Hamill).",
    href: "/eras/2019-2026-ama-pact-modern-era",
  },
  {
    id: "tick-2022-26",
    yearLabel: "2022–26",
    isoDate: "2025-06-15",
    eraId: "era-2019-present",
    shortTitle: "PACT, George & Hamill",
    track: "Precedent",
    veteranSummary: "PACT Act presumptions, 2024 COD rule, Supreme Court George & Soto, and 2026 Hamill.",
    practitionerSummary: "George (2022), PACT Act (2022), Barry & § 3.12 COD (2024), Soto (2025), Hamill & Cash (2026).",
    href: "/cases",
  },
];

export const ERA_DEFINITIONS_GLOSSARY: ReadonlyArray<EraDefinitionTerm> = [
  {
    id: "def-vet-reg-crosswalk",
    term: "Three-Era Title 38 Numbering (Vet. Reg. 1(a) -> 1958 Code -> 1991 Renumbering)",
    eraWindow: "1933–1958 · 1959–1991 · 1991–Present",
    relatedEraIds: ["era-1945-1961", "era-1962-1988", "era-1988-2000"],
    veteranDefinition:
      "Why old VA rating letters show unfamiliar law numbers: before 1959 VA used WWII 'Veterans' Regulations,' from 1959 to 1991 Congress used three- and four-digit Title 38 numbers (like § 310 or § 3010), and in 1991 Congress renumbered them to today's four-digit sections (§ 1110 and § 5110).",
    practitionerDefinition:
      "Pre-Jan. 1, 1959 ratings cite Veterans' Regulation No. 1(a); Pub. L. 85-857 (eff. Jan. 1, 1959) enacted positive-law Title 38 (§§ 310, 314, 3010, 4004); Pub. L. 102-40 (May 7, 1991) and Pub. L. 102-83 (Aug. 6, 1991) renumbered administrative/appellate and benefit chapters without substantive change.",
    relatedHref: "/crosswalk",
  },
  {
    id: "def-splendid-isolation",
    term: "'Splendid Isolation' & The Pre-1988 Judicial Review Bar (Former 38 U.S.C. § 211(a))",
    eraWindow: "1933 – Nov. 17, 1988",
    relatedEraIds: ["era-1945-1961", "era-1962-1988"],
    veteranDefinition:
      "Before November 18, 1988, VA benefit denials could not be appealed to any federal court, and lawyers were barred from charging more than $10—which is why no Veterans Law court cases exist with pre-1989 decision dates, even though modern courts now review errors in those older files.",
    practitionerDefinition:
      "Former 38 U.S.C. § 211(a) insulated VA benefits determinations from judicial review and former § 3404(c) capped attorney fees at $10 until Pub. L. 100-687 (VJRA, Nov. 18, 1988) created COVA/CAVC under 38 U.S.C. ch. 72.",
    relatedHref: "/eras/1962-1988-pre-vjra-closed-era",
  },
  {
    id: "def-mandatory-soc",
    term: "Unperfected NOD & Mandatory Statement of the Case (Tablazon Doctrine)",
    eraWindow: "Jan. 1, 1963 – Feb. 18, 2019 (Legacy Appeals)",
    relatedEraIds: ["era-1962-1988", "era-1988-2000", "era-2000-2018"],
    veteranDefinition:
      "Under Legacy rules starting January 1, 1963, if you wrote to VA within one year disagreeing with a decision and VA never mailed back a formal 'Statement of the Case' (SOC) explaining the law and facts, the clock to finish your appeal never started and the claim stayed open.",
    practitionerDefinition:
      "Under Pub. L. 87-666 (eff. Jan. 1, 1963; former 38 U.S.C. § 4005 / § 7105(d)) and Tablazon v. Brown, 8 Vet. App. 359 (1995), VA's failure to issue an SOC (or required SSOC) following a timely written NOD prevents a Legacy RO decision from becoming final across decades.",
    relatedHref: "/docs/procedural-vehicles-piercing-finality",
  },
  {
    id: "def-3157b-informal",
    term: "Automatic Hospital/Exam Informal Claims (Former 38 C.F.R. § 3.157(b)) vs. March 24, 2015 Form Wall",
    eraWindow: "Feb. 24, 1961 – Mar. 23, 2015 vs. Mar. 24, 2015 – Present",
    relatedEraIds: ["era-1945-1961", "era-1962-1988", "era-1988-2000", "era-2000-2018", "era-2019-present"],
    veteranDefinition:
      "For over 50 years (until March 24, 2015), if you were already service-connected (even at 0%) and went to a VA hospital or VA clinic where records showed your condition worsened, that medical report automatically counted as a claim for a higher rating. On March 24, 2015, VA ended this rule and required official forms.",
    practitionerDefinition:
      "Former 38 C.F.R. § 3.157(b) (26 FR 1571, Feb. 24, 1961) treated VAMC/military admission or outpatient exam reports for an already-SC disability as informal increase claims, and former § 3.155(a) recognized written informal claims pointing to medical records (Shea v. Wilkie). Prospective repeal at 79 FR 57660 (eff. Mar. 24, 2015) mandates 21-0966 ITF / 21-526EZ forms (Sellers v. Wilkie).",
    relatedHref: "/playbooks/04-unadjudicated-tdiu-informal-claims-smc",
  },
  {
    id: "def-well-grounded",
    term: "The 'Well-Grounded Claim' Gatekeeper (Former 38 U.S.C. § 5107(a))",
    eraWindow: "Nov. 18, 1988 – Nov. 8, 2000",
    relatedEraIds: ["era-1988-2000", "era-2000-2018"],
    veteranDefinition:
      "During the 1990s, VA could legally refuse to schedule a medical exam and dismiss your claim as 'not well grounded' if you did not already have a doctor's statement connecting your illness to military service. Congress repealed that hurdle on November 9, 2000.",
    practitionerDefinition:
      "Under Grottveit v. Brown, 5 Vet. App. 91 (1993) and Caluza v. Brown, 7 Vet. App. 498 (1995), former § 5107(a) required plausible medical nexus evidence before VA's duty to assist attached. Repealed Nov. 9, 2000 by VCAA (Pub. L. 106-475); pre-2000 exam omissions cannot support CUE (Cook v. Principi).",
    relatedHref: "/eras/1988-2000-vjra-revolution",
  },
  {
    id: "def-bell-possession",
    term: "Bell Constructive Possession Cutoff (July 21, 1992) & Legacy § 3.156(b) 1-Year Abatement",
    eraWindow: "Pre-July 21, 1992 vs. July 21, 1992 – Feb. 18, 2019",
    relatedEraIds: ["era-1945-1961", "era-1962-1988", "era-1988-2000", "era-2000-2018"],
    veteranDefinition:
      "Starting July 21, 1992, VA medical center records count as being in VA's hands even if they weren't copied into your claims folder—and for Legacy rating decisions before February 19, 2019, VA hospital care within 1 year after a decision could keep that claim legally open.",
    practitionerDefinition:
      "Bell v. Derwinski, 2 Vet. App. 611 (July 21, 1992) and VAOPGCPREC 12-95 impute constructive knowledge of VA-generated records strictly for CUE challenges to AOJ/Board decisions rendered >= July 21, 1992. Under Beraud (2014) and Lang v. Wilkie (2020), VAMC records generated within 1 year after a Legacy RO decision abate finality under 38 C.F.R. § 3.156(b) unless VA determined whether they were new and material.",
    relatedHref: "/docs/vaopgcprec-index",
  },
  {
    id: "def-ama-hamill",
    term: "AMA Continuous Pursuit (§ 3.2500) & Elimination of Implicit Denial (Hamill v. Collins)",
    eraWindow: "Feb. 19, 2019 – Present",
    relatedEraIds: ["era-2000-2018", "era-2019-present"],
    veteranDefinition:
      "In the modern post-2019 AMA system, filing a Supplemental Claim, Higher-Level Review, or Board Appeal within 1 year of each VA or Board decision protects your original effective date—and if an AMA decision forgets to mention one of your claimed conditions, that condition stays open instead of being silently denied.",
    practitionerDefinition:
      "38 C.F.R. § 3.2500 preserves effective dates across timely 1-year AOJ/Board lane transitions (stopping at CAVC affirmances per § 5110(a)(2)). Under Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026), 38 U.S.C. § 5104(b) eliminates implicit denial for AMA decisions (>= Feb. 19, 2019), whereas Legacy (< Feb. 19, 2019) decisions remain subject to Deshotel/Adams/Hampton.",
    relatedHref: "/eras/2019-2026-ama-pact-modern-era",
  },
  {
    id: "def-george-3156c",
    term: "George v. McDonough (§ 20.1403(e) CUE Limit) vs. Open Reconsideration (§ 3.156(c))",
    eraWindow: "Applies Across All 5 Eras (1945–Present)",
    relatedEraIds: [
      "era-1945-1961",
      "era-1962-1988",
      "era-1988-2000",
      "era-2000-2018",
      "era-2019-present",
    ],
    veteranDefinition:
      "If a court changes how a VA regulation is interpreted years later, you cannot use that new interpretation to prove Clear and Unmistakable Error (CUE) in an old final decision—but if your old claim stayed open or missing military service records are added under 38 C.F.R. § 3.156(c), today's favorable court rulings do apply.",
    practitionerDefinition:
      "Under George v. McDonough, 596 U.S. 740 (2022), VAOPGCPREC 25-95, and 38 C.F.R. § 20.1403(e), faithful application of a regulation or binding VAOPGCPREC extant on the decision date defeats CUE even if later invalidated (e.g., Bradley, Barry, Wagner). Unlocking direct merits via § 3.156(c) service records, § 3.156(b) Lang abatement, missing SOCs, or § 3.344 void reductions bypasses § 20.1403(e).",
    relatedHref: "/cfr/38-cfr-3.156c",
  },
];

export function resolveEraIdForDate(
  isoDate: string | null | undefined,
): HistoricalEraId | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }
  if (isoDate <= "1961-12-31") return "era-1945-1961";
  if (isoDate <= "1988-11-17") return "era-1962-1988";
  if (isoDate <= "2000-11-08") return "era-1988-2000";
  if (isoDate <= "2019-02-18") return "era-2000-2018";
  return "era-2019-present";
}

export function getHistoricalEraById(
  eraId: HistoricalEraId | null | undefined,
): HistoricalEraSpec | null {
  if (!eraId) return null;
  return HISTORICAL_ERAS.find((e) => e.eraId === eraId) ?? null;
}

interface ParsedVaopgcprecRow {
  opinionKey: string;
  canonicalCitation: string;
  issuanceDateLabel: string | null;
  issuanceYear: number | null;
  federalRegisterCitation: string | null;
  coreHolding: string;
  litigationUtility: string;
  validityStatus: AuthorityValidityStatus;
  validityLabel: string;
  domainIds: string[];
}

interface ParsedJudicialAuditRow {
  matchPrefixes: string[];
  canonicalCitation: string;
  hasJudicialCitation: boolean;
  shortTitle: string;
  verificationLabel: string;
  scopeNotes: string;
}

function cleanCitatorCellText(
  raw: string,
  titleByFileName?: ReadonlyMap<string, string>,
): string {
  return raw
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_full, label: string, target: string) => {
        const trimmedLabel = label.trim();
        const targetBase = target.split("#")[0]?.split("/").pop() ?? "";
        if (/\.md$/i.test(trimmedLabel)) {
          return (
            titleByFileName?.get(trimmedLabel.toLowerCase()) ??
            titleByFileName?.get(targetBase.toLowerCase()) ??
            trimmedLabel
              .replace(/\.md$/i, "")
              .replace(/^\d{2}-/, "")
              .replace(/-/g, " ")
          );
        }
        return trimmedLabel;
      },
    )
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*+/g, "")
    .replace(/\bcue-and-open-claim\b/gi, "CUE and open-claim posture")
    .replace(
      /\bopen-claim-only-george-restricted\b/gi,
      "open-claim merits posture (subject to § 20.1403(e) in CUE)",
    )
    .replace(
      new RegExp("\\bCUE" + "[-\\s]+safe\\b", "gi"),
      "supports CUE on undisputed facts",
    )
    .replace(/\\(\$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeVaopgcprecKey(text: string): string | null {
  const m = text.match(/\bVAOPGCPREC\s+(\d{1,3})-(\d{2,4})\b/i);
  if (!m) return null;
  const num = Number.parseInt(m[1]!, 10);
  const rawYr = Number.parseInt(m[2]!, 10);
  const fullYear = rawYr < 100 ? (rawYr >= 80 ? 1900 + rawYr : 2000 + rawYr) : rawYr;
  return `vaopgcprec:${num}-${fullYear}`;
}

export function extractIssuanceYear(citation: string): number | null {
  const vaop = citation.match(/\bVAOPGCPREC\s+\d{1,3}-(\d{2,4})\b/i);
  if (vaop) {
    const rawYr = Number.parseInt(vaop[1]!, 10);
    return rawYr < 100 ? (rawYr >= 80 ? 1900 + rawYr : 2000 + rawYr) : rawYr;
  }
  const parenYears = Array.from(citation.matchAll(/\((?:[^()]*?\b)?(19\d{2}|20\d{2})\)/g));
  if (parenYears.length > 0) {
    const firstParen = parenYears[0]?.[1];
    if (firstParen) return Number.parseInt(firstParen, 10);
  }
  const bareYear = citation.match(/\b(19\d{2}|20\d{2})\b/);
  return bareYear?.[1] ? Number.parseInt(bareYear[1], 10) : null;
}

export function mapYearToIssuanceEraId(year: number | null): HistoricalEraId | null {
  if (year === null) return null;
  if (year <= 1961) return "era-1945-1961";
  if (year <= 1987) return "era-1962-1988";
  if (year <= 2000) return "era-1988-2000";
  if (year <= 2018) return "era-2000-2018";
  return "era-2019-present";
}

function classifyValidityFromRaw(rawStatus: string): {
  status: AuthorityValidityStatus;
  label: string;
} {
  const cleaned = cleanCitatorCellText(rawStatus);
  if (/\bWithdrawn\b/i.test(cleaned)) {
    return { status: "withdrawn", label: cleaned || "Withdrawn by VA OGC — Do Not Cite as Active Law" };
  }
  if (/\bInvalidated\b|\bOverruled\b|\bOverturned\b|\bSuperseded\b|\bAbrogated\b/i.test(cleaned)) {
    return {
      status: "invalidated-or-superseded",
      label: cleaned || "Invalidated or Superseded — Historical Trap Watchlist",
    };
  }
  if (/\bModified\b|\bClarified\b|\bExpanded\b/i.test(cleaned)) {
    return { status: "active-modified", label: cleaned };
  }
  return { status: "active-precedent", label: cleaned || "Active Binding Authority" };
}

const DOMAIN_HEADING_MAP: ReadonlyArray<{ pattern: RegExp; domains: string[] }> = [
  { pattern: /Domain I\b/i, domains: ["finality-and-cue"] },
  { pattern: /Domain II\b/i, domains: ["vasrd-rating-schedule", "disability-compensation"] },
  { pattern: /Domain III\b/i, domains: ["smc-ancillary"] },
  { pattern: /Domain IV\b/i, domains: ["tdiu-unemployability"] },
  { pattern: /Domain V\b/i, domains: ["disability-compensation"] },
  { pattern: /Domain VI\b/i, domains: ["disability-compensation"] },
  { pattern: /Domain VII\b/i, domains: ["character-of-discharge"] },
  { pattern: /Domain VIII\b/i, domains: ["toxic-exposure"] },
  { pattern: /Domain IX\b/i, domains: ["survivors-dic-accrued"] },
  { pattern: /Domain X\b/i, domains: ["effective-dates-offsets", "pension-fiduciary-debt"] },
];

export function parseVaopgcprecDigestMarkdown(
  markdown: string,
  titleByFileName?: ReadonlyMap<string, string>,
): ParsedVaopgcprecRow[] {
  const rows: ParsedVaopgcprecRow[] = [];
  const byKey = new Map<string, ParsedVaopgcprecRow>();
  const lines = markdown.split(/\r?\n/);

  let inQuarantineSection = false;
  let activeDomains: string[] = ["finality-and-cue"];

  for (const line of lines) {
    if (/^##\s+4\.\s+Quarantine Watchlist/i.test(line)) {
      inQuarantineSection = true;
      continue;
    }
    if (/^###\s+[A-Z]\.\s+Domain\b/i.test(line)) {
      for (const mapping of DOMAIN_HEADING_MAP) {
        if (mapping.pattern.test(line)) {
          activeDomains = mapping.domains;
          break;
        }
      }
      continue;
    }
    if (!line.startsWith("|")) continue;
    const cols = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cols.length < 4) continue;
    if (cols[0]?.includes("---") || /Opinion No\.|Quarantined Opinion/i.test(cols[0] ?? "")) {
      continue;
    }

    if (!inQuarantineSection && cols.length >= 5) {
      const col0 = cleanCitatorCellText(cols[0] ?? "", titleByFileName);
      const opKey = normalizeVaopgcprecKey(col0);
      if (!opKey) continue;
      const dateMatch = col0.match(/\(([^()]+)\)/);
      const frCol = cleanCitatorCellText(cols[1] ?? "", titleByFileName);
      const holdingCol = cleanCitatorCellText(cols[2] ?? "", titleByFileName);
      const utilityCol = cleanCitatorCellText(cols[3] ?? "", titleByFileName);
      const validity = classifyValidityFromRaw(cols[4] ?? "");
      const opLabelMatch = col0.match(/\bVAOPGCPREC\s+\d{1,3}-\d{2,4}(?:\s*&\s*\d{1,3}-\d{2,4})?/i);
      const opLabel = opLabelMatch?.[0] ?? col0;
      const canonicalCitation = frCol
        ? `${opLabel} (${frCol})`
        : opLabel;

      const parsed: ParsedVaopgcprecRow = {
        opinionKey: opKey,
        canonicalCitation,
        issuanceDateLabel: dateMatch?.[1] ?? null,
        issuanceYear: extractIssuanceYear(opLabel),
        federalRegisterCitation: frCol || null,
        coreHolding: holdingCol,
        litigationUtility: utilityCol,
        validityStatus: validity.status,
        validityLabel: validity.label,
        domainIds: [...activeDomains],
      };
      byKey.set(opKey, parsed);
      rows.push(parsed);
    } else if (inQuarantineSection && cols.length >= 4) {
      const col0 = cleanCitatorCellText(cols[0] ?? "", titleByFileName);
      const opKey = normalizeVaopgcprecKey(col0);
      if (!opKey || byKey.has(opKey)) continue;
      const subjectCol = cleanCitatorCellText(cols[1] ?? "", titleByFileName);
      const withdrawalCol = cleanCitatorCellText(cols[2] ?? "", titleByFileName);
      const replacementCol = cleanCitatorCellText(cols[3] ?? "", titleByFileName);
      const validity = classifyValidityFromRaw(withdrawalCol);
      const opLabelMatch = col0.match(/\bVAOPGCPREC\s+\d{1,3}-\d{2,4}/i);
      const opLabel = opLabelMatch?.[0] ?? col0;

      const parsed: ParsedVaopgcprecRow = {
        opinionKey: opKey,
        canonicalCitation: opLabel,
        issuanceDateLabel: null,
        issuanceYear: extractIssuanceYear(opLabel),
        federalRegisterCitation: null,
        coreHolding: `${subjectCol}. ${withdrawalCol}`.replace(/\.\./g, "."),
        litigationUtility: `Quarantined — Active Replacement Rule: ${replacementCol}`,
        validityStatus:
          validity.status === "active-precedent"
            ? "withdrawn"
            : validity.status,
        validityLabel: withdrawalCol,
        domainIds: ["finality-and-cue"],
      };
      byKey.set(opKey, parsed);
      rows.push(parsed);
    }
  }

  return rows;
}

export function parseAuthorityVerificationLogMarkdown(
  markdown: string,
  titleByFileName?: ReadonlyMap<string, string>,
): ParsedJudicialAuditRow[] {
  const rows: ParsedJudicialAuditRow[] = [];
  const lines = markdown.split(/\r?\n/);
  let inAuditTable = false;

  for (const line of lines) {
    if (/^##\s+3\.\s+Master Authority Verification/i.test(line)) {
      inAuditTable = true;
      continue;
    }
    if (!inAuditTable || !line.startsWith("|")) continue;
    const cols = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cols.length < 3) continue;
    if (
      cols[0]?.includes("---") ||
      /^Authority$/i.test(cleanCitatorCellText(cols[0] ?? "", titleByFileName))
    ) {
      continue;
    }

    const shortTitle = cleanCitatorCellText(cols[0] ?? "", titleByFileName);
    if (shortTitle.includes(",")) {
      // Skip multi-topic Epic synthesis rows (lines 122–150) whose backticks span multiple cases/statutes
      continue;
    }
    const verificationLabel = cleanCitatorCellText(cols[1] ?? "", titleByFileName);
    const rawCol2 = (cols[2] ?? "").trim();
    const leadingBacktick = rawCol2.match(/^`([^`]+)`/)?.[1] ?? "";
    const judicialBacktick =
      /\b(?:\d+\s+(?:U\.S\.|F\.2d|F\.3d|F\.4th|F\.\s*App['’]x|Vet\.\s*App\.|F\.\s*Supp\.)|No\.\s*\d{2}-\d{3,5}\s*\((?:Fed\.\s*Cir\.|Vet\.\s*App\.))/i.test(
        leadingBacktick,
      )
        ? leadingBacktick
        : null;
    const scopeNotes = cleanCitatorCellText(rawCol2, titleByFileName);

    const prefixes = shortTitle
      .split(/&|\/|\band\b/i)
      .map((s) =>
        s
          .replace(/\([^)]*\)/g, "")
          .replace(/VAOPGCPREC.*$/i, "")
          .replace(/§.*$/i, "")
          .trim(),
      )
      .filter((s) => s.length >= 6 && /\bv\.(?:\s|$)/i.test(s));

    if (prefixes.length === 0) continue;

    rows.push({
      matchPrefixes: prefixes,
      canonicalCitation: judicialBacktick
        ? `${prefixes[0]}, ${judicialBacktick}`
        : shortTitle,
      hasJudicialCitation: Boolean(judicialBacktick),
      shortTitle,
      verificationLabel,
      scopeNotes,
    });
  }

  return rows;
}

interface CuratedAuthorityEraRule {
  match: RegExp;
  shortTitle?: string;
  eraGovernanceScope: "era-specific" | "cross-era";
  applicableDecisionEras: HistoricalEraId[];
  cautions?: PrecedentEraCaution[];
  veteranPlainSummary?: string;
}

const CURATED_AUTHORITY_ERA_RULES: ReadonlyArray<CuratedAuthorityEraRule> = [
  {
    match: /\bHamill v\. Collins\b/i,
    shortTitle: "Hamill v. Collins (Fed. Cir. 2026)",
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: ["era-2019-present"],
    cautions: [
      {
        eraId: "era-1945-1961",
        caution:
          "AMA-Only Rule (>= Feb. 19, 2019): Hamill's elimination of implicit denial under 38 U.S.C. § 5104(b) does NOT apply to 1945–1961 Legacy decisions (governed by Deshotel/Adams).",
      },
      {
        eraId: "era-1962-1988",
        caution:
          "AMA-Only Rule (>= Feb. 19, 2019): Hamill's § 5104(b) explicit-denial rule does NOT apply to 1962–1988 Legacy decisions.",
      },
      {
        eraId: "era-1988-2000",
        caution:
          "AMA-Only Rule (>= Feb. 19, 2019): Hamill's § 5104(b) explicit-denial rule does NOT apply to 1988–2000 Legacy decisions.",
      },
      {
        eraId: "era-2000-2018",
        caution:
          "AMA-Only Rule (>= Feb. 19, 2019): Pre-Feb. 19, 2019 Legacy decisions remain subject to Deshotel/Adams/Hampton implicit-denial analysis.",
      },
    ],
    veteranPlainSummary:
      "Holds that in modern AMA decisions (Feb. 19, 2019 or later), if VA forgets to address one of your claimed conditions in the decision notice, that claim was never denied and remains legally open.",
  },
  {
    match: /\bCash v\. Collins\b/i,
    shortTitle: "Cash v. Collins (Fed. Cir. 2026)",
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: ["era-2019-present"],
    cautions: [
      {
        eraId: "era-2000-2018",
        caution:
          "AMA-Only Rule (>= Feb. 19, 2019): Governs 38 U.S.C. § 7113(c) AMA Board NOD evidence windows rather than Legacy open-record appeals.",
      },
    ],
    veteranPlainSummary:
      "Requires the Board in an AMA appeal to consider probative evidence already in VA's possession when clearly identified on your Board appeal form (VA Form 10182), without forcing you to mail another copy.",
  },
  {
    match: /\bBell v\. Derwinski\b|\bVAOPGCPREC 12-95\b/i,
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: ["era-1988-2000", "era-2000-2018", "era-2019-present"],
    cautions: [
      {
        eraId: "era-1945-1961",
        caution:
          "Pre-July 21, 1992 CUE Cutoff (VAOPGCPREC 12-95): Bell constructive possession of unassociated VAMC medical records is BARRED in CUE motions challenging 1945–1961 decisions.",
      },
      {
        eraId: "era-1962-1988",
        caution:
          "Pre-July 21, 1992 CUE Cutoff (VAOPGCPREC 12-95): Bell constructive possession of VAMC records not in the paper C-file is BARRED in CUE motions challenging 1962–1988 decisions (check former § 3.157(b) informal claims instead).",
      },
    ],
    veteranPlainSummary:
      "Establishes the July 21, 1992 cutoff: for VA decisions issued on or after July 21, 1992, VA hospital records existing at that time count as part of your file even if VA hadn't copied them into your claims folder.",
  },
  {
    match: /\bLang v\. Wilkie\b|\bBeraud v\. McDonald\b/i,
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: ["era-1988-2000", "era-2000-2018"],
    cautions: [
      {
        eraId: "era-1945-1961",
        caution:
          "Requires Post-July 21, 1992 Constructive VAMC Receipt: Constructive VAMC receipt under Lang rests on Bell (>= July 21, 1992); for pre-1992 VAMC reports, check whether records entered VA custody or triggered former § 3.157(b).",
      },
      {
        eraId: "era-1962-1988",
        caution:
          "Pre-Bell Distinction: Constructive VAMC receipt under Lang applies post-July 21, 1992; for 1962–1988 VAMC reports, audit physical receipt or automatic former § 3.157(b) hospital-report claims.",
      },
      {
        eraId: "era-2019-present",
        caution:
          "Legacy RO Decisions Only (< Feb. 19, 2019): 38 C.F.R. § 3.156(b) governs Legacy pending-appeal windows; post-Feb. 19, 2019 AMA decisions require timely § 3.2500 lane elections.",
      },
    ],
    veteranPlainSummary:
      "For Legacy Regional Office decisions issued between July 1992 and February 18, 2019, relevant VA Medical Center care within 1 year AFTER the decision kept your claim legally open unless VA formally evaluated whether those records were new and material.",
  },
  {
    match: /\bShea v\. Wilkie\b/i,
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: [
      "era-1945-1961",
      "era-1962-1988",
      "era-1988-2000",
      "era-2000-2018",
    ],
    cautions: [
      {
        eraId: "era-2019-present",
        caution:
          "Pre-March 24, 2015 Informal Claims Only: Shea construes former 38 C.F.R. § 3.155(a) (repealed Mar. 24, 2015); post-2015 standardized forms are governed by Sellers v. Wilkie.",
      },
    ],
    veteranPlainSummary:
      "Protects pre-March 24, 2015 informal claims that pointed to medical records diagnosing an additional condition, even if you did not know the exact medical name.",
  },
  {
    match: /\bSellers v\. Wilkie\b/i,
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: ["era-2000-2018", "era-2019-present"],
    veteranPlainSummary:
      "Governs standardized VA Form 21-526EZ applications filed on or after March 24, 2015, requiring at least a minimal description of the symptoms or condition claimed on the form itself.",
  },
  {
    match: /\bDeshotel v\. Nicholson\b|\bHampton v\. McDonough\b|\bSteele v\. Collins\b|\bAdams v\. Shinseki\b/i,
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: [
      "era-1945-1961",
      "era-1962-1988",
      "era-1988-2000",
      "era-2000-2018",
    ],
    cautions: [
      {
        eraId: "era-2019-present",
        caution:
          "Displaced for AMA Decisions (>= Feb. 19, 2019): Under Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026), Legacy implicit-denial doctrine does NOT extinguish omitted claims in AMA decisions.",
      },
    ],
  },
  {
    match: /\bTablazon v\. Brown\b|\bVAOPGCPREC 9-99\b|\bFreund v\. Collins\b/i,
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: ["era-1962-1988", "era-1988-2000", "era-2000-2018"],
    veteranPlainSummary:
      "Protects Legacy appeals (1963–2019) where a Veteran timely disagreed in writing or perfected an appeal, but VA failed to issue a Statement of the Case or improperly closed the appeal in VACOLS.",
  },
  {
    match: /\bGrottveit v\. Brown\b|\bVAOPGCPREC 4-99\b/i,
    eraGovernanceScope: "era-specific",
    applicableDecisionEras: ["era-1988-2000"],
    cautions: [
      {
        eraId: "era-2000-2018",
        caution:
          "Repealed Nov. 9, 2000 by VCAA (Pub. L. 106-475): The former § 5107(a) 'well-grounded claim' threshold no longer applies to post-VCAA adjudications.",
      },
    ],
  },
  {
    match: /\bGeorge v\. McDonough\b/i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: [...ALL_HISTORICAL_ERA_IDS],
    veteranPlainSummary:
      "U.S. Supreme Court ruling holding across all historical eras that a Clear and Unmistakable Error (CUE) motion must judge a final VA decision by how the regulation was understood when issued—not a later court reinterpretation (38 C.F.R. § 20.1403(e)).",
  },
  {
    match: /\bVAOPGCPREC 25-95\b/i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: [...ALL_HISTORICAL_ERA_IDS],
    veteranPlainSummary:
      "1995 binding VA General Counsel opinion (later affirmed in principle by the U.S. Supreme Court in George v. McDonough) holding that if VA faithfully applied a regulation in force when it issued a final decision, a later court ruling invalidating that regulation cannot establish Clear and Unmistakable Error (CUE).",
  },
  {
    match: /\bEsteban v\. Brown\b/i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: [...ALL_HISTORICAL_ERA_IDS],
    veteranPlainSummary:
      "Confirmed across all 1945-VASRD eras that a single gunshot, shrapnel, or traumatic injury warrants separate combined ratings when it causes distinct functional problems—such as a painful scar, muscle damage, and nerve injury.",
  },
  {
    match: /\bVigil v\. Peake\b|\bKisor v\./i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: [...ALL_HISTORICAL_ERA_IDS],
    veteranPlainSummary:
      "Explains how newly located official military, surgical, or unit records under 38 C.F.R. § 3.156(c) require VA to reconsider an old denial from any era and award retroactive effective dates back to the original claim.",
  },
  {
    match: /\bBrown v\. Brown\b/i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: [...ALL_HISTORICAL_ERA_IDS],
    veteranPlainSummary:
      "Holds that if VA reduces a disability rating that was in effect for 5+ years without proving sustained real-world improvement across your full medical history (38 C.F.R. § 3.344), the reduction is void from the start and the higher rating must be restored.",
  },
  {
    match: /\bBarry v\. McDonough\b/i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: [...ALL_HISTORICAL_ERA_IDS],
    veteranPlainSummary:
      "Federal Circuit ruling holding that severely disabled Veterans receiving Special Monthly Compensation (SMC l–n) can earn multiple half-step or full-step increases up to SMC(o) for each additional 50% or 100% disability (applies to open/pending claims; final pre-May 2024 ratings face § 20.1403(e) CUE limits).",
  },
  {
    match: /\bSoto v\. United States\b/i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: ["era-2000-2018", "era-2019-present"],
    veteranPlainSummary:
      "Unanimous 2025 U.S. Supreme Court ruling abolishing the 6-year back-pay cap on Department of Defense Combat-Related Special Compensation (CRSC) for military retirees.",
  },
  {
    match: /\bIngram v\. Collins\b/i,
    eraGovernanceScope: "cross-era",
    applicableDecisionEras: [...ALL_HISTORICAL_ERA_IDS],
    veteranPlainSummary:
      "Confirms VA cannot lower your disability rating merely because medication reduces your symptoms unless the specific rating code mentions medication (VA's reactive February 17, 2026 rule at 91 FR 7118 was rescinded February 27, 2026 at 91 FR 9712).",
  },
];

function computeOverlappingErasForWindow(
  effectiveFrom: string,
  effectiveTo: string | null,
): HistoricalEraId[] {
  const toBound = !effectiveTo || effectiveTo === "present" ? "9999-12-31" : effectiveTo;
  const fromBound = effectiveFrom || "1945-04-01";
  const matched: HistoricalEraId[] = [];

  for (const era of HISTORICAL_ERAS) {
    const eraStart = era.startDate;
    const eraEnd = era.endDate ?? "9999-12-31";
    if (fromBound <= eraEnd && toBound >= eraStart) {
      matched.push(era.eraId);
    }
  }
  return matched.length > 0 ? matched : [...ALL_HISTORICAL_ERA_IDS];
}

function classifyAuthorityTier(
  citation: string,
  isVaopgcprec: boolean,
  isRule30a: boolean,
  isFedCirNonprec: boolean,
  validityStatus: AuthorityValidityStatus,
): AuthorityTier {
  if (isVaopgcprec) {
    return validityStatus === "withdrawn" ||
      validityStatus === "invalidated-or-superseded"
      ? "vaopgcprec-quarantined"
      : "vaopgcprec-binding";
  }
  if (isRule30a) return "cavc-nonprecedential-rule30a";
  if (isFedCirNonprec) return "fed-cir-nonprecedential";

  const primaryClause =
    citation.split(
      /,\s*(?:appeal\s+dismissed|aff['’]d|aff['’]g|rev['’]d|rev['’]g|dismissing|vacated|cert\.|reh['’]g)/i,
    )[0] ?? citation;

  if (/\b\d+\s+U\.S\.\s+\d+\b|\bS\.\s*Ct\.(?:\s|\d|$)/i.test(primaryClause)) {
    return "scotus";
  }
  const fedCirMatch = primaryClause.match(/\bFed\.\s*Cir\./i);
  const vetAppMatch = primaryClause.match(/\bVet\.\s*App\./i);
  if (fedCirMatch && vetAppMatch) {
    return (fedCirMatch.index ?? 0) <= (vetAppMatch.index ?? 0)
      ? "fed-cir"
      : "cavc-precedential";
  }
  if (fedCirMatch) {
    return "fed-cir";
  }
  if (vetAppMatch) {
    return "cavc-precedential";
  }
  if (/\b\d+\s+U\.S\.\s+\d+\b|\bS\.\s*Ct\.(?:\s|\d|$)/i.test(citation)) {
    return "scotus";
  }
  if (/\bFed\.\s*Cir\./i.test(citation)) {
    return "fed-cir";
  }
  if (/\bVet\.\s*App\./i.test(citation)) {
    return "cavc-precedential";
  }
  return "district-or-other";
}

function canonicalAuthorityDedupKey(citation: string): string {
  const vaopKey = normalizeVaopgcprecKey(citation);
  if (vaopKey) {
    if (
      /3-2014\s*&\s*4-2014/.test(citation) ||
      vaopKey === "vaopgcprec:3-2014" ||
      vaopKey === "vaopgcprec:4-2014"
    ) {
      return "vaopgcprec:3-2014-and-4-2014";
    }
    return vaopKey;
  }

  const reporterMatch = citation.match(
    /\b(\d+)\s+(U\.S\.|F\.2d|F\.3d|F\.4th|F\.\s*App['’]x|Vet\.\s*App\.|F\.\s*Supp\.(?:\s*2d|\s*3d)?)\s+(\d+)\b/i,
  );
  if (reporterMatch) {
    const vol = reporterMatch[1]!;
    const rep = reporterMatch[2]!.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const page = reporterMatch[3]!;
    return `rep:${vol}-${rep}-${page}`;
  }

  const docketMatch = citation.match(/\bNo\.\s*(\d{2}-\d{3,5})\b/i);
  if (docketMatch) {
    return `docket:${docketMatch[1]!.toLowerCase()}`;
  }

  return `raw:${citation.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function extractShortCaseTitle(citation: string, isVaopgcprec: boolean): string {
  if (isVaopgcprec) {
    const m = citation.match(/\bVAOPGCPREC\s+\d{1,3}-\d{2,4}(?:\s*&\s*\d{1,3}-\d{2,4})?/i);
    return m?.[0] ?? citation;
  }
  const idx = citation.indexOf(",");
  if (idx > 3) {
    return citation.slice(0, idx).trim();
  }
  return citation;
}

export function buildEnrichedPrecedentDirectory(params: {
  entries: UpstreamIndexEntry[];
  routeResolver: (entry: UpstreamIndexEntry) => string;
  vaopgcprecMarkdown: string;
  verificationLogMarkdown: string;
  checkedAsOf: string;
}): PrecedentEntry[] {
  const {
    entries,
    routeResolver,
    vaopgcprecMarkdown,
    verificationLogMarkdown,
    checkedAsOf,
  } = params;

  const entryById = new Map<string, UpstreamIndexEntry>();
  const titleByFileName = new Map<string, string>();
  for (const e of entries) {
    entryById.set(e.id, e);
    const fileName = e.path.replace(/\\/g, "/").split("/").pop();
    if (fileName) {
      titleByFileName.set(fileName.toLowerCase(), e.title);
    }
  }

  const vaopRows = parseVaopgcprecDigestMarkdown(
    vaopgcprecMarkdown,
    titleByFileName,
  );
  const vaopByKey = new Map<string, ParsedVaopgcprecRow>();
  for (const row of vaopRows) {
    if (/3-2014\s*&\s*4-2014/.test(row.canonicalCitation)) {
      vaopByKey.set("vaopgcprec:3-2014-and-4-2014", row);
    } else {
      vaopByKey.set(row.opinionKey, row);
    }
  }

  const judicialAuditRows = parseAuthorityVerificationLogMarkdown(
    verificationLogMarkdown,
    titleByFileName,
  );

  // Aggregate citations by canonical deduplication key so minor formatting variants merge cleanly
  const grouped = new Map<
    string,
    {
      citations: string[];
      moduleIds: Set<string>;
    }
  >();

  for (const mod of entries) {
    for (const rawCite of mod.key_precedents ?? []) {
      const trimmed = rawCite.trim();
      if (!trimmed) continue;
      const key = canonicalAuthorityDedupKey(trimmed);
      const bucket = grouped.get(key) ?? {
        citations: [],
        moduleIds: new Set<string>(),
      };
      if (!bucket.citations.includes(trimmed)) {
        bucket.citations.push(trimmed);
      }
      bucket.moduleIds.add(mod.id);
      grouped.set(key, bucket);
    }
  }

  // Ensure every digested and quarantined VAOPGCPREC row in docs/vaopgcprec-index.md is present
  for (const vRow of vaopRows) {
    const key = /3-2014\s*&\s*4-2014/.test(vRow.canonicalCitation)
      ? "vaopgcprec:3-2014-and-4-2014"
      : vRow.opinionKey;
    const bucket = grouped.get(key) ?? {
      citations: [vRow.canonicalCitation],
      moduleIds: new Set<string>(),
    };
    if (entryById.has("doctrine-vaopgcprec-master-index")) {
      bucket.moduleIds.add("doctrine-vaopgcprec-master-index");
    }
    grouped.set(key, bucket);
  }

  // Ensure every audited judicial authority with a valid reporter/docket citation in docs/authority-verification-log.md (including Rule 30(a) watchlist items like Marion v. Collins) is present
  for (const jRow of judicialAuditRows) {
    if (!jRow.hasJudicialCitation) continue;
    const key = canonicalAuthorityDedupKey(jRow.canonicalCitation);
    const bucket = grouped.get(key) ?? {
      citations: [jRow.canonicalCitation],
      moduleIds: new Set<string>(),
    };
    if (entryById.has("doctrine-authority-verification-log")) {
      bucket.moduleIds.add("doctrine-authority-verification-log");
    }
    grouped.set(key, bucket);
  }

  const ERA_MODULE_TO_ERA_ID: Record<string, HistoricalEraId> = {
    "era-1945-1961-post-wwii-korean": "era-1945-1961",
    "era-1962-1988-pre-vjra-closed": "era-1962-1988",
    "era-1988-2000-vjra-revolution": "era-1988-2000",
    "era-2000-2018-vcaa-legacy-modernization": "era-2000-2018",
    "era-2019-2026-ama-pact-modern": "era-2019-present",
  };

  const results: PrecedentEntry[] = [];
  const usedSlugs = new Set<string>();

  for (const [dedupKey, bucket] of grouped.entries()) {
    const vaopRow = vaopByKey.get(dedupKey);
    // Prefer rich VAOPGCPREC citation or fullest reporter citation (e.g. with "(en banc)")
    const bestCitation = vaopRow
      ? vaopRow.canonicalCitation
      : [...bucket.citations].sort((a, b) => {
          const aEnBanc = /\ben banc\b/i.test(a) ? 1 : 0;
          const bEnBanc = /\ben banc\b/i.test(b) ? 1 : 0;
          if (aEnBanc !== bEnBanc) return bEnBanc - aEnBanc;
          return a.length - b.length;
        })[0]!;

    const combinedRawForFlags = bucket.citations.join(" ; ");
    const nonprec = classifyPrecedentNonprecedential(combinedRawForFlags);
    const isVaopgcprec = /VAOPGCPREC/i.test(bestCitation);

    const matchedAudit = !isVaopgcprec
      ? judicialAuditRows.find((row) =>
          row.matchPrefixes.some((pref) =>
            bestCitation.toLowerCase().includes(pref.toLowerCase()),
          ),
        )
      : undefined;

    const matchedCuratedRule = CURATED_AUTHORITY_ERA_RULES.find((rule) =>
      rule.match.test(bestCitation),
    );

    const sortedModuleIds = Array.from(bucket.moduleIds).sort();
    const citedByModules: PrecedentCitedModule[] = [];
    const domainSet = new Set<string>(vaopRow?.domainIds ?? []);
    const eraLensHighlights: HistoricalEraId[] = [];
    const nonMasterEras = new Set<HistoricalEraId>();

    for (const modId of sortedModuleIds) {
      const mod = entryById.get(modId);
      if (!mod) continue;
      citedByModules.push({
        id: mod.id,
        title: mod.title,
        route: routeResolver(mod),
      });
      for (const dom of mod.practice_domains ?? []) {
        domainSet.add(dom);
      }
      const directEra = ERA_MODULE_TO_ERA_ID[mod.id];
      if (directEra && !eraLensHighlights.includes(directEra)) {
        eraLensHighlights.push(directEra);
      }
      // Exclude umbrella master-index digest modules when inferring narrow module windows
      if (
        mod.id !== "doctrine-vaopgcprec-master-index" &&
        mod.id !== "doctrine-authority-verification-log" &&
        mod.id !== "doctrine-master-chronological-matrix"
      ) {
        for (const eId of computeOverlappingErasForWindow(
          mod.effective_from,
          mod.effective_to,
        )) {
          nonMasterEras.add(eId);
        }
      }
    }

    const issuanceYear = vaopRow?.issuanceYear ?? extractIssuanceYear(bestCitation);
    const issuanceEraId = mapYearToIssuanceEraId(issuanceYear);

    let validityStatus: AuthorityValidityStatus = "active-precedent";
    let validityLabel = "Active Controlling Authority";

    if (vaopRow) {
      validityStatus = vaopRow.validityStatus;
      validityLabel = vaopRow.validityLabel;
    } else if (nonprec.isRule30a) {
      validityStatus = "nonprecedential";
      validityLabel =
        "Nonprecedential Single-Judge Memorandum Decision (CAVC Rule 30(a) — Do Not Cite as Binding Precedent)";
    } else if (nonprec.isFedCirNonprecedential) {
      validityStatus = "nonprecedential";
      validityLabel =
        "Nonprecedential Federal Circuit Disposition (Fed. Cir. R. 32.1)";
    } else if (matchedAudit) {
      validityLabel = matchedAudit.verificationLabel;
    }

    const authorityTier = classifyAuthorityTier(
      bestCitation,
      isVaopgcprec,
      nonprec.isRule30a,
      nonprec.isFedCirNonprecedential,
      validityStatus,
    );

    // Determine governing adjudication eras with zero silent guesswork
    let applicableDecisionEras: HistoricalEraId[];
    let eraGovernanceScope: "era-specific" | "cross-era";
    const eraCutoffCautions: PrecedentEraCaution[] = [
      ...(matchedCuratedRule?.cautions ?? []),
    ];

    if (matchedCuratedRule) {
      applicableDecisionEras = [...matchedCuratedRule.applicableDecisionEras];
      eraGovernanceScope = matchedCuratedRule.eraGovernanceScope;
    } else if (isVaopgcprec && issuanceEraId) {
      const startIdx = ALL_HISTORICAL_ERA_IDS.indexOf(issuanceEraId);
      if (
        validityStatus === "withdrawn" ||
        validityStatus === "invalidated-or-superseded"
      ) {
        // Quarantined opinions governed only the historical era(s) before withdrawal/invalidation
        const withdrawalYearMatch = (vaopRow?.validityLabel ?? "").match(
          /\b(19\d{2}|20\d{2})\b/,
        );
        const endEraId = withdrawalYearMatch?.[1]
          ? mapYearToIssuanceEraId(Number.parseInt(withdrawalYearMatch[1], 10))
          : issuanceEraId;
        const endIdx = endEraId
          ? Math.max(startIdx, ALL_HISTORICAL_ERA_IDS.indexOf(endEraId))
          : startIdx;
        applicableDecisionEras = ALL_HISTORICAL_ERA_IDS.slice(startIdx, endIdx + 1);
        eraGovernanceScope = "era-specific";
      } else {
        // Active binding VAOPGCPREC binds VA adjudicators from issuance date forward (38 C.F.R. § 14.507)
        applicableDecisionEras = ALL_HISTORICAL_ERA_IDS.slice(startIdx);
        eraGovernanceScope =
          applicableDecisionEras.length < ALL_HISTORICAL_ERA_IDS.length
            ? "era-specific"
            : "cross-era";
        for (const preEra of ALL_HISTORICAL_ERA_IDS.slice(0, startIdx)) {
          eraCutoffCautions.push({
            eraId: preEra,
            caution: `Issued ${vaopRow?.issuanceDateLabel ?? issuanceYear} — binds VA adjudicators prospectively from its OGC issuance date forward under 38 C.F.R. § 14.507 (cannot establish CUE before issuance unless pre-existing statutory text already compelled the result).`,
          });
        }
      }
    } else if (
      nonMasterEras.size > 0 &&
      nonMasterEras.size < ALL_HISTORICAL_ERA_IDS.length
    ) {
      applicableDecisionEras = ALL_HISTORICAL_ERA_IDS.filter((e) =>
        nonMasterEras.has(e),
      );
      eraGovernanceScope = "era-specific";
    } else {
      applicableDecisionEras = [...ALL_HISTORICAL_ERA_IDS];
      eraGovernanceScope = "cross-era";
    }

    const coreHolding =
      vaopRow?.coreHolding ?? matchedAudit?.scopeNotes ?? null;
    const litigationUtility = vaopRow?.litigationUtility ?? null;
    const shortTitle =
      matchedCuratedRule?.shortTitle ??
      extractShortCaseTitle(bestCitation, isVaopgcprec);

    const baseSlug = bestCitation
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 74);
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    results.push({
      citation: bestCitation,
      slug,
      shortTitle,
      authorityTier,
      validityStatus,
      validityLabel,
      issuanceYear,
      issuanceDateLabel: vaopRow?.issuanceDateLabel ?? null,
      federalRegisterCitation: vaopRow?.federalRegisterCitation ?? null,
      issuanceEraId,
      eraGovernanceScope,
      applicableDecisionEras,
      eraLensHighlights,
      eraCutoffCautions,
      practiceDomains: Array.from(domainSet).sort(),
      coreHolding,
      litigationUtility,
      veteranPlainSummary: matchedCuratedRule?.veteranPlainSummary ?? null,
      isCuratedLandmark: Boolean(vaopRow || matchedAudit || matchedCuratedRule),
      isNonprecedentialRule30a: nonprec.isRule30a,
      isNonprecedentialFedCir: nonprec.isFedCirNonprecedential,
      isVaopgcprec,
      citedByModuleIds: sortedModuleIds,
      citedByModules,
      checkedAsOf,
    });
  }

  return results.sort((a, b) => a.citation.localeCompare(b.citation));
}

export type EraAuthorityFilterMode = "decision-governance" | "issuance-year";

export interface FilteredAuthoritiesByEra {
  eraSpecificAuthorities: PrecedentEntry[];
  crossEraAuthorities: PrecedentEntry[];
  eraCutoffWarnings: Array<{
    entry: PrecedentEntry;
    caution: string;
  }>;
  preVjraIssuanceEmptyNote: string | null;
}

export function filterAuthoritiesForSelectedEra(params: {
  authorities: ReadonlyArray<PrecedentEntry>;
  selectedEraId: HistoricalEraId | null;
  filterMode: EraAuthorityFilterMode;
}): FilteredAuthoritiesByEra {
  const { authorities, selectedEraId, filterMode } = params;

  if (!selectedEraId) {
    return {
      eraSpecificAuthorities: [...authorities],
      crossEraAuthorities: [],
      eraCutoffWarnings: [],
      preVjraIssuanceEmptyNote: null,
    };
  }

  if (filterMode === "issuance-year") {
    const matched = authorities.filter((a) => a.issuanceEraId === selectedEraId);
    const isPreVjra =
      selectedEraId === "era-1945-1961" || selectedEraId === "era-1962-1988";
    return {
      eraSpecificAuthorities: matched,
      crossEraAuthorities: [],
      eraCutoffWarnings: [],
      preVjraIssuanceEmptyNote: isPreVjra
        ? "Historical Note: Under former 38 U.S.C. § 211(a), VA benefit decisions were insulated from federal judicial review until November 18, 1988 (VJRA), and VA General Counsel Precedent Opinions (VAOPGCPREC) began in 1989. Switch to 'Decision Era Governance' to view the post-1988 court and OGC authorities that govern audits of decisions from this era."
        : null,
    };
  }

  const eraSpecificAuthorities: PrecedentEntry[] = [];
  const crossEraAuthorities: PrecedentEntry[] = [];
  const eraCutoffWarnings: Array<{ entry: PrecedentEntry; caution: string }> = [];

  for (const auth of authorities) {
    const cautions = auth.eraCutoffCautions ?? [];
    const matchingCaution = cautions.find((c) => c.eraId === selectedEraId);
    if (matchingCaution) {
      eraCutoffWarnings.push({
        entry: auth,
        caution: matchingCaution.caution,
      });
    }

    const applicable = auth.applicableDecisionEras ?? ALL_HISTORICAL_ERA_IDS;
    if (!applicable.includes(selectedEraId)) {
      continue;
    }

    const isHighlightedInEraLens = (auth.eraLensHighlights ?? []).includes(
      selectedEraId,
    );
    if (auth.eraGovernanceScope === "era-specific" || isHighlightedInEraLens) {
      eraSpecificAuthorities.push(auth);
    } else {
      crossEraAuthorities.push(auth);
    }
  }

  return {
    eraSpecificAuthorities,
    crossEraAuthorities,
    eraCutoffWarnings,
    preVjraIssuanceEmptyNote: null,
  };
}

export interface PaginatedSlice<T> {
  items: T[];
  totalItems: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function paginateAuthorities<T>(
  items: ReadonlyArray<T>,
  requestedPage: number,
  pageSize = 25,
): PaginatedSlice<T> {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalItems = items.length;
  if (totalItems === 0) {
    return {
      items: [],
      totalItems: 0,
      pageSize: safeSize,
      currentPage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
    };
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(requestedPage)));
  const offset = (currentPage - 1) * safeSize;
  const pageItems = items.slice(offset, offset + safeSize);
  return {
    items: pageItems,
    totalItems,
    pageSize: safeSize,
    currentPage,
    totalPages,
    startIndex: offset + 1,
    endIndex: offset + pageItems.length,
  };
}
