import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { loadVeteranOverlays } from "../lib/corpus/compiler";
import type {
  CompiledCfrSection,
  CompiledDocument,
  CoverageManifest,
  LexiconEntry,
  PrecedentEntry,
} from "../lib/corpus/types";

const REPO_ROOT = resolve(__dirname, "..");

const BANNED_UPL_DIRECTIVES: ReadonlyArray<RegExp> = [
  /\byou\s+have\s+a\s+winning\s+(?:CUE|claim)\b/i,
  /\byou\s+are\s+guaranteed\s+back\s*pay\b/i,
  /\bfile\s+a\s+Board\s+CUE\s+motion\s+immediately\b/i,
];

const BANNED_RAW_SCHEMA_ENUMS: ReadonlyArray<string> = [
  "open-claim-only-george-restricted",
  "open-claim-only",
  "summary-only-pull-print-cfr-before-cue",
  "cue-and-open-claim",
  "prospective-liberalizing-3.114",
  "mixed-see-text",
  "repealed-historical",
  "proposed-nonbinding",
  "interim-final-rescinded",
  "final-effective",
  "verbatim-govinfo-ecfr",
  "verbatim-federal-register",
  "cue-ro-3.105a",
  "cue-bva-7111",
  "service-records-3.156c",
  "pending-unadjudicated-claim",
  "defective-notice-presumption-rebuttal",
  "void-rating-reduction",
  "nehmer-3.816",
  "ama-explicit-notice-5104b",
  "ama-continuous-pursuit-3.2500",
  "crsc-soto-settlement",
  "direct-or-secondary-sc",
  "presumptive-sc-3.307-3.320",
  "cod-insanity-upgrade-gateway",
  "section-1151-malpractice",
  "liberalizing-law-3.114",
  "increased-rating-lookback-5110b2",
  "survivor-dic-1310-1318",
  "accrued-substitution-5121",
  "smc-statutory-entitlement",
  "offset-recoupment-audit",
  "cavc-eaja-litigation",
  "baseline-verified",
  "needs-historical-fr-check",
  "authority-snapshot",
  "cfr-diff",
  "era-lens",
  "T_now",
  "ingestion-ledger.json",
  "case-screen.schema.json",
  "rule-card.schema.json",
  "cfr-version.schema.json",
  "frontmatter-template.yaml",
  "(ACTION-REQUIRED)",
];

const BANNED_HEAVY_PACKAGES = [
  "@xyflow/react",
  "reactflow",
  "three",
  "@react-three/fiber",
];

const BANNED_PUBLIC_BUILD_JARGON: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "Active Bookmark / Bookmark W#", pattern: /\bActive\s+Bookmark\b|\bBookmark\s*:?\s*(?:W\d|\{)/i },
  { label: "Held as Placeholders / Held at Ingestion Gate", pattern: /\bHeld\s+(?:as\s+Placeholders|at\s+Ingestion\s+Gate)\b/i },
  { label: "Queued for Later Wave", pattern: /\bQueued\s+for\s+Later\s+Wave\b/i },
  { label: "Tracer Bullet", pattern: /\bTracer\s+Bullet\b/i },
  { label: "3-Column build label", pattern: /\b3-Column\b/i },
  { label: "Morph Tree jargon", pattern: /\bMorph\s+Tree\b/i },
  { label: "Public Wave / Ingestion Wave roadmap jargon", pattern: /\b(?:Wave\s+(?:[1-9]|W\d|\$\{)|Waves\s+W\d|Ingestion\s+Wave|editorial\s+wave)\b/i },
  { label: "Raw (/route) inside visible link/heading label", pattern: /\(\/[a-z0-9/_-]+\)\s*(?:→|&rarr;|<)/i },
  { label: "Sub-13px arbitrary micro-typography (text-[9..12px])", pattern: /\btext-\[(?:[1-9]|1[0-2])px\]/ },
];

function walkUiFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkUiFiles(full));
    } else if (/\.(ts|tsx|mdx?)$/i.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  const errors: string[] = [];

  // 1. Check package.json against banned heavy canvas/3D packages (Rule 04)
  const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const banned of BANNED_HEAVY_PACKAGES) {
    if (banned in allDeps) {
      errors.push(
        `package.json includes banned heavy package "${banned}" (use SVG + d3-hierarchy per vision.md & Rule 04).`,
      );
    }
  }

  // 2. Validate Veteran plain-English overlays for UPL safety, completeness & zero raw enums
  const overlays = loadVeteranOverlays(resolve(REPO_ROOT, "content", "overlays", "veteran"));
  for (const [id, ov] of overlays.entries()) {
    if (!ov.plain_english_title || ov.plain_english_title.length < 8) {
      errors.push(`Overlay "${id}" is missing a descriptive plain_english_title.`);
    }
    if (!ov.what_this_means || ov.what_this_means.length < 30) {
      errors.push(`Overlay "${id}" is missing a substantive what_this_means explanation.`);
    }
    if (!ov.questions_for_representative || ov.questions_for_representative.length === 0) {
      errors.push(
        `Overlay "${id}" must include at least one "questions_for_representative" checklist item (Rule 03).`,
      );
    }

    const combinedText = [
      ov.plain_english_title,
      ov.what_this_means,
      ...ov.record_clues,
      ...ov.important_cautions,
      ...ov.questions_for_representative,
    ].join("\n");

    for (const re of BANNED_UPL_DIRECTIVES) {
      if (re.test(combinedText)) {
        errors.push(`Overlay "${id}" contains directive UPL phrasing matching ${re}.`);
      }
    }
    for (const rawEnum of BANNED_RAW_SCHEMA_ENUMS) {
      if (combinedText.includes(rawEnum)) {
        errors.push(`Overlay "${id}" leaks raw internal schema enum "${rawEnum}".`);
      }
    }
  }

  // 3. Scan rendered UI components/pages and lib/screener/ packet/copy modules for UPL directives & leaked raw schema enums
  for (const dirName of ["app", "components", "lib/screener"]) {
    for (const file of walkUiFiles(resolve(REPO_ROOT, dirName))) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
      const content = readFileSync(file, "utf8");
      for (const re of BANNED_UPL_DIRECTIVES) {
        if (re.test(content)) {
          errors.push(`${rel}: Contains directive UPL phrasing matching ${re}.`);
        }
      }
      if ((dirName === "app" || dirName === "components") && /\bE\d+-S\d+\b/.test(content)) {
        errors.push(`${rel}: Leaks internal backlog story identifier (E#-S#) in UI source.`);
      }
      if (dirName === "app" || dirName === "components") {
        // Strip single-line and block comments plus import lines before checking visible UI copy
        const withoutCommentsOrImports = content
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "")
          .replace(/^\s*import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "");
        for (const rule of BANNED_PUBLIC_BUILD_JARGON) {
          if (rule.pattern.test(withoutCommentsOrImports)) {
            errors.push(`${rel}: Leaks public build jargon or micro-type (${rule.label}).`);
          }
        }
        if (/\bd3-hierarchy\b/i.test(withoutCommentsOrImports)) {
          errors.push(`${rel}: Leaks "d3-hierarchy" library name in UI source outside imports.`);
        }
      }
      for (const rawEnum of BANNED_RAW_SCHEMA_ENUMS) {
        // Allow TypeScript type/comparison checks in server/client TSX when quoted as code property comparisons ONLY if not rendered;
        // check JSX/string copy excluding `doc.category === "..."` style AST discriminators.
        const strippedDiscriminators = content
          .replace(
            /\b(?:category|regulatory_status|bitemporal_scope|verbatim_text_status)\s*[!=]==?\s*["'][a-z0-9.-]+["']/g,
            "",
          )
          .replace(/["']\/(?:playbooks|docs|checklists|cfr|eras|vasrd)\/[^"']*["']/g, "");
        if (strippedDiscriminators.includes(rawEnum)) {
          errors.push(`${rel}: Leaks raw internal schema token or repo path "${rawEnum}".`);
        }
      }
    }
  }

  // 4. Scan compiled-documents.json AST blocks, triggers & killSwitches AND cfr-sections.json for leaked raw schema enums or repo paths
  const compiledDocsPath = resolve(REPO_ROOT, "corpus", "generated", "compiled-documents.json");
  if (existsSync(compiledDocsPath)) {
    const docs = JSON.parse(
      readFileSync(compiledDocsPath, "utf8"),
    ) as CompiledDocument[];
    for (const doc of docs) {
      const renderedDocPayload = JSON.stringify({
        blocks: doc.blocks,
        cFileTriggers: doc.cFileTriggers,
        killSwitches: doc.killSwitches,
      });
      for (const rawEnum of BANNED_RAW_SCHEMA_ENUMS) {
        if (renderedDocPayload.includes(rawEnum)) {
          errors.push(
            `compiled-documents.json (${doc.id}): Leaks raw internal schema token "${rawEnum}" in rendered payload.`,
          );
        }
      }
      if (/\[[^\]]*\.md\]\(/i.test(renderedDocPayload)) {
        errors.push(
          `compiled-documents.json (${doc.id}): Exposes raw ".md" filename in visible link label.`,
        );
      }
      if (/(?<![/a-z0-9_-])(?:authorities|cfr-diffs|schemas)\//i.test(renderedDocPayload)) {
        errors.push(
          `compiled-documents.json (${doc.id}): Exposes raw upstream repository directory/path in rendered prose/triggers.`,
        );
      }
    }
  }

  const precedentsPath = resolve(REPO_ROOT, "corpus", "generated", "precedents.json");
  if (existsSync(precedentsPath)) {
    const precs = JSON.parse(readFileSync(precedentsPath, "utf8")) as PrecedentEntry[];
    const seenSlugs = new Set<string>();
    for (const prec of precs) {
      if (seenSlugs.has(prec.slug)) {
        errors.push(`precedents.json: Duplicate slug collision "${prec.slug}" on "${prec.citation}".`);
      }
      seenSlugs.add(prec.slug);

      const renderedPrecText = [
        prec.coreHolding ?? "",
        prec.litigationUtility ?? "",
        prec.validityLabel ?? "",
        prec.veteranPlainSummary ?? "",
      ].join("\n");

      for (const rawEnum of BANNED_RAW_SCHEMA_ENUMS) {
        if (renderedPrecText.includes(rawEnum)) {
          errors.push(`precedents.json (${prec.slug}): Leaks raw internal schema token "${rawEnum}".`);
        }
      }
      if (/\b[a-z0-9._-]+\.md\b/i.test(renderedPrecText)) {
        errors.push(`precedents.json (${prec.slug}): Leaks raw ".md" filename in rendered prose.`);
      }
      if (/\*/.test(renderedPrecText)) {
        errors.push(`precedents.json (${prec.slug}): Leaks unstripped Markdown "*" emphasis marker in rendered prose.`);
      }
    }
  }

  const cfrSectionsPath = resolve(REPO_ROOT, "corpus", "generated", "cfr-sections.json");
  const validInternalRoutes = new Set<string>([
    "/",
    "/cases",
    "/cfr",
    "/checklists",
    "/crosswalk",
    "/docs",
    "/eras",
    "/explore",
    "/explore/piercing-finality",
    "/investigate",
    "/playbooks",
    "/reference/forms-and-codes",
    "/timeline",
    "/vasrd",
  ]);

  const manifestPath = resolve(REPO_ROOT, "corpus", "generated", "coverage-manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as CoverageManifest;
    for (const mod of manifest.modules) {
      validInternalRoutes.add(mod.canonicalRoute.split("#")[0]!);
    }
    for (const sys of manifest.vasrdSystems) {
      validInternalRoutes.add(`/vasrd/${sys.systemId}`);
    }
  }

  if (existsSync(cfrSectionsPath)) {
    const cfrSecs = JSON.parse(
      readFileSync(cfrSectionsPath, "utf8"),
    ) as CompiledCfrSection[];
    for (const sec of cfrSecs) {
      validInternalRoutes.add(`/cfr/${sec.sectionSlug}`);
      for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
        validInternalRoutes.add(ver.permalink);
      }
      const renderedSecPayload = JSON.stringify({
        summary: sec.summary,
        trapTables: sec.trapTables,
        cFileTriggers: sec.cFileTriggers,
        killSwitches: sec.killSwitches,
        verbatimBlocks: sec.versions.map((v) => v.verbatimMarkdown),
        eraNotes: sec.versions.map((v) => v.eraNote),
        transitionNotes: sec.versions.map((v) => v.applicability_and_transition_notes),
      });
      for (const rawEnum of BANNED_RAW_SCHEMA_ENUMS) {
        if (renderedSecPayload.includes(rawEnum)) {
          errors.push(
            `cfr-sections.json (${sec.sectionSlug}): Leaks raw internal schema token "${rawEnum}" in rendered CFR workspace.`,
          );
        }
      }
      if (/(?<![/a-z0-9_-])(?:authorities|cfr-diffs|schemas)\//i.test(renderedSecPayload)) {
        errors.push(
          `cfr-sections.json (${sec.sectionSlug}): Exposes raw upstream repository directory/path in rendered CFR notes/tables.`,
        );
      }

      const proseNotes = [
        sec.summary,
        ...sec.cFileTriggers,
        ...sec.killSwitches,
        ...sec.versions.map((v) => v.eraNote ?? ""),
        ...sec.versions.map((v) => v.applicability_and_transition_notes ?? ""),
      ].join("\n");
      if (/\b[a-z0-9._-]+\.md\b/i.test(proseNotes) || /\[[^\]]+\]\([^)]+\)/.test(proseNotes)) {
        errors.push(
          `cfr-sections.json (${sec.sectionSlug}): Leaks raw ".md" filename or unrendered Markdown link in summary/notes.`,
        );
      }

      for (const tbl of sec.trapTables) {
        const tableStrings = [tbl.title, ...tbl.headers, ...tbl.rows.flat()].join("\n");
        if (/\*|`/.test(tableStrings)) {
          errors.push(
            `cfr-sections.json (${sec.sectionSlug}, ${tbl.id}): Leaks unstripped "*" or "\`" Markdown marker in trapTables.`,
          );
        }
        if (/\b[a-z0-9._-]+\.md\b/i.test(tableStrings) || /\[[^\]]+\]\([^)]+\)/.test(tableStrings)) {
          errors.push(
            `cfr-sections.json (${sec.sectionSlug}, ${tbl.id}): Leaks raw ".md" filename or unrendered link in trapTables.`,
          );
        }
      }
    }
  }

  // 4b. Verify every hardcoded internal route literal (`href="/..."` or `href: "/..."`) in app/, components/, content/, and lib/ resolves to an existing SSG route
  for (const dirName of ["app", "components", "content", "lib"]) {
    for (const file of walkUiFiles(resolve(REPO_ROOT, dirName))) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
      if (rel === "content/taxonomy-skeleton.ts") continue;
      const content = readFileSync(file, "utf8");
      for (const m of content.matchAll(/\b(?:href|relatedHref)\s*(?:=|:)\s*["'](\/[^"'#${}?\s]*)["']/g)) {
        const routePath = m[1]!;
        if (!routePath || routePath === "/") continue;
        if (!validInternalRoutes.has(routePath)) {
          errors.push(
            `${rel}: Hardcoded internal link "${routePath}" does not match any live static route (404 hazard).`,
          );
        }
      }
    }
  }

  // 5. Scan lexicon.json for mid-abbreviation truncation or double punctuation in Veteran plainEnglish
  const lexiconPath = resolve(REPO_ROOT, "corpus", "generated", "lexicon.json");
  if (existsSync(lexiconPath)) {
    const lexicon = JSON.parse(readFileSync(lexiconPath, "utf8")) as LexiconEntry[];
    for (const entry of lexicon) {
      if (/(?:\bv\.|\bAug\.|\bMar\.|\bFeb\.|!\.|\?\.)$/.test(entry.plainEnglish.trim())) {
        errors.push(
          `lexicon.json (${entry.key}): Truncated or malformed plainEnglish summary ("${entry.plainEnglish}").`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[qa:upl] FAIL (${errors.length} issue(s)):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  console.log(
    `[qa:upl] PASS: Plain-English overlays (${overlays.size}), UPL framing, and lightweight bundle rules verified.`,
  );
}

main();
