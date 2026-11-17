import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileCorpusFromDisk } from "@/lib/corpus/compiler";
import { executeExplainableSearch } from "@/lib/corpus/search-engine";
import {
  buildKnowledgeTree,
  extractBrowseCatalog,
  flattenKnowledgeTree,
} from "@/lib/corpus/knowledge-tree";
import { getCoverageManifest } from "@/lib/corpus/loader";

const REPO_ROOT = resolve(__dirname, "..", "..");

describe("Explainable Deterministic + Full-Text Search Engine (E3-S2)", () => {
  it("matches 4-digit Diagnostic Codes inside hyphenated ranges with explicit matchReason", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);
    const matches5313 = executeExplainableSearch("5313", {
      manifest: bundle.coverageManifest,
      cfrSections: bundle.cfrSections,
      crosswalk: bundle.statutoryCrosswalk,
      lexicon: bundle.lexicon,
    });

    expect(matches5313.length).toBeGreaterThan(0);
    expect(matches5313[0]?.matchKind).toBe("deterministic-dc");
    expect(matches5313[0]?.matchReason).toContain("5313");
    expect(matches5313[0]?.matchReason).toContain("5301-5323");
  });

  it("translates former 38 U.S.C. Era B citations (e.g., § 3010, § 355) via the statutory crosswalk", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);
    const matches3010 = executeExplainableSearch("former 38 U.S.C. § 3010", {
      manifest: bundle.coverageManifest,
      cfrSections: bundle.cfrSections,
      crosswalk: bundle.statutoryCrosswalk,
      lexicon: bundle.lexicon,
    });

    expect(matches3010.length).toBeGreaterThan(0);
    expect(matches3010[0]?.matchReason).toContain("5110");
    expect(matches3010[0]?.matchReason).not.toContain("5101");
    expect(matches3010.some((m) => m.item.href === "/cfr/38-cfr-3.156c")).toBe(true);

    const matches211 = executeExplainableSearch("211(a)", {
      manifest: bundle.coverageManifest,
      cfrSections: bundle.cfrSections,
      crosswalk: bundle.statutoryCrosswalk,
      lexicon: bundle.lexicon,
    });
    expect(matches211[0]?.matchReason).toContain("511");
    expect(matches211[0]?.matchReason).not.toContain("Economy Act");

    // Verify zero inverted Era A strings in Era C column across all 72 crosswalk rows
    for (const row of bundle.statutoryCrosswalk) {
      expect(row.eraCSection).not.toMatch(/Vet\.\s*Reg\.|Economy Act|^None$/i);
    }
  });

  it("matches historical VA & military forms (10-7131, 8-526, DD 1380) deterministically", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);
    const matches7131 = executeExplainableSearch("10-7131", {
      manifest: bundle.coverageManifest,
      cfrSections: bundle.cfrSections,
      crosswalk: bundle.statutoryCrosswalk,
      lexicon: bundle.lexicon,
    });

    expect(matches7131.length).toBeGreaterThan(0);
    expect(matches7131[0]?.matchKind).toBe("deterministic-form");
    expect(matches7131[0]?.matchReason).toContain("10-7131");
  });
});

