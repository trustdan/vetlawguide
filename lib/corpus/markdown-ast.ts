import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import matter from "gray-matter";
import { stripMarkdownSyntax } from "./diff";
import type {
  CompiledDocument,
  CoverageState,
  DocumentCategory,
  MarkdownBlock,
  UpstreamIndexEntry,
  VeteranOverlay,
} from "./types";

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/authority-snapshots?/g, "cfr-snapshots")
    .replace(/cfr-diffs?/g, "cfr-comparisons")
    .replace(/era-lens(?:es)?/g, "historical-era")
    .replace(/open-claim-only-george-restricted/g, "george-collateral-scope")
    .replace(/open-claim-only/g, "open-claim-scope")
    .replace(/cue-and-open-claim/g, "retroactive-cue-scope")
    .replace(/prospective-liberalizing-3-114/g, "liberalizing-3-114-scope")
    .replace(/repealed-historical/g, "historical-snapshot")
    .replace(/proposed-nonbinding/g, "quarantined-proposal")
    .replace(/interim-final-rescinded/g, "rescinded-interim-rule")
    .replace(/final-effective/g, "enacted-regulation")
    .replace(/mixed-see-text/g, "mixed-temporal-scope")
    .replace(/pending-unadjudicated-claim/g, "pending-claim-pathway")
    .replace(/nehmer-3-816/g, "nehmer-herbicide-pathway")
    .replace(/\b(\d{3})-(\d{2})-(\d{4})\b/g, "$1-$2-y$3")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const HUMANIZED_SCHEMA_TOKENS: ReadonlyArray<[RegExp, string]> = [
  [/`?open-claim-only-george-restricted`?/gi, "Open-Claim Only (George-Restricted for CUE)"],
  [/`?open-claim-only`?/gi, "Open-Claim Only (George-Restricted for CUE)"],
  [
    /`?summary-only-pull-print-cfr-before-cue`?/gi,
    "Summary Only (Pull Print CFR Before Pleading CUE)",
  ],
  [/`?cue-and-open-claim`?/gi, "CUE & Open-Claim Retroactive"],
  [/`?prospective-liberalizing-3\.114`?/gi, "Prospective / Liberalizing Rule (§ 3.114)"],
  [/`?mixed-see-text`?/gi, "Mixed Retroactive & Prospective Scope"],
  [/`?repealed-historical`?/gi, "Repealed Historical Snapshot"],
  [/`?proposed-nonbinding`?/gi, "Proposed / Unfinalized Rule (Nonbinding)"],
  [/`?interim-final-rescinded`?/gi, "Rescinded Interim Final Rule (Nonbinding)"],
  [/`?final-effective`?/gi, "Enacted Final Regulation"],
  [/`?verbatim-govinfo-ecfr`?/gi, "Verbatim Official eCFR / GovInfo Text"],
  [/`?verbatim-federal-register`?/gi, "Verbatim Federal Register Text"],
  // 21 retro_pathways schema tokens (rule-card.schema.json)
  [/`?cue-ro-3\.105a`?/gi, "RO CUE (§ 3.105(a))"],
  [/`?cue-bva-7111`?/gi, "Board CUE (38 U.S.C. § 7111)"],
  [/`?service-records-3\.156c`?/gi, "Service Department Records (§ 3.156(c))"],
  [/`?pending-unadjudicated-claim`?/gi, "Pending Unadjudicated Claim"],
  [
    /`?defective-notice-presumption-rebuttal`?/gi,
    "Defective Mailing / Presumption of Regularity Rebuttal",
  ],
  [/`?void-rating-reduction`?/gi, "Void Rating Reduction (§ 3.105(e))"],
  [/`?nehmer-3\.816`?/gi, "Nehmer Retroactive Herbicide (§ 3.816)"],
  [/`?ama-explicit-notice-5104b`?/gi, "AMA Explicit § 5104(b) Notice"],
  [/`?ama-continuous-pursuit-3\.2500`?/gi, "AMA Continuous Pursuit (§ 3.2500)"],
  [/`?crsc-soto-settlement`?/gi, "CRSC Retroactive Compensation (Soto)"],
  [/`?direct-or-secondary-sc`?/gi, "Direct or Secondary Service Connection"],
  [/`?presumptive-sc-3\.307-3\.320`?/gi, "Presumptive Service Connection (§§ 3.307–3.320)"],
  [/`?cod-insanity-upgrade-gateway`?/gi, "Character of Discharge / Insanity Gateway"],
  [/`?section-1151-malpractice`?/gi, "38 U.S.C. § 1151 VA Medical Injury"],
  [/`?liberalizing-law-3\.114`?/gi, "Liberalizing Law (§ 3.114)"],
  [/`?increased-rating-lookback-5110b2`?/gi, "1-Year Increased Rating Lookback (§ 5110(b)(2))"],
  [/`?survivor-dic-1310-1318`?/gi, "Survivor DIC (§§ 1310 / 1318)"],
  [/`?accrued-substitution-5121`?/gi, "Accrued Benefits & Substitution (§§ 5121 / 5121A)"],
  [/`?smc-statutory-entitlement`?/gi, "Statutory Special Monthly Compensation (§ 1114)"],
  [/`?offset-recoupment-audit`?/gi, "Offset & Severance Recoupment Audit"],
  [/`?cavc-eaja-litigation`?/gi, "CAVC Judicial Appeal & EAJA Fees"],
  // verification_status schema tokens
  [/`primary-source-verified`/gi, "Primary-Source Verified"],
  [/`?baseline-verified`?/gi, "Baseline Primary-Source Verified"],
  [/`?needs-historical-fr-check`?/gi, "Historical Federal Register Verification Pending"],
  [/`?authority-snapshots`?/gi, "Verbatim CFR Snapshots"],
  [/`?authority-snapshot`?/gi, "Verbatim CFR Snapshot"],
  [/`?cfr-diffs`?/gi, "Historical CFR Redlines"],
  [/`?cfr-diff`?/gi, "Historical CFR Redline"],
  [/`?era-lenses`?/gi, "Historical Era Lenses"],
  [/`?era-lens`?/gi, "Historical Era Lens"],
  [/\bT_now\b/g, "Today"],
  [/`?(?:schemas\/)?case-screen\.schema\.json`?/gi, "Case Screening Schema"],
  [/`?(?:schemas\/)?rule-card\.schema\.json`?/gi, "Rule Card Schema"],
  [/`?(?:schemas\/)?cfr-version\.schema\.json`?/gi, "CFR Version Schema"],
  [/`?(?:schemas\/)?frontmatter-template\.yaml`?/gi, "Frontmatter Template"],
  [/`?(?:knowledge\/)?ingestion-ledger\.json`?/gi, "Wave Ingestion Bookmark"],
  [/`?(?:knowledge\/)?cfr-amendments\.json`?/gi, "Point-in-Time CFR Version Ledger"],
  [/`?(?:knowledge\/)?index\.json`?/gi, "Corpus Module Index"],
  [/`?(?:scripts\/)?validate_kb\.py`?/gi, "Corpus Integrity Validator"],
  [/\(ACTION-REQUIRED\)/gi, "(Action Required)"],
];

