import type {
  AudienceMode,
  CompiledModuleSummary,
  CoverageManifest,
  CoverageState,
  DocumentCategory,
  VasrdSystemCoverage,
} from "./types";

export type TreeNodeStatus =
  | "live"
  | "summary"
  | "placeholder"
  | "quarantined"
  | "action";

export type BrowseResourceKind =
  | "Guide"
  | "Regulation"
  | "Checklist"
  | "Case"
  | "Tool";

export type SemanticEdgeRelation =
  | "amends"
  | "interprets"
  | "pierces finality"
  | "limits";

export interface KnowledgeTreeNode {
  id: string;
  label: string;
  shortLabel?: string;
  anchorId?: string;
  resourceKind?: BrowseResourceKind;
  badge?: string;
  coverageState?: CoverageState;
  nodeStatus: TreeNodeStatus;
  edgeRelation?: SemanticEdgeRelation;
  description: string;
  href?: string;
  illustrationSrc?: string;
  defaultExpanded?: boolean;
  children?: KnowledgeTreeNode[];
}

export interface BrowseCorpusModule {
  id: string;
  title: string;
  category: DocumentCategory;
  canonicalRoute: string;
  coverageState: CoverageState;
  hasVeteranOverlay: boolean;
  practiceDomains: string[];
  vasrdSystem: string | null;
  diagnosticCodes: string[];
  cfrCitations: string[];
  unfinalizedProposals: string[];
}

export interface BrowseCorpusCatalog {
  checkedAsOf: string;
  totals: CoverageManifest["totals"];
  vasrdSystems: VasrdSystemCoverage[];
  modules: BrowseCorpusModule[];
}

export function extractBrowseCatalog(
  manifest: CoverageManifest,
): BrowseCorpusCatalog {
  return {
    checkedAsOf: manifest.checkedAsOf,
    totals: manifest.totals,
    vasrdSystems: manifest.vasrdSystems,
    modules: manifest.modules.map((m: CompiledModuleSummary) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      canonicalRoute: m.canonicalRoute,
      coverageState: m.coverageState,
      hasVeteranOverlay: m.hasVeteranOverlay,
      practiceDomains: m.practiceDomains,
      vasrdSystem: m.vasrdSystem,
      diagnosticCodes: m.diagnosticCodes,
      cfrCitations: m.cfrCitations,
      unfinalizedProposals: m.unfinalizedProposals,
    })),
  };
}

export function flattenKnowledgeTree(root: KnowledgeTreeNode): KnowledgeTreeNode[] {
  const out: KnowledgeTreeNode[] = [root];
  for (const child of root.children ?? []) {
    out.push(...flattenKnowledgeTree(child));
  }
  return out;
}

function mapCategoryToResourceKind(mod: BrowseCorpusModule): BrowseResourceKind {
  if (
    mod.id === "doctrine-vaopgcprec-master-index" ||
    mod.id === "doctrine-authority-verification-log"
  ) {
    return "Case";
  }
  if (mod.category === "checklist") return "Checklist";
  if (mod.category === "authority-snapshot" || mod.category === "cfr-diff") {
    return "Regulation";
  }
  return "Guide";
}

function coverageBadgeForModule(
  mod: BrowseCorpusModule,
  mode: AudienceMode,
): { badge: string; status: TreeNodeStatus } {
  if (mod.coverageState === "CORPUS_GAP_OR_QUEUED_WAVE") {
    return { badge: "Gap — Do Not Rely", status: "quarantined" };
  }
  if (mod.coverageState === "SUMMARY_ONLY") {
    return { badge: "Summary Only", status: "summary" };
  }
  if (mod.hasVeteranOverlay) {
    return {
      badge: mode === "veteran" ? "Plain-English Ready" : "Verbatim Verified",
      status: "live",
    };
  }
  return {
    badge: mode === "veteran" ? "Primary Source Live" : "Verbatim Verified",
    status: "live",
  };
}

function coverageBadgeForVasrd(
  sys: VasrdSystemCoverage,
  mode: AudienceMode,
): { badge: string; status: TreeNodeStatus } {
  if (sys.coverageState === "CORPUS_GAP_OR_QUEUED_WAVE") {
    return { badge: "Gap — Do Not Rely", status: "quarantined" };
  }
  if (sys.coverageState === "SUMMARY_ONLY") {
    return { badge: "Summary Only", status: "summary" };
  }
  if (sys.plainEnglishCount > 0 && mode === "veteran") {
    return {
      badge: `${sys.plainEnglishCount} Plain-English`,
      status: "live",
    };
  }
  return {
    badge: `${sys.moduleIds.length} Source Modules`,
    status: "live",
  };
}

function inferModuleEdgeRelation(mod: BrowseCorpusModule): SemanticEdgeRelation {
  if (
    [
      "doctrine-procedural-vehicles-piercing-finality",
      "playbook-02-wrong-address-defective-notice-cp-exams",
      "playbook-03-service-department-records-38-cfr-3-156c",
      "playbook-04-unadjudicated-tdiu-informal-claims-smc",
      "playbook-05-void-rating-reductions-stabilized-ratings",
      "playbook-06-nehmer-herbicide-presumptions-crsc",
      "playbook-09-accrued-benefits-substitution-nehmer-estates",
    ].includes(mod.id)
  ) {
    return "pierces finality";
  }
  if (
    mod.category === "checklist" ||
    mod.id === "playbook-20-backpay-offsets-crdp-crsc-severance-recoupment" ||
    mod.id === "doctrine-attorney-fees-5904-and-eaja-practice"
  ) {
    return "limits";
  }
  if (
    mod.category === "cfr-diff" ||
    mod.category === "authority-snapshot" ||
    mod.id === "doctrine-title-38-statutory-crosswalk" ||
    mod.id === "doctrine-master-chronological-matrix"
  ) {
    return "amends";
  }
  return "interprets";
}