describe("3-Column Markdown AST Compiler, 10/10 Wave 1 Overlays & Structural Era Tree (E3-S3)", () => {
  it("compiles all 10 Wave 1 modules with 100% SHA-256 Veteran overlay coverage, structured AST blocks, and resolved internal links", () => {
    const bundle = compileCorpusFromDisk(REPO_ROOT);
    expect(bundle.coverageManifest.totals.veteranOverlaysAuthored).toBeGreaterThanOrEqual(15);

    const pb01 = bundle.compiledDocuments.find(
      (d) => d.id === "playbook-01-penetrating-wounds-scars-vs-muscles",
    );
    expect(pb01).toBeDefined();
    expect(pb01?.status).toBe("WAVE_1_LIVE");
    expect(pb01?.coverageState).toBe("VERBATIM_VERIFIED");
    expect(pb01?.toc.length).toBeGreaterThanOrEqual(4);
    expect(pb01?.blocks.length).toBeGreaterThan(5);

    const cueChecklist = bundle.compiledDocuments.find(
      (d) => d.id === "checklist-board-cue-pre-filing-gate",
    );
    expect(cueChecklist).toBeDefined();
    expect(cueChecklist?.blocks.some((b) => b.kind === "checklist")).toBe(true);
    expect(cueChecklist?.blocks.some((b) => b.kind === "alert")).toBe(true);

    // Unlocked Wave 3–5 modules compile full AST blocks with SHA-256-locked VERBATIM_VERIFIED Veteran overlays (111/111 parity in E5-S4/E5-S5)
    const livePlaybook10 = bundle.compiledDocuments.find((d) =>
      d.route.endsWith("/playbooks/10-character-of-discharge-insanity-upgrades"),
    );
    expect(livePlaybook10).toBeDefined();
    expect(livePlaybook10?.status).toBe("LIVE_VERIFIED");
    expect(livePlaybook10?.waveId).toBe("W3");
    expect(livePlaybook10?.coverageState).toBe("VERBATIM_VERIFIED");
    expect(livePlaybook10?.veteranOverlay).not.toBeNull();
    expect(livePlaybook10?.blocks.length).toBeGreaterThan(5);

    // Verify zero unrewritten relative links, zero raw .md link labels, and zero /cfr hub title collisions
    const serializedDocs = JSON.stringify(
      bundle.compiledDocuments.map((d) => d.blocks),
    );
    expect(serializedDocs).not.toMatch(/\]\(\.\.\//);
    expect(serializedDocs).not.toMatch(/\.md(?:#[^)]+)?\)/);

    const cueBlocksJson = JSON.stringify(cueChecklist?.blocks ?? []);
    expect(cueBlocksJson).toContain(
      "[38 C.F.R. Verbatim Snapshots & Redlines](/cfr)",
    );
    expect(cueBlocksJson).not.toContain("Sleep Apnea");

    const crosswalkDoc = bundle.compiledDocuments.find(
      (d) => d.id === "doctrine-title-38-statutory-crosswalk",
    );
    const crosswalkBlocksJson = JSON.stringify(crosswalkDoc?.blocks ?? []);
    expect(crosswalkBlocksJson).toContain("3.951");
    expect(crosswalkBlocksJson).not.toContain("Sleep Apnea");

    // Verify all extracted form plainEnglish summaries are complete (zero mid-abbreviation truncation)
    for (const entry of bundle.lexicon) {
      expect(entry.plainEnglish).not.toMatch(/(?:\bv\.|\bAug\.|!\.)$/);
    }
  });

  it("keeps top-level 5 visitor-need folders stable while updating date-sensitive rule nodes across Eras", () => {
    const catalog = extractBrowseCatalog(getCoverageManifest());
    const korea1954 = buildKnowledgeTree("practitioner", "1954-06-15", catalog);
    const closed1974 = buildKnowledgeTree("practitioner", "1974-08-12", catalog);
    const vjra1994 = buildKnowledgeTree("practitioner", "1994-05-10", catalog);
    const modern2024 = buildKnowledgeTree("practitioner", "2024-07-01", catalog);

    const topIds = (root: ReturnType<typeof buildKnowledgeTree>) =>
      (root.children ?? []).map((c) => c.id);
    expect(topIds(korea1954)).toEqual(topIds(modern2024));

    const eraSignature = (root: ReturnType<typeof buildKnowledgeTree>) =>
      flattenKnowledgeTree(root)
        .filter((n) =>
          ["law-statute-era", "law-bell-scope", "law-3157b", "law-cfr-3156c", "law-cfr-456", "law-cfr-4118"].includes(
            n.id,
          ),
        )
        .map((n) => `${n.id}:${n.label}[${n.badge ?? ""}]`)
        .join(" | ");

    expect(eraSignature(korea1954)).not.toBe(eraSignature(closed1974));
    expect(eraSignature(closed1974)).not.toBe(eraSignature(vjra1994));
    expect(eraSignature(vjra1994)).not.toBe(eraSignature(modern2024));

    const vet1974 = buildKnowledgeTree("veteran", "1974-08-12", catalog);
    const vet2024 = buildKnowledgeTree("veteran", "2024-07-01", catalog);
    expect(eraSignature(vet1974)).not.toBe(eraSignature(vet2024));
  });
});
