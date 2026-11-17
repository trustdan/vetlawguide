import { describe, expect, it } from "vitest";
import {
  matchesDiagnosticCode,
  normalizeCfrSlug,
  resolveCfrAtDate,
  validateCfrVersionChains,
} from "@/lib/corpus/temporal";
import type { CfrVersionRecord } from "@/lib/corpus/types";

const MUSCLE_INJURY_VERSIONS: CfrVersionRecord[] = [
  {
    version_id: "38-cfr-4.56-1946-1997",
    cfr_section: "38 C.F.R. § 4.56",
    heading: "Factors to be considered in the evaluation of disabilities residual to healed wounds involving muscle groups",
    regulatory_status: "repealed-historical",
    federal_register_citation: "29 FR 6718 (May 22, 1964)",
    publication_date: "1964-05-22",
    effective_from: "1946-04-01",
    effective_to: "1997-07-02",
    supersedes: null,
    superseded_by: "38-cfr-4.56-1997-present",
    verbatim_text_status: "verbatim-govinfo-ecfr",
  },
  {
    version_id: "38-cfr-4.56-1997-present",
    cfr_section: "38 C.F.R. § 4.56",
    heading: "Evaluation of muscle disabilities",
    regulatory_status: "final-effective",
    federal_register_citation: "62 FR 30235 (June 3, 1997)",
    publication_date: "1997-06-03",
    effective_from: "1997-07-03",
    effective_to: "present",
    supersedes: "38-cfr-4.56-1946-1997",
    superseded_by: null,
    verbatim_text_status: "verbatim-federal-register",
  },
  {
    version_id: "38-cfr-4.56-hypothetical-proposal",
    cfr_section: "38 C.F.R. § 4.56",
    heading: "Proposed revision (not enacted)",
    regulatory_status: "proposed-nonbinding",
    federal_register_citation: "90 FR 46542",
    publication_date: "2025-09-29",
    effective_from: "2025-09-29",
    effective_to: "present",
    supersedes: null,
    superseded_by: null,
    verbatim_text_status: "summary-only-pull-print-cfr-before-cue",
  },
];

