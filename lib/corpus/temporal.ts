import type {
  BitemporalTwoPaneContext,
  CfrVersionRecord,
  CompiledCfrVersion,
  CoverageState,
  ResolvedCfrQuery,
} from "./types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const LETTERED_TITLE38_SECTIONS = new Set([
  "3.320a",
  "3.320b",
  "4.71a",
  "4.88a",
  "4.88b",
  "4.115a",
  "4.115b",
  "4.124a",
]);

function extractCfrSectionNumbers(cfrSection: string): Set<string> {
  const out = new Set<string>();
  const withoutParens = cfrSection.replace(/\((?!DC\b)[^)]*\)/gi, " ");
  for (const m of withoutParens.matchAll(/\b(\d+\.\d+[a-z]?)\b/gi)) {
    const token = m[1]?.toLowerCase();
    if (token) {
      // Normalize base numeric section (e.g., "4.71a" -> "4.71a", "1.963b" -> "1.963")
      const base = /^(\d+\.\d+)(?:a|b)?$/i.exec(token);
      out.add(LETTERED_TITLE38_SECTIONS.has(token) ? token : (base?.[1] ?? token.replace(/[a-z]+$/i, "")));
    }
  }
  return out;
}

function truncateSlugAtHyphen(slug: string, maxLen = 48): string {
  if (slug.length <= maxLen) return slug;
  const sliced = slug.slice(0, maxLen);
  const lastDash = sliced.lastIndexOf("-");
  return (lastDash > 10 ? sliced.slice(0, lastDash) : sliced).replace(/-+$/g, "");
}

/**
 * Normalizes a human 38 C.F.R. section string into a deterministic, Windows-MAX_PATH-safe route slug.
 * Examples:
 * - "38 C.F.R. § 4.56" -> "38-cfr-4.56"
 * - "former 38 C.F.R. § 3.157(b)" -> "38-cfr-3.157b"
 * - "38 C.F.R. Part 4" -> "38-cfr-part-4"
 * - "38 C.F.R. § 4.150 (§ 4.149 [Reserved])" -> "38-cfr-4.150"
 * - "former 38 C.F.R. § 4.118 (DC 7806–7833)" -> "38-cfr-4.118-dc-7806-7833"
 */
