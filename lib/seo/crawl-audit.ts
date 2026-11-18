import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  getCompiledCfrSections,
  getCoverageManifest,
} from "@/lib/corpus/loader";
import { buildLlmsTxt } from "./llms-txt";
import { SITE_URL } from "./metadata";

export interface StaticSeoAuditReport {
  totalCanonicalRoutes: number;
  maxCrawlDepthFromHome: number;
  unreachableRoutes: string[];
  errors: string[];
}

const BANNED_SEO_SLOGANS = [
  /\b100%\s+verified\b/i,
  /\bzero[-\s]+hallucinations?\b/i,
  /\bCUE[-\s]+safe\b/i,
  /\b(?:single|one)\s+lifetime\s+(?:Board\s+)?CUE\b/i,
  /\bguaranteed\s+back\s*pay\b/i,
  /"@type"\s*:\s*"(?:LegalService|Attorney)"/i,
];

function collectPageTsxFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectPageTsxFiles(full));
    } else if (name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

export function listAllCanonicalPaths(): string[] {
  const manifest = getCoverageManifest();
  const cfrSections = getCompiledCfrSections();

  const paths = new Set<string>([
    "/",
    "/about",
    "/accessibility",
    "/explore",
    "/explore/piercing-finality",
    "/explore/diagnostic-codes",
    "/explore/cfr-directory",
    "/vasrd",
    "/cfr",
    "/playbooks",
    "/docs",
    "/checklists",
    "/eras",
    "/cases",
    "/timeline",
    "/crosswalk",
    "/reference/forms-and-codes",
    "/investigate",
    "/privacy",
    "/terms",
  ]);

  for (const sys of manifest.vasrdSystems) {
    paths.add(`/vasrd/${sys.systemId}`);
  }

  for (const mod of manifest.modules) {
    paths.add(mod.canonicalRoute.split("#")[0]!);
  }

  for (const sec of cfrSections) {
    paths.add(`/cfr/${sec.sectionSlug}`);
    for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
      paths.add(ver.permalink);
    }
  }

  return Array.from(paths).sort();
}

/**
 * Deterministic SEO, Canonical Consolidation & `<= 2`-Click Crawl-Depth Auditor (E9-S4).
 */
