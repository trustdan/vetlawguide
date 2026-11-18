import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  SITE_URL,
  buildCfrSectionMetadata,
  buildCfrSnapshotMetadata,
  buildDocumentMetadata,
  buildPageMetadata,
  buildVasrdSystemMetadata,
} from "@/lib/seo/metadata";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildCfrLegislationJsonLd,
  buildDefinedTermSetJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from "@/lib/seo/json-ld";
import { buildLlmsTxt } from "@/lib/seo/llms-txt";
import { runStaticSeoAudit } from "@/lib/seo/crawl-audit";
import {
  getCompiledCfrSectionBySlug,
  getCompiledDocumentByRoute,
  getCoverageManifest,
  getStatutoryCrosswalk,
} from "@/lib/corpus/loader";

describe("EPIC 9 — Technical & Legal-Citation SEO, Schema.org JSON-LD, /llms.txt & Crawl Depth", () => {
  it("consolidates canonical URLs without query strings and generates dual-intent metadata free of banned slogans", () => {
    const homeMeta = buildPageMetadata({
      title: "VetLawGuide — Point-in-Time Veterans Law Research Desk",
      description:
        "Connect VA rating and Board decisions, historical and current 38 C.F.R. authorities, and concrete records to locate.",
      canonicalPath: "/",
    });
    expect(homeMeta.alternates?.canonical).toBe("/");

    const sec456 = getCompiledCfrSectionBySlug("38-cfr-4.56");
    expect(sec456).not.toBeNull();
    const secMeta = buildCfrSectionMetadata(sec456!);
    expect(secMeta.alternates?.canonical).toBe("/cfr/38-cfr-4.56");
    expect(String(secMeta.description)).toMatch(/4\.56/);
    expect(String(secMeta.description)).toMatch(/5301|muscle/i);

    const snap1946 = sec456!.versions.find((v) => v.effective_from === "1946-04-01");
    expect(snap1946).toBeDefined();
    const snapMeta = buildCfrSnapshotMetadata(sec456!, snap1946!);
    expect(snapMeta.alternates?.canonical).toBe("/cfr/38-cfr-4.56/1946-04-01");

    const scars = getCompiledCfrSectionBySlug("38-cfr-4.118");
    const quarantined90Fr = scars!.quarantinedWatchlist[0];
    expect(quarantined90Fr).toBeDefined();
    const qMeta = buildCfrSnapshotMetadata(scars!, quarantined90Fr!);
    expect(String(qMeta.title)).toMatch(/Quarantined|Not Enacted/i);

    const doc = getCompiledDocumentByRoute(
      "/playbooks/05-void-rating-reductions-stabilized-ratings",
    );
    expect(doc).not.toBeNull();
    const docMeta = buildDocumentMetadata(doc!, "Guides");
    expect(docMeta.alternates?.canonical).toBe(
      "/playbooks/05-void-rating-reductions-stabilized-ratings",
    );
    expect(String(docMeta.description).length).toBeGreaterThan(40);

    const manifest = getCoverageManifest();
    const vasrdSys = manifest.vasrdSystems.find(
      (s) => s.systemId === "01-musculoskeletal",
    );
    expect(vasrdSys).toBeDefined();
    const vasrdMeta = buildVasrdSystemMetadata(vasrdSys!);
    expect(vasrdMeta.alternates?.canonical).toBe("/vasrd/01-musculoskeletal");
  });

  it("emits XSS-safe Schema.org Legislation, Article, DefinedTermSet, and BreadcrumbList JSON-LD with zero UPL types", () => {
    const sec456 = getCompiledCfrSectionBySlug("38-cfr-4.56")!;
    const snap1946 = sec456.versions.find((v) => v.effective_from === "1946-04-01")!;
    const histLegJson = buildCfrLegislationJsonLd(
      sec456,
      snap1946,
      "2026-11-17",
    );
    expect(histLegJson["@type"]).toBe("Legislation");
    expect(histLegJson.legislationLegalForce).toBe("NotInForce");
    expect(histLegJson.temporalCoverage).toBe("1946-04-01/1997-07-02");

    const snap1997 = sec456.versions.find((v) => v.effective_from === "1997-07-03")!;
    const activeLegJson = buildCfrLegislationJsonLd(
      sec456,
      snap1997,
      "2026-11-17",
    );
    expect(activeLegJson.legislationLegalForce).toBe("InForce");
    expect(activeLegJson.temporalCoverage).toBe("1997-07-03/..");

    const scars = getCompiledCfrSectionBySlug("38-cfr-4.118")!;
    const quarantinedSnap = scars.quarantinedWatchlist[0]!;
    const qLegJson = buildCfrLegislationJsonLd(
      scars,
      quarantinedSnap,
      "2026-11-17",
    );
    expect(qLegJson.legislationLegalForce).toBe("NotInForce");
    expect(qLegJson.temporalCoverage).toBeUndefined();
    expect(qLegJson.name).toContain("Quarantined Notice");

    const doc = getCompiledDocumentByRoute(
      "/playbooks/05-void-rating-reductions-stabilized-ratings",
    )!;
    const artJson = buildArticleJsonLd(doc, "2026-11-17");
    expect(artJson["@type"]).toBe("TechArticle");

    const xwalk = getStatutoryCrosswalk();
    const termSet = buildDefinedTermSetJsonLd({
      name: "Three-Era Title 38 Statutory Crosswalk",
      description: "1933 <-> 1958 <-> 1991 statutory section mappings",
      canonicalPath: "/crosswalk",
      terms: xwalk.slice(0, 5).map((r) => ({
        termCode: r.eraBSection,
        name: `${r.eraBSection} -> ${r.eraCSection}`,
        description: r.subject,
      })),
    });
    expect(termSet["@type"]).toBe("DefinedTermSet");

    const crumbs = buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Law", path: "/cfr" },
    ]);
    expect(crumbs["@type"]).toBe("BreadcrumbList");

    const siteJson = buildWebSiteJsonLd();
    expect(siteJson.url).toBe(SITE_URL);

    // XSS serialization test
    const unsafePayload = {
      "@context": "https://schema.org",
      name: "</script><script>alert(1)</script>",
    };
    const serialized = serializeJsonLd(unsafePayload);
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
  });

  it("generates corpus-stamped sitemap.ts, /api/*-disallowing robots.ts, /llms.txt, and passes <=2-click crawl audit", () => {
    const manifest = getCoverageManifest();
    const robotsCfg = robots();
    expect(robotsCfg.sitemap).toBe(`${SITE_URL}/sitemap.xml`);

    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(330);
    for (const entry of entries) {
      expect(entry.url.startsWith(SITE_URL)).toBe(true);
      expect(entry.url).not.toContain("?");
      expect(entry.lastModified).toBe(manifest.checkedAsOf);
    }

    const llms = buildLlmsTxt();
    expect(llms).toContain("# VetLawGuide");
    expect(llms).toContain("20.1409(c)");
    expect(llms).toContain("20.1403(e)");
    expect(llms).toContain("Rule 30(a)");
    expect(llms).toContain("/cfr/38-cfr-4.56/1946-04-01");

    const audit = runStaticSeoAudit();
    expect(audit.errors).toEqual([]);
    expect(audit.maxCrawlDepthFromHome).toBeLessThanOrEqual(2);
  });
});
