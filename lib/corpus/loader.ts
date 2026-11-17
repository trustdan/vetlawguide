import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadVeteranOverlays } from "./compiler";
import { buildSearchableCatalog, type SearchEngineCatalog } from "./search-engine";
import {
  parseMasterChronologicalMatrix,
  type CompiledTimelineBundle,
} from "./timeline";
import type {
  CfrVersionRecord,
  CompiledCfrSection,
  CompiledCfrVersion,
  CompiledDocument,
  CoverageManifest,
  DocumentCategory,
  LexiconEntry,
  PrecedentEntry,
  SearchableItem,
  StatutoryCrosswalkEntry,
  VeteranOverlay,
} from "./types";

export const DOCUMENT_CATEGORY_LABELS: Readonly<Record<DocumentCategory, string>> = {
  "authority-snapshot": "Verbatim CFR Snapshot",
  "cfr-diff": "Historical CFR Redline",
  playbook: "Investigation Playbook",
  checklist: "Pre-Filing Gate Checklist",
  doctrine: "Legal Doctrine Reference",
  "era-lens": "Historical Era Lens",
};

function readGeneratedJson<T>(fileName: string): T {
  const filePath = resolve(process.cwd(), "corpus", "generated", fileName);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function getCoverageManifest(): CoverageManifest {
  return readGeneratedJson<CoverageManifest>("coverage-manifest.json");
}

export function getCompiledCfrVersions(): CompiledCfrVersion[] {
  return readGeneratedJson<CompiledCfrVersion[]>("cfr-versions.json");
}

export function getCompiledCfrSections(): CompiledCfrSection[] {
  return readGeneratedJson<CompiledCfrSection[]>("cfr-sections.json");
}

export function getCompiledCfrSectionBySlug(
  sectionSlug: string,
): CompiledCfrSection | null {
  const all = getCompiledCfrSections();
  return all.find((s) => s.sectionSlug === sectionSlug.toLowerCase()) ?? null;
}

export function getCompiledLexicon(): LexiconEntry[] {
  return readGeneratedJson<LexiconEntry[]>("lexicon.json");
}

export function getStatutoryCrosswalk(): StatutoryCrosswalkEntry[] {
  return readGeneratedJson<StatutoryCrosswalkEntry[]>("statutory-crosswalk.json");
}

export function getCompiledPrecedents(): PrecedentEntry[] {
  return readGeneratedJson<PrecedentEntry[]>("precedents.json");
}

export function getCompiledDocuments(): CompiledDocument[] {
  return readGeneratedJson<CompiledDocument[]>("compiled-documents.json");
}

export function getCompiledDocumentsByCategory(
  category: DocumentCategory,
): CompiledDocument[] {
  return getCompiledDocuments().filter((d) => d.category === category);
}

export function getPlaybookDocuments(): CompiledDocument[] {
  return getCompiledDocumentsByCategory("playbook");
}

export function getDoctrineDocuments(): CompiledDocument[] {
  return getCompiledDocumentsByCategory("doctrine");
}

export function getChecklistDocuments(): CompiledDocument[] {
  return getCompiledDocumentsByCategory("checklist");
}

export function getEraDocuments(): CompiledDocument[] {
  return getCompiledDocumentsByCategory("era-lens");
}

export function getCfrModuleDocuments(): CompiledDocument[] {
  return getCompiledDocuments().filter((d) => d.route.startsWith("/cfr/modules/"));
}

export function getLiveReaderDocuments(): CompiledDocument[] {
  return getCompiledDocuments().filter((d) => d.status !== "HELD_AT_GATE");
}

export function getRelatedReaderDocuments(
  doc: CompiledDocument,
  limit = 6,
): CompiledDocument[] {
  const all = getLiveReaderDocuments().filter((d) => d.id !== doc.id);
  const scored = all.map((cand) => {
    let score = 0;
    if (doc.vasrdSystem && cand.vasrdSystem === doc.vasrdSystem) score += 10;
    if (cand.category === doc.category) score += 2;
    const domOverlap = (cand.practiceDomains ?? []).filter((dom) =>
      (doc.practiceDomains ?? []).includes(dom),
    ).length;
    score += domOverlap * 3;
    return { cand, score };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.cand.title.localeCompare(b.cand.title))
    .slice(0, limit)
    .map((x) => x.cand);
}

export function getCompiledDocumentByRoute(route: string): CompiledDocument | null {
  return getCompiledDocuments().find((d) => d.route === route) ?? null;
}

export function getSearchEngineCatalog(): SearchEngineCatalog {
  return {
    manifest: getCoverageManifest(),
    cfrSections: getCompiledCfrSections(),
    crosswalk: getStatutoryCrosswalk(),
    lexicon: getCompiledLexicon(),
  };
}

export function getVeteranOverlaysById(): Record<string, VeteranOverlay> {
  const map = loadVeteranOverlays(resolve(process.cwd(), "content", "overlays", "veteran"));
  return Object.fromEntries(map.entries());
}

export function buildGlobalSearchItems(): SearchableItem[] {
  return buildSearchableCatalog(getSearchEngineCatalog());
}

export function getCompiledTimelineBundle(
  repoRoot: string = process.cwd(),
): CompiledTimelineBundle {
  const matrixMd = readFileSync(
    resolve(repoRoot, "corpus", "upstream", "docs", "master-chronological-matrix.md"),
    "utf8",
  );
  const cfrJson = JSON.parse(
    readFileSync(
      resolve(repoRoot, "corpus", "upstream", "knowledge", "cfr-amendments.json"),
      "utf8",
    ),
  ) as { versions: CfrVersionRecord[] };
  const manifest = JSON.parse(
    readFileSync(
      resolve(repoRoot, "corpus", "generated", "coverage-manifest.json"),
      "utf8",
    ),
  ) as { checkedAsOf?: string };
  return parseMasterChronologicalMatrix(
    matrixMd,
    cfrJson.versions,
    manifest.checkedAsOf ?? "2026-11-17",
  );
}
