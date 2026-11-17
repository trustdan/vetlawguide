import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getCompiledTimelineBundle } from "@/lib/corpus/loader";
import { buildPiercingFinalityFlowchart } from "@/lib/corpus/piercing-finality-flowchart";
import { ALL_ENACTED_TIMELINE_TRACKS } from "@/lib/corpus/timeline";

const REPO_ROOT = resolve(__dirname, "..", "..");

describe("EPIC 6 Piercing-Finality Decision Flowchart & 4-Track /timeline Engine", () => {
  it("orders all 6 Piercing-Finality gates doctrinally (non-CUE vehicles before RO CUE before Board CUE) with 1:1 Veteran/Practitioner parity", () => {
    const vetFlow = buildPiercingFinalityFlowchart("veteran", "2024-07-01");
    const pracFlow = buildPiercingFinalityFlowchart("practitioner", "2024-07-01");

    const expectedGateIds = [
      "void-reduction",
      "service-records-3156c",
      "pending-unadjudicated",
      "nehmer-herbicide",
      "ro-cue-3105a",
      "board-cue-7111",
    ];

    expect(vetFlow.gates.map((g) => g.id)).toEqual(expectedGateIds);
    expect(pracFlow.gates.map((g) => g.id)).toEqual(expectedGateIds);
    expect(vetFlow.gates.map((g) => g.stepNumber)).toEqual([1, 2, 3, 4, 5, 6]);

    // Every gate has monotonic SVG Y coordinates, short <= 4-word node titles, record clues, and kill-switches
    let prevY = 0;
    for (let i = 0; i < pracFlow.gates.length; i += 1) {
      const vg = vetFlow.gates[i]!;
      const pg = pracFlow.gates[i]!;
      expect(pg.svgY).toBeGreaterThan(prevY);
      prevY = pg.svgY;
      expect(pg.shortTitle.trim().split(/\s+/).length).toBeLessThanOrEqual(4);
      expect(vg.ifYesSummary).not.toBe(pg.ifYesSummary);
      expect(pg.recordClues.length).toBeGreaterThan(0);
      expect(pg.killSwitches.length).toBeGreaterThan(0);
    }

    // Verify exact § 20.1409(c) Board CUE phrasing (never "lifetime CUE") and George § 20.1403(e) bar
    const boardGate = pracFlow.gates.find((g) => g.id === "board-cue-7111")!;
    const roGate = pracFlow.gates.find((g) => g.id === "ro-cue-3105a")!;
    const combinedBoard = `${boardGate.ifYesSummary} ${boardGate.killSwitches.join(" ")}`;
    expect(combinedBoard).toContain("20.1409(c)");
    expect(combinedBoard).not.toMatch(/\blifetime\b/i);
    expect(`${roGate.ifYesSummary} ${roGate.killSwitches.join(" ")}`).toMatch(
      /George|20\.1403\(e\)/,
    );
  });

  it("resolves temporal boundaries accurately across 1954 (pre-1962 & pre-Bell), 1992-07-20 vs. 1992-07-21, 2006-09-20 FR pub-gap, and post-2019 AMA Hamill", () => {
    // 1. 1954-06-15: Pre-1962 § 3.156(c) historical baseline gap + Pre-Bell physical C-file rule
    const flow1954 = buildPiercingFinalityFlowchart("practitioner", "1954-06-15");
    const g3156c1954 = flow1954.gates.find((g) => g.id === "service-records-3156c")!;
    const gRo1954 = flow1954.gates.find((g) => g.id === "ro-cue-3105a")!;
    expect(g3156c1954.dateBoundaryAlert).toMatch(/1962/i);
    expect(gRo1954.dateStatusBadge).toMatch(/Pre-Bell/i);

    // 2. 1992-07-20 vs. 1992-07-21 Bell v. Derwinski constructive possession boundary
    const preBell = buildPiercingFinalityFlowchart("practitioner", "1992-07-20");
    const onBell = buildPiercingFinalityFlowchart("practitioner", "1992-07-21");
    expect(preBell.gates.find((g) => g.id === "ro-cue-3105a")?.dateStatusBadge).toContain(
      "Pre-Bell",
    );
    expect(onBell.gates.find((g) => g.id === "ro-cue-3105a")?.dateStatusBadge).toContain(
      "Post-Bell",
    );

    // 3. 2006-09-20 sits inside 71 FR 52455 publication gap (published 2006-09-06, effective 2006-10-06)
    const pubGap2006 = buildPiercingFinalityFlowchart("practitioner", "2006-09-20");
    expect(
      pubGap2006.gates.find((g) => g.id === "service-records-3156c")?.dateBoundaryAlert,
    ).toMatch(/71 FR 52455.*October 6, 2006|2006-10-06/i);

    // 4. 2021-05-01 AMA decision surfaces Hamill v. Collins § 5104(b) explicit-notice rule instead of Legacy § 3.156(b)
    const ama2021 = buildPiercingFinalityFlowchart("practitioner", "2021-05-01");
    const pendingAma = ama2021.gates.find((g) => g.id === "pending-unadjudicated")!;
    expect(pendingAma.dateStatusBadge).toMatch(/AMA|5104\(b\)|Hamill/i);
  });

  it("compiles all 4 enacted timeline tracks from master-chronological-matrix.md & cfr-amendments.json while quarantining all 7 non-enacted/rescinded notices", () => {
    const bundle = getCompiledTimelineBundle(REPO_ROOT);

    // 1. All 4 enacted tracks are populated and non-empty
    expect(ALL_ENACTED_TIMELINE_TRACKS).toEqual([
      "Statutes",
      "Part 3 Adjudication",
      "Part 4 VASRD",
      "Landmark Precedents",
    ]);
    for (const track of ALL_ENACTED_TIMELINE_TRACKS) {
      const count = bundle.events.filter((e) => e.track === track).length;
      expect(count, `Track "${track}" should have >= 4 milestones`).toBeGreaterThanOrEqual(4);
    }
    expect(bundle.events.length).toBeGreaterThanOrEqual(27);

    // 2. Zero quarantined items leak into enacted tracks; every enacted item has Opportunity + Trap split copy
    for (const ev of bundle.events) {
      expect(ev.isQuarantined).toBe(false);
      expect(ev.retroactiveOpportunity.length).toBeGreaterThan(15);
      expect(ev.temporalTrap.length).toBeGreaterThan(15);
      expect(ev.veteranSummary.length).toBeGreaterThan(15);
      expect(ev.practitionerSummary.length).toBeGreaterThan(15);
      expect(ev.identifier ?? "").not.toMatch(/2900-AQ72|90 FR 46542|91 FR 7118/);
    }

    // 3. FR publication-vs-effective metadata is preserved on key regulatory milestones (e.g., 1997 § 4.56 & 2006 § 3.156(c))
    const m1997 = bundle.events.find((e) => e.isoDate === "1997-07-03");
    expect(m1997).toBeDefined();
    expect(m1997?.publicationDate).toBe("1997-06-03");

    const m2006 = bundle.events.find((e) => e.isoDate === "2006-10-06");
    expect(m2006).toBeDefined();
    expect(m2006?.publicationDate).toBe("2006-09-06");

    // 4. All 7 required Quarantined Proposals & Rescinded Rules Watchlist items are present and explicitly flagged non-enacted/rescinded
    const requiredWatchIds = [
      "RIN 2900-AQ72",
      "RIN 2900-AQ73",
      "RIN 2900-AQ82",
      "RIN 2900-AR96",
      "RIN 2900-AS39",
      "90 FR 46542",
      "91 FR 7118",
    ];
    for (const reqId of requiredWatchIds) {
      const item = bundle.quarantinedWatchlist.find((q) => q.identifier === reqId);
      expect(item, `Missing quarantined watchlist item ${reqId}`).toBeDefined();
      expect(item?.isQuarantined).toBe(true);
      expect(item?.statusBadge).toMatch(/Not Enacted|Rescinded/i);
      expect(item?.activeLawBaseline.length).toBeGreaterThan(15);
    }

    const ifr91 = bundle.quarantinedWatchlist.find((q) => q.identifier === "91 FR 7118")!;
    expect(ifr91.statusKind).toBe("rescinded");
    expect(ifr91.rescindedDate).toBe("2026-02-27");
  });

  it("enforces /timeline as the single home for <FisheyeTimelineRail /> (retired from /eras per ADR-0008)", () => {
    const erasPageSrc = readFileSync(
      resolve(REPO_ROOT, "app", "eras", "page.tsx"),
      "utf8",
    );
    const timelinePageSrc = readFileSync(
      resolve(REPO_ROOT, "app", "timeline", "page.tsx"),
      "utf8",
    );

    expect(erasPageSrc).not.toContain("FisheyeTimelineRail");
    expect(erasPageSrc).toContain('href="/timeline"');
    expect(timelinePageSrc).toContain("FisheyeTimelineRail");
    expect(timelinePageSrc).toContain("/illustrations/timeline.webp");
  });
});
