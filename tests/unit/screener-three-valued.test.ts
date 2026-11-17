import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CfrVersionRecord } from "@/lib/corpus/types";
import {
  createDefaultInvestigationState,
  evaluateInvestigationSession,
  evaluatePathway,
  type ScreeningPathwayDefinition,
} from "@/lib/screener/engine";
import {
  buildPractitionerAuditPacketMarkdown,
  buildVeteranDiscussionPacketMarkdown,
} from "@/lib/screener/export-packet";

const REPO_ROOT = resolve(__dirname, "..", "..");

function loadUpstreamCfrVersions(): CfrVersionRecord[] {
  const raw = readFileSync(
    resolve(REPO_ROOT, "corpus", "generated", "cfr-versions.json"),
    "utf8",
  );
  return JSON.parse(raw) as CfrVersionRecord[];
}

const SERVICE_RECORDS_3156C_PATHWAY: ScreeningPathwayDefinition = {
  pathwayId: "service-records-3.156c",
  title: "38 C.F.R. § 3.156(c) Newly Associated Official Service Department Records",
  authorityCitations: ["38 C.F.R. § 3.156(c)", "Esteban v. Brown, 6 Vet. App. 259 (1994)"],
  bitemporalNote:
    "Applies to reconsider prior decisions when official military or inpatient clinical records existed at the time of the prior decision but were associated later.",
  conditions: [
    {
      factId: "penetrating_wound_in_service",
      questionLabel: "Did the Veteran suffer an in-service gunshot or fragment wound?",
      requiredAnswer: "yes",
      missingRecordToLocate: {
        documentName: "DD Form 214 / Field Medical Card (DD Form 1380)",
        whyItMatters: "Confirms combat/in-service penetrating trauma etiology.",
        howToRequest: "NPRC Standard Form 180 or VA FOIA C-file request.",
      },
    },
    {
      factId: "inpatient_surgical_packet_missing_at_original_rating",
      questionLabel:
        "Were inpatient hospital/operative charts missing when VA issued the original rating?",
      requiredAnswer: "yes",
      missingRecordToLocate: {
        documentName:
          "NPRC Inpatient Clinical / Surgical Ward Packet + Original VA Rating Code Sheet",
        whyItMatters:
          "Military hospitals archived inpatient surgical charts separately from outpatient health jackets; associating them triggers § 3.156(c) reconsideration without needing CUE.",
        howToRequest:
          "Specific NPRC inpatient clinical record request naming hospital & year, compared against C-file evidence list.",
      },
    },
  ],
  staticKillSwitches: [
    "38 C.F.R. § 3.156(c)(2): Does not apply if the claimant failed to provide sufficient identifying information for VA to locate the records.",
  ],
};