describe("Bitemporal 38 C.F.R. Resolution & Chain Validation", () => {
  it("normalizes standard, former, and nested-parenthetical CFR citations into canonical slugs", () => {
    expect(normalizeCfrSlug("38 C.F.R. § 4.56")).toBe("38-cfr-4.56");
    expect(normalizeCfrSlug("former 38 C.F.R. § 3.157(b)")).toBe("38-cfr-3.157b");
    expect(
      normalizeCfrSlug(
        "38 C.F.R. Part 71 (§§ 71.15, 71.20, 71.25, 71.40(c)(4), 71.45 — PCAFC) & §§ 17.4000, 17.4020(c) (Community Care 72-Hour Notice)",
      ),
    ).toBe("38-cfr-part-71-17.4000-17.4020c");
  });

  it("enforces Effective Date over Federal Register Publication Date (June 20, 1997 trap)", () => {
    // 62 FR 30235 was PUBLISHED June 3, 1997, but EFFECTIVE July 3, 1997.
    // A June 20, 1997 rating decision MUST resolve to the pre-1997 text!
    const june1997 = resolveCfrAtDate(
      MUSCLE_INJURY_VERSIONS,
      "38 C.F.R. § 4.56",
      "1997-06-20",
    );
    expect(june1997.doNotRely).toBe(false);
    expect(june1997.coverageState).toBe("VERBATIM_VERIFIED");
    expect(june1997.governingVersion?.version_id).toBe("38-cfr-4.56-1946-1997");
    expect(june1997.governingVersion?.permalink).toBe("/cfr/38-cfr-4.56/1946-04-01");

    const july1997 = resolveCfrAtDate(
      MUSCLE_INJURY_VERSIONS,
      "38 C.F.R. § 4.56",
      "1997-07-03",
    );
    expect(july1997.governingVersion?.version_id).toBe("38-cfr-4.56-1997-present");
    expect(july1997.governingVersion?.permalink).toBe("/cfr/38-cfr-4.56/1997-07-03");
  });

  it("never resolves proposed-nonbinding or rescinded rules as governing law", () => {
    const res = resolveCfrAtDate(MUSCLE_INJURY_VERSIONS, "38-cfr-4.56", "2026-01-15");
    expect(res.governingVersion?.version_id).toBe("38-cfr-4.56-1997-present");
    expect(res.quarantinedWatchlist).toHaveLength(1);
    expect(res.quarantinedWatchlist[0]?.version_id).toBe("38-cfr-4.56-hypothetical-proposal");
  });

  it("returns explicit CORPUS_GAP_OR_QUEUED_WAVE (doNotRely: true) instead of silent fallback", () => {
    const pre1946 = resolveCfrAtDate(MUSCLE_INJURY_VERSIONS, "38-cfr-4.56", "1944-12-01");
    expect(pre1946.coverageState).toBe("CORPUS_GAP_OR_QUEUED_WAVE");
    expect(pre1946.doNotRely).toBe(true);
    expect(pre1946.governingVersion).toBeNull();

    const unindexedSection = resolveCfrAtDate(
      MUSCLE_INJURY_VERSIONS,
      "38 C.F.R. § 4.999",
      "2020-01-01",
    );
    expect(unindexedSection.coverageState).toBe("CORPUS_GAP_OR_QUEUED_WAVE");
    expect(unindexedSection.doNotRely).toBe(true);
  });

  it("detects date gaps, overlaps, and asymmetric supersedes pointers", () => {
    expect(validateCfrVersionChains(MUSCLE_INJURY_VERSIONS)).toEqual([]);

    const gappedChain: CfrVersionRecord[] = [
      {
        ...MUSCLE_INJURY_VERSIONS[0]!,
        effective_to: "1997-06-30", // Leaves July 1–2, 1997 unaccounted!
      },
      MUSCLE_INJURY_VERSIONS[1]!,
    ];
    const gapErrors = validateCfrVersionChains(gappedChain);
    expect(gapErrors.some((e) => e.includes("Unaccounted date gap"))).toBe(true);
  });

  it("matches exact and hyphen-range VASRD Diagnostic Codes deterministically", () => {
    expect(matchesDiagnosticCode("5301-5323", "5313")).toBe(true);
    expect(matchesDiagnosticCode("5301-5323", "5301")).toBe(true);
    expect(matchesDiagnosticCode("5301-5323", "7804")).toBe(false);
    expect(matchesDiagnosticCode("7804", "7804")).toBe(true);
    expect(matchesDiagnosticCode("7804", "780")).toBe(false);
  });

  it("unifies 1-to-1 supersedes chains with historical wording variations onto one concise sectionSlug while keeping cross-section consolidations distinct (ADR-0005)", () => {
    const waiverAndConsolidationChain: CfrVersionRecord[] = [
      {
        version_id: "38-cfr-1.963b2-pre2026-180day-waiver",
        cfr_section: "former 38 C.F.R. § 1.963(b)(1)–(2)",
        heading: "Waiver; other than loan guaranty (180-Day Window)",
        regulatory_status: "repealed-historical",
        publication_date: "1983-06-15",
        effective_from: "1983-04-01",
        effective_to: "2026-01-25",
        supersedes: null,
        superseded_by: "38-cfr-1.963b-2026-1yr-waiver",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      },
      {
        version_id: "38-cfr-1.963b-2026-1yr-waiver",
        cfr_section: "38 C.F.R. § 1.963(a)–(b)",
        heading: "Waiver; other than loan guaranty (1-Year Window)",
        regulatory_status: "final-effective",
        federal_register_citation: "90 FR 54234 (Nov. 26, 2025)",
        publication_date: "2025-11-26",
        effective_from: "2026-01-26",
        effective_to: "present",
        supersedes: "38-cfr-1.963b2-pre2026-180day-waiver",
        superseded_by: null,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      },
      {
        version_id: "38-cfr-4.16c-1989-1996",
        cfr_section: "former 38 C.F.R. § 4.16(c)",
        regulatory_status: "repealed-historical",
        effective_from: "1989-03-01",
        effective_to: "1996-11-06",
        supersedes: null,
        superseded_by: "38-cfr-4.130-1996-dsm4",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      },
      {
        version_id: "38-cfr-4.132-1946-pre1996",
        cfr_section: "former 38 C.F.R. § 4.132",
        regulatory_status: "repealed-historical",
        effective_from: "1946-04-01",
        effective_to: "1996-11-06",
        supersedes: null,
        superseded_by: "38-cfr-4.130-1996-dsm4",
        verbatim_text_status: "verbatim-govinfo-ecfr",
      },
      {
        version_id: "38-cfr-4.130-1996-dsm4",
        cfr_section: "38 C.F.R. § 4.130",
        regulatory_status: "final-effective",
        effective_from: "1996-11-07",
        effective_to: "present",
        supersedes: "38-cfr-4.132-1946-pre1996",
        superseded_by: null,
        verbatim_text_status: "verbatim-govinfo-ecfr",
      },
    ];

    const pre2026 = resolveCfrAtDate(
      waiverAndConsolidationChain,
      "38 C.F.R. § 1.963(a)–(b)",
      "2025-12-15",
    );
    expect(pre2026.doNotRely).toBe(false);
    expect(pre2026.governingVersion?.version_id).toBe(
      "38-cfr-1.963b2-pre2026-180day-waiver",
    );

    const post2026 = resolveCfrAtDate(
      waiverAndConsolidationChain,
      "former 38 C.F.R. § 1.963(b)(1)–(2)",
      "2026-02-01",
    );
    expect(post2026.governingVersion?.version_id).toBe(
      "38-cfr-1.963b-2026-1yr-waiver",
    );
    expect(pre2026.sectionSlug).toBe(post2026.sectionSlug);
    expect(pre2026.sectionSlug.length).toBeLessThanOrEqual(48);

    // Cross-section consolidation (§ 4.16(c) -> § 4.130) must NOT merge § 4.16(c) into § 4.130's slug
    const sec416c = resolveCfrAtDate(
      waiverAndConsolidationChain,
      "former 38 C.F.R. § 4.16(c)",
      "1992-05-01",
    );
    const sec4130 = resolveCfrAtDate(
      waiverAndConsolidationChain,
      "38 C.F.R. § 4.130",
      "2005-05-01",
    );
    expect(sec416c.sectionSlug).not.toBe(sec4130.sectionSlug);
  });
});
