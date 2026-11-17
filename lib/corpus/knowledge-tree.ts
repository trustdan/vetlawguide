import type { AudienceMode } from "./types";

export type TreeNodeStatus =
  | "live"
  | "summary"
  | "placeholder"
  | "quarantined"
  | "action";

export interface KnowledgeTreeNode {
  id: string;
  label: string;
  badge?: string;
  nodeStatus: TreeNodeStatus;
  edgeRelation?: string;
  description: string;
  href?: string;
  defaultExpanded?: boolean;
  children?: KnowledgeTreeNode[];
}

export function flattenKnowledgeTree(root: KnowledgeTreeNode): KnowledgeTreeNode[] {
  const out: KnowledgeTreeNode[] = [root];
  for (const child of root.children ?? []) {
    out.push(...flattenKnowledgeTree(child));
  }
  return out;
}

/**
 * Pure deterministic Dual-Mode & Decision-Date-Reactive Tree Builder (`osintframework.com` pattern):
 * - In `veteran` mode: Builds a Situation -> Record Clues -> Rules on Decision Date -> VSO/Attorney Discussion Pathways tree.
 * - In `practitioner` mode: Builds a Title 38 Law [at Decision Date] -> Statutory/Record Era -> Part 4 VASRD -> Part 3 Finality Vehicles -> Quarantined Watchlist tree.
 */
export function buildKnowledgeTree(
  mode: AudienceMode,
  decisionDate: string,
): KnowledgeTreeNode {
  if (mode === "veteran") {
    return buildVeteranPathwayTree(decisionDate);
  }
  return buildPractitionerLawTree(decisionDate);
}