export function normalizeCfrSlug(cfrSection: string): string {
  // Iteratively strip innermost descriptive multi-word parentheticals (handles nested parens like "71.40(c)(4)")
  // while preserving "(DC ...)", "(Proposed)", and short subsection "(a)"/"(1)" tokens.
  let strippedDescriptiveParens = cfrSection;
  for (let pass = 0; pass < 5; pass += 1) {
    const next = strippedDescriptiveParens.replace(
      /\(([^()]+)\)/g,
      (_full, inner: string) => {
        const trimmed = inner.trim();
        if (/^(?:DC\b|proposed$)/i.test(trimmed)) return ` ${trimmed} `;
        if (/^[a-z0-9]{1,3}$/i.test(trimmed)) return trimmed;
        return "";
      },
    );
    if (next === strippedDescriptiveParens) break;
    strippedDescriptiveParens = next;
  }

  const cleaned = strippedDescriptiveParens
    .replace(/^former\s+/i, "")
    .replace(/\bformer\s+§*\s*/gi, "")
    .replace(/38\s*C\.?F\.?R\.?\s*(?:§+|sec\.?|section)?\s*/i, "38-cfr-")
    .replace(/[()[\]]/g, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const prefixed = cleaned.startsWith("38-cfr-") ? cleaned : `38-cfr-${cleaned}`;
  return truncateSlugAtHyphen(prefixed, 48);
}

/**
 * Computes canonical chain-cohesive sectionSlugs across a CfrVersionRecord[] set (ADR-0005):
 * 1-to-1 `supersedes` <-> `superseded_by` transitions sharing a primary Part.Section number
 * inherit the chain's terminal head `sectionSlug`, while cross-section many-to-one consolidations
 * (e.g., § 4.16(c) + § 4.132 -> § 4.130) remain distinct.
 */
export function assignCanonicalSectionSlugs(
  versions: CfrVersionRecord[],
): Map<string, string> {
  const byId = new Map(versions.map((v) => [v.version_id, v]));
  const rawSlugById = new Map(
    versions.map((v) => [v.version_id, normalizeCfrSlug(v.cfr_section)]),
  );
  const canonicalById = new Map<string, string>();

  for (const v of versions) {
    let cursor: CfrVersionRecord = v;
    const visited = new Set<string>([v.version_id]);

    while (cursor.superseded_by) {
      const next = byId.get(cursor.superseded_by);
      if (!next || visited.has(next.version_id)) break;
      // Only unify along symmetric 1-to-1 chains that share at least one Part.Section number
      if (next.supersedes !== cursor.version_id) break;

      const curNums = extractCfrSectionNumbers(cursor.cfr_section);
      const nextNums = extractCfrSectionNumbers(next.cfr_section);
      let sharesSection = false;
      for (const n of curNums) {
        if (nextNums.has(n)) {
          sharesSection = true;
          break;
        }
      }
      if (!sharesSection) break;

      visited.add(next.version_id);
      cursor = next;
    }

    canonicalById.set(
      v.version_id,
      rawSlugById.get(cursor.version_id) ?? normalizeCfrSlug(v.cfr_section),
    );
  }

  return canonicalById;
}

/**
 * Resolves any pinpoint subsection or parenthetical CFR citation string
 * (e.g., "38 C.F.R. § 4.56(b)", "38 C.F.R. § 3.156(c)(1)",
 * "38 C.F.R. § 4.56 (62 FR 30235, pub. June 3, 1997, eff. July 3, 1997)")
 * to its canonical Wave 1 reader route when unlocked, or `/cfr` otherwise.
 */
export function resolveWave1CfrHref(rawCite: string): {
  href: string;
  isWave1Live: boolean;
} {
  const cleaned = rawCite.trim();
  if (/\b4\.56\b/.test(cleaned)) {
    return { href: "/cfr/38-cfr-4.56", isWave1Live: true };
  }
  if (/\b4\.118\b/.test(cleaned) && !/7806/.test(cleaned)) {
    return { href: "/cfr/38-cfr-4.118", isWave1Live: true };
  }
  if (/\b3\.156\s*\(\s*c\s*\)/i.test(cleaned) || /\b3\.156c\b/i.test(cleaned)) {
    return { href: "/cfr/38-cfr-3.156c", isWave1Live: true };
  }
  const directIndexed: ReadonlyArray<[RegExp, string]> = [
    [/\b4\.118\b.*7806/i, "/cfr/38-cfr-4.118a-b-dc-7806-7833"],
    [/\b1\.963\b/, "/cfr/38-cfr-1.963a-b"],
    [/\b3\.6\b/, "/cfr/38-cfr-3.6"],
    [/\b3\.12\b/, "/cfr/38-cfr-3.12a-l"],
    [/\b3\.13\b/, "/cfr/38-cfr-3.13"],
    [/\b3\.22\b/, "/cfr/38-cfr-3.22"],
    [/\b3\.33\b/, "/cfr/38-cfr-3.33"],
    [/\b3\.55\b/, "/cfr/38-cfr-3.55a9-11"],
    [/\b3\.105\s*\(\s*[dei]\s*\)/i, "/cfr/38-cfr-3.105e-i"],
    [/\b3\.157\s*\(\s*b\s*\)/i, "/cfr/38-cfr-3.157b"],
    [/\b3\.155\b/, "/cfr/38-cfr-3.155"],
    [/\b3\.159\b/, "/cfr/38-cfr-3.159a-c"],
    [/\b3\.27[4-9]\b/, "/cfr/38-cfr-3.274-3.279"],
    [/\b3\.301\s*\(\s*d\s*\)/i, "/cfr/38-cfr-3.301d-3.310a-b"],
    [/\b3\.304\s*\(\s*b\s*\)/i, "/cfr/38-cfr-3.304b"],
    [/\b3\.304\s*\(\s*f\s*\)/i, "/cfr/38-cfr-3.304f1-5"],
    [/\b3\.310\s*\(\s*d\s*\)/i, "/cfr/38-cfr-3.310d"],
    [/\b3\.310\b/, "/cfr/38-cfr-3.310a-c"],
    [/\b3\.312\b/, "/cfr/38-cfr-3.312"],
    [/\b3\.317\b/, "/cfr/38-cfr-3.317"],
    [/\b3\.320[ab]?\b/i, "/cfr/38-cfr-3.320-3.320a-3.320b"],
    [/\b3\.321\s*\(\s*b\s*\)/i, "/cfr/38-cfr-3.321b1"],
    [/\b3\.344\b/, "/cfr/38-cfr-3.344"],
    [/\b3\.350\s*\(\s*f\s*\)/i, "/cfr/38-cfr-3.350f3-5"],
    [/\b3\.350\s*\(\s*j\s*\)|\b3\.352\b/i, "/cfr/38-cfr-3.350j-3.352b-3.552b2"],
    [/\b3\.350\b/, "/cfr/38-cfr-3.350a-3.350a7"],
    [/\b3\.354\b/, "/cfr/38-cfr-3.354a-b"],
    [/\b3\.358\b|\b3\.36[1-3]\b/, "/cfr/38-cfr-3.358-3.361-3.363"],
    [/\b3\.400\s*\(\s*g\s*\)/i, "/cfr/38-cfr-3.400g"],
    [/\b3\.400\s*\(\s*o\s*\)/i, "/cfr/38-cfr-3.400-3.400o2"],
    [/\b3\.655\b/, "/cfr/38-cfr-3.655"],
    [/\b3\.700\b/, "/cfr/38-cfr-3.700a3-5"],
    [/\b3\.810\b/, "/cfr/38-cfr-3.810a"],
    [/\b3\.816\b/, "/cfr/38-cfr-3.816"],
    [/\b3\.951\b/, "/cfr/38-cfr-3.951"],
    [/\b3\.953\b/, "/cfr/38-cfr-3.953"],
    [/\b3\.957\b/, "/cfr/38-cfr-3.957"],
    [/\b3\.1000\b/, "/cfr/38-cfr-3.1000"],
    [/\b3\.1010\b/, "/cfr/38-cfr-3.1010"],
    [/\b3\.2500\b/, "/cfr/38-cfr-3.2500"],
    [/\b3\.2501\b|\b3\.2601\b/, "/cfr/38-cfr-3.2501-3.2601-20.202-20.300-20.303"],
    [/\b4\.16\s*\(\s*c\s*\)/i, "/cfr/38-cfr-4.16c"],
    [/\b4\.16\b/, "/cfr/38-cfr-4.16a-b"],
    [/\b4\.26\s*\(\s*d\s*\)/i, "/cfr/38-cfr-4.26d"],
    [/\b4\.29\b|\b4\.30\b/, "/cfr/38-cfr-4.29-4.30"],
    [/\b4\.71a\b/i, "/cfr/38-cfr-4.71a-4.73"],
    [/\b4\.7[5-9]\b/, "/cfr/38-cfr-4.75-4.79"],
    [/\b4\.87\b.*6260/i, "/cfr/38-cfr-4.87-dc-6260"],
    [/\b4\.8[5-7]\b/, "/cfr/38-cfr-4.85-4.87"],
    [/\b4\.88[ab]?\b/i, "/cfr/38-cfr-4.88a-4.88b"],
    [/\b4\.9[67]\b/, "/cfr/38-cfr-4.96-4.97"],
    [/\b4\.104\b.*7122/i, "/cfr/38-cfr-4.104-dc-7122"],
    [/\b4\.10[04]\b/, "/cfr/38-cfr-4.100-4.104"],
    [/\b4\.11[0-4]\b/, "/cfr/38-cfr-4.110-4.114"],
    [/\b4\.115[ab]?\b/i, "/cfr/38-cfr-4.115-4.115a-4.115b"],
    [/\b4\.116\b/, "/cfr/38-cfr-4.116"],
    [/\b4\.117\b/, "/cfr/38-cfr-4.117"],
    [/\b4\.119\b/, "/cfr/38-cfr-4.119"],
    [/\b4\.124a\b.*8017/i, "/cfr/38-cfr-4.124a-dc-8017"],
    [/\b4\.124a\b/i, "/cfr/38-cfr-4.124a-dc-8045"],
    [/\b4\.132\b/, "/cfr/38-cfr-4.132"],
    [/\b4\.1(?:2[5-9]|30)\b/, "/cfr/38-cfr-4.130"],
    [/\b4\.150\b/, "/cfr/38-cfr-4.150"],
    [/\b14\.636\b|\b14\.629\b/, "/cfr/38-cfr-14.636c-e-h"],
    [/\b17\.100[245]\b/, "/cfr/38-cfr-17.1004d-f-17.1005a1-5"],
    [/\b17\.40(?:00|20)\b|\bPart\s+71\b|\b71\.(?:15|20|25|40|45)\b/i, "/cfr/38-cfr-part-71-17.4000-17.4020c"],
    [/\b20\.(?:202|30[0-3]|800|100[0-2]|110[34]|1302)\b/, "/cfr/38-cfr-3.2501-3.2601-20.202-20.300-20.303"],
    [/\b20\.140[0-9]\b/, "/cfr/38-cfr-20.1400-20.1411"],
  ];
  for (const [pattern, href] of directIndexed) {
    if (pattern.test(cleaned)) {
      return { href, isWave1Live: false };
    }
  }
  return { href: "/cfr", isWave1Live: false };
}

export function toCompiledCfrVersion(
  record: CfrVersionRecord,
  overrideSectionSlug?: string,
): CompiledCfrVersion {
  const existing = record as Partial<CompiledCfrVersion> & {
    bookmarkStatus?: string;
  };
  const sectionSlug =
    overrideSectionSlug ??
    existing.sectionSlug ??
    normalizeCfrSlug(record.cfr_section);

  let coverageState: CoverageState;
  if (
    existing.bookmarkStatus === "HELD_AT_BOOKMARK_GATE" ||
    existing.coverageState === "CORPUS_GAP_OR_QUEUED_WAVE"
  ) {
    coverageState = "CORPUS_GAP_OR_QUEUED_WAVE";
  } else if (
    record.verbatim_text_status === "summary-only-pull-print-cfr-before-cue" ||
    existing.coverageState === "SUMMARY_ONLY"
  ) {
    coverageState = "SUMMARY_ONLY";
  } else {
    coverageState = "VERBATIM_VERIFIED";
  }

  return {
    ...record,
    sectionSlug,
    permalink: `/cfr/${sectionSlug}/${record.effective_from}`,
    coverageState,
  };
}

export function toCompiledCfrVersions(
  records: CfrVersionRecord[],
): CompiledCfrVersion[] {
  const slugMap = assignCanonicalSectionSlugs(records);
  return records.map((r) => toCompiledCfrVersion(r, slugMap.get(r.version_id)));
}

/**
 * Validates temporal DAG integrity across cfr-amendments.json:
 * 1. Valid ISO date order (effective_from <= effective_to)
 * 2. Duplicate version_id prevention
 * 3. Pointer integrity supporting many-to-one regulatory consolidations (e.g., § 4.16(c) + § 4.132 -> § 4.130)
 * 4. Contiguous transitions (prior.effective_to + 1 day === next.effective_from), while recognizing
 *    retroactive statutory conforming rules where prior print text ended the day before next.publication_date
 *    (e.g., 87 FR 68360 published 2022-11-15 retroactively conforming § 3.55 to Pub. L. 116-315 eff. 2021-01-05).
 */
export function validateCfrVersionChains(versions: CfrVersionRecord[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, CfrVersionRecord>();

  for (const v of versions) {
    if (byId.has(v.version_id)) {
      errors.push(`Duplicate version_id "${v.version_id}" in cfr-amendments.json.`);
    }
    byId.set(v.version_id, v);

    if (!ISO_DATE_RE.test(v.effective_from)) {
      errors.push(`Invalid effective_from "${v.effective_from}" on ${v.version_id}.`);
    }
    if (v.effective_to && v.effective_to !== "present") {
      if (!ISO_DATE_RE.test(v.effective_to)) {
        errors.push(`Invalid effective_to "${v.effective_to}" on ${v.version_id}.`);
      } else if (v.effective_from > v.effective_to) {
        errors.push(
          `Inverted effective window (${v.effective_from} > ${v.effective_to}) on ${v.version_id}.`,
        );
      }
    }
  }

  for (const v of versions) {
    if (v.supersedes) {
      const prior = byId.get(v.supersedes);
      if (!prior) {
        errors.push(`${v.version_id} supersedes unknown version_id "${v.supersedes}".`);
        continue;
      }
      if (prior.superseded_by !== v.version_id) {
        errors.push(
          `Asymmetric chain: ${v.version_id}.supersedes="${v.supersedes}", but ${prior.version_id}.superseded_by="${prior.superseded_by ?? "null"}".`,
        );
      }
      validateTransitionWindow(prior, v, errors);
    }

    if (v.superseded_by) {
      const next = byId.get(v.superseded_by);
      if (!next) {
        errors.push(`${v.version_id} has unknown superseded_by "${v.superseded_by}".`);
        continue;
      }
      if (next.supersedes !== v.version_id) {
        // Permitted iff `next` is a many-to-one regulatory consolidation whose primary `supersedes`
        // parent also points `superseded_by` to `next.version_id`.
        const primaryParent = next.supersedes ? byId.get(next.supersedes) : undefined;
        const isManyToOneConsolidation = primaryParent?.superseded_by === next.version_id;
        if (!isManyToOneConsolidation) {
          errors.push(
            `Asymmetric chain: ${v.version_id}.superseded_by="${v.superseded_by}", but ${next.version_id}.supersedes="${next.supersedes ?? "null"}".`,
          );
        } else {
          validateTransitionWindow(v, next, errors);
        }
      }
    }
  }

  return errors;
}

function validateTransitionWindow(
  prior: CfrVersionRecord,
  next: CfrVersionRecord,
  errors: string[],
): void {
  if (!prior.effective_to || prior.effective_to === "present") {
    errors.push(
      `Superseded version ${prior.version_id} must close its effective_to date before ${next.version_id} (${next.effective_from}).`,
    );
    return;
  }

  const dayAfterPrior = addOneDayUtc(prior.effective_to);
  if (dayAfterPrior === next.effective_from) {
    return;
  }

  // Retroactive statutory conforming rule: Federal Register rule published AFTER statutory effective date,
  // where prior print CFR text closed the day before Federal Register publication.
  const isRetroactiveStatutoryConform =
    Boolean(next.publication_date) &&
    next.effective_from < (next.publication_date ?? "") &&
    dayAfterPrior === next.publication_date &&
    /Pub\.\s*L\./i.test(next.applicability_and_transition_notes ?? "");

  if (isRetroactiveStatutoryConform) {
    return;
  }

  if (prior.effective_to >= next.effective_from) {
    errors.push(
      `Overlapping effective dates between ${prior.version_id} (ends ${prior.effective_to}) and ${next.version_id} (starts ${next.effective_from}).`,
    );
  } else {
    errors.push(
      `Unaccounted date gap between ${prior.version_id} (ends ${prior.effective_to}) and ${next.version_id} (starts ${next.effective_from}; expected ${dayAfterPrior}).`,
    );
  }
}

function addOneDayUtc(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1));
  return dt.toISOString().slice(0, 10);
}