export function runStaticSeoAudit(
  repoRoot: string = process.cwd(),
): StaticSeoAuditReport {
  const errors: string[] = [];
  const canonicalPaths = listAllCanonicalPaths();
  const canonicalSet = new Set(canonicalPaths);

  // 1. Verify every canonical path is clean (no query string, no hash, no trailing slash)
  for (const p of canonicalPaths) {
    if (p.includes("?") || p.includes("#")) {
      errors.push(`Canonical path "${p}" contains query or fragment parameters.`);
    }
    if (p !== "/" && p.endsWith("/")) {
      errors.push(`Canonical path "${p}" has trailing slash.`);
    }
  }

  // 2. Verify every app/**/page.tsx declares `metadata` or `generateMetadata` AND canonical consolidation
  const appDir = resolve(repoRoot, "app");
  const pageFiles = collectPageTsxFiles(appDir);
  for (const pf of pageFiles) {
    const rel = relative(repoRoot, pf).replace(/\\/g, "/");
    const src = readFileSync(pf, "utf8");
    if (!/\bexport\s+(?:const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)\b/.test(src)) {
      errors.push(`${rel}: Missing Next.js metadata / generateMetadata export.`);
    }
    if (
      !/\b(?:buildPageMetadata|buildCfrSectionMetadata|buildCfrSnapshotMetadata|buildDocumentMetadata|buildVasrdSystemMetadata|canonical\s*:)\b/.test(
        src,
      )
    ) {
      errors.push(
        `${rel}: Missing canonical URL consolidation (use build*Metadata from @/lib/seo/metadata).`,
      );
    }
    for (const banned of BANNED_SEO_SLOGANS) {
      if (banned.test(src)) {
        errors.push(`${rel}: Violates SEO/UPL guardrail (${banned}).`);
      }
    }
  }

  // 3. Verify /llms.txt completeness & guardrails
  const llms = buildLlmsTxt();
  if (!llms.includes(`${SITE_URL}/explore/diagnostic-codes`)) {
    errors.push("/llms.txt is missing link to /explore/diagnostic-codes.");
  }
  if (!llms.includes(`${SITE_URL}/explore/cfr-directory`)) {
    errors.push("/llms.txt is missing link to /explore/cfr-directory.");
  }
  for (const banned of BANNED_SEO_SLOGANS) {
    if (banned.test(llms)) {
      errors.push(`/llms.txt violates SEO/UPL guardrail (${banned}).`);
    }
  }

  // 4. Verify <= 2-click static HTML crawl graph from `/` across all canonical routes
  const manifest = getCoverageManifest();
  const cfrSections = getCompiledCfrSections();
  const adjacency = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string) => {
    const cleanTo = to.split("#")[0]!.split("?")[0]!;
    if (!canonicalSet.has(cleanTo)) return;
    let set = adjacency.get(from);
    if (!set) {
      set = new Set<string>();
      adjacency.set(from, set);
    }
    set.add(cleanTo);
  };

  // Global header + footer links rendered in static HTML on `/` (Click 1 from `/`)
  const click1FromRoot = [
    "/about",
    "/accessibility",
    "/explore",
    "/explore/diagnostic-codes",
    "/explore/cfr-directory",
    "/explore/piercing-finality",
    "/vasrd",
    "/cfr",
    "/playbooks",
    "/docs",
    "/checklists",
    "/eras",
    "/cases",
    "/timeline",
    "/crosswalk",
    "/reference/forms-and-codes",
    "/investigate",
    "/privacy",
    "/terms",
  ];
  // Verify `/` + layout footer actually expose the crawl jump-directories within 1 click!
  const layoutSrc = readFileSync(resolve(repoRoot, "app", "layout.tsx"), "utf8");
  const homeSrc = readFileSync(resolve(repoRoot, "app", "page.tsx"), "utf8");
  const headerSrc = readFileSync(
    resolve(repoRoot, "components", "chrome", "site-header.tsx"),
    "utf8",
  );
  const rootCombinedHtmlSource = `${layoutSrc}\n${homeSrc}\n${headerSrc}`;

  for (const hub of [
    "/about",
    "/accessibility",
    "/explore",
    "/vasrd",
    "/cfr",
    "/playbooks",
    "/investigate",
    "/privacy",
    "/terms",
    "/explore/diagnostic-codes",
    "/explore/cfr-directory",
  ]) {
    if (!rootCombinedHtmlSource.includes(`"${hub}"`)) {
      errors.push(
        `Root static shell (layout.tsx / page.tsx / site-header.tsx) does not directly link to "${hub}" (needed for <=2-click crawl depth).`,
      );
    }
  }

  for (const hub of click1FromRoot) {
    addEdge("/", hub);
  }
  addEdge("/", "/cfr/38-cfr-3.156c");
  addEdge("/", "/playbooks/05-void-rating-reductions-stabilized-ratings");

  // Links rendered on `/explore` (1 click from `/`) -> all 16 VASRD hubs, all 111 modules, and sub-directories (Click 2)
  addEdge("/explore", "/explore/diagnostic-codes");
  addEdge("/explore", "/explore/cfr-directory");
  addEdge("/explore", "/explore/piercing-finality");
  addEdge("/explore", "/crosswalk");
  addEdge("/explore", "/reference/forms-and-codes");
  addEdge("/explore", "/timeline");
  addEdge("/explore", "/eras");
  addEdge("/explore", "/cases");
  for (const sys of manifest.vasrdSystems) {
    addEdge("/explore", `/vasrd/${sys.systemId}`);
    addEdge("/vasrd", `/vasrd/${sys.systemId}`);
    addEdge("/explore/diagnostic-codes", `/vasrd/${sys.systemId}`);
  }
  for (const mod of manifest.modules) {
    addEdge("/explore", mod.canonicalRoute);
    if (mod.canonicalRoute.startsWith("/playbooks/")) {
      addEdge("/playbooks", mod.canonicalRoute);
    } else if (mod.canonicalRoute.startsWith("/docs/")) {
      addEdge("/playbooks", mod.canonicalRoute);
      addEdge("/docs", mod.canonicalRoute);
    } else if (mod.canonicalRoute.startsWith("/checklists/")) {
      addEdge("/playbooks", mod.canonicalRoute);
      addEdge("/checklists", mod.canonicalRoute);
    } else if (mod.canonicalRoute.startsWith("/eras/")) {
      addEdge("/eras", mod.canonicalRoute);
    } else if (mod.canonicalRoute.startsWith("/cfr/modules/")) {
      addEdge("/cfr", mod.canonicalRoute);
      addEdge("/explore/cfr-directory", mod.canonicalRoute);
    }
    if (mod.diagnosticCodes.length > 0) {
      addEdge("/explore/diagnostic-codes", mod.canonicalRoute);
    }
  }

  // Links rendered on `/explore/cfr-directory` & `/cfr` -> all 75 CFR sections & all 174+ snapshot permalinks (Click 2)
  const cfrDirPath = resolve(
    repoRoot,
    "app",
    "explore",
    "cfr-directory",
    "page.tsx",
  );
  const dcDirPath = resolve(
    repoRoot,
    "app",
    "explore",
    "diagnostic-codes",
    "page.tsx",
  );
  if (!existsSync(cfrDirPath)) {
    errors.push("Missing app/explore/cfr-directory/page.tsx jump directory.");
  }
  if (!existsSync(dcDirPath)) {
    errors.push("Missing app/explore/diagnostic-codes/page.tsx jump directory.");
  }

  for (const sec of cfrSections) {
    addEdge("/cfr", `/cfr/${sec.sectionSlug}`);
    addEdge("/explore/cfr-directory", `/cfr/${sec.sectionSlug}`);
    if (sec.diagnosticCodes.length > 0) {
      addEdge("/explore/diagnostic-codes", `/cfr/${sec.sectionSlug}`);
    }
    for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
      addEdge("/explore/cfr-directory", ver.permalink);
      addEdge(`/cfr/${sec.sectionSlug}`, ver.permalink);
    }
  }

  // BFS from `/`
  const depth = new Map<string, number>([["/", 0]]);
  const queue: string[] = ["/"];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDepth = depth.get(curr)!;
    for (const next of adjacency.get(curr) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, currDepth + 1);
        queue.push(next);
      }
    }
  }

  let maxCrawlDepthFromHome = 0;
  const unreachableRoutes: string[] = [];

  for (const p of canonicalPaths) {
    const d = depth.get(p);
    if (d === undefined) {
      unreachableRoutes.push(p);
      errors.push(`Canonical route "${p}" is unreachable from "/" in static crawl graph.`);
    } else {
      if (d > maxCrawlDepthFromHome) maxCrawlDepthFromHome = d;
      if (d > 2) {
        errors.push(
          `Canonical route "${p}" requires ${d} clicks from "/" (exceeds <= 2-click SEO crawl budget).`,
        );
      }
    }
  }

  return {
    totalCanonicalRoutes: canonicalPaths.length,
    maxCrawlDepthFromHome,
    unreachableRoutes,
    errors,
  };
}
