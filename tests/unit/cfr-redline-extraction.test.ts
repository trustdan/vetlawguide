import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compileCorpusFromDisk, type CompiledCorpusBundle } from "../../lib/corpus/compiler";
import { compareCfrVersions } from "../../lib/corpus/diff";
import {
  buildBitemporalTwoPaneContext,
  resolveCfrAtDate,
  resolveWave1CfrHref,
  validateCfrVersionChains,
} from "../../lib/corpus/temporal";

const REPO_ROOT = resolve(__dirname, "..", "..");

describe("E5-S3 Multi-Era Heading Decomposition & Deterministic CFR Redlines", () => {
  let bundle: CompiledCorpusBundle;

  beforeAll(() => {
    bundle = compileCorpusFromDisk(REPO_ROOT);
  });

  it("maintains unbroken doubly-linked CFR version chains and unique static permalinks after E5-S3 enrichment", () => {
    expect(validateCfrVersionChains(bundle.cfrVersions)).toEqual([]);

    const permalinks = new Set<string>();
    for (const sec of bundle.cfrSections) {
      for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
        expect(permalinks.has(ver.permalink)).toBe(false);
        permalinks.add(ver.permalink);
      }
    }
  });

  it("extracts multi-era verbatim snapshots across E5-S3 Part 3, Part 4, Part 14 & Part 20 sections without GitHub alert contamination", () => {
    const bySlug = new Map(bundle.cfrSections.map((s) => [s.sectionSlug, s]));

    // 1. § 3.12 Character of Discharge (1963 SUMMARY_ONLY -> 2022 pre-2024 verbatim -> June 25, 2024 compelling circumstances verbatim)
    const cod = bySlug.get("38-cfr-3.12a-l");
    expect(cod).toBeDefined();
    expect(cod!.versions.map((v) => v.version_id)).toEqual([
      "38-cfr-3.12-1963-pre2022-cod",
      "38-cfr-3.12-pre2024-cod",
      "38-cfr-3.12-2024-cod",
    ]);
    expect(cod!.versions[0]!.coverageState).toBe("SUMMARY_ONLY");
    expect(cod!.versions[1]!.coverageState).toBe("VERBATIM_VERIFIED");
    expect(cod!.versions[2]!.coverageState).toBe("VERBATIM_VERIFIED");
    expect(cod!.versions[1]!.verbatimMarkdown).toContain(
      "Homosexual acts involving aggravating circumstances",
    );
    expect(cod!.versions[2]!.verbatimMarkdown).toContain("Compelling circumstances exception");
    expect(cod!.versions[2]!.verbatimMarkdown).not.toContain("[!WARNING]");

    // 2. § 4.16 TDIU: 1975 SUMMARY_ONLY, 1990–2014 'Compensation and Pension Service' VERBATIM_VERIFIED, 2014–present 'Compensation Service' VERBATIM_VERIFIED; former § 4.16(c) separate with successorSection link
    const tdiu = bySlug.get("38-cfr-4.16a-b");
    const tdiu416c = bySlug.get("38-cfr-4.16c");
    expect(tdiu).toBeDefined();
    expect(tdiu416c).toBeDefined();
    expect(tdiu!.versions.map((v) => v.version_id)).toEqual([
      "38-cfr-4.16-1975-base",
      "38-cfr-4.16a-1990-marginal",
      "38-cfr-4.16a-2014-current",
    ]);
    expect(tdiu!.versions[0]!.coverageState).toBe("SUMMARY_ONLY");
    expect(tdiu!.versions[1]!.coverageState).toBe("VERBATIM_VERIFIED");
    expect(tdiu!.versions[1]!.verbatimMarkdown).toContain(
      "Director, Compensation and Pension Service",
    );
    expect(tdiu!.versions[2]!.coverageState).toBe("VERBATIM_VERIFIED");
    expect(tdiu!.versions[2]!.verbatimMarkdown).toContain("Director, Compensation Service");
    expect(tdiu416c!.versions[0]!.coverageState).toBe("VERBATIM_VERIFIED");
    expect(tdiu416c!.versions[0]!.verbatimMarkdown).toContain(
      "mental disorder assigned a 70 percent evaluation",
    );
    expect(tdiu416c!.successorSection?.permalink).toBe("/cfr/38-cfr-4.130/1996-11-07");
    expect(tdiu!.relatedComparisonSnapshots).toBeUndefined();

    // 3. § 3.350(a) Breast SMC(k) 4-era non-overlapping chain (2000 statutory SUMMARY_ONLY -> 2002-03-18 mastectomy CFR -> 2002-12-06 Pub. L. 107-330 statutory lag -> 2003-09-26 >=25% tissue / radiation CFR)
    const smck = bySlug.get("38-cfr-3.350a-3.350a7");
    expect(smck).toBeDefined();
    expect(smck!.versions.map((v) => v.effective_from)).toEqual([
      "2000-11-01",
      "2002-03-18",
      "2002-12-06",
      "2003-09-26",
    ]);
    expect(smck!.versions[0]!.coverageState).toBe("SUMMARY_ONLY");
    expect(smck!.versions[1]!.verbatimMarkdown).toContain("complete surgical removal of breast tissue");
    expect(smck!.versions[2]!.coverageState).toBe("SUMMARY_ONLY");
    expect(smck!.versions[3]!.verbatimMarkdown).toContain("radiation treatment of breast tissue");
    expect(smck!.versions[3]!.verbatimMarkdown).toContain("**(6) Aphonia.**");
    expect(smck!.versions[3]!.scopedExcerpts?.["sec-3.350-breast"]).not.toContain("Creative organ");
    expect(bySlug.get("38-cfr-3.350f3-5")?.versions[1]?.coverageState).toBe("VERBATIM_VERIFIED");
    expect(bySlug.get("38-cfr-3.350j-3.352b-3.552b2")?.versions[0]?.coverageState).toBe(
      "VERBATIM_VERIFIED",
    );
    // Zero h3Includes prefix collision on § 3.810(a), § 3.400(g), and § 3.304(f)
    const sec3810 = bySlug.get("38-cfr-3.810a");
    expect(sec3810?.versions[1]?.verbatimMarkdown).not.toContain("3.552");
    expect(sec3810?.versions[1]?.verbatimMarkdown).not.toContain("4.63");
    const sec3400g = bySlug.get("38-cfr-3.400g");
    expect(sec3400g?.versions[0]?.verbatimMarkdown).not.toContain("3.13");
    expect(sec3400g?.versions[0]?.verbatimMarkdown).not.toContain("3.354");
    const sec3304f = bySlug.get("38-cfr-3.304f1-5");
    expect(sec3304f?.versions[2]?.verbatimMarkdown).not.toContain(
      "fear of hostile military or terrorist activity",
    );

    // 4. § 3.310 Secondary Service Connection & Aggravation (1979 -> 2001 -> 2006) + § 3.310(d) TBI
    const sec310 = bySlug.get("38-cfr-3.310a-c");
    expect(sec310).toBeDefined();
    expect(sec310!.versions.map((v) => v.effective_from)).toEqual([
      "1979-08-28",
      "2001-05-07",
      "2006-10-10",
    ]);
    expect(sec310!.versions.every((v) => v.coverageState === "VERBATIM_VERIFIED")).toBe(true);
    expect(sec310!.versions[0]!.verbatimMarkdown).not.toContain("3.300(c)");
    expect(sec310!.versions[1]!.verbatimMarkdown).toContain("3.300(c)");
    expect(sec310!.versions[2]!.verbatimMarkdown).toContain("Aggravation of nonservice-connected disabilities");
    const tbi310d = bySlug.get("38-cfr-3.310d");
    expect(tbi310d?.versions[0]?.coverageState).toBe("VERBATIM_VERIFIED");
    expect(tbi310d?.versions[0]?.verbatimMarkdown).toContain("Parkinsonism");

    // 5. Unified 5-era § 4.71a Spine + Joints chain on /cfr/38-cfr-4.71a-4.73 (1946 -> 2002 -> 2003 -> 2015 -> 2021)
    const spine = bySlug.get("38-cfr-4.71a-4.73");
    expect(spine).toBeDefined();
    expect(bySlug.has("38-cfr-4.71a")).toBe(false);
    expect(spine!.versions.map((v) => v.effective_from)).toEqual([
      "1946-04-01",
      "2002-09-23",
      "2003-09-26",
      "2015-07-16",
      "2021-02-07",
    ]);
    expect(spine!.versions.every((v) => v.coverageState === "VERBATIM_VERIFIED")).toBe(true);
    expect(spine!.versions[0]!.verbatimMarkdown).toContain("5295 Lumbosacral strain");
    expect(spine!.versions[0]!.verbatimMarkdown).not.toContain("Pre-September 23, 2002 text");
    expect(spine!.versions[1]!.verbatimMarkdown).toContain("5285");
    expect(spine!.versions[1]!.verbatimMarkdown).toContain("5295");
    expect(spine!.versions[1]!.verbatimMarkdown).not.toContain("[now 5243]");
    expect(spine!.versions[2]!.verbatimMarkdown).toContain(
      "General Rating Formula for Diseases and Injuries of the Spine",
    );
    expect(spine!.versions[3]!.verbatimMarkdown).toContain(
      "For 1 year following implantation of prosthesis",
    );
    expect(spine!.versions[4]!.verbatimMarkdown).toContain(
      "General Rating Formula for Diseases and Injuries of the Spine",
    );
    expect(spine!.versions[4]!.verbatimMarkdown).toContain("5269 Plantar fasciitis");
    expect(spine!.versions[4]!.scopedExcerpts?.["spine-schedule"]).toContain(
      "General Rating Formula for Diseases and Injuries of the Spine",
    );
    // Querying "38 C.F.R. § 4.71a" resolves to canonical "38-cfr-4.71a-4.73"
    expect(
      resolveCfrAtDate(bundle.cfrVersions, "38 C.F.R. § 4.71a", "1995-04-01").sectionSlug,
    ).toBe("38-cfr-4.71a-4.73");

    // 6. §§ 4.130 / 4.132 Mental Disorders: honest SUMMARY_ONLY on abridged § 4.132 & 1996 § 4.130, VERBATIM_VERIFIED on 2014 § 4.130 DSM-5 + successorSection link on § 4.132
    const sec4132 = bySlug.get("38-cfr-4.132");
    const sec4130 = bySlug.get("38-cfr-4.130");
    expect(sec4132?.versions[0]?.coverageState).toBe("SUMMARY_ONLY");
    expect(sec4132?.successorSection?.permalink).toBe("/cfr/38-cfr-4.130/1996-11-07");
    expect(sec4130?.versions.map((v) => v.effective_from)).toEqual([
      "1996-11-07",
      "2014-08-04",
    ]);
    expect(sec4130!.versions[0]!.coverageState).toBe("SUMMARY_ONLY");
    expect(sec4130!.versions[1]!.coverageState).toBe("VERBATIM_VERIFIED");
    expect(sec4130!.versions[1]!.verbatimMarkdown).toContain("DSM-5");
    expect(sec4130!.quarantinedWatchlist.some((q) => q.federal_register_citation?.includes("2900-AQ82"))).toBe(true);

    // 7. §§ 4.110–4.114 Digestive Overhaul (2001 pre-2024 vs. May 19, 2024)
    const dig = bySlug.get("38-cfr-4.110-4.114");
    expect(dig).toBeDefined();
    expect(dig!.versions.map((v) => v.effective_from)).toEqual(["2001-07-02", "2024-05-19"]);
    expect(dig!.versions[0]!.verbatimMarkdown).toContain("7319 Irritable colon syndrome");
    expect(dig!.versions[1]!.verbatimMarkdown).toContain("7206 Gastroesophageal reflux disease");

    // 8. §§ 4.100 & 4.104 Cardiovascular 4-Era Chain (1946 -> 1998 LVEF -> 2006 § 4.100(a)-(c) -> 2021 METs)
    const cardio = bySlug.get("38-cfr-4.100-4.104");
    expect(cardio).toBeDefined();
    expect(cardio!.versions.map((v) => v.effective_from)).toEqual([
      "1946-04-01",
      "1998-01-12",
      "2006-10-06",
      "2021-11-14",
    ]);
    expect(cardio!.versions.every((v) => v.coverageState === "VERBATIM_VERIFIED")).toBe(true);
    expect(cardio!.versions[1]!.verbatimMarkdown).toContain("ejection fraction of 30 to 50 percent");
    expect(cardio!.versions[1]!.verbatimMarkdown).not.toContain("§ 4.100 Application");
    expect(cardio!.versions[2]!.verbatimMarkdown).toContain("§ 4.100 Application");
    expect(cardio!.versions[3]!.verbatimMarkdown).toContain(
      "Application of the general rating formula for diseases of the heart",
    );

    // 9. § 4.124a TBI (DC 8045 4-era chain: 1946 SUMMARY_ONLY -> 1996 verbatim -> 2008 SUMMARY_ONLY -> 2014 DSM-5 10-facet verbatim) & ALS (DC 8017 30% -> 100%)
    const tbi = bySlug.get("38-cfr-4.124a-dc-8045");
    expect(tbi).toBeDefined();
    expect(tbi!.versions.map((v) => v.effective_from)).toEqual([
      "1946-04-01",
      "1996-11-07",
      "2008-10-23",
      "2014-08-04",
    ]);
    expect(tbi!.versions[0]!.coverageState).toBe("SUMMARY_ONLY");
    expect(tbi!.versions[1]!.verbatimMarkdown).toContain("Purely subjective complaints such as headache");
    expect(tbi!.versions[2]!.coverageState).toBe("SUMMARY_ONLY");
    expect(tbi!.versions[3]!.verbatimMarkdown).toContain("Facets of cognitive impairment");

    const als = bySlug.get("38-cfr-4.124a-dc-8017");
    expect(als).toBeDefined();
    expect(als!.versions.map((v) => v.effective_from)).toEqual(["1946-04-01", "2012-01-19"]);
    expect(als!.versions.every((v) => v.coverageState === "VERBATIM_VERIFIED")).toBe(true);

    // 10. § 14.636 Attorney Fees (2008 post-NOD vs. 2019 AMA) & §§ 20.1400–20.1409 Board CUE (1999/2001 SUMMARY_ONLY -> 2019 AMA verbatim)
    const fees = bySlug.get("38-cfr-14.636c-e-h");
    expect(fees).toBeDefined();
    expect(fees!.versions.map((v) => v.effective_from)).toEqual(["2008-06-23", "2019-02-19"]);
    expect(fees!.versions.every((v) => v.coverageState === "VERBATIM_VERIFIED")).toBe(true);

    const boardCue = bySlug.get("38-cfr-20.1400-20.1411");
    expect(boardCue).toBeDefined();
    expect(boardCue!.versions.map((v) => v.effective_from)).toEqual([
      "1999-02-12",
      "2001-07-10",
      "2019-02-19",
    ]);
    expect(boardCue!.versions[2]!.coverageState).toBe("VERBATIM_VERIFIED");
    expect(boardCue!.versions[2]!.verbatimMarkdown).toContain("20.1409");
  });

  it("enforces Federal Register Publication Date vs. Effective Date separation on E5-S3 boundary probes", () => {
    // 1. § 3.12 Character of Discharge: published 2024-04-26 (89 FR 32361), effective 2024-06-25
    const codGap = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-3.12a-l", "2024-05-15");
    expect(codGap.governingVersion?.version_id).toBe("38-cfr-3.12-pre2024-cod");
    const codPane = buildBitemporalTwoPaneContext(
      "2024-05-15",
      bundle.cfrVersions.filter((v) => v.sectionSlug === "38-cfr-3.12a-l"),
    );
    expect(codPane.publicationGapTrapAlert).toContain("2024-04-26");
    expect(codPane.publicationGapTrapAlert).toContain("2024-06-25");

    // 2. § 4.114 Digestive: published 2024-03-20 (89 FR 19735), effective 2024-05-19
    const digGap = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-4.110-4.114", "2024-04-15");
    expect(digGap.governingVersion?.version_id).toBe("38-cfr-4.114-pre2024-digestive");
    const digPane = buildBitemporalTwoPaneContext(
      "2024-04-15",
      bundle.cfrVersions.filter((v) => v.sectionSlug === "38-cfr-4.110-4.114"),
    );
    expect(digPane.publicationGapTrapAlert).toContain("2024-03-20");
    expect(digPane.publicationGapTrapAlert).toContain("2024-05-19");

    // 3. § 4.71a Musculoskeletal: published 2020-11-30 (85 FR 76453), effective 2021-02-07
    const mskGap = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-4.71a-4.73", "2020-12-15");
    expect(mskGap.governingVersion?.version_id).toBe("38-cfr-4.71a-joints-pre2021");

    // 4. § 4.104 Cardiovascular: published 2021-09-30 (86 FR 54089), effective 2021-11-14
    const cardioGap = resolveCfrAtDate(
      bundle.cfrVersions,
      "38-cfr-4.100-4.104",
      "2021-10-15",
    );
    expect(cardioGap.governingVersion?.version_id).toBe("38-cfr-4.100-4.104-2006-mets-4100");

    // 5. § 4.124a DC 8045 TBI: published 2008-09-23 (73 FR 54693), effective 2008-10-23
    const tbiGap = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-4.124a-dc-8045", "2008-10-01");
    expect(tbiGap.governingVersion?.version_id).toBe("38-cfr-4.124a-8045-pre2008-tbi");

    // 6. Retroactive statutory applicability windows (Pub. L. 116-315 § 3.55, Pub. L. 110-181 § 3.700(a)(3), Pub. L. 107-330 § 3.350(a))
    const age55Lag = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-3.55a9-11", "2021-06-15");
    expect(age55Lag.governingVersion?.version_id).toBe("38-cfr-3.55-2021-statutory-age55");
    const age55Pane = buildBitemporalTwoPaneContext(
      "2021-06-15",
      bundle.cfrVersions.filter((v) => v.sectionSlug === "38-cfr-3.55a9-11"),
    );
    expect(age55Pane.publicationGapTrapAlert).toContain("Retroactive Statutory Applicability");

    const sevLag = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-3.700a3-5", "2008-06-15");
    expect(sevLag.governingVersion?.version_id).toBe("38-cfr-3.700a3-2008-statutory-combat");

    const breastLag = resolveCfrAtDate(bundle.cfrVersions, "38-cfr-3.350a-3.350a7", "2002-12-20");
    expect(breastLag.governingVersion?.version_id).toBe("38-cfr-3.350a7-2002-statutory-25pct");

    // Zero false statutory-lag alert on 1961 baseline (§ 3.321(b)(1) on 1985-06-01)
    const sec3321Pane = buildBitemporalTwoPaneContext(
      "1985-06-01",
      bundle.cfrVersions.filter((v) => v.sectionSlug === "38-cfr-3.321b1"),
    );
    expect(sec3321Pane.publicationGapTrapAlert).toBeNull();
  });

  it("produces symmetric scoped word-level redlines with zero false [Removed] clauses across >= 25 multi-era CFR sections", () => {
    const bySlug = new Map(bundle.cfrSections.map((s) => [s.sectionSlug, s]));

    // § 3.655 (1990 vs 2019): only "reopened" -> "supplemental" in (b) changed; (a) and (c) must remain unchanged!
    const sec3655 = bySlug.get("38-cfr-3.655")!;
    const v1990 = sec3655.versions.find((v) => v.version_id === "38-cfr-3.655-1990-legacy")!;
    const v2019 = sec3655.versions.find((v) => v.version_id === "38-cfr-3.655-2019-ama")!;
    const diff3655 = compareCfrVersions("1990", v1990.verbatimMarkdown!, "2019", v2019.verbatimMarkdown!);
    expect(diff3655.alignedRows.filter((r) => r.changeKind === "removed")).toEqual([]);
    expect(diff3655.alignedRows.filter((r) => r.changeKind === "added")).toEqual([]);
    expect(diff3655.stats.changedParagraphs).toBe(1);

    // § 3.816 (2003 vs 2021): only final sentence of (f)(3) + Federal Register history bracket changed; (f)(1), (f)(2), (f)(4) preserved on both sides
    const sec3816 = bySlug.get("38-cfr-3.816")!;
    const diff3816 = compareCfrVersions(
      "2003",
      sec3816.versions[0]!.verbatimMarkdown!,
      "2021",
      sec3816.versions[1]!.verbatimMarkdown!,
    );
    expect(diff3816.alignedRows.filter((r) => r.changeKind === "added")).toEqual([]);
    expect(diff3816.alignedRows.filter((r) => r.changeKind === "removed").length).toBeLessThanOrEqual(1);
    expect(diff3816.stats.changedParagraphs).toBeLessThanOrEqual(2);

    let multiEraRedlineSections = 0;

    for (const sec of bundle.cfrSections) {
      for (const ver of sec.versions) {
        if (ver.coverageState === "VERBATIM_VERIFIED") {
          expect(ver.verbatimMarkdown).toBeTruthy();
          expect(ver.verbatimMarkdown).not.toMatch(/\*\(Retains\s+the\b/i);
          expect(ver.verbatimMarkdown).not.toMatch(/^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/m);
          expect(ver.verbatimMarkdown).not.toMatch(/\$\^\{/);
          expect(ver.verbatimMarkdown).not.toMatch(/^#{1,6}\s+/m);
        }
      }

      const comparablePool = [
        ...sec.versions.filter((v) => Boolean(v.verbatimMarkdown)),
        ...(sec.relatedComparisonSnapshots ?? []).filter((v) => Boolean(v.verbatimMarkdown)),
      ];

      if (comparablePool.length >= 2) {
        multiEraRedlineSections += 1;
        const first = comparablePool[0]!;
        const last = comparablePool[comparablePool.length - 1]!;
        const bKey = first.excerptScopeKey ?? null;
        const aKey = last.excerptScopeKey ?? null;
        const scopeKey =
          bKey && (last.scopedExcerpts?.[bKey] || aKey === bKey)
            ? bKey
            : aKey && (first.scopedExcerpts?.[aKey] || bKey === aKey)
              ? aKey
              : null;
        const beforeBody = scopeKey
          ? (first.scopedExcerpts?.[scopeKey] ?? first.verbatimMarkdown!)
          : first.verbatimMarkdown!;
        const afterBody = scopeKey
          ? (last.scopedExcerpts?.[scopeKey] ?? last.verbatimMarkdown!)
          : last.verbatimMarkdown!;
        const diff = compareCfrVersions(
          first.version_id,
          beforeBody,
          last.version_id,
          afterBody,
        );
        expect(diff.stats.addedTokens + diff.stats.removedTokens).toBeGreaterThan(0);
      }
    }

    expect(multiEraRedlineSections).toBeGreaterThanOrEqual(25);
  });

  it("resolves pinpoint citations across E5-S3 sections directly to their canonical /cfr/[section] routes", () => {
    expect(resolveWave1CfrHref("38 C.F.R. § 3.310(b)").href).toBe("/cfr/38-cfr-3.310a-c");
    expect(resolveWave1CfrHref("38 C.F.R. § 3.350(a)").href).toBe("/cfr/38-cfr-3.350a-3.350a7");
    expect(resolveWave1CfrHref("38 C.F.R. § 4.114").href).toBe("/cfr/38-cfr-4.110-4.114");
    expect(resolveWave1CfrHref("38 C.F.R. § 4.104").href).toBe("/cfr/38-cfr-4.100-4.104");
    expect(resolveWave1CfrHref("38 C.F.R. § 14.636(c)").href).toBe("/cfr/38-cfr-14.636c-e-h");
    expect(resolveWave1CfrHref("38 C.F.R. § 20.1409(c)").href).toBe(
      "/cfr/38-cfr-20.1400-20.1411",
    );
  });
});