export function humanizeMarkdownSlug(rawName: string): string {
  return rawName
    .replace(/`/g, "")
    .replace(
      /^(?:schemas|authorities|cfr-diffs|playbooks|checklists|docs|eras|knowledge|scripts|epics)\/(?:part-\d+(?:-policy)?\/|vasrd\/)?/i,
      "",
    )
    .replace(/\.(?:schema\.json|md|json|ya?ml|py)$/i, "")
    .replace(/\/$/, "")
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((w) =>
      /^(?:cfr|usc|vasrd|cue|bva|cavc|dc|tdiu|smc|dic|ptsd|tbi|mst|ama|vcaa|vjra|pcafc|vre|gerd|ibs|als|hiv|cfs)$/i.test(
        w,
      )
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

export function sanitizeSchemaTokens(text: string): string {
  let out = text
    // Strip trailing upstream authoring provenance pointers ("Verbatim ... preserved in authorities/.../*.md.")
    .replace(
      /\s*(?:Pre-\s+and\s+post-[^;()]*?\s+)?(?:Verbatim|Complete\s+verbatim)[^;]*?\bpreserved in\s+`?(?:authorities|cfr-diffs)\/[a-z0-9./_-]+\.md`?\.?/gi,
      "",
    );

  // Humanize Markdown links pointing to repository files (e.g., `[Playbook 05](../../playbooks/05-void-rating-reductions-stabilized-ratings.md)`)
  // BEFORE `HUMANIZED_SCHEMA_TOKENS` runs so hyphenated tokens inside `.md` URLs are never expanded!
  out = out.replace(
    /\[([^\]]+)\]\((?!https?:\/\/|mailto:|#|\/)((?:[^()]|\([^()]*\))*\.(?:schema\.json|md|json|ya?ml|py)(?:#[^)]*)?)\)/gi,
    (_m, label: string, target: string) => {
      const cleanLabel = label.replace(/`/g, "").trim();
      const targetFile = target.split("#")[0] ?? target;
      return /\.(?:schema\.json|md|json|ya?ml|py)$/i.test(cleanLabel)
        ? humanizeMarkdownSlug(posix.basename(targetFile))
        : cleanLabel;
    },
  );

  for (const [pattern, replacement] of HUMANIZED_SCHEMA_TOKENS) {
    out = out.replace(pattern, replacement);
  }

  out = out.replace(
    /`(authorities|cfr-diffs|playbooks|checklists|docs|eras|schemas|knowledge|scripts)\/([a-z0-9./_-]*)`/gi,
    (_m, rootDir: string, sub: string) => {
      const folder = rootDir.toLowerCase();
      if (sub && /\.(?:schema\.json|md|json|ya?ml|py)$/i.test(sub)) {
        return humanizeMarkdownSlug(posix.basename(sub));
      }
      const baseLabel =
        folder === "authorities"
          ? "Verbatim CFR Snapshots"
          : folder === "cfr-diffs"
            ? "Historical CFR Redlines"
            : folder === "eras"
              ? "Historical Era Lenses"
              : humanizeMarkdownSlug(folder);
      return sub ? `${baseLabel} (${humanizeMarkdownSlug(sub)})` : baseLabel;
    },
  );
  out = out.replace(
    /(?<![/a-z0-9_-])(authorities|cfr-diffs|schemas|knowledge|scripts)\/([a-z0-9./_-]*)/gi,
    (_m, rootDir: string, sub: string) => {
      const folder = rootDir.toLowerCase();
      if (sub && /\.(?:schema\.json|md|json|ya?ml|py)$/i.test(sub)) {
        return humanizeMarkdownSlug(posix.basename(sub));
      }
      const baseLabel =
        folder === "authorities"
          ? "Verbatim CFR Snapshots"
          : folder === "cfr-diffs"
            ? "Historical CFR Redlines"
            : humanizeMarkdownSlug(folder);
      return sub ? `${baseLabel} (${humanizeMarkdownSlug(sub)})` : baseLabel;
    },
  );

  // Humanize backticked or parenthesized/standalone repository file paths (.md, .schema.json, .json, .yaml, .py)
  // Negative lookbehind `(?<!\]\()` ensures already-rewritten `[Label](/route)` links are untouched.
  out = out.replace(
    /`([a-z0-9./_-]+\.(?:schema\.json|md|json|ya?ml|py))`/gi,
    (_m, fname: string) => humanizeMarkdownSlug(posix.basename(fname)),
  );
  out = out.replace(
    /(?<!\])\(([a-z0-9./_-]+\.(?:schema\.json|md|json|ya?ml|py))\)/gi,
    (_m, fname: string) => `(${humanizeMarkdownSlug(posix.basename(fname))})`,
  );
  out = out.replace(
    /\b((?:authorities|cfr-diffs|playbooks|checklists|docs|eras|schemas|knowledge|scripts)\/[a-z0-9./_-]+\.(?:schema\.json|md|json|ya?ml|py))\b/gi,
    (_m, fpath: string) => humanizeMarkdownSlug(posix.basename(fpath)),
  );

  return out.trim();
}

