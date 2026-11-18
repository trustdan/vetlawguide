import {
  getCompiledCfrSections,
  getCompiledCfrVersions,
  getCompiledDocuments,
  getCompiledLexicon,
  getCompiledPrecedents,
  getCoverageManifest,
  getStatutoryCrosswalk,
} from "@/lib/corpus/loader";
import {
  matchesDiagnosticCode,
  normalizeCfrSlug,
  resolveCfrAtDate,
} from "@/lib/corpus/temporal";
import type {
  AudienceMode,
  CompiledCfrSection,
  CompiledCfrSnapshot,
  CompiledCfrVersion,
  CompiledDocument,
  CoverageManifest,
  CoverageState,
  LexiconEntry,
  MarkdownBlock,
  PrecedentEntry,
  StatutoryCrosswalkEntry,
} from "@/lib/corpus/types";

export interface RetrievedCorpusChunk {
  id: string;
  kind:
    | "cfr-snapshot"
    | "cfr-section"
    | "module"
    | "precedent"
    | "crosswalk"
    | "lexicon"
    | "vasrd-hub";
  title: string;
  href: string;
  coverageState: CoverageState;
  score: number;
  matchReason: string;
  text: string;
}

export interface TemporalResolutionSummary {
  sectionQuery: string;
  sectionSlug: string;
  decisionDate: string;
  coverageState: CoverageState;
  doNotRely: boolean;
  governingPermalink: string | null;
  governingVersionId: string | null;
  publicationDate: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  explanation: string;
  ecfrUrl: string;
  govinfoUrl: string;
  quarantinedCitations: string[];
}

export interface RetrieveGroundedContextOptions {
  query: string;
  audienceMode: AudienceMode;
  activeDecisionDate?: string | null;
  maxChunks?: number;
}

export interface GroundedRetrievalResult {
  checkedAsOf: string;
  activeDecisionDate: string | null;
  temporalResolutions: TemporalResolutionSummary[];
  chunks: RetrievedCorpusChunk[];
}

interface IndexedPassage {
  id: string;
  kind: RetrievedCorpusChunk["kind"];
  title: string;
  href: string;
  coverageState: CoverageState;
  cfrSlug?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isQuarantined?: boolean;
  diagnosticCodes: string[];
  cfrCitations: string[];
  statutes: string[];
  veteranText: string;
  practitionerText: string;
  termFreq: Map<string, number>;
  docLength: number;
}

interface InMemoryRetrievalIndex {
  manifest: CoverageManifest;
  cfrVersions: CompiledCfrVersion[];
  cfrSections: CompiledCfrSection[];
  crosswalk: StatutoryCrosswalkEntry[];
  lexicon: LexiconEntry[];
  precedents: PrecedentEntry[];
  passages: IndexedPassage[];
  docFreq: Map<string, number>;
  avgDocLength: number;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "if",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "show",
  "tell",
  "that",
  "the",
  "their",
  "then",
  "this",
  "to",
  "under",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
]);

let cachedIndex: InMemoryRetrievalIndex | null = null;

function tokenizeForBm25(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/§+/g, " ")
    .split(/[^a-z0-9.+-]+/)
    .map((tok) => tok.replace(/^\.+|\.+$/g, ""))
    .filter((tok) => tok.length >= 2 && !STOP_WORDS.has(tok));
}

function summarizeBlocks(blocks: readonly MarkdownBlock[], maxChars = 1200): string {
  const parts: string[] = [];
  let len = 0;

  for (const b of blocks) {
    let chunk = "";
    if (b.kind === "heading") {
      chunk = `${b.text}:`;
    } else if (b.kind === "paragraph") {
      chunk = b.text;
    } else if (b.kind === "alert" || b.kind === "blockquote") {
      chunk = b.lines.join(" ");
    } else if (b.kind === "list" || b.kind === "checklist") {
      chunk = b.items.slice(0, 5).join("; ");
    } else if (b.kind === "table") {
      const sampleRows = b.rows
        .slice(0, 4)
        .map((r) => r.join(" | "))
        .join("; ");
      chunk = `${b.headers.join(" | ")} -> ${sampleRows}`;
    }
    if (!chunk) continue;
    parts.push(chunk);
    len += chunk.length;
    if (len >= maxChars) break;
  }

  return parts.join(" ").slice(0, maxChars);
}

