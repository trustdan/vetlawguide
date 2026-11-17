import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareCfrVersions,
  computeInlineRedline,
  computeParagraphAlignedRedline,
} from "@/lib/corpus/diff";
import { compileCorpusFromDisk } from "@/lib/corpus/compiler";
import { buildBitemporalTwoPaneContext } from "@/lib/corpus/temporal";
import { resolveCfrAtDate } from "@/lib/corpus/temporal";

const REPO_ROOT = resolve(__dirname, "..", "..");

describe("Deterministic Legal Redline Diff Engine (lib/corpus/diff.ts)", () => {
  it("computes word-and-punctuation inline redlines without losing whitespace or section symbols", () => {
    const pre1997 =
      "§ 4.56 Factors to be considered in the evaluation of disabilities residual to healed wounds involving muscle groups.";
    const post1997 = "§ 4.56 Evaluation of muscle disabilities.";

    const segments = computeInlineRedline(pre1997, post1997);
    const reconstructedBefore = segments
      .filter((s) => s.kind !== "added")
      .map((s) => s.text)
      .join("");
    const reconstructedAfter = segments
      .filter((s) => s.kind !== "removed")
      .map((s) => s.text)
      .join("");

    expect(reconstructedBefore).toBe(pre1997);
    expect(reconstructedAfter).toBe(post1997);
    expect(segments.some((s) => s.kind === "removed" && s.text.includes("Factors"))).toBe(
      true,
    );
    expect(segments.some((s) => s.kind === "added" && s.text.includes("Evaluation"))).toBe(
      true,
    );
  });

  it("aligns multi-paragraph regulatory clauses and detects newly added floor paragraphs (§ 4.56(b))", () => {
    const before = [
      "§ 4.56 Factors to be considered in the evaluation of disabilities.",
      "Moderate disability: Through and through or deep penetrating wounds of relatively short track, without explosive effect of high velocity missile, residuals of debridement or prolonged infection.",
    ].join("\n\n");

    const after = [
      "§ 4.56 Evaluation of muscle disabilities.",
      "(b) A through-and-through injury with muscle damage shall be evaluated as no less than a moderate injury for each group of muscles damaged.",
      "Moderate disability: Through and through or deep penetrating wound of short track, without explosive effect of high velocity missile, residuals of debridement, or prolonged infection.",
    ].join("\n\n");

    const rows = computeParagraphAlignedRedline(before, after);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(
      rows.some(
        (r) =>
          r.changeKind === "added" &&
          r.afterParagraph?.includes("no less than a moderate injury"),
      ),
    ).toBe(true);

    const fullComparison = compareCfrVersions(
      "Pre-1997 (§ 4.56)",
      before,
      "Post-1997 (§ 4.56)",
      after,
    );
    expect(fullComparison.stats.addedTokens).toBeGreaterThan(10);
    expect(fullComparison.stats.changedParagraphs).toBeGreaterThanOrEqual(2);
  });
});

