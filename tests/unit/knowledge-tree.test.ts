import { describe, expect, it } from "vitest";
import {
  buildKnowledgeTree,
  flattenKnowledgeTree,
} from "@/lib/corpus/knowledge-tree";

describe("Dual-Mode Decision-Date-Reactive Knowledge Tree (lib/corpus/knowledge-tree.ts)", () => {
  it("builds distinct Veteran situation/pathway tree vs. Practitioner Title 38 law tree", () => {
    const vetTree = buildKnowledgeTree("veteran", "2024-07-01");
    const pracTree = buildKnowledgeTree("practitioner", "2024-07-01");

    expect(vetTree.id).toBe("root-veteran");
    expect(pracTree.id).toBe("root-practitioner");
    expect(vetTree.label).not.toBe(pracTree.label);

    const vetFlat = flattenKnowledgeTree(vetTree);
    const pracFlat = flattenKnowledgeTree(pracTree);

    expect(vetFlat.some((n) => n.label.includes("Gunshot, Shrapnel"))).toBe(true);
    expect(vetFlat.some((n) => n.label.includes("Paperwork Clues"))).toBe(true);

    expect(pracFlat.some((n) => n.label.includes("Part 4 — VASRD"))).toBe(true);
    expect(pracFlat.some((n) => n.label.includes("90 FR 46542"))).toBe(true);
  });

  it("morphs Practitioner & Veteran tree nodes deterministically when Decision Date changes (1954 vs. 1997-06-20 trap vs. 2024)", () => {
    // 1. June 20, 1997 (between 1997-06-03 FR pub and 1997-07-03 effective date of § 4.56)
    const pracJune1997 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "1997-06-20"),
    );
    const m456June = pracJune1997.find((n) => n.id === "law-cfr-456");
    expect(m456June).toBeDefined();
    expect(m456June?.href).toBe("/cfr/38-cfr-4.56/1946-04-01");
    expect(m456June?.badge).toContain("Pub-Gap Trap");

    // 2. Post-July 3, 1997 resolves § 4.56 node to 1997-07-03 floor
    const prac2024 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "2024-07-01"),
    );
    const m456Now = prac2024.find((n) => n.id === "law-cfr-456");
    expect(m456Now?.href).toBe("/cfr/38-cfr-4.56/1997-07-03");

    // 3. Korean-era 1954-06-15 reflects Era A Vet. Reg. No. 1(a), Pre-Bell record scope, active § 3.157(b), and Pre-1962 § 3.156(c) gap
    const prac1954 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "1954-06-15"),
    );
    expect(prac1954.find((n) => n.id === "law-statute-era")?.label).toContain(
      "Vet. Reg. No. 1(a)",
    );
    expect(prac1954.find((n) => n.id === "law-bell-scope")?.badge).toContain(
      "Pre-Bell",
    );
    expect(prac1954.find((n) => n.id === "law-3157b")?.badge).toContain("Active");
    expect(prac1954.find((n) => n.id === "law-cfr-3156c")?.nodeStatus).toBe(
      "quarantined",
    );

    // 4. Veteran tree also updates its historical rule nodes when Decision Date is pre-1997 / pre-2008
    const vet1969 = flattenKnowledgeTree(
      buildKnowledgeTree("veteran", "1969-11-15"),
    );
    expect(vet1969.find((n) => n.id === "vet-scar-muscle-rule")?.href).toBe(
      "/cfr/38-cfr-4.56/1946-04-01",
    );
    expect(vet1969.find((n) => n.id === "vet-scar-count-rule")?.badge).toContain(
      "Single 10% Cap",
    );
  });
});