/**
 * Resolves the exact enacted 38 C.F.R. snapshot governing `decisionDate` (YYYY-MM-DD).
 *
 * Guardrails (Rule 01 & Rule 02):
 * 1. Evaluates `effective_from <= decisionDate <= effective_to` strictly (never `publication_date`).
 * 2. Excludes `proposed-nonbinding` and `interim-final-rescinded` from governing enacted law,
 *    surfacing them separately in `quarantinedWatchlist`.
 * 3. Never silently substitutes current eCFR text when a requested date has no indexed snapshot;
 *    returns `CORPUS_GAP_OR_QUEUED_WAVE` with `doNotRely: true`.
 */
export function resolveCfrAtDate(
  versions: CfrVersionRecord[],
  sectionQuery: string,
  decisionDate: string,
): ResolvedCfrQuery {
  const rawQuerySlug = sectionQuery.startsWith("38-cfr-")
    ? sectionQuery.toLowerCase()
    : normalizeCfrSlug(sectionQuery);

  if (!ISO_DATE_RE.test(decisionDate)) {
    throw new Error(`Invalid decisionDate "${decisionDate}" (expected YYYY-MM-DD).`);
  }

  const compiledAll = toCompiledCfrVersions(versions);

  // Match either canonical chain slug, historical pre-renumbering raw slug, or citation resolver route
  let resolvedSlug = rawQuerySlug;
  if (!compiledAll.some((v) => v.sectionSlug === rawQuerySlug)) {
    const byHistoricalRaw = compiledAll.find(
      (v) => normalizeCfrSlug(v.cfr_section) === rawQuerySlug,
    );
    if (byHistoricalRaw) {
      resolvedSlug = byHistoricalRaw.sectionSlug;
    } else {
      const mappedHref = resolveWave1CfrHref(sectionQuery).href;
      if (mappedHref.startsWith("/cfr/") && mappedHref !== "/cfr") {
        const candidate = mappedHref.slice("/cfr/".length);
        if (compiledAll.some((v) => v.sectionSlug === candidate)) {
          resolvedSlug = candidate;
        }
      }
    }
  }

  const sectionSlug = resolvedSlug;
  const matchingSection = compiledAll.filter((v) => v.sectionSlug === sectionSlug);

  const leadCfrCitation = matchingSection[0]?.cfr_section;
  const officialFallbackUrls = buildOfficialFallbackUrls(sectionSlug, leadCfrCitation);

  const quarantinedWatchlist = matchingSection.filter(
    (v) =>
      v.regulatory_status === "proposed-nonbinding" ||
      v.regulatory_status === "interim-final-rescinded",
  );

  const enactedCandidates = matchingSection.filter(
    (v) =>
      (v.regulatory_status === "final-effective" ||
        v.regulatory_status === "repealed-historical") &&
      v.effective_from <= decisionDate &&
      (!v.effective_to || v.effective_to === "present" || decisionDate <= v.effective_to),
  );

  // Prefer the most recent effective_from snapshot when a retroactive statutory amendment overlaps prior print text
  enactedCandidates.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  const governing = enactedCandidates[0] ?? null;

  if (!governing) {
    return {
      sectionSlug,
      decisionDate,
      coverageState: "CORPUS_GAP_OR_QUEUED_WAVE",
      doNotRely: true,
      governingVersion: null,
      quarantinedWatchlist,
      explanation:
        matchingSection.length === 0
          ? `No point-in-time snapshot is indexed yet for ${sectionSlug}. Do not rely on unindexed assumptions—consult the official print/annual 38 C.F.R. edition on GovInfo.`
          : `No verified snapshot covers ${decisionDate} for ${sectionSlug}. VetLawGuide never silently substitutes modern eCFR text—pull the contemporaneous print CFR edition before relying on this section.`,
      officialFallbackUrls,
    };
  }

  if (governing.coverageState === "CORPUS_GAP_OR_QUEUED_WAVE") {
    return {
      sectionSlug,
      decisionDate,
      coverageState: "CORPUS_GAP_OR_QUEUED_WAVE",
      doNotRely: true,
      governingVersion: null,
      quarantinedWatchlist,
      explanation: `Verbatim point-in-time text for ${governing.cfr_section} (${governing.version_id}) is held at the bookmark gate for a future rollout wave. Do not rely on placeholder metadata—pull the contemporaneous official print 38 C.F.R. edition on GovInfo.`,
      officialFallbackUrls,
    };
  }

  return {
    sectionSlug,
    decisionDate,
    coverageState: governing.coverageState,
    doNotRely: false,
    governingVersion: governing,
    quarantinedWatchlist,
    explanation:
      governing.coverageState === "SUMMARY_ONLY"
        ? `Summary Only for ${decisionDate} (${governing.version_id}): pull the contemporaneous official print 38 C.F.R. edition before pleading CUE.`
        : `Verbatim primary text verified for ${decisionDate} via ${governing.version_id} (effective ${governing.effective_from} to ${governing.effective_to ?? "present"}).`,
    officialFallbackUrls,
  };
}