function buildVeteranPathwayTree(decisionDate: string): KnowledgeTreeNode {
  // Date-reactive muscle & scar rule summaries for Veteran Mode
  const isMusclePre1946 = decisionDate < "1946-04-01";
  const isMusclePre1997 = decisionDate >= "1946-04-01" && decisionDate < "1997-07-03";
  const isMusclePubGap = decisionDate >= "1997-06-03" && decisionDate < "1997-07-03";

  const isScarPre2002 = decisionDate >= "1946-04-01" && decisionDate < "2002-08-30";
  const isScarPre2008 = decisionDate >= "1946-04-01" && decisionDate < "2008-10-23";
  const isInformalHospitalActive = decisionDate < "2015-03-24";

  const vetAppealsEraBranch: KnowledgeTreeNode =
    decisionDate < "1963-01-01"
      ? {
          id: "vet-branch-era-appeals",
          label: "Post-WWII & Korea Appeal Rules: Pre-Statement-of-the-Case Era",
          badge: "1946–1962 Era",
          nodeStatus: "live",
          edgeRelation: "era rule",
          description:
            "Before January 1, 1963, VA did not yet issue formal Statements of the Case (SOCs), and independent court review did not exist.",
          children: [
            {
              id: "vet-era-savings",
              label: "Protected Pre-1959 Compensation Awards (38 C.F.R. § 3.953)",
              badge: "Savings Shield",
              nodeStatus: "live",
              description:
                "Disability compensation in place on Dec. 31, 1957 or Dec. 31, 1958 carried special statutory savings protections against severance.",
              href: "/crosswalk",
            },
          ],
        }
      : decisionDate < "1988-11-18"
        ? {
            id: "vet-branch-era-appeals",
            label: "1963–1988 Appeal Rules: Mandatory SOCs & No Federal Court Review",
            badge: "Pre-1988 Closed Era",
            nodeStatus: "live",
            edgeRelation: "era rule",
            description:
              "Between Jan. 1, 1963 and Nov. 17, 1988, Veterans could not appeal VA denials to federal court—but if you filed a written Notice of Disagreement (NOD) and VA never sent a Statement of the Case (SOC), that appeal may still be legally open today.",
            children: [
              {
                id: "vet-era-soc-open",
                label: "Check C-File for Written NOD Missing a Statement of the Case (SOC)",
                badge: "Keeps Appeal Open",
                nodeStatus: "action",
                description:
                  "Under Pub. L. 87-666 (effective Jan. 1, 1963), VA's failure to issue an SOC after a timely NOD prevented the denial from becoming final.",
                href: "/docs/procedural-vehicles-piercing-finality",
              },
            ],
          }
        : decisionDate < "2019-02-19"
          ? {
              id: "vet-branch-era-appeals",
              label: "Legacy Appeal Rules (1988–2019): NOD → SOC → Form 9 & CAVC Review",
              badge: isInformalHospitalActive ? "Informal Claims Active" : "Post-2015 Standard Forms",
              nodeStatus: "live",
              edgeRelation: "era rule",
              description:
                "Decisions in this era used the Legacy appeal stream (NOD -> SOC -> Form 9) with independent review at the CAVC, plus VAMC constructive record rules from July 21, 1992 forward.",
              children: [
                {
                  id: "vet-era-lang",
                  label: "VA Medical Center Records Within 1 Year After Decision (Lang Rule)",
                  badge: "Legacy § 3.156(b)",
                  nodeStatus: "live",
                  description:
                    "For post-July 21, 1992 Legacy decisions, relevant VA hospital treatment notes created within 1 year after a rating decision could keep the claim open if VA never addressed them.",
                  href: "/docs/procedural-vehicles-piercing-finality",
                },
              ],
            }
          : {
              id: "vet-branch-era-appeals",
              label: "Modern AMA 3-Lane Review (2019–Present) & Explicit Notice Protection",
              badge: "AMA + PACT Era",
              nodeStatus: "live",
              edgeRelation: "era rule",
              description:
                "Post-Feb. 19, 2019 decisions use the three AMA lanes (Supplemental Claim, Higher-Level Review, Board Appeal) and require VA to address every claimed issue explicitly.",
              children: [
                {
                  id: "vet-era-hamill",
                  label: "Claimed Condition Silently Skipped in AMA Decision Letter",
                  badge: "Stays Open (§ 5104(b))",
                  nodeStatus: "live",
                  description:
                    "Under the Appeals Modernization Act (Hamill v. Collins), VA can no longer deny a claimed issue by silence—unaddressed issues remain pending.",
                  href: "/docs/procedural-vehicles-piercing-finality",
                },
              ],
            };

  return {
    id: "root-veteran",
    label: `Explore VA Pathways (${decisionDate})`,
    badge: "Click Circles to Expand",
    nodeStatus: "live",
    defaultExpanded: true,
    description:
      "Interactive situation-and-pathway tree for Veterans and Survivors. Click any filled node circle to branch deeper into paperwork clues, rules in effect on your selected Decision Date, and questions to discuss with an accredited VSO, claims agent, or attorney.",
    children: [
      vetAppealsEraBranch,
      {
        id: "vet-branch-wounds",
        label: isMusclePre1997
          ? "Gunshot, Shrapnel, or Deep Wound Rated 0%/10% Scar (1946–1997 Muscle Rules)"
          : "Gunshot, Shrapnel, or Deep Wound Rated 0%/10% Scar (Post-1997 T&T Floor)",
        badge: isMusclePubGap ? "June 1997 Gap Alert" : "Wave 1 Live",
        nodeStatus: "live",
        edgeRelation: "situation",
        description:
          "Many older rating decisions assigned only a 0% or 10% skin-scar code (7800–7805) for a bullet or shrapnel injury without evaluating underlying muscle-group damage (5301–5323) or peripheral nerve symptoms.",
        children: [
          {
            id: "vet-wounds-clues",
            label: "Paperwork Clues to Look For",
            badge: "3 Clues",
            nodeStatus: "action",
            edgeRelation: "check record",
            description:
              "Key documents in your VA Claims File (C-file) and military separation packet that help an accredited representative spot an overlooked muscle or nerve injury.",
            children: [
              {
                id: "vet-clue-codesheet",
                label: "Rating Code Sheet: Scar Code 7800–7805 Only (No 5301–5323)",
                badge: "FOIA C-File",
                nodeStatus: "action",
                description:
                  "Summary award letters omit 4-digit Diagnostic Codes. Requesting internal VA Rating Code Sheets reveals whether VA ever evaluated Muscle Groups I–XXIII (Diagnostic Codes 5301–5323).",
                href: "/cfr/38-cfr-4.56",
              },
              {
                id: "vet-clue-surgery",
                label: "Surgical Notes: Through-and-Through (T&T) or Debridement",
                badge: "Hospital Chart",
                nodeStatus: "action",
                description:
                  "Field medical cards (DD Form 1380) and inpatient surgical ward notes documenting surgical debridement (cleaning damaged deep tissue), fascia defects, or muscle fatigue.",
                href: "/cfr/38-cfr-4.56",
              },
              {
                id: "vet-clue-dd214",
                label: "DD-214 Purple Heart or X-Ray Retained Metal Fragments",
                badge: "Service Proof",
                nodeStatus: "action",
                description:
                  "Combat decorations on a DD-214 and X-ray notes showing retained metallic foreign bodies corroborate in-service penetrating trauma.",
                href: "/cfr/38-cfr-3.156c",
              },
            ],
          },
          {
            id: "vet-wounds-rules-then",
            label: `Rules in Effect on ${decisionDate}`,
            badge: "Date-Reactive",
            nodeStatus: "live",
            edgeRelation: "governed by",
            description:
              "Shows which version of VA's muscle and scar regulations actually applied on the Decision Date selected in the top bar.",
            children: [
              {
                id: "vet-scar-muscle-rule",
                label: isMusclePre1946
                  ? "Pre-April 1946 Muscle Schedule — Pull Historical Print CFR"
                  : isMusclePre1997
                    ? "1946–1997 Muscle Wound Rules (38 C.F.R. § 4.56)"
                    : "Current Muscle Rules — Moderate Floor for T&T Muscle Damage (§ 4.56)",
                badge: isMusclePre1946
                  ? "Gap — Do Not Rely"
                  : isMusclePubGap
                    ? "June 1997 Gap Alert"
                    : isMusclePre1997
                      ? "Eff. 1946–1997"
                      : "Eff. 1997–Present",
                nodeStatus: isMusclePre1946 ? "quarantined" : "live",
                description: isMusclePre1946
                  ? `VetLawGuide's indexed muscle-injury snapshots begin April 1, 1946. Do not rely on modern text for ${decisionDate}.`
                  : isMusclePre1997
                    ? `On ${decisionDate}, the pre-July 3, 1997 muscle rule applied (note: VA published the new rule June 3, 1997, effective July 3, 1997). Surgical debridement sat in Moderately Severe.`
                    : `On ${decisionDate}, 38 C.F.R. § 4.56(b) explicitly directs rating a through-and-through wound with muscle damage as at least Moderate for each damaged muscle group.`,
                href: isMusclePre1946
                  ? "/cfr/38-cfr-4.56"
                  : isMusclePre1997
                    ? "/cfr/38-cfr-4.56/1946-04-01"
                    : "/cfr/38-cfr-4.56/1997-07-03",
              },
              {
                id: "vet-scar-count-rule",
                label: isMusclePre1946
                  ? "Pre-April 1946 Scar Schedule — Pull Historical Print CFR"
                  : isScarPre2008
                    ? "Pre-Oct. 23, 2008 Scar Rules (§ 4.118)"
                    : "Post-Oct. 23, 2008 Scar-Counting Scale (§ 4.118)",
                badge: isMusclePre1946
                  ? "Gap — Do Not Rely"
                  : isScarPre2008
                    ? "Single 10% Cap (DC 7804)"
                    : "Counts Each Painful Scar",
                nodeStatus: isMusclePre1946
                  ? "quarantined"
                  : isScarPre2008
                    ? "live"
                    : "summary",
                description: isScarPre2008
                  ? `Before October 23, 2008, Diagnostic Code 7804 capped superficial painful scars at a single 10% (${isScarPre2002 ? "pre-2002 qualitative disfigurement era" : "2002 8-feature disfigurement era"}).`
                  : "From October 23, 2008 forward, Diagnostic Code 7804 counts every painful or unstable scar (1–2 = 10%, 3–4 = 20%, 5+ = 30%, plus 10% if both unstable and painful). Note: Sept. 29, 2025 notice 90 FR 46542 is proposed only and NOT enacted law.",
                href: isScarPre2002
                  ? "/cfr/38-cfr-4.118/1946-04-01"
                  : isScarPre2008
                    ? "/cfr/38-cfr-4.118/2002-08-30"
                    : "/cfr/38-cfr-4.118",
              },
            ],
          },
          {
            id: "vet-wounds-pathways",
            label: "Pathways to Discuss With an Accredited Representative",
            badge: "3 Options",
            nodeStatus: "live",
            edgeRelation: "discuss",
            description:
              "Educational overview of legal vehicles an accredited VSO, claims agent, or attorney evaluates depending on what records were in your file.",
            children: [
              {
                id: "vet-path-3156c",
                label: "Hospital / Unit Records Added Later → Reconsideration (§ 3.156(c))",
                badge: "Bypasses CUE Bars",
                nodeStatus: "live",
                description:
                  "If inpatient surgical packets or unit logs existed during service but were missing when VA first decided your claim, 38 C.F.R. § 3.156(c) requires reconsideration and can link effective dates back to the original claim.",
                href: "/cfr/38-cfr-3.156c",
              },
              {
                id: "vet-path-cue",
                label: "Records Already in File Overlooked → Past Error Review (CUE)",
                badge: "Strict Rules",
                nodeStatus: "live",
                description:
                  "Reviews an undebatable error under the exact rules in effect then. Caution: 38 C.F.R. § 20.1409(c) allows only one final merits CUE decision per prior Board decision on an issue.",
                href: "/cfr/38-cfr-4.56",
              },
              {
                id: "vet-path-increase",
                label: "Multiple Painful Scars or Worsened Muscle Weakness → Current Increase Claim",
                badge: "Today's Schedule",
                nodeStatus: "live",
                description:
                  "Applies today's rating criteria (such as post-2008 painful scar counting) moving forward without needing to prove an error in the older decision.",
                href: "/cfr/38-cfr-4.118",
              },
            ],
          },
        ],
      },
      {
        id: "vet-branch-records",
        label: "Military or Inpatient Surgical Records Missing at Original Denial",
        badge: "Wave 1 Live",
        nodeStatus: "live",
        edgeRelation: "situation",
        description:
          "How newly located official service department records reopen a previously denied or underrated claim under 38 C.F.R. § 3.156(c).",
        children: [
          {
            id: "vet-rec-nprc",
            label: "NPRC Inpatient Clinical Packets (Stored Separately From Outpatient STRs)",
            badge: "Request Separately",
            nodeStatus: "action",
            description:
              "Military hospital admission charts were often archived separately from routine outpatient health jackets at the National Personnel Records Center (NPRC).",
            href: "/cfr/38-cfr-3.156c",
          },
          {
            id: "vet-rec-unit",
            label: "Deck Logs, Morning Reports & Declassified Unit Histories",
            badge: "§ 3.156(c)(1)(i)–(iii)",
            nodeStatus: "live",
            description:
              "Unit records verifying an in-service event can trigger § 3.156(c) reconsideration even if they do not list the Veteran by name.",
            href: "/cfr/38-cfr-3.156c",
          },
        ],
      },
      {
        id: "vet-branch-work",
        label: "Service-Connected Conditions Prevent Working or Hospital Showed Worsening",
        badge: "Wave 2 Queued",
        nodeStatus: "placeholder",
        edgeRelation: "situation",
        description:
          "Covers unemployability (TDIU), pre-March 24, 2015 VA hospital reports, and Special Monthly Compensation (SMC).",
        children: [
          {
            id: "vet-work-3157b",
            label: isInformalHospitalActive
              ? `VA / Military Hospital Report Rule Active on ${decisionDate} (Former § 3.157(b))`
              : "Post-March 24, 2015 Standardized Claim Forms Rule (§ 3.155)",
            badge: isInformalHospitalActive ? "Active Pre-3/24/2015" : "Repealed 2015",
            nodeStatus: "placeholder",
            description: isInformalHospitalActive
              ? "Prior to March 24, 2015, a VA or military hospital/exam report for an already service-connected condition (even 0%) operated as an informal claim for increase."
              : "From March 24, 2015 forward, VA requires standardized claim forms or an Intent to File, though pre-2015 pending informal claims remain valid.",
            href: "/cfr/38-cfr-3.157b",
          },
          {
            id: "vet-work-tdiu",
            label: "Individual Unemployability — 100% Rate When Unable to Work (TDIU)",
            badge: "Queued W2",
            nodeStatus: "placeholder",
            description:
              "Planned Wave 2 guide covering schedular and extraschedular TDIU under 38 C.F.R. § 4.16.",
            href: "/cfr/38-cfr-4.16a-b",
          },
          {
            id: "vet-work-smc",
            label: "Aid & Attendance, Housebound, or Loss of Use (SMC)",
            badge: "Queued W3",
            nodeStatus: "placeholder",
            description:
              "Planned Wave 3 guide covering Special Monthly Compensation under 38 U.S.C. § 1114 and 38 C.F.R. §§ 3.350–3.352.",
            href: "/playbooks",
          },
        ],
      },
      {
        id: "vet-branch-reduction",
        label: "VA Lowered My Long-Standing Rating or Mailed a Notice to an Old Address",
        badge: "Wave 2 Queued",
        nodeStatus: "placeholder",
        edgeRelation: "situation",
        description:
          "Covers 5-, 10-, and 20-year rating shields, 60-day advance notice rules, and missed-exam denials mailed to outdated addresses.",
        children: [
          {
            id: "vet-red-void",
            label: "Improper Rating Reductions & 5 / 10 / 20-Year Protections",
            badge: "Queued W2",
            nodeStatus: "placeholder",
            description:
              "Planned Wave 2 guide on 38 C.F.R. §§ 3.105(e), 3.344, 3.951, and 3.957.",
            href: "/cfr/38-cfr-3.344",
          },
          {
            id: "vet-red-mail",
            label: "Wrong-Address Letters & Missed C&P Exam Denials (§ 3.655)",
            badge: "Queued W2",
            nodeStatus: "placeholder",
            description:
              "Planned Wave 2 guide on mailing regularity and VA Form 10-7131 hospital address updates.",
            href: "/cfr/38-cfr-3.655",
          },
        ],
      },
      {
        id: "vet-branch-survivor",
        label: "Surviving Spouse or Family Member Researching DIC or Accrued Benefits",
        badge: "Wave 3 Queued",
        nodeStatus: "placeholder",
        edgeRelation: "situation",
        description:
          "Planned Wave 3 survivor guides covering Direct DIC, 10-Year 100% DIC (§ 1318 / § 3.22), PACT Act § 3.33 re-evaluations, and Nehmer estates.",
        children: [
          {
            id: "vet-surv-dic",
            label: "Survivor DIC & 10-Year Total Disability Rule (38 C.F.R. § 3.22)",
            badge: "Queued W3",
            nodeStatus: "placeholder",
            description:
              "Structured transition chain indexed at /cfr/38-cfr-3.22; full plain-English guide queued in Wave 3.",
            href: "/cfr/38-cfr-3.22",
          },
          {
            id: "vet-surv-pact",
            label: "PACT Act Re-Evaluation of Prior DIC Denials (38 C.F.R. § 3.33)",
            badge: "Summary Only",
            nodeStatus: "summary",
            description:
              "Effective Jan. 23, 2024 implementing 38 U.S.C. § 1305 retroactive effective-date protections.",
            href: "/cfr/38-cfr-3.33",
          },
        ],
      },
    ],
  };
}