function buildModuleLeafNode(
  mod: BrowseCorpusModule,
  mode: AudienceMode,
): KnowledgeTreeNode {
  const { badge, status } = coverageBadgeForModule(mod, mode);
  const resourceKind = mapCategoryToResourceKind(mod);
  const edgeRelation = inferModuleEdgeRelation(mod);
  const citePreview =
    mod.cfrCitations.slice(0, 2).join(" · ") ||
    (mod.diagnosticCodes.length > 0
      ? `DC ${mod.diagnosticCodes.slice(0, 2).join(", ")}`
      : "Title 38 primary authority");

  const description =
    mode === "veteran"
      ? mod.hasVeteranOverlay
        ? `Plain-English companion, record clues, and questions for an accredited representative (${citePreview}).`
        : `Primary-source reference with inline VA acronym and form explanations (${citePreview}).`
      : `Primary-source ${resourceKind.toLowerCase()} indexing ${citePreview}${
          mod.unfinalizedProposals.length > 0
            ? ` · Quarantines unfinalized notice(s): ${mod.unfinalizedProposals.join(", ")}`
            : ""
        }.`;

  return {
    id: `mod-${mod.id}`,
    label: mod.title,
    shortLabel: mod.title.split(/\s+/).slice(0, 4).join(" "),
    resourceKind,
    badge,
    coverageState: mod.coverageState,
    nodeStatus: status,
    edgeRelation,
    description,
    href: mod.canonicalRoute,
  };
}

/**
 * Deterministic `coverage-manifest.json`-driven 5-branch Visitor-Need Browse Directory & Map model:
 * - Shares one stable 5-branch taxonomy across both `veteran` and `practitioner` modes.
 * - Derives live module & VASRD coverage badges from compiled corpus metadata (zero hardcoded build waves).
 * - Resolves point-in-time regulatory boundaries (`1997-06-20` FR pub-gap trap, `1954` Era A, `90 FR 46542` quarantine) from `decisionDate`.
 */