describe("Three-Valued Screening Engine & Wave 1 Bitemporal Investigation Desk", () => {
  it("never drops a pathway on 'unknown' — surfaces exact missing records instead", () => {
    const result = evaluatePathway(SERVICE_RECORDS_3156C_PATHWAY, {
      penetrating_wound_in_service: "yes",
      inpatient_surgical_packet_missing_at_original_rating: "unknown",
    });

    expect(result.disposition).toBe("unresolved-records-needed");
    expect(result.blockingReasons).toHaveLength(0);
    expect(result.recordsToLocate).toHaveLength(1);
    expect(result.recordsToLocate[0]?.documentName).toContain("NPRC Inpatient Clinical");
  });

  it("marks pathway supported-to-investigate when all preconditions are yes", () => {
    const result = evaluatePathway(SERVICE_RECORDS_3156C_PATHWAY, {
      penetrating_wound_in_service: "yes",
      inpatient_surgical_packet_missing_at_original_rating: "yes",
    });

    expect(result.disposition).toBe("supported-to-investigate");
    expect(result.recordsToLocate).toHaveLength(0);
    expect(result.triggeredByAnswers).toHaveLength(2);
    expect(result.killSwitchesToVerify).toHaveLength(1);
  });

  it("marks pathway barred-or-inapplicable when a required fact is explicitly 'no'", () => {
    const result = evaluatePathway(SERVICE_RECORDS_3156C_PATHWAY, {
      penetrating_wound_in_service: "no",
      inpatient_surgical_packet_missing_at_original_rating: "unknown",
    });

    expect(result.disposition).toBe("barred-or-inapplicable");
    expect(result.blockingReasons.length).toBeGreaterThan(0);
  });

  it("preserves all candidate pathways as unresolved when intake answers are 'unknown' and deduplicates missing records", () => {
    const versions = loadUpstreamCfrVersions();
    const blankIntake = createDefaultInvestigationState("1974-08-12");
    const report = evaluateInvestigationSession(blankIntake, versions);

    const barred = report.pathways.filter(
      (p) => p.disposition === "barred-or-inapplicable",
    );
    expect(barred).toHaveLength(0);
    expect(report.prioritizedRecordsToLocate.length).toBeGreaterThanOrEqual(4);

    // Ensure recordIds are strictly deduplicated even when shared across pathways
    const recordIds = report.prioritizedRecordsToLocate.map((r) => r.recordId);
    expect(new Set(recordIds).size).toBe(recordIds.length);
  });

  it("enforces Federal Register publication-vs-effective date resolution on 1997-06-20 (§ 4.56) and quarantines 90 FR 46542 (§ 4.118)", () => {
    const versions = loadUpstreamCfrVersions();
    const intake = createDefaultInvestigationState("1997-06-20");
    intake.answers.penetrating_wound_rated_only_as_scar = "yes";
    intake.answers.deep_fascia_or_muscle_pathology_documented = "yes";

    const report = evaluateInvestigationSession(intake, versions);
    const musclePathway = report.pathways.find(
      (p) => p.pathwayId === "penetrating-wound-muscle-vs-scar",
    );
    expect(musclePathway).toBeDefined();
    expect(musclePathway!.disposition).toBe("supported-to-investigate");

    const link456 = musclePathway!.pointInTimeLinks.find(
      (l) => l.sectionSlug === "38-cfr-4.56",
    );
    expect(link456?.permalink).toBe("/cfr/38-cfr-4.56/1946-04-01");
    expect(link456?.publicationGapTrapAlert).toContain("1997-06-03");
    expect(link456?.publicationGapTrapAlert).toContain("1997-07-03");

    const link4118 = musclePathway!.pointInTimeLinks.find(
      (l) => l.sectionSlug === "38-cfr-4.118",
    );
    expect(link4118?.quarantinedProposalsNote).toContain("90 FR 46542");
    expect(link4118?.quarantinedProposalsNote).toMatch(/proposed|unfinalized/i);
  });

  it("flags honest CORPUS_GAP_OR_QUEUED_WAVE with doNotRely=true when decisionDate (1954-06-15) precedes § 3.156(c) 1962-01-01 baseline", () => {
    const versions = loadUpstreamCfrVersions();
    const intake = createDefaultInvestigationState("1954-06-15");
    const report = evaluateInvestigationSession(intake, versions);

    const p3156c = report.pathways.find(
      (p) => p.pathwayId === "service-records-3-156c",
    );
    const link3156c = p3156c?.pointInTimeLinks.find(
      (l) => l.sectionSlug === "38-cfr-3.156c",
    );
    expect(link3156c?.coverageState).toBe("CORPUS_GAP_OR_QUEUED_WAVE");
    expect(link3156c?.doNotRely).toBe(true);
    expect(link3156c?.permalink).toBeNull();
  });

  it("enforces BVA subsumption bar on RO CUE (§ 20.1104) and § 20.1409(c) single-merits-decision bar on Board CUE while keeping § 3.156(c) alive", () => {
    const versions = loadUpstreamCfrVersions();
    const intake = createDefaultInvestigationState("1986-11-04");
    intake.decisionAgency = "BVA";
    intake.bvaMeritsSubsumed = "yes";
    intake.priorBvaCueDecidedOnMerits = "yes";
    intake.answers.official_service_or_surgical_records_missing_at_t0 = "yes";
    intake.answers.newly_associated_records_speak_to_disputed_element = "yes";

    const report = evaluateInvestigationSession(intake, versions);

    const roCue = report.pathways.find((p) => p.pathwayId === "ro-cue-3-105a");
    const boardCue = report.pathways.find(
      (p) => p.pathwayId === "board-cue-7111-subpart-o",
    );
    const sec3156c = report.pathways.find(
      (p) => p.pathwayId === "service-records-3-156c",
    );

    expect(roCue?.disposition).toBe("barred-or-inapplicable");
    expect(roCue?.blockingReasons.join(" ")).toMatch(/subsumed|20\.1104|20\.1400/i);

    expect(boardCue?.disposition).toBe("barred-or-inapplicable");
    expect(boardCue?.blockingReasons.join(" ")).toContain("20.1409(c)");
    expect(boardCue?.blockingReasons.join(" ")).toContain("20.1404");

    // § 3.156(c) reconsideration still overrides Board finality under § 20.1411(b)!
    expect(sec3156c?.disposition).toBe("supported-to-investigate");
  });

  it("distinguishes AMA § 5104(b) explicit-notice rule (Hamill, post-2019-02-19) from pre-2015 § 3.157(b) informal claims and screens Title 10 CRSC (Soto)", () => {
    const versions = loadUpstreamCfrVersions();
    const amaIntake = createDefaultInvestigationState("2021-05-14");
    amaIntake.retireeStatus = "military-retiree-or-ch61";
    amaIntake.answers.open_stream_or_unanswered_filing_clue = "yes";
    amaIntake.answers.not_subsequently_finally_adjudicated = "yes";

    const amaReport = evaluateInvestigationSession(amaIntake, versions);
    const pendingPathway = amaReport.pathways.find(
      (p) => p.pathwayId === "pending-claim-nod-notice-informal",
    );
    expect(pendingPathway?.bitemporalNotePractitioner).toContain("Hamill");
    expect(pendingPathway?.bitemporalNotePractitioner).toContain("5104(b)");

    expect(amaReport.retireeCrscAdvisory.applicable).toBe(true);
    expect(amaReport.retireeCrscAdvisory.practitionerNote).toContain("Title 10");
    expect(amaReport.retireeCrscAdvisory.practitionerNote).toContain("Soto");
  });

  it("generates corpus-stamped, UPL-safe Veteran and Practitioner Markdown packets with zero banned slogans or leaked schema enums", () => {
    const versions = loadUpstreamCfrVersions();
    const intake = createDefaultInvestigationState("1974-08-12");
    intake.answers.penetrating_wound_rated_only_as_scar = "yes";
    const report = evaluateInvestigationSession(intake, versions);

    const stamp = {
      corpusReleaseId: "corpus-w1-2026-11-16-cb8dfd93",
      checkedAsOf: "2026-11-16",
      upstreamCommitShort: "cb8dfd93",
    };

    const vetMd = buildVeteranDiscussionPacketMarkdown(report, stamp);
    const pracMd = buildPractitionerAuditPacketMarkdown(report, stamp);

    expect(vetMd).toContain("corpus-w1-2026-11-16-cb8dfd93");
    expect(vetMd).toContain("2026-11-16");
    expect(vetMd).toContain("Educational Reference Only");
    expect(vetMd).toContain("Questions to Discuss With an Accredited");
    expect(vetMd).not.toMatch(/you have a winning|guaranteed back\s*pay|CUE[-\s]+safe|100% verified/i);
    expect(vetMd).not.toContain("T_now");

    expect(pracMd).toContain("corpus-w1-2026-11-16-cb8dfd93");
    expect(pracMd).toContain("20.1409(c)");
    expect(pracMd).toContain("/cfr/38-cfr-4.56/1946-04-01");
    expect(pracMd).not.toMatch(/CUE[-\s]+safe|100% verified|zero[-\s]+hallucination/i);
    expect(pracMd).not.toContain("T_now");
    expect(pracMd).not.toContain("ACTION-REQUIRED");
  });

  it("enforces Gate 1 action-required on § 4.118 FR pub-gaps (2008-10-01), pre-1946 Do Not Rely dates (1945-05-08), and post-2008 SUMMARY_ONLY scar dates (2021-05-14)", () => {
    const versions = loadUpstreamCfrVersions();

    // 1. Pre-1946 VASRD baseline (1945-05-08): Pathway 3 must warn Do Not Rely and never direct citing 1946-04-01
    const pre1946 = createDefaultInvestigationState("1945-05-08");
    const pre1946Report = evaluateInvestigationSession(pre1946, versions);
    const p3Pre1946 = pre1946Report.pathways.find(
      (p) => p.pathwayId === "penetrating-wound-muscle-vs-scar",
    );
    expect(p3Pre1946?.bitemporalNotePractitioner).toContain("Do Not Rely");
    expect(p3Pre1946?.bitemporalNotePractitioner).toContain("1933 Schedule");
    expect(pre1946Report.practitionerVerificationGates[0]?.status).toBe(
      "action-required",
    );

    // 2. FR Pub-vs-Effective Gap on § 4.118 (2008-10-01 sits between 73 FR 54708 pub 2008-09-23 and eff 2008-10-23)
    const gap4118 = createDefaultInvestigationState("2008-10-01");
    const gap4118Report = evaluateInvestigationSession(gap4118, versions);
    expect(gap4118Report.practitionerVerificationGates[0]?.status).toBe(
      "action-required",
    );
    expect(gap4118Report.practitionerVerificationGates[0]?.detail).toContain(
      "2008-10-23",
    );

    // 3. Post-2008-10-23 SUMMARY_ONLY § 4.118 (2021-05-14): Gate 1 requires print CFR verification and export packet marks SUMMARY ONLY
    const post2008 = createDefaultInvestigationState("2021-05-14");
    post2008.answers.penetrating_wound_rated_only_as_scar = "yes";
    const post2008Report = evaluateInvestigationSession(post2008, versions);
    expect(post2008Report.practitionerVerificationGates[0]?.status).toBe(
      "action-required",
    );
    const pracPacket = buildPractitionerAuditPacketMarkdown(post2008Report, {
      corpusReleaseId: "corpus-w1-2026-11-16-cb8dfd93",
      checkedAsOf: "2026-11-16",
      upstreamCommitShort: "cb8dfd93",
    });
    expect(pracPacket).toContain("SUMMARY ONLY");
  });
});