/**
 * Normalizes inline LaTeX superscripts (`$^{1}$` -> `¹`), strips inline Markdown
 * emphasis/code/link syntax, and humanizes internal schema tokens/paths.
 */
export function stripInlineMarkdownFormatting(input: string): string {
  return sanitizeSchemaTokens(stripMarkdownSyntax(sanitizeSchemaTokens(input)));
}

function rewriteRelativeLinksInText(
  text: string,
  sourceRelPath: string,
  linkResolutionMap: Record<string, string>,
  linkTitleMap: Record<string, string> = {},
): string {
  const mdLinkRe = /\[([^\]]+)\]\((?!https?:\/\/|mailto:|#|\/)([^)]+)\)/g;

  const rewritten = text.replace(mdLinkRe, (_full, label: string, rawTarget: string) => {
    const key = `${sourceRelPath}::${rawTarget}`;
    const resolvedRoute = linkResolutionMap[key];
    const strippedLabel = label.replace(/`/g, "").trim();
    const isRawFileOrDirLabel =
      /\.(?:md|json|ya?ml|py)$/i.test(strippedLabel) ||
      /^(?:authorities|cfr-diffs|playbooks|checklists|docs|eras|epics|schemas|scripts|knowledge)\/?$/i.test(
        strippedLabel,
      );

    if (!resolvedRoute) {
      return isRawFileOrDirLabel ? humanizeMarkdownSlug(strippedLabel) : strippedLabel;
    }

    const displayLabel = isRawFileOrDirLabel
      ? (linkTitleMap[key] ?? humanizeMarkdownSlug(strippedLabel))
      : label;

    return `[${displayLabel}](${resolvedRoute})`;
  });

  return sanitizeSchemaTokens(rewritten);
}

function cleanTableCell(
  cell: string,
  sourceRelPath: string,
  linkResolutionMap: Record<string, string>,
  linkTitleMap: Record<string, string> = {},
): string {
  return rewriteRelativeLinksInText(cell, sourceRelPath, linkResolutionMap, linkTitleMap)
    .replace(/<br\s*\/?>/gi, " · ")
    .trim();
}

export function parseMarkdownBodyToAst(
  rawMarkdown: string,
  sourceRelPath: string,
  linkResolutionMap: Record<string, string>,
  linkTitleMap: Record<string, string> = {},
): {
  toc: Array<{ id: string; level: 2 | 3; text: string }>;
  blocks: MarkdownBlock[];
} {
  const { content } = matter(rawMarkdown);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const toc: Array<{ id: string; level: 2 | 3; text: string }> = [];
  const blocks: MarkdownBlock[] = [];
  const usedIds = new Set<string>();

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();

    // Skip empty lines, horizontal rules, and H1 (rendered by page header)
    if (!trimmed || /^---+$/.test(trimmed) || /^#\s+/.test(trimmed)) {
      i += 1;
      continue;
    }

    // Fenced code / diagram blocks (```mermaid, ```text, etc.)
    const fenceMatch = /^(`{3,}|~{3,})([a-zA-Z0-9_-]*)\s*$/.exec(trimmed);
    if (fenceMatch) {
      const fenceChars = fenceMatch[1]!.slice(0, 3);
      const lang = (fenceMatch[2] ?? "").toLowerCase();
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith(fenceChars)) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) {
        i += 1; // consume closing fence
      }
      // Omit raw mermaid graph DSL from prose (visualized natively via SVG components)
      if (lang !== "mermaid" && codeLines.length > 0) {
        blocks.push({
          kind: "code",
          language: lang || "text",
          code: sanitizeSchemaTokens(codeLines.join("\n").trim()),
        });
      }
      continue;
    }

    // H2 / H3 / H4 Headings
    const hMatch = /^(#{2,4})\s+(.+)$/.exec(trimmed);
    if (hMatch) {
      const level = hMatch[1]!.length === 2 ? 2 : 3;
      const cleanHeadingText = rewriteRelativeLinksInText(
        hMatch[2]!,
        sourceRelPath,
        linkResolutionMap,
        linkTitleMap,
      )
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .trim();

      let id = slugifyHeading(cleanHeadingText) || `section-${toc.length + 1}`;
      if (usedIds.has(id)) {
        id = `${id}-${toc.length + 1}`;
      }
      usedIds.add(id);

      toc.push({ id, level, text: cleanHeadingText });
      blocks.push({ kind: "heading", level, id, text: cleanHeadingText });
      i += 1;
      continue;
    }

    // GitHub-style Alerts (> [!IMPORTANT], > [!CAUTION], etc.) or Verbatim Blockquotes
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith(">")) {
        quoteLines.push((lines[i] ?? "").trim().replace(/^>\s?/, ""));
        i += 1;
      }
      const firstLine = quoteLines[0] ?? "";
      const alertMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i.exec(
        firstLine,
      );
      if (alertMatch) {
        const alertType = alertMatch[1]!.toUpperCase() as
          | "NOTE"
          | "TIP"
          | "IMPORTANT"
          | "WARNING"
          | "CAUTION";
        const restFirst = (alertMatch[2] ?? "").trim();
        const bodyLines = [
          ...(restFirst ? [restFirst] : []),
          ...quoteLines.slice(1),
        ]
          .map((l) =>
            rewriteRelativeLinksInText(l, sourceRelPath, linkResolutionMap, linkTitleMap),
          )
          .filter(Boolean);
        blocks.push({ kind: "alert", alertType, lines: bodyLines });
      } else {
        const cleanedLines = quoteLines
          .map((l) =>
            rewriteRelativeLinksInText(l, sourceRelPath, linkResolutionMap, linkTitleMap),
          )
          .filter(Boolean);
        if (cleanedLines.length > 0) {
          blocks.push({
            kind: "blockquote",
            lines: cleanedLines,
          });
        }
      }
      continue;
    }

    // Markdown Tables
    if (trimmed.startsWith("|") && (lines[i + 1] ?? "").includes("---")) {
      const headers = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => cleanTableCell(c, sourceRelPath, linkResolutionMap, linkTitleMap));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        const cells = (lines[i] ?? "")
          .trim()
          .split("|")
          .slice(1, -1)
          .map((c) => cleanTableCell(c, sourceRelPath, linkResolutionMap, linkTitleMap));
        if (cells.length === headers.length) {
          rows.push(cells);
        }
        i += 1;
      }
      if (headers.length >= 2 && rows.length > 0) {
        blocks.push({ kind: "table", headers, rows });
      }
      continue;
    }

    // Task Checklists (- [ ] ...)
    if (/^-\s+\[[ xX]\]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const cur = (lines[i] ?? "").trim();
        if (/^-\s+\[[ xX]\]\s+/.test(cur)) {
          items.push(
            rewriteRelativeLinksInText(
              cur.replace(/^-\s+\[[ xX]\]\s+/, ""),
              sourceRelPath,
              linkResolutionMap,
              linkTitleMap,
            ),
          );
          i += 1;
        } else if (cur.startsWith("- ") && (lines[i] ?? "").startsWith("  ")) {
          // Sub-bullet continuation inside checklist item
          const prev = items[items.length - 1] ?? "";
          items[items.length - 1] = `${prev} — ${rewriteRelativeLinksInText(
            cur.slice(2),
            sourceRelPath,
            linkResolutionMap,
            linkTitleMap,
          )}`;
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({ kind: "checklist", items });
      continue;
    }

    // Unordered or Ordered Lists
    const isUnordered = /^[*+-]\s+/.test(trimmed);
    const isOrdered = /^\d+\.\s+/.test(trimmed);
    if (isUnordered || isOrdered) {
      const items: string[] = [];
      while (i < lines.length) {
        const rawCur = lines[i] ?? "";
        const cur = rawCur.trim();
        if (!cur) break;
        const isNested = /^\s{2,}(?:[*+-]|\d+\.)\s+/.test(rawCur);
        if (isNested && items.length > 0) {
          const prev = items[items.length - 1]!;
          const subText = rewriteRelativeLinksInText(
            cur.replace(/^(?:[*+-]|\d+\.)\s+/, ""),
            sourceRelPath,
            linkResolutionMap,
            linkTitleMap,
          );
          items[items.length - 1] = `${prev}\n• ${subText}`;
          i += 1;
        } else if (
          (isUnordered && /^[*+-]\s+/.test(cur)) ||
          (isOrdered && /^\d+\.\s+/.test(cur))
        ) {
          items.push(
            rewriteRelativeLinksInText(
              cur.replace(/^(?:[*+-]|\d+\.)\s+/, ""),
              sourceRelPath,
              linkResolutionMap,
              linkTitleMap,
            ),
          );
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }

    // Standard Paragraph
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = (lines[i] ?? "").trim();
      if (
        !cur ||
        /^---+$/.test(cur) ||
        /^(`{3,}|~{3,})/.test(cur) ||
        /^#{1,4}\s+/.test(cur) ||
        cur.startsWith(">") ||
        cur.startsWith("|") ||
        /^-\s+\[[ xX]\]\s+/.test(cur) ||
        /^[*+-]\s+/.test(cur) ||
        /^\d+\.\s+/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({
        kind: "paragraph",
        text: rewriteRelativeLinksInText(
          paraLines.join(" "),
          sourceRelPath,
          linkResolutionMap,
          linkTitleMap,
        ),
      });
    }
  }

  return { toc, blocks };
}

function defaultOfficialFallbackForCategory(category: DocumentCategory): string {
  switch (category) {
    case "checklist":
      return "https://www.ecfr.gov/current/title-38/chapter-I/part-20/subpart-O";
    case "playbook":
      return "https://www.ecfr.gov/current/title-38/chapter-I/part-4";
    default:
      return "https://www.ecfr.gov/current/title-38/chapter-I/part-3";
  }
}

export function extractCompiledDocuments(params: {
  upstreamDir: string;
  upstreamEntries: UpstreamIndexEntry[];
  heldAtGate: Array<{
    id: string;
    title: string;
    category: DocumentCategory;
    upstreamPath: string;
    canonicalRoute: string;
    waveId: string;
  }>;
  overlays: Map<string, VeteranOverlay>;
  linkResolutionMap: Record<string, string>;
  linkTitleMap?: Record<string, string>;
  pathToWave?: Map<string, string>;
  directCfrEntityStems?: ReadonlySet<string>;
  routeResolver: (entry: UpstreamIndexEntry) => string;
}): CompiledDocument[] {
  const {
    upstreamDir,
    upstreamEntries,
    heldAtGate,
    overlays,
    linkResolutionMap,
    linkTitleMap = {},
    pathToWave = new Map<string, string>(),
    directCfrEntityStems = new Set<string>(),
    routeResolver,
  } = params;

  const docs: CompiledDocument[] = [];

  for (const entry of upstreamEntries) {
    const relPath = entry.path.replace(/\\/g, "/");
    const slug = posix.basename(relPath, ".md");
    if (directCfrEntityStems.has(slug)) {
      continue;
    }
    const route = routeResolver(entry);
    const absPath = join(upstreamDir, relPath);
    const rawMd = existsSync(absPath) ? readFileSync(absPath, "utf8") : "";
    const parsed = parseMarkdownBodyToAst(
      rawMd,
      relPath,
      linkResolutionMap,
      linkTitleMap,
    );
    const veteranOverlay = overlays.get(entry.id) ?? null;
    const coverageState: CoverageState = veteranOverlay
      ? "VERBATIM_VERIFIED"
      : "PLAIN_ENGLISH_IN_PROGRESS";
    const waveId = pathToWave.get(relPath) ?? "W1";

    docs.push({
      id: entry.id,
      slug,
      route,
      title: entry.title,
      category: entry.category,
      status: waveId === "W1" ? "WAVE_1_LIVE" : "LIVE_VERIFIED",
      waveId,
      coverageState,
      bitemporalScope: entry.bitemporal_scope ?? null,
      practiceDomains: entry.practice_domains ?? [],
      vasrdSystem: entry.vasrd_system ?? null,
      effectiveFrom: entry.effective_from,
      effectiveTo: entry.effective_to,
      statutes: entry.statutes ?? [],
      cfrCitations: entry.cfr_citations ?? [],
      diagnosticCodes: entry.diagnostic_codes ?? [],
      keyPrecedents: entry.key_precedents ?? [],
      cFileTriggers: (entry.c_file_triggers ?? []).map(sanitizeSchemaTokens),
      killSwitches: (entry.kill_switches ?? []).map(sanitizeSchemaTokens),
      unfinalizedProposals: entry.unfinalized_proposals ?? [],
      toc: parsed.toc,
      blocks: parsed.blocks,
      veteranOverlay,
      officialFallbackUrl: defaultOfficialFallbackForCategory(entry.category),
    });
  }

  for (const held of heldAtGate) {
    const slug = posix.basename(held.upstreamPath, ".md");
    if (directCfrEntityStems.has(slug)) {
      continue;
    }
    docs.push({
      id: held.id,
      slug,
      route: held.canonicalRoute,
      title: held.title,
      category: held.category,
      status: "HELD_AT_GATE",
      waveId: held.waveId,
      coverageState: "CORPUS_GAP_OR_QUEUED_WAVE",
      effectiveFrom: "1946-04-01",
      effectiveTo: "present",
      statutes: [],
      cfrCitations: [],
      diagnosticCodes: [],
      keyPrecedents: [],
      cFileTriggers: [],
      killSwitches: [],
      unfinalizedProposals: [],
      toc: [],
      blocks: [],
      veteranOverlay: null,
      officialFallbackUrl: defaultOfficialFallbackForCategory(held.category),
    });
  }

  return docs.sort((a, b) => {
    const rank = (s: CompiledDocument["status"]) =>
      s === "WAVE_1_LIVE" ? 0 : s === "LIVE_VERIFIED" ? 1 : 2;
    const diff = rank(a.status) - rank(b.status);
    if (diff !== 0) return diff;
    return a.route.localeCompare(b.route);
  });
}
