import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CfrVersionRecord } from "@/lib/corpus/types";
import {
  createDefaultInvestigationState,
  evaluateInvestigationSession,
  INVESTIGATION_SCENARIO_PRESETS,
} from "@/lib/screener/engine";
import {
  buildPractitionerAuditPacketMarkdown,
  buildVeteranDiscussionPacketMarkdown,
} from "@/lib/screener/export-packet";
import {
  buildCitationFixIssueUrl,
  extractCfrSectionFallbackFromPath,
  VA_FIND_ACCREDITED_REP_URL,
  VETERANS_CRISIS_LINE_COPY,
} from "@/lib/support-links";

const REPO_ROOT = resolve(__dirname, "..", "..");

function loadUpstreamCfrVersions(): CfrVersionRecord[] {
  const raw = readFileSync(
    resolve(REPO_ROOT, "corpus", "generated", "cfr-versions.json"),
    "utf8",
  );
  return JSON.parse(raw) as CfrVersionRecord[];
}

const SAMPLE_STAMP = {
  corpusReleaseId: "corpus-w5-2026-11-17",
  checkedAsOf: "2026-11-17",
  upstreamCommitShort: "abc1234",
};

describe("EPIC 13 Safety Rails: Empty/Unknown Decision Date, Support Links & Zero-PII Issue URLs", () => {
  it("starts fresh investigation state and blank preset with an empty decisionDate (never 1974-08-12)", () => {
    const fresh = createDefaultInvestigationState();
    expect(fresh.decisionDate).toBe("");

    const blankPreset = INVESTIGATION_SCENARIO_PRESETS.find(
      (p) => p.presetId === "preset-blank-not-sure",
    );
    expect(blankPreset).toBeDefined();
    expect(blankPreset!.state.decisionDate).toBe("");
  });

  it("evaluates empty and explicit 'unknown' decision dates honestly without fabricating 1974-08-12 and elevates 'Find the decision letter' first", () => {
    const versions = loadUpstreamCfrVersions();

    for (const rawDate of ["", "unknown"]) {
      const intake = createDefaultInvestigationState(rawDate);
      // Even when substantive CUE answers are 'yes', an unknown decision date must prevent CUE from being marked supported!
      intake.decisionAgency = "AOJ-RO";
      intake.bvaMeritsSubsumed = "no";
      intake.answers.undebatable_extant_error_in_record_then = "yes";
      intake.answers.manifestly_changed_combined_payment_4_25 = "yes";

      const report = evaluateInvestigationSession(intake, versions);

      expect(report.intake.decisionDate).toBe("unknown");
      expect(report.twoPaneContext.decisionDate).toBe("unknown");
      expect(JSON.stringify(report)).not.toContain("1974-08-12");

      // "Find the decision letter" is elevated to #1 in Records to find
      expect(report.prioritizedRecordsToLocate.length).toBeGreaterThan(0);
      expect(report.prioritizedRecordsToLocate[0]?.recordId).toBe(
        "prior-va-decision-letter-and-date",
      );
      expect(report.prioritizedRecordsToLocate[0]?.documentName).toContain(
        "Find the decision letter",
      );

      // CUE pathways stay unresolved-records-needed when T0 date is unknown
      const roCue = report.pathways.find((p) => p.pathwayId === "ro-cue-3-105a");
      expect(roCue?.disposition).toBe("unresolved-records-needed");

      // Point-in-time links are flagged doNotRely with null permalinks until a date is known
      for (const pw of report.pathways) {
        for (const link of pw.pointInTimeLinks) {
          expect(link.doNotRely).toBe(true);
          expect(link.permalink).toBeNull();
        }
      }

      // Gate 1 flags action-required when decision date is unknown
      const gate1 = report.practitionerVerificationGates.find(
        (g) => g.gateId === "gate-contemporaneous-cfr-and-fr-dates",
      );
      expect(gate1?.status).toBe("action-required");

      // Exported sheets print "Unknown" (never 1974-08-12) AND include Crisis Line + Find-a-Rep text
      const vetMd = buildVeteranDiscussionPacketMarkdown(report, SAMPLE_STAMP);
      const pracMd = buildPractitionerAuditPacketMarkdown(report, SAMPLE_STAMP);
      expect(vetMd).not.toContain("1974-08-12");
      expect(pracMd).not.toContain("1974-08-12");
      expect(vetMd).toContain("Find the decision letter");
      expect(vetMd).toContain("988");
      expect(vetMd).toContain("838255");
      expect(vetMd).toContain(VA_FIND_ACCREDITED_REP_URL);
      expect(pracMd).toContain(VETERANS_CRISIS_LINE_COPY);
      expect(pracMd).toContain(VA_FIND_ACCREDITED_REP_URL);
    }
  });

  it("builds deterministic zero-PII GitHub citation-or-date-fix URLs and blocks /investigate paths", () => {
    const urlStr = buildCitationFixIssueUrl({
      canonicalPath: "/cfr/38-cfr-4.56/1946-04-01?date=1997-06-20&mode=veteran#top",
      corpusReleaseId: "corpus-w5-2026-11-17",
      authority: "38 C.F.R. § 4.56 (29 FR 6718)",
    });
    expect(urlStr).not.toBeNull();
    const parsed = new URL(urlStr!);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://github.com/trustdan/vetlawguide/issues/new",
    );
    expect(parsed.searchParams.get("template")).toBe("citation-or-date-fix.yml");
    expect(parsed.searchParams.get("authority")).toBe(
      "38 C.F.R. § 4.56 (29 FR 6718)",
    );
    expect(parsed.searchParams.get("page_or_version")).toBe(
      "/cfr/38-cfr-4.56/1946-04-01 (corpus-w5-2026-11-17)",
    );
    // Query/date/mode stripped, zero_pii_confirm never pre-checked
    expect(urlStr).not.toContain("1997-06-20");
    expect(urlStr).not.toContain("veteran");
    expect(parsed.searchParams.get("zero_pii_confirm")).toBeNull();

    // /investigate paths never generate an external issue prefill URL
    expect(
      buildCitationFixIssueUrl({
        canonicalPath: "/investigate",
        corpusReleaseId: "corpus-w5-2026-11-17",
        authority: "38 C.F.R. § 3.156(c)",
      }),
    ).toBeNull();
  });

  it("resolves unmatched /cfr/[section]/[effectiveFrom] 404 paths back to /cfr/[section]", () => {
    const validSections = [
      { sectionSlug: "38-cfr-4.56", cfrSection: "38 C.F.R. § 4.56" },
      { sectionSlug: "38-cfr-3.156c", cfrSection: "38 C.F.R. § 3.156(c)" },
    ];

    const match = extractCfrSectionFallbackFromPath(
      "/cfr/38-cfr-4.56/1999-01-01",
      validSections,
    );
    expect(match).toEqual({
      sectionSlug: "38-cfr-4.56",
      cfrSection: "38 C.F.R. § 4.56",
      requestedSegment: "1999-01-01",
      href: "/cfr/38-cfr-4.56",
    });

    expect(
      extractCfrSectionFallbackFromPath("/cfr/38-cfr-4.56", validSections),
    ).toBeNull();
    expect(
      extractCfrSectionFallbackFromPath("/cfr/modules/unknown-slug", validSections),
    ).toBeNull();
    expect(
      extractCfrSectionFallbackFromPath(
        "/cfr/unknown-section/1999-01-01",
        validSections,
      ),
    ).toBeNull();
  });
});