export function buildKnowledgeTree(
  mode: AudienceMode,
  decisionDate: string,
  catalog: BrowseCorpusCatalog,
): KnowledgeTreeNode {
  const isVet = mode === "veteran";

  // Temporal flags on decisionDate
  const is456Pre1946 = decisionDate < "1946-04-01";
  const is456Pre1997 =
    decisionDate >= "1946-04-01" && decisionDate < "1997-07-03";
  const is456PubGap =
    decisionDate >= "1997-06-03" && decisionDate < "1997-07-03";

  const isScarPre1946 = decisionDate < "1946-04-01";
  const isScarPre2002 =
    decisionDate >= "1946-04-01" && decisionDate < "2002-08-30";
  const isScarPre2008 =
    decisionDate >= "1946-04-01" && decisionDate < "2008-10-23";
  const isScarPre2018 =
    decisionDate >= "2008-10-23" && decisionDate < "2018-08-13";

  const is3156cPre1962 = decisionDate < "1962-01-01";
  const is3156cPre2006 =
    decisionDate >= "1962-01-01" && decisionDate < "2006-10-06";
  const is3156cPubGap =
    decisionDate >= "2006-09-06" && decisionDate < "2006-10-06";
  const isInformalHospitalActive = decisionDate < "2015-03-24";

  // Partition modules cleanly across the 5 visitor-need branches
  const vasrdSystemNodes: KnowledgeTreeNode[] = catalog.vasrdSystems.map((sys) => {
    const { badge, status } = coverageBadgeForVasrd(sys, mode);
    const shortWords = sys.label
      .replace(/^\d+\.\s*/, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[—–-]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(" ");
    return {
      id: `vasrd-${sys.systemId}`,
      label: `${sys.label} (${sys.diagnosticCodeRange})`,
      shortLabel: shortWords || "Rating schedule",
      resourceKind: "Regulation",
      badge,
      coverageState: sys.coverageState,
      nodeStatus: status,
      edgeRelation: "amends",
      description: isVet
        ? `Browse ${sys.diagnosticCodeRange} rating percentages, historical criteria changes, and related guides.`
        : `38 C.F.R. Part 4 schedule hub (${sys.diagnosticCodeRange}) linking ${sys.moduleIds.length} verbatim snapshot and redline module(s).`,
      href: `/vasrd/${sys.systemId}`,
    };
  });

  const ratingPlaybooks = catalog.modules
    .filter(
      (m) =>
        m.category === "playbook" &&
        m.practiceDomains.some((d) =>
          [
            "vasrd-rating-schedule",
            "tdiu-unemployability",
            "smc-ancillary",
            "disability-compensation",
          ].includes(d),
        ) &&
        !m.practiceDomains.includes("survivors-dic-accrued") &&
        !m.practiceDomains.includes("character-of-discharge") &&
        !m.practiceDomains.includes("toxic-exposure"),
    )
    .map((m) => buildModuleLeafNode(m, mode));

  // Branch 1: Disability ratings
  const muscleNode: KnowledgeTreeNode = {
    id: "law-cfr-456",
    label: is456Pre1946
      ? "38 C.F.R. § 4.56 Muscle Injuries — Pre-1946 Unindexed Date"
      : is456Pre1997
        ? "38 C.F.R. § 4.56 Muscle Injuries (1946–1997 Rules)"
        : "38 C.F.R. § 4.56 Muscle Injuries (Post-July 3, 1997 Through-and-Through Wound Floor)",
    shortLabel: "§ 4.56 muscle injuries",
    resourceKind: "Regulation",
    badge: is456Pre1946
      ? "Gap — Do Not Rely"
      : is456PubGap
        ? "Pub-Gap Trap (62 FR 30235)!"
        : is456Pre1997
          ? "Eff. 1946–1997"
          : "Eff. 1997–Present",
    nodeStatus: is456Pre1946 ? "quarantined" : "live",
    edgeRelation: is456Pre1946 ? "limits" : "amends",
    description: is456Pre1946
      ? `Indexed § 4.56 snapshots begin April 1, 1946. Do not rely on modern text for ${decisionDate}.`
      : is456PubGap
        ? `Boundary alert: 62 FR 30235 was published June 3, 1997 but took effect July 3, 1997. A ${decisionDate} decision is governed by the 1946–1997 regulation.`
        : isVet
          ? "Compares gunshot, shrapnel, and surgical debridement muscle-group ratings (DC 5301–5323) against surface scar codes."
          : "Verbatim pre- and post-July 3, 1997 § 4.56 snapshots with deterministic redlines and Esteban anti-pyramiding notes.",
    href: is456Pre1946
      ? "/cfr/38-cfr-4.56"
      : is456Pre1997
        ? "/cfr/38-cfr-4.56/1946-04-01"
        : "/cfr/38-cfr-4.56/1997-07-03",
  };

  const scarsNode: KnowledgeTreeNode = {
    id: "law-cfr-4118",
    label: isScarPre1946
      ? "38 C.F.R. § 4.118 Scars — Pre-1946 Unindexed Date"
      : isScarPre2002
        ? "38 C.F.R. § 4.118 Scars (1946–2002 Single 10% Painful Scar Cap)"
        : isScarPre2008
          ? "38 C.F.R. § 4.118 Scars (2002–2008 8-Characteristic Disfigurement Era)"
          : isScarPre2018
            ? "38 C.F.R. § 4.118 Scars (2008–2018 Painful Scar Counting Scale)"
            : "38 C.F.R. § 4.118 Scars (2018–Present Linear & 6-Zone Scale)",
    shortLabel: "§ 4.118 scars rule",
    resourceKind: "Regulation",
    badge: isScarPre1946
      ? "Gap — Do Not Rely"
      : isScarPre2008
        ? "Single 10% Cap (DC 7804)"
        : "Summary Only (Post-2008)",
    nodeStatus: isScarPre1946
      ? "quarantined"
      : isScarPre2008
        ? "live"
        : "summary",
    edgeRelation: isScarPre2008 ? "limits" : "amends",
    description: isScarPre1946
      ? "No indexed § 4.118 snapshot precedes April 1, 1946; consult official print schedules."
      : isScarPre2008
        ? `Before October 23, 2008, Diagnostic Code 7804 capped superficial painful scars at a single 10% (${isScarPre2002 ? "1946–2002 qualitative era" : "2002–2008 8-feature era"}).`
        : "From October 23, 2008 forward, DC 7804 counts painful or unstable scars (1–2 = 10%, 3–4 = 20%, 5+ = 30%). Post-2008 snapshots are Summary Only—verify print CFR before pleading CUE.",
    href: isScarPre1946
      ? "/cfr/38-cfr-4.118"
      : isScarPre2002
        ? "/cfr/38-cfr-4.118/1946-04-01"
        : isScarPre2008
          ? "/cfr/38-cfr-4.118/2002-08-30"
          : isScarPre2018
            ? "/cfr/38-cfr-4.118/2008-10-23"
            : "/cfr/38-cfr-4.118/2018-08-13",
  };

  const branchDisabilityRatings: KnowledgeTreeNode = {
    id: "disability-ratings",
    anchorId: "disability-ratings",
    label: "Disability ratings",
    shortLabel: "Disability ratings",
    badge: `${catalog.vasrdSystems.length} Schedules`,
    nodeStatus: "live",
    description: isVet
      ? "Look up rating percentages by body system or diagnostic code, and see how scar, muscle, spine, mental health, and unemployability rules changed over time."
      : "Navigate all 16 38 C.F.R. Part 4 schedules (DC 5000–9918), point-in-time rating snapshots, anti-pyramiding rules, TDIU, and SMC step math.",
    children: [
      {
        id: "ratings-vasrd-systems",
        label: "All 16 body-system rating schedules (DC 5000–9918)",
        shortLabel: "Body system schedules",
        badge: `${vasrdSystemNodes.length} Hubs`,
        nodeStatus: "live",
        description: isVet
          ? "Open any body system—joints and spine, hearing, heart, digestive, skin and scars, TBI, or mental health—to view rating codes and historical changes."
          : "Complete Part 4 Subpart A general policy hub plus all 15 Subpart B body-system schedules.",
        children: vasrdSystemNodes,
      },
      {
        id: "ratings-key-rules",
        label: `Date-sensitive rating rules on ${decisionDate}`,
        shortLabel: "Key rating rules",
        badge: is456PubGap ? "June 1997 Trap!" : "Date-Reactive",
        nodeStatus: "live",
        description: isVet
          ? `Shows which version of key wound, scar, and unemployability regulations applied on ${decisionDate}, plus proposed rules that are not enacted law.`
          : `Resolves governing 38 C.F.R. Part 4 snapshots on ${decisionDate}, separating Federal Register publication dates from effective dates.`,
        children: [
          muscleNode,
          scarsNode,
          {
            id: "cfr-416-tdiu",
            label: "38 C.F.R. § 4.16 Total Disability Based on Individual Unemployability (TDIU)",
            shortLabel: "§ 4.16 TDIU rule",
            resourceKind: "Regulation",
            badge: "Verbatim Verified",
            nodeStatus: "live",
            edgeRelation: "amends",
            description: isVet
              ? "Explains 100% unemployability ratings when service-connected conditions prevent substantially gainful work."
              : "Tracks 1975 baseline, 1989 former § 4.16(c), and Sept. 4, 1990 poverty-threshold amendment (55 FR 31579).",
            href: "/cfr/38-cfr-4.16a-b",
          },
          {
            id: "quarantine-90-fr-46542",
            label: "Quarantined Notice: 90 FR 46542 (Sept. 29, 2025 Proposed Scar Rule — Not Enacted Law)",
            shortLabel: "90 FR 46542 notice",
            resourceKind: "Regulation",
            badge: "Proposed — Not Law",
            nodeStatus: "quarantined",
            edgeRelation: "limits",
            description:
              "Proposed rulemaking notice only; never cite 90 FR 46542 as enacted rating criteria or historical CUE authority.",
            href: "/cfr/38-cfr-4.118/2025-09-29",
          },
        ],
      },
      {
        id: "ratings-guides",
        label: "Rating, unemployability, and Special Monthly Compensation guides",
        shortLabel: "Rating guides",
        badge: `${ratingPlaybooks.length} Guides`,
        nodeStatus: "live",
        description: isVet
          ? "Plain-language and primary-source guides covering penetrating wounds, secondary conditions, TDIU, Aid & Attendance, and TBI."
          : "Issue-spotting guides covering multi-manifestation ratings, secondary aggravation, TDIU/SMC, TBI facets, and extraschedular referrals.",
        children: ratingPlaybooks,
      },
    ],
  };

  // Branch 2: Older decisions and review options
  const statuteEraNode: KnowledgeTreeNode =
    decisionDate < "1959-01-01"
      ? {
          id: "law-statute-era",
          label: "Statutory Numbering: Pre-1959 Vet. Reg. No. 1(a) & Economy Act Era",
          shortLabel: "Pre-1959 statute era",
          resourceKind: "Tool",
          badge: "Pre-Pub. L. 85-857",
          nodeStatus: "live",
          edgeRelation: "amends",
          description:
            "Decisions before Jan. 1, 1959 cited Veterans' Regulation No. 1(a) Part I/II and carry § 3.953 savings protections.",
          href: "/crosswalk",
        }
      : decisionDate < "1991-05-07"
        ? {
            id: "law-statute-era",
            label: "Statutory Numbering: 1959–1991 Former Title 38 (§§ 310, 314, 355, 3010)",
            shortLabel: "1959–1991 statute era",
            resourceKind: "Tool",
            badge: "Pub. L. 85-857",
            nodeStatus: "live",
            edgeRelation: "amends",
            description:
              "Decisions from 1959 to May 1991 used three- and four-digit Title 38 numbers before the 1991 renumbering.",
            href: "/crosswalk",
          }
        : decisionDate < "1991-08-06"
          ? {
              id: "law-statute-era",
              label: "Statutory Numbering: May 7 – Aug. 5, 1991 91-Day Renumbering Split",
              shortLabel: "1991 split window",
              resourceKind: "Tool",
              badge: "Pub. L. 102-40 / 102-83",
              nodeStatus: "live",
              edgeRelation: "amends",
              description:
                "Pub. L. 102-40 (May 7, 1991) renumbered Chs. 51–72 (§ 3010 -> § 5110) three months before Pub. L. 102-83 (Aug. 6, 1991) renumbered Chs. 11–42.",
              href: "/crosswalk",
            }
          : {
              id: "law-statute-era",
              label: "Statutory Numbering: Modern Title 38 (§§ 1110, 1114, 5109A, 5110, 7111)",
              shortLabel: "Modern Title 38",
              resourceKind: "Tool",
              badge: "Post-Aug. 6, 1991",
              nodeStatus: "live",
              edgeRelation: "amends",
              description:
                "Chapter-aligned Title 38 numbering enacted in May/August 1991 (with statutory CUE §§ 5109A & 7111 enacted Nov. 21, 1997).",
              href: "/crosswalk",
            };

  const appealRegimeNode: KnowledgeTreeNode =
    decisionDate < "1963-01-01"
      ? {
          id: "law-appeal-regime",
          label: "Appeal Pipeline on Decision Date: Pre-1963 Direct Form P-9 / 1-9 Era",
          shortLabel: "Pre-1963 appeal rule",
          resourceKind: "Guide",
          badge: "Pre-1963 P-9 Era",
          nodeStatus: "live",
          edgeRelation: "interprets",
          description:
            "Before Jan. 1, 1963 (Pub. L. 87-666), VA had not yet enacted the mandatory Statement of the Case procedure; direct 1-year Form P-9 / 1-9 appeals governed Board review.",
          href: "/eras/1945-1961-post-wwii-korean-era",
        }
      : decisionDate < "2019-02-19"
        ? {
            id: "law-appeal-regime",
            label: "Appeal Pipeline on Decision Date: Legacy NOD / SOC & § 3.156(b) Abatement",
            shortLabel: "Legacy appeal rule",
            resourceKind: "Guide",
            badge: "Legacy SOC & § 3.156(b)",
            nodeStatus: "live",
            edgeRelation: "pierces finality",
            description:
              "Under Legacy rules (1963–Feb. 18, 2019), an unissued SOC after a timely NOD—or 1-year post-decision evidence/VAMC notes under § 3.156(b) (Beraud / Lang)—prevents finality from attaching.",
            href: "/docs/procedural-vehicles-piercing-finality",
          }
        : {
            id: "law-appeal-regime",
            label: "Appeal Pipeline on Decision Date: AMA 3-Lane Review & § 5104(b) Explicit Notice (Hamill)",
            shortLabel: "AMA explicit notice",
            resourceKind: "Guide",
            badge: "AMA & Hamill Active",
            nodeStatus: "live",
            edgeRelation: "pierces finality",
            description:
              "For AMA decisions (>= Feb. 19, 2019), continuous pursuit (§ 3.2500) preserves effective dates across 1-year lanes, and Hamill v. Collins (2026) keeps silently omitted issues legally pending under § 5104(b).",
            href: "/docs/procedural-vehicles-piercing-finality",
          };

  const developmentRegimeNode: KnowledgeTreeNode =
    decisionDate < "1988-11-18"
      ? {
          id: "law-development-regime",
          label: "Development Regime on Decision Date: Pre-VJRA Closed Administrative Era",
          shortLabel: "Pre-VJRA development",
          resourceKind: "Guide",
          badge: "Pre-VJRA (< 11/18/1988)",
          nodeStatus: "live",
          edgeRelation: "interprets",
          description:
            "Decisions rendered before Nov. 18, 1988 predated federal court review and written 'reasons or bases' mandates, often using terse code-sheet denials.",
          href: "/eras/1962-1988-pre-vjra-closed-era",
        }
      : decisionDate < "2000-11-09"
        ? {
            id: "law-development-regime",
            label: "Development Regime on Decision Date: VJRA 'Well-Grounded Claim' Gate (1988–2000)",
            shortLabel: "Well-grounded rule",
            resourceKind: "Guide",
            badge: "Well-Grounded Trap",
            nodeStatus: "live",
            edgeRelation: "limits",
            description:
              "Between Nov. 18, 1988 and Nov. 8, 2000 (former § 5107(a)), VA lawfully dismissed non-well-grounded claims without scheduling a C&P exam—attacking lack of an exam as CUE fails.",
            href: "/eras/1988-2000-vjra-revolution",
          }
        : decisionDate < "2019-02-19"
          ? {
              id: "law-development-regime",
              label: "Development Regime on Decision Date: VCAA Duty to Notify & Assist (2000–2019)",
              shortLabel: "VCAA duty rule",
              resourceKind: "Regulation",
              badge: "VCAA Duty Active",
              nodeStatus: "live",
              edgeRelation: "amends",
              description:
                "Enacted Nov. 9, 2000 (Pub. L. 106-475; former § 3.159), abolishing well-grounded dismissals while remaining barred as a standalone CUE ground under Cook v. Principi.",
              href: "/cfr/38-cfr-3.159a-c",
            }
          : {
              id: "law-development-regime",
              label: "Development Regime on Decision Date: AMA Pre-Decisional Duty to Assist (§ 3.159)",
              shortLabel: "AMA duty rule",
              resourceKind: "Regulation",
              badge: "AMA Pre-Decisional",
              nodeStatus: "live",
              edgeRelation: "limits",
              description:
                "From Feb. 19, 2019 forward, affirmative development ends at AOJ decision notice unless reopened via Supplemental Claim or returned for pre-decisional DTA error.",
              href: "/cfr/38-cfr-3.159a-c",
            };

  const bellScopeNode: KnowledgeTreeNode =
    decisionDate < "1992-07-21"
      ? {
          id: "law-bell-scope",
          label: "Record Scope on Decision Date: Physical C-File Only (Pre-Bell v. Derwinski)",
          shortLabel: "Pre-Bell record rule",
          resourceKind: "Guide",
          badge: "Pre-Bell (< 7/21/1992)",
          nodeStatus: "live",
          edgeRelation: "limits",
          description:
            "Before July 21, 1992 (Bell v. Derwinski; VAOPGCPREC 12-95), VA medical records not physically in the C-file were outside CUE scope—check § 3.156(c) if military records were missing.",
          href: "/docs/procedural-vehicles-piercing-finality",
        }
      : {
          id: "law-bell-scope",
          label: "Record Scope on Decision Date: Constructive VA Possession (Post-Bell)",
          shortLabel: "Bell record rule",
          resourceKind: "Guide",
          badge: "Post-7/21/1992 Active",
          nodeStatus: "live",
          edgeRelation: "interprets",
          description:
            "From July 21, 1992 forward, existing VA medical records are constructively part of the record (see also Lang v. Wilkie for 1-year post-decision Legacy VAMC records).",
          href: "/docs/procedural-vehicles-piercing-finality",
        };

  const informal3157bNode: KnowledgeTreeNode = isInformalHospitalActive
    ? {
        id: "law-3157b",
        label: "Hospital & Exam Informal Claims: Former 38 C.F.R. § 3.157(b) Active",
        shortLabel: "§ 3.157(b) informal claims",
        resourceKind: "Regulation",
        badge: "Active (< 3/24/2015)",
        nodeStatus: "live",
        edgeRelation: "pierces finality",
        description:
          "Before March 24, 2015, VA or military hospital/exam reports for an already service-connected condition (including 0%) operated as an informal claim for increase.",
        href: "/cfr/38-cfr-3.157b/1961-02-24",
      }
    : {
        id: "law-3157b",
        label: "Standardized Claim Forms: 38 C.F.R. § 3.155 (Post-March 24, 2015)",
        shortLabel: "§ 3.155 claim forms",
        resourceKind: "Regulation",
        badge: "Repealed § 3.157(b)",
        nodeStatus: "live",
        edgeRelation: "limits",
        description:
          "Effective March 24, 2015 (79 FR 57660), VA requires standardized claim forms or an Intent to File, without extinguishing pre-2015 pending informal claims.",
        href: "/cfr/38-cfr-3.155/2015-03-24",
      };

  const sec3156cNode: KnowledgeTreeNode = {
    id: "law-cfr-3156c",
    label: is3156cPre1962
      ? "38 C.F.R. § 3.156(c) Service Records — Pre-1962 Unindexed Baseline"
      : is3156cPre2006
        ? "38 C.F.R. § 3.156(c) Newly Associated Service Department Records (1962–2006)"
        : "38 C.F.R. § 3.156(c)(1)–(4) Service Department Records Reconsideration (2006–Present)",
    shortLabel: "§ 3.156(c) service records",
    resourceKind: "Regulation",
    badge: is3156cPre1962
      ? "Gap — Do Not Rely"
      : is3156cPubGap
        ? "Sept. 2006 Pub-Gap!"
        : "Bypasses CUE Bars",
    nodeStatus: is3156cPre1962 ? "quarantined" : "live",
    edgeRelation: is3156cPre1962 ? "limits" : "pierces finality",
    description: is3156cPre1962
      ? `Indexed § 3.156(c) snapshots begin in 1962; consult contemporaneous print regulations for ${decisionDate} while noting modern § 3.156(c) reconsideration applies today when official service records surface.`
      : "Reconsiders prior denials when official military, inpatient surgical, or unit records existed during service but were missing at the original decision.",
    href: "/cfr/38-cfr-3.156c",
  };

  const olderReviewModules = catalog.modules
    .filter(
      (m) =>
        (m.category === "playbook" ||
          m.category === "doctrine" ||
          m.category === "checklist") &&
        m.practiceDomains.some((d) =>
          [
            "finality-and-cue",
            "effective-dates-offsets",
            "pension-fiduciary-debt",
          ].includes(d),
        ) &&
        !m.practiceDomains.includes("survivors-dic-accrued") &&
        ![
          "doctrine-vaopgcprec-master-index",
          "doctrine-authority-verification-log",
          "doctrine-master-chronological-matrix",
          "doctrine-title-38-statutory-crosswalk",
          "doctrine-forms-and-codesheet-lexicon",
          "checklist-c-file-audit-protocol",
          "checklist-case-screening-worksheet",
        ].includes(m.id),
    )
    .map((m) => buildModuleLeafNode(m, mode));

  const branchOlderDecisions: KnowledgeTreeNode = {
    id: "older-decisions",
    anchorId: "older-decisions",
    label: "Older decisions and review options",
    shortLabel: "Older decisions",
    badge: `${olderReviewModules.length + 8} Resources`,
    nodeStatus: "live",
    description: isVet
      ? "Understand options when an older VA decision missed military records, left an appeal unanswered, reduced a long-standing rating, or contained an error."
      : "Audit finality-piercing vehicles (§ 3.156(c), pending NOD/SOC, § 3.156(b) Beraud/Lang, AMA § 5104(b) Hamill, § 3.344 void reductions) before pleading RO or Board CUE.",
    children: [
      {
        id: "tool-investigate",
        label: "Investigate a decision (private browser-memory screening tool)",
        shortLabel: "Investigate tool",
        resourceKind: "Tool",
        badge: "On-Device Tool",
        nodeStatus: "action",
        edgeRelation: "pierces finality",
        description: isVet
          ? "Step through short Yes / No / I'm not sure questions on your device to get a summary of what you know, records to find, and questions to discuss."
          : "Browser-memory-only three-valued screening desk coupling point-in-time CFR snapshots with § 20.1409(c) gates and audit packet export.",
        href: "/investigate",
      },
      {
        id: "tool-piercing-finality-flowchart",
        label: "Piercing-Finality Decision Flowchart (6-gate visual & outline sequence)",
        shortLabel: "Finality flowchart",
        resourceKind: "Tool",
        badge: "Interactive Diagram",
        nodeStatus: "action",
        edgeRelation: "pierces finality",
        description: isVet
          ? "Visual step-by-step map showing why void rating reductions, missing military records, and open appeals come before strict past-error (CUE) motions."
          : "Hand-laid-out 6-gate SVG & synchronized Accessible Outline auditing § 3.344 void reductions, § 3.156(c), § 3.156(b)/Hamill open claims, Nehmer, § 3.105(a) RO CUE, and § 7111 Board CUE.",
        href: "/explore/piercing-finality",
      },
      {
        id: "older-era-rules",
        label: `Finality, record-scope, and appeal rules on ${decisionDate}`,
        shortLabel: "Rules by date",
        badge: decisionDate.slice(0, 4),
        nodeStatus: "live",
        description: isVet
          ? `Shows how VA's appeal lanes, development rules, hospital-report claims, and old law numbers worked on ${decisionDate}.`
          : `Point-in-time Title 38 statutory era, appeal/development regime, Bell constructive-possession cutoff, § 3.157(b) status, and § 3.156(c) baseline for ${decisionDate}.`,
        children: [
          statuteEraNode,
          appealRegimeNode,
          developmentRegimeNode,
          bellScopeNode,
          informal3157bNode,
          sec3156cNode,
        ],
      },
      {
        id: "older-guides-checklists",
        label: "Finality, rating reduction, effective-date, and CUE guides",
        shortLabel: "Review guides",
        badge: `${olderReviewModules.length} Guides`,
        nodeStatus: "live",
        description: isVet
          ? "Guides on missing military records, wrong-address letters, improper rating reductions, retiree pay offsets, and past-error review cautions."
          : "Treatises, playbooks, and pre-filing checklists governing finality exceptions, stabilized-rating reductions, CRDP/CRSC/severance offsets, and Subpart O Board CUE.",
        children: olderReviewModules,
      },
    ],
  };

  // Branch 3: Survivor and family benefits
  const survivorGuidesAndChecklists = catalog.modules
    .filter(
      (m) =>
        (m.practiceDomains.includes("survivors-dic-accrued") ||
          m.id === "playbook-13-ancillary-grants-sah-auto-clothing-dea-spina-bifida") &&
        (m.category === "playbook" || m.category === "checklist"),
    )
    .map((m) => buildModuleLeafNode(m, mode));

  const survivorRegModules = catalog.modules
    .filter(
      (m) =>
        m.practiceDomains.includes("survivors-dic-accrued") &&
        (m.category === "authority-snapshot" || m.category === "cfr-diff"),
    )
    .map((m) => buildModuleLeafNode(m, mode));

  const branchSurvivorBenefits: KnowledgeTreeNode = {
    id: "survivor-benefits",
    anchorId: "survivor-benefits",
    label: "Survivor and family benefits",
    shortLabel: "Survivor benefits",
    illustrationSrc: "/illustrations/survivor-benefits.webp",
    badge: `${survivorGuidesAndChecklists.length + survivorRegModules.length + 2} Resources`,
    nodeStatus: "live",
    description: isVet
      ? "Guides and preparation checklists for surviving spouses, children, and parents researching DIC, the 10-year 100% rule (§ 1318), pending claims at death, and PACT Act re-evaluations."
      : "Primary-source guides and regulations governing § 1310 direct DIC, § 1318 / § 3.22(b) hypothetical entitlement, § 5121A substitution, § 3.816(f) Nehmer estates, and § 3.33 PACT Act re-evaluations.",
    children: [
      {
        id: "survivor-guides",
        label: "Survivor DIC, accrued benefits, and family checklists",
        shortLabel: "Survivor guides",
        badge: `${survivorGuidesAndChecklists.length} Guides`,
        nodeStatus: "live",
        description: isVet
          ? "Step-by-step guides and checklists for surviving family members preparing to meet an accredited representative."
          : "Playbooks and post-mortem triage checklists covering DIC, § 1318 hypothetical entitlement, substitution, Nehmer estates, and Ch. 35 DEA.",
        children: survivorGuidesAndChecklists,
      },
      {
        id: "survivor-regulations",
        label: "Survivor DIC and PACT Act re-evaluation regulations",
        shortLabel: "Survivor regulations",
        badge: "38 C.F.R. Part 3",
        nodeStatus: "live",
        description: isVet
          ? "Exact VA regulations governing 10-year total disability DIC (§ 3.22), PACT Act DIC re-evaluations (§ 3.33), and marriage/dependency rules."
          : "Point-in-time 38 C.F.R. §§ 3.5, 3.22, 3.33, 3.50–3.57, and 3.1000 snapshots and historical amendment diffs.",
        children: [
          {
            id: "surv-cfr-322",
            label: "38 C.F.R. § 3.22 DIC Benefits After 10-Year Total Disability (§ 1318)",
            shortLabel: "§ 3.22 DIC rule",
            resourceKind: "Regulation",
            badge: "Verbatim Verified",
            nodeStatus: "live",
            edgeRelation: "pierces finality",
            description:
              "Governs Dependency and Indemnity Compensation under 38 U.S.C. § 1318, including § 3.22(b) hypothetical entitlement reconstruction.",
            href: "/cfr/38-cfr-3.22",
          },
          {
            id: "surv-cfr-333",
            label: "38 C.F.R. § 3.33 PACT Act Re-Evaluation of Previously Denied DIC Claims",
            shortLabel: "§ 3.33 PACT DIC",
            resourceKind: "Regulation",
            badge: "Summary Only",
            nodeStatus: "summary",
            edgeRelation: "amends",
            description:
              "Implements 38 U.S.C. § 1305 retroactive effective-date protections for re-evaluated DIC claims (effective Jan. 23, 2024).",
            href: "/cfr/38-cfr-3.33",
          },
          ...survivorRegModules,
        ],
      },
    ],
  };

  // Branch 4: Records, forms, and unfamiliar terms
  const recordAndServiceModules = catalog.modules
    .filter((m) =>
      [
        "checklist-c-file-audit-protocol",
        "checklist-case-screening-worksheet",
        "checklist-cod-and-guard-reserve-intake-audit",
        "doctrine-evidence-medical-exams-and-lay-credibility",
        "playbook-06-nehmer-herbicide-presumptions-crsc",
        "playbook-07-statutory-presumptions-chronic-tropical-pow-als",
        "playbook-10-character-of-discharge-insanity-upgrades",
        "playbook-11-guard-reserve-adt-iadt-and-line-of-duty",
        "playbook-15-gulf-war-mucmi-burn-pits-pact-tera",
        "playbook-16-ptsd-stressors-and-mst-corroboration",
      ].includes(m.id),
    )
    .map((m) => buildModuleLeafNode(m, mode));

  const decoderTreatises = catalog.modules
    .filter((m) =>
      [
        "doctrine-forms-and-codesheet-lexicon",
        "doctrine-title-38-statutory-crosswalk",
      ].includes(m.id),
    )
    .map((m) => buildModuleLeafNode(m, mode));

  const branchRecordsAndForms: KnowledgeTreeNode = {
    id: "records-and-forms",
    anchorId: "records-and-forms",
    label: "Records, forms, and unfamiliar terms",
    shortLabel: "Records and forms",
    badge: `${recordAndServiceModules.length + decoderTreatises.length + 2} Resources`,
    nodeStatus: "live",
    description: isVet
      ? "Decode old VA form numbers, rating code-sheet shorthand, and renumbered laws—and see which military or medical records matter most."
      : "Interactive analogous-code and legacy-form decoder, 1933–1958–1991 statutory crosswalk, C-file audit protocols, and evidentiary guides.",
    children: [
      {
        id: "records-decoders",
        label: "Forms, acronyms, code-sheet numbers, and statutory crosswalk",
        shortLabel: "Decoders and crosswalk",
        badge: "Interactive Tools",
        nodeStatus: "action",
        description: isVet
          ? "Translate unfamiliar numbers like Form 8-526, 10-7131, DD 1380, hyphenated 7399-7346 codes, and old law citations."
          : `Interactive decoder (${catalog.totals.lexiconEntries} lexicon entries) and three-era Title 38 statutory crosswalk (${catalog.totals.statutoryCrosswalkEntries} mappings).`,
        children: [
          {
            id: "tool-forms-decoder",
            label: `Forms, Acronyms & Analogous Code Decoder (${catalog.totals.lexiconEntries} entries)`,
            shortLabel: "Forms decoder",
            resourceKind: "Tool",
            badge: "Interactive Tool",
            nodeStatus: "action",
            edgeRelation: "interprets",
            description: isVet
              ? "Look up old VA forms, military hospital tags, VA acronyms, and two-part hyphenated rating codes."
              : "Decodes pre-2015 informal claim forms, clinical record tags, and 38 C.F.R. §§ 4.20 / 4.27 analogous codes.",
            href: "/reference/forms-and-codes",
          },
          {
            id: "tool-statutory-crosswalk",
            label: `Three-Era Title 38 Statutory Crosswalk (${catalog.totals.statutoryCrosswalkEntries} mappings)`,
            shortLabel: "Statutory crosswalk",
            resourceKind: "Tool",
            badge: "1933 ↔ 1958 ↔ 1991",
            nodeStatus: "action",
            edgeRelation: "amends",
            description: isVet
              ? "Match older WWII, Korea, and Vietnam law citations (like Vet. Reg. No. 1(a) or § 310 / § 3010) to modern law numbers."
              : "Bidirectional Era A (1933–1958), Era B (1959–1991), and Era C (May/Aug. 1991–Present) statutory lookup.",
            href: "/crosswalk",
          },
          ...decoderTreatises,
        ],
      },
      {
        id: "records-evidence-service",
        label: "C-file checklists, discharge status, toxic exposure, and stressor proof",
        shortLabel: "Evidence and service",
        badge: `${recordAndServiceModules.length} Guides`,
        nodeStatus: "live",
        description: isVet
          ? "Checklists and guides for requesting C-files, reviewing discharge upgrades, Agent Orange / PACT Act exposure, Guard/Reserve injuries, and PTSD/MST records."
          : "C-file audit protocols, Character of Discharge (§ 3.12), Guard/Reserve LOD, Nehmer/PACT/TERA presumptions, PTSD/MST corroboration, and exam adequacy.",
        children: recordAndServiceModules,
      },
    ],
  };

  // Branch 5: Law, cases, and historical changes
  const eraLensNodes = catalog.modules
    .filter((m) => m.category === "era-lens")
    .map((m) => buildModuleLeafNode(m, mode));

  const caseAndLitigationNodes = catalog.modules
    .filter((m) =>
      [
        "doctrine-vaopgcprec-master-index",
        "doctrine-authority-verification-log",
        "doctrine-cavc-federal-circuit-writs-and-class-actions",
        "checklist-cavc-appeal-eaja-and-fee-compliance-gate",
        "playbook-17-section-1151-va-malpractice-and-ftca-interplay",
        "playbook-emergency-medical-reimbursement-1725-1728-and-pcafc",
        "playbook-vre-chapter-31-retroactive-induction-and-rudisill",
      ].includes(m.id),
    )
    .map((m) => buildModuleLeafNode(m, mode));

  const chronoMatrixMod = catalog.modules.find(
    (m) => m.id === "doctrine-master-chronological-matrix",
  );

  const branchLawAndCases: KnowledgeTreeNode = {
    id: "law-and-cases",
    anchorId: "law-and-cases",
    label: "Law, cases, and historical changes",
    shortLabel: "Law and cases",
    badge: `${catalog.totals.cfrSectionsIndexed} Regs · ${catalog.totals.precedentsIndexed} Cases`,
    nodeStatus: "live",
    description: isVet
      ? "Read VA regulations as written on any decision date, browse court rulings and VA General Counsel opinions by era, and explore how VA rules changed from 1945 to today."
      : `Point-in-time 38 C.F.R. index (${catalog.totals.cfrSectionsIndexed} sections / ${catalog.totals.cfrVersionRecords} snapshots), ${catalog.totals.precedentsIndexed} judicial & VAOPGCPREC authorities, and 5 chronological Era Lenses.`,
    children: [
      {
        id: "law-regulations-hub",
        label: `Point-in-time 38 C.F.R. regulations (${catalog.totals.cfrSectionsIndexed} sections)`,
        shortLabel: "Regulations by date",
        badge: `${catalog.totals.cfrVersionRecords} Snapshots`,
        nodeStatus: "live",
        description: isVet
          ? "Look up any indexed VA regulation as it read on your decision date and compare before-and-after rule changes."
          : "Full 38 C.F.R. Part 3, Part 4, Part 14, and Part 20 point-in-time index with side-by-side redlines and quarantined notice watchlists.",
        children: [
          {
            id: "hub-cfr-index",
            label: `Browse All ${catalog.totals.cfrSectionsIndexed} Point-in-Time 38 C.F.R. Sections & Redlines`,
            shortLabel: "38 C.F.R. index",
            resourceKind: "Regulation",
            badge: "Verbatim + Redlines",
            nodeStatus: "live",
            edgeRelation: "amends",
            description: isVet
              ? "Search or browse VA disability, procedural, survivor, and appeal regulations by section number and date."
              : `Index of ${catalog.totals.cfrSectionsIndexed} compiled 38 C.F.R. sections across ${catalog.totals.cfrVersionRecords} historical Federal Register snapshots.`,
            href: "/cfr",
          },
          {
            id: "cfr-312-cod",
            label: "38 C.F.R. § 3.12 Character of Discharge (Pre- vs. Post-June 25, 2024)",
            shortLabel: "§ 3.12 discharge rule",
            resourceKind: "Regulation",
            badge: "Primary Source Live",
            nodeStatus: "live",
            edgeRelation: "amends",
            description:
              "Compares the June 25, 2024 Character of Discharge overhaul (89 FR 32361, pub. Apr. 26, 2024) against prior bars and compelling-circumstances rules.",
            href: "/cfr/38-cfr-3.12a-l",
          },
          {
            id: "cfr-201403-cue",
            label: "38 C.F.R. §§ 20.1403–20.1409 Board CUE Standards & George Collateral Limits",
            shortLabel: "§§ 20.1403–20.1409 CUE",
            resourceKind: "Regulation",
            badge: "Primary Source Live",
            nodeStatus: "live",
            edgeRelation: "limits",
            description:
              "Verbatim Subpart O Board CUE rules including § 20.1403(e) invalidated-regulation bar (George) and § 20.1409(c) one-final-merits-decision finality.",
            href: "/cfr/38-cfr-20.1400-20.1411",
          },
        ],
      },
      {
        id: "law-cases-hub",
        label: `Court decisions, VAOPGCPREC opinions, and special statutory remedies (${catalog.totals.precedentsIndexed} authorities)`,
        shortLabel: "Cases and opinions",
        badge: `${catalog.totals.precedentsIndexed} Authorities`,
        nodeStatus: "live",
        description: isVet
          ? "Search landmark Supreme Court, Federal Circuit, CAVC, and VA General Counsel rulings organized by decade—plus § 1151, emergency medical, and VR&E guides."
          : "Era-filterable SCOTUS, Fed. Cir., CAVC, binding/withdrawn VAOPGCPREC directory with Rule 30(a) guardrails, plus CAVC/EAJA, § 1151, §§ 1725/1728, and Ch. 31 VR&E modules.",
        children: [
          {
            id: "hub-cases-directory",
            label: `Browse All ${catalog.totals.precedentsIndexed} Court Decisions & VAOPGCPREC Opinions`,
            shortLabel: "Cases directory",
            resourceKind: "Case",
            badge: `Checked ${catalog.checkedAsOf}`,
            nodeStatus: "live",
            edgeRelation: "interprets",
            description: isVet
              ? "Filter court rulings and VA General Counsel opinions by decision era, court level, or topic."
              : "Interactive authority directory separating decision-era governance from opinion issuance year, with CAVC Rule 30(a) and withdrawn OGC guardrails.",
            href: "/cases",
          },
          ...caseAndLitigationNodes,
        ],
      },
      {
        id: "law-eras-hub",
        label: "Historical eras and master chronology (1945–Present)",
        shortLabel: "Historical eras",
        badge: "Timeline + 5 Eras",
        nodeStatus: "live",
        description: isVet
          ? "Explore the interactive 4-track Veterans Law timeline or see how disability claims, forms, and appeal rights worked in each era from 1945 to today."
          : "Interactive 4-track chronology + quarantined rulemaking watchlist (/timeline), side-by-side 5-era statutory matrix, and decade-specific audit guides.",
        children: [
          {
            id: "tool-law-timeline",
            label: "Multi-Track Interactive Law Timeline & Quarantined Rulemaking Watchlist (1945–2026)",
            shortLabel: "Law timeline",
            resourceKind: "Tool",
            badge: "4 Tracks + Watchlist",
            nodeStatus: "action",
            edgeRelation: "amends",
            description: isVet
              ? "Interactive timeline of major VA laws, claim rules, rating-schedule updates, and court rulings—plus a watchlist of proposed rules that are not enacted law."
              : "Compiled 4-track chronology (Statutes, Part 3, Part 4 VASRD, Precedents) with Retroactive Opportunity vs. Trap split cards and toggleable RIN / FR quarantine watchlist.",
            href: "/timeline",
          },
          {
            id: "hub-eras-overview",
            label: "Five Historical Eras Overview, Definitions & Statutory Matrix (1945–Present)",
            shortLabel: "All five eras",
            resourceKind: "Guide",
            badge: "Plain-English Ready",
            nodeStatus: "live",
            edgeRelation: "interprets",
            description:
              "Side-by-side comparison of statutes, claim forms, appeal pipelines, and record rules across all five Veterans Law eras.",
            href: "/eras",
          },
          ...(chronoMatrixMod ? [buildModuleLeafNode(chronoMatrixMod, mode)] : []),
          ...eraLensNodes,
        ],
      },
    ],
  };

  return {
    id: "browse-root",
    label: isVet
      ? `Browse Topics & Situations (${decisionDate})`
      : `Browse Title 38 Topics & Authorities (${decisionDate})`,
    shortLabel: "Browse topics",
    badge: `${catalog.totals.upstreamModules} Source Modules`,
    nodeStatus: "live",
    defaultExpanded: true,
    description: isVet
      ? "Start with a topic below to find plain-English guides, rating schedules, record checklists, and the rules in effect on your selected Decision Date."
      : "Visitor-need directory and point-in-time authority map generated from compiled primary-source coverage data.",
    children: [
      branchDisabilityRatings,
      branchOlderDecisions,
      branchSurvivorBenefits,
      branchRecordsAndForms,
      branchLawAndCases,
    ],
  };
}