function buildPractitionerLawTree(decisionDate: string): KnowledgeTreeNode {
  // 1. Statutory Era & Procedural Regime on decisionDate
  const statuteNode: KnowledgeTreeNode =
    decisionDate < "1959-01-01"
      ? {
          id: "law-statute-era",
          label: "Era A: Vet. Reg. No. 1(a) & Economy Act (Pre-1959)",
          badge: "Pre-Pub. L. 85-857",
          nodeStatus: "live",
          description:
            "Code sheets prior to Jan. 1, 1959 cited Veterans' Regulation No. 1(a) Part I (wartime) / Part II (peacetime). Audit Pub. L. 85-56 § 2316(b) & Pub. L. 85-857 §§ 10–11 savings clauses (§ 3.953).",
          href: "/explore#crosswalk-heading",
        }
      : decisionDate < "1991-05-07"
        ? {
            id: "law-statute-era",
            label: "Era B: Former 38 U.S.C. §§ 310, 314, 355, 3010, 4004",
            badge: "Pub. L. 85-857 (1959–1991)",
            nodeStatus: "live",
            description:
              "Governed by the 1958 Title 38 codification prior to May/August 1991 renumbering. Verify identical pre-1991 statutory text before pleading CUE.",
            href: "/explore#crosswalk-heading",
          }
        : decisionDate < "1991-08-06"
          ? {
              id: "law-statute-era",
              label: "91-Day 1991 Split: Pub. L. 102-40 (Ch. 51–72) vs. Former §§ 301–418",
              badge: "May 7 – Aug. 5, 1991 Trap",
              nodeStatus: "live",
              description:
                "Pub. L. 102-40 (May 7, 1991) renumbered Ch. 51–72 (§ 3010 -> § 5110), while Ch. 11–42 remained at former §§ 301–418 until Pub. L. 102-83 (Aug. 6, 1991).",
              href: "/explore#crosswalk-heading",
            }
          : {
              id: "law-statute-era",
              label: "Era C: Modern 38 U.S.C. §§ 1110, 1114, 1155, 5109A, 5110, 7111",
              badge: "Post-Aug. 6, 1991",
              nodeStatus: "live",
              description:
                "Modern Chapter-aligned Title 38 numbering enacted by Pub. L. 102-40 & Pub. L. 102-83 (with § 5109A & § 7111 CUE statutes enacted Nov. 21, 1997 by Pub. L. 105-111).",
              href: "/explore#crosswalk-heading",
            };

  const bellNode: KnowledgeTreeNode =
    decisionDate < "1992-07-21"
      ? {
          id: "law-bell-scope",
          label: "Record Scope: Physical C-File Only (Pre-Bell v. Derwinski)",
          badge: "Pre-Bell (< 7/21/1992)",
          nodeStatus: "live",
          description:
            "Prior to July 21, 1992 (Bell, 2 Vet. App. 611; Damrel, 6 Vet. App. 242), VA clinical records not physically in the C-file are excluded from CUE record scope—pivot to § 3.156(c) if official service records were missing.",
        }
      : {
          id: "law-bell-scope",
          label: "Record Scope: Constructive VA Possession (Bell v. Derwinski)",
          badge: "Post-7/21/1992 Active",
          nodeStatus: "live",
          description:
            "VA-generated medical records in existence on or after July 21, 1992 are constructively part of the CUE record (see also Lang v. Wilkie for post-decision VAMC records under Legacy § 3.156(b)).",
        };

  const sec3157bNode: KnowledgeTreeNode =
    decisionDate < "2015-03-24"
      ? {
          id: "law-3157b",
          label: "Former 38 C.F.R. § 3.157(b) Hospital/Exam Informal Claims",
          badge: "Active (< 3/24/2015)",
          nodeStatus: "placeholder",
          description:
            "Treated VA or uniformed-services exam/hospitalization reports for an already service-connected condition (including 0% SC) as an automatic informal claim for increase (Shea v. Wilkie).",
          href: "/cfr/38-cfr-3.157b/1961-02-24",
        }
      : {
          id: "law-3157b",
          label: "38 C.F.R. § 3.155 Standardized Claim Forms (79 FR 57660)",
          badge: "§ 3.157(b) Repealed",
          nodeStatus: "placeholder",
          description:
            "Prospective repeal effective March 24, 2015 replacing non-form informal claims with Intent to File (VA Form 21-0966) and standardized forms, without extinguishing pre-2015 pending claims.",
          href: "/cfr/38-cfr-3.155/2015-03-24",
        };

  // 2. § 4.56 Muscle Injuries on decisionDate
  const is456Pre1946 = decisionDate < "1946-04-01";
  const is456Pre1997 = decisionDate >= "1946-04-01" && decisionDate < "1997-07-03";
  const is456PubGap = decisionDate >= "1997-06-03" && decisionDate < "1997-07-03";

  // 3. § 4.118 Scars on decisionDate
  const scarsEra =
    decisionDate < "1946-04-01"
      ? {
          label: "38 C.F.R. § 4.118 Scars — Pre-1946 Unindexed Date",
          badge: "Gap — Do Not Rely",
          status: "quarantined" as TreeNodeStatus,
          href: "/cfr/38-cfr-4.118",
          desc: "No indexed snapshot precedes April 1, 1946; pull contemporaneous print schedule.",
        }
      : decisionDate < "2002-08-30"
        ? {
            label: "§ 4.118 Scars: Era 1 Qualitative DC 7800 & Single 10% DC 7804",
            badge: "Eff. 1946-04-01 → 2002-08-29",
            status: "live" as TreeNodeStatus,
            href: "/cfr/38-cfr-4.118/1946-04-01",
            desc: "Verbatim Era 1 text active: DC 7804 superficial painful scars capped at a single 10%; DC 7803 unstable scars 10%.",
          }
        : decisionDate < "2008-10-23"
          ? {
              label: "§ 4.118 Scars: Era 2 8-Characteristic DC 7800 Matrix (67 FR 49590)",
              badge: "Eff. 2002-08-30 → 2008-10-22",
              status: "live" as TreeNodeStatus,
              href: "/cfr/38-cfr-4.118/2002-08-30",
              desc: "Verbatim Era 2 text active (pub. 2002-07-31, eff. 2002-08-30): 80% DC 7800 tier + 8 objective disfigurement features; DC 7804 still capped at 10%.",
            }
          : decisionDate < "2018-08-13"
            ? {
                label: "§ 4.118 Scars: Era 3 Count-Based DC 7804 & Nonlinear DC 7801–7802",
                badge: "Eff. 2008-10-23 (Summary Only)",
                status: "summary" as TreeNodeStatus,
                href: "/cfr/38-cfr-4.118/2008-10-23",
                desc: "73 FR 54708 (pub. 2008-09-23, eff. 2008-10-23): Deleted DC 7803, enacted count-based DC 7804 (10/20/30% + 10% dual bonus), required nonlinear DC 7801–7802. Pull print CFR before CUE.",
              }
            : {
                label: "§ 4.118 Scars: Era 4 Linear Scars Included & 6 Body Zones",
                badge: "Eff. 2018-08-13 (Summary Only)",
                status: "summary" as TreeNodeStatus,
                href: "/cfr/38-cfr-4.118/2018-08-13",
                desc: "83 FR 32592 (pub. 2018-07-13, eff. 2018-08-13): Removed nonlinear restriction from DC 7801–7802 and defined 6 body zones.",
              };

  // 4. § 3.156(c) on decisionDate
  const is3156cPre1962 = decisionDate < "1962-01-01";
  const is3156cPre2006 = decisionDate >= "1962-01-01" && decisionDate < "2006-10-06";
  const is3156cPubGap = decisionDate >= "2006-09-06" && decisionDate < "2006-10-06";

  const eraAppellateRegimeBranch: KnowledgeTreeNode =
    decisionDate < "1963-01-01"
      ? {
          id: "law-branch-appellate-era",
          label: "1946–1962 Appellate Regime: Pre-SOC Era & Economy Act Judicial Bar",
          badge: "No CAVC · Pre-SOC",
          nodeStatus: "live",
          edgeRelation: "era gate",
          description:
            "Prior to Jan. 1, 1963 (Pub. L. 87-666), VA had no statutory Statement of the Case requirement, judicial review was barred by Economy Act § 5 / former § 211(a), and statutory Board CUE (§ 7111) would not exist until Nov. 21, 1997.",
          children: [
            {
              id: "law-app-211a-early",
              label: "Former 38 U.S.C. § 211(a) / Economy Act § 5 Non-Reviewability",
              badge: "Splendid Isolation",
              nodeStatus: "live",
              description:
                "Barred federal court review of individual VA benefit decisions until the Nov. 18, 1988 VJRA.",
              href: "/crosswalk",
            },
          ],
        }
      : decisionDate < "1988-11-18"
        ? {
            id: "law-branch-appellate-era",
            label: "1963–1988 Pre-VJRA Closed Era: Mandatory SOC & Former § 211(a) Bar",
            badge: "Pub. L. 87-666 SOC",
            nodeStatus: "live",
            edgeRelation: "era gate",
            description:
              "Mandatory Statement of the Case required after every timely NOD from Jan. 1, 1963 forward, while judicial review remained barred under former § 211(a) (expanded Aug. 12, 1970 by Pub. L. 91-376).",
            children: [
              {
                id: "law-app-unissued-soc",
                label: "Unissued SOC After Timely Post-1962 NOD Abates Finality",
                badge: "Pending Stream",
                nodeStatus: "live",
                description:
                  "Failure to issue an SOC following a timely written NOD prevented the RO decision from ever becoming final.",
                href: "/docs/procedural-vehicles-piercing-finality",
              },
            ],
          }
        : decisionDate < "2000-11-09"
          ? {
              id: "law-branch-appellate-era",
              label:
                decisionDate < "1997-11-21"
                  ? "1988–1997 VJRA Era: COVA Review, Well-Grounded Gate & Pre-§ 7111 Window"
                  : "1997–2000 VJRA + CUE Act Era: §§ 5109A / 7111 Enacted (Pre-VCAA)",
              badge: decisionDate < "1997-11-21" ? "Pre-Board CUE Act" : "Pub. L. 105-111",
              nodeStatus: "live",
              edgeRelation: "era gate",
              description:
                "Created Article I judicial review (Pub. L. 100-687), imposed the temporary 1988–2000 'well-grounded claim' threshold, and on Nov. 21, 1997 enacted statutory Board CUE (38 U.S.C. § 7111, overturning Smith v. Brown).",
              children: [
                {
                  id: "law-app-cue-act",
                  label: "Pub. L. 105-111 (Nov. 21, 1997) — 38 U.S.C. §§ 5109A & 7111",
                  badge: "Retroactive Jurisdiction",
                  nodeStatus: "live",
                  description:
                    "Applies to final RO and BVA decisions rendered before, on, or after Nov. 21, 1997, subject to § 20.1409(c) one-final-merits-decision-per-issue res judicata.",
                  href: "/checklists/board-cue-pre-filing-gate",
                },
              ],
            }
          : decisionDate < "2019-02-19"
            ? {
                id: "law-branch-appellate-era",
                label: "2000–2019 VCAA Legacy Era: § 5103A Duty to Assist & Implicit Denial",
                badge: "Legacy NOD/SOC/Form 9",
                nodeStatus: "live",
                edgeRelation: "era gate",
                description:
                  "Abolished the well-grounded claim gate (Nov. 9, 2000), enacted § 5103/5103A notice and duty to assist, repealed informal claims on March 24, 2015, and retained Deshotel/Adams implicit denial rules.",
                children: [
                  {
                    id: "law-app-lang-beraud",
                    label: "§ 3.156(b) Post-Decision Evidence Within 1 Year (Beraud & Lang)",
                    badge: "Legacy Abatement",
                    nodeStatus: "live",
                    description:
                      "Unaddressed submissions or VAMC treatment notes within the 1-year Legacy appeal period prevent finality from attaching.",
                    href: "/docs/procedural-vehicles-piercing-finality",
                  },
                ],
              }
            : {
                id: "law-branch-appellate-era",
                label: "2019–Present AMA & PACT Era: 3 Review Lanes & § 5104(b) Hamill Rule",
                badge: "AMA + PACT Active",
                nodeStatus: "live",
                edgeRelation: "era gate",
                description:
                  "Governed by Pub. L. 115-55 three-lane continuous pursuit (§ 3.2500), abolition of implicit denial under § 5104(b) (Hamill v. Collins), and PACT Act §§ 1119–1120 / TERA.",
                children: [
                  {
                    id: "law-app-hamill-ama",
                    label: "Hamill v. Collins (166 F.4th 1030) — Abolition of Implicit Denial",
                    badge: "38 U.S.C. § 5104(b)",
                    nodeStatus: "live",
                    description:
                      "Omitted claimed or reasonably raised issues in post-Feb. 19, 2019 AMA decisions remain legally pending.",
                    href: "/docs/procedural-vehicles-piercing-finality",
                  },
                ],
              };

  return {
    id: "root-practitioner",
    label: `Title 38 Law Tree (${decisionDate})`,
    badge: "Bitemporal DAG",
    nodeStatus: "live",
    defaultExpanded: true,
    description:
      "Point-in-time Title 38 legal authority graph. Changing Decision Date in the header dynamically morphs statutory era citations, appellate regimes, Bell record-scope boundaries, § 3.157(b) informal-claim status, and governing 38 C.F.R. permalinks.",
    children: [
      {
        id: "law-branch-era",
        label:
          decisionDate < "1959-01-01"
            ? "Statutory & Record Regime: Era A Vet. Regs. & Pre-Bell Scope"
            : decisionDate < "1991-08-06"
              ? "Statutory & Record Regime: Era B Former Title 38 & Pre-Bell Scope"
              : decisionDate < "1992-07-21"
                ? "Statutory & Record Regime: Era C Title 38 & Pre-Bell Window"
                : "Statutory & Record Regime: Modern Title 38 & Bell Constructive Scope",
        badge: decisionDate.slice(0, 4),
        nodeStatus: "live",
        edgeRelation: "governed by",
        description:
          "Foundational Title 38 numbering, constructive-possession record rules, and informal-claim regulations binding the adjudicator on the target Decision Date.",
        children: [statuteNode, bellNode, sec3157bNode],
      },
      eraAppellateRegimeBranch,
      {
        id: "law-branch-part4",
        label: is456Pre1997
          ? "38 C.F.R. Part 4 — VASRD (1945 Schedule § 4.56 & Single-Cap Scars)"
          : decisionDate < "2008-10-23"
            ? "38 C.F.R. Part 4 — VASRD (Post-1997 § 4.56 Floor & Pre-2008 Scars)"
            : "38 C.F.R. Part 4 — VASRD (Post-1997 § 4.56 Floor & Count-Based Scars)",
        badge: is456PubGap ? "June 1997 Pub-Gap!" : "Wave 1 + Queued W2–W4",
        nodeStatus: "live",
        edgeRelation: "branches to",
        description:
          "Point-in-time VASRD diagnostic criteria separating Federal Register Publication Date from Effective Date.",
        children: [
          {
            id: "law-cfr-456",
            label: is456Pre1946
              ? "§ 4.56 Muscle Injuries — Pre-1946 Unindexed Baseline"
              : is456Pre1997
                ? "§ 4.56 Muscle Injuries: 1945 VASRD Mechanism Tiers"
                : "§ 4.56 Muscle Injuries: Mandatory § 4.56(b) T&T Moderate Floor",
            badge: is456Pre1946
              ? "Gap — Do Not Rely"
              : is456PubGap
                ? "Pub-Gap Trap (62 FR 30235)!"
                : is456Pre1997
                  ? "Eff. 1946-04-01 → 1997-07-02"
                  : "Eff. 1997-07-03 → present",
            nodeStatus: is456Pre1946 ? "quarantined" : "live",
            description: is456PubGap
              ? "TRAP ALERT: 62 FR 30235 was published June 3, 1997 but took effect July 3, 1997! A June 1997 decision is governed by the 1946–1997 text."
              : "Verbatim pre- and post-July 3, 1997 snapshots with deterministic redline diffs and DC 5301–5323 percentage tables.",
            href: is456Pre1946
              ? "/cfr/38-cfr-4.56"
              : is456Pre1997
                ? "/cfr/38-cfr-4.56/1946-04-01"
                : "/cfr/38-cfr-4.56/1997-07-03",
            children: [
              {
                id: "law-456-debridement",
                label: "Debridement Placement: Moderately Severe (Not Moderate)",
                badge: "Both Eras",
                nodeStatus: "live",
                description:
                  "In both pre-1997 § 4.56(b)–(c) and current § 4.56(d)(2)–(3), 'without ... residuals of debridement' modifies Moderate, placing surgical debridement in Moderately Severe.",
                href: "/cfr/38-cfr-4.56#redline-diff",
              },
              {
                id: "law-456-esteban",
                label: "Esteban v. Brown (6 Vet. App. 259) — § 4.14 Separate Manifestations",
                badge: "No § 20.1403(e) Bar",
                nodeStatus: "live",
                description:
                  "Surface scar pain (DC 7804), muscle-group impairment (DC 5301–5323), and peripheral nerve injury (DC 8510–8730) are distinct manifestations unless § 4.55(d) same-plane joint LOM applies.",
                href: "/cfr/38-cfr-4.56",
              },
            ],
          },
          {
            id: "law-cfr-4118",
            label: scarsEra.label,
            badge: scarsEra.badge,
            nodeStatus: scarsEra.status,
            description: scarsEra.desc,
            href: scarsEra.href,
            children: [
              {
                id: "law-4118-redline",
                label: "1946 vs. 2002 Verbatim Redline & 4-Era DC 7800–7805 Matrix",
                badge: "Redline Diff",
                nodeStatus: "live",
                description:
                  "Side-by-side and inline redline comparison paired with Cullen and Lyles stacking rules.",
                href: "/cfr/38-cfr-4.118#redline-diff",
              },
            ],
          },
          {
            id: "law-part4-queued",
            label: "Held-at-Gate VASRD Systems (Waves W2–W4 Placeholders)",
            badge: "Queued W2–W4",
            nodeStatus: "placeholder",
            description:
              "Structured Federal Register transition records indexed; full verbatim text held behind upcoming Bookmark Waves.",
            children: [
              {
                id: "law-q-416",
                label: "§ 4.16(a)–(b) & Former (c) TDIU Evolution",
                badge: "Queued W2",
                nodeStatus: "placeholder",
                description:
                  "1975 baseline, 1989 former § 4.16(c) 70% mental rule, and Sept. 4, 1990 poverty-threshold update (55 FR 31579).",
                href: "/cfr/38-cfr-4.16a-b",
              },
              {
                id: "law-q-4124a",
                label: "§ 4.124a TBI (DC 8045 Oct. 23, 2008 Facets) & ALS (DC 8017)",
                badge: "Queued W4",
                nodeStatus: "placeholder",
                description:
                  "Pre-2008 10% subjective cap vs. post-Oct. 23, 2008 10-facet TBI table (73 FR 54693).",
                href: "/cfr/38-cfr-4.124a-dc-8045",
              },
              {
                id: "law-q-4130",
                label: "§ 4.130 / Former § 4.132 Mental Disorders (1988 / 1996 / 2014)",
                badge: "Queued W4",
                nodeStatus: "placeholder",
                description:
                  "1988 psychoneurotic 70% tier, Nov. 7, 1996 DSM-IV consolidation, and Aug. 4, 2014 DSM-5 update.",
                href: "/cfr/38-cfr-4.130",
              },
            ],
          },
        ],
      },
      {
        id: "law-branch-part3",
        label: "38 C.F.R. Part 3 & Part 20 — Finality Vehicles vs. CUE Limits",
        badge: "Piercing Finality",
        nodeStatus: "live",
        edgeRelation: "pierces finality",
        description:
          "Hierarchy of finality-bypassing vehicles contrasted against George v. McDonough (§ 20.1403(e)), Cook duty-to-assist bars, and § 20.1409(c) Board CUE limits.",
        children: [
          {
            id: "law-cfr-3156c",
            label: is3156cPre1962
              ? "§ 3.156(c) Service Records — Pre-1962 Unindexed Date"
              : is3156cPre2006
                ? "§ 3.156(c) + Former § 3.400(q)(2) (Vigil v. Peake Era)"
                : "§ 3.156(c)(1)–(4) Service Department Records (71 FR 52455)",
            badge: is3156cPre1962
              ? "Gap — Do Not Rely"
              : is3156cPubGap
                ? "Pub-Gap Trap (Sept. 2006)!"
                : is3156cPre2006
                  ? "Eff. 1962-01-01 → 2006-10-05"
                  : "Eff. 2006-10-06 → present",
            nodeStatus: is3156cPre1962 ? "quarantined" : "live",
            description:
              "Mandates reconsideration and retroactive effective dates upon association of pre-existing official service, clinical, deck-log, or declassified unit records (Vigil, Blubaugh, Emerson, Kisor).",
            href: is3156cPre1962
              ? "/cfr/38-cfr-3.156c"
              : is3156cPre2006
                ? "/cfr/38-cfr-3.156c/1962-01-01"
                : "/cfr/38-cfr-3.156c/2006-10-06",
          },
          {
            id: "law-cue-gates",
            label: "Collateral CUE Gates (§ 3.105(a) RO & § 7111 / § 20.1409(c) Board)",
            badge: "George · Cook",
            nodeStatus: "live",
            edgeRelation: "limits",
            description:
              "Requires undebatable error on contemporaneous law/record + § 4.25 outcome change; George (§ 20.1403(e)) bars later judicial reinterpretations, Cook bars duty-to-assist errors, and § 20.1409(c) permits only one final merits CUE decision per prior Board decision on an issue.",
            href: "/cfr/38-cfr-4.56",
          },
          {
            id: "law-void-pending",
            label: "Void Reductions (§ 3.344 Brown) & Pending Claims (Tablazon / Hamill)",
            badge: "Queued W2",
            nodeStatus: "placeholder",
            description:
              "Non-CUE finality bypasses: stabilized reductions violating § 3.344/§ 3.105(e) are void ab initio; unissued Legacy SOCs and AMA § 5104(b) notice defects keep claims pending.",
            href: "/cfr/38-cfr-3.344",
          },
        ],
      },
      {
        id: "law-branch-quarantine",
        label: "Quarantined Proposed & Rescinded Watchlist (Not Enacted Law)",
        badge: "Do Not Cite",
        nodeStatus: "quarantined",
        edgeRelation: "limits",
        description:
          "Unfinalized Federal Register proposals and rescinded Interim Final Rules quarantined so practitioners never cite them as enacted 38 C.F.R. text.",
        children: [
          {
            id: "law-q-90fr46542",
            label: "90 FR 46542 (Sept. 29, 2025) — Proposed DC 7804 Painful Scars Note",
            badge: "Proposed — Not Enacted",
            nodeStatus: "quarantined",
            description:
              "Unfinalized proposal regarding objective confirmation of pain under DC 7804; existing enacted § 4.118 text remains binding.",
            href: "/cfr/38-cfr-4.118/2025-09-29",
          },
          {
            id: "law-q-aq73",
            label: "89 FR 88917 (RIN 2900-AQ73) — Proposed §§ 4.120–4.124a Neurological",
            badge: "Proposed — Not Enacted",
            nodeStatus: "quarantined",
            description:
              "Unfinalized Nov. 12, 2024 proposal regarding peripheral neuropathy and epilepsy criteria.",
            href: "/cfr/38-cfr-4.120-4.124a-proposed",
          },
          {
            id: "law-q-91fr7118",
            label: "91 FR 7118 (Feb. 17, 2026) — Rescinded § 4.10 Medication IFR",
            badge: "Rescinded Feb. 27, 2026",
            nodeStatus: "quarantined",
            description:
              "Formally rescinded 10 days after issuance at 91 FR 9712; never cite as active law.",
            href: "/cfr/38-cfr-4.10/2026-02-17",
          },
        ],
      },
    ],
  };
}
