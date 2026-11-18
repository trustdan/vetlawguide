import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getPlaybookDocuments } from "@/lib/corpus/loader";
import {
  CHAT_QUESTIONS_RETENTION_DAYS,
  HAS_ACCREDITED_EXTERNAL_REVIEW,
  SITE_MAINTAINER,
} from "@/lib/editorial-accountability";
import { listAllCanonicalPaths, runStaticSeoAudit } from "@/lib/seo/crawl-audit";
import { buildAboutPageJsonLd, buildArticleJsonLd } from "@/lib/seo/json-ld";
import { buildTurnGroundingBundle } from "@/lib/chat/system-prompt";
import { loadGoldenChatEvalCases } from "../../scripts/eval_chat";

const REPO_ROOT = resolve(__dirname, "..", "..");

describe("EPIC 14 Accountability, Trust Pages, Retention Lockstep & Site-Wide CSP", () => {
  it("keeps CHAT_QUESTIONS_RETENTION_DAYS (180) synchronized across migration 0003 and /privacy copy", () => {
    expect(CHAT_QUESTIONS_RETENTION_DAYS).toBe(180);

    const migrationSql = readFileSync(
      resolve(REPO_ROOT, "supabase", "migrations", "0003_chat_questions_retention.sql"),
      "utf8",
    );
    expect(migrationSql).toContain(
      `retention_days integer default ${CHAT_QUESTIONS_RETENTION_DAYS}`,
    );
    expect(migrationSql).toContain(
      `select public.purge_expired_chat_questions(${CHAT_QUESTIONS_RETENTION_DAYS});`,
    );

    const privacyPageSrc = readFileSync(
      resolve(REPO_ROOT, "app", "privacy", "page.tsx"),
      "utf8",
    );
    expect(privacyPageSrc).toContain("CHAT_QUESTIONS_RETENTION_DAYS");
    expect(privacyPageSrc).toMatch(/conversationId|conversation id/i);
  });

  it("emits truthful Person/Organization author JSON-LD with overlay reviewed_at and zero unverified reviewedBy claims", () => {
    expect(HAS_ACCREDITED_EXTERNAL_REVIEW).toBe(false);

    const doc = getPlaybookDocuments()[0];
    expect(doc).toBeDefined();
    expect(doc!.veteranOverlay?.reviewed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const articleLd = buildArticleJsonLd(doc!, "2026-11-17");
    expect(articleLd.dateModified).toBe(doc!.veteranOverlay!.reviewed_at);
    expect(articleLd.author).toEqual({
      "@type": "Person",
      name: SITE_MAINTAINER.publicLabel,
      jobTitle: SITE_MAINTAINER.role,
      url: SITE_MAINTAINER.githubProfileUrl,
    });
    expect("reviewedBy" in articleLd).toBe(false);

    const aboutLd = buildAboutPageJsonLd("2026-11-17");
    expect(aboutLd["@type"]).toBe("AboutPage");
    expect(JSON.stringify(aboutLd)).not.toContain("reviewedBy");
    expect(JSON.stringify(aboutLd)).not.toMatch(/LegalService|Attorney/);
  });

  it("registers /terms and /accessibility in sitemap canonical paths within <= 2 clicks from /", () => {
    const paths = listAllCanonicalPaths();
    expect(paths).toContain("/terms");
    expect(paths).toContain("/accessibility");

    const seoReport = runStaticSeoAudit(REPO_ROOT);
    expect(seoReport.errors).toEqual([]);
    expect(seoReport.maxCrawlDepthFromHome).toBeLessThanOrEqual(2);
  });

  it("ships both site-wide Content-Security-Policy-Report-Only and unchanged strict /investigate Content-Security-Policy", () => {
    const nextConfigSrc = readFileSync(
      resolve(REPO_ROOT, "next.config.ts"),
      "utf8",
    );
    expect(nextConfigSrc).toContain("Content-Security-Policy-Report-Only");
    expect(nextConfigSrc).toContain("https://www.googletagmanager.com");
    expect(nextConfigSrc).toContain(
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
  });

  it("validates the 35-question golden chat eval set (tests/eval/chat-golden.jsonl) against canonical routes and deterministic retrieval", () => {
    const cases = loadGoldenChatEvalCases();
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(cases.length).toBeLessThanOrEqual(50);

    const canonicalSet = new Set(listAllCanonicalPaths());
    const seenIds = new Set<string>();

    for (const tc of cases) {
      expect(seenIds.has(tc.id), `Duplicate golden eval id ${tc.id}`).toBe(false);
      seenIds.add(tc.id);

      for (const route of tc.expectedRoutes) {
        expect(
          canonicalSet.has(route),
          `Golden eval "${tc.id}" references invalid canonical route "${route}"`,
        ).toBe(true);
      }

      if (tc.expectedRoutes.length > 0) {
        const bundle = buildTurnGroundingBundle({
          query: tc.question,
          audienceMode: tc.audienceMode,
          activeDecisionDate: tc.decisionDate,
        });
        const surfaced = new Set<string>([
          "/privacy",
          "/about",
          "/cases",
          "/timeline",
          "/crosswalk",
          ...bundle.retrieved.chunks.flatMap((c) => {
            const cleanHref = c.href.split("#")[0]!;
            const parentMatch = /^(\/cfr\/[^/]+)\/\d{4}-\d{2}-\d{2}$/.exec(cleanHref);
            return parentMatch?.[1] ? [cleanHref, parentMatch[1]] : [cleanHref];
          }),
          ...bundle.retrieved.temporalResolutions.flatMap((tr) =>
            tr.governingPermalink
              ? [tr.governingPermalink, `/cfr/${tr.sectionSlug}`]
              : [`/cfr/${tr.sectionSlug}`],
          ),
        ]);
        expect(
          tc.expectedRoutes.some((r) => surfaced.has(r)),
          `Golden eval "${tc.id}" missed retrieval for [${tc.expectedRoutes.join(", ")}]`,
        ).toBe(true);
      }
    }
  });
});