export function buildOfficialFallbackUrls(
  sectionSlug: string,
  cfrSection?: string,
): {
  ecfrUrl: string;
  govinfoUrl: string;
} {
  const govinfoUrl = "https://www.govinfo.gov/app/collection/cfr";
  const isRepealedOrProposed =
    Boolean(cfrSection && /^(?:former\b|.*\(proposed\))/i.test(cfrSection.trim())) ||
    sectionSlug.endsWith("-proposed");

  // Extract Part number first for Part-level fallbacks ("38 C.F.R. Part 4", repealed "former § 3.157(b)", or proposed rules)
  const partFromSlug = /^38-cfr-(?:part-)?(\d+)\b/i.exec(sectionSlug)?.[1];
  const partFromCite = cfrSection
    ? /38\s*C\.F\.R\.\s*(?:Part\s*|§+\s*)(\d+)/i.exec(cfrSection)?.[1]
    : undefined;
  const partNum = partFromCite ?? partFromSlug;

  if (isRepealedOrProposed) {
    return {
      ecfrUrl: partNum
        ? `https://www.ecfr.gov/current/title-38/chapter-I/part-${partNum}`
        : "https://www.ecfr.gov/current/title-38",
      govinfoUrl,
    };
  }

  if (cfrSection) {
    const secMatch = /38\s*C\.F\.R\.\s*§+\s*(\d+)\.(\d+)([a-z])?(?=$|[\s(–—,;-])/i.exec(
      cfrSection,
    );
    if (secMatch) {
      const p = secMatch[1]!;
      const digits = secMatch[2]!;
      const letter = (secMatch[3] ?? "").toLowerCase();
      const candidate = letter ? `${p}.${digits}${letter}` : `${p}.${digits}`;
      const normalizedSec =
        letter && LETTERED_TITLE38_SECTIONS.has(candidate)
          ? `${digits}${letter}`
          : digits;
      return {
        ecfrUrl: `https://www.ecfr.gov/current/title-38/chapter-I/part-${p}/section-${p}.${normalizedSec}`,
        govinfoUrl,
      };
    }
  }

  const slugMatch = /^38-cfr-(\d+)\.(\d+)([a-z])?/i.exec(sectionSlug);
  if (slugMatch) {
    const p = slugMatch[1]!;
    const digits = slugMatch[2]!;
    const letter = (slugMatch[3] ?? "").toLowerCase();
    const candidate = letter ? `${p}.${digits}${letter}` : `${p}.${digits}`;
    const normalizedSec =
      letter && LETTERED_TITLE38_SECTIONS.has(candidate)
        ? `${digits}${letter}`
        : digits;
    return {
      ecfrUrl: `https://www.ecfr.gov/current/title-38/chapter-I/part-${p}/section-${p}.${normalizedSec}`,
      govinfoUrl,
    };
  }

  return {
    ecfrUrl: partNum
      ? `https://www.ecfr.gov/current/title-38/chapter-I/part-${partNum}`
      : "https://www.ecfr.gov/current/title-38",
    govinfoUrl,
  };
}

/**
 * Deterministic Two-Pane Bitemporal Resolver (Rule 02):
 * Computes Pane 1 ("Law & Record Scope in Force Then" — T0) and
 * Pane 2 ("Procedural Vehicles & Collateral Limits Today" — T_now)
 * for any target `decisionDate` (YYYY-MM-DD).
 */
export function buildBitemporalTwoPaneContext(
  decisionDate: string,
  sectionVersions: CfrVersionRecord[],
): BitemporalTwoPaneContext {
  if (!ISO_DATE_RE.test(decisionDate)) {
    throw new Error(`Invalid decisionDate "${decisionDate}" (expected YYYY-MM-DD).`);
  }

  // 1. Era-accurate Title 38 statutory numbering (1933 <-> 1959 <-> May/Aug 1991)
  let statutoryEraLabel: string;
  let statutoryEraDetail: string;

  if (decisionDate < "1959-01-01") {
    statutoryEraLabel =
      "Era A (Pre-Jan. 1, 1959): Veterans' Regulations & Economy Act Authority";
    statutoryEraDetail =
      "Prior to Pub. L. 85-857 (effective Jan. 1, 1959), VA Rating Code Sheets cited Veterans' Regulation No. 1(a) (Part I wartime / Part II peacetime) rather than unified Title 38 U.S.C. sections. Check Pub. L. 85-56 § 2316(b) and Pub. L. 85-857 §§ 10–11 savings clauses (38 C.F.R. § 3.953).";
  } else if (decisionDate < "1991-05-07") {
    statutoryEraLabel =
      "Era B (Jan. 1, 1959 – May 6, 1991): Former 38 U.S.C. Numbering (Pub. L. 85-857)";
    statutoryEraDetail =
      "Contemporaneous decisions cited former Title 38 sections—e.g., § 310 (wartime disability, now § 1110), § 314 (SMC/rates, now § 1114), § 355 (rating schedule, now § 1155), § 3010 (effective dates, now § 5110), and § 4004 (BVA finality, now § 7104). Verify pre-codification text before pleading CUE.";
  } else if (decisionDate < "1991-08-06") {
    statutoryEraLabel =
      "1991 Two-Step Statutory Transition Window (May 7, 1991 – Aug. 5, 1991)";
    statutoryEraDetail =
      "91-Day Split Alert: Pub. L. 102-40 (enacted May 7, 1991) renumbered Administrative/Procedural Chapters 51–72 (e.g., § 3010 -> § 5110, § 4004 -> § 7104), while Substantive Benefits Chapters 11–42 remained at former §§ 301–418 until Pub. L. 102-83 (enacted Aug. 6, 1991).";
  } else {
    statutoryEraLabel =
      "Era C (Aug. 6, 1991 – Present): Modern 38 U.S.C. Chapter-Aligned Numbering";
    statutoryEraDetail =
      "Governed by modern 38 U.S.C. numbering (Pub. L. 102-40 & Pub. L. 102-83), e.g., §§ 1110, 1114, 1155, 5109A (RO CUE), 5110 (effective dates), and 7111 (Board CUE, added Nov. 21, 1997 by Pub. L. 105-111).";
  }

  // 2. Contemporaneous CUE record-scope rule (Bell v. Derwinski, July 21, 1992)
  const recordScopeRuleThen =
    decisionDate < "1992-07-21"
      ? "Pre-Bell Record Scope (prior to July 21, 1992): Under Bell v. Derwinski, 2 Vet. App. 611 (July 21, 1992) and Damrel v. Brown, 6 Vet. App. 242 (1994), VA medical/internal records not physically in the adjudicator's claims folder before July 21, 1992 are generally NOT constructively part of the CUE record—evaluate 38 C.F.R. § 3.156(c) if official service department records were missing."
      : "Post-Bell Constructive Possession (on or after July 21, 1992): Under Bell v. Derwinski, 2 Vet. App. 611 (1992) (and Lang v. Wilkie, 971 F.3d 1348 (Fed. Cir. 2020) for post-decision VAMC records under Legacy § 3.156(b)), VA-generated medical records in existence at the time of the decision are constructively before the adjudicator.";

  // 3. Informal-claim & hospital-report rule (former 38 C.F.R. §§ 3.155(a) & 3.157(b), repealed March 24, 2015)
  const informalClaimRuleThen =
    decisionDate < "2015-03-24"
      ? "Active Informal-Claim & Hospital-Report Era (pre-March 24, 2015): Former 38 C.F.R. § 3.157(b) treated VA or uniformed-services examination or hospitalization reports for an already service-connected disability (including 0% SC) as an automatic informal claim for increase (Shea v. Wilkie, 926 F.3d 1362 (Fed. Cir. 2019))."
      : "Standardized Claim Forms Era (on or after March 24, 2015, 79 FR 57660): Former § 3.157(b) and non-form informal claims were prospectively repealed effective March 24, 2015 in favor of Intent to File (VA Form 21-0966) and standardized claim forms (VA Form 21-526EZ), without extinguishing pre-March 24, 2015 pending informal claims.";

  // 4. Detect Federal Register Publication-to-Effective Date Gap Trap OR Retroactive Statutory Applicability vs. CFR Publication Lag!
  let publicationGapTrapAlert: string | null = null;
  for (const v of sectionVersions) {
    if (
      (v.regulatory_status === "final-effective" ||
        v.regulatory_status === "repealed-historical") &&
      v.publication_date &&
      v.publication_date < v.effective_from &&
      decisionDate >= v.publication_date &&
      decisionDate < v.effective_from
    ) {
      publicationGapTrapAlert = `Federal Register Publication vs. Effective Date Trap: ${v.cfr_section} (${v.federal_register_citation ?? v.version_id}) was published on ${v.publication_date} but did NOT take effect until ${v.effective_from}. For a ${decisionDate} decision, the pre-amendment regulation remained governing law for CUE purposes (check Karnas v. Derwinski if the claim remained open and pending across ${v.effective_from}).`;
      break;
    }
  }

  if (!publicationGapTrapAlert) {
    for (const v of sectionVersions) {
      if (
        (v.regulatory_status === "final-effective" ||
          v.regulatory_status === "repealed-historical") &&
        v.publication_date &&
        v.effective_from < v.publication_date &&
        decisionDate >= v.effective_from &&
        decisionDate < v.publication_date &&
        (!v.effective_to || v.effective_to === "present" || decisionDate <= v.effective_to)
      ) {
        if (v.effective_from === "1946-04-01" && v.publication_date === "1964-05-22") {
          publicationGapTrapAlert = `1945 Looseleaf VASRD Pre-FR Republication Window: ${v.cfr_section} took effect on April 1, 1946 under the 1945 Looseleaf Schedule and was first codified in the Federal Register on May 22, 1964 (29 FR 6718). Verify intermediate 1946–1964 looseleaf change sheets before pleading pre-1964 CUE.`;
          break;
        }
        const hasStatutoryTrigger = /\bPub\.\s*L\.\s*\d+/i.test(
          `${v.federal_register_citation ?? ""} ${v.applicability_and_transition_notes ?? ""}`,
        );
        if (hasStatutoryTrigger) {
          publicationGapTrapAlert = `Retroactive Statutory Applicability vs. Federal Register Publication Lag: ${v.cfr_section} (${v.federal_register_citation ?? v.version_id}) was codified in the Federal Register on ${v.publication_date} implementing statutory changes effective ${v.effective_from}. On ${decisionDate}, the conforming CFR print text had not yet been published—distinguish direct statutory mandates from CUE standards.`;
          break;
        }
      }
    }
  }

  return {
    decisionDate,
    statutoryEraLabel,
    statutoryEraDetail,
    recordScopeRuleThen,
    informalClaimRuleThen,
    publicationGapTrapAlert,
    vehiclesToday: [
      {
        id: "vehicle-3-156c",
        title: "Newly Associated Official Service Department Records",
        citation: "38 C.F.R. § 3.156(c)(1)–(4)",
        summary:
          "Bypasses finality without requiring undebatable CUE when relevant pre-existing military, inpatient clinical, deck-log, morning-report, or declassified unit records are later associated with the claims file, authorizing effective dates back to the original claim.",
      },
      {
        id: "vehicle-pending-claim",
        title: "Pending Unadjudicated Claims & Unissued Legacy SOCs",
        citation: "38 C.F.R. §§ 3.156(b), 3.160(c) · Tablazon · Roberson",
        summary:
          "If a pre-2015 informal/inferred claim, reasonably raised TDIU issue, or timely Legacy Notice of Disagreement (without a responsive Statement of the Case) was never finally resolved, the original claim stream may remain open outside collateral CUE bars.",
      },
      {
        id: "vehicle-ama-supplemental",
        title: "Modern Supplemental Claim or Increased-Rating Claim",
        citation: "38 U.S.C. § 5108 · 38 C.F.R. § 3.2501 · § 5104(b) (Hamill)",
        summary:
          "Establishes prospective entitlement under current liberalized rating criteria (with benefit of the doubt under 38 U.S.C. § 5107(b)) even where historical law forecloses retroactive CUE.",
      },
    ],
    collateralLimitsToday: [
      {
        id: "limit-george-20-1403e",
        title: "No Retroactive CUE From Later Judicial Invalidations or Rule Changes",
        citation: "George v. McDonough, 596 U.S. 740 (2022) · 38 C.F.R. § 20.1403(e)",
        scopeRule:
          "No § 20.1403(e) Change-in-Interpretation Allowance: A later judicial decision invalidating a regulation or a later liberalizing VASRD amendment cannot establish CUE in a final prior decision; CUE requires undebatable error under the exact law and record then in force plus a manifest outcome change under 38 C.F.R. § 4.25.",
      },
      {
        id: "limit-cook-dta",
        title: "Duty-to-Assist & Weighing Disputes Excluded From CUE",
        citation: "Cook v. Principi, 318 F.3d 1334 (Fed. Cir. 2002) (en banc) · 38 C.F.R. § 20.1403(d)",
        scopeRule:
          "Incomplete exam development, failure to obtain records, or disagreement with how an adjudicator weighed conflicting medical evidence cannot constitute CUE.",
      },
      {
        id: "limit-board-20-1409c",
        title: "Single Final Merits Decision Rule on Board CUE Issues",
        citation: "38 U.S.C. § 7111 · 38 C.F.R. § 20.1409(c)",
        scopeRule:
          "38 C.F.R. § 20.1409(c) permits only one final merits CUE decision per prior Board decision on an issue (excluding without-prejudice pleading dismissals under § 20.1404), and RO CUE under § 3.105(a) is unavailable on issues subsumed by a merits Board decision (38 C.F.R. § 20.1104).",
      },
    ],
  };
}

/**
 * Deterministic Diagnostic Code matcher supporting exact 4-digit codes ("7804")
 * and hyphenated numeric ranges ("5301-5323" matching "5313").
 */
export function matchesDiagnosticCode(spec: string, queryDc: string): boolean {
  const normalizedQuery = queryDc.trim();
  if (!/^\d{4}$/.test(normalizedQuery)) {
    return false;
  }
  const qNum = Number(normalizedQuery);
  const trimmed = spec.trim();

  if (/^\d{4}$/.test(trimmed)) {
    return Number(trimmed) === qNum;
  }

  const rangeMatch = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec(trimmed);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    return qNum >= start && qNum <= end;
  }

  return false;
}