function buildPassageRecord(
  seed: Omit<IndexedPassage, "termFreq" | "docLength">,
  extraIndexKeywords = "",
): IndexedPassage {
  const tokens = tokenizeForBm25(
    `${seed.title} ${seed.practitionerText} ${seed.veteranText} ${seed.diagnosticCodes.join(" ")} ${seed.cfrCitations.join(" ")} ${seed.statutes.join(" ")} ${extraIndexKeywords}`,
  );
  const termFreq = new Map<string, number>();
  for (const tok of tokens) {
    termFreq.set(tok, (termFreq.get(tok) ?? 0) + 1);
  }
  return {
    ...seed,
    termFreq,
    docLength: Math.max(tokens.length, 1),
  };
}

function formatSnapshotPassage(
  sec: CompiledCfrSection,
  snap: CompiledCfrSnapshot,
): IndexedPassage {
  const isQuarantined =
    snap.regulatory_status === "proposed-nonbinding" ||
    snap.regulatory_status === "interim-final-rescinded";
  const statusBanner = isQuarantined
    ? `QUARANTINED RULEMAKING (${
        snap.regulatory_status === "proposed-nonbinding"
          ? "Proposed & unfinalized — not enacted law"
          : "Rescinded Interim Final Rule — not enacted law"
      })`
    : `Enacted snapshot effective ${snap.effective_from} to ${snap.effective_to ?? "present"}`;

  const frMeta = [
    snap.federal_register_citation
      ? `FR: ${snap.federal_register_citation}`
      : null,
    snap.publication_date
      ? `Published: ${snap.publication_date} (governed strictly by effective date ${snap.effective_from}, never publication date)`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const verbatimPreview = snap.verbatimMarkdown
    ? snap.verbatimMarkdown.replace(/\s+/g, " ").trim().slice(0, 950)
    : "Summary-only coverage (pull official print 38 C.F.R. edition on GovInfo before pleading CUE).";

  const transition = snap.applicability_and_transition_notes ?? snap.eraNote ?? "";
  const vetSummary = sec.veteranOverlay
    ? `Plain-English summary: ${sec.veteranOverlay.what_this_means.slice(0, 420)}`
    : sec.summary;

  const practitionerBody = [
    `${sec.cfrSection} (${snap.version_id}) — ${statusBanner}.`,
    frMeta,
    transition,
    `Text (${snap.coverageState}): ${verbatimPreview}`,
    `Canonical permalink: ${snap.permalink} · Official eCFR: ${sec.officialEcfrUrl}`,
  ]
    .filter(Boolean)
    .join(" ");

  const veteranBody = [
    `${sec.cfrSection} — ${statusBanner}.`,
    frMeta,
    vetSummary,
    transition,
    `Verbatim/source excerpt (${snap.coverageState}): ${verbatimPreview.slice(0, 550)}`,
    `Read on VetLawGuide: ${snap.permalink}`,
  ]
    .filter(Boolean)
    .join(" ");

  return buildPassageRecord(
    {
      id: `snap:${snap.version_id}`,
      kind: "cfr-snapshot",
      title: `${sec.cfrSection} (${snap.effective_from} to ${snap.effective_to ?? "present"})`,
      href: snap.permalink,
      coverageState: snap.coverageState,
      cfrSlug: sec.sectionSlug,
      effectiveFrom: snap.effective_from,
      effectiveTo: snap.effective_to ?? null,
      isQuarantined,
      diagnosticCodes: sec.diagnosticCodes,
      cfrCitations: [sec.cfrSection, snap.cfr_section],
      statutes: sec.statutes,
      veteranText: veteranBody,
      practitionerText: practitionerBody,
    },
    `${snap.version_id} ${snap.federal_register_citation ?? ""}`,
  );
}

function formatModulePassage(doc: CompiledDocument): IndexedPassage {
  const astSummary = summarizeBlocks(doc.blocks, 1000);
  const triggers =
    doc.cFileTriggers.length > 0
      ? `Records / C-file triggers: ${doc.cFileTriggers.slice(0, 4).join("; ")}.`
      : "";
  const killSwitches =
    doc.killSwitches.length > 0
      ? `Procedural cautions / bars: ${doc.killSwitches.slice(0, 4).join("; ")}.`
      : "";
  const unfinalized =
    doc.unfinalizedProposals.length > 0
      ? `Quarantined proposed/unfinalized/rescinded watchlist: ${doc.unfinalizedProposals.join("; ")}.`
      : "";

  const ov = doc.veteranOverlay;
  const veteranBody = ov
    ? [
        `${ov.plain_english_title} (${doc.title}).`,
        ov.what_this_means,
        ov.record_clues.length > 0
          ? `Records to look for: ${ov.record_clues.slice(0, 3).join("; ")}.`
          : "",
        ov.important_cautions.length > 0
          ? `Important cautions: ${ov.important_cautions.slice(0, 3).join("; ")}.`
          : "",
        ov.questions_for_representative.length > 0
          ? `Questions to discuss with an accredited VSO/representative: ${ov.questions_for_representative
              .slice(0, 2)
              .join("; ")}.`
          : "",
        `Primary citations: ${[...doc.cfrCitations.slice(0, 4), ...doc.statutes.slice(0, 3)].join(", ")}.`,
        `Guide link: ${doc.route}`,
      ]
        .filter(Boolean)
        .join(" ")
    : `${doc.title}. ${astSummary} ${triggers} ${killSwitches} ${unfinalized} Guide link: ${doc.route}`;

  const practitionerBody = [
    `${doc.title} [Coverage: ${doc.coverageState}].`,
    `Authorities: ${[
      ...doc.cfrCitations.slice(0, 5),
      ...doc.statutes.slice(0, 4),
      ...doc.keyPrecedents.slice(0, 4),
    ].join("; ")}.`,
    astSummary,
    triggers,
    killSwitches,
    unfinalized,
    `Canonical route: ${doc.route}`,
  ]
    .filter(Boolean)
    .join(" ");

  return buildPassageRecord(
    {
      id: `mod:${doc.id}`,
      kind: "module",
      title: doc.title,
      href: doc.route,
      coverageState: doc.coverageState,
      diagnosticCodes: doc.diagnosticCodes,
      cfrCitations: doc.cfrCitations,
      statutes: doc.statutes,
      veteranText: veteranBody,
      practitionerText: practitionerBody,
    },
    `${doc.keyPrecedents.join(" ")} ${(doc.practiceDomains ?? []).join(" ")}`,
  );
}

function formatPrecedentPassage(prec: PrecedentEntry): IndexedPassage {
  const nonprecGuard = prec.isNonprecedentialRule30a
    ? "NONPRECEDENTIAL SINGLE-JUDGE DISPOSITION under CAVC Rule 30(a) — cite only for persuasive/watchlist context, never as binding precedent."
    : prec.validityLabel ?? "Verified authority";
  const cutoffs = (prec.eraCutoffCautions ?? [])
    .map((c) => c.caution)
    .join("; ");
  const citedRoutes = (prec.citedByModules ?? [])
    .slice(0, 3)
    .map((m) => `${m.title} (${m.route})`)
    .join(", ");

  const practitionerBody = [
    `${prec.citation} (${nonprecGuard}; checked as of ${prec.checkedAsOf}).`,
    prec.coreHolding ? `Holding: ${prec.coreHolding}` : "",
    prec.litigationUtility ? `Application: ${prec.litigationUtility}` : "",
    cutoffs ? `Temporal cutoff cautions: ${cutoffs}` : "",
    citedRoutes ? `Cited in modules: ${citedRoutes}.` : "",
    `Authority directory: /cases`,
  ]
    .filter(Boolean)
    .join(" ");

  const veteranBody = [
    `${prec.citation} (${nonprecGuard}).`,
    prec.veteranPlainSummary ?? prec.coreHolding ?? "",
    cutoffs ? `Date caution: ${cutoffs}` : "",
    citedRoutes ? `Related guides: ${citedRoutes}.` : "",
    `Cases directory: /cases`,
  ]
    .filter(Boolean)
    .join(" ");

  return buildPassageRecord(
    {
      id: `prec:${prec.slug}`,
      kind: "precedent",
      title: prec.shortTitle ? `${prec.shortTitle} (${prec.citation})` : prec.citation,
      href: "/cases",
      coverageState: "VERBATIM_VERIFIED",
      diagnosticCodes: [],
      cfrCitations: [],
      statutes: [],
      veteranText: veteranBody,
      practitionerText: practitionerBody,
    },
    `${prec.citation} ${prec.shortTitle ?? ""} ${(prec.practiceDomains ?? []).join(" ")}`,
  );
}

function getInMemoryCorpusIndex(): InMemoryRetrievalIndex {
  if (cachedIndex) return cachedIndex;

  const manifest = getCoverageManifest();
  const cfrVersions = getCompiledCfrVersions();
  const cfrSections = getCompiledCfrSections();
  const documents = getCompiledDocuments();
  const precedents = getCompiledPrecedents();
  const crosswalk = getStatutoryCrosswalk();
  const lexicon = getCompiledLexicon();

  const passages: IndexedPassage[] = [];

  for (const sys of manifest.vasrdSystems) {
    const dcTokens =
      sys.diagnosticCodeRange
        .match(/\d{4}\s*[-–]\s*\d{4}|\d{4}/g)
        ?.map((s) => s.replace(/\s+/g, "").replace("–", "-")) ?? [];
    const text = `VASRD Body-System Hub: ${sys.label} (${sys.diagnosticCodeRange}). Coverage: ${sys.coverageState}. Contains ${sys.moduleIds.length} primary-source regulatory & historical redline modules. Route: /vasrd/${sys.systemId} · Official eCFR: ${sys.officialEcfrUrl}`;
    passages.push(
      buildPassageRecord({
        id: `vasrd:${sys.systemId}`,
        kind: "vasrd-hub",
        title: `VASRD Rating Hub — ${sys.label} (${sys.diagnosticCodeRange})`,
        href: `/vasrd/${sys.systemId}`,
        coverageState: sys.coverageState,
        diagnosticCodes: dcTokens,
        cfrCitations: ["38 C.F.R. Part 4"],
        statutes: ["38 U.S.C. § 1155"],
        veteranText: text,
        practitionerText: text,
      }),
    );
  }

  for (const sec of cfrSections) {
    for (const snap of [...sec.versions, ...sec.quarantinedWatchlist]) {
      passages.push(formatSnapshotPassage(sec, snap));
    }

    if (sec.trapTables.length > 0 || sec.killSwitches.length > 0) {
      const traps = sec.trapTables
        .slice(0, 2)
        .map(
          (t) =>
            `${t.title}: ${t.rows
              .slice(0, 4)
              .map((r) => r.join(" | "))
              .join("; ")}`,
        )
        .join(" ");
      const secBody = [
        `${sec.cfrSection} — ${sec.title}.`,
        sec.summary,
        traps,
        sec.killSwitches.length > 0
          ? `Key procedural cautions: ${sec.killSwitches.slice(0, 3).join("; ")}.`
          : "",
        `Section hub: /cfr/${sec.sectionSlug}`,
      ]
        .filter(Boolean)
        .join(" ");

      passages.push(
        buildPassageRecord({
          id: `sec:${sec.sectionSlug}`,
          kind: "cfr-section",
          title: `${sec.cfrSection} — ${sec.title}`,
          href: `/cfr/${sec.sectionSlug}`,
          coverageState: sec.coverageState,
          cfrSlug: sec.sectionSlug,
          diagnosticCodes: sec.diagnosticCodes,
          cfrCitations: [sec.cfrSection],
          statutes: sec.statutes,
          veteranText: sec.veteranOverlay
            ? `${sec.veteranOverlay.plain_english_title}: ${sec.veteranOverlay.what_this_means} ${traps} Hub: /cfr/${sec.sectionSlug}`
            : secBody,
          practitionerText: secBody,
        }),
      );
    }
  }

  for (const doc of documents) {
    passages.push(formatModulePassage(doc));
  }

  for (const prec of precedents) {
    passages.push(formatPrecedentPassage(prec));
  }

  crosswalk.forEach((row, idx) => {
    const text = `Title 38 Statutory Crosswalk (${row.subject}): Pre-1958 Era A (${row.eraAAuthority}) <-> 1958–1991 Era B (${row.eraBSection}) <-> Post-1991 Modern 38 U.S.C. (${row.eraCSection}). Notes: ${row.notes}. Crosswalk lookup: /crosswalk`;
    passages.push(
      buildPassageRecord({
        id: `xwalk:${idx}`,
        kind: "crosswalk",
        title: `Statutory Crosswalk: ${row.eraBSection} ↔ ${row.eraCSection} (${row.subject})`,
        href: "/crosswalk",
        coverageState: "VERBATIM_VERIFIED",
        diagnosticCodes: [],
        cfrCitations: [],
        statutes: [row.eraAAuthority, row.eraBSection, row.eraCSection],
        veteranText: text,
        practitionerText: text,
      }),
    );
  });

  for (const term of lexicon) {
    const text = `${term.label} (${term.key}, ${term.kind}): Plain English — ${term.plainEnglish} Practitioner note — ${term.practitionerNote} Decoder: /reference/forms-and-codes`;
    passages.push(
      buildPassageRecord({
        id: `lex:${term.key}`,
        kind: "lexicon",
        title: `${term.key} — ${term.label}`,
        href: "/reference/forms-and-codes",
        coverageState: "VERBATIM_VERIFIED",
        diagnosticCodes: [],
        cfrCitations: [],
        statutes: [],
        veteranText: text,
        practitionerText: text,
      }),
    );
  }

  const docFreq = new Map<string, number>();
  let totalLen = 0;
  for (const p of passages) {
    totalLen += p.docLength;
    for (const tok of p.termFreq.keys()) {
      docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1);
    }
  }

  cachedIndex = {
    manifest,
    cfrVersions,
    cfrSections,
    crosswalk,
    lexicon,
    precedents,
    passages,
    docFreq,
    avgDocLength: passages.length > 0 ? totalLen / passages.length : 100,
  };

  return cachedIndex;
}

