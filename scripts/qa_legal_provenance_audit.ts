import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { validateCfrVersionChains } from "../lib/corpus/temporal";
import type {
  CfrVersionRecord,
  CompiledCfrSection,
  CompiledCfrVersion,
  CompiledDocument,
  PrecedentEntry,
  StatutoryCrosswalkEntry,
} from "../lib/corpus/types";

const REPO_ROOT = resolve(__dirname, "..");

const BANNED_PHRASES: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b100%\s+verified\b/i,
    reason: 'Banned marketing claim ("100% verified") — show inspectable source provenance instead (Rule 02).',
  },
  {
    pattern: /\bzero[-\s]+hallucinations?\b/i,
    reason: 'Banned marketing slogan ("zero hallucination") — show primary citations and check dates instead (Rule 02).',
  },
  {
    pattern: /\bCUE[-\s]+safe\b/i,
    reason: 'Banned legal shorthand ("CUE Safe") — state exact § 20.1403(e) / § 4.25 doctrinal scope (Rule 02).',
  },
  {
    pattern: /\b(?:single|one)\s+lifetime\s+(?:Board\s+)?CUE\b/i,
    reason: 'Inaccurate § 20.1409(c) paraphrase — rule is one final merits CUE decision per prior Board decision on an issue (Rule 02).',
  },
];

const QUARANTINED_RINS = [
  "2900-AQ72",
  "2900-AQ73",
  "2900-AQ82",
  "2900-AR96",
  "2900-AS39",
  "90 FR 46542",
  "91 FR 7118",
];

function walkSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkSourceFiles(full));
    } else if (/\.(ts|tsx|json|mdx?)$/i.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  const errors: string[] = [];

  // 1. Validate CFR version chains
  const cfrPath = resolve(REPO_ROOT, "corpus", "upstream", "knowledge", "cfr-amendments.json");
  if (!existsSync(cfrPath)) {
    errors.push("Missing corpus/upstream/knowledge/cfr-amendments.json.");
  } else {
    const parsed = JSON.parse(readFileSync(cfrPath, "utf8")) as {
      versions: CfrVersionRecord[];
    };
    errors.push(...validateCfrVersionChains(parsed.versions));
  }

  // 2. Scan user-facing web & domain source directories (app/, components/, content/, lib/)
  const scanDirs = ["app", "components", "content", "lib"].map((d) =>
    resolve(REPO_ROOT, d),
  );
  for (const dir of scanDirs) {
    for (const file of walkSourceFiles(dir)) {
      const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
      const content = readFileSync(file, "utf8");

      for (const rule of BANNED_PHRASES) {
        if (rule.pattern.test(content)) {
          errors.push(`${rel}: ${rule.reason}`);
        }
      }

      if (/\bmem\.\s*dec\./i.test(content) && !/nonprecedential|Rule\s*30\(a\)/i.test(content)) {
        errors.push(
          `${rel}: Mentions single-judge "mem. dec." without explicit "nonprecedential" / "CAVC Rule 30(a)" warning.`,
        );
      }

      for (const rin of QUARANTINED_RINS) {
        if (
          content.includes(rin) &&
          !/proposed|unfinalized|rescinded|quarantined|not\s+enacted/i.test(content)
        ) {
          errors.push(
            `${rel}: Mentions quarantined rulemaking "${rin}" without explicit proposed/unfinalized/rescinded qualifier.`,
          );
        }
      }

      if (/rescinded\s+Interim\s+Final\s+Rules?\s*\([^)]*90\s+FR\s+46542/i.test(content)) {
        errors.push(
          `${rel}: Transposes 90 FR 46542 (proposed rule) as a rescinded Interim Final Rule (91 FR 7118 is the rescinded IFR).`,
        );
      }
    }
  }

  // 3. Audit compiled cfr-sections.json for valid official eCFR URLs, non-abridged VERBATIM_VERIFIED blocks, and clean eraNotes
  const compiledSectionsPath = resolve(REPO_ROOT, "corpus", "generated", "cfr-sections.json");
  if (existsSync(compiledSectionsPath)) {
    const validEcfrRe =
      /^https:\/\/www\.ecfr\.gov\/current\/title-38(?:\/chapter-I\/part-\d+(?:\/section-\d+\.\d+(?:a|b)?)?)?$/;
    const compiledSections = JSON.parse(
      readFileSync(compiledSectionsPath, "utf8"),
    ) as CompiledCfrSection[];

    const snapshotByVersionId = new Map<
      string,
      CompiledCfrSection["versions"][number]
    >();

    for (const sec of compiledSections) {
      if (!validEcfrRe.test(sec.officialEcfrUrl)) {
        errors.push(
          `cfr-sections.json (${sec.sectionSlug}): Invalid officialEcfrUrl "${sec.officialEcfrUrl}".`,
        );
      }
      if (
        sec.vasrdSystem &&
        !sec.sectionSlug.startsWith("38-cfr-4.") &&
        !sec.sectionSlug.startsWith("38-cfr-part-4")
      ) {
        errors.push(
          `cfr-sections.json (${sec.sectionSlug}): Non-Part-4 section carries Part 4 vasrdSystem "${sec.vasrdSystem}".`,
        );
      }
      for (const ver of [...sec.versions, ...sec.quarantinedWatchlist]) {
        snapshotByVersionId.set(ver.version_id, ver);
      }
      for (let idx = 1; idx < sec.versions.length; idx += 1) {
        const prev = sec.versions[idx - 1]!;
        const curr = sec.versions[idx]!;
        const prevEnd =
          !prev.effective_to || prev.effective_to === "present"
            ? "9999-12-31"
            : prev.effective_to;
        if (prevEnd >= curr.effective_from) {
          errors.push(
            `cfr-sections.json (${sec.sectionSlug}): Overlapping enacted intervals between ${prev.version_id} (${prev.effective_from}..${prev.effective_to ?? "present"}) and ${curr.version_id} (${curr.effective_from}..${curr.effective_to ?? "present"}).`,
          );
        }
      }

      function checkDuplicateSectionHeaders(body: string, label: string): void {
        const headers = Array.from(
          body.matchAll(/^\*\*§\s*(\d+\.\d+[a-z]?)\b/gim),
        ).map((m) => (m[1] ?? "").toLowerCase());
        const seen = new Set<string>();
        for (const h of headers) {
          if (seen.has(h)) {
            errors.push(
              `cfr-sections.json (${label}): Duplicate "**§ ${h}" header inside single verbatim snapshot (possible multi-era extraction collision).`,
            );
          }
          seen.add(h);
        }
      }

      for (const ver of sec.versions) {
        if (ver.verbatimMarkdown) {
          checkDuplicateSectionHeaders(ver.verbatimMarkdown, ver.version_id);
          if (/\$\^\{/.test(ver.verbatimMarkdown)) {
            errors.push(
              `cfr-sections.json (${ver.version_id}): Raw LaTeX token ($^{...}$) in verbatimMarkdown.`,
            );
          }
          if (/^#{1,6}\s+/m.test(ver.verbatimMarkdown)) {
            errors.push(
              `cfr-sections.json (${ver.version_id}): Raw Markdown heading (#) line in verbatimMarkdown.`,
            );
          }
          if (
            /\*\((?:Pre-|Heading updated|Retains\s+the|Summarized from|Omitted here)\b/i.test(
              ver.verbatimMarkdown,
            ) ||
            /\[now\s+\d{4}\]/i.test(ver.verbatimMarkdown)
          ) {
            errors.push(
              `cfr-sections.json (${ver.version_id}): Unstripped editorial annotation (*(Pre-...)* / [now DDDD]) in verbatimMarkdown.`,
            );
          }
          if (/,\s*(?:(?:or|and)\s*)?$/i.test(ver.verbatimMarkdown.trim())) {
            errors.push(
              `cfr-sections.json (${ver.version_id}): Mid-sentence trailing truncation ("${ver.verbatimMarkdown.trim().slice(-30)}") in verbatimMarkdown.`,
            );
          }
        }
        if (ver.scopedExcerpts) {
          for (const [scopeKey, scopeBody] of Object.entries(ver.scopedExcerpts)) {
            if (!scopeBody || scopeBody.trim().length < 20) {
              errors.push(
                `cfr-sections.json (${ver.version_id}): Empty or truncated scopedExcerpts["${scopeKey}"].`,
              );
            } else {
              checkDuplicateSectionHeaders(
                scopeBody,
                `${ver.version_id}.scopedExcerpts[${scopeKey}]`,
              );
              if (/,\s*(?:(?:or|and)\s*)?$/i.test(scopeBody.trim())) {
                errors.push(
                  `cfr-sections.json (${ver.version_id}): Mid-sentence trailing truncation in scopedExcerpts["${scopeKey}"].`,
                );
              }
              if (
                ver.verbatimMarkdown &&
                scopeBody.trim().length > ver.verbatimMarkdown.trim().length
              ) {
                errors.push(
                  `cfr-sections.json (${ver.version_id}): scopedExcerpts["${scopeKey}"] (${scopeBody.length} chars) overflows parent verbatimMarkdown (${ver.verbatimMarkdown.length} chars).`,
                );
              }
            }
          }
        }
        if (ver.coverageState === "VERBATIM_VERIFIED") {
          if (!ver.verbatimMarkdown) {
            errors.push(
              `cfr-sections.json (${ver.version_id}): Marked VERBATIM_VERIFIED despite null verbatimMarkdown.`,
            );
          } else if (/\*\(Retains\s+the\b/i.test(ver.verbatimMarkdown)) {
            errors.push(
              `cfr-sections.json (${ver.version_id}): Marked VERBATIM_VERIFIED despite parenthetical editorial abridgment.`,
            );
          }
        }
        if (ver.eraNote && /(?:\)\.?(\*)+|:\*|\*\()/.test(ver.eraNote)) {
          errors.push(
            `cfr-sections.json (${ver.version_id}): Unstripped or truncated Markdown artifact in eraNote ("${ver.eraNote.slice(-20)}").`,
          );
        }
      }
    }

    const compiledVersionsPath = resolve(REPO_ROOT, "corpus", "generated", "cfr-versions.json");
    if (existsSync(compiledVersionsPath)) {
      const compiledVersions = JSON.parse(
        readFileSync(compiledVersionsPath, "utf8"),
      ) as CompiledCfrVersion[];
      errors.push(
        ...validateCfrVersionChains(compiledVersions).map(
          (err) => `cfr-versions.json: ${err}`,
        ),
      );
      for (const cv of compiledVersions) {
        const snap = snapshotByVersionId.get(cv.version_id);
        if (snap && cv.coverageState !== snap.coverageState) {
          errors.push(
            `cfr-versions.json (${cv.version_id}): coverageState "${cv.coverageState}" diverges from cfr-sections.json "${snap.coverageState}".`,
          );
        }
        if (cv.coverageState === "VERBATIM_VERIFIED" && snap && !snap.verbatimMarkdown) {
          errors.push(
            `cfr-versions.json (${cv.version_id}): Marked VERBATIM_VERIFIED despite null verbatimMarkdown.`,
          );
        }
      }
    }

    const precedentsPath = resolve(REPO_ROOT, "corpus", "generated", "precedents.json");
    if (existsSync(precedentsPath)) {
      const precedents = JSON.parse(
        readFileSync(precedentsPath, "utf8"),
      ) as PrecedentEntry[];
      for (const prec of precedents) {
        if (prec.isNonprecedentialRule30a && /\bFed\.\s*Cir\./i.test(prec.citation)) {
          errors.push(
            `precedents.json (${prec.slug}): Federal Circuit disposition mislabeled as CAVC Rule 30(a) ("${prec.citation}").`,
          );
        }
      }
    }
  }

  // 4. Audit compiled statutory-crosswalk.json for Era column alignment & compiled-documents.json for zero unrewritten relative links
  const crosswalkPath = resolve(REPO_ROOT, "corpus", "generated", "statutory-crosswalk.json");
  if (existsSync(crosswalkPath)) {
    const rows = JSON.parse(
      readFileSync(crosswalkPath, "utf8"),
    ) as StatutoryCrosswalkEntry[];
    for (const row of rows) {
      if (/Vet\.\s*Reg\.|Economy\s+Act|^None$/i.test(row.eraCSection)) {
        errors.push(
          `statutory-crosswalk.json (${row.subject}): Era A authority leaked into modern eraCSection ("${row.eraCSection}").`,
        );
      }
    }
  }

  const compiledDocsPath = resolve(REPO_ROOT, "corpus", "generated", "compiled-documents.json");
  if (existsSync(compiledDocsPath)) {
    const docs = JSON.parse(
      readFileSync(compiledDocsPath, "utf8"),
    ) as CompiledDocument[];
    for (const doc of docs) {
      const blocksText = JSON.stringify(doc.blocks);
      if (/\]\(\.\.\//.test(blocksText) || /\.md(?:#[^)]+)?\)/.test(blocksText)) {
        errors.push(
          `compiled-documents.json (${doc.id}): Contains unrewritten relative repository link.`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[qa:legal] FAIL (${errors.length} violation(s)):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  console.log("[qa:legal] PASS: Bitemporal chains, Rule 30(a), RIN quarantine, and provenance copy verified.");
}

main();