describe("Wave 1 Point-in-Time CFR Decomposition, Quarantine & Two-Pane Resolution", () => {
  it("extracts verbatim snapshots for § 4.56, § 4.118 (all 4 eras + 90 FR 46542 quarantine), and § 3.156(c) while marking Wave 2–4 sections HELD_AT_BOOKMARK_GATE", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);
    const bySlug = new Map(bundle.cfrSections.map((s) => [s.sectionSlug, s]));

    // 1. § 4.56 Muscle Injuries (Pre-July 3, 1997 vs. Current)
    const sec456 = bySlug.get("38-cfr-4.56");
    expect(sec456).toBeDefined();
    expect(sec456?.bookmarkStatus).toBe("WAVE_1_LIVE_VERBATIM");
    expect(sec456?.coverageState).toBe("VERBATIM_VERIFIED");
    expect(sec456?.versions).toHaveLength(2);
    expect(sec456?.versions[0]?.verbatimMarkdown).toContain(
      "Factors to be considered in the evaluation of disabilities",
    );
    expect(sec456?.versions[1]?.verbatimMarkdown).toContain(
      "shall be evaluated as no less than a moderate injury",
    );
    expect(sec456?.trapTables.length).toBeGreaterThanOrEqual(1);
    expect(sec456?.veteranOverlay).not.toBeNull();

    // Verify June 20, 1997 FR Pub-vs-Effective boundary on compiled versions
    const june20 = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-4.56", "1997-06-20");
    expect(june20.governingVersion?.version_id).toBe("38-cfr-4.56-1946-pre1997");

    // 2. § 4.118 Scars (5 Enacted Eras 1946 -> 1978 -> 2002 -> 2008 -> 2018 + Quarantined 90 FR 46542)
    const sec4118 = bySlug.get("38-cfr-4.118");
    expect(sec4118).toBeDefined();
    expect(sec4118?.bookmarkStatus).toBe("WAVE_1_LIVE_VERBATIM");
    expect(sec4118?.versions.map((v) => v.effective_from)).toEqual([
      "1946-04-01",
      "1978-10-02",
      "2002-08-30",
      "2008-10-23",
      "2018-08-13",
    ]);
    // 1946 pre-1978 is SUMMARY_ONLY; 1978 and 2002 have unabridged verbatim blocks; 2008 & 2018 are SUMMARY_ONLY
    expect(sec4118?.versions[0]?.coverageState).toBe("SUMMARY_ONLY");
    expect(sec4118?.versions[1]?.coverageState).toBe("VERBATIM_VERIFIED");
    expect(sec4118?.versions[2]?.coverageState).toBe("VERBATIM_VERIFIED");
    expect(sec4118?.versions[3]?.coverageState).toBe("SUMMARY_ONLY");
    expect(sec4118?.versions[4]?.coverageState).toBe("SUMMARY_ONLY");
    const scarsDiff = compareCfrVersions(
      "1978",
      sec4118!.versions[1]!.verbatimMarkdown!,
      "2002",
      sec4118!.versions[2]!.verbatimMarkdown!,
    );
    expect(scarsDiff.stats.changedParagraphs).toBeGreaterThan(2);
    expect(
      sec4118?.quarantinedWatchlist.some((q) =>
        q.federal_register_citation?.includes("90 FR 46542"),
      ),
    ).toBe(true);

    // Pre-2002 scar decision in 1995 resolves to 1978-10-02 print text (single 10% DC 7804 cap), while 1970 resolves to 1946 SUMMARY_ONLY with zero false statutory-lag alert
    const scar1995 = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-4.118", "1995-05-10");
    expect(scar1995.governingVersion?.version_id).toBe("38-cfr-4.118-1978-pre2002");
    const scar1970Pane = buildBitemporalTwoPaneContext(
      "1970-06-01",
      bundle.cfrVersions.filter((v) => v.sectionSlug === "38-cfr-4.118"),
    );
    expect(scar1970Pane.publicationGapTrapAlert).toBeNull();

    // 3. § 3.156(c) Service Department Records (1962-01-01 vs. 2006-10-06) + valid eCFR URLs
    const sec3156c = bySlug.get("38-cfr-3.156c");
    expect(sec3156c).toBeDefined();
    expect(sec3156c?.bookmarkStatus).toBe("WAVE_1_LIVE_VERBATIM");
    expect(sec3156c?.officialEcfrUrl).toBe(
      "https://www.ecfr.gov/current/title-38/chapter-I/part-3/section-3.156",
    );
    expect(bySlug.get("38-cfr-4.71a-4.73")?.officialEcfrUrl).toBe(
      "https://www.ecfr.gov/current/title-38/chapter-I/part-4/section-4.71a",
    );
    expect(bySlug.get("38-cfr-4.71a-4.73")?.versions).toHaveLength(5);
    expect(bySlug.get("38-cfr-3.157b")?.officialEcfrUrl).toBe(
      "https://www.ecfr.gov/current/title-38/chapter-I/part-3",
    );
    expect(bySlug.get("38-cfr-4.120-4.124a-proposed")?.officialEcfrUrl).toBe(
      "https://www.ecfr.gov/current/title-38/chapter-I/part-4",
    );
    expect(sec3156c?.versions).toHaveLength(2);
    const sept2006 = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-3.156c", "2006-09-20");
    expect(sept2006.governingVersion?.version_id).toBe("38-cfr-3.156c-1962-pre2006");

    // 4. § 4.16 TDIU (unlocked in E5-S3: 1975 base stays SUMMARY_ONLY, 1990 marginal-employment rule is VERBATIM_VERIFIED) + § 3.317 stays SUMMARY_ONLY across both cfrSections and cfrVersions
    const sec416 = bySlug.get("38-cfr-4.16a-b");
    expect(sec416).toBeDefined();
    expect(sec416?.bookmarkStatus).toBe("WAVE_1_LIVE_VERBATIM");
    expect(sec416?.heldWaveId).toBeNull();
    expect(sec416?.coverageState).toBe("PLAIN_ENGLISH_IN_PROGRESS");
    expect(
      (sec416?.companionModules ?? []).some((m) =>
        m.route.includes("38-cfr-4.16-tdiu-evolution"),
      ),
    ).toBe(true);
    const resolved416Pre1990 = resolveCfrAtDate(
      bundle.cfrVersions,
      "38-cfr-4.16a-b",
      "1985-01-01",
    );
    expect(resolved416Pre1990.coverageState).toBe("SUMMARY_ONLY");
    const resolved416Post1990 = resolveCfrAtDate(
      bundle.cfrVersions,
      "38-cfr-4.16a-b",
      "2020-01-01",
    );
    expect(resolved416Post1990.coverageState).toBe("VERBATIM_VERIFIED");

    const sec3317 = bySlug.get("38-cfr-3.317");
    expect(sec3317?.bookmarkStatus).toBe("SUMMARY_ONLY");
    expect(sec3317?.coverageState).toBe("SUMMARY_ONLY");
    const resolved3317 = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-3.317", "2020-01-01");
    expect(resolved3317.coverageState).toBe("SUMMARY_ONLY");

    // 5. Enacted sections with active NPRMs carry quarantinedWatchlist records & Part 3 sections never inherit Part 4 vasrdSystem tags
    expect(bySlug.get("38-cfr-4.130")?.quarantinedWatchlist.length).toBeGreaterThanOrEqual(1);
    expect(bySlug.get("38-cfr-4.116")?.quarantinedWatchlist.length).toBeGreaterThanOrEqual(1);
    expect(bySlug.get("38-cfr-4.96-4.97")?.quarantinedWatchlist.length).toBeGreaterThanOrEqual(1);
    expect(
      bySlug.get("38-cfr-part-71-17.4000-17.4020c")?.quarantinedWatchlist.length,
    ).toBeGreaterThanOrEqual(1);
    expect(bySlug.get("38-cfr-3.816")?.vasrdSystem).toBeNull();
    expect(bySlug.get("38-cfr-3.810a")?.vasrdSystem).toBeNull();

    // 6. Precedents separate CAVC Rule 30(a) from Fed. Cir. R. 32.1 nonprecedential dispositions
    const fedCirNonprec = bundle.precedents.filter((p) => p.isNonprecedentialFedCir);
    expect(fedCirNonprec.length).toBeGreaterThanOrEqual(2);
    expect(fedCirNonprec.every((p) => !p.isNonprecedentialRule30a)).toBe(true);
  });

  it("computes deterministic Two-Pane T0 vs. T_now statutory eras, Bell/§ 3.157(b) record rules, and FR pub-gap alerts", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);

    // June 20, 1997 sits inside 62 FR 30235's 30-day publication-to-effective window!
    const ctxJune1997 = buildBitemporalTwoPaneContext(
      "1997-06-20",
      bundle.cfrVersions.filter((v) => v.sectionSlug === "38-cfr-4.56"),
    );
    expect(ctxJune1997.publicationGapTrapAlert).toContain("1997-06-03");
    expect(ctxJune1997.publicationGapTrapAlert).toContain("1997-07-03");
    expect(ctxJune1997.recordScopeRuleThen).toContain("Bell v. Derwinski");
    expect(ctxJune1997.informalClaimRuleThen).toContain("3.157(b)");

    // Korean-era 1954 decision -> Era A Vet. Reg. No. 1(a) + pre-Bell record scope
    const ctx1954 = buildBitemporalTwoPaneContext("1954-06-15", []);
    expect(ctx1954.statutoryEraLabel).toContain("Veterans' Regulation");
    expect(ctx1954.recordScopeRuleThen).toContain("prior to July 21, 1992");

    // 91-day 1991 statutory renumbering split (June 15, 1991)
    const ctx1991Split = buildBitemporalTwoPaneContext("1991-06-15", []);
    expect(ctx1991Split.statutoryEraDetail).toContain("Pub. L. 102-40");
    expect(ctx1991Split.statutoryEraDetail).toContain("Pub. L. 102-83");

    // Modern post-AMA decision -> post-Bell + post-§ 3.157(b) repeal + George / § 20.1409(c) precision
    const ctx2024 = buildBitemporalTwoPaneContext("2024-07-01", []);
    expect(ctx2024.informalClaimRuleThen).toContain("March 24, 2015");
    expect(
      ctx2024.collateralLimitsToday.some((c) => c.citation.includes("20.1409(c)")),
    ).toBe(true);
  });
});
