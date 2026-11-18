import { describe, expect, it } from "vitest";
import {
  buildKnowledgeTree,
  extractBrowseCatalog,
  flattenKnowledgeTree,
  type BrowseResourceKind,
  type KnowledgeTreeNode,
} from "@/lib/corpus/knowledge-tree";
import { getCoverageManifest } from "@/lib/corpus/loader";

const VALID_RESOURCE_KINDS = new Set<BrowseResourceKind>([
  "Guide",
  "Regulation",
  "Checklist",
  "Case",
  "Tool",
]);

function countWords(label: string): number {
  return label.trim().split(/\s+/).filter(Boolean).length;
}

function walkWithDepth(
  node: KnowledgeTreeNode,
  depth = 0,
  acc: Array<{ node: KnowledgeTreeNode; depth: number }> = [],
): Array<{ node: KnowledgeTreeNode; depth: number }> {
  acc.push({ node, depth });
  for (const child of node.children ?? []) {
    walkWithDepth(child, depth + 1, acc);
  }
  return acc;
}

describe("Visitor-Need 5-Branch Browse Directory & Map Model (lib/corpus/knowledge-tree.ts)", () => {
  const catalog = extractBrowseCatalog(getCoverageManifest());

  it("shares the exact 5 visitor-need top-level branches & stable anchors across Veteran and Practitioner modes, free of stale build badges", () => {
    const vetTree = buildKnowledgeTree("veteran", "2024-07-01", catalog);
    const pracTree = buildKnowledgeTree("practitioner", "2024-07-01", catalog);

    const expectedTopBranches = [
      { id: "disability-ratings", label: "Disability ratings", anchorId: "disability-ratings" },
      {
        id: "older-decisions",
        label: "Older decisions and review options",
        anchorId: "older-decisions",
      },
      {
        id: "survivor-benefits",
        label: "Survivor and family benefits",
        anchorId: "survivor-benefits",
      },
      {
        id: "records-and-forms",
        label: "Records, forms, and unfamiliar terms",
        anchorId: "records-and-forms",
      },
      {
        id: "law-and-cases",
        label: "Law, cases, and historical changes",
        anchorId: "law-and-cases",
      },
    ];

    expect(
      vetTree.children?.map((b) => ({ id: b.id, label: b.label, anchorId: b.anchorId })),
    ).toEqual(expectedTopBranches);
    expect(
      pracTree.children?.map((b) => ({ id: b.id, label: b.label, anchorId: b.anchorId })),
    ).toEqual(expectedTopBranches);

    // All 5 top-level sibling Browse branches carry matching cut-paper illustrations,
    // while nested sub-folders omit illustrationSrc so Lucide folder icons stay uniform
    for (const topBranch of vetTree.children ?? []) {
      expect(
        topBranch.illustrationSrc,
        `Top-level Browse branch ${topBranch.id} missing illustrationSrc`,
      ).toMatch(/^\/illustrations\/[a-z0-9-]+\.webp$/);
      for (const sub of topBranch.children ?? []) {
        expect(sub.illustrationSrc).toBeUndefined();
      }
    }

    // Mode changes wording of descriptions, not tree shape
    expect(vetTree.description).not.toBe(pracTree.description);

    for (const root of [vetTree, pracTree]) {
      const withDepth = walkWithDepth(root);
      for (const { node, depth } of withDepth) {
        // Zero stale Queued / Wave / Bookmark badges anywhere in the tree
        const combined = `${node.label} ${node.badge ?? ""} ${node.description}`;
        expect(combined, `Stale jargon in node ${node.id}`).not.toMatch(
          /\b(?:Queued\s+W\d|Wave\s+[1-9]|Held-at-Gate|Active\s+Bookmark)\b/i,
        );
        expect(node.nodeStatus).not.toBe("placeholder");

        // Top-level & second-level map labels stay <= 4 words
        if (depth <= 2) {
          const mapLabel = node.shortLabel ?? node.label;
          expect(
            countWords(mapLabel),
            `Map shortLabel "${mapLabel}" on ${node.id} (depth ${depth}) exceeds 4 words`,
          ).toBeLessThanOrEqual(4);
        }

        // Every destination leaf with an href carries a plain resourceKind tag
        if (node.href && (!node.children || node.children.length === 0)) {
          expect(
            node.resourceKind && VALID_RESOURCE_KINDS.has(node.resourceKind),
            `Destination node ${node.id} (${node.href}) missing valid resourceKind`,
          ).toBe(true);
        }
      }
    }

    // All 16 VASRD schedules are represented from coverage-manifest.json
    const vetFlat = flattenKnowledgeTree(vetTree);
    for (const sys of catalog.vasrdSystems) {
      expect(
        vetFlat.some((n) => n.href === `/vasrd/${sys.systemId}`),
        `Missing VASRD system ${sys.systemId} in Browse tree`,
      ).toBe(true);
    }
    expect(vetFlat.some((n) => n.label.includes("90 FR 46542"))).toBe(true);
  });

  it("updates temporal rule nodes deterministically when Decision Date changes (1954 vs. 1997-06-20 trap vs. 1969 vs. 2024)", () => {
    // 1. June 20, 1997 (between 1997-06-03 FR pub and 1997-07-03 effective date of § 4.56)
    const pracJune1997 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "1997-06-20", catalog),
    );
    const m456June = pracJune1997.find((n) => n.id === "law-cfr-456");
    expect(m456June).toBeDefined();
    expect(m456June?.href).toBe("/cfr/38-cfr-4.56/1946-04-01");
    expect(m456June?.badge).toContain("Pub-Gap Trap");

    // 2. Post-July 3, 1997 resolves § 4.56 node to 1997-07-03 floor
    const prac2024 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "2024-07-01", catalog),
    );
    const m456Now = prac2024.find((n) => n.id === "law-cfr-456");
    expect(m456Now?.href).toBe("/cfr/38-cfr-4.56/1997-07-03");

    // 3. Korean-era 1954-06-15 reflects Era A Vet. Reg. No. 1(a), Pre-Bell record scope, active § 3.157(b), and Pre-1962 § 3.156(c) gap
    const prac1954 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "1954-06-15", catalog),
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

    // 4. Veteran mode also updates historical scar/muscle nodes when Decision Date is 1969-11-15
    const vet1969 = flattenKnowledgeTree(
      buildKnowledgeTree("veteran", "1969-11-15", catalog),
    );
    expect(vet1969.find((n) => n.id === "law-cfr-456")?.href).toBe(
      "/cfr/38-cfr-4.56/1946-04-01",
    );
    expect(vet1969.find((n) => n.id === "law-cfr-4118")?.badge).toContain(
      "Single 10% Cap",
    );
  });

  it("emits semantic relationship edge labels (amends, interprets, pierces finality, limits), era-driven branching, and visual tool links with 1:1 Directory/Map parity", () => {
    const vetTree = buildKnowledgeTree("veteran", "2024-07-01", catalog);
    const pracTree = buildKnowledgeTree("practitioner", "2024-07-01", catalog);

    const vetFlat = flattenKnowledgeTree(vetTree);
    const pracFlat = flattenKnowledgeTree(pracTree);

    // 1:1 parity on node IDs and semantic edgeRelation tags across both personas
    expect(vetFlat.map((n) => ({ id: n.id, edgeRelation: n.edgeRelation }))).toEqual(
      pracFlat.map((n) => ({ id: n.id, edgeRelation: n.edgeRelation })),
    );

    // All 4 semantic edge relations required by E6-S2 are represented
    const edgeSet = new Set(pracFlat.map((n) => n.edgeRelation).filter(Boolean));
    expect(edgeSet.has("amends")).toBe(true);
    expect(edgeSet.has("interprets")).toBe(true);
    expect(edgeSet.has("pierces finality")).toBe(true);
    expect(edgeSet.has("limits")).toBe(true);

    // Featured visual tools from E6-S1 & E6-S3 are wired into Browse
    const flowchartNode = pracFlat.find(
      (n) => n.id === "tool-piercing-finality-flowchart",
    );
    expect(flowchartNode?.href).toBe("/explore/piercing-finality");
    expect(flowchartNode?.resourceKind).toBe("Tool");
    expect(flowchartNode?.edgeRelation).toBe("pierces finality");

    const timelineNode = pracFlat.find((n) => n.id === "tool-law-timeline");
    expect(timelineNode?.href).toBe("/timeline");
    expect(timelineNode?.resourceKind).toBe("Tool");

    // Era-driven appeal & development branching updates deterministically across 1954, 1995, 2010, and 2024
    const era1954 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "1954-06-15", catalog),
    );
    const era1995 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "1995-05-01", catalog),
    );
    const era2010 = flattenKnowledgeTree(
      buildKnowledgeTree("practitioner", "2010-05-01", catalog),
    );
    const era2024 = pracFlat;

    expect(era1954.find((n) => n.id === "law-appeal-regime")?.badge).toMatch(
      /Pre-1963/i,
    );
    expect(era1995.find((n) => n.id === "law-development-regime")?.badge).toMatch(
      /Well-Grounded/i,
    );
    expect(era1995.find((n) => n.id === "law-development-regime")?.edgeRelation).toBe(
      "limits",
    );
    expect(era2010.find((n) => n.id === "law-development-regime")?.badge).toMatch(
      /VCAA/i,
    );
    expect(era2024.find((n) => n.id === "law-appeal-regime")?.badge).toMatch(
      /AMA|Hamill/i,
    );
  });
});