function extractCfrMentions(query: string): string[] {
  const out = new Set<string>();
  const re =
    /(?:38\s*c\.?f\.?r\.?\s*(?:§+|sec\.?|section)?\s*)?(\b(?:1|3|4|14|17|19|20|21|71)\.\d+[a-z]?(?:\([a-z0-9]+\))*)/gi;
  for (const m of query.matchAll(re)) {
    const tok = m[1];
    if (tok) {
      out.add(`38 C.F.R. § ${tok}`);
    }
  }
  return Array.from(out);
}

function extractIsoDateFromQuery(query: string): string | null {
  const m = /\b(19\d{2}|20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/.exec(
    query,
  );
  return m ? m[0] : null;
}

/**
 * Deterministic + BM25 Hybrid Corpus Retriever (`$0.00` zero-vector-DB cost, `< 2ms` warm).
 */
export function retrieveGroundedContext(
  options: RetrieveGroundedContextOptions,
): GroundedRetrievalResult {
  const index = getInMemoryCorpusIndex();
  const maxChunks = options.maxChunks ?? 6;
  const q = options.query.trim();
  const validContextDate =
    options.activeDecisionDate && /^\d{4}-\d{2}-\d{2}$/.test(options.activeDecisionDate)
      ? options.activeDecisionDate
      : null;
  const targetDate = extractIsoDateFromQuery(q) ?? validContextDate;

  const bonusById = new Map<string, { bonus: number; reason: string }>();
  const addBonus = (id: string, bonus: number, reason: string) => {
    const prev = bonusById.get(id);
    if (!prev || bonus > prev.bonus) {
      bonusById.set(id, { bonus: (prev?.bonus ?? 0) + bonus, reason });
    } else {
      bonusById.set(id, { bonus: prev.bonus + bonus, reason: prev.reason });
    }
  };

  // 1. Deterministic CFR + Point-in-Time Date Resolution
  const cfrMentions = extractCfrMentions(q);
  const temporalResolutions: TemporalResolutionSummary[] = [];

  for (const cite of cfrMentions) {
    const targetSlug = normalizeCfrSlug(cite);
    if (targetDate) {
      const resolved = resolveCfrAtDate(index.cfrVersions, cite, targetDate);
      temporalResolutions.push({
        sectionQuery: cite,
        sectionSlug: resolved.sectionSlug,
        decisionDate: targetDate,
        coverageState: resolved.coverageState,
        doNotRely: resolved.doNotRely,
        governingPermalink: resolved.governingVersion?.permalink ?? null,
        governingVersionId: resolved.governingVersion?.version_id ?? null,
        publicationDate: resolved.governingVersion?.publication_date ?? null,
        effectiveFrom: resolved.governingVersion?.effective_from ?? null,
        effectiveTo: resolved.governingVersion?.effective_to ?? null,
        explanation: resolved.explanation,
        ecfrUrl: resolved.officialFallbackUrls.ecfrUrl,
        govinfoUrl: resolved.officialFallbackUrls.govinfoUrl,
        quarantinedCitations: resolved.quarantinedWatchlist.map(
          (w) =>
            `${w.cfr_section} (${w.federal_register_citation ?? w.version_id} — ${w.regulatory_status})`,
        ),
      });

      if (resolved.governingVersion) {
        addBonus(
          `snap:${resolved.governingVersion.version_id}`,
          120,
          `Exact point-in-time snapshot governing ${targetDate}`,
        );
      }
      addBonus(`sec:${resolved.sectionSlug}`, 65, `Matched ${cite} section hub`);
    } else {
      for (const p of index.passages) {
        if (
          p.cfrSlug === targetSlug ||
          p.cfrCitations.some((c) => normalizeCfrSlug(c) === targetSlug)
        ) {
          addBonus(
            p.id,
            p.kind === "cfr-section"
              ? 80
              : p.kind === "cfr-snapshot"
                ? p.isQuarantined
                  ? 25
                  : 65
                : 50,
            `Matched ${cite}`,
          );
        }
      }
    }
  }

  // 2. Deterministic Diagnostic Code & Analogous xx99-xxxx Resolution
  for (const dcMatch of q.matchAll(/\b(?:dc\s*)?(\d{4})(?:\s*[-–]\s*(\d{4}))?\b/gi)) {
    const firstCode = dcMatch[1]!;
    const secondCode = dcMatch[2];
    // Skip 4-digit years like 1997 or 2024 unless preceded by "DC" or inside 5000–9999 VASRD range
    const numericFirst = Number(firstCode);
    const hasDcPrefix = /^dc/i.test(dcMatch[0]);
    if (!hasDcPrefix && !secondCode && (numericFirst < 5000 || numericFirst > 9999)) {
      continue;
    }

    const lookupCode = secondCode ?? firstCode;
    for (const p of index.passages) {
      if (p.diagnosticCodes.some((spec) => matchesDiagnosticCode(spec, lookupCode))) {
        addBonus(p.id, 85, `Matched Diagnostic Code ${lookupCode}`);
      }
    }

    if (secondCode && firstCode.endsWith("99")) {
      for (const p of index.passages) {
        if (
          p.id.startsWith("lex:") ||
          p.cfrCitations.some((c) => /\b4\.20\b/.test(c))
        ) {
          addBonus(
            p.id,
            75,
            `Analogous rating code ${firstCode}-${secondCode} (38 C.F.R. § 4.20)`,
          );
        }
      }
    }
  }

  // 3. Deterministic Statutory Crosswalk Resolution (`former 38 U.S.C. § 3010`, `Vet. Reg.`)
  const statuteMatch =
    /(?:former\s+)?(?:38\s*U\.?S\.?C\.?\s*)(?:§+|sec\.?|section)?\s*(\d{3,4}(?:\([a-z0-9]+\))?)/i.exec(
      q,
    );
  if (statuteMatch || /vet\.?\s*reg/i.test(q)) {
    const token = statuteMatch?.[1]?.replace(/\([^)]*\)/g, "") ?? "";
    index.crosswalk.forEach((row, idx) => {
      const hit = /vet\.?\s*reg/i.test(q)
        ? row.eraAAuthority.toLowerCase().includes("vet. reg")
        : Boolean(
            token &&
              new RegExp(`\\b${token}\\b`, "i").test(
                `${row.eraBSection} ${row.eraCSection}`,
              ),
          );
      if (hit) {
        addBonus(
          `xwalk:${idx}`,
          95,
          `Statutory Crosswalk match (${row.eraBSection} ↔ ${row.eraCSection})`,
        );
      }
    });
  }

  // 4. Deterministic Quarantined RIN / Federal Register Citation Boost
  const rinOrFrRe =
    /\b(?:2900-A[A-Z]\d{2}|\d{2}\s+FR\s+\d{3,6}|VAOPGCPREC\s+\d+-\d+)\b/gi;
  for (const m of q.matchAll(rinOrFrRe)) {
    const needle = m[0].toLowerCase();
    for (const p of index.passages) {
      if (
        p.practitionerText.toLowerCase().includes(needle) ||
        p.title.toLowerCase().includes(needle)
      ) {
        addBonus(p.id, 105, `Exact citation match (${m[0]})`);
      }
    }
  }

  // 5. Okapi BM25 Scoring Across All Passages
  const queryTokens = Array.from(new Set(tokenizeForBm25(q)));
  const totalDocs = index.passages.length;
  const k1 = 1.5;
  const b = 0.75;

  const scored: RetrievedCorpusChunk[] = [];

  for (const p of index.passages) {
    let bm25 = 0;
    for (const tok of queryTokens) {
      const tf = p.termFreq.get(tok) ?? 0;
      if (tf === 0) continue;
      const df = index.docFreq.get(tok) ?? 0;
      const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
      const norm =
        (tf * (k1 + 1)) /
        (tf + k1 * (1 - b + b * (p.docLength / index.avgDocLength)));
      bm25 += idf * norm;
    }

    const det = bonusById.get(p.id);
    const totalScore = bm25 * 8 + (det?.bonus ?? 0);
    if (totalScore <= 0.5) continue;

    scored.push({
      id: p.id,
      kind: p.kind,
      title: p.title,
      href: p.href,
      coverageState: p.coverageState,
      score: Math.round(totalScore * 100) / 100,
      matchReason: det?.reason ?? "BM25 corpus lexical match",
      text:
        options.audienceMode === "veteran" ? p.veteranText : p.practitionerText,
    });
  }

  scored.sort((aItem, bItem) => bItem.score - aItem.score);

  // Deduplicate near-identical routes while allowing multiple distinct CFR snapshots when comparing eras
  const selected: RetrievedCorpusChunk[] = [];
  const routeCounts = new Map<string, number>();

  for (const item of scored) {
    const count = routeCounts.get(item.href) ?? 0;
    if (count >= 2) continue;
    routeCounts.set(item.href, count + 1);
    selected.push(item);
    if (selected.length >= maxChunks) break;
  }

  return {
    checkedAsOf: index.manifest.checkedAsOf,
    activeDecisionDate: targetDate,
    temporalResolutions,
    chunks: selected,
  };
}
