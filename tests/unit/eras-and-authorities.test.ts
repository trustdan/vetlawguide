import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileCorpusFromDisk } from "@/lib/corpus/compiler";
import {
  ERA_DEFINITIONS_GLOSSARY,
  HISTORICAL_ERAS,
  WATERSHED_TIMELINE_TICKS,
  extractIssuanceYear,
  filterAuthoritiesForSelectedEra,
  normalizeVaopgcprecKey,
  paginateAuthorities,
  resolveEraIdForDate,
} from "@/lib/corpus/eras-and-authorities";

const REPO_ROOT = resolve(__dirname, "..", "..");

describe("Sticky Era Boundaries, VAOPGCPREC Citator & Bitemporal Era Filtering (ADR-0006)", () => {
  it("resolves exact statutory watershed boundary dates across all 5 Historical Eras without off-by-one drift", () => {
    expect(resolveEraIdForDate(null)).toBeNull();
    expect(resolveEraIdForDate("")).toBeNull();

    // Era 1 (1945–1961) vs Era 2 (1962–Nov. 17, 1988)
    expect(resolveEraIdForDate("1946-04-01")).toBe("era-1945-1961");
    expect(resolveEraIdForDate("1961-12-31")).toBe("era-1945-1961");
    expect(resolveEraIdForDate("1962-01-01")).toBe("era-1962-1988");

    // Nov. 18, 1988 VJRA boundary
    expect(resolveEraIdForDate("1988-11-17")).toBe("era-1962-1988");
    expect(resolveEraIdForDate("1988-11-18")).toBe("era-1988-2000");

    // Nov. 9, 2000 VCAA boundary
    expect(resolveEraIdForDate("2000-11-08")).toBe("era-1988-2000");
    expect(resolveEraIdForDate("2000-11-09")).toBe("era-2000-2018");

    // Feb. 19, 2019 AMA boundary
    expect(resolveEraIdForDate("2019-02-18")).toBe("era-2000-2018");
    expect(resolveEraIdForDate("2019-02-19")).toBe("era-2019-present");
    expect(resolveEraIdForDate("2026-11-16")).toBe("era-2019-present");
  });

  it("normalizes 2-digit and 4-digit VAOPGCPREC numbers and extracts opinion issuance years deterministically", () => {
    expect(normalizeVaopgcprecKey("VAOPGCPREC 5-89")).toBe("vaopgcprec:5-1989");
    expect(normalizeVaopgcprecKey("VAOPGCPREC 12-95 (60 FR 43186, Aug. 18, 1995)")).toBe(
      "vaopgcprec:12-1995",
    );
    expect(normalizeVaopgcprecKey("VAOPGCPREC 1-2017")).toBe("vaopgcprec:1-2017");

    expect(extractIssuanceYear("George v. McDonough, 596 U.S. 740 (2022)")).toBe(2022);
    expect(extractIssuanceYear("VAOPGCPREC 82-90")).toBe(1990);
    expect(extractIssuanceYear("Hamill v. Collins, 166 F.4th 1030 (Fed. Cir. 2026)")).toBe(
      2026,
    );
  });

  it("compiles enriched Judicial & VAOPGCPREC authorities, deduplicates reporter variants, and enforces bitemporal era filtering", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);
    const precs = bundle.precedents;

    expect(HISTORICAL_ERAS).toHaveLength(5);
    expect(WATERSHED_TIMELINE_TICKS.length).toBeGreaterThanOrEqual(12);
    expect(ERA_DEFINITIONS_GLOSSARY.length).toBeGreaterThanOrEqual(8);

    // Verify all 5 Era Lenses now carry SHA-256-locked Veteran plain-English overlays (VERBATIM_VERIFIED)
    const eraModules = bundle.coverageManifest.modules.filter(
      (m) => m.category === "era-lens",
    );
    expect(eraModules).toHaveLength(5);
    for (const eraMod of eraModules) {
      expect(eraMod.hasVeteranOverlay).toBe(true);
      expect(eraMod.coverageState).toBe("VERBATIM_VERIFIED");
    }

    // Verify VAOPGCPREC active vs. withdrawn quarantine extraction
    const vaop1295 = precs.find((p) => /VAOPGCPREC 12-95/i.test(p.citation));
    expect(vaop1295).toBeDefined();
    expect(vaop1295?.authorityTier).toBe("vaopgcprec-binding");
    expect(vaop1295?.coreHolding).toContain("July 21, 1992");

    const vaop699 = precs.find((p) => /VAOPGCPREC 6-99/i.test(p.citation));
    expect(vaop699).toBeDefined();
    expect(vaop699?.authorityTier).toBe("vaopgcprec-quarantined");
    expect(vaop699?.validityStatus).toBe("withdrawn");

    // Verify reporter deduplication (Allen v. Brown 7 Vet. App. 439 merged cleanly) & unique slugs
    const allenBrownMatches = precs.filter((p) =>
      /\b7\s+Vet\.\s*App\.\s+439\b/i.test(p.citation),
    );
    expect(allenBrownMatches).toHaveLength(1);
    expect(allenBrownMatches[0]?.citedByModuleIds.length).toBeGreaterThanOrEqual(4);

    const vaop2014Matches = precs.filter((p) =>
      /3-2014\s*&\s*4-2014/i.test(p.citation),
    );
    expect(vaop2014Matches).toHaveLength(1);

    const seenSlugs = new Set<string>();
    for (const p of precs) {
      expect(seenSlugs.has(p.slug)).toBe(false);
      seenSlugs.add(p.slug);
      for (const txt of [p.coreHolding ?? "", p.litigationUtility ?? ""]) {
        expect(/\b[a-z0-9._-]+\.md\b/i.test(txt)).toBe(false);
        expect(/\*/.test(txt)).toBe(false);
      }
    }

    // Verify judicial audit log enrichment (Hamill, Marion Rule 30(a) watchlist, Carpenter primary tier)
    const hamill = precs.find((p) => /Hamill v\. Collins/i.test(p.citation));
    expect(hamill?.coreHolding).toContain("5104(b)");

    const marion = precs.find((p) => /Marion v\. Collins/i.test(p.citation));
    expect(marion).toBeDefined();
    expect(marion?.isNonprecedentialRule30a).toBe(true);
    expect(marion?.authorityTier).toBe("cavc-nonprecedential-rule30a");

    const carpenter = precs.find((p) =>
      /Carpenter v\. Principi,\s*15\s+Vet\.\s*App\.\s+64/i.test(p.citation),
    );
    expect(carpenter?.authorityTier).toBe("cavc-precedential");

    const mulder = precs.find((p) =>
      /Mulder v\. McDonald,\s*805\s+F\.3d\s+1342/i.test(p.citation),
    );
    expect(mulder?.authorityTier).toBe("fed-cir");

    const vaop2595 = precs.find((p) => /VAOPGCPREC 25-95/i.test(p.citation));
    expect(vaop2595?.veteranPlainSummary).toContain("VA General Counsel opinion");

    // Zero synthetic statute-hybrid cards (e.g. Laska + Pub. L. or MVA + Pub. L.)
    expect(
      precs.some((p) => /Laska v\. McDonough.*Pub\. L\./i.test(p.citation)),
    ).toBe(false);
    expect(
      precs.some((p) => /^MVA v\. Sec'y/i.test(p.citation)),
    ).toBe(false);

    // Verify Bitemporal Era Filtering on Era 2 (1962–1988):
    // 1. Decision Governance mode surfaces Tablazon/Nehmer & warns that Bell (< July 21, 1992) and Hamill (AMA-only) do NOT apply
    const era2Gov = filterAuthoritiesForSelectedEra({
      authorities: precs,
      selectedEraId: "era-1962-1988",
      filterMode: "decision-governance",
    });
    expect(
      era2Gov.eraSpecificAuthorities.some((a) => /Tablazon/i.test(a.citation)),
    ).toBe(true);
    expect(
      era2Gov.eraSpecificAuthorities.some((a) => /Hamill v\. Collins/i.test(a.citation)),
    ).toBe(false);
    expect(
      era2Gov.eraCutoffWarnings.some((w) =>
        /Pre-July 21, 1992 CUE Cutoff/i.test(w.caution),
      ),
    ).toBe(true);

    // 2. Era 5 (2019–Present) Decision Governance surfaces Hamill & Cash and warns Shea/Deshotel are pre-2015/Legacy rules
    const era5Gov = filterAuthoritiesForSelectedEra({
      authorities: precs,
      selectedEraId: "era-2019-present",
      filterMode: "decision-governance",
    });
    expect(
      era5Gov.eraSpecificAuthorities.some((a) => /Hamill v\. Collins/i.test(a.citation)),
    ).toBe(true);
    expect(
      era5Gov.eraSpecificAuthorities.some((a) => /Shea v\. Wilkie/i.test(a.citation)),
    ).toBe(false);
    expect(
      era5Gov.eraCutoffWarnings.some((w) => /Shea v\. Wilkie/i.test(w.entry.citation)),
    ).toBe(true);

    // 3. Issuance Year mode on Era 1 (1945–1961) honestly explains pre-VJRA § 211(a) judicial insulation
    const era1Issuance = filterAuthoritiesForSelectedEra({
      authorities: precs,
      selectedEraId: "era-1945-1961",
      filterMode: "issuance-year",
    });
    expect(era1Issuance.eraSpecificAuthorities).toHaveLength(0);
    expect(era1Issuance.preVjraIssuanceEmptyNote).toContain("211(a)");

    // 4. Deterministic 25-per-page authority pagination clamps bounds cleanly across all 437 authorities
    const page1 = paginateAuthorities(precs, 1, 25);
    expect(page1.totalItems).toBe(437);
    expect(page1.totalPages).toBe(18);
    expect(page1.currentPage).toBe(1);
    expect(page1.startIndex).toBe(1);
    expect(page1.endIndex).toBe(25);
    expect(page1.items).toHaveLength(25);

    const pageLast = paginateAuthorities(precs, 99, 25);
    expect(pageLast.currentPage).toBe(18);
    expect(pageLast.startIndex).toBe(426);
    expect(pageLast.endIndex).toBe(437);
    expect(pageLast.items).toHaveLength(12);

    const pageEmpty = paginateAuthorities([], 3, 25);
    expect(pageEmpty.totalItems).toBe(0);
    expect(pageEmpty.totalPages).toBe(1);
    expect(pageEmpty.currentPage).toBe(1);
    expect(pageEmpty.startIndex).toBe(0);
    expect(pageEmpty.endIndex).toBe(0);
    expect(pageEmpty.items).toHaveLength(0);
  });
});

