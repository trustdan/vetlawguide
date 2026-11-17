import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import type {
  BitemporalScope,
  CfrVersionRecord,
  CompiledCfrSection,
  CompiledCfrVersion,
  CompiledDocument,
  CompiledModuleSummary,
  CoverageManifest,
  CoverageState,
  LexiconEntry,
  ManifestLock,
  PracticeDomainCoverage,
  PrecedentEntry,
  StatutoryCrosswalkEntry,
  UpstreamIndexEntry,
  VasrdSystemCoverage,
  VeteranOverlay,
} from "./types";
import {
  CANONICAL_PRACTICE_DOMAINS,
  CANONICAL_VASRD_SYSTEMS,
} from "./types";
import { BASELINE_ACRONYMS, FORM_PLAIN_ENGLISH_BY_KEY } from "./acronyms";
import {
  enrichUpstreamCfrRecords,
  extractCompiledCfrSections,
} from "./cfr-extractor";
import { buildEnrichedPrecedentDirectory } from "./eras-and-authorities";
import { extractCompiledDocuments } from "./markdown-ast";
import { toCompiledCfrVersions, validateCfrVersionChains } from "./temporal";

export interface CompiledCorpusBundle {
  manifestLock: ManifestLock;
  coverageManifest: CoverageManifest;
  cfrVersions: CompiledCfrVersion[];
  cfrSections: CompiledCfrSection[];
  compiledDocuments: CompiledDocument[];
  statutoryCrosswalk: StatutoryCrosswalkEntry[];
  lexicon: LexiconEntry[];
  precedents: PrecedentEntry[];
  linkResolutionMap: Record<string, string>;
}

export function sha256Hex(buffer: Buffer | string): string {
  return createHash("sha256").update(buffer).digest("hex");
}

const DIRECT_CFR_ENTITY_ROUTES: Record<string, string> = {
  "38-cfr-4.56-muscle-injuries-1946-to-present": "/cfr/38-cfr-4.56",
  "muscle-injuries-dc-5301-5323": "/cfr/38-cfr-4.56#redline-diff",
  "38-cfr-4.118-scars-evolution": "/cfr/38-cfr-4.118",
  "scars-dc-7800-7805": "/cfr/38-cfr-4.118#redline-diff",
  "38-cfr-3.156c-service-records-evolution": "/cfr/38-cfr-3.156c",
};

const DIRECT_CFR_ENTITY_STEMS = new Set(Object.keys(DIRECT_CFR_ENTITY_ROUTES));

export function moduleCanonicalRoute(entry: UpstreamIndexEntry): string {
  const stem = posix.basename(entry.path, ".md");
  if (stem in DIRECT_CFR_ENTITY_ROUTES) {
    return DIRECT_CFR_ENTITY_ROUTES[stem]!;
  }
  switch (entry.category) {
    case "playbook":
      return `/playbooks/${stem}`;
    case "checklist":
      return `/checklists/${stem}`;
    case "era-lens":
      return `/eras/${stem}`;
    case "doctrine":
      return `/docs/${stem}`;
    case "cfr-diff":
    case "authority-snapshot":
      return `/cfr/modules/${stem}`;
  }
}

export function loadVeteranOverlays(overlaysDir: string): Map<string, VeteranOverlay> {
  const map = new Map<string, VeteranOverlay>();
  if (!existsSync(overlaysDir)) {
    return map;
  }

  for (const name of readdirSync(overlaysDir).sort()) {
    if (!name.endsWith(".json")) continue;
    const raw = readFileSync(join(overlaysDir, name), "utf8");
    const parsed = JSON.parse(raw) as VeteranOverlay;
    map.set(parsed.upstream_id, parsed);
  }
  return map;
}

export function compileCorpusFromDisk(repoRoot: string): CompiledCorpusBundle {
  const lockPath = resolve(repoRoot, "corpus", "manifest.lock.json");
  const upstreamDir = resolve(repoRoot, "corpus", "upstream");
  const overlaysDir = resolve(repoRoot, "content", "overlays", "veteran");

  if (!existsSync(lockPath)) {
    throw new Error(
      `Missing corpus/manifest.lock.json at ${lockPath}. Run "pnpm corpus:sync" first.`,
    );
  }

  const manifestLock = JSON.parse(readFileSync(lockPath, "utf8")) as ManifestLock;

  const indexJsonPath = join(upstreamDir, "knowledge", "index.json");
  const heldJsonPath = join(upstreamDir, "knowledge", "held-at-gate.json");
  const cfrJsonPath = join(upstreamDir, "knowledge", "cfr-amendments.json");
  const ledgerPath = resolve(repoRoot, "corpus", "ingestion-ledger.json");
  const pathToWave = new Map<string, string>();

  let activeBookmarkWave = "W1";
  if (existsSync(ledgerPath)) {
    const parsedLedger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      activeBookmark?: string;
      waves?: Array<{ waveId: string; files: string[] }>;
    };
    activeBookmarkWave = parsedLedger.activeBookmark ?? "W1";
    for (const w of parsedLedger.waves ?? []) {
      for (const f of w.files) {
        pathToWave.set(f.replace(/\\/g, "/"), w.waveId);
      }
    }
  }

  const upstreamIndex = JSON.parse(readFileSync(indexJsonPath, "utf8")) as {
    schema_version: string;
    total_documents: number;
    entries: UpstreamIndexEntry[];
  };

  const heldAtGateRaw = existsSync(heldJsonPath)
    ? (JSON.parse(readFileSync(heldJsonPath, "utf8")) as {
        heldEntries: Array<{
          id: string;
          title: string;
          category: UpstreamIndexEntry["category"];
          path: string;
          waveId: string;
        }>;
      }).heldEntries
    : [];

  const upstreamCfr = JSON.parse(readFileSync(cfrJsonPath, "utf8")) as {
    schema_version: string;
    versions: CfrVersionRecord[];
  };

  // 1. Validate CFR temporal chains across both raw upstream and enriched Wave 1 records
  const enrichedRawVersions = enrichUpstreamCfrRecords(upstreamCfr.versions);
  const chainErrors = validateCfrVersionChains(enrichedRawVersions);
  if (chainErrors.length > 0) {
    throw new Error(
      `CFR version chain validation failed:\n- ${chainErrors.join("\n- ")}`,
    );
  }

  const cfrVersions = toCompiledCfrVersions(enrichedRawVersions);
  const uniqueCfrSections = new Set(cfrVersions.map((v) => v.sectionSlug));

  // 2. Build path -> canonical web route map across BOTH unlocked modules and held-at-gate placeholders
  const pathToRoute = new Map<string, string>();
  const heldPathSet = new Set<string>();

  for (const entry of upstreamIndex.entries) {
    const normalizedPath = entry.path.replace(/\\/g, "/");
    pathToRoute.set(normalizedPath, moduleCanonicalRoute(entry));
  }
  for (const held of heldAtGateRaw) {
    const normalizedPath = held.path.replace(/\\/g, "/");
    heldPathSet.add(normalizedPath);
    pathToRoute.set(
      normalizedPath,
      moduleCanonicalRoute({
        id: held.id,
        title: held.title,
        category: held.category,
        path: normalizedPath,
        effective_from: "1946-04-01",
        effective_to: "present",
        statutes: [],
        cfr_citations: [],
        key_precedents: [],
        retro_pathways: [],
        verification_status: "held-at-gate",
      }),
    );
  }

  const linkResolutionMap: Record<string, string> = {};
  const linkTitleMap: Record<string, string> = {};
  const brokenLinks: string[] = [];
  let resolvedMarkdownLinks = 0;

  const mdLinkRe = /\[([^\]]+)\]\((?!https?:\/\/|mailto:|#|\/)([^)]+)\)/g;

  const DIRECTORY_HUB_ROUTES: Record<string, { route: string; title: string }> = {
    "README.md": { route: "/", title: "VetLawGuide Research Desk" },
    authorities: { route: "/cfr", title: "38 C.F.R. Verbatim Snapshots & Redlines" },
    "authorities/README.md": { route: "/cfr", title: "38 C.F.R. Verbatim Snapshots & Redlines" },
    "authorities/part-3": { route: "/cfr", title: "38 C.F.R. Part 3 Snapshots" },
    "authorities/part-4": { route: "/vasrd", title: "38 C.F.R. Part 4 VASRD Snapshots" },
    "authorities/part-20": { route: "/cfr", title: "38 C.F.R. Part 20 Appeals & CUE Snapshots" },
    "cfr-diffs": { route: "/cfr", title: "38 C.F.R. Historical Redline Comparisons" },
    "cfr-diffs/README.md": { route: "/cfr", title: "38 C.F.R. Historical Redline Comparisons" },
    "cfr-diffs/part-3": { route: "/cfr", title: "Part 3 Historical Comparisons" },
    "cfr-diffs/part-20": { route: "/cfr", title: "Part 19/20 & Part 14 Historical Comparisons" },
    "cfr-diffs/part-4-policy": { route: "/vasrd/part-4-general-policy", title: "Part 4 Subpart A General Rating Policy" },
    "cfr-diffs/vasrd": { route: "/vasrd", title: "15-System VASRD Rating Schedule Hub" },
    "knowledge/cfr-amendments.json": { route: "/cfr", title: "Point-in-Time 38 C.F.R. Version Ledger" },
    playbooks: { route: "/playbooks", title: "Issue-Spotting Playbooks" },
    "playbooks/README.md": { route: "/playbooks", title: "Issue-Spotting Playbooks" },
    checklists: { route: "/checklists", title: "Pre-Filing Verification Checklists" },
    "checklists/README.md": { route: "/checklists", title: "Pre-Filing Verification Checklists" },
    docs: { route: "/docs", title: "Legal Doctrine Hub" },
    "docs/README.md": { route: "/docs", title: "Legal Doctrine Hub" },
    eras: { route: "/eras", title: "Historical Era Lenses (1945–2026)" },
    "eras/README.md": { route: "/eras", title: "Historical Era Lenses (1945–2026)" },
  };

  const UPSTREAM_AUTHORING_META_PREFIXES = [
    "knowledge/",
    "schemas/",
    "epics/",
    "scripts/",
    "tests/",
    ".agents/",
  ];

  const UPSTREAM_AUTHORING_META_FILES = new Set([
    "BACKLOG.md",
    "ROADMAP.md",
    "AGENTS.md",
    "epics",
    "schemas",
    "scripts",
    "knowledge",
  ]);

  const pathToTitle = new Map<string, string>();
  for (const entry of upstreamIndex.entries) {
    pathToTitle.set(entry.path.replace(/\\/g, "/"), entry.title);
  }
  for (const held of heldAtGateRaw) {
    pathToTitle.set(held.path.replace(/\\/g, "/"), held.title);
  }

  for (const entry of upstreamIndex.entries) {
    const relPath = entry.path.replace(/\\/g, "/");
    const absFile = join(upstreamDir, relPath);
    if (!existsSync(absFile)) {
      brokenLinks.push(`Missing upstream module file: ${relPath}`);
      continue;
    }

    const mdContent = readFileSync(absFile, "utf8");
    const baseDir = posix.dirname(relPath);

    for (const match of mdContent.matchAll(mdLinkRe)) {
      const rawTarget = match[2];
      if (!rawTarget) continue;
      const [filePart, hashPart] = rawTarget.split("#");
      if (!filePart) continue;
      const resolvedRel = posix
        .normalize(posix.join(baseDir, filePart))
        .replace(/\/$/, "");

      if (resolvedRel in DIRECTORY_HUB_ROUTES) {
        const hub = DIRECTORY_HUB_ROUTES[resolvedRel]!;
        linkResolutionMap[`${relPath}::${rawTarget}`] = hashPart
          ? `${hub.route}#${hashPart}`
          : hub.route;
        linkTitleMap[`${relPath}::${rawTarget}`] = hub.title;
        resolvedMarkdownLinks += 1;
        continue;
      }

      // Upstream authoring meta-files (schemas/, epics/, scripts/, knowledge/inbox/, BACKLOG.md) are stripped cleanly to non-clickable labels
      if (
        UPSTREAM_AUTHORING_META_FILES.has(resolvedRel) ||
        UPSTREAM_AUTHORING_META_PREFIXES.some((p) => resolvedRel.startsWith(p))
      ) {
        linkResolutionMap[`${relPath}::${rawTarget}`] = "";
        resolvedMarkdownLinks += 1;
        continue;
      }

      const targetAbs = join(upstreamDir, resolvedRel);
      if (!existsSync(targetAbs) && !heldPathSet.has(resolvedRel)) {
        brokenLinks.push(`${relPath} -> unresolved relative link "${rawTarget}" (${resolvedRel})`);
        continue;
      }

      const route = pathToRoute.get(resolvedRel) ?? `/docs/${posix.basename(resolvedRel, ".md")}`;
      const finalRoute = hashPart ? `${route}#${hashPart}` : route;
      linkResolutionMap[`${relPath}::${rawTarget}`] = finalRoute;
      const exactTitle = pathToTitle.get(resolvedRel);
      if (exactTitle) {
        linkTitleMap[`${relPath}::${rawTarget}`] = exactTitle;
      }
      resolvedMarkdownLinks += 1;
    }
  }

  if (brokenLinks.length > 0) {
    throw new Error(
      `Broken internal Markdown links in upstream corpus:\n- ${brokenLinks.join("\n- ")}`,
    );
  }

  // 3. Load Veteran overlays, extract compiled CFR sections & synchronize cfrVersions coverageState parity
  const overlays = loadVeteranOverlays(overlaysDir);
  const initialCfrVersions = cfrVersions;
  const cfrSections = extractCompiledCfrSections({
    upstreamDir,
    compiledVersions: initialCfrVersions,
    upstreamEntries: upstreamIndex.entries,
    overlays,
    heldAtGateCount: heldAtGateRaw.length,
    routeResolver: moduleCanonicalRoute,
  });

  const snapshotByVersionId = new Map<
    string,
    CompiledCfrSection["versions"][number]
  >();
  for (const sec of cfrSections) {
    for (const snap of [...sec.versions, ...sec.quarantinedWatchlist]) {
      snapshotByVersionId.set(snap.version_id, snap);
    }
  }
  const syncedCfrVersions: CompiledCfrVersion[] = initialCfrVersions.map((v) => {
    const snap = snapshotByVersionId.get(v.version_id);
    if (!snap) return v;
    return {
      ...v,
      applicability_and_transition_notes: snap.applicability_and_transition_notes,
      sectionSlug: snap.sectionSlug,
      permalink: snap.permalink,
      coverageState: snap.coverageState,
    };
  });

  const modules: CompiledModuleSummary[] = upstreamIndex.entries.map((entry) => {
    const hasVeteranOverlay = overlays.has(entry.id);
    const coverageState: CoverageState = hasVeteranOverlay
      ? "VERBATIM_VERIFIED"
      : "PLAIN_ENGLISH_IN_PROGRESS";

    return {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      upstreamPath: entry.path.replace(/\\/g, "/"),
      canonicalRoute: moduleCanonicalRoute(entry),
      coverageState,
      hasVeteranOverlay,
      bitemporalScope: (entry.bitemporal_scope as BitemporalScope | undefined) ?? null,
      practiceDomains: entry.practice_domains ?? [],
      vasrdSystem: entry.vasrd_system ?? null,
      diagnosticCodes: entry.diagnostic_codes ?? [],
      cfrCitations: entry.cfr_citations ?? [],
      statutes: entry.statutes ?? [],
      unfinalizedProposals: entry.unfinalized_proposals ?? [],
    };
  });

  // 4. Parse Statutory Crosswalk (docs/title-38-statutory-crosswalk.md)
  const statutoryCrosswalk = extractStatutoryCrosswalk(
    join(upstreamDir, "docs", "title-38-statutory-crosswalk.md"),
  );

  // 5. Parse Forms & Code-Sheet Lexicon + baseline acronyms
  const lexicon = extractFormsLexicon(
    join(upstreamDir, "docs", "forms-and-codesheet-lexicon.md"),
  );

  // 6. Aggregate Enriched Judicial & VAOPGCPREC Citator Graph (ADR-0006)
  const vaopgcprecMdPath = join(upstreamDir, "docs", "vaopgcprec-index.md");
  const verificationLogMdPath = join(
    upstreamDir,
    "docs",
    "authority-verification-log.md",
  );
  const precedents = buildEnrichedPrecedentDirectory({
    entries: upstreamIndex.entries,
    routeResolver: moduleCanonicalRoute,
    vaopgcprecMarkdown: existsSync(vaopgcprecMdPath)
      ? readFileSync(vaopgcprecMdPath, "utf8")
      : "",
    verificationLogMarkdown: existsSync(verificationLogMdPath)
      ? readFileSync(verificationLogMdPath, "utf8")
      : "",
    checkedAsOf: manifestLock.checkedAsOf,
  });

  // 7. Compute 15 VASRD Systems & 13 Practice Domains Honest Coverage Matrix
  const vasrdSystems: VasrdSystemCoverage[] = CANONICAL_VASRD_SYSTEMS.map((sys) => {
    const matching = modules.filter((m) => m.vasrdSystem === sys.systemId);
    const plainEnglishCount = matching.filter((m) => m.hasVeteranOverlay).length;

    let coverageState: CoverageState;
    if (matching.length === 0) {
      coverageState = "CORPUS_GAP_OR_QUEUED_WAVE";
    } else if (plainEnglishCount === matching.length) {
      coverageState = "VERBATIM_VERIFIED";
    } else {
      coverageState = "PLAIN_ENGLISH_IN_PROGRESS";
    }

    return {
      systemId: sys.systemId,
      label: sys.label,
      diagnosticCodeRange: sys.diagnosticCodeRange,
      coverageState,
      moduleIds: matching.map((m) => m.id),
      plainEnglishCount,
      upstreamPlannedWave: sys.upstreamPlannedWave,
      officialEcfrUrl: sys.officialEcfrUrl,
    };
  });

  const practiceDomains: PracticeDomainCoverage[] = CANONICAL_PRACTICE_DOMAINS.map((dom) => {
    const matching = modules.filter((m) => m.practiceDomains.includes(dom.domainId));
    const plainEnglishCount = matching.filter((m) => m.hasVeteranOverlay).length;

    let coverageState: CoverageState;
    if (matching.length === 0) {
      coverageState = "CORPUS_GAP_OR_QUEUED_WAVE";
    } else if (plainEnglishCount === matching.length) {
      coverageState = "VERBATIM_VERIFIED";
    } else {
      coverageState = "PLAIN_ENGLISH_IN_PROGRESS";
    }

    return {
      domainId: dom.domainId,
      label: dom.label,
      coverageState,
      moduleIds: matching.map((m) => m.id),
      plainEnglishCount,
      upstreamPlannedEpic: dom.upstreamPlannedEpic,
    };
  });

  const heldAtGatePlaceholders = heldAtGateRaw.map((held) => {
    const normalizedPath = held.path.replace(/\\/g, "/");
    return {
      id: held.id,
      title: held.title,
      category: held.category,
      upstreamPath: normalizedPath,
      canonicalRoute: pathToRoute.get(normalizedPath) ?? `/docs/${posix.basename(normalizedPath, ".md")}`,
      waveId: held.waveId,
    };
  });

  const compiledDocuments = extractCompiledDocuments({
    upstreamDir,
    upstreamEntries: upstreamIndex.entries,
    heldAtGate: heldAtGatePlaceholders,
    overlays,
    linkResolutionMap,
    linkTitleMap,
    pathToWave,
    directCfrEntityStems: DIRECT_CFR_ENTITY_STEMS,
    routeResolver: moduleCanonicalRoute,
  });

  const coverageManifest: CoverageManifest = {
    corpusReleaseId: manifestLock.corpusReleaseId,
    activeBookmarkWave,
    upstreamCommitSha: manifestLock.upstreamCommitSha,
    checkedAsOf: manifestLock.checkedAsOf,
    generatedAt: manifestLock.syncedAt,
    totals: {
      upstreamModules: modules.length,
      heldAtGateModules: heldAtGatePlaceholders.length,
      cfrVersionRecords: syncedCfrVersions.length,
      cfrSectionsIndexed: uniqueCfrSections.size,
      veteranOverlaysAuthored: overlays.size,
      lexiconEntries: lexicon.length,
      statutoryCrosswalkEntries: statutoryCrosswalk.length,
      precedentsIndexed: precedents.length,
      resolvedMarkdownLinks,
    },
    vasrdSystems,
    practiceDomains,
    modules,
    heldAtGatePlaceholders,
  };

  return {
    manifestLock,
    coverageManifest,
    cfrVersions: syncedCfrVersions,
    cfrSections,
    compiledDocuments,
    statutoryCrosswalk,
    lexicon,
    precedents,
    linkResolutionMap,
  };
}

function stripMdInline(cell: string): string {
  return cell
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function extractStatutoryCrosswalk(filePath: string): StatutoryCrosswalkEntry[] {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const results: StatutoryCrosswalkEntry[] = [];

  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cols = line
      .split("|")
      .slice(1, -1)
      .map((c) => stripMdInline(c));

    if (cols.length === 5 && cols[0]?.startsWith("Vet. Reg.")) {
      results.push({
        eraAAuthority: cols[0] ?? "",
        subject: cols[2] ?? "",
        eraBSection: cols[3] ?? "",
        eraCSection: cols[4] ?? "",
        notes: cols[1] ?? "",
      });
    } else if (
      cols.length === 4 &&
      cols[0]?.startsWith("Ch.") &&
      !cols[0]?.includes("---")
    ) {
      results.push({
        eraAAuthority: "Pre-1959 Veterans' Regulations",
        subject: cols[0] ?? "",
        eraBSection: cols[1] ?? "",
        eraCSection: cols[2] ?? "",
        notes: cols[3] ?? "",
      });
    } else if (
      cols.length === 4 &&
      /^§§?\s*\d/.test(cols[0] ?? "") &&
      !cols[0]?.includes("---")
    ) {
      const ruleText = cols[3] ?? "";
      const conciseSubject =
        ruleText.split(/[;—(]/)[0]?.trim() || (cols[0] ?? "");
      results.push({
        eraCSection: cols[0] ?? "",
        eraBSection: cols[1] ?? "",
        eraAAuthority: cols[2] ?? "",
        subject: conciseSubject,
        notes: ruleText,
      });
    }
  }

  return results;
}

function extractFormsLexicon(filePath: string): LexiconEntry[] {
  const entries: LexiconEntry[] = [...BASELINE_ACRONYMS];
  if (!existsSync(filePath)) return entries;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cols = line
      .split("|")
      .slice(1, -1)
      .map((c) => stripMdInline(c));

    if (cols.length === 3 && cols[0]?.includes("Form") && !cols[0].includes("Form Number")) {
      const formKey = cols[0];
      const formTitle = cols[1] ?? "";
      const technicalPurpose = cols[2] ?? "";
      const plainSummary =
        FORM_PLAIN_ENGLISH_BY_KEY[formKey] ??
        `${formTitle} — historical VA or military record form used to verify filing dates, clinical findings, or mailing notice.`;

      entries.push({
        key: formKey,
        kind: "form",
        label: `${formKey} — ${formTitle}`,
        plainEnglish: plainSummary,
        practitionerNote: technicalPurpose,
      });
    }
  }

  return entries;
}

export function ensureParentDir(filePath: string): string {
  return dirname(filePath);
}
